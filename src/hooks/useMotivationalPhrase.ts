import { useState, useEffect } from "react";
import {
  type Phrase,
  FRASES_MOLT_ACTIVA,
  FRASES_ACTIVA,
  FRASES_MILLORANT,
  FRASES_ESTABLE,
  FRASES_TORNANT,
  FRASES_PROGRAMES,
  FRASES_ANYS_EXPERIENCIA,
  FRASES_UNIVERSALS,
} from "@/data/motivationalPhrases";

interface UserStatsForPhrase {
  name: string;
  totalSessions: number;
  autodiscipline: number;
  autodisciplineLabel: string;
  daysSinceLastSession: number;
  improvementTrend: 'up' | 'down' | 'stable';
  activePrograms: string[];
  yearlyTrend: 'up' | 'down' | 'stable';
  daysBetweenSessions: number;
  memberSinceYear: number | null;
}

const today = new Date().toISOString().split('T')[0];

const getDayOfYear = (): number => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

const selectPhrase = (stats: UserStatsForPhrase): Phrase => {
  const dayIndex = getDayOfYear();
  let pool: Phrase[] = [];

  // Seleccionar pool segons situació
  if (stats.daysSinceLastSession > 14) {
    pool = [...FRASES_TORNANT];
  } else if (stats.improvementTrend === 'up' || stats.yearlyTrend === 'up') {
    pool = [...FRASES_MILLORANT];
  } else if (stats.totalSessions >= 100) {
    pool = [...FRASES_MOLT_ACTIVA];
  } else if (stats.totalSessions >= 30) {
    pool = [...FRASES_ACTIVA];
  } else {
    pool = [...FRASES_ESTABLE];
  }

  // Afegir frases especials
  if (dayIndex % 4 === 0 && stats.activePrograms.length > 0) {
    pool = [...pool, ...FRASES_PROGRAMES];
  }

  const yearsTraining = stats.memberSinceYear 
    ? new Date().getFullYear() - stats.memberSinceYear 
    : 0;

  if (dayIndex % 7 === 0 && yearsTraining >= 2) {
    pool = [...pool, ...FRASES_ANYS_EXPERIENCIA];
  }

  if (dayIndex % 3 === 0) {
    pool = [...pool, ...FRASES_UNIVERSALS];
  }

  const selectedPhrase = pool[dayIndex % pool.length];
  return personalizePhrase(selectedPhrase, stats);
};

const personalizePhrase = (phrase: Phrase, stats: UserStatsForPhrase): Phrase => {
  const firstName = stats.name.split(' ')[0];
  const yearsTraining = stats.memberSinceYear 
    ? new Date().getFullYear() - stats.memberSinceYear 
    : 0;

  let title = phrase.title
    .replace('{nom}', firstName)
    .replace('{programa}', stats.activePrograms[0] || 'els teus programes')
    .replace('{anys}', yearsTraining.toString())
    .replace('{anyInici}', stats.memberSinceYear?.toString() || '');

  let text = phrase.phrase
    .replace('{nom}', firstName)
    .replace('{sessions}', stats.totalSessions.toString())
    .replace('{programa}', stats.activePrograms[0] || 'els teus programes')
    .replace('{anys}', yearsTraining.toString())
    .replace('{anyInici}', stats.memberSinceYear?.toString() || '');

  return { title, phrase: text };
};

export const useMotivationalPhrase = (userStats: UserStatsForPhrase | null) => {
  const [title, setTitle] = useState<string>('');
  const [phrase, setPhrase] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!userStats || userStats.totalSessions === 0) return;

    const storageKey = `kynetik_motivation_${userStats.name.replace(/\s/g, '_')}`;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.date === today &&
            data.sessionsSnapshot === userStats.totalSessions &&
            data.autodisciplineSnapshot === userStats.autodiscipline) {
          setTitle(data.title || '');
          setPhrase(data.phrase);
          return;
        }
      }
    } catch (e) {}

    setIsLoading(true);
    const result = selectPhrase(userStats);
    setTitle(result.title);
    setPhrase(result.phrase);

    try {
      localStorage.setItem(storageKey, JSON.stringify({
        title: result.title,
        phrase: result.phrase,
        date: today,
        sessionsSnapshot: userStats.totalSessions,
        autodisciplineSnapshot: userStats.autodiscipline
      }));
    } catch (e) {}

    setIsLoading(false);
  }, [userStats?.totalSessions, userStats?.autodiscipline, userStats?.name]);

  return { title, phrase, isLoading };
};
