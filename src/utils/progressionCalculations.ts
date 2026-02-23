// ============================================================
// CÀLCULS DEL SISTEMA DE PROGRESSIÓ
// ============================================================

import {
  LEVELS,
  LevelDefinition,
  WeekStreak,
  XPInfo,
  ProgressionData,
  XP_LEVEL_THRESHOLDS,
} from '@/types/progression';

interface Session {
  activity: string;
  date: string;
  time?: string;
}

// ------------------------------------------------------------
// HELPERS
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

function getCurrentWeekKey(): string {
  return getWeekKey(new Date());
}

function isConsecutiveWeek(wkPrev: string, wkCurr: string): boolean {
  const [yearPrev, wPrev] = wkPrev.split('-W').map(Number);
  const [yearCurr, wCurr] = wkCurr.split('-W').map(Number);
  return (
    (yearCurr === yearPrev && wCurr === wPrev + 1) ||
    (yearCurr === yearPrev + 1 && wPrev >= 52 && wCurr === 1)
  );
}

// ------------------------------------------------------------
// NIVELL BASAT EN XP
// ------------------------------------------------------------

export function calcLevelFromXP(totalXP: number): LevelDefinition {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalXP >= LEVELS[i].minXP) return LEVELS[i];
  }
  return LEVELS[0];
}

export function calcXPUntilNextLevel(totalXP: number): number | null {
  const current = calcLevelFromXP(totalXP);
  if (current.maxXP === null) return null;
  return current.maxXP - totalXP + 1;
}

// ------------------------------------------------------------
// RATXA SETMANAL
// ------------------------------------------------------------

export function calcWeekStreak(sessions: Session[]): WeekStreak {
  if (!sessions.length) {
    return { current: 0, best: 0, isActiveThisWeek: false, lastActiveWeek: '' };
  }

  const weekSet = new Set(sessions.map(s => getWeekKey(new Date(s.date))));
  const weeks = Array.from(weekSet).sort();
  const currentWeek = getCurrentWeekKey();
  const lastWeekKey = getWeekKey(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

  const isActiveThisWeek = weekSet.has(currentWeek);
  const lastActiveWeek = weeks[weeks.length - 1];

  // Ratxa actual: des de la setmana activa més recent cap enrere
  let currentStreak = 0;
  if (isActiveThisWeek || weekSet.has(lastWeekKey)) {
    const startWeek = isActiveThisWeek ? currentWeek : lastWeekKey;
    const startIndex = weeks.indexOf(startWeek);
    if (startIndex >= 0) {
      currentStreak = 1;
      for (let i = startIndex - 1; i >= 0; i--) {
        if (isConsecutiveWeek(weeks[i], weeks[i + 1])) {
          currentStreak++;
        } else {
          break;
        }
      }
    }
  }

  // Millor ratxa històrica
  let bestStreak = weeks.length > 0 ? 1 : 0;
  let tempStreak = 1;
  for (let i = 1; i < weeks.length; i++) {
    if (isConsecutiveWeek(weeks[i - 1], weeks[i])) {
      tempStreak++;
      if (tempStreak > bestStreak) bestStreak = tempStreak;
    } else {
      tempStreak = 1;
    }
  }

  return {
    current: currentStreak,
    best: Math.max(bestStreak, currentStreak),
    isActiveThisWeek,
    lastActiveWeek,
  };
}

// ------------------------------------------------------------
// CÀLCUL DE XP
// Regles:
//   +10 XP per classe
//   +10 XP bonus si 2 sessions/setmana
//   +20 XP bonus si 3+ sessions/setmana
//   +30 XP bonus si 5+ sessions/setmana (acumulatiu sobre l'anterior)
//   +15 XP per mantenir ratxa setmanal consecutiva
// ------------------------------------------------------------

export function calcXP(sessions: Session[]): XPInfo {
  if (!sessions.length) {
    return {
      total: 0,
      available: 0,
      level: 1,
      currentLevelXP: 0,
      nextLevelXP: XP_LEVEL_THRESHOLDS[1],
      progressPercent: 0,
    };
  }

  const sessionsByWeek: Record<string, number> = {};
  for (const s of sessions) {
    const wk = getWeekKey(new Date(s.date));
    sessionsByWeek[wk] = (sessionsByWeek[wk] || 0) + 1;
  }

  const sortedWeeks = Object.keys(sessionsByWeek).sort();
  let totalXP = 0;

  for (let i = 0; i < sortedWeeks.length; i++) {
    const wk = sortedWeeks[i];
    const n = sessionsByWeek[wk];

    // Base
    let weekXP = n * 10;

    // Bonus freqüència setmanal (acumulatius)
    if (n >= 5) weekXP += 30;
    else if (n >= 3) weekXP += 20;
    else if (n >= 2) weekXP += 10;

    // Bonus ratxa
    if (i > 0 && isConsecutiveWeek(sortedWeeks[i - 1], sortedWeeks[i])) {
      weekXP += 15;
    }

    totalXP += weekXP;
  }

  // Nivell XP (subprogrés intern)
  let xpLevel = 1;
  for (let i = XP_LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXP >= XP_LEVEL_THRESHOLDS[i]) {
      xpLevel = i + 1;
      break;
    }
  }

  const currentThreshold = XP_LEVEL_THRESHOLDS[xpLevel - 1] || 0;
  const nextThreshold = XP_LEVEL_THRESHOLDS[xpLevel] ?? XP_LEVEL_THRESHOLDS[XP_LEVEL_THRESHOLDS.length - 1];
  const currentLevelXP = totalXP - currentThreshold;
  const nextLevelXP = nextThreshold - currentThreshold;
  const progressPercent = Math.min(100, Math.round((currentLevelXP / nextLevelXP) * 100));

  return {
    total: totalXP,
    available: totalXP,
    level: xpLevel,
    currentLevelXP,
    nextLevelXP,
    progressPercent,
  };
}

// ------------------------------------------------------------
// FUNCIÓ PRINCIPAL
// ------------------------------------------------------------

export function calculateProgression(sessions: Session[]): ProgressionData {
  const totalClasses = sessions.length;
  const xp = calcXP(sessions);
  const level = calcLevelFromXP(xp.total);
  const streak = calcWeekStreak(sessions);
  const xpUntilNextLevel = calcXPUntilNextLevel(xp.total);

  return { level, streak, xp, totalClasses, xpUntilNextLevel };
}
