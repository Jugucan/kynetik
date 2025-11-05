import { User, UserSession } from '@/hooks/useUsers';

export interface AdvancedStats {
  monthlyFrequency: Array<{ month: string; count: number }>;
  daysBetweenSessions: number;
  autodiscipline: number; // ✅ CANVIAT: consistency → autodiscipline
  improvementRecent: {
    lastMonth: number;
    previousQuarterAverage: number; // ✅ CANVIAT: lastQuarter → previousQuarterAverage
    trend: 'up' | 'down' | 'stable';
    percentageChange: number;
  };
}

export interface UserRanking {
  rank: number;
  total: number;
  percentile: number;
}

export const calculateMonthlyFrequency = (sessions: UserSession[]): Array<{ month: string; count: number }> => {
  if (!sessions || sessions.length === 0) return [];

  const monthlyCount: { [key: string]: number } = {};

  sessions.forEach(session => {
    const date = new Date(session.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyCount[monthKey] = (monthlyCount[monthKey] || 0) + 1;
  });

  return Object.entries(monthlyCount)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, count]) => {
      const [year, monthNum] = month.split('-');
      const monthNames = ['Gen', 'Feb', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Des'];
      const monthName = monthNames[parseInt(monthNum) - 1];
      return {
        month: `${monthName} ${year}`,
        count
      };
    });
};

export const calculateDaysBetweenSessions = (sessions: UserSession[]): number => {
  if (!sessions || sessions.length <= 1) return 0;

  const sortedDates = sessions
    .map(s => new Date(s.date).getTime())
    .sort((a, b) => a - b);

  let totalDays = 0;
  for (let i = 1; i < sortedDates.length; i++) {
    const daysDiff = (sortedDates[i] - sortedDates[i - 1]) / (1000 * 60 * 60 * 24);
    totalDays += daysDiff;
  }

  return Math.round(totalDays / (sortedDates.length - 1));
};

// ✅ NOVA FUNCIÓ: Càlcul millorat de l'autodisciplina
export const calculateAutodiscipline = (sessions: UserSession[]): number => {
  if (!sessions || sessions.length < 2) return 0;

  const sortedDates = sessions
    .map(s => new Date(s.date).getTime())
    .sort((a, b) => a - b);

  // Calculem les diferències entre sessions consecutives
  const differences: number[] = [];
  for (let i = 1; i < sortedDates.length; i++) {
    const daysDiff = (sortedDates[i] - sortedDates[i - 1]) / (1000 * 60 * 60 * 24);
    differences.push(daysDiff);
  }

  // Calculem la mitjana de dies entre sessions
  const meanDays = differences.reduce((a, b) => a + b, 0) / differences.length;

  // Calculem la desviació estàndard (mesura de regularitat)
  const variance = differences.reduce((sum, diff) => sum + Math.pow(diff - meanDays, 2), 0) / differences.length;
  const standardDeviation = Math.sqrt(variance);

  // Calculem el coeficient de variació (desviació / mitjana)
  // Un coeficient baix = més regular = més autodisciplina
  const coefficientOfVariation = meanDays > 0 ? (standardDeviation / meanDays) : 0;

  // Convertim a puntuació de 0-100
  // Si CV = 0 (perfecte) → 100%
  // Si CV >= 1 (molt irregular) → 0%
  const autodisciplineScore = Math.max(0, Math.min(100, 100 * (1 - coefficientOfVariation)));

  return Math.round(autodisciplineScore);
};

// ✅ CORRECCIÓ: Càlcul correcte de "Millorada recent"
export const calculateImprovementRecent = (sessions: UserSession[]): AdvancedStats['improvementRecent'] => {
  if (!sessions || sessions.length === 0) {
    return {
      lastMonth: 0,
      previousQuarterAverage: 0,
      trend: 'stable',
      percentageChange: 0
    };
  }

  const now = new Date();
  
  // Últim mes (des de fa 30 dies fins ara)
  const oneMonthAgo = new Date(now);
  oneMonthAgo.setDate(now.getDate() - 30);
  
  // Trimestre anterior (de fa 120 dies fins fa 30 dies)
  const fourMonthsAgo = new Date(now);
  fourMonthsAgo.setDate(now.getDate() - 120);

  // ✅ CORRECCIÓ: Comptem sessions de l'últim mes (últims 30 dies)
  const lastMonthSessions = sessions.filter(s => {
    const sessionDate = new Date(s.date);
    return sessionDate >= oneMonthAgo && sessionDate <= now;
  }).length;

  // ✅ CORRECCIÓ: Comptem sessions dels 3 mesos ANTERIORS (de fa 120 dies fins fa 30 dies)
  const previousQuarterSessions = sessions.filter(s => {
    const sessionDate = new Date(s.date);
    return sessionDate >= fourMonthsAgo && sessionDate < oneMonthAgo;
  }).length;

  // Calculem la mitjana mensual dels 3 mesos anteriors
  const previousQuarterAverage = previousQuarterSessions / 3;

  // Calculem el canvi percentual
  const percentageChange = previousQuarterAverage !== 0
    ? Math.round(((lastMonthSessions - previousQuarterAverage) / previousQuarterAverage) * 100)
    : (lastMonthSessions > 0 ? 100 : 0);

  // Determinem la tendència
  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (percentageChange > 10) trend = 'up';
  else if (percentageChange < -10) trend = 'down';

  return {
    lastMonth: lastMonthSessions,
    previousQuarterAverage: Math.round(previousQuarterAverage * 10) / 10, // Arrodonit a 1 decimal
    trend,
    percentageChange
  };
};

export const calculateAdvancedStats = (user: User): AdvancedStats => {
  const sessions = user.sessions || [];

  return {
    monthlyFrequency: calculateMonthlyFrequency(sessions),
    daysBetweenSessions: calculateDaysBetweenSessions(sessions),
    autodiscipline: calculateAutodiscipline(sessions), // ✅ CANVIAT
    improvementRecent: calculateImprovementRecent(sessions)
  };
};

// ✅ CORRECCIÓ: Càlcul correcte del rànquing general
export const calculateUserRanking = (allUsers: User[], currentUser: User, metric: 'totalSessions' | 'autodiscipline' | 'daysBetweenSessions'): UserRanking => {
  let usersWithMetric: Array<{ user: User; value: number }> = [];

  if (metric === 'totalSessions') {
    usersWithMetric = allUsers.map(u => ({
      user: u,
      value: u.totalSessions || 0
    }));
  } else if (metric === 'autodiscipline') { // ✅ CANVIAT: consistency → autodiscipline
    usersWithMetric = allUsers.map(u => ({
      user: u,
      value: calculateAutodiscipline(u.sessions || [])
    }));
  } else if (metric === 'daysBetweenSessions') {
    usersWithMetric = allUsers.map(u => ({
      user: u,
      value: calculateDaysBetweenSessions(u.sessions || [])
    }));
  }

  // Filtrem usuaris amb valor 0 per tenir un rànquing més real
  if (metric === 'totalSessions' || metric === 'autodiscipline') {
    usersWithMetric = usersWithMetric.filter(u => u.value > 0);
  }

  // Ordenem: per daysBetweenSessions ascendent (menys dies = millor)
  // Per altres mètriques: descendent (més = millor)
  usersWithMetric.sort((a, b) => {
    if (metric === 'daysBetweenSessions') {
      return a.value - b.value;
    }
    return b.value - a.value;
  });

  // ✅ Trobem la posició de l'usuari actual
  const currentUserIndex = usersWithMetric.findIndex(u => u.user.id === currentUser.id);
  const rank = currentUserIndex !== -1 ? currentUserIndex + 1 : 0;
  const total = usersWithMetric.length;
  
  // Calculem el percentil correctament
  const percentile = total > 0 && rank > 0 ? Math.round(((total - rank + 1) / total) * 100) : 0;

  return { rank, total, percentile };
};

export const calculateProgramRanking = (allUsers: User[], currentUser: User, program: string): UserRanking => {
  // Filtra usuaris que han fet aquest programa
  const programUsers = allUsers.filter(u => {
    const sessions = u.sessions || [];
    return sessions.some(s => s.activity === program);
  });

  const usersWithCount = programUsers.map(u => ({
    user: u,
    count: (u.sessions || []).filter(s => s.activity === program).length
  }));

  // Ordenem per número de sessions d'aquest programa (més = millor)
  usersWithCount.sort((a, b) => b.count - a.count);

  const currentUserIndex = usersWithCount.findIndex(u => u.user.id === currentUser.id);
  const rank = currentUserIndex !== -1 ? currentUserIndex + 1 : 0;
  const total = usersWithCount.length;
  
  // Calculem el percentil correctament
  const percentile = total > 0 && rank > 0 ? Math.round(((total - rank + 1) / total) * 100) : 0;

  return { rank, total, percentile };
};
