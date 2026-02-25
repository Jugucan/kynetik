// ============================================================
// CÀLCULS D'INSÍGNIES
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
// HELPERS
// ------------------------------------------------------------

function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/['\-\s]/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function findCategory(
  activity: string,
  programEntries: Array<{ normalizedName: string; category: string }>
): string | null {
  const norm = normalize(activity);
  for (const entry of programEntries) {
    if (norm.includes(entry.normalizedName)) return entry.category;
  }
  return null;
}

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
  const weeks = Array.from(new Set(sessions.map(s => getWeekKey(new Date(s.date))))).sort();
  let max = 1, cur = 1;
  for (let i = 1; i < weeks.length; i++) {
    const [yp, wp] = weeks[i - 1].split('-W').map(Number);
    const [yc, wc] = weeks[i].split('-W').map(Number);
    const consec = (yc === yp && wc === wp + 1) || (yc === yp + 1 && wp >= 52 && wc === 1);
    cur = consec ? cur + 1 : 1;
    if (cur > max) max = cur;
  }
  return max;
}

function calcMonthsAsMember(firstSession?: string): number {
  if (!firstSession) return 0;
  const first = new Date(firstSession);
  const now = new Date();
  return (now.getFullYear() - first.getFullYear()) * 12 + (now.getMonth() - first.getMonth());
}

function calcDaysSinceFirstSession(firstSession?: string): number {
  if (!firstSession) return 0;
  return Math.floor((Date.now() - new Date(firstSession).getTime()) / 86400000);
}

function hasActiveYearMember(sessions: Session[], firstSession?: string): boolean {
  if (!firstSession) return false;
  const first = new Date(firstSession);
  if (Math.floor((Date.now() - first.getTime()) / 86400000) < 365) return false;

  const monthsWithSessions = new Set(
    sessions.map(s => {
      const d = new Date(s.date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    })
  );
  const months: string[] = [];
  const cursor = new Date(first.getFullYear(), first.getMonth(), 1);
  const end = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  while (cursor <= end) {
    months.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months.every(m => monthsWithSessions.has(m));
}

/** 100 classes en qualsevol finestra de 365 dies consecutius */
function has100In365Days(sessions: Session[]): boolean {
  if (sessions.length < 100) return false;
  const sorted = [...sessions]
    .map(s => new Date(s.date).getTime())
    .sort((a, b) => a - b);
  for (let i = 99; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 99] <= 365 * 86400000) return true;
  }
  return false;
}

function hasThreeConsecutiveDays(sessions: Session[]): boolean {
  if (sessions.length < 3) return false;
  const days = Array.from(new Set(sessions.map(s => getDayKey(new Date(s.date))))).sort();
  for (let i = 2; i < days.length; i++) {
    const d0 = new Date(days[i - 2]).getTime();
    const d1 = new Date(days[i - 1]).getTime();
    const d2 = new Date(days[i]).getTime();
    if (d1 - d0 === 86400000 && d2 - d1 === 86400000) return true;
  }
  return false;
}

function hasThreeDaysInOneWeek(sessions: Session[]): boolean {
  const byWeek: Record<string, Set<string>> = {};
  for (const s of sessions) {
    const wk = getWeekKey(new Date(s.date));
    if (!byWeek[wk]) byWeek[wk] = new Set();
    byWeek[wk].add(getDayKey(new Date(s.date)));
  }
  return Object.values(byWeek).some(days => days.size >= 3);
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
    const diff = (new Date(sorted[i].date).getTime() - new Date(sorted[i - 1].date).getTime()) / 86400000;
    if (diff > 30) return true;
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
  for (let i = 2; i < keys.length; i++) {
    if (monthCount[keys[i]] === monthCount[keys[i - 1]] &&
        monthCount[keys[i]] === monthCount[keys[i - 2]]) return true;
  }
  return false;
}

function hasDoubleMorningEvening(sessions: Session[]): boolean {
  const byWeek: Record<string, { morning: boolean; evening: boolean }> = {};
  for (const s of sessions) {
    if (!s.time) continue;
    const hour = parseInt(s.time.split(':')[0], 10);
    const wk = getWeekKey(new Date(s.date));
    if (!byWeek[wk]) byWeek[wk] = { morning: false, evening: false };
    if (hour < 12) byWeek[wk].morning = true;
    if (hour >= 17) byWeek[wk].evening = true;
  }
  return Object.values(byWeek).some(w => w.morning && w.evening);
}

function hasMorningClass(sessions: Session[]): boolean {
  return sessions.some(s => s.time && parseInt(s.time.split(':')[0], 10) < 12);
}

function hasEveningClass(sessions: Session[]): boolean {
  return sessions.some(s => s.time && parseInt(s.time.split(':')[0], 10) >= 20);
}

function hasNewYearClass(sessions: Session[], year: number): boolean {
  return sessions.some(s => {
    const d = new Date(s.date);
    return d.getFullYear() === year && d.getMonth() === 0 && d.getDate() <= 15;
  });
}

function calcBestWeekStreak(sessions: Session[]): { count: number; endWeekLabel: string } {
  if (!sessions.length) return { count: 0, endWeekLabel: '' };
  const weeks = Array.from(new Set(sessions.map(s => getWeekKey(new Date(s.date))))).sort();
  let max = 1, cur = 1, bestEndWk = weeks[0];
  for (let i = 1; i < weeks.length; i++) {
    const [yp, wp] = weeks[i - 1].split('-W').map(Number);
    const [yc, wc] = weeks[i].split('-W').map(Number);
    const consec = (yc === yp && wc === wp + 1) || (yc === yp + 1 && wp >= 52 && wc === 1);
    cur = consec ? cur + 1 : 1;
    if (cur > max) { max = cur; bestEndWk = weeks[i]; }
  }
  return { count: max, endWeekLabel: weekKeyToDateLabel(bestEndWk) };
}

function weekKeyToDateLabel(weekKey: string): string {
  if (!weekKey) return '';
  const [year, week] = weekKey.split('-W').map(Number);
  // Calculem el dilluns d'aquella setmana ISO
  const jan4 = new Date(year, 0, 4);
  const startOfWeek = new Date(jan4);
  startOfWeek.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (week - 1) * 7);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  const monthNames = ['gen','feb','mar','abr','mai','jun','jul','ago','set','oct','nov','des'];
  return `${startOfWeek.getDate()} ${monthNames[startOfWeek.getMonth()]} – ${endOfWeek.getDate()} ${monthNames[endOfWeek.getMonth()]} ${year}`;
}

function calcBestWeekClasses(sessions: Session[]): { count: number; weekLabel: string } {
  if (!sessions.length) return { count: 0, weekLabel: '' };
  const byWeek: Record<string, number> = {};
  for (const s of sessions) {
    const wk = getWeekKey(new Date(s.date));
    byWeek[wk] = (byWeek[wk] || 0) + 1;
  }
  let bestWk = '', bestCount = 0;
  for (const [wk, count] of Object.entries(byWeek)) {
    if (count > bestCount) { bestCount = count; bestWk = wk; }
  }
  return { count: bestCount, weekLabel: weekKeyToDateLabel(bestWk) };
}

function calcBestMonthClasses(sessions: Session[]): { count: number; monthLabel: string } {
  if (!sessions.length) return { count: 0, monthLabel: '' };
  const byMonth: Record<string, number> = {};
  for (const s of sessions) {
    const d = new Date(s.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    byMonth[key] = (byMonth[key] || 0) + 1;
  }
  let bestMonth = '', bestCount = 0;
  for (const [month, count] of Object.entries(byMonth)) {
    if (count > bestCount) { bestCount = count; bestMonth = month; }
  }
  const [year, month] = bestMonth.split('-');
  const monthNames = ['Gen','Feb','Mar','Abr','Mai','Jun','Jul','Ago','Set','Oct','Nov','Des'];
  const label = bestMonth ? `${monthNames[parseInt(month) - 1]} ${year}` : '';
  return { count: bestCount, monthLabel: label };
}

function calcBestWeekXP(sessions: Session[]): { xp: number; weekLabel: string } {
  if (!sessions.length) return { xp: 0, weekLabel: '' };
  const byWeek: Record<string, number> = {};
  for (const s of sessions) {
    const wk = getWeekKey(new Date(s.date));
    byWeek[wk] = (byWeek[wk] || 0) + 1;
  }
  const sortedWeeks = Object.keys(byWeek).sort();
  let bestWk = '', bestXP = 0;
  for (let i = 0; i < sortedWeeks.length; i++) {
    const wk = sortedWeeks[i];
    const n = byWeek[wk];
    let weekXP = n * 10;
    if (n >= 5) weekXP += 30;
    else if (n >= 3) weekXP += 20;
    else if (n >= 2) weekXP += 10;
    if (i > 0) {
      const [yp, wp] = sortedWeeks[i-1].split('-W').map(Number);
      const [yc, wc] = wk.split('-W').map(Number);
      const consec = (yc === yp && wc === wp + 1) || (yc === yp + 1 && wp >= 52 && wc === 1);
      if (consec) weekXP += 15;
    }
    if (weekXP > bestXP) { bestXP = weekXP; bestWk = wk; }
  }
  return { xp: bestXP, weekLabel: weekKeyToDateLabel(bestWk) };
}

function findEarnedDate(sessions: Session[], condition: (subset: Session[]) => boolean): string | undefined {
  const sorted = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
  for (let i = 0; i < sorted.length; i++) {
    const subset = sorted.slice(0, i + 1);
    if (condition(subset)) {
      const d = new Date(sorted[i].date);
      const monthNames = ['gen','feb','mar','abr','mai','jun','jul','ago','set','oct','nov','des'];
      return `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    }
  }
  return undefined;
}

// ------------------------------------------------------------
// FUNCIÓ PRINCIPAL
// ------------------------------------------------------------

export function calculateBadges(
  userData: UserDataForBadges,
  programs: ProgramInfo[] = [],
  totalAvailableCategories: number = 3
): BadgeWithStatus[] {

  const sessions = (Array.isArray(userData.sessions) ? userData.sessions : []).filter(s => {
  if (!s?.date) return false;
  const d = new Date(s.date);
  return !isNaN(d.getTime());
});
  const totalSessions = sessions.length;
  const monthsAsMember = calcMonthsAsMember(userData.firstSession);
  const yearsAsMember = monthsAsMember / 12;
  const daysSinceFirst = calcDaysSinceFirstSession(userData.firstSession);
  const maxWeekStreak = calcMaxWeekStreak(sessions);
  const bestStreakData = calcBestWeekStreak(sessions);
  const bestWeekStreak = bestStreakData.count;
  const bestWeekStreakLabel = bestStreakData.endWeekLabel;
  const bestWeek = calcBestWeekClasses(sessions);
  const bestMonth = calcBestMonthClasses(sessions);
  const bestWeekXP = calcBestWeekXP(sessions);

  const programEntries = programs
    .filter(p => p.name && p.category)
    .map(p => ({
      normalizedName: normalize(p.name),
      category: p.category!.trim().toLowerCase(),
    }));

  const uniqueCategoriesSet = new Set<string>();
  for (const s of sessions) {
    const cat = findCategory(s.activity, programEntries);
    if (cat) uniqueCategoriesSet.add(cat);
  }
  const uniqueCategories = uniqueCategoriesSet.size;

  const availableCategories = new Set(
    programs.map(p => p.category?.trim().toLowerCase()).filter(Boolean) as string[]
  );
  const realTotalCategories = availableCategories.size || totalAvailableCategories;

  const hasAllCategoriesInOneWeek = (): boolean => {
    const byWeek: Record<string, Set<string>> = {};
    for (const s of sessions) {
      const cat = findCategory(s.activity, programEntries);
      if (!cat) continue;
      const wk = getWeekKey(new Date(s.date));
      if (!byWeek[wk]) byWeek[wk] = new Set();
      byWeek[wk].add(cat);
    }
    return Object.values(byWeek).some(cats =>
      ['força', 'cardio', 'flexibilitat'].every(c => cats.has(c))
    );
  };

  const currentYear = new Date().getFullYear();
  const newYearBadgeEarned: Record<number, boolean> = {};
  for (let year = 2020; year <= currentYear; year++) {
    newYearBadgeEarned[year] = hasNewYearClass(sessions, year);
  }

  // Filtrem anys nous passats no aconseguits
  const filteredBadges = getAllBadgesWithDynamic().filter(badge => {
    if (!badge.id.startsWith('esp_any_nou_')) return true;
    const year = parseInt(badge.id.replace('esp_any_nou_', ''), 10);
    return year === currentYear || newYearBadgeEarned[year] === true;
  });

  return filteredBadges.map((badge): BadgeWithStatus => {
    let earned = false;
    let progress: number | undefined;
    let progressLabel: string | undefined;
    let earnedAt: string | undefined;
    let unavailable = false;

    switch (badge.id) {

      // ASSISTÈNCIA
      case 'ass_1':
        earned = totalSessions >= 1;
        progress = Math.min(100, totalSessions * 100);
        progressLabel = `${totalSessions} / 1 classe`;
        if (earned) earnedAt = findEarnedDate(sessions, s => s.length >= 1);
        break;
      case 'ass_5':
        earned = totalSessions >= 5;
        progress = Math.min(100, Math.round((totalSessions / 5) * 100));
        progressLabel = `${totalSessions} / 5 classes`;
        if (earned) earnedAt = findEarnedDate(sessions, s => s.length >= 5);
        break;
      case 'ass_10':
        earned = totalSessions >= 10;
        progress = Math.min(100, Math.round((totalSessions / 10) * 100));
        progressLabel = `${totalSessions} / 10 classes`;
        if (earned) earnedAt = findEarnedDate(sessions, s => s.length >= 10);
        break;
      case 'ass_25':
        earned = totalSessions >= 25;
        progress = Math.min(100, Math.round((totalSessions / 25) * 100));
        progressLabel = `${totalSessions} / 25 classes`;
        if (earned) earnedAt = findEarnedDate(sessions, s => s.length >= 25);
        break;
      case 'ass_50':
        earned = totalSessions >= 50;
        progress = Math.min(100, Math.round((totalSessions / 50) * 100));
        progressLabel = `${totalSessions} / 50 classes`;
        if (earned) earnedAt = findEarnedDate(sessions, s => s.length >= 50);
        break;
      case 'ass_100':
        earned = totalSessions >= 100;
        progress = Math.min(100, Math.round((totalSessions / 100) * 100));
        progressLabel = `${totalSessions} / 100 classes`;
        if (earned) earnedAt = findEarnedDate(sessions, s => s.length >= 100);
        break;
      case 'ass_200':
        earned = totalSessions >= 200;
        progress = Math.min(100, Math.round((totalSessions / 200) * 100));
        progressLabel = `${totalSessions} / 200 classes`;
        if (earned) earnedAt = findEarnedDate(sessions, s => s.length >= 200);
        break;
      case 'ass_500':
        earned = totalSessions >= 500;
        progress = Math.min(100, Math.round((totalSessions / 500) * 100));
        progressLabel = `${totalSessions} / 500 classes`;
        if (earned) earnedAt = findEarnedDate(sessions, s => s.length >= 500);
        break;

      // CONSTÀNCIA
      case 'ratxa_2':
        earned = maxWeekStreak >= 2;
        progress = Math.min(100, Math.round((maxWeekStreak / 2) * 100));
        progressLabel = `${maxWeekStreak} / 2 setmanes`;
        if (earned) earnedAt = findEarnedDate(sessions, s => calcMaxWeekStreak(s) >= 2);
        break;
      case 'ratxa_4':
        earned = maxWeekStreak >= 4;
        progress = Math.min(100, Math.round((maxWeekStreak / 4) * 100));
        progressLabel = `${maxWeekStreak} / 4 setmanes`;
        if (earned) earnedAt = findEarnedDate(sessions, s => calcMaxWeekStreak(s) >= 4);
        break;
      case 'ratxa_8':
        earned = maxWeekStreak >= 8;
        progress = Math.min(100, Math.round((maxWeekStreak / 8) * 100));
        progressLabel = `${maxWeekStreak} / 8 setmanes`;
        if (earned) earnedAt = findEarnedDate(sessions, s => calcMaxWeekStreak(s) >= 8);
        break;
      case 'ratxa_12':
        earned = maxWeekStreak >= 12;
        progress = Math.min(100, Math.round((maxWeekStreak / 12) * 100));
        progressLabel = `${maxWeekStreak} / 12 setmanes`;
        if (earned) earnedAt = findEarnedDate(sessions, s => calcMaxWeekStreak(s) >= 12);
        break;
      case 'ratxa_26':
        earned = maxWeekStreak >= 26;
        progress = Math.min(100, Math.round((maxWeekStreak / 26) * 100));
        progressLabel = `${maxWeekStreak} / 26 setmanes`;
        if (earned) earnedAt = findEarnedDate(sessions, s => calcMaxWeekStreak(s) >= 26);
        break;
      case 'ratxa_52':
        earned = maxWeekStreak >= 52;
        progress = Math.min(100, Math.round((maxWeekStreak / 52) * 100));
        progressLabel = `${maxWeekStreak} / 52 setmanes`;
        if (earned) earnedAt = findEarnedDate(sessions, s => calcMaxWeekStreak(s) >= 52);
        break;

      // ANTIGUITAT
      case 'ant_1m':
        earned = monthsAsMember >= 1;
        progress = Math.min(100, monthsAsMember * 100);
        progressLabel = `${monthsAsMember} / 1 mes`;
        if (earned && userData.firstSession) {
          const d = new Date(userData.firstSession);
          d.setMonth(d.getMonth() + 1);
          const mn = ['gen','feb','mar','abr','mai','jun','jul','ago','set','oct','nov','des'];
          earnedAt = `${d.getDate()} ${mn[d.getMonth()]} ${d.getFullYear()}`;
        }
        break;
      case 'ant_3m':
        earned = monthsAsMember >= 3;
        progress = Math.min(100, Math.round((monthsAsMember / 3) * 100));
        progressLabel = `${monthsAsMember} / 3 mesos`;
        if (earned && userData.firstSession) {
          const d = new Date(userData.firstSession);
          d.setMonth(d.getMonth() + 3);
          const mn = ['gen','feb','mar','abr','mai','jun','jul','ago','set','oct','nov','des'];
          earnedAt = `${d.getDate()} ${mn[d.getMonth()]} ${d.getFullYear()}`;
        }
        break;
      case 'ant_6m':
        earned = monthsAsMember >= 6;
        progress = Math.min(100, Math.round((monthsAsMember / 6) * 100));
        progressLabel = `${monthsAsMember} / 6 mesos`;
        if (earned && userData.firstSession) {
          const d = new Date(userData.firstSession);
          d.setMonth(d.getMonth() + 6);
          const mn = ['gen','feb','mar','abr','mai','jun','jul','ago','set','oct','nov','des'];
          earnedAt = `${d.getDate()} ${mn[d.getMonth()]} ${d.getFullYear()}`;
        }
        break;
      case 'ant_1a':
        earned = yearsAsMember >= 1;
        progress = Math.min(100, Math.round((monthsAsMember / 12) * 100));
        progressLabel = `${monthsAsMember} / 12 mesos`;
        if (earned && userData.firstSession) {
          const d = new Date(userData.firstSession);
          d.setFullYear(d.getFullYear() + 1);
          const mn = ['gen','feb','mar','abr','mai','jun','jul','ago','set','oct','nov','des'];
          earnedAt = `${d.getDate()} ${mn[d.getMonth()]} ${d.getFullYear()}`;
        }
        break;
      case 'ant_2a':
        earned = yearsAsMember >= 2;
        progress = Math.min(100, Math.round((monthsAsMember / 24) * 100));
        progressLabel = `${monthsAsMember} / 24 mesos`;
        if (earned && userData.firstSession) {
          const d = new Date(userData.firstSession);
          d.setFullYear(d.getFullYear() + 2);
          const mn = ['gen','feb','mar','abr','mai','jun','jul','ago','set','oct','nov','des'];
          earnedAt = `${d.getDate()} ${mn[d.getMonth()]} ${d.getFullYear()}`;
        }
        break;
      case 'ant_3a':
        earned = yearsAsMember >= 3;
        progress = Math.min(100, Math.round((monthsAsMember / 36) * 100));
        progressLabel = `${monthsAsMember} / 36 mesos`;
        if (earned && userData.firstSession) {
          const d = new Date(userData.firstSession);
          d.setFullYear(d.getFullYear() + 3);
          const mn = ['gen','feb','mar','abr','mai','jun','jul','ago','set','oct','nov','des'];
          earnedAt = `${d.getDate()} ${mn[d.getMonth()]} ${d.getFullYear()}`;
        }
        break;
      case 'ant_5a':
        earned = yearsAsMember >= 5;
        progress = Math.min(100, Math.round((monthsAsMember / 60) * 100));
        progressLabel = `${monthsAsMember} / 60 mesos`;
        if (earned && userData.firstSession) {
          const d = new Date(userData.firstSession);
          d.setFullYear(d.getFullYear() + 5);
          const mn = ['gen','feb','mar','abr','mai','jun','jul','ago','set','oct','nov','des'];
          earnedAt = `${d.getDate()} ${mn[d.getMonth()]} ${d.getFullYear()}`;
        }
        break;
      case 'ant_10a':
        earned = yearsAsMember >= 10;
        progress = Math.min(100, Math.round((monthsAsMember / 120) * 100));
        progressLabel = `${monthsAsMember} / 120 mesos`;
        if (earned && userData.firstSession) {
          const d = new Date(userData.firstSession);
          d.setFullYear(d.getFullYear() + 10);
          const mn = ['gen','feb','mar','abr','mai','jun','jul','ago','set','oct','nov','des'];
          earnedAt = `${d.getDate()} ${mn[d.getMonth()]} ${d.getFullYear()}`;
        }
        break;

      // EXPLORACIÓ: HORARIS
      case 'exp_matidora':
        earned = hasMorningClass(sessions);
        progress = earned ? 100 : 0;
        progressLabel = earned ? 'Completat!' : 'Vine a una classe abans de les 12h';
        if (earned) earnedAt = findEarnedDate(sessions, s => hasMorningClass(s));
        break;
      case 'exp_vespre':
        earned = hasEveningClass(sessions);
        progress = earned ? 100 : 0;
        progressLabel = earned ? 'Completat!' : 'Vine a una classe a les 20h o més tard';
        if (earned) earnedAt = findEarnedDate(sessions, s => hasEveningClass(s));
        break;
      case 'exp_doble':
        earned = hasDoubleMorningEvening(sessions);
        progress = earned ? 100 : 0;
        progressLabel = earned ? 'Completat!' : 'Vine de matí i de tarda la mateixa setmana';
        if (earned) earnedAt = findEarnedDate(sessions, s => hasDoubleMorningEvening(s));
        break;

      // EXPLORACIÓ: VARIETAT
      case 'prog_cat_2':
        unavailable = realTotalCategories < 2;
        earned = !unavailable && uniqueCategories >= 2;
        progress = unavailable ? 0 : Math.min(100, Math.round((uniqueCategories / 2) * 100));
        progressLabel = unavailable ? 'No disponible al teu gym' : `${uniqueCategories} / 2 categories`;
        if (earned) earnedAt = findEarnedDate(sessions, s => {
          const cats = new Set(s.map(x => findCategory(x.activity, programEntries)).filter(Boolean));
          return cats.size >= 2;
        });
        break;
      case 'prog_cat_3':
        unavailable = realTotalCategories < 3;
        earned = !unavailable && uniqueCategories >= 3;
        progress = unavailable ? 0 : Math.min(100, Math.round((uniqueCategories / 3) * 100));
        progressLabel = unavailable ? 'No disponible al teu gym' : `${uniqueCategories} / 3 categories`;
        if (earned) earnedAt = findEarnedDate(sessions, s => {
          const cats = new Set(s.map(x => findCategory(x.activity, programEntries)).filter(Boolean));
          return cats.size >= 3;
        });
        break;
      case 'prog_cat_all':
        unavailable = realTotalCategories < 3;
        earned = !unavailable && hasAllCategoriesInOneWeek();
        progress = earned ? 100 : 0;
        progressLabel = unavailable ? 'No disponible al teu gym' : earned ? 'Completat!' : 'Fes força, cardio i flexibilitat en una mateixa setmana';
        if (earned) earnedAt = findEarnedDate(sessions, s => {
          const byWeek: Record<string, Set<string>> = {};
          for (const x of s) {
            const cat = findCategory(x.activity, programEntries);
            if (!cat) continue;
            const wk = getWeekKey(new Date(x.date));
            if (!byWeek[wk]) byWeek[wk] = new Set();
            byWeek[wk].add(cat);
          }
          return Object.values(byWeek).some(cats => ['força','cardio','flexibilitat'].every(c => cats.has(c)));
        });
        break;

      // EXPLORACIÓ: INTENSITAT
      case 'exp_3dies_seguits':
        earned = hasThreeConsecutiveDays(sessions);
        progress = earned ? 100 : 0;
        progressLabel = earned ? 'Completat!' : 'Vine 3 dies seguits';
        if (earned) earnedAt = findEarnedDate(sessions, s => hasThreeConsecutiveDays(s));
        break;
      case 'exp_3dies_setmana':
        earned = hasThreeDaysInOneWeek(sessions);
        progress = earned ? 100 : 0;
        progressLabel = earned ? 'Completat!' : 'Vine 3 dies en una mateixa setmana';
        if (earned) earnedAt = findEarnedDate(sessions, s => hasThreeDaysInOneWeek(s));
        break;
      case 'exp_5dies':
        earned = hasFiveDaysInOneWeek(sessions);
        progress = earned ? 100 : 0;
        progressLabel = earned ? 'Completat!' : 'Vine 5 dies laborables en una setmana';
        if (earned) earnedAt = findEarnedDate(sessions, s => hasFiveDaysInOneWeek(s));
        break;

      // ESPECIALS
      case 'ass_aniversari':
        earned = hasActiveYearMember(sessions, userData.firstSession);
        progress = Math.min(100, Math.round((daysSinceFirst / 365) * 100));
        progressLabel = earned ? 'Completat!' : `${daysSinceFirst} / 365 dies actiu/va cada mes`;
        if (earned && userData.firstSession) {
          const d = new Date(userData.firstSession);
          d.setFullYear(d.getFullYear() + 1);
          const mn = ['gen','feb','mar','abr','mai','jun','jul','ago','set','oct','nov','des'];
          earnedAt = `${d.getDate()} ${mn[d.getMonth()]} ${d.getFullYear()}`;
        }
        break;
      case 'esp_100en365':
        earned = has100In365Days(sessions);
        progress = Math.min(100, Math.round((totalSessions / 100) * 100));
        progressLabel = earned ? 'Completat!' : `${totalSessions} classes acumulades`;
        if (earned) earnedAt = findEarnedDate(sessions, s => has100In365Days(s));
        break;
      case 'esp_comeback':
        earned = hasComeback(sessions);
        progress = earned ? 100 : 0;
        progressLabel = earned ? 'Completat!' : 'Torna després de 30 dies d\'absència';
        if (earned) earnedAt = findEarnedDate(sessions, s => hasComeback(s));
        break;
      case 'esp_consistent':
        earned = hasConsistentMonths(sessions);
        progress = earned ? 100 : 0;
        progressLabel = earned ? 'Completat!' : 'Mantén la mateixa freqüència 3 mesos';
        if (earned) earnedAt = findEarnedDate(sessions, s => hasConsistentMonths(s));
        break;

      // RÈCORDS PERSONALS
      case 'personal_ratxa':
        earned = true;
        progress = 100;
        progressLabel = bestWeekStreak > 0 ? `${bestWeekStreak} setmanes` : '–';
        earnedAt = bestWeekStreak > 0 ? `Setmana del ${bestWeekStreakLabel}` : undefined;
        break;
      case 'personal_millor_setmana':
        earned = true;
        progress = 100;
        progressLabel = bestWeek.count > 0 ? `${bestWeek.count} classes` : '–';
        earnedAt = bestWeek.weekLabel ? `Setmana del ${bestWeek.weekLabel}` : undefined;
        break;
      case 'personal_millor_mes':
        earned = true;
        progress = 100;
        progressLabel = bestMonth.count > 0 ? `${bestMonth.count} classes` : '–';
        earnedAt = bestMonth.monthLabel ? `${bestMonth.monthLabel}` : undefined;
        break;
      case 'personal_millor_xp':
        earned = true;
        progress = 100;
        progressLabel = bestWeekXP.xp > 0 ? `${bestWeekXP.xp} XP` : '–';
        earnedAt = bestWeekXP.weekLabel ? `Setmana del ${bestWeekXP.weekLabel}` : undefined;
        break;
        
      default:
        if (badge.id.startsWith('esp_any_nou_')) {
          const year = parseInt(badge.id.replace('esp_any_nou_', ''), 10);
          earned = newYearBadgeEarned[year] || false;
          progress = earned ? 100 : 0;
          progressLabel = earned ? 'Completat!' : `Vine de l'1 al 15 de gener de ${year}`;
          if (earned) earnedAt = findEarnedDate(sessions, s =>
            s.some(x => {
              const d = new Date(x.date);
              return d.getFullYear() === year && d.getMonth() === 0 && d.getDate() <= 15;
            })
          );
        }
        break;
    }

    return { ...badge, earned, progress, progressLabel, earnedAt, unavailable };
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
