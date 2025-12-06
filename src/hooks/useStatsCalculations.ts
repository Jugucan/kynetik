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

    // DEBUG: Veure estructura de dades
    console.log('=== DEBUG STATS ===');
    console.log('Total users:', users.length);
    console.log('Sample user:', users[0]);
    console.log('All user attendances:', allUserAttendances.slice(0, 5));
    console.log('Filtered attendances:', filteredAttendances.slice(0, 5));
    console.log('Program data:', programData);
    console.log('==================');

    // NOUS CÀLCULS: Assistències per programa i mes/any
    const attendancesByProgramMonth: { [key: string]: { [month: string]: number } } = {};
    const attendancesByProgramYear: { [key: string]: { [year: string]: number } } = {};
    
    allUserAttendances.forEach(attendance => {
      const program = attendance.activity;
      const yearMonth = attendance.date.slice(0, 7); // Format: "2024-01"
      const year = attendance.date.slice(0, 4); // Format: "2024"
      
      // Per mes
      if (!attendancesByProgramMonth[program]) {
        attendancesByProgramMonth[program] = {};
      }
      attendancesByProgramMonth[program][yearMonth] = (attendancesByProgramMonth[program][yearMonth] || 0) + 1;
      
      // Per any
      if (!attendancesByProgramYear[program]) {
        attendancesByProgramYear[program] = {};
      }
      attendancesByProgramYear[program][year] = (attendancesByProgramYear[program][year] || 0) + 1;
    });

    // Obtenir tots els mesos disponibles (des del més antic fins avui)
    const allMonthsSet = new Set<string>();
    Object.values(attendancesByProgramMonth).forEach(programMonths => {
      Object.keys(programMonths).forEach(month => allMonthsSet.add(month));
    });
    const allMonthsSorted = Array.from(allMonthsSet).sort();

    // Generar labels per tots els mesos
    const allMonthsLabels = allMonthsSorted.map(ym => {
      const [year, month] = ym.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      return date.toLocaleDateString('ca-ES', { month: 'short', year: 'numeric' });
    });

    // Crear dataset per cada programa (tots els mesos)
    const programAttendancesOverTimeAll = programData.map(prog => {
      const data = allMonthsSorted.map(month => 
        attendancesByProgramMonth[prog.name]?.[month] || 0
      );
      return {
        program: prog.name,
        data: data
      };
    });

    // Generar els últims 12 mesos per vista reduïda
    const last12Months: string[] = [];
    const last12MonthsLabels: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yearMonth = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      const label = date.toLocaleDateString('ca-ES', { month: 'short', year: 'numeric' });
      last12Months.push(yearMonth);
      last12MonthsLabels.push(label);
    }

    // Crear dataset per cada programa (últims 12 mesos)
    const programAttendancesOverTime12 = programData.map(prog => {
      const data = last12Months.map(month => 
        attendancesByProgramMonth[prog.name]?.[month] || 0
      );
      return {
        program: prog.name,
        data: data
      };
    });

    // Obtenir tots els anys disponibles
    const allYearsSet = new Set<string>();
    Object.values(attendancesByProgramYear).forEach(programYears => {
      Object.keys(programYears).forEach(year => allYearsSet.add(year));
    });
    const allYearsSorted = Array.from(allYearsSet).sort();

    // Crear dataset per cada programa (per anys)
    const programAttendancesByYear = programData.map(prog => {
      const data = allYearsSorted.map(year => 
        attendancesByProgramYear[prog.name]?.[year] || 0
      );
      return {
        program: prog.name,
        data: data
      };
    });

    // NOUS CÀLCULS: Top usuaris per programa
    const topUsersByProgram: { [program: string]: any[] } = {};
    
    programData.forEach(prog => {
      const programName = prog.name;
      
      // Comptar sessions per usuari en aquest programa
      const userSessionsCount: { [userId: string]: { user: any; count: number } } = {};
      
      allUserAttendances.forEach(attendance => {
        if (attendance.activity === programName) {
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
      
      // Ordenar i agafar top 10
      topUsersByProgram[programName] = Object.values(userSessionsCount)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map(item => ({
          ...item.user,
          sessionsInProgram: item.count
        }));
    });

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
      // NOUS CAMPS
      programAttendancesOverTime12, // Últims 12 mesos
      programAttendancesOverTimeAll, // Tots els mesos des de l'inici
      programAttendancesByYear, // Per anys
      last12MonthsLabels,
      allMonthsLabels, // Tots els mesos
      allYearsSorted, // Tots els anys
      topUsersByProgram
    };
  }, [users, centerFilter, inactiveSortOrder, schedules, customSessions, getSessionsForDate]);

  return stats;
};
