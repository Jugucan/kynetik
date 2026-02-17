import { Calendar, TrendingUp, Award, Clock, Info, TrendingDown, Minus, BarChart3, ChevronDown, ChevronUp, MapPin, Zap } from "lucide-react";
import { useUsers } from "@/hooks/useUsers";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
      <div className="px-4 max-w-2xl mx-auto pt-6">
        <h1 className="text-xl font-semibold mb-1">Les meves Estadístiques</h1>
        <p className="text-sm text-muted-foreground">Carregant...</p>
      </div>
    );
  }

  if (!currentUserData) {
    return (
      <div className="px-4 max-w-2xl mx-auto pt-6">
        <h1 className="text-xl font-semibold mb-1">Les meves Estadístiques</h1>
        <p className="text-sm text-muted-foreground">Encara no tens sessions registrades.</p>
      </div>
    );
  }

  return (
    <div className="px-4 max-w-2xl mx-auto pb-12 space-y-8">

      {/* TÍTOL */}
      <div className="pt-2">
        <h1 className="text-xl font-semibold">Les meves Estadístiques</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Anàlisi detallada de la teva activitat</p>
      </div>

      {/* ── AUTODISCIPLINA — element destacat, únic, sense caixa ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Autodisciplina
          </h2>
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
            className="p-1 rounded-full text-muted-foreground hover:text-foreground transition-colors"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>

        {/* Número gran + etiqueta — sense caixa, directe sobre el fons */}
        <div className="flex items-end gap-3 mb-3">
          <span className={`text-5xl font-bold ${stats.advancedStats.autodisciplineLevel.color}`}>
            {stats.advancedStats.autodiscipline}%
          </span>
          <span className="text-lg mb-1">
            {stats.advancedStats.autodisciplineLevel.emoji}
            <span className={`ml-1 font-medium ${stats.advancedStats.autodisciplineLevel.color}`}>
              {stats.advancedStats.autodisciplineLevel.label}
            </span>
          </span>
        </div>

        {/* Barra prima i elegant */}
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-700 ${stats.advancedStats.autodisciplineLevel.barColor}`}
            style={{ width: `${stats.advancedStats.autodisciplineLevel.percentage}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Mesura la regularitat amb què assisteixes al gimnàs
        </p>
      </div>

      <Separator />

      {/* ── EVOLUCIÓ RECENT — dos números, net ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Evolució Recent
          </h2>
          {stats.advancedStats.improvementRecent.trend === 'up' && (
            <Badge className="bg-green-500 text-xs">
              <TrendingUp className="w-3 h-3 mr-1" />
              +{stats.advancedStats.improvementRecent.percentageChange}%
            </Badge>
          )}
          {stats.advancedStats.improvementRecent.trend === 'down' && (
            <Badge className="bg-red-500 text-xs">
              <TrendingDown className="w-3 h-3 mr-1" />
              {stats.advancedStats.improvementRecent.percentageChange}%
            </Badge>
          )}
          {stats.advancedStats.improvementRecent.trend === 'stable' && (
            <Badge variant="outline" className="text-xs">
              <Minus className="w-3 h-3 mr-1" />Estable
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-3xl font-bold">{stats.advancedStats.improvementRecent.lastMonth}</div>
            <div className="text-xs text-muted-foreground mt-1">Darrer mes</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-muted-foreground">{stats.advancedStats.improvementRecent.previousQuarterAverage}</div>
            <div className="text-xs text-muted-foreground mt-1">Mitjana 3 mesos anteriors</div>
          </div>
        </div>
      </div>

      <Separator />

      {/* ── DIES ENTRE SESSIONS ── */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Regularitat
        </h2>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-green-600">
            {stats.advancedStats.daysBetweenSessions}
          </span>
          <span className="text-sm text-muted-foreground">dies de mitjana entre sessions</span>
        </div>
      </div>

      <Separator />

      {/* ── FREQÜÈNCIA MENSUAL — desplegable lleuger ── */}
      <div>
        <Collapsible open={isMonthlyFrequencyOpen} onOpenChange={setIsMonthlyFrequencyOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full group">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Freqüència Mensual
            </h2>
            <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
              <span className="text-xs">{stats.advancedStats.monthlyFrequency.length} mesos</span>
              {isMonthlyFrequencyOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent className="mt-4 space-y-2">
            {stats.advancedStats.monthlyFrequency.length > 0 ? (
              stats.advancedStats.monthlyFrequency.map((month, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-20 shrink-0">{month.month}</span>
                  <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${Math.min(month.count * 20, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium w-4 text-right">{month.count}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">No hi ha dades mensuals disponibles</p>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>

      <Separator />

      {/* ── PROGRAMES — llista neta amb barra ── */}
      {stats.programStats.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            Programes
          </h2>
          <div className="space-y-4">
            {stats.programStats.map((prog, idx) => {
              const ranking = stats.programRankings[prog.name];
              const percentage = (prog.count / stats.totalSessions) * 100;
              return (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium">{prog.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{prog.count} sessions</span>
                      {ranking && ranking.total > 0 && (
                        <Badge variant="outline" className="text-xs py-0">
                          #{ranking.rank} de {ranking.total}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Separator />

      {/* ── EVOLUCIÓ PER ANY ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Evolució per Any
          </h2>
          {stats.trend === 'up' && (
            <Badge className="bg-green-500 text-xs">
              <TrendingUp className="w-3 h-3 mr-1" />A l'alça
            </Badge>
          )}
          {stats.trend === 'down' && (
            <Badge className="bg-red-500 text-xs">
              <TrendingDown className="w-3 h-3 mr-1" />A la baixa
            </Badge>
          )}
          {stats.trend === 'stable' && (
            <Badge variant="outline" className="text-xs">
              <Minus className="w-3 h-3 mr-1" />Estable
            </Badge>
          )}
        </div>

        {stats.yearlyStats.length > 0 ? (
          <div className="space-y-3">
            {/* Millor / pitjor any — inline, sense caixes */}
            {(stats.bestYear || stats.worstYear) && stats.yearlyStats.length > 1 && (
              <div className="flex gap-4 mb-4 text-xs text-muted-foreground">
                {stats.bestYear && (
                  <span>🏆 Millor: <strong className="text-green-700">{stats.bestYear.year}</strong> ({stats.bestYear.count} sessions)</span>
                )}
                {stats.worstYear && (
                  <span>📉 Mínim: <strong className="text-orange-700">{stats.worstYear.year}</strong> ({stats.worstYear.count} sessions)</span>
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
                  <span className={`text-sm font-medium w-12 shrink-0 ${isBest ? 'text-green-700' : isWorst ? 'text-orange-700' : ''}`}>
                    {yearData.year}
                  </span>
                  <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${isBest ? 'bg-green-500' : isWorst ? 'bg-orange-400' : 'bg-primary'}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-8 text-right">{yearData.count}</span>
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
        <>
          <Separator />
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">
              Sessions per Centre
            </h2>
            <div className="flex gap-8">
              {Object.entries(stats.centerCount).map(([center, count]) => (
                <div key={center}>
                  <div className="text-3xl font-bold">{count}</div>
                  <div className="text-xs text-muted-foreground mt-1">{center}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <Separator />

      {/* ── HISTORIAL — llista sense caixes ── */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">
          Historial de Sessions
        </h2>
        {sessionsByDate.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hi ha historial de sessions disponible</p>
        ) : (
          <div className="space-y-6">
            {sessionsByDate.map(([date, sessions]) => (
              <div key={date}>
                {/* Data com a titol de grup */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {formatDate(date)}
                  </span>
                  {sessions.length > 1 && (
                    <span className="text-xs text-muted-foreground">· {sessions.length} sessions</span>
                  )}
                </div>
                {/* Sessions del dia — llista horitzontal minimalista */}
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
