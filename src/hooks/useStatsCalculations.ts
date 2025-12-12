import { useMemo, useCallback } from "react";
import { dateToKey, centersMatch, Session } from "@/utils/statsHelpers";

interface UseStatsCalculationsProps {
  users: any[];
  schedules: any[];
  customSessions: Record<string, Session[]>;
  centerFilter: string;
  inactiveSortOrder: 'asc' | 'desc';
  vacations: any;
  closuresArbucies: any;
  closuresSantHilari: any;
  officialHolidays: any;
}

export const useStatsCalculations = ({
  users,
  schedules,
  customSessions,
  centerFilter,
  inactiveSortOrder,
  vacations,
  closuresArbucies,
  closuresSantHilari,
  officialHolidays
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
    return (closuresArbucies && closuresArbucies.hasOwnProperty(dateKey)) ||
           (closuresSantHilari && closuresSantHilari.hasOwnProperty(dateKey));
  }, [closuresArbucies, closuresSantHilari]);

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
      const centerMatches = !center || !session.center || centersMatch(session.center, center);
      
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
      : allRealClasses.filter(c => centersMatch(c.center, centerFilter));

    const filteredAttendances = centerFilter === "all"
      ? allUserAttendances
      : allUserAttendances.filter(a => centersMatch(a.center, centerFilter));

    const totalUsers = centerFilter === "all"
      ? users.length
      : users.filter(user =>
          (user.sessions || []).some(s => centersMatch(s.center, centerFilter))
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
          totalSessions: (user.sessions || []).filter(s => centersMatch(s.center, centerFilter)).length
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

      return recentSessions.some(s => centersMatch(s.center, centerFilter));
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
        return (user.sessions || []).some(s => centersMatch(s.center, centerFilter));
      })
      .sort((a, b) => {
        const diffA = a.daysSinceLastSession || 0;
        const diffB = b.daysSinceLastSession || 0;
        return inactiveSortOrder === 'desc' ? diffB - diffA : diffA - diffB;
      });

    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (yearlyData.length >= 2) {
      const lastYear = yearlyData[yearlyData.length - 1].count;
      const previousYear = yearlyData[yearlyData.length - 2].count;
      const diff = lastYear - previousYear;
      if (diff > 0) trend = 'up';
      else if (diff < 0) trend = 'down';
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

    // AFEGIR AQUEST CODI AL FINAL DE useStatsCalculations.ts
    // Just abans del return stats (línia ~580)
    
    // ============================================
    // NOVA FUNCIONALITAT: DETECCIÓ DE PATRONS D'HORARI
    // ============================================
    
    interface WeeklySchedule {
      [dayOfWeek: number]: Array<{
        time: string;
        program: string;
        center: string;
        count: number;
      }>;
    }
    
    interface SchedulePeriod {
      startDate: string;
      endDate: string;
      weeklySchedule: WeeklySchedule;
      totalSessions: number;
    }
    
    interface OutlierSession {
      date: string;
      time: string;
      program: string;
      center: string;
      attendances: number;
      reason: string;
    }
    
    // Funció per agrupar sessions per setmana del dia
    const groupSessionsByWeekday = (sessions: Array<{ date: string; time: string; activity: string; center: string }>) => {
      const weekdayMap: WeeklySchedule = {};
      
      sessions.forEach(session => {
        const [year, month, day] = session.date.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay(); // 0 = Diumenge, 1 = Dilluns, etc.
        
        if (!weekdayMap[dayOfWeek]) {
          weekdayMap[dayOfWeek] = [];
        }
        
        // Buscar si ja existeix aquesta combinació hora+programa+centre
        const existing = weekdayMap[dayOfWeek].find(
          s => s.time === session.time && 
               s.program === session.activity && 
               centersMatch(s.center, session.center)
        );
        
        if (existing) {
          existing.count++;
        } else {
          weekdayMap[dayOfWeek].push({
            time: session.time,
            program: session.activity,
            center: session.center,
            count: 1
          });
        }
      });
      
      return weekdayMap;
    };
    
    // Funció per comparar dos horaris setmanals
    const schedulesAreSimilar = (schedule1: WeeklySchedule, schedule2: WeeklySchedule, threshold = 0.7): boolean => {
      const days = [0, 1, 2, 3, 4, 5, 6];
      let matchingDays = 0;
      
      days.forEach(day => {
        const sessions1 = schedule1[day] || [];
        const sessions2 = schedule2[day] || [];
        
        // Si ambdós dies estan buits, compte com a match
        if (sessions1.length === 0 && sessions2.length === 0) {
          matchingDays++;
          return;
        }
        
        // Si tenen el mateix nombre de sessions i coincideixen (aproximadament)
        if (sessions1.length === sessions2.length && sessions1.length > 0) {
          const matches = sessions1.filter(s1 => 
            sessions2.some(s2 => 
              s2.time === s1.time && 
              s2.program === s1.program &&
              centersMatch(s1.center, s2.center)
            )
          ).length;
          
          if (matches / sessions1.length >= 0.8) {
            matchingDays++;
          }
        }
      });
      
      return matchingDays / 7 >= threshold;
    };
    
    // Detectar períodes d'horari
    const detectSchedulePeriods = (attendances: Array<{ date: string; time: string; activity: string; center: string; userName: string }>): SchedulePeriod[] => {
      if (attendances.length === 0) return [];
      
      // Ordenar per data
      const sortedAttendances = [...attendances].sort((a, b) => a.date.localeCompare(b.date));
      
      const periods: SchedulePeriod[] = [];
      let currentPeriodSessions: typeof sortedAttendances = [];
      let currentPeriodStart = sortedAttendances[0].date;
      
      // Agrupar sessions en finestres de 4 setmanes per detectar patrons
      const WINDOW_SIZE_DAYS = 28; // 4 setmanes
      const MIN_SESSIONS_FOR_PERIOD = 8; // Mínim de sessions per considerar un patró
      
      for (let i = 0; i < sortedAttendances.length; i++) {
        const session = sortedAttendances[i];
        currentPeriodSessions.push(session);
        
        // Mirar si hem arribat al final o si hi ha un salt gran de dates
        const isLastSession = i === sortedAttendances.length - 1;
        let hasDateGap = false;
        
        if (!isLastSession) {
          const nextSession = sortedAttendances[i + 1];
          const currentDate = new Date(session.date);
          const nextDate = new Date(nextSession.date);
          const daysDiff = Math.floor((nextDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
          hasDateGap = daysDiff > 14; // Si hi ha més de 2 setmanes de diferència
        }
        
        // Crear període si:
        // 1. És l'última sessió, O
        // 2. Hi ha un salt gran de dates, O
        // 3. Tenim prou sessions i detectem un canvi d'horari
        if (isLastSession || hasDateGap || (currentPeriodSessions.length >= MIN_SESSIONS_FOR_PERIOD && i < sortedAttendances.length - 1)) {
          const shouldCheckPatternChange = !isLastSession && !hasDateGap && i < sortedAttendances.length - MIN_SESSIONS_FOR_PERIOD;
          
          if (shouldCheckPatternChange) {
            // Comparar horari actual amb les següents setmanes
            const currentSchedule = groupSessionsByWeekday(currentPeriodSessions);
            const nextWindowSessions = sortedAttendances.slice(i + 1, i + 1 + MIN_SESSIONS_FOR_PERIOD);
            
            if (nextWindowSessions.length >= MIN_SESSIONS_FOR_PERIOD) {
              const nextSchedule = groupSessionsByWeekday(nextWindowSessions);
              
              // Si els horaris són diferents, tancar el període actual
              if (!schedulesAreSimilar(currentSchedule, nextSchedule)) {
                periods.push({
                  startDate: currentPeriodStart,
                  endDate: session.date,
                  weeklySchedule: currentSchedule,
                  totalSessions: currentPeriodSessions.length
                });
                
                currentPeriodSessions = [];
                currentPeriodStart = sortedAttendances[i + 1].date;
                continue;
              }
            }
          }
          
          // Tancar període si arribem aquí
          if (isLastSession || hasDateGap) {
            if (currentPeriodSessions.length >= 4) { // Mínim 4 sessions per ser un període vàlid
              periods.push({
                startDate: currentPeriodStart,
                endDate: session.date,
                weeklySchedule: groupSessionsByWeekday(currentPeriodSessions),
                totalSessions: currentPeriodSessions.length
              });
            }
            
            if (!isLastSession && hasDateGap) {
              currentPeriodSessions = [];
              currentPeriodStart = sortedAttendances[i + 1].date;
            }
          }
        }
      }
      
      return periods;
    };
    
    // Detectar sessions úniques (outliers) que no segueixen cap patró
    const detectOutlierSessions = (
      attendances: Array<{ date: string; time: string; activity: string; center: string; userName: string }>,
      periods: SchedulePeriod[]
    ): OutlierSession[] => {
      const outliers: OutlierSession[] = [];
      const outlierMap = new Map<string, { session: typeof attendances[0]; count: number; users: Set<string> }>();
      
      attendances.forEach(attendance => {
        // Buscar si aquesta sessió està dins d'algun patró
        const belongsToPeriod = periods.some(period => {
          if (attendance.date < period.startDate || attendance.date > period.endDate) {
            return false;
          }
          
          const [year, month, day] = attendance.date.split('-').map(Number);
          const date = new Date(year, month - 1, day);
          const dayOfWeek = date.getDay();
          
          const sessionsForDay = period.weeklySchedule[dayOfWeek] || [];
          return sessionsForDay.some(s => 
            s.time === attendance.time && 
            s.program === attendance.activity &&
            centersMatch(s.center, attendance.center)
          );
        });
        
        if (!belongsToPeriod) {
          const key = `${attendance.date}-${attendance.time}-${attendance.activity}-${attendance.center}`;
          
          if (!outlierMap.has(key)) {
            outlierMap.set(key, {
              session: attendance,
              count: 1,
              users: new Set([attendance.userName])
            });
          } else {
            const existing = outlierMap.get(key)!;
            existing.count++;
            existing.users.add(attendance.userName);
          }
        }
      });
      
      // Convertir a array i classificar les raons
      Array.from(outlierMap.entries()).forEach(([key, data]) => {
        let reason = 'Sessió única';
        
        // Intentar classificar la raó
        const program = data.session.activity.toUpperCase();
        if (program.includes('CROSS') || program.includes('TRAINING')) {
          reason = 'Cross Training (activitat especial)';
        } else if (data.count === 1) {
          reason = 'Substitució única';
        } else if (data.count <= 3) {
          reason = 'Sessions esporàdiques';
        } else {
          reason = 'Activitat temporal';
        }
        
        outliers.push({
          date: data.session.date,
          time: data.session.time,
          program: data.session.activity,
          center: data.session.center,
          attendances: data.count,
          reason
        });
      });
      
      return outliers.sort((a, b) => a.date.localeCompare(b.date));
    };
    
    // Detectar sessions que falten al calendari
    const detectMissingFromCalendar = (
      attendances: Array<{ date: string; time: string; activity: string; center: string; userName: string; calendarProgram: string; isInCalendar: boolean }>,
      periods: SchedulePeriod[]
    ): Array<{
      date: string;
      time: string;
      program: string;
      center: string;
      attendances: number;
      belongsToPeriod: boolean;
      periodInfo?: string;
    }> => {
      const missingMap = new Map<string, {
        date: string;
        time: string;
        program: string;
        center: string;
        count: number;
        belongsToPeriod: boolean;
        periodInfo?: string;
      }>();
      
      attendances.forEach(attendance => {
        // Només sessions que NO estan al calendari
        if (attendance.calendarProgram === 'DESCONEGUT' || !attendance.isInCalendar) {
          const key = `${attendance.date}-${attendance.time}-${attendance.activity}-${attendance.center}`;
          
          // Buscar si pertany a algun període
          let belongsToPeriod = false;
          let periodInfo: string | undefined;
          
          periods.forEach((period, idx) => {
            if (attendance.date >= period.startDate && attendance.date <= period.endDate) {
              const [year, month, day] = attendance.date.split('-').map(Number);
              const date = new Date(year, month - 1, day);
              const dayOfWeek = date.getDay();
              
              const sessionsForDay = period.weeklySchedule[dayOfWeek] || [];
              const inPattern = sessionsForDay.some(s => 
                s.time === attendance.time && 
                s.program === attendance.activity &&
                centersMatch(s.center, attendance.center)
              );
              
              if (inPattern) {
                belongsToPeriod = true;
                periodInfo = `Període ${idx + 1}: ${period.startDate} - ${period.endDate}`;
              }
            }
          });
          
          if (!missingMap.has(key)) {
            missingMap.set(key, {
              date: attendance.date,
              time: attendance.time,
              program: attendance.activity,
              center: attendance.center,
              count: 1,
              belongsToPeriod,
              periodInfo
            });
          } else {
            const existing = missingMap.get(key)!;
            existing.count++;
          }
        }
      });
      
      return Array.from(missingMap.values())
        .sort((a, b) => {
          // Primer les que pertanyen a períodes, després per data
          if (a.belongsToPeriod && !b.belongsToPeriod) return -1;
          if (!a.belongsToPeriod && b.belongsToPeriod) return 1;
          return a.date.localeCompare(b.date);
        });
    };
    
    // CALCULAR TOT
    const schedulePeriods = detectSchedulePeriods(filteredAttendances);
    const outlierSessions = detectOutlierSessions(filteredAttendances, schedulePeriods);
    const missingSessions = detectMissingFromCalendar(attendancesWithCalendarProgram, schedulePeriods);
    
    // ============================================
    // FI NOVA FUNCIONALITAT
    // ============================================
    
    // IMPORTANT: Afegir aquestes propietats al return statement:
    return {
      // ... tots els altres camps existents ...
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
      calendarDiscrepancies,
      
      // AFEGIR AQUESTES 3 NOVES PROPIETATS:
      schedulePeriods,
      outlierSessions,
      missingSessions
    };

  return stats;
};
