// ============================================================
// CÀLCULS PER DETERMINAR QUINES INSÍGNIES HA GUANYAT L'USUARI
// ============================================================

import { getAllBadgesWithDynamic, BadgeWithStatus } from '@/types/badges';

interface Session {
  activity: string;
  center: string;
  date: string;
  time?: string;
}

interface ProgramInfo {
  name: string;
  category?: string;
}

interface UserDataForBadges {
  sessions?: Session[];
  firstSession?: string;
}

// ------------------------------------------------------------
// HELPERS INTERNS
// ------------------------------------------------------------

function getWeekKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(
    ((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
  );
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function getDayKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

function calcMaxWeekStreak(sessions: Session[]): number {
  if (!sessions.length) return 0;
  const weekSet = new Set(sessions.map(s => getWeekKey(new Date(s.date))));
  const weeks = Array.from(weekSet).sort();
  let maxStreak = 1;
  let currentStreak = 1;
  for (let i = 1; i < weeks.length; i++) {
    const [yearPrev, wPrev] = weeks[i - 1].split('-W').map(Number);
    const [yearCurr, wCurr] = weeks[i].split('-W').map(Number);
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

function calcMonthsAsMember(firstSession?: string): number {
  if (!firstSession) return 0;
  const first = new Date(firstSession);
  const now = new Date();
  return (now.getFullYear() - first.getFullYear()) * 12 + (now.getMonth() - first.getMonth());
}

function calcDaysSinceFirstSession(firstSession?: string): number {
  if (!firstSession) return 0;
  const first = new Date(firstSession);
  const now = new Date();
  return Math.floor((now.getTime() - first.getTime()) / 86400000);
}

function hasThreeConsecutiveDays(sessions: Session[]): boolean {
  if (sessions.length < 3) return false;
  const daySet = new Set(sessions.map(s => getDayKey(new Date(s.date))));
  const days = Array.from(daySet).sort();
  for (let i = 2; i < days.length; i++) {
    const d0 = new Date(days[i - 2]);
    const d1 = new Date(days[i - 1]);
    const d2 = new Date(days[i]);
    if (
      (d1.getTime() - d0.getTime()) / 86400000 === 1 &&
      (d2.getTime() - d1.getTime()) / 86400000 === 1
    ) return true;
  }
  return false;
}

function hasFiveDaysInOneWeek(sessions: Session[]): boolean {
  const weekDays: Record<string, Set<number>> = {};
  for (const s of sessions) {
    const d = new Date(s.date);
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue;
    const wk = getWeekKey(d);
    if (!weekDays[wk]) weekDays[wk] = new Set();
    weekDays[wk].add(dow);
  }
  return Object.values(weekDays).some(set => set.size >= 5);
}

function hasComeback(sessions: Session[]): boolean {
  if (sessions.length < 2) return false;
  const sorted = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
  for (let i = 1; i < sorted.length; i++) {
    const d1 = new Date(sorted[i - 1].date);
    const d2 = new Date(sorted[i].date);
    if ((d2.getTime() - d1.getTime()) / 86400000 > 30) return true;
  }
  return false;
}

function hasConsistentMonths(sessions: Session[]): boolean {
  if (sessions.length < 6) return false;
  const monthCount: Record<string, number> = {};
  for (const s of sessions) {
    const d = new Date(s.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthCount[key] = (monthCount[key] || 0) + 1;
  }
  const keys = Object.keys(monthCount).sort();
  if (keys.length < 3) return false;
  for (let i = 2; i < keys.length; i++) {
    if (
      monthCount[keys[i]] === monthCount[keys[i - 1]] &&
      monthCount[keys[i]] === monthCount[keys[i - 2]]
    ) return true;
  }
  return false;
}

/** Comprova si ha fet classe de matí (abans 12h) I tarda (17h+) en la mateixa setmana */
function hasDoubleMorningEvening(sessions: Session[]): boolean {
  const byWeek: Record<string, { hasMorning: boolean; hasEvening: boolean }> = {};
  for (const s of sessions) {
    if (!s.time) continue;
    const hour = parseInt(s.time.split(':')[0], 10);
    const wk = getWeekKey(new Date(s.date));
    if (!byWeek[wk]) byWeek[wk] = { hasMorning: false, hasEvening: false };
    if (hour < 12) byWeek[wk].hasMorning = true;
    if (hour >= 17) byWeek[wk].hasEvening = true;
  }
  return Object.values(byWeek).some(w => w.hasMorning && w.hasEvening);
}

/** Comprova si ha fet classe de matí (abans 12h) */
function hasMorningClass(sessions: Session[]): boolean {
  return sessions.some(s => {
    if (!s.time) return false;
    return parseInt(s.time.split(':')[0], 10) < 12;
  });
}

/** Comprova si ha fet classe de vespre (20h+) */
function hasEveningClass(sessions: Session[]): boolean {
  return sessions.some(s => {
    if (!s.time) return false;
    return parseInt(s.time.split(':')[0], 10) >= 20;
  });
}

/** Comprova insígnia d'any nou per un any concret (classes del 1 al 7 de gener) */
function hasNewYearClass(sessions: Session[], year: number): boolean {
  return sessions.some(s => {
    const d = new Date(s.date);
    return d.getFullYear() === year && d.getMonth() === 0 && d.getDate() <= 7;
  });
}

/** Calcula quantes categories úniques ha provat l'usuari, usant el mapa de programes */
function calcUniqueCategories(sessions: Session[], programsMap: Record<string, string>): number {
  const categories = new Set<string>();
  for (const s of sessions) {
    const cat = programsMap[s.activity];
    if (cat) categories.add(cat);
  }
  return categories.size;
}

// ------------------------------------------------------------
// FUNCIÓ PRINCIPAL
// ------------------------------------------------------------

export function calculateBadges(
  userData: UserDataForBadges,
  programs: ProgramInfo[] = [],
  totalAvailableCategories: number = 3
): BadgeWithStatus[] {

  const sessions = userData.sessions || [];
  const totalSessions = sessions.length;
  const monthsAsMember = calcMonthsAsMember(userData.firstSession);
  const yearsAsMember = monthsAsMember / 12;
  const daysSinceFirst = calcDaysSinceFirstSession(userData.firstSession);
  const maxWeekStreak = calcMaxWeekStreak(sessions);

  // Construïm un mapa activity -> category a partir dels programes de Firebase
  const programsMap: Record<string, string> = {};
  for (const p of programs) {
    if (p.name && p.category) {
      programsMap[p.name] = p.category;
    }
  }
  const uniqueCategories = calcUniqueCategories(sessions, programsMap);

  const allBadges = getAllBadgesWithDynamic();

  return allBadges.map((badge): BadgeWithStatus => {
    let earned = false;
    let progress: number | undefined;
    let progressLabel: string | undefined;
    let unavailable = false;

    switch (true) {

      // ASSISTÈNCIA
      case badge.id === 'ass_1':
        earned = totalSessions >= 1;
        progress = Math.min(100, totalSessions * 100);
        progressLabel = `${totalSessions} / 1 classe`;
        break;
      case badge.id === 'ass_5':
        earned = totalSessions >= 5;
        progress = Math.min(100, Math.round((totalSessions / 5) * 100));
        progressLabel = `${totalSessions} / 5 classes`;
        break;
      case badge.id === 'ass_10':
        earned = totalSessions >= 10;
        progress = Math.min(100, Math.round((totalSessions / 10) * 100));
        progressLabel = `${totalSessions} / 10 classes`;
        break;
      case badge.id === 'ass_25':
        earned = totalSessions >= 25;
        progress = Math.min(100, Math.round((totalSessions / 25) * 100));
        progressLabel = `${totalSessions} / 25 classes`;
        break;
      case badge.id === 'ass_50':
        earned = totalSessions >= 50;
        progress = Math.min(100, Math.round((totalSessions / 50) * 100));
        progressLabel = `${totalSessions} / 50 classes`;
        break;
      case badge.id === 'ass_100':
        earned = totalSessions >= 100;
        progress = Math.min(100, Math.round((totalSessions / 100) * 100));
        progressLabel = `${totalSessions} / 100 classes`;
        break;
      case badge.id === 'ass_200':
        earned = totalSessions >= 200;
        progress = Math.min(100, Math.round((totalSessions / 200) * 100));
        progressLabel = `${totalSessions} / 200 classes`;
        break;
      case badge.id === 'ass_aniversari':
        earned = daysSinceFirst >= 365;
        progress = Math.min(100, Math.round((daysSinceFirst / 365) * 100));
        progressLabel = `${daysSinceFirst} / 365 dies`;
        break;
      case badge.id === 'ass_500':
        earned = totalSessions >= 500;
        progress = Math.min(100, Math.round((totalSessions / 500) * 100));
        progressLabel = `${totalSessions} / 500 classes`;
        break;

      // RATXA
      case badge.id === 'ratxa_2':
        earned = maxWeekStreak >= 2;
        progress = Math.min(100, Math.round((maxWeekStreak / 2) * 100));
        progressLabel = `${maxWeekStreak} / 2 setmanes`;
        break;
      case badge.id === 'ratxa_4':
        earned = maxWeekStreak >= 4;
        progress = Math.min(100, Math.round((maxWeekStreak / 4) * 100));
        progressLabel = `${maxWeekStreak} / 4 setmanes`;
        break;
      case badge.id === 'ratxa_8':
        earned = maxWeekStreak >= 8;
        progress = Math.min(100, Math.round((maxWeekStreak / 8) * 100));
        progressLabel = `${maxWeekStreak} / 8 setmanes`;
        break;
      case badge.id === 'ratxa_12':
        earned = maxWeekStreak >= 12;
        progress = Math.min(100, Math.round((maxWeekStreak / 12) * 100));
        progressLabel = `${maxWeekStreak} / 12 setmanes`;
        break;
      case badge.id === 'ratxa_26':
        earned = maxWeekStreak >= 26;
        progress = Math.min(100, Math.round((maxWeekStreak / 26) * 100));
        progressLabel = `${maxWeekStreak} / 26 setmanes`;
        break;
      case badge.id === 'ratxa_52':
        earned = maxWeekStreak >= 52;
        progress = Math.min(100, Math.round((maxWeekStreak / 52) * 100));
        progressLabel = `${maxWeekStreak} / 52 setmanes`;
        break;

      // ANTIGUITAT
      case badge.id === 'ant_1m':
        earned = monthsAsMember >= 1;
        progress = Math.min(100, Math.round((monthsAsMember / 1) * 100));
        progressLabel = `${monthsAsMember} / 1 mes`;
        break;
      case badge.id === 'ant_3m':
        earned = monthsAsMember >= 3;
        progress = Math.min(100, Math.round((monthsAsMember / 3) * 100));
        progressLabel = `${monthsAsMember} / 3 mesos`;
        break;
      case badge.id === 'ant_6m':
        earned = monthsAsMember >= 6;
        progress = Math.min(100, Math.round((monthsAsMember / 6) * 100));
        progressLabel = `${monthsAsMember} / 6 mesos`;
        break;
      case badge.id === 'ant_1a':
        earned = yearsAsMember >= 1;
        progress = Math.min(100, Math.round((monthsAsMember / 12) * 100));
        progressLabel = `${monthsAsMember} / 12 mesos`;
        break;
      case badge.id === 'ant_2a':
        earned = yearsAsMember >= 2;
        progress = Math.min(100, Math.round((monthsAsMember / 24) * 100));
        progressLabel = `${monthsAsMember} / 24 mesos`;
        break;
      case badge.id === 'ant_3a':
        earned = yearsAsMember >= 3;
        progress = Math.min(100, Math.round((monthsAsMember / 36) * 100));
        progressLabel = `${monthsAsMember} / 36 mesos`;
        break;
      case badge.id === 'ant_5a':
        earned = yearsAsMember >= 5;
        progress = Math.min(100, Math.round((monthsAsMember / 60) * 100));
        progressLabel = `${monthsAsMember} / 60 mesos`;
        break;
      case badge.id === 'ant_10a':
        earned = yearsAsMember >= 10;
        progress = Math.min(100, Math.round((monthsAsMember / 120) * 100));
        progressLabel = `${monthsAsMember} / 120 mesos`;
        break;

      // PROGRAMES PER CATEGORIES
      case badge.id === 'prog_cat_2':
        unavailable = totalAvailableCategories < 2;
        earned = !unavailable && uniqueCategories >= 2;
        progress = unavailable ? 0 : Math.min(100, Math.round((uniqueCategories / 2) * 100));
        progressLabel = unavailable ? 'No disponible al teu gym' : `${uniqueCategories} / 2 categories`;
        break;
      case badge.id === 'prog_cat_3':
        unavailable = totalAvailableCategories < 3;
        earned = !unavailable && uniqueCategories >= 3;
        progress = unavailable ? 0 : Math.min(100, Math.round((uniqueCategories / 3) * 100));
        progressLabel = unavailable ? 'No disponible al teu gym' : `${uniqueCategories} / 3 categories`;
        break;
      case badge.id === 'prog_cat_all':
        unavailable = totalAvailableCategories < 2;
        earned = !unavailable && uniqueCategories >= totalAvailableCategories;
        progress = unavailable ? 0 : Math.min(100, Math.round((uniqueCategories / totalAvailableCategories) * 100));
        progressLabel = unavailable
          ? 'No disponible al teu gym'
          : `${uniqueCategories} / ${totalAvailableCategories} categories`;
        break;

      // EXPLORADORA
      case badge.id === 'exp_matidora':
        earned = hasMorningClass(sessions);
        progress = earned ? 100 : 0;
        progressLabel = earned ? 'Completat!' : 'Vine a una classe abans de les 12h';
        break;
      case badge.id === 'exp_vespre':
        earned = hasEveningClass(sessions);
        progress = earned ? 100 : 0;
        progressLabel = earned ? 'Completat!' : 'Vine a una classe a les 20h o més tard';
        break;
      case badge.id === 'exp_doble':
        earned = hasDoubleMorningEvening(sessions);
        progress = earned ? 100 : 0;
        progressLabel = earned ? 'Completat!' : 'Vine de matí i de tarda la mateixa setmana';
        break;
      case badge.id === 'exp_5dies':
        earned = hasFiveDaysInOneWeek(sessions);
        progress = earned ? 100 : 0;
        progressLabel = earned ? 'Completat!' : 'Vine 5 dies laborables en una setmana';
        break;
      case badge.id === 'exp_3dies_seguits':
        earned = hasThreeConsecutiveDays(sessions);
        progress = earned ? 100 : 0;
        progressLabel = earned ? 'Completat!' : 'Vine 3 dies seguits';
        break;

      // ESPECIALS
      case badge.id === 'esp_comeback':
        earned = hasComeback(sessions);
        progress = earned ? 100 : 0;
        progressLabel = earned ? 'Completat!' : 'Torna després de 30 dies d\'absència';
        break;
      case badge.id === 'esp_consistent':
        earned = hasConsistentMonths(sessions);
        progress = earned ? 100 : 0;
        progressLabel = earned ? 'Completat!' : 'Mantén la mateixa freqüència 3 mesos';
        break;

      // ESPECIALS - ANY NOU (col·leccionables)
      default:
        if (badge.id.startsWith('esp_any_nou_')) {
          const year = parseInt(badge.id.replace('esp_any_nou_', ''), 10);
          earned = hasNewYearClass(sessions, year);
          progress = earned ? 100 : 0;
          progressLabel = earned ? 'Completat!' : `Vine del 1 al 7 de gener de ${year}`;
        }
        break;
    }

    return { ...badge, earned, progress, progressLabel, unavailable };
  });
}

export function getBadgeSummary(badges: BadgeWithStatus[]) {
  const available = badges.filter(b => !b.unavailable);
  const earned = available.filter(b => b.earned);
  const total = available.length;
  const byCategory = earned.reduce((acc, b) => {
    acc[b.category] = (acc[b.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    earnedCount: earned.length,
    totalCount: total,
    percentage: total > 0 ? Math.round((earned.length / total) * 100) : 0,
    byCategory,
  };
}
