// ============================================================
// CÀLCULS PER DETERMINAR QUINES INSÍGNIES HA GUANYAT L'USUARI
// ============================================================

import { ALL_BADGES, BadgeWithStatus } from '@/types/badges';

interface Session {
  activity: string;
  center: string;
  date: string;
  time?: string;
}

interface UserDataForBadges {
  sessions?: Session[];
  firstSession?: string;
}

// ------------------------------------------------------------
// HELPERS INTERNS
// ------------------------------------------------------------

/** Retorna el número de setmana ISO d'una data */
function getWeekKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

/** Retorna la clau "YYYY-MM-DD" d'una data */
function getDayKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

/** Calcula la ratxa màxima de setmanes consecutives amb almenys 1 sessió */
function calcMaxWeekStreak(sessions: Session[]): number {
  if (!sessions.length) return 0;

  const weekSet = new Set(sessions.map(s => getWeekKey(new Date(s.date))));
  const weeks = Array.from(weekSet).sort();

  let maxStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < weeks.length; i++) {
    const prev = weeks[i - 1];
    const curr = weeks[i];

    // Comprovem si són setmanes consecutives
    const [yearPrev, wPrev] = prev.split('-W').map(Number);
    const [yearCurr, wCurr] = curr.split('-W').map(Number);

    const isConsecutive =
      (yearCurr === yearPrev && wCurr === wPrev + 1) ||
      (yearCurr === yearPrev + 1 && wPrev >= 52 && wCurr === 1);

    if (isConsecutive) {
      currentStreak++;
      if (currentStreak > maxStreak) maxStreak = currentStreak;
    } else {
      currentStreak = 1;
    }
  }

  return maxStreak;
}

/** Calcula els mesos des de la primera sessió fins avui */
function calcMonthsAsMember(firstSession?: string): number {
  if (!firstSession) return 0;
  const first = new Date(firstSession);
  const now = new Date();
  return (now.getFullYear() - first.getFullYear()) * 12 + (now.getMonth() - first.getMonth());
}

/** Comprova si hi ha almenys 3 dies consecutius en qualsevol punt */
function hasThreeConsecutiveDays(sessions: Session[]): boolean {
  if (sessions.length < 3) return false;
  const daySet = new Set(sessions.map(s => getDayKey(new Date(s.date))));
  const days = Array.from(daySet).sort();

  for (let i = 2; i < days.length; i++) {
    const d0 = new Date(days[i - 2]);
    const d1 = new Date(days[i - 1]);
    const d2 = new Date(days[i]);
    const diff1 = (d1.getTime() - d0.getTime()) / 86400000;
    const diff2 = (d2.getTime() - d1.getTime()) / 86400000;
    if (diff1 === 1 && diff2 === 1) return true;
  }
  return false;
}

/** Comprova si alguna setmana té sessions en 5 dies laborables diferents */
function hasFiveDaysInOneWeek(sessions: Session[]): boolean {
  const weekDays: Record<string, Set<number>> = {};
  for (const s of sessions) {
    const d = new Date(s.date);
    const dow = d.getDay(); // 0=dg, 1-5=dll-div, 6=ds
    if (dow === 0 || dow === 6) continue; // saltem caps de setmana
    const wk = getWeekKey(d);
    if (!weekDays[wk]) weekDays[wk] = new Set();
    weekDays[wk].add(dow);
  }
  return Object.values(weekDays).some(set => set.size >= 5);
}

/** Comprova si hi ha un comeback (>30 dies d'absència entre sessions) */
function hasComeback(sessions: Session[]): boolean {
  if (sessions.length < 2) return false;
  const sorted = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
  for (let i = 1; i < sorted.length; i++) {
    const d1 = new Date(sorted[i - 1].date);
    const d2 = new Date(sorted[i].date);
    const diff = (d2.getTime() - d1.getTime()) / 86400000;
    if (diff > 30) return true;
  }
  return false;
}

/** Comprova si té classe a la primera setmana de l'any */
function hasNewYearClass(sessions: Session[]): boolean {
  return sessions.some(s => {
    const d = new Date(s.date);
    // Primer de gener fins el 7
    return d.getMonth() === 0 && d.getDate() <= 7;
  });
}

/** Comprova si té classe abans de les 9h */
function hasEarlyMorningClass(sessions: Session[]): boolean {
  return sessions.some(s => {
    if (!s.time) return false;
    const hour = parseInt(s.time.split(':')[0], 10);
    return hour < 9;
  });
}

/** Comprova si té classe a les 20h o més tard */
function hasEveningClass(sessions: Session[]): boolean {
  return sessions.some(s => {
    if (!s.time) return false;
    const hour = parseInt(s.time.split(':')[0], 10);
    return hour >= 20;
  });
}

/** Comprova consistència mensual (mateixa freqüència 3 mesos) */
function hasConsistentMonths(sessions: Session[]): boolean {
  if (sessions.length < 6) return false;
  const monthCount: Record<string, number> = {};
  for (const s of sessions) {
    const d = new Date(s.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthCount[key] = (monthCount[key] || 0) + 1;
  }
  const counts = Object.values(monthCount).sort();
  if (counts.length < 3) return false;

  // Busquem 3 mesos consecutius amb el mateix nombre
  const keys = Object.keys(monthCount).sort();
  for (let i = 2; i < keys.length; i++) {
    if (
      monthCount[keys[i]] === monthCount[keys[i - 1]] &&
      monthCount[keys[i]] === monthCount[keys[i - 2]]
    ) {
      return true;
    }
  }
  return false;
}

// ------------------------------------------------------------
// FUNCIÓ PRINCIPAL
// ------------------------------------------------------------

export function calculateBadges(userData: UserDataForBadges): BadgeWithStatus[] {
  const sessions = userData.sessions || [];
  const totalSessions = sessions.length;
  const uniquePrograms = new Set(sessions.map(s => s.activity)).size;
  const uniqueCenters = new Set(sessions.map(s => s.center)).size;
  const monthsAsMember = calcMonthsAsMember(userData.firstSession);
  const yearsAsMember = monthsAsMember / 12;
  const maxWeekStreak = calcMaxWeekStreak(sessions);

  return ALL_BADGES.map((badge): BadgeWithStatus => {
    let earned = false;
    let progress: number | undefined;
    let progressLabel: string | undefined;

    switch (badge.id) {

      // ASSISTÈNCIA
      case 'ass_1':
        earned = totalSessions >= 1;
        progress = Math.min(100, totalSessions * 100);
        progressLabel = `${totalSessions} / 1 classe`;
        break;
      case 'ass_5':
        earned = totalSessions >= 5;
        progress = Math.min(100, Math.round((totalSessions / 5) * 100));
        progressLabel = `${totalSessions} / 5 classes`;
        break;
      case 'ass_10':
        earned = totalSessions >= 10;
        progress = Math.min(100, Math.round((totalSessions / 10) * 100));
        progressLabel = `${totalSessions} / 10 classes`;
        break;
      case 'ass_25':
        earned = totalSessions >= 25;
        progress = Math.min(100, Math.round((totalSessions / 25) * 100));
        progressLabel = `${totalSessions} / 25 classes`;
        break;
      case 'ass_50':
        earned = totalSessions >= 50;
        progress = Math.min(100, Math.round((totalSessions / 50) * 100));
        progressLabel = `${totalSessions} / 50 classes`;
        break;
      case 'ass_100':
        earned = totalSessions >= 100;
        progress = Math.min(100, Math.round((totalSessions / 100) * 100));
        progressLabel = `${totalSessions} / 100 classes`;
        break;
      case 'ass_200':
        earned = totalSessions >= 200;
        progress = Math.min(100, Math.round((totalSessions / 200) * 100));
        progressLabel = `${totalSessions} / 200 classes`;
        break;
      case 'ass_365':
        earned = totalSessions >= 365;
        progress = Math.min(100, Math.round((totalSessions / 365) * 100));
        progressLabel = `${totalSessions} / 365 classes`;
        break;
      case 'ass_500':
        earned = totalSessions >= 500;
        progress = Math.min(100, Math.round((totalSessions / 500) * 100));
        progressLabel = `${totalSessions} / 500 classes`;
        break;

      // RATXA
      case 'ratxa_2':
        earned = maxWeekStreak >= 2;
        progress = Math.min(100, Math.round((maxWeekStreak / 2) * 100));
        progressLabel = `${maxWeekStreak} / 2 setmanes`;
        break;
      case 'ratxa_4':
        earned = maxWeekStreak >= 4;
        progress = Math.min(100, Math.round((maxWeekStreak / 4) * 100));
        progressLabel = `${maxWeekStreak} / 4 setmanes`;
        break;
      case 'ratxa_8':
        earned = maxWeekStreak >= 8;
        progress = Math.min(100, Math.round((maxWeekStreak / 8) * 100));
        progressLabel = `${maxWeekStreak} / 8 setmanes`;
        break;
      case 'ratxa_12':
        earned = maxWeekStreak >= 12;
        progress = Math.min(100, Math.round((maxWeekStreak / 12) * 100));
        progressLabel = `${maxWeekStreak} / 12 setmanes`;
        break;
      case 'ratxa_26':
        earned = maxWeekStreak >= 26;
        progress = Math.min(100, Math.round((maxWeekStreak / 26) * 100));
        progressLabel = `${maxWeekStreak} / 26 setmanes`;
        break;
      case 'ratxa_52':
        earned = maxWeekStreak >= 52;
        progress = Math.min(100, Math.round((maxWeekStreak / 52) * 100));
        progressLabel = `${maxWeekStreak} / 52 setmanes`;
        break;

      // ANTIGUITAT
      case 'ant_1m':
        earned = monthsAsMember >= 1;
        progress = Math.min(100, Math.round((monthsAsMember / 1) * 100));
        progressLabel = `${monthsAsMember} / 1 mes`;
        break;
      case 'ant_3m':
        earned = monthsAsMember >= 3;
        progress = Math.min(100, Math.round((monthsAsMember / 3) * 100));
        progressLabel = `${monthsAsMember} / 3 mesos`;
        break;
      case 'ant_6m':
        earned = monthsAsMember >= 6;
        progress = Math.min(100, Math.round((monthsAsMember / 6) * 100));
        progressLabel = `${monthsAsMember} / 6 mesos`;
        break;
      case 'ant_1a':
        earned = yearsAsMember >= 1;
        progress = Math.min(100, Math.round((monthsAsMember / 12) * 100));
        progressLabel = `${monthsAsMember} / 12 mesos`;
        break;
      case 'ant_2a':
        earned = yearsAsMember >= 2;
        progress = Math.min(100, Math.round((monthsAsMember / 24) * 100));
        progressLabel = `${monthsAsMember} / 24 mesos`;
        break;
      case 'ant_3a':
        earned = yearsAsMember >= 3;
        progress = Math.min(100, Math.round((monthsAsMember / 36) * 100));
        progressLabel = `${monthsAsMember} / 36 mesos`;
        break;
      case 'ant_5a':
        earned = yearsAsMember >= 5;
        progress = Math.min(100, Math.round((monthsAsMember / 60) * 100));
        progressLabel = `${monthsAsMember} / 60 mesos`;
        break;
      case 'ant_10a':
        earned = yearsAsMember >= 10;
        progress = Math.min(100, Math.round((monthsAsMember / 120) * 100));
        progressLabel = `${monthsAsMember} / 120 mesos`;
        break;

      // PROGRAMES
      case 'prog_2':
        earned = uniquePrograms >= 2;
        progress = Math.min(100, Math.round((uniquePrograms / 2) * 100));
        progressLabel = `${uniquePrograms} / 2 programes`;
        break;
      case 'prog_3':
        earned = uniquePrograms >= 3;
        progress = Math.min(100, Math.round((uniquePrograms / 3) * 100));
        progressLabel = `${uniquePrograms} / 3 programes`;
        break;
      case 'prog_5':
        earned = uniquePrograms >= 5;
        progress = Math.min(100, Math.round((uniquePrograms / 5) * 100));
        progressLabel = `${uniquePrograms} / 5 programes`;
        break;
      case 'prog_8':
        earned = uniquePrograms >= 8;
        progress = Math.min(100, Math.round((uniquePrograms / 8) * 100));
        progressLabel = `${uniquePrograms} / 8 programes`;
        break;
      case 'prog_10':
        earned = uniquePrograms >= 10;
        progress = Math.min(100, Math.round((uniquePrograms / 10) * 100));
        progressLabel = `${uniquePrograms} / 10 programes`;
        break;
      case 'prog_15':
        earned = uniquePrograms >= 15;
        progress = Math.min(100, Math.round((uniquePrograms / 15) * 100));
        progressLabel = `${uniquePrograms} / 15 programes`;
        break;

      // EXPLORADORA
      case 'exp_nou':
        earned = uniquePrograms >= 2; // Ha provat més d'un programa
        progress = earned ? 100 : 0;
        progressLabel = earned ? 'Completat!' : 'Prova un programa nou';
        break;
      case 'exp_centre':
        earned = uniqueCenters >= 2;
        progress = Math.min(100, Math.round((uniqueCenters / 2) * 100));
        progressLabel = `${uniqueCenters} / 2 centres`;
        break;
      case 'exp_matidora':
        earned = hasEarlyMorningClass(sessions);
        progress = earned ? 100 : 0;
        progressLabel = earned ? 'Completat!' : 'Vine a una classe abans de les 9h';
        break;
      case 'exp_vespre':
        earned = hasEveningClass(sessions);
        progress = earned ? 100 : 0;
        progressLabel = earned ? 'Completat!' : 'Vine a una classe a les 20h o més tard';
        break;
      case 'exp_5dies':
        earned = hasFiveDaysInOneWeek(sessions);
        progress = earned ? 100 : 0;
        progressLabel = earned ? 'Completat!' : 'Vine 5 dies laborables en una setmana';
        break;
      case 'exp_3dies_seguits':
        earned = hasThreeConsecutiveDays(sessions);
        progress = earned ? 100 : 0;
        progressLabel = earned ? 'Completat!' : 'Vine 3 dies seguits';
        break;

      // ESPECIALS
      case 'esp_comeback':
        earned = hasComeback(sessions);
        progress = earned ? 100 : 0;
        progressLabel = earned ? 'Completat!' : 'Torna després de 30 dies d\'absència';
        break;
      case 'esp_consistent':
        earned = hasConsistentMonths(sessions);
        progress = earned ? 100 : 0;
        progressLabel = earned ? 'Completat!' : 'Mantén la mateixa freqüència 3 mesos';
        break;
      case 'esp_any_nou':
        earned = hasNewYearClass(sessions);
        progress = earned ? 100 : 0;
        progressLabel = earned ? 'Completat!' : 'Vine a una classe del 1 al 7 de gener';
        break;

      default:
        earned = false;
        progress = 0;
    }

    return {
      ...badge,
      earned,
      progress,
      progressLabel,
    };
  });
}

/** Retorna un resum ràpid de les insígnies */
export function getBadgeSummary(badges: BadgeWithStatus[]) {
  const earned = badges.filter(b => b.earned);
  const total = badges.length;
  const byCategory = earned.reduce((acc, b) => {
    acc[b.category] = (acc[b.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    earnedCount: earned.length,
    totalCount: total,
    percentage: Math.round((earned.length / total) * 100),
    byCategory,
  };
}
