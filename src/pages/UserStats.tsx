import { Calendar, TrendingUp, Award, Clock, Info, TrendingDown, Minus, BarChart3, ChevronDown, ChevronUp, MapPin } from "lucide-react";
import { useUsers } from "@/hooks/useUsers";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { calculateAdvancedStats, calculateProgramRanking, calculateYearlyTrend, calculateUserRanking } from '@/utils/advancedStats';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const UserStats = () => {
  const { userProfile } = useUserProfile();
  const { users, loading } = useUsers();
  const [isMonthlyFrequencyOpen, setIsMonthlyFrequencyOpen] = useState(false);

  const currentUserData = users.find(u => u.email === userProfile?.email);

  const stats = useMemo(() => {
    if (!currentUserData || !currentUserData.sessions) {
      return {
        programStats: [],
        centerCount: {},
        yearlyStats: [],
        trend: 'stable' as const,
        bestYear: null,
        worstYear: null,
        totalSessions: 0,
        advancedStats: {
          monthlyFrequency: [],
          daysBetweenSessions: 0,
          autodiscipline: 0,
          autodisciplineLevel: {
            label: 'N/A',
            emoji: '📊',
            color: 'text-gray-500',
            bgColor: 'bg-gray-50',
            barColor: 'bg-gray-400',
            percentage: 0
          },
          autodisciplineDetails: {
            lastMonthSessions: 0,
            monthlyAverage: 0,
            bestYearSessions: 0,
            currentYearProjection: 0,
            recentScore: 0,
            historicScore: 0
          },
          improvementRecent: {
            lastMonth: 0,
            previousQuarterAverage: 0,
            trend: 'stable' as const,
            percentageChange: '0'
          }
        },
        generalRanking: { rank: 0, total: 0, percentile: 0 },
        programRankings: {}
      };
    }

    const sessions = currentUserData.sessions || [];

    const programCount: { [key: string]: number } = {};
    sessions.forEach(session => {
      programCount[session.activity] = (programCount[session.activity] || 0) + 1;
    });

    const programStats = Object.entries(programCount)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));

    const centerCount: { [key: string]: number } = {};
    sessions.forEach(session => {
      if (session.center) {
        centerCount[session.center] = (centerCount[session.center] || 0) + 1;
      }
    });

    const { yearlyStats, trend, bestYear, worstYear } = calculateYearlyTrend(sessions);
    const advancedStats = calculateAdvancedStats(currentUserData);

    const generalRanking = users.length > 0
      ? calculateUserRanking(users, currentUserData, 'totalSessions')
      : { rank: 0, total: 0, percentile: 0 };

    const programRankings: { [key: string]: any } = {};
    programStats.forEach(prog => {
      programRankings[prog.name] = calculateProgramRanking(users, currentUserData, prog.name);
    });

    return {
      programStats,
      centerCount,
      yearlyStats,
      trend,
      bestYear,
      worstYear,
      totalSessions: sessions.length,
      advancedStats,
      generalRanking,
      programRankings
    };
  }, [currentUserData, users]);

  const sessionsByDate = useMemo(() => {
    if (!currentUserData || !currentUserData.sessions) return [];
    const sessions = currentUserData.sessions || [];
    const grouped: { [key: string]: typeof sessions } = {};
    sessions.forEach(session => {
      if (!grouped[session.date]) grouped[session.date] = [];
      grouped[session.date].push(session);
    });
    return Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0]));
  }, [currentUserData]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ca-ES', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="px-4 max-w-2xl mx-auto pt-6 space-y-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold">Les meves Estadístiques</h1>
        </div>
        <div className="text-center py-8 text-muted-foreground text-sm">Carregant...</div>
      </div>
    );
  }

  if (!currentUserData) {
    return (
      <div className="px-4 max-w-2xl mx-auto pt-6 space-y-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold">Les meves Estadístiques</h1>
        </div>
        <div className="rounded-2xl shadow-neo p-6 text-center text-sm text-muted-foreground">
          Encara no tens sessions registrades.
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 max-w-2xl mx-auto pb-12 space-y-4">

      {/* TÍTOL */}
      <div className="flex items-center gap-3 pt-2">
        <BarChart3 className="w-5 h-5 text-primary flex-shrink-0" />
        <div>
          <h1 className="text-xl font-bold">Les meves Estadístiques</h1>
          <p className="text-xs text-muted-foreground">Anàlisi detallada de la teva activitat</p>
        </div>
      </div>

      {/* ── AUTODISCIPLINA ── targeta única, número protagonista */}
      <div className="rounded-2xl shadow-neo bg-background p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Autodisciplina</p>
            <div className="flex items-end gap-2">
              <span className={`text-5xl font-bold leading-none ${stats.advancedStats.autodisciplineLevel.color}`}>
                {stats.advancedStats.autodiscipline}%
              </span>
              <span className="text-xl mb-0.5">{stats.advancedStats.autodisciplineLevel.emoji}</span>
            </div>
            <p className={`text-sm font-semibold mt-1 ${stats.advancedStats.autodisciplineLevel.color}`}>
              {stats.advancedStats.autodisciplineLevel.label}
            </p>
          </div>
          <button
            onClick={() => alert(
              `COM ES CALCULA L'AUTODISCIPLINA?\n\n` +
              `Es calcula combinant dos factors:\n\n` +
              `🔹 Consistència Recent (70%): Compara les sessions de l'últim mes amb la teva mitjana dels últims 5 mesos.\n\n` +
              `🔹 Context Històric (30%): Compara el teu ritme actual amb el teu millor any.\n\n` +
              `Detalls del càlcul:\n` +
              `• Últim mes: ${stats.advancedStats.autodisciplineDetails.lastMonthSessions} sessions\n` +
              `• Mitjana mensual: ${stats.advancedStats.autodisciplineDetails.monthlyAverage} sessions\n` +
              `• Millor any: ${stats.advancedStats.autodisciplineDetails.bestYearSessions} sessions\n` +
              `• Projecció any actual: ${stats.advancedStats.autodisciplineDetails.currentYearProjection} sessions\n\n` +
              `Puntuació Recent: ${stats.advancedStats.autodisciplineDetails.recentScore}%\n` +
              `Puntuació Històrica: ${stats.advancedStats.autodisciplineDetails.historicScore}%\n` +
              `TOTAL: ${stats.advancedStats.autodiscipline}%`
            )}
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground transition-colors"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>

        {/* Barra de progrés inset */}
        <div className="h-3 rounded-full shadow-neo-inset overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${stats.advancedStats.autodisciplineLevel.barColor}`}
            style={{ width: `${stats.advancedStats.autodisciplineLevel.percentage}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Mesura la regularitat amb què assisteixes al gimnàs
        </p>
      </div>

      {/* ── EVOLUCIÓ RECENT + REGULARITAT — dues mètriques en una fila ── */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl shadow-neo bg-background p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Evolució Recent</p>
          <div className="space-y-3">
            <div>
              <div className="text-3xl font-bold">{stats.advancedStats.improvementRecent.lastMonth}</div>
              <div className="text-xs text-muted-foreground">Darrer mes</div>
            </div>
            <div className="h-px bg-muted" />
            <div>
              <div className="text-2xl font-bold text-muted-foreground">{stats.advancedStats.improvementRecent.previousQuarterAverage}</div>
              <div className="text-xs text-muted-foreground">Mitjana 3 mesos ant.</div>
            </div>
          </div>
          <div className="mt-3">
            {stats.advancedStats.improvementRecent.trend === 'up' && (
              <Badge className="bg-green-500 text-xs">
                <TrendingUp className="w-3 h-3 mr-1" />+{stats.advancedStats.improvementRecent.percentageChange}%
              </Badge>
            )}
            {stats.advancedStats.improvementRecent.trend === 'down' && (
              <Badge className="bg-red-500 text-xs">
                <TrendingDown className="w-3 h-3 mr-1" />{stats.advancedStats.improvementRecent.percentageChange}%
              </Badge>
            )}
            {stats.advancedStats.improvementRecent.trend === 'stable' && (
              <Badge variant="outline" className="text-xs">
                <Minus className="w-3 h-3 mr-1" />Estable
              </Badge>
            )}
          </div>
        </div>

        <div className="rounded-2xl shadow-neo bg-background p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Regularitat</p>
          <div className="text-4xl font-bold text-green-600 leading-none">
            {stats.advancedStats.daysBetweenSessions}
          </div>
          <div className="text-xs text-muted-foreground mt-2">dies de mitjana entre sessions</div>
        </div>
      </div>

      {/* ── FREQÜÈNCIA MENSUAL ── */}
      <div className="rounded-2xl shadow-neo bg-background p-5">
        <Collapsible open={isMonthlyFrequencyOpen} onOpenChange={setIsMonthlyFrequencyOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Freqüència Mensual</p>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="text-xs">{stats.advancedStats.monthlyFrequency.length} mesos</span>
              {isMonthlyFrequencyOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent className="mt-4 space-y-2.5">
            {stats.advancedStats.monthlyFrequency.length > 0 ? (
              stats.advancedStats.monthlyFrequency.map((month, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-20 shrink-0">{month.month}</span>
                  <div className="h-2 flex-1 rounded-full shadow-neo-inset overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${Math.min(month.count * 20, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold w-4 text-right">{month.count}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">No hi ha dades mensuals disponibles</p>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* ── PROGRAMES ── */}
      {stats.programStats.length > 0 && (
        <div className="rounded-2xl shadow-neo bg-background p-5">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-4 h-4 text-primary" />
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Programes</p>
          </div>
          <div className="space-y-4">
            {stats.programStats.map((prog, idx) => {
              const ranking = stats.programRankings[prog.name];
              const percentage = (prog.count / stats.totalSessions) * 100;
              return (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium">{prog.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{prog.count} sess.</span>
                      {ranking && ranking.total > 0 && (
                        <Badge variant="outline" className="text-xs py-0">
                          #{ranking.rank}/{ranking.total}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="h-2 rounded-full shadow-neo-inset overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── EVOLUCIÓ PER ANY ── */}
      <div className="rounded-2xl shadow-neo bg-background p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Evolució per Any</p>
          </div>
          {stats.trend === 'up' && (
            <Badge className="bg-green-500 text-xs"><TrendingUp className="w-3 h-3 mr-1" />A l'alça</Badge>
          )}
          {stats.trend === 'down' && (
            <Badge className="bg-red-500 text-xs"><TrendingDown className="w-3 h-3 mr-1" />A la baixa</Badge>
          )}
          {stats.trend === 'stable' && (
            <Badge variant="outline" className="text-xs"><Minus className="w-3 h-3 mr-1" />Estable</Badge>
          )}
        </div>

        {stats.yearlyStats.length > 0 ? (
          <div className="space-y-3">
            {stats.yearlyStats.length > 1 && (stats.bestYear || stats.worstYear) && (
              <div className="flex flex-wrap gap-3 mb-2 text-xs text-muted-foreground">
                {stats.bestYear && (
                  <span>🏆 <strong className="text-green-700">{stats.bestYear.year}</strong> · {stats.bestYear.count} sessions</span>
                )}
                {stats.worstYear && (
                  <span>📉 <strong className="text-orange-700">{stats.worstYear.year}</strong> · {stats.worstYear.count} sessions</span>
                )}
              </div>
            )}
            {stats.yearlyStats.map((yearData) => {
              const maxCount = Math.max(...stats.yearlyStats.map(y => y.count));
              const percentage = (yearData.count / maxCount) * 100;
              const isBest = stats.bestYear?.year === yearData.year;
              const isWorst = stats.worstYear?.year === yearData.year;
              return (
                <div key={yearData.year} className="flex items-center gap-3">
                  <span className={`text-sm font-semibold w-12 shrink-0 ${isBest ? 'text-green-700' : isWorst ? 'text-orange-700' : ''}`}>
                    {yearData.year}
                  </span>
                  <div className="h-2 flex-1 rounded-full shadow-neo-inset overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isBest ? 'bg-green-500' : isWorst ? 'bg-orange-400' : 'bg-primary'}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-6 text-right">{yearData.count}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No hi ha dades d'assistència per any</p>
        )}
      </div>

      {/* ── CENTRES ── */}
      {Object.keys(stats.centerCount).length > 0 && (
        <div className="rounded-2xl shadow-neo bg-background p-5">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-4 h-4 text-primary" />
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Sessions per Centre</p>
          </div>
          <div className="flex gap-8">
            {Object.entries(stats.centerCount).map(([center, count]) => (
              <div key={center}>
                <div className="text-3xl font-bold">{count}</div>
                <div className="text-xs text-muted-foreground mt-1">{center}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── HISTORIAL ── */}
      <div className="rounded-2xl shadow-neo bg-background p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-primary" />
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Historial de Sessions</p>
        </div>
        {sessionsByDate.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hi ha historial de sessions disponible</p>
        ) : (
          <div className="space-y-5">
            {sessionsByDate.map(([date, sessions]) => (
              <div key={date}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-muted-foreground">{formatDate(date)}</span>
                  {sessions.length > 1 && (
                    <span className="text-xs text-muted-foreground">· {sessions.length}</span>
                  )}
                </div>
                <div className="space-y-1.5 pl-3 border-l-2 border-muted">
                  {sessions.map((session, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-xs">{session.activity}</Badge>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {session.time && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />{session.time}
                          </span>
                        )}
                        {session.center && (
                          <Badge
                            variant="outline"
                            className={`text-xs ${session.center === 'Arbúcies' ? 'bg-blue-50' : 'bg-green-50'}`}
                          >
                            {session.center}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default UserStats;
