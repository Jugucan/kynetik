import { User, UserSession } from '@/hooks/useUsers';

export interface AutodisciplineLevel {
  label: string;
  emoji: string;
  color: string;
  bgColor: string;
  percentage: number;
  barColor: string;
}

export interface AdvancedStats {
  monthlyFrequency: Array<{ month: string; count: number }>;
  daysBetweenSessions: number;
  autodiscipline: number;
  autodisciplineLevel: AutodisciplineLevel;
  improvementRecent: {
    trend: 'improving' | 'stable' | 'declining';
    percentageChange: number;
    message: string;
  };
}

export interface UserRanking {
  rank: number;
  total: number;
  percentile: number;
}

// Calculate monthly session frequency
export const calculateMonthlyFrequency = (sessions: UserSession[]): Array<{ month: string; count: number }> => {
  const monthCounts: { [key: string]: number } = {};
  
  sessions.forEach(session => {
    const date = new Date(session.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
  });

  return Object.entries(monthCounts)
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month));
};

// Calculate average days between sessions
export const calculateDaysBetweenSessions = (sessions: UserSession[]): number => {
  if (sessions.length < 2) return 0;

  const sortedSessions = [...sessions].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let totalDays = 0;
  for (let i = 1; i < sortedSessions.length; i++) {
    const prevDate = new Date(sortedSessions[i - 1].date);
    const currDate = new Date(sortedSessions[i].date);
    const daysDiff = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
    totalDays += daysDiff;
  }

  return Math.round(totalDays / (sortedSessions.length - 1));
};

// Calculate autodiscipline score (0-100)
export const calculateAutodiscipline = (sessions: UserSession[]): number => {
  if (sessions.length < 2) return 0;

  const avgDays = calculateDaysBetweenSessions(sessions);
  if (avgDays === 0) return 100;

  // Perfect score (100) for sessions every 3 days or less
  // Score decreases as days between sessions increase
  const idealDays = 3;
  const maxDays = 30;

  if (avgDays <= idealDays) return 100;
  if (avgDays >= maxDays) return 0;

  const score = 100 - ((avgDays - idealDays) / (maxDays - idealDays)) * 100;
  return Math.round(Math.max(0, Math.min(100, score)));
};

// Get autodiscipline level with descriptive info
export const getAutodisciplineLevel = (score: number): AutodisciplineLevel => {
  if (score >= 90) {
    return {
      label: 'Excel·lent',
      emoji: '🔥',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      percentage: score,
      barColor: 'bg-green-500'
    };
  } else if (score >= 70) {
    return {
      label: 'Molt Bona',
      emoji: '💪',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      percentage: score,
      barColor: 'bg-blue-500'
    };
  } else if (score >= 50) {
    return {
      label: 'Bona',
      emoji: '👍',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      percentage: score,
      barColor: 'bg-yellow-500'
    };
  } else if (score >= 30) {
    return {
      label: 'Millorable',
      emoji: '📈',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      percentage: score,
      barColor: 'bg-orange-500'
    };
  } else {
    return {
      label: 'A Millorar',
      emoji: '⚠️',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      percentage: score,
      barColor: 'bg-red-500'
    };
  }
};

// Calculate improvement trend for recent sessions
export const calculateImprovementRecent = (sessions: UserSession[]): AdvancedStats['improvementRecent'] => {
  if (sessions.length < 4) {
    return {
      trend: 'stable',
      percentageChange: 0,
      message: 'Necessites més sessions per calcular la tendència'
    };
  }

  const sortedSessions = [...sessions].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const recentSessions = sortedSessions.slice(0, Math.floor(sessions.length / 2));
  const olderSessions = sortedSessions.slice(Math.floor(sessions.length / 2));

  const recentAvgDays = calculateDaysBetweenSessions(recentSessions);
  const olderAvgDays = calculateDaysBetweenSessions(olderSessions);

  if (olderAvgDays === 0) {
    return {
      trend: 'stable',
      percentageChange: 0,
      message: 'Tendència estable'
    };
  }

  const percentageChange = ((olderAvgDays - recentAvgDays) / olderAvgDays) * 100;

  if (percentageChange > 10) {
    return {
      trend: 'improving',
      percentageChange: Math.round(percentageChange),
      message: `Millora del ${Math.round(percentageChange)}% en regularitat`
    };
  } else if (percentageChange < -10) {
    return {
      trend: 'declining',
      percentageChange: Math.round(Math.abs(percentageChange)),
      message: `Disminució del ${Math.round(Math.abs(percentageChange))}% en regularitat`
    };
  } else {
    return {
      trend: 'stable',
      percentageChange: 0,
      message: 'Tendència estable'
    };
  }
};

// Main function to calculate all advanced stats
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

// Calculate user ranking based on a specific metric
export const calculateUserRanking = (
  allUsers: User[],
  currentUser: User,
  metric: 'totalSessions' | 'autodiscipline' | 'daysBetweenSessions'
): UserRanking => {
  const userValues = allUsers.map(user => {
    let value: number;
    switch (metric) {
      case 'totalSessions':
        value = user.sessions.length;
        break;
      case 'autodiscipline':
        value = calculateAutodiscipline(user.sessions);
        break;
      case 'daysBetweenSessions':
        value = calculateDaysBetweenSessions(user.sessions);
        break;
      default:
        value = 0;
    }
    return { userId: user.id, value };
  });

  // Sort based on metric (higher is better for sessions and autodiscipline, lower is better for daysBetween)
  const sortedUsers = [...userValues].sort((a, b) => {
    if (metric === 'daysBetweenSessions') {
      return a.value - b.value; // Lower is better
    }
    return b.value - a.value; // Higher is better
  });

  const rank = sortedUsers.findIndex(u => u.userId === currentUser.id) + 1;
  const percentile = ((allUsers.length - rank) / allUsers.length) * 100;

  return {
    rank,
    total: allUsers.length,
    percentile: Math.round(percentile)
  };
};

// Calculate ranking within a specific program
export const calculateProgramRanking = (
  allUsers: User[],
  currentUser: User,
  program: string
): UserRanking => {
  // Filter users who have sessions in this program AND are from the same center
  const programUsers = allUsers.filter(user => 
    user.sessions.some(s => s.activity === program) &&
    user.center === currentUser.center
  );

  if (programUsers.length === 0) {
    return { rank: 0, total: 0, percentile: 0 };
  }

  // Calculate sessions for each user in this specific program
  const userProgramSessions = programUsers.map(user => ({
    userId: user.id,
    sessions: user.sessions.filter(s => s.activity === program).length
  }));

  // Sort by sessions (higher is better)
  const sortedUsers = [...userProgramSessions].sort((a, b) => b.sessions - a.sessions);

  const rank = sortedUsers.findIndex(u => u.userId === currentUser.id) + 1;
  const percentile = ((programUsers.length - rank) / programUsers.length) * 100;

  return {
    rank,
    total: programUsers.length,
    percentile: Math.round(percentile)
  };
};
