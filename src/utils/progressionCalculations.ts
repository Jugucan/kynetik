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

// ------------------------------------------------------------
// CÀLCUL DEL NIVELL DE CLASSES
// ------------------------------------------------------------

export function calcLevel(totalClasses: number): LevelDefinition {
  // Busquem el nivell més alt que compleix la condició
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalClasses >= LEVELS[i].minClasses) {
      return LEVELS[i];
    }
  }
  return LEVELS[0];
}

export function calcClassesUntilNextLevel(totalClasses: number): number | null {
  const currentLevel = calcLevel(totalClasses);
  if (currentLevel.maxClasses === null) return null; // Llegenda, no hi ha següent
  return currentLevel.maxClasses - totalClasses + 1;
}

// ------------------------------------------------------------
// CÀLCUL DE LA RATXA SETMANAL
// ------------------------------------------------------------

export function calcWeekStreak(sessions: Session[]): WeekStreak {
  if (!sessions.length) {
    return {
      current: 0,
      best: 0,
      isActiveThisWeek: false,
      lastActiveWeek: '',
    };
  }

  // Obtenim totes les setmanes amb sessions, ordenades
  const weekSet = new Set(sessions.map(s => getWeekKey(new Date(s.date))));
  const weeks = Array.from(weekSet).sort();
  const currentWeek = getCurrentWeekKey();

  // Comprovem si ha vingut aquesta setmana
  const isActiveThisWeek = weekSet.has(currentWeek);
  const lastActiveWeek = weeks[weeks.length - 1];

  // Calculem la ratxa actual (des de la setmana més recent cap enrere)
  let currentStreak = 0;

  // Determinem des d'on comptem (setmana actual o anterior)
  // Si ha vingut aquesta setmana, comptem des d'ara
  // Si no, comprovem si va venir la setmana passada (ratxa viva però no activa ara)
  const lastWeekKey = getWeekKey(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

  if (isActiveThisWeek || weekSet.has(lastWeekKey)) {
    // Comptem cap enrere des de la setmana activa més recent
    const startWeek = isActiveThisWeek ? currentWeek : lastWeekKey;
    const startIndex = weeks.indexOf(startWeek);

    if (startIndex >= 0) {
      currentStreak = 1;
      for (let i = startIndex - 1; i >= 0; i--) {
        const [yearPrev, wPrev] = weeks[i].split('-W').map(Number);
        const [yearCurr, wCurr] = weeks[i + 1].split('-W').map(Number);
        const isConsecutive =
          (yearCurr === yearPrev && wCurr === wPrev + 1) ||
          (yearCurr === yearPrev + 1 && wPrev >= 52 && wCurr === 1);
        if (isConsecutive) {
          currentStreak++;
        } else {
          break;
        }
      }
    }
  }
  // Si no ha vingut ni aquesta setmana ni la passada, la ratxa és 0

  // Calculem la millor ratxa històrica
  let bestStreak = 1;
  let tempStreak = 1;
  for (let i = 1; i < weeks.length; i++) {
    const [yearPrev, wPrev] = weeks[i - 1].split('-W').map(Number);
    const [yearCurr, wCurr] = weeks[i].split('-W').map(Number);
    const isConsecutive =
      (yearCurr === yearPrev && wCurr === wPrev + 1) ||
      (yearCurr === yearPrev + 1 && wPrev >= 52 && wCurr === 1);
    if (isConsecutive) {
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

  // Agrupem sessions per setmana
  const sessionsByWeek: Record<string, number> = {};
  for (const s of sessions) {
    const wk = getWeekKey(new Date(s.date));
    sessionsByWeek[wk] = (sessionsByWeek[wk] || 0) + 1;
  }

  // Calculem XP setmana per setmana
  // Ordenem les setmanes per calcular ratxes i bonificacions
  const sortedWeeks = Object.keys(sessionsByWeek).sort();

  let totalXP = 0;
  let weekStreakForXP = 0;

  for (let i = 0; i < sortedWeeks.length; i++) {
    const wk = sortedWeeks[i];
    const sessionsThisWeek = sessionsByWeek[wk];

    // XP base: 10 per classe
    let weekXP = sessionsThisWeek * 10;

    // Bonus per venir 2+ cops en una setmana
    if (sessionsThisWeek >= 2) {
      weekXP += 5;
    }

    // Comprovem si és setmana consecutiva (per bonus de ratxa)
    if (i > 0) {
      const prevWk = sortedWeeks[i - 1];
      const [yearPrev, wPrev] = prevWk.split('-W').map(Number);
      const [yearCurr, wCurr] = wk.split('-W').map(Number);
      const isConsecutive =
        (yearCurr === yearPrev && wCurr === wPrev + 1) ||
        (yearCurr === yearPrev + 1 && wPrev >= 52 && wCurr === 1);

      if (isConsecutive) {
        weekStreakForXP++;
        // Bonus de ratxa: +15 XP per mantenir la ratxa setmanal
        weekXP += 15;
      } else {
        weekStreakForXP = 0;
      }
    }

    totalXP += weekXP;
  }

  // Calculem el nivell XP
  let xpLevel = 1;
  for (let i = XP_LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXP >= XP_LEVEL_THRESHOLDS[i]) {
      xpLevel = i + 1;
      break;
    }
  }

  // XP dins del nivell actual
  const currentThreshold = XP_LEVEL_THRESHOLDS[xpLevel - 1] || 0;
  const nextThreshold = XP_LEVEL_THRESHOLDS[xpLevel] || XP_LEVEL_THRESHOLDS[XP_LEVEL_THRESHOLDS.length - 1];
  const currentLevelXP = totalXP - currentThreshold;
  const nextLevelXP = nextThreshold - currentThreshold;
  const progressPercent = Math.min(100, Math.round((currentLevelXP / nextLevelXP) * 100));

  return {
    total: totalXP,
    available: totalXP, // En Fase 1 tots estan disponibles (Fase 2 gestionarà els gastats)
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
  const level = calcLevel(totalClasses);
  const streak = calcWeekStreak(sessions);
  const xp = calcXP(sessions);
  const classesUntilNextLevel = calcClassesUntilNextLevel(totalClasses);

  return {
    level,
    streak,
    xp,
    totalClasses,
    classesUntilNextLevel,
  };
}
