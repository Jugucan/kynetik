import { User, UserSession } from '@/hooks/useUsers';

export interface AdvancedStats {
  monthlyFrequency: Array<{ month: string; count: number }>;
  daysBetweenSessions: number;
  autodiscipline: number;
  autodisciplineLevel: AutodisciplineLevel;
  improvementRecent: {
    lastMonth: number;
    previousQuarterAverage: number;
    trend: 'up' | 'down' | 'stable';
    percentageChange: number;
  };
}

// 🆕 INTERFÍCIE per l'autodisciplina amb nivells descriptius
export interface AutodisciplineLevel {
  label: string; // "Cal millorar", "Ho pots fer millor", "Bona", "Notable", "Excel·lent"
  emoji: string; // 😞, 😐, 🙂, 😊, 🤩
  color: string; // Classe de Tailwind per al color del text
  bgColor: string; // Color de fons
  percentage: number; // 0-100 per a la barra
  barColor: string; // Color de la barra (vermell → taronja → groc → verd)
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

// ✅ CÀLCUL MILLORAT DE L'AUTODISCIPLINA
export const calculateAutodiscipline = (sessions: UserSession[]): number => {
  if (!sessions || sessions.length === 0) return 0;
  if (sessions.length === 1) return 20; // Una sessió = mínim

  const sortedDates = sessions
    .map(s => new Date(s.date).getTime())
    .sort((a, b) => a - b);

  const now = new Date().getTime();
  const lastSessionDate = sortedDates[sortedDates.length - 1];
  const firstSessionDate = sortedDates[0];
  
  // Calculem dies des de la primera sessió
  const totalDays = (now - firstSessionDate) / (1000 * 60 * 60 * 24);
  
  // Calculem dies des de l'última sessió
  const daysSinceLastSession = (now - lastSessionDate) / (1000 * 60 * 60 * 24);
  
  // 1️⃣ FACTOR DE FREQÜÈNCIA (40 punts màxim)
  // Més sessions = millor
  const sessionsPerMonth = (sessions.length / (totalDays / 30));
  let frequencyScore = 0;
  
  if (sessionsPerMonth >= 12) frequencyScore = 40; // 3+ vegades/setmana
  else if (sessionsPerMonth >= 8) frequencyScore = 35; // 2 vegades/setmana
  else if (sessionsPerMonth >= 4) frequencyScore = 30; // 1 vegada/setmana
  else if (sessionsPerMonth >= 2) frequencyScore = 20; // 2 vegades/mes
  else frequencyScore = 10;
  
  // 2️⃣ FACTOR D'ACTIVITAT RECENT (40 punts màxim)
  // Penalitza si fa molt que no ve
  let recentActivityScore = 0;
  
  if (daysSinceLastSession <= 7) recentActivityScore = 40; // Ha vingut aquesta setmana
  else if (daysSinceLastSession <= 14) recentActivityScore = 35; // Últimes 2 setmanes
  else if (daysSinceLastSession <= 30) recentActivityScore = 30; // Últim mes
  else if (daysSinceLastSession <= 60) recentActivityScore = 20; // Últims 2 mesos
  else if (daysSinceLastSession <= 90) recentActivityScore = 10; // Últims 3 mesos
  else recentActivityScore = 0; // Més de 3 mesos = 0
  
  // 3️⃣ FACTOR DE REGULARITAT (20 punts màxim)
  // Mesura la consistència entre sessions
  const differences: number[] = [];
  for (let i = 1; i < sortedDates.length; i++) {
    const daysDiff = (sortedDates[i] - sortedDates[i - 1]) / (1000 * 60 * 60 * 24);
    differences.push(daysDiff);
  }
  
  const meanDays = differences.reduce((a, b) => a + b, 0) / differences.length;
  const variance = differences.reduce((sum, diff) => sum + Math.pow(diff - meanDays, 2), 0) / differences.length;
  const standardDeviation = Math.sqrt(variance);
  const coefficientOfVariation = meanDays > 0 ? (standardDeviation / meanDays) : 1;
  
  // Millor regularitat = menys variació
  let regularityScore = 0;
  if (coefficientOfVariation < 0.3) regularityScore = 20; // Molt regular
  else if (coefficientOfVariation < 0.5) regularityScore = 15;
  else if (coefficientOfVariation < 0.7) regularityScore = 10;
  else if (coefficientOfVariation < 1.0) regularityScore = 5;
  else regularityScore = 0;
  
  // PUNTUACIÓ TOTAL (màxim 100)
  const totalScore = frequencyScore + recentActivityScore + regularityScore;
  
  return Math.round(Math.min(100, Math.max(0, totalScore)));
};

// 🆕 FUNCIÓ: Obtenir nivell descriptiu d'autodisciplina amb emojis i colors
export const getAutodisciplineLevel = (score: number): AutodisciplineLevel => {
  // score és un número entre 0 i 100
  
  if (score < 20) {
    return {
      label: 'Cal millorar',
      emoji: '😞',
      color: 'text-red-700',
      bgColor: 'bg-red-50',
      percentage: score,
      barColor: 'bg-red-500'
    };
  } else if (score < 40) {
    return {
      label: 'Ho pots fer millor',
      emoji: '😐',
      color: 'text-orange-700',
      bgColor: 'bg-orange-50',
      percentage: score,
      barColor: 'bg-orange-500'
    };
  } else if (score < 60) {
    return {
      label: 'Bona',
      emoji: '🙂',
      color: 'text-yellow-700',
      bgColor: 'bg-yellow-50',
      percentage: score,
      barColor: 'bg-yellow-500'
    };
  } else if (score < 80) {
    return {
      label: 'Notable',
      emoji: '😊',
      color: 'text-lime-700',
      bgColor: 'bg-lime-50',
      percentage: score,
      barColor: 'bg-lime-500'
    };
  } else {
    return {
      label: 'Excel·lent',
      emoji: '🤩',
      color: 'text-green-700',
      bgColor: 'bg-green-50',
      percentage: score,
      barColor: 'bg-green-500'
    };
  }
};

// ✅ Càlcul de "Millorada recent"
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

  // Comptem sessions de l'últim mes (últims 30 dies)
  const lastMonthSessions = sessions.filter(s => {
    const sessionDate = new Date(s.date);
    return sessionDate >= oneMonthAgo && sessionDate <= now;
  }).length;

  // Comptem sessions dels 3 mesos ANTERIORS (de fa 120 dies fins fa 30 dies)
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
    previousQuarterAverage: Math.round(previousQuarterAverage * 10) / 10,
    trend,
    percentageChange
  };
};

export const calculateAdvancedStats = (user: User): AdvancedStats => {
  const sessions = user.sessions || [];
  const autodisciplineScore = calculateAutodiscipline(sessions);

  return {
    monthlyFrequency: calculateMonthlyFrequency(sessions),
    daysBetweenSessions: calculateDaysBetweenSessions(sessions),
    autodiscipline: autodisciplineScore,
    autodisciplineLevel: getAutodisciplineLevel(autodisciplineScore),
    improvementRecent: calculateImprovementRecent(sessions)
  };
};

// ✅ CÀLCUL DEL RÀNQUING GENERAL
export const calculateUserRanking = (allUsers: User[], currentUser: User, metric: 'totalSessions' | 'autodiscipline' | 'daysBetweenSessions'): UserRanking => {
  // Si no hi ha usuaris, retornem 0
  if (!allUsers || allUsers.length === 0) {
    return { rank: 0, total: 0, percentile: 0 };
  }

  let usersWithMetric: Array<{ user: User; value: number }> = [];

  if (metric === 'totalSessions') {
    // ✅ Calculem totalSessions a partir de sessions.length SEMPRE
    usersWithMetric = allUsers.map(u => ({
      user: u,
      value: u.sessions ? u.sessions.length : 0
    }));
  } else if (metric === 'autodiscipline') {
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

  // ✅ Filtrem usuaris amb valor 0 però SEMPRE mantenim l'usuari actual
  if (metric === 'totalSessions' || metric === 'autodiscipline') {
    usersWithMetric = usersWithMetric.filter(u => u.value > 0 || u.user.id === currentUser.id);
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
  
  // Si no el trobem, retornem 0
  if (currentUserIndex === -1) {
    return { rank: 0, total: 0, percentile: 0 };
  }
  
  const rank = currentUserIndex + 1;
  const total = usersWithMetric.length;
  
  // Calculem el percentil correctament
  const percentile = total > 0 && rank > 0 ? Math.round(((total - rank + 1) / total) * 100) : 0;

  return { rank, total, percentile };
};

// ✅ CÀLCUL DEL RÀNQUING PER PROGRAMA (filtra per centre també)
export const calculateProgramRanking = (allUsers: User[], currentUser: User, program: string): UserRanking => {
  // Filtra usuaris que han fet aquest programa I són del mateix centre
  const programUsers = allUsers.filter(u => {
    const sessions = u.sessions || [];
    const hasProgram = sessions.some(s => s.activity === program);
    const sameCenter = !currentUser.center || !u.center || u.center === currentUser.center;
    return hasProgram && sameCenter;
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
