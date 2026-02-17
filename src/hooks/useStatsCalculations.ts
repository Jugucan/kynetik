import { useMemo, useCallback } from "react";
import { dateToKey, centersMatch, Session } from "@/utils/statsHelpers";
import type { Center } from '@/hooks/useCenters';

interface UseStatsCalculationsProps {
  users: any[];
  schedules: any[];
  customSessions: Record<string, Session[]>;
  centerFilter: string;
  inactiveSortOrder: 'asc' | 'desc';
  vacations: any;
  closuresByCenter: Record<string, Record<string, string>>;  // ✅ Afegir
  officialHolidays: any;
  centers: Center[];  // ✅ AFEGIR AQUESTA LÍNIA
}

export const useStatsCalculations = ({
  users,
  schedules,
  customSessions,
  centerFilter,
  inactiveSortOrder,
  vacations,
  closuresByCenter,          // ✅ Afegir
  officialHolidays,
  centers  // ✅ AFEGIR AQUESTA LÍNIA
}: UseStatsCalculationsProps) => {

  const getScheduleForDate = useCallback((date: Date) => {
    const dateStr = dateToKey(date);

    const sortedSchedules = [...schedules].sort((a, b) => {
      return b.startDate.localeCompare(a.startDate);
    });

    return sortedSchedules.find(schedule => {
      const startDate = schedule.startDate;
      const endDate = schedule.endDate || '9999-12-31';
      return dateStr >= startDate && dateStr <= endDate;
    });
  }, [schedules]);

  const isHoliday = useCallback((date: Date) => {
    const dateKey = dateToKey(date);
    return officialHolidays && officialHolidays.hasOwnProperty(dateKey);
  }, [officialHolidays]);

  const isVacation = useCallback((date: Date) => {
    const dateKey = dateToKey(date);
    return vacations && vacations.hasOwnProperty(dateKey);
  }, [vacations]);

  const isClosure = useCallback((date: Date) => {
    const dateKey = dateToKey(date);
    // Comprovar si la data està tancada a QUALSEVOL centre
    return Object.values(closuresByCenter).some(closures => 
      closures && closures.hasOwnProperty(dateKey)
    );
  }, [closuresByCenter]);

  const getSessionsForDate = useCallback((date: Date): Session[] => {
    const dateKey = dateToKey(date);

    if (customSessions[dateKey]) {
      return customSessions[dateKey];
    }

    if (isHoliday(date) || isVacation(date) || isClosure(date)) {
      return [];
    }

    const scheduleForDate = getScheduleForDate(date);

    if (scheduleForDate) {
      const dayOfWeek = date.getDay();
      const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek;
      const scheduleSessions = scheduleForDate.sessions[adjustedDay] || [];

      return scheduleSessions.map((s: any) => ({
        time: s.time,
        program: s.program,
        center: s.center,
        isCustom: false,
        isDeleted: false,
      }));
    }

    return [];
  }, [customSessions, getScheduleForDate, isHoliday, isVacation, isClosure]);

  const getProgramFromCalendar = useCallback((date: string, time: string, center?: string): string => {
    const [year, month, day] = date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    
    const sessions = getSessionsForDate(dateObj);
    
    if (sessions.length === 0) {
      return 'DESCONEGUT';
    }
    
    // Millorar la neteja d'hores
    const cleanTime = (t: string) => {
      // Treure TOTS els espais, salts de línia, tabulacions, etc.
      const cleaned = t.replace(/[\s\n\r\t]+/g, '');
      // Agafar només la part abans del guió
      const startTime = cleaned.split('-')[0];
      return startTime;
    };
    
    const attendanceStartTime = cleanTime(time);
    
    const matchingSession = sessions.find(session => {
      const sessionStartTime = cleanTime(session.time);
      const timeMatches = sessionStartTime === attendanceStartTime;
      const centerMatches = !center || !session.center || centersMatch(session.center, center, centers);
      
      return timeMatches && centerMatches;
    });
    
    // DEBUG temporal per les primeres 3 assistències
    if (!matchingSession && sessions.length > 0) {
      const randomDebug = Math.random();
      if (randomDebug < 0.001) { // Només 0.1% de les vegades per no saturar
        console.log('No match:', {
          date,
          attendanceTime: attendanceStartTime,
          center,
          availableSessions: sessions.map(s => ({
            time: cleanTime(s.time),
            program: s.program,
            center: s.center
          }))
        });
      }
    }
    
    return matchingSession?.program || 'DESCONEGUT';
  }, [getSessionsForDate]);

  const stats = useMemo(() => {
    const allRealClasses: Array<{
      date: string;
      activity: string;
      time: string;
      center: string;
    }> = [];

    const oldestScheduleDate = schedules.length > 0
      ? schedules.reduce((oldest, schedule) => {
          return schedule.startDate < oldest ? schedule.startDate : oldest;
        }, schedules[0].startDate)
      : '2020-01-01';

    const startDate = new Date(oldestScheduleDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const currentDate = new Date(startDate);
    while (currentDate <= today) {
      const sessions = getSessionsForDate(currentDate);
      const activeSessions = sessions.filter(s => !s.isDeleted);

      activeSessions.forEach(session => {
        allRealClasses.push({
          date: dateToKey(currentDate),
          activity: session.program,
          time: session.time,
          center: session.center || 'N/A'
        });
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    const allUserAttendances = users.flatMap(user =>
      (user.sessions || []).map(s => ({
        ...s,
        userName: user.name
      }))
    );

    const filteredClasses = centerFilter === "all"
      ? allRealClasses
      : allRealClasses.filter(c => centersMatch(c.center, centerFilter, centers));

    const filteredAttendances = centerFilter === "all"
      ? allUserAttendances
      : allUserAttendances.filter(a => centersMatch(a.center, centerFilter, centers));

    const totalUsers = centerFilter === "all"
      ? users.length
      : users.filter(user =>
          (user.sessions || []).some(s => centersMatch(s.center, centerFilter, centers))
        ).length;

    const totalSessions = filteredClasses.length;
    const totalAttendances = filteredAttendances.length;

    const sessionsByYear: { [year: string]: number } = {};
    filteredClasses.forEach(classItem => {
      const year = classItem.date.split('-')[0];
      sessionsByYear[year] = (sessionsByYear[year] || 0) + 1;
    });

    const yearlyData = Object.entries(sessionsByYear)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([year, count]) => ({ year, count }));

    const attendancesByYear: { [year: string]: number } = {};
    filteredAttendances.forEach(attendance => {
      const year = attendance.date.split('-')[0];
      attendancesByYear[year] = (attendancesByYear[year] || 0) + 1;
    });

    const yearlyAttendanceData = Object.entries(attendancesByYear)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([year, count]) => ({ year, count }));

    const avgAttendancesPerYear = yearlyAttendanceData.length > 0
      ? (totalAttendances / yearlyAttendanceData.length).toFixed(1)
      : 0;

    const now = new Date();
    const monthlyData: { month: string; classes: number; attendances: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('ca-ES', { month: 'short', year: 'numeric' });
      const yearMonth = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;

      const classesCount = filteredClasses.filter(c => c.date.startsWith(yearMonth)).length;
      const attendancesCount = filteredAttendances.filter(a => a.date.startsWith(yearMonth)).length;

      monthlyData.push({ month: monthName, classes: classesCount, attendances: attendancesCount });
    }

    const currentMonthSessions = monthlyData[monthlyData.length - 1]?.classes || 0;
    const previousMonthSessions = monthlyData[monthlyData.length - 2]?.classes || 0;
    const monthlyGrowth = previousMonthSessions > 0
      ? (((currentMonthSessions - previousMonthSessions) / previousMonthSessions) * 100).toFixed(1)
      : 0;

    const uniqueClassesMap = new Map<string, number>();
    filteredAttendances.forEach(attendance => {
      const key = `${attendance.date}-${attendance.time}-${attendance.activity}-${attendance.center}`;
      uniqueClassesMap.set(key, (uniqueClassesMap.get(key) || 0) + 1);
    });

    const totalAttendeesInClasses = Array.from(uniqueClassesMap.values()).reduce((sum, count) => sum + count, 0);
    const avgAttendees = uniqueClassesMap.size > 0
      ? (totalAttendeesInClasses / uniqueClassesMap.size).toFixed(1)
      : 0;

    const filteredUsers = centerFilter === "all"
      ? users
      : users.map(user => ({
          ...user,
          totalSessions: (user.sessions || []).filter(s => centersMatch(s.center, centerFilter, centers)).length
        }));

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activeUsers = users.filter(user => {
      const recentSessions = (user.sessions || []).filter(s => {
        const sessionDate = new Date(s.date);
        return sessionDate >= thirtyDaysAgo;
      });

      if (recentSessions.length === 0) return false;

      if (centerFilter === "all") return true;

      return recentSessions.some(s => centersMatch(s.center, centerFilter, centers));
    }).length;

    const recurrentUsersFiltered = filteredUsers.filter(u => (u.totalSessions || 0) > 1).length;
    const retentionRate = totalUsers > 0 ? ((recurrentUsersFiltered / totalUsers) * 100).toFixed(1) : 0;

    const newUsersByYear: { [year: string]: number } = {};
    users.forEach(user => {
      if (!user.firstSession) return;
      const year = new Date(user.firstSession).getFullYear().toString();
      newUsersByYear[year] = (newUsersByYear[year] || 0) + 1;
    });

    const programCount: { [program: string]: number } = {};
    filteredClasses.forEach(classItem => {
      programCount[classItem.activity] = (programCount[classItem.activity] || 0) + 1;
    });
    const programData = Object.entries(programCount)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));

    const centerCount: { [center: string]: number } = {};
    allRealClasses.forEach(classItem => {
      centerCount[classItem.center] = (centerCount[classItem.center] || 0) + 1;
    });

    const dayCount: { [day: string]: number } = {};
    const dayNames = ['Diumenge', 'Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte'];
    filteredClasses.forEach(classItem => {
      const [year, month, day] = classItem.date.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      const dayName = dayNames[date.getDay()];
      dayCount[dayName] = (dayCount[dayName] || 0) + 1;
    });

    const orderedDays = ['Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte', 'Diumenge'];
    const classesByWeekday = orderedDays.map(day => ({
      day,
      count: dayCount[day] || 0
    }));

    const mostPopularDay = Object.entries(dayCount).sort((a, b) => b[1] - a[1])[0];

    const timeSlotCount: { morning: number; afternoon: number; evening: number } = { morning: 0, afternoon: 0, evening: 0 };
    filteredClasses.forEach(classItem => {
      const hour = parseInt(classItem.time.split(':')[0]);
      if (hour < 12) timeSlotCount.morning++;
      else if (hour < 18) timeSlotCount.afternoon++;
      else timeSlotCount.evening++;
    });
    const preferredTimeSlot = Object.entries(timeSlotCount).sort((a, b) => b[1] - a[1])[0];
    const timeSlotNames = { morning: 'Matí', afternoon: 'Tarda', evening: 'Vespre' };

    const topUsers = [...filteredUsers]
      .sort((a, b) => (b.totalSessions || 0) - (a.totalSessions || 0))
      .slice(0, 10);

    const inactiveUsers = users
      .filter(user => {
        if ((user.daysSinceLastSession || 0) <= 60) return false;
        if (centerFilter === "all") return true;
        return (user.sessions || []).some(s => centersMatch(s.center, centerFilter, centers));
      })
      .sort((a, b) => {
        const diffA = a.daysSinceLastSession || 0;
        const diffB = b.daysSinceLastSession || 0;
        return inactiveSortOrder === 'desc' ? diffB - diffA : diffA - diffB;
      });

    // ✅ TENDÈNCIA BASADA EN MITJANES MENSUALS
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (yearlyData.length >= 2) {
      const now = new Date();
      const currentYear = now.getFullYear().toString();

      const getMonthlyAverage = (yearEntry: { year: string; count: number }) => {
        if (yearEntry.year === currentYear) {
          // Any actual: mesos transcorreguts fins avui
          const monthsElapsed = Math.max(1, now.getMonth() + 1 +
            (now.getDate() / new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()));
          return yearEntry.count / monthsElapsed;
        } else {
          // Anys passats: comptar mesos reals amb activitat al calendari
          const monthsWithActivity = new Set(
            filteredClasses
              .filter(c => c.date.startsWith(yearEntry.year))
              .map(c => c.date.slice(5, 7))
          ).size;
          return yearEntry.count / Math.max(1, monthsWithActivity);
        }
      };

      const lastYearAvg = getMonthlyAverage(yearlyData[yearlyData.length - 1]);
      const previousYearAvg = getMonthlyAverage(yearlyData[yearlyData.length - 2]);
      const diff = lastYearAvg - previousYearAvg;

      if (diff > 0.5) trend = 'up';
      else if (diff < -0.5) trend = 'down';
    }

    const attendancesByYearMonth: { [ym: string]: number } = {};
    filteredAttendances.forEach(a => {
      const ym = a.date.slice(0, 7);
      attendancesByYearMonth[ym] = (attendancesByYearMonth[ym] || 0) + 1;
    });
    const monthBuckets: { [m: string]: number[] } = {};
    Object.entries(attendancesByYearMonth).forEach(([ym, count]) => {
      const month = parseInt(ym.split('-')[1], 10);
      const key = month.toString().padStart(2, '0');
      monthBuckets[key] = monthBuckets[key] || [];
      monthBuckets[key].push(count);
    });
    const monthNames = Array.from({length:12}).map((_, i) => {
      const dt = new Date(2000, i, 1);
      return dt.toLocaleDateString('ca-ES', { month: 'short' });
    });
    const monthlyAverages = monthNames.map((name, idx) => {
      const key = (idx + 1).toString().padStart(2, '0');
      const arr = monthBuckets[key] || [];
      const avg = arr.length > 0 ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : 0;
      return { month: name, avg };
    });
    // NOUS CÀLCULS: Obtenir programes des del calendari
    const realProgramNames = new Set<string>();
    
    // Funció per normalitzar noms de programes (treure OUTDOOR, variants, etc.)
    const normalizeGymProgram = (program: string): string => {
      if (!program) return '';
      
      const normalized = program.toUpperCase()
        .replace(/\s+/g, '')
        .replace(/OUTDOOR/g, '')
        .replace(/'/g, '');
      
      // Mapa de normalització
      const map: { [key: string]: string } = {
        'BODYPUMP': 'BP',
        'BP': 'BP',
        'BODYBALANCE': 'BB',
        'BB': 'BB',
        'BODYCOMBAT': 'BC',
        'BC': 'BC',
        'SHBAM': 'SB',
        'DANCE': 'SB',
        'SB': 'SB',
        'ESTIRAMIENTOS': 'ES',
        'STRETCH': 'ES',
        'ESTIRAMENTS': 'ES',
        'ES': 'ES',
        'RPM': 'RPM',
        'BODYSTEP': 'BS',
        'BS': 'BS',
        'CXWORX': 'CX',
        'CX': 'CX',
        'SPRINT': 'SPRINT',
        'GRIT': 'GRIT',
        'BARRE': 'BARRE',
        'TONE': 'TONE',
        'CORE': 'CORE',
        'CROSSTRAINING': 'CROSS',
        'CROSS': 'CROSS'
      };
      
      return map[normalized] || normalized;
    };

    const attendancesWithCalendarProgram = filteredAttendances.map(attendance => {
      // Buscar al calendari per hora exacta
      const programFromCalendar = getProgramFromCalendar(
        attendance.date, 
        attendance.time, 
        attendance.center
      );
      
      // Si NO està al calendari, normalitzar el nom del gimnàs però marcar-ho
      let finalProgram = programFromCalendar;
      let isInCalendar = programFromCalendar !== 'DESCONEGUT';
      
      if (!isInCalendar && attendance.activity) {
        finalProgram = normalizeGymProgram(attendance.activity);
      }
      
      return {
        ...attendance,
        calendarProgram: finalProgram,
        isInCalendar: isInCalendar
      };
    }); 
    
    
    attendancesWithCalendarProgram.forEach(attendance => {
      // Només comptar programes que REALMENT estan al calendari
      if (attendance.isInCalendar && attendance.calendarProgram && attendance.calendarProgram !== 'DESCONEGUT') {
        realProgramNames.add(attendance.calendarProgram);
      }
    });
    
    // DEBUG: Veure què passa
    console.log('=== DEBUG CALENDAR PROGRAMS ===');
    console.log('Total filtered attendances:', filteredAttendances.length);
    console.log('Sample attendances with calendar:', attendancesWithCalendarProgram.slice(0, 3).map(a => ({
      date: a.date,
      time: a.time,
      gymActivity: a.activity,
      calendarProgram: a.calendarProgram
    })));
    console.log('Real program names found:', Array.from(realProgramNames));
    console.log('================================');

    // NOUS CÀLCULS: Assistències per programa i mes/any
    const attendancesByProgramMonth: { [key: string]: { [month: string]: number } } = {};
    const attendancesByProgramYear: { [key: string]: { [year: string]: number } } = {};
    
    attendancesWithCalendarProgram.forEach(attendance => {
      const program = attendance.calendarProgram;
      if (!program || program === 'DESCONEGUT') return;
      
      const yearMonth = attendance.date.slice(0, 7);
      const year = attendance.date.slice(0, 4);
      
      if (!attendancesByProgramMonth[program]) {
        attendancesByProgramMonth[program] = {};
      }
      attendancesByProgramMonth[program][yearMonth] = (attendancesByProgramMonth[program][yearMonth] || 0) + 1;
      
      if (!attendancesByProgramYear[program]) {
        attendancesByProgramYear[program] = {};
      }
      attendancesByProgramYear[program][year] = (attendancesByProgramYear[program][year] || 0) + 1;
    });

    const allMonthsSet = new Set<string>();
    Object.values(attendancesByProgramMonth).forEach(programMonths => {
      Object.keys(programMonths).forEach(month => allMonthsSet.add(month));
    });
    const allMonthsSorted = Array.from(allMonthsSet).sort();

    const allMonthsLabels = allMonthsSorted.map(ym => {
      const [year, month] = ym.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      return date.toLocaleDateString('ca-ES', { month: 'short', year: 'numeric' });
    });

    const programsWithData = Array.from(realProgramNames).sort();

    const programAttendancesOverTimeAll = programsWithData.map(programName => {
      const data = allMonthsSorted.map(month => 
        attendancesByProgramMonth[programName]?.[month] || 0
      );
      return {
        program: programName,
        data: data
      };
    });

    const last12Months: string[] = [];
    const last12MonthsLabels: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yearMonth = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      const label = date.toLocaleDateString('ca-ES', { month: 'short', year: 'numeric' });
      last12Months.push(yearMonth);
      last12MonthsLabels.push(label);
    }

    const programAttendancesOverTime12 = programsWithData.map(programName => {
      const data = last12Months.map(month => 
        attendancesByProgramMonth[programName]?.[month] || 0
      );
      return {
        program: programName,
        data: data
      };
    });

    const allYearsSet = new Set<string>();
    Object.values(attendancesByProgramYear).forEach(programYears => {
      Object.keys(programYears).forEach(year => allYearsSet.add(year));
    });
    const allYearsSorted = Array.from(allYearsSet).sort();

    const programAttendancesByYear = programsWithData.map(programName => {
      const data = allYearsSorted.map(year => 
        attendancesByProgramYear[programName]?.[year] || 0
      );
      return {
        program: programName,
        data: data
      };
    });

    // NOUS CÀLCULS: Top usuaris per programa
    const topUsersByProgram: { [program: string]: any[] } = {};
    
    Array.from(realProgramNames).forEach(programName => {
      const userSessionsCount: { [userId: string]: { user: any; count: number } } = {};
      
      attendancesWithCalendarProgram.forEach(attendance => {
        if (attendance.calendarProgram === programName) {
          const userName = attendance.userName;
          
          if (!userSessionsCount[userName]) {
            const user = users.find(u => u.name === userName);
            if (user) {
              userSessionsCount[userName] = {
                user: user,
                count: 0
              };
            }
          }
          
          if (userSessionsCount[userName]) {
            userSessionsCount[userName].count++;
          }
        }
      });
      
      const usersWithSessions = Object.values(userSessionsCount)
        .filter(item => item.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map(item => ({
          ...item.user,
          sessionsInProgram: item.count
        }));
      
      topUsersByProgram[programName] = usersWithSessions;
    });

    // NOVA FUNCIONALITAT: Detectar discrepàncies calendari vs gimnàs
    const normalizeForComparison = (program: string): string => {
      if (!program) return '';
      
      // Primer netegem espais, outdoor, apòstrofs
      let normalized = program.toUpperCase()
        .replace(/\s+/g, '')
        .replace(/OUTDOOR/g, '')
        .replace(/'/g, '');
      
      // Mapa de normalització AMPLIAT
      const map: { [key: string]: string } = {
        // BODYPUMP
        'BODYPUMP': 'BP',
        'BP': 'BP',
        
        // BODYBALANCE
        'BODYBALANCE': 'BB',
        'BB': 'BB',
        
        // BODYCOMBAT
        'BODYCOMBAT': 'BC',
        'BC': 'BC',
        
        // SH'BAM
        'SHBAM': 'SB',
        'DANCE': 'SB',
        'SB': 'SB',
        
        // ESTIRAMENTS (totes les variants!)
        'ESTIRAMIENTOS': 'ES',
        'ESTIRAMENTS': 'ES',
        'STRETCH': 'ES',
        'ES': 'ES',
        
        // Altres
        'RPM': 'RPM',
        'BODYSTEP': 'BS',
        'BS': 'BS',
        'CXWORX': 'CX',
        'CX': 'CX',
        'SPRINT': 'SPRINT',
        'GRIT': 'GRIT',
        'BARRE': 'BARRE',
        'TONE': 'TONE',
        'CORE': 'CORE',
        'CROSSTRAINING': 'CROSS',
        'CROSS': 'CROSS'
      };
      
      return map[normalized] || normalized;
    };

    const calendarDiscrepancies: Array<{
      date: string;
      time: string;
      center: string;
      gymProgram: string;
      calendarProgram: string;
      userName: string;
      count: number;
    }> = [];

    const discrepancyMap = new Map<string, any>();

    attendancesWithCalendarProgram.forEach(attendance => {
      if (attendance.calendarProgram === 'DESCONEGUT' || !attendance.activity) {
        return;
      }
      
      const normalizedCalendar = normalizeForComparison(attendance.calendarProgram);
      const normalizedGym = normalizeForComparison(attendance.activity);
      
      // Només marcar com a discrepància si està al calendari PERÒ és diferent
      // NO marcar si simplement no està al calendari (això ja és normal)
      if (attendance.isInCalendar && normalizedCalendar !== normalizedGym) {
        const key = `${attendance.date}-${attendance.time}-${attendance.center}`;
        
        if (!discrepancyMap.has(key)) {
          discrepancyMap.set(key, {
            date: attendance.date,
            time: attendance.time,
            center: attendance.center,
            gymProgram: attendance.activity,
            calendarProgram: attendance.calendarProgram,
            userName: attendance.userName,
            count: 1
          });
        } else {
          const existing = discrepancyMap.get(key);
          existing.count++;
          if (!existing.userName.includes(attendance.userName)) {
            existing.userName += `, ${attendance.userName}`;
          }
        }
      }
    });

    Array.from(discrepancyMap.values()).forEach(disc => {
      calendarDiscrepancies.push(disc);
    });

    calendarDiscrepancies.sort((a, b) => a.date.localeCompare(b.date));

    

    return {
      totalUsers,
      totalSessions,
      totalAttendances,
      avgAttendees,
      avgAttendancesPerYear,
      activeUsers,
      yearlyData,
      yearlyAttendanceData,
      monthlyData,
      monthlyGrowth,
      newUsersByYear,
      programData,
      centerCount,
      topUsers,
      inactiveUsers,
      trend,
      retentionRate,
      mostPopularDay,
      preferredTimeSlot: preferredTimeSlot ? timeSlotNames[preferredTimeSlot[0] as keyof typeof timeSlotNames] : 'N/A',
      recurrentUsers: recurrentUsersFiltered,
      classesByWeekday,
      monthlyAverages,
      programAttendancesOverTime12,
      programAttendancesOverTimeAll,
      programAttendancesByYear,
      last12MonthsLabels,
      allMonthsLabels,
      allYearsSorted,
      topUsersByProgram,
      calendarDiscrepancies
      
    };
  }, [users, centerFilter, inactiveSortOrder, schedules, customSessions, getSessionsForDate, getProgramFromCalendar]);

  return stats;
};
