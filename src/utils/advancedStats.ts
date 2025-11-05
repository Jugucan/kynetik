import { User, UserSession } from '@/hooks/useUsers';

export interface AdvancedStats {
  monthlyFrequency: Array<{ month: string; count: number }>;
  daysBetweenSessions: number;
  consistency: number;
  improvementRecent: {
    lastMonth: number;
    lastQuarter: number;
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

export const calculateConsistency = (sessions: UserSession[]): number => {
  if (!sessions || sessions.length < 2) return 0;

  const daysBetween = calculateDaysBetweenSessions(sessions);
  if (daysBetween === 0) return 0;

  const variance = calculateVarianceInAttendance(sessions);
  const consistency = Math.max(0, 100 - (variance * 10));

  return Math.round(consistency);
};

const calculateVarianceInAttendance = (sessions: UserSession[]): number => {
  if (!sessions || sessions.length <= 1) return 0;

  const sortedDates = sessions
    .map(s => new Date(s.date).getTime())
    .sort((a, b) => a - b);

  const differences: number[] = [];
  for (let i = 1; i < sortedDates.length; i++) {
    const daysDiff = (sortedDates[i] - sortedDates[i - 1]) / (1000 * 60 * 60 * 24);
    differences.push(daysDiff);
  }

  const mean = differences.reduce((a, b) => a + b, 0) / differences.length;
  const variance = differences.reduce((sum, diff) => sum + Math.pow(diff - mean, 2), 0) / differences.length;

  return Math.sqrt(variance) / mean || 0;
};

export const calculateImprovementRecent = (sessions: UserSession[]): AdvancedStats['improvementRecent'] => {
  if (!sessions || sessions.length === 0) {
    return {
      lastMonth: 0,
      lastQuarter: 0,
      trend: 'stable',
      percentageChange: 0
    };
  }

  const now = new Date();
  const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());

  const lastMonthSessions = sessions.filter(s => new Date(s.date) >= oneMonthAgo).length;
  const lastQuarterSessions = sessions.filter(s => new Date(s.date) >= threeMonthsAgo).length;

  const avgMonthlyInLastQuarter = lastQuarterSessions / 3;
  const percentageChange = avgMonthlyInLastQuarter !== 0
    ? Math.round(((lastMonthSessions - avgMonthlyInLastQuarter) / avgMonthlyInLastQuarter) * 100)
    : 0;

  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (percentageChange > 10) trend = 'up';
  else if (percentageChange < -10) trend = 'down';

  return {
    lastMonth: lastMonthSessions,
    lastQuarter: lastQuarterSessions,
    trend,
    percentageChange
  };
};

export const calculateAdvancedStats = (user: User): AdvancedStats => {
  const sessions = user.sessions || [];

  return {
    monthlyFrequency: calculateMonthlyFrequency(sessions),
    daysBetweenSessions: calculateDaysBetweenSessions(sessions),
    consistency: calculateConsistency(sessions),
    improvementRecent: calculateImprovementRecent(sessions)
  };
};

export const calculateUserRanking = (allUsers: User[], currentUser: User, metric: 'totalSessions' | 'consistency' | 'daysBetweenSessions'): UserRanking => {
  let usersWithMetric: Array<{ user: User; value: number }> = [];

  if (metric === 'totalSessions') {
    usersWithMetric = allUsers.map(u => ({
      user: u,
      value: u.totalSessions || 0
    }));
  } else if (metric === 'consistency') {
    usersWithMetric = allUsers.map(u => ({
      user: u,
      value: calculateConsistency(u.sessions || [])
    }));
  } else if (metric === 'daysBetweenSessions') {
    usersWithMetric = allUsers.map(u => ({
      user: u,
      value: calculateDaysBetweenSessions(u.sessions || [])
    }));
  }

  usersWithMetric.sort((a, b) => {
    if (metric === 'daysBetweenSessions') {
      return a.value - b.value;
    }
    return b.value - a.value;
  });

  const currentUserIndex = usersWithMetric.findIndex(u => u.user.id === currentUser.id);
  const rank = currentUserIndex !== -1 ? currentUserIndex + 1 : 0;
  const total = usersWithMetric.length;
  const percentile = total > 0 ? Math.round(((total - rank) / total) * 100) : 0;

  return { rank, total, percentile };
};

export const calculateProgramRanking = (allUsers: User[], currentUser: User, program: string): UserRanking => {
  const programUsers = allUsers.filter(u => {
    const sessions = u.sessions || [];
    return sessions.some(s => s.activity === program);
  });

  const usersWithCount = programUsers.map(u => ({
    user: u,
    count: (u.sessions || []).filter(s => s.activity === program).length
  }));

  usersWithCount.sort((a, b) => b.count - a.count);

  const currentUserIndex = usersWithCount.findIndex(u => u.user.id === currentUser.id);
  const rank = currentUserIndex !== -1 ? currentUserIndex + 1 : 0;
  const total = usersWithCount.length;
  const percentile = total > 0 ? Math.round(((total - rank) / total) * 100) : 0;

  return { rank, total, percentile };
};
