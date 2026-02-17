import { User, UserSession } from '@/hooks/useUsers';

export interface AdvancedStats {
  monthlyFrequency: Array<{ month: string; count: number }>;
  daysBetweenSessions: number;
  autodiscipline: number;
  autodisciplineLevel: AutodisciplineLevel;
  autodisciplineDetails: {
    recentScore: number;
    historicScore: number;
    lastMonthSessions: number;
    monthlyAverage: number;
    bestYearSessions: number;
    currentYearProjection: number;
  };
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

// ✅ CÀLCUL D'AUTODISCIPLINA HÍBRIDA (Recent + Històric)
export const calculateAutodiscipline = (sessions: UserSession[]): { score: number; details: any } => {
  if (!sessions || sessions.length === 0) {
    return {
      score: 0,
      details: {
        recentScore: 0,
        historicScore: 0,
        lastMonthSessions: 0,
        monthlyAverage: 0,
        bestYearSessions: 0,
        currentYearProjection: 0
      }
    };
  }
  
  const now = new Date();
  
  // Calculem dies des de l'última sessió
  const sortedDatesCheck = sessions.map(s => new Date(s.date).getTime()).sort((a, b) => a - b);
  const lastSessionDateCheck = new Date(sortedDatesCheck[sortedDatesCheck.length - 1]);
  const daysSinceLastSessionCheck = (now.getTime() - lastSessionDateCheck.getTime()) / (1000 * 60 * 60 * 24);
  
  // Si l'usuari fa més de 60 dies que no ve, autodisciplina = 0 (independentment de quantes sessions tingui)
  if (daysSinceLastSessionCheck > 60) {
    // Calculem les dades reals per mostrar-les
    const sessionsByYearCheck: { [year: string]: number } = {};
    sessions.forEach(s => {
      const year = new Date(s.date).getFullYear().toString();
      sessionsByYearCheck[year] = (sessionsByYearCheck[year] || 0) + 1;
    });
    const bestYearSessionsCheck = Math.max(...Object.values(sessionsByYearCheck), 0);
    
    return {
      score: 0,
      details: {
        recentScore: 0,
        historicScore: 0,
        lastMonthSessions: 0,
        monthlyAverage: 0,
        bestYearSessions: bestYearSessionsCheck,
        currentYearProjection: 0
      }
    };
  }
  
  // Si té poques sessions però ha vingut recentment
  if (sessions.length < 2) {
    return {
      score: 20,
      details: {
        recentScore: 20,
        historicScore: 20,
        lastMonthSessions: 1,
        monthlyAverage: 0,
        bestYearSessions: 1,
        currentYearProjection: 0
      }
    };
  }

  // ========================================
  // 1️⃣ FSA RECENT (70% del total)
  // ========================================
  
  // Sessions de l'ÚLTIM MES
  const oneMonthAgo = new Date(now);
  oneMonthAgo.setDate(now.getDate() - 30);
  
  const lastMonthSessions = sessions.filter(s => {
    const sessionDate = new Date(s.date);
    return sessionDate >= oneMonthAgo && sessionDate <= now;
  }).length;
  
  // Mitjana mensual dels últims 6 mesos (excloent l'últim mes)
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setDate(now.getDate() - 180);
  
  const historicalSessions = sessions.filter(s => {
    const sessionDate = new Date(s.date);
    return sessionDate >= sixMonthsAgo && sessionDate < oneMonthAgo;
  });
  
  let monthlyAverage = 0;
  
  if (historicalSessions.length >= 3) {
    monthlyAverage = historicalSessions.length / 5;
  } else {
    const sortedDates = sessions.map(s => new Date(s.date).getTime()).sort((a, b) => a - b);
    const firstSessionDate = new Date(sortedDates[0]);
    const monthsSinceFirst = Math.max(1, (now.getTime() - firstSessionDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
    monthlyAverage = sessions.length / monthsSinceFirst;
  }
  
  let fsaRecent = 0;
  if (monthlyAverage > 0) {
    fsaRecent = (lastMonthSessions / monthlyAverage) * 100;
  } else if (lastMonthSessions > 0) {
    fsaRecent = 100;
  }
  fsaRecent = Math.max(0, Math.min(100, fsaRecent));
  
  // ========================================
  // 2️⃣ FSA HISTÒRIC (30% del total)
  // ========================================
  
  // Calculem sessions per any
  const sessionsByYear: { [year: string]: number } = {};
  sessions.forEach(s => {
    const year = new Date(s.date).getFullYear().toString();
    sessionsByYear[year] = (sessionsByYear[year] || 0) + 1;
  });
  
  // Trobem el millor any
  const bestYearSessions = Math.max(...Object.values(sessionsByYear), 0);
  
  // Calculem la projecció de l'any actual
  const currentYear = now.getFullYear().toString();
  const currentYearSessions = sessionsByYear[currentYear] || 0;
  const daysPassed = Math.floor((now.getTime() - new Date(parseInt(currentYear), 0, 1).getTime()) / (1000 * 60 * 60 * 24));
  const daysInYear = 365;
  const currentYearProjection = Math.round((currentYearSessions / daysPassed) * daysInYear);
  
  let fsaHistoric = 0;
  if (bestYearSessions > 0) {
    fsaHistoric = (currentYearProjection / bestYearSessions) * 100;
  } else {
    fsaHistoric = 100; // Usuari nou
  }
  fsaHistoric = Math.max(0, Math.min(100, fsaHistoric));
  
  // ========================================
  // 3️⃣ COMBINACIÓ HÍBRIDA: 70% Recent + 30% Històric
  // ========================================
  
  let finalScore = (fsaRecent * 0.7) + (fsaHistoric * 0.3);
  
  // ========================================
  // 4️⃣ PENALITZACIÓ per inactivitat prolongada
  // ========================================
  
  const sortedDates = sessions.map(s => new Date(s.date).getTime()).sort((a, b) => a - b);
  const lastSessionDate = new Date(sortedDates[sortedDates.length - 1]);
  const daysSinceLastSession = (now.getTime() - lastSessionDate.getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysSinceLastSession > 60) {
    const penaltyFactor = Math.max(0, 1 - ((daysSinceLastSession - 60) / 120));
    finalScore = finalScore * penaltyFactor;
  }
  
  return {
    score: Math.round(finalScore),
    details: {
      recentScore: Math.round(fsaRecent),
      historicScore: Math.round(fsaHistoric),
      lastMonthSessions,
      monthlyAverage: Math.round(monthlyAverage * 10) / 10,
      bestYearSessions,
      currentYearProjection
    }
  };
};

// 🆕 FUNCIÓ: Obtenir nivell descriptiu d'autodisciplina amb emojis i colors
export const getAutodisciplineLevel = (score: number): AutodisciplineLevel => {
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

// ✅ CÀLCUL DE TENDÈNCIA ANUAL BASADA EN MITJANES MENSUALS
export const calculateYearlyTrend = (sessions: UserSession[]): {
  yearlyStats: Array<{ year: string; count: number; monthlyAverage: number }>;
  trend: 'up' | 'down' | 'stable';
  bestYear: { year: string; count: number; monthlyAverage: number } | null;
  worstYear: { year: string; count: number; monthlyAverage: number } | null;
} => {
  if (!sessions || sessions.length === 0) {
    return { yearlyStats: [], trend: 'stable', bestYear: null, worstYear: null };
  }

  const now = new Date();
  const currentYear = now.getFullYear().toString();

  // Agrupar sessions per any
  const yearlyCount: { [key: string]: number } = {};
  sessions.forEach(session => {
    const year = new Date(session.date).getFullYear().toString();
    yearlyCount[year] = (yearlyCount[year] || 0) + 1;
  });

  // Calcular mitjana mensual per cada any
  const yearlyStats = Object.entries(yearlyCount)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([year, count]) => {
      let monthsActive: number;

      if (year === currentYear) {
        // Any actual: mesos transcorreguts fins avui amb precisió de dies
        // Exemple: 17 de febrer = 1 mes (gener) + 17/28 dies de febrer = 1.607 mesos
        const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        monthsActive = Math.max(0.1, now.getMonth() + (now.getDate() / daysInCurrentMonth));
      } else {
        // Anys passats COMPLETS: sempre 12 mesos
        // Excepció: si és el primer any i té poques sessions, usar mesos reals
        const firstSessionDate = sessions
          .filter(s => new Date(s.date).getFullYear().toString() === year)
          .map(s => new Date(s.date))
          .sort((a, b) => a.getTime() - b.getTime())[0];
        
        const isFirstYear = firstSessionDate && 
          firstSessionDate.getMonth() > 2 && // Va començar després de març
          year === Object.keys(yearlyCount).sort()[0]; // És el primer any registrat
        
        if (isFirstYear) {
          // Si va començar tard al primer any, usar mesos des que va començar
          monthsActive = Math.max(1, 12 - firstSessionDate.getMonth());
        } else {
          monthsActive = 12;
        }
      }

      return {
        year,
        count,
        monthlyAverage: Math.round((count / monthsActive) * 10) / 10
      };
    });

  // ✅ Millor i pitjor any: EXCLOURE l'any actual
  const completedYears = yearlyStats.filter(y => y.year !== currentYear);

  const bestYear = completedYears.length > 0
    ? completedYears.reduce((max, curr) =>
        curr.count > max.count ? curr : max) // ✅ Usem COUNT total per anys complets
    : null;

  const worstYear = completedYears.length > 1
    ? completedYears.reduce((min, curr) =>
        curr.count < min.count ? curr : min) // ✅ Usem COUNT total per anys complets
    : null;

  // ✅ Tendència: comparar any actual (mitjana mensual) vs any anterior (mitjana mensual)
  let trend: 'up' | 'down' | 'stable' = 'stable';
  
  const currentYearData = yearlyStats.find(y => y.year === currentYear);
  const previousYearData = yearlyStats
    .filter(y => y.year !== currentYear)
    .sort((a, b) => b.year.localeCompare(a.year))[0];

if (currentYearData && previousYearData) {
    const currentAvg = currentYearData.monthlyAverage;
    const previousAvg = previousYearData.count / 12;
    const percentDiff = ((currentAvg - previousAvg) / previousAvg) * 100;

    // Si portem menys de 2 mesos d'any, necessitem >5% de diferència per marcar tendència
    const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const monthsElapsed = now.getMonth() + (now.getDate() / daysInCurrentMonth);
    const threshold = monthsElapsed < 2 ? 5 : 0;

    if (percentDiff > threshold) trend = 'up';
    else if (percentDiff < -threshold) trend = 'down';
  } else if (completedYears.length >= 2) {
    const last = completedYears[completedYears.length - 1];
    const prev = completedYears[completedYears.length - 2];
    if (last.count > prev.count) trend = 'up';
    else if (last.count < prev.count) trend = 'down';
  }

  return { yearlyStats, trend, bestYear, worstYear };
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
  const oneMonthAgo = new Date(now);
  oneMonthAgo.setDate(now.getDate() - 30);
  const fourMonthsAgo = new Date(now);
  fourMonthsAgo.setDate(now.getDate() - 120);

  const lastMonthSessions = sessions.filter(s => {
    const sessionDate = new Date(s.date);
    return sessionDate >= oneMonthAgo && sessionDate <= now;
  }).length;

  const previousQuarterSessions = sessions.filter(s => {
    const sessionDate = new Date(s.date);
    return sessionDate >= fourMonthsAgo && sessionDate < oneMonthAgo;
  }).length;

  const previousQuarterAverage = previousQuarterSessions / 3;
  const percentageChange = previousQuarterAverage !== 0
    ? Math.round(((lastMonthSessions - previousQuarterAverage) / previousQuarterAverage) * 100)
    : (lastMonthSessions > 0 ? 100 : 0);

  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (percentageChange > 0) trend = 'up';      // Qualsevol millora = a l'alça
  else if (percentageChange < 0) trend = 'down'; // Qualsevol baixada = a la baixa

  return {
    lastMonth: lastMonthSessions,
    previousQuarterAverage: Math.round(previousQuarterAverage * 10) / 10,
    trend,
    percentageChange
  };
};

export const calculateAdvancedStats = (user: User): AdvancedStats => {
  const sessions = user.sessions || [];
  const autodisciplineResult = calculateAutodiscipline(sessions);

  return {
    monthlyFrequency: calculateMonthlyFrequency(sessions),
    daysBetweenSessions: calculateDaysBetweenSessions(sessions),
    autodiscipline: autodisciplineResult.score,
    autodisciplineLevel: getAutodisciplineLevel(autodisciplineResult.score),
    autodisciplineDetails: autodisciplineResult.details,
    improvementRecent: calculateImprovementRecent(sessions)
  };
};

// ✅ CÀLCUL DEL RÀNQUING GENERAL
export const calculateUserRanking = (allUsers: User[], currentUser: User, metric: 'totalSessions' | 'autodiscipline' | 'daysBetweenSessions'): UserRanking => {
  if (!allUsers || allUsers.length === 0) {
    return { rank: 0, total: 0, percentile: 0 };
  }

  let usersWithMetric: Array<{ user: User; value: number }> = [];

  if (metric === 'totalSessions') {
    usersWithMetric = allUsers.map(u => ({
      user: u,
      value: u.sessions ? u.sessions.length : 0
    }));
  } else if (metric === 'autodiscipline') {
    usersWithMetric = allUsers.map(u => ({
      user: u,
      value: calculateAutodiscipline(u.sessions || []).score
    }));
  } else if (metric === 'daysBetweenSessions') {
    usersWithMetric = allUsers.map(u => ({
      user: u,
      value: calculateDaysBetweenSessions(u.sessions || [])
    }));
  }

  if (metric === 'totalSessions' || metric === 'autodiscipline') {
    usersWithMetric = usersWithMetric.filter(u => u.value > 0 || u.user.id === currentUser.id);
  }

  usersWithMetric.sort((a, b) => {
    if (metric === 'daysBetweenSessions') {
      return a.value - b.value;
    }
    return b.value - a.value;
  });

  const currentUserIndex = usersWithMetric.findIndex(u => u.user.id === currentUser.id);
  
  if (currentUserIndex === -1) {
    return { rank: 0, total: 0, percentile: 0 };
  }
  
  const rank = currentUserIndex + 1;
  const total = usersWithMetric.length;
  const percentile = total > 0 && rank > 0 ? Math.round(((total - rank + 1) / total) * 100) : 0;

  return { rank, total, percentile };
};

// ✅ CÀLCUL DEL RÀNQUING PER PROGRAMA
export const calculateProgramRanking = (allUsers: User[], currentUser: User, program: string): UserRanking => {
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

  usersWithCount.sort((a, b) => b.count - a.count);

  const currentUserIndex = usersWithCount.findIndex(u => u.user.id === currentUser.id);
  const rank = currentUserIndex !== -1 ? currentUserIndex + 1 : 0;
  const total = usersWithCount.length;
  const percentile = total > 0 && rank > 0 ? Math.round(((total - rank + 1) / total) * 100) : 0;

  return { rank, total, percentile };
};
