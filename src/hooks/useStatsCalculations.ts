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
  closuresByCenter: Record<string, Record<string, string>>;
  officialHolidays: any;
  centers: Center[];
}

// ── Funcions de normalització fora del hook (no es recreen mai) ──────────────

const PROGRAM_MAP: { [key: string]: string } = {
  'BODYPUMP': 'BP', 'BP': 'BP',
  'BODYBALANCE': 'BB', 'BB': 'BB',
  'BODYCOMBAT': 'BC', 'BC': 'BC',
  'SHBAM': 'SB', 'DANCE': 'SB', 'SB': 'SB',
  'ESTIRAMIENTOS': 'ES', 'STRETCH': 'ES', 'ESTIRAMENTS': 'ES', 'ES': 'ES',
  'RPM': 'RPM',
  'BODYSTEP': 'BS', 'BS': 'BS',
  'CXWORX': 'CX', 'CX': 'CX',
  'SPRINT': 'SPRINT',
  'GRIT': 'GRIT',
  'BARRE': 'BARRE',
  'TONE': 'TONE',
  'CORE': 'CORE',
  'CROSSTRAINING': 'CROSS', 'CROSS': 'CROSS',
};

const normalizeProgram = (program: string): string => {
  if (!program) return '';
  const normalized = program.toUpperCase()
    .replace(/\s+/g, '')
    .replace(/OUTDOOR/g, '')
    .replace(/'/g, '');
  return PROGRAM_MAP[normalized] || normalized;
};

// ────────────────────────────────────────────────────────────────────────────

export const useStatsCalculations = ({
  users,
  schedules,
  customSessions,
  centerFilter,
  inactiveSortOrder,
  vacations,
  closuresByCenter,
  officialHolidays,
  centers,
}: UseStatsCalculationsProps) => {

  const getScheduleForDate = useCallback((date: Date) => {
    const dateStr = dateToKey(date);
    const sortedSchedules = [...schedules].sort((a, b) =>
      b.startDate.localeCompare(a.startDate)
    );
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

    if (sessions.length === 0) return 'DESCONEGUT';

    const cleanTime = (t: string) => t.replace(/[\s\n\r\t]+/g, '').split('-')[0];
    const attendanceStartTime = cleanTime(time);

    const matchingSession = sessions.find(session => {
      const timeMatches = cleanTime(session.time) === attendanceStartTime;
      const centerMatches = !center || !session.center || centersMatch(session.center, center, centers);
      return timeMatches && centerMatches;
    });

    return matchingSession?.program || 'DESCONEGUT';
  }, [getSessionsForDate, centers]);

  // ── Càlcul principal — SENSE inactiveSortOrder a les dependències ──────────
  // inactiveSortOrder s'aplica FORA d'aquest useMemo per evitar recalcular tot
  const baseStats = useMemo(() => {
    const allRealClasses: Array<{
      date: string;
      activity: string;
      time: string;
      center: string;
    }> = [];

    const oldestScheduleDate = schedules.length > 0
      ? schedules.reduce((oldest, schedule) =>
          schedule.startDate < oldest ? schedule.startDate : oldest,
          schedules[0].startDate)
      : '2020-01-01';

    const startDate = new Date(oldestScheduleDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const currentDate = new Date(startDate);
    while (currentDate <= today) {
      const sessions = getSessionsForDate(currentDate);
      sessions.filter(s => !s.isDeleted).forEach(session => {
        allRealClasses.push({
          date: dateToKey(currentDate),
          activity: session.program,
          time: session.time,
          center: session.center || 'N/A',
        });
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const allUserAttendances = users.flatMap(user =>
      (user.sessions || []).map((s: any) => ({ ...s, userName: user.name }))
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
          (user.sessions || []).some((s: any) => centersMatch(s.center, centerFilter, centers))
        ).length;

    const totalSessions = filteredClasses.length;
    const totalAttendances = filteredAttendances.length;

    // Dades anuals
    const sessionsByYear: { [year: string]: number } = {};
    filteredClasses.forEach(c => {
      const year = c.date.split('-')[0];
      sessionsByYear[year] = (sessionsByYear[year] || 0) + 1;
    });
    const yearlyData = Object.entries(sessionsByYear)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([year, count]) => ({ year, count }));

    const attendancesByYear: { [year: string]: number } = {};
    filteredAttendances.forEach(a => {
      const year = a.date.split('-')[0];
      attendancesByYear[year] = (attendancesByYear[year] || 0) + 1;
    });
    const yearlyAttendanceData = Object.entries(attendancesByYear)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([year, count]) => ({ year, count }));

    const avgAttendancesPerYear = yearlyAttendanceData.length > 0
      ? (totalAttendances / yearlyAttendanceData.length).toFixed(1)
      : 0;

    // Dades mensuals (últims 12 mesos)
    const now = new Date();
    const monthlyData: { month: string; classes: number; attendances: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('ca-ES', { month: 'short', year: 'numeric' });
      const yearMonth = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      monthlyData.push({
        month: monthName,
        classes: filteredClasses.filter(c => c.date.startsWith(yearMonth)).length,
        attendances: filteredAttendances.filter(a => a.date.startsWith(yearMonth)).length,
      });
    }

    const currentMonthSessions = monthlyData[monthlyData.length - 1]?.classes || 0;
    const previousMonthSessions = monthlyData[monthlyData.length - 2]?.classes || 0;
    const monthlyGrowth = previousMonthSessions > 0
      ? (((currentMonthSessions - previousMonthSessions) / previousMonthSessions) * 100).toFixed(1)
      : 0;

    // Assistència mitjana per classe
    const uniqueClassesMap = new Map<string, number>();
    filteredAttendances.forEach(a => {
      const key = `${a.date}-${a.time}-${a.activity}-${a.center}`;
      uniqueClassesMap.set(key, (uniqueClassesMap.get(key) || 0) + 1);
    });
    const totalAttendeesInClasses = Array.from(uniqueClassesMap.values()).reduce((s, c) => s + c, 0);
    const avgAttendees = uniqueClassesMap.size > 0
      ? (totalAttendeesInClasses / uniqueClassesMap.size).toFixed(1)
      : 0;

    // Usuaris actius (últims 30 dies)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activeUsers = users.filter(user => {
      const recentSessions = (user.sessions || []).filter((s: any) =>
        new Date(s.date) >= thirtyDaysAgo
      );
      if (recentSessions.length === 0) return false;
      if (centerFilter === "all") return true;
      return recentSessions.some((s: any) => centersMatch(s.center, centerFilter, centers));
    }).length;

    // Usuaris recurrents i retenció
    const filteredUsers = centerFilter === "all"
      ? users
      : users.map(user => ({
          ...user,
          totalSessions: (user.sessions || []).filter((s: any) =>
            centersMatch(s.center, centerFilter, centers)
          ).length,
        }));

    const recurrentUsersFiltered = filteredUsers.filter(u => (u.totalSessions || 0) > 1).length;
    const retentionRate = totalUsers > 0
      ? ((recurrentUsersFiltered / totalUsers) * 100).toFixed(1)
      : 0;

    // Nous usuaris per any
    const newUsersByYear: { [year: string]: number } = {};
    users.forEach(user => {
      if (!user.firstSession) return;
      const year = new Date(user.firstSession).getFullYear().toString();
      newUsersByYear[year] = (newUsersByYear[year] || 0) + 1;
    });

    // Programes
    const programCount: { [program: string]: number } = {};
    filteredClasses.forEach(c => {
      programCount[c.activity] = (programCount[c.activity] || 0) + 1;
    });
    const programData = Object.entries(programCount)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));

    // Centres
    const centerCount: { [center: string]: number } = {};
    allRealClasses.forEach(c => {
      centerCount[c.center] = (centerCount[c.center] || 0) + 1;
    });

    // Dies de la setmana
    const dayCount: { [day: string]: number } = {};
    const dayNames = ['Diumenge', 'Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte'];
    filteredClasses.forEach(c => {
      const [y, m, d] = c.date.split('-').map(Number);
      const dayName = dayNames[new Date(y, m - 1, d).getDay()];
      dayCount[dayName] = (dayCount[dayName] || 0) + 1;
    });
    const orderedDays = ['Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte', 'Diumenge'];
    const classesByWeekday = orderedDays.map(day => ({ day, count: dayCount[day] || 0 }));
    const mostPopularDay = Object.entries(dayCount).sort((a, b) => b[1] - a[1])[0];

    // Franges horàries
    const timeSlotCount = { morning: 0, afternoon: 0, evening: 0 };
    filteredClasses.forEach(c => {
      const hour = parseInt(c.time.split(':')[0]);
      if (hour < 12) timeSlotCount.morning++;
      else if (hour < 18) timeSlotCount.afternoon++;
      else timeSlotCount.evening++;
    });
    const preferredTimeSlot = Object.entries(timeSlotCount).sort((a, b) => b[1] - a[1])[0];
    const timeSlotNames = { morning: 'Matí', afternoon: 'Tarda', evening: 'Vespre' };

    // Top 10 usuaris
    const topUsers = [...filteredUsers]
      .sort((a, b) => (b.totalSessions || 0) - (a.totalSessions || 0))
      .slice(0, 10);

    // Usuaris inactius (>60 dies) — sense ordenar aquí, s'ordena fora
    const inactiveUsersBase = users.filter(user => {
      if ((user.daysSinceLastSession || 0) <= 60) return false;
      if (centerFilter === "all") return true;
      return (user.sessions || []).some((s: any) => centersMatch(s.center, centerFilter, centers));
    });

    // Tendència
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (yearlyData.length >= 2) {
      const currentYear = now.getFullYear().toString();
      const currentYearEntry = yearlyData.find(y => y.year === currentYear);
      const previousYearEntry = yearlyData
        .filter(y => y.year !== currentYear)
        .sort((a, b) => b.year.localeCompare(a.year))[0];

      if (currentYearEntry && previousYearEntry) {
        const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const monthsElapsed = now.getMonth() + (now.getDate() / daysInCurrentMonth);
        const currentAvg = currentYearEntry.count / Math.max(0.1, monthsElapsed);
        const previousAvg = previousYearEntry.count / 12;

        if (monthsElapsed < 2) {
          const percentDiff = ((currentAvg - previousAvg) / previousAvg) * 100;
          if (percentDiff > 5) trend = 'up';
          else if (percentDiff < -5) trend = 'down';
        } else {
          if (currentAvg > previousAvg) trend = 'up';
          else if (currentAvg < previousAvg) trend = 'down';
        }
      } else if (yearlyData.length >= 2) {
        const last = yearlyData[yearlyData.length - 1];
        const prev = yearlyData[yearlyData.length - 2];
        if (last.count > prev.count) trend = 'up';
        else if (last.count < prev.count) trend = 'down';
      }
    }

    // Mitjanes mensuals per estacionalitat
    const attendancesByYearMonth: { [ym: string]: number } = {};
    filteredAttendances.forEach(a => {
      const ym = a.date.slice(0, 7);
      attendancesByYearMonth[ym] = (attendancesByYearMonth[ym] || 0) + 1;
    });
    const monthBuckets: { [m: string]: number[] } = {};
    Object.entries(attendancesByYearMonth).forEach(([ym, count]) => {
      const key = parseInt(ym.split('-')[1], 10).toString().padStart(2, '0');
      monthBuckets[key] = monthBuckets[key] || [];
      monthBuckets[key].push(count);
    });
    const monthNames = Array.from({ length: 12 }).map((_, i) =>
      new Date(2000, i, 1).toLocaleDateString('ca-ES', { month: 'short' })
    );
    const monthlyAverages = monthNames.map((name, idx) => {
      const key = (idx + 1).toString().padStart(2, '0');
      const arr = monthBuckets[key] || [];
      const avg = arr.length > 0
        ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length)
        : 0;
      return { month: name, avg };
    });

    // Programes del calendari amb assistències
    const attendancesWithCalendarProgram = filteredAttendances.map(attendance => {
      const programFromCalendar = getProgramFromCalendar(
        attendance.date,
        attendance.time,
        attendance.center
      );
      const isInCalendar = programFromCalendar !== 'DESCONEGUT';
      const finalProgram = isInCalendar
        ? programFromCalendar
        : (attendance.activity ? normalizeProgram(attendance.activity) : 'DESCONEGUT');

      return { ...attendance, calendarProgram: finalProgram, isInCalendar };
    });

    const realProgramNames = new Set<string>();
    attendancesWithCalendarProgram.forEach(a => {
      if (a.isInCalendar && a.calendarProgram && a.calendarProgram !== 'DESCONEGUT') {
        realProgramNames.add(a.calendarProgram);
      }
    });

    // Assistències per programa i mes/any
    const attendancesByProgramMonth: { [key: string]: { [month: string]: number } } = {};
    const attendancesByProgramYear: { [key: string]: { [year: string]: number } } = {};

    attendancesWithCalendarProgram.forEach(a => {
      const program = a.calendarProgram;
      if (!program || program === 'DESCONEGUT') return;
      const yearMonth = a.date.slice(0, 7);
      const year = a.date.slice(0, 4);

      if (!attendancesByProgramMonth[program]) attendancesByProgramMonth[program] = {};
      attendancesByProgramMonth[program][yearMonth] = (attendancesByProgramMonth[program][yearMonth] || 0) + 1;

      if (!attendancesByProgramYear[program]) attendancesByProgramYear[program] = {};
      attendancesByProgramYear[program][year] = (attendancesByProgramYear[program][year] || 0) + 1;
    });

    const allMonthsSet = new Set<string>();
    Object.values(attendancesByProgramMonth).forEach(pm =>
      Object.keys(pm).forEach(m => allMonthsSet.add(m))
    );
    const allMonthsSorted = Array.from(allMonthsSet).sort();
    const allMonthsLabels = allMonthsSorted.map(ym => {
      const [y, m] = ym.split('-');
      return new Date(parseInt(y), parseInt(m) - 1, 1)
        .toLocaleDateString('ca-ES', { month: 'short', year: 'numeric' });
    });

    const programsWithData = Array.from(realProgramNames).sort();

    const last12Months: string[] = [];
    const last12MonthsLabels: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      last12Months.push(`${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`);
      last12MonthsLabels.push(date.toLocaleDateString('ca-ES', { month: 'short', year: 'numeric' }));
    }

    const programAttendancesOverTime12 = programsWithData.map(p => ({
      program: p,
      data: last12Months.map(m => attendancesByProgramMonth[p]?.[m] || 0),
    }));

    const programAttendancesOverTimeAll = programsWithData.map(p => ({
      program: p,
      data: allMonthsSorted.map(m => attendancesByProgramMonth[p]?.[m] || 0),
    }));

    const allYearsSet = new Set<string>();
    Object.values(attendancesByProgramYear).forEach(py =>
      Object.keys(py).forEach(y => allYearsSet.add(y))
    );
    const allYearsSorted = Array.from(allYearsSet).sort();

    const programAttendancesByYear = programsWithData.map(p => ({
      program: p,
      data: allYearsSorted.map(y => attendancesByProgramYear[p]?.[y] || 0),
    }));

    // Top usuaris per programa
    const topUsersByProgram: { [program: string]: any[] } = {};
    Array.from(realProgramNames).forEach(programName => {
      const userCount: { [name: string]: { user: any; count: number } } = {};
      attendancesWithCalendarProgram.forEach(a => {
        if (a.calendarProgram !== programName) return;
        if (!userCount[a.userName]) {
          const user = users.find(u => u.name === a.userName);
          if (user) userCount[a.userName] = { user, count: 0 };
        }
        if (userCount[a.userName]) userCount[a.userName].count++;
      });
      topUsersByProgram[programName] = Object.values(userCount)
        .filter(i => i.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map(i => ({ ...i.user, sessionsInProgram: i.count }));
    });

    // Discrepàncies calendari vs gimnàs
    const discrepancyMap = new Map<string, any>();
    attendancesWithCalendarProgram.forEach(a => {
      if (!a.isInCalendar || !a.activity) return;
      if (normalizeProgram(a.calendarProgram) === normalizeProgram(a.activity)) return;

      const key = `${a.date}-${a.time}-${a.center}`;
      if (!discrepancyMap.has(key)) {
        discrepancyMap.set(key, {
          date: a.date, time: a.time, center: a.center,
          gymProgram: a.activity, calendarProgram: a.calendarProgram,
          userName: a.userName, count: 1,
        });
      } else {
        const existing = discrepancyMap.get(key);
        existing.count++;
        if (!existing.userName.includes(a.userName)) {
          existing.userName += `, ${a.userName}`;
        }
      }
    });
    const calendarDiscrepancies = Array.from(discrepancyMap.values())
      .sort((a, b) => a.date.localeCompare(b.date));

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
      inactiveUsersBase,   // sense ordenar, s'ordena a sota
      trend,
      retentionRate,
      mostPopularDay,
      preferredTimeSlot: preferredTimeSlot
        ? timeSlotNames[preferredTimeSlot[0] as keyof typeof timeSlotNames]
        : 'N/A',
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
    };
  // inactiveSortOrder INTENCIONADAMENT fora de les dependències
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, centerFilter, schedules, customSessions, getSessionsForDate, getProgramFromCalendar]);

  // ── Ordenació dels usuaris inactius SEPARADA del càlcul principal ──────────
  // Canviar l'ordre NO recalcula les 1.800 dies ni els 600 usuaris
  const inactiveUsers = useMemo(() => {
    return [...baseStats.inactiveUsersBase].sort((a, b) => {
      const diffA = a.daysSinceLastSession || 0;
      const diffB = b.daysSinceLastSession || 0;
      return inactiveSortOrder === 'desc' ? diffB - diffA : diffA - diffB;
    });
  }, [baseStats.inactiveUsersBase, inactiveSortOrder]);

  return { ...baseStats, inactiveUsers };
};
