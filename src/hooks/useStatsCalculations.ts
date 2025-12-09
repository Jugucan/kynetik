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
    // Convertir date string a Date object
    const [year, month, day] = date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    
    // Obtenir sessions d'aquest dia
    const sessions = getSessionsForDate(dateObj);
    
    // Buscar la sessió que coincideix amb l'hora i centre
    const matchingSession = sessions.find(session => {
      // Normalitzar l'hora (treure espais i salts de línia)
      const sessionTime = session.time.replace(/\s+/g, '').replace(/\n/g, '');
      const attendanceTime = time.replace(/\s+/g, '').replace(/\n/g, '');
      
      // Comprovar si l'hora coincideix (agafar només la hora d'inici)
      const sessionStartTime = sessionTime.split('-')[0];
      const attendanceStartTime = attendanceTime.split('-')[0];
      
      const timeMatches = sessionStartTime === attendanceStartTime;
      
      // Si hi ha centre, també comprovar que coincideix
      const centerMatches = !center || !session.center || centersMatch(session.center, center);
      
      return timeMatches && centerMatches;
    });
    
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
    
    // Mapejar cada assistència al programa real del calendari
    const attendancesWithCalendarProgram = filteredAttendances.map(attendance => {
      const programFromCalendar = getProgramFromCalendar(
        attendance.date, 
        attendance.time, 
        attendance.center
      );
      
      // Detectar discrepàncies
      if (programFromCalendar !== 'DESCONEGUT' && 
          attendance.activity && 
          !attendance.activity.toUpperCase().includes(programFromCalendar)) {
        // Hi ha discrepància
      }
      
      return {
        ...attendance,
        calendarProgram: programFromCalendar
      };
    });

    // NOUS CÀLCULS: Assistències per programa i mes/any (AMB FILTRE DE CENTRES)
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

    // Obtenir tots els mesos disponibles
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

    // NOUS CÀLCULS: Top usuaris per programa (AMB FILTRE DE CENTRES)
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
      
      // Filtrar usuaris amb almenys 1 sessió
      const usersWithSessions = Object.values(userSessionsCount)
        .filter(item => item.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map(item => ({
          ...item.user,
          sessionsInProgram: item.count
        }));
      
      topUsersByProgram[programName] = usersWithSessions;
      
      // DEBUG: Buscar GLORIA específicament
      if (programName === 'BB') {
        console.log('=== DEBUG BB TOP USERS ===');
        console.log('Total users counted for BB:', Object.keys(userSessionsCount).length);
        console.log('Top 3 users:', usersWithSessions.slice(0, 3).map(u => ({ name: u.name, sessions: u.sessionsInProgram })));
        
        // Buscar GLORIA
        const gloria = usersWithSessions.find(u => u.name && u.name.includes('GLORIA'));
        if (gloria) {
          console.log('GLORIA found in BB ranking:', { name: gloria.name, sessionsInProgram: gloria.sessionsInProgram });
        } else {
          console.log('GLORIA NOT found in BB ranking');
        }
        
        // Comprovar si GLORIA està a userSessionsCount
        const gloriaInCount = Object.values(userSessionsCount).find((item: any) => 
          item.user.name && item.user.name.includes('GLORIA')
        );
        if (gloriaInCount) {
          console.log('GLORIA in userSessionsCount:', gloriaInCount);
        }
        
        console.log('==========================');
      }
    });

        // NOVA FUNCIONALITAT: Detectar discrepàncies calendari vs gimnàs
    const calendarDiscrepancies: Array<{
      date: string;
      time: string;
      center: string;
      gymProgram: string;
      calendarProgram: string;
      userName: string;
      count: number;
    }> = [];

    // Funció per normalitzar noms de programes per comparar
    const normalizeForComparison = (program: string): string => {
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
        'SH\'BAM': 'SB',
        'DANCE': 'SB',
        'SB': 'SB',
        'ESTIRAMIENTS': 'ES',
        'STRETCH': 'ES',
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
        'CORE': 'CORE'
      };
      
      return map[normalized] || normalized;
    };

    const discrepancyMap = new Map<string, any>();

    attendancesWithCalendarProgram.forEach(attendance => {
      if (attendance.calendarProgram === 'DESCONEGUT' || !attendance.activity) {
        return;
      }
      
      const normalizedCalendar = normalizeForComparison(attendance.calendarProgram);
      const normalizedGym = normalizeForComparison(attendance.activity);
      
      // Només afegir si són diferents DESPRÉS de normalitzar
      if (normalizedCalendar !== normalizedGym) {
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

    // Ordenar per data
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
      calendarDiscrepancies  // <-- AFEGIR AIXÒ
    };
  }, [users, centerFilter, inactiveSortOrder, schedules, customSessions, getSessionsForDate, getProgramFromCalendar]);

  return stats;
};
