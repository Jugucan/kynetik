import { Calendar, TrendingUp, Award, Clock, Info, TrendingDown, Minus, BarChart3, ChevronDown, ChevronUp, MapPin } from "lucide-react";
import { useUsers } from "@/hooks/useUsers";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const [isHistorialOpen, setIsHistorialOpen] = useState(false);
  const [isAutodisciplinaInfoOpen, setIsAutodisciplinaInfoOpen] = useState(false);
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

      {/* ── AUTODISCIPLINA ── fons de color dinàmic */}
      <div className={`rounded-2xl shadow-neo p-5 ${stats.advancedStats.autodisciplineLevel.bgColor}`}>
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
            onClick={() => setIsAutodisciplinaInfoOpen(true)}
            className="p-1.5 rounded-full hover:bg-white/50 transition-colors"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>

        {/* Barra de progrés */}
        <div className="h-3 rounded-full bg-gray-200 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${stats.advancedStats.autodisciplineLevel.barColor}`}
            style={{ width: `${stats.advancedStats.autodisciplineLevel.percentage}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Mesura la regularitat amb què assisteixes al gimnàs
        </p>
      </div>

      {/* ── EVOLUCIÓ RECENT + REGULARITAT — columna en mòbil, fila en pc ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl shadow-neo bg-background p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Evolució Recent</p>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="p-3 bg-blue-50 rounded-xl text-center">
              <div className="text-3xl font-bold text-blue-700">{stats.advancedStats.improvementRecent.lastMonth}</div>
              <div className="text-xs text-blue-600 mt-1">Darrer mes</div>
            </div>
            <div className="p-3 bg-purple-50 rounded-xl text-center">
              <div className="text-3xl font-bold text-purple-700">{stats.advancedStats.improvementRecent.previousQuarterAverage}</div>
              <div className="text-xs text-purple-600 mt-1">Mitjana 3 mesos ant.</div>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-xs text-muted-foreground">Tendència</span>
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
              <div className="grid grid-cols-2 gap-2 mb-2">
                {stats.bestYear && (
                  <div className="p-2 bg-green-50 border border-green-200 rounded-xl text-center">
                    <div className="text-xs text-green-600 mb-1">🏆 Millor any</div>
                    <div className="text-lg font-bold text-green-700">{stats.bestYear.year}</div>
                    <div className="text-xs text-green-600">{stats.bestYear.count} sessions</div>
                  </div>
                )}
                {stats.worstYear && (
                  <div className="p-2 bg-orange-50 border border-orange-200 rounded-xl text-center">
                    <div className="text-xs text-orange-600 mb-1">📉 Mínim</div>
                    <div className="text-lg font-bold text-orange-700">{stats.worstYear.year}</div>
                    <div className="text-xs text-orange-600">{stats.worstYear.count} sessions</div>
                  </div>
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
        <Collapsible open={isHistorialOpen} onOpenChange={setIsHistorialOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Historial de Sessions</p>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="text-xs">{sessionsByDate.length} dies</span>
              {isHistorialOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent className="mt-4">
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
          </CollapsibleContent>
        </Collapsible>
      </div>

    {/* ── MODAL AUTODISCIPLINA ── */}
      <Dialog open={isAutodisciplinaInfoOpen} onOpenChange={setIsAutodisciplinaInfoOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">Com es calcula l'Autodisciplina?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">Es calcula combinant dos factors:</p>

            <div className="p-3 bg-blue-50 rounded-xl">
              <p className="font-semibold text-blue-700 mb-1">🔹 Consistència Recent — 70%</p>
              <p className="text-xs text-blue-600">Compara les sessions de l'últim mes amb la teva mitjana dels últims 5 mesos.</p>
            </div>

            <div className="p-3 bg-purple-50 rounded-xl">
              <p className="font-semibold text-purple-700 mb-1">🔹 Context Històric — 30%</p>
              <p className="text-xs text-purple-600">Compara el teu ritme actual amb el teu millor any.</p>
            </div>

            <div className="border-t pt-3 space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Detalls del teu càlcul</p>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Últim mes:</span>
                <span className="font-medium">{stats.advancedStats.autodisciplineDetails.lastMonthSessions} sessions</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Mitjana mensual:</span>
                <span className="font-medium">{stats.advancedStats.autodisciplineDetails.monthlyAverage} sessions</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Millor any:</span>
                <span className="font-medium">{stats.advancedStats.autodisciplineDetails.bestYearSessions} sessions</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Projecció any actual:</span>
                <span className="font-medium">{stats.advancedStats.autodisciplineDetails.currentYearProjection} sessions</span>
              </div>
            </div>

            <div className="border-t pt-3 space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Puntuacions</p>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Pes Consistència Recent:</span>
                <span className="font-medium text-blue-600">70%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Pes Context Històric:</span>
                <span className="font-medium text-purple-600">30%</span>
              </div>
              <div className="flex justify-between text-xs font-bold border-t pt-2 mt-1">
                <span>Puntuació Total:</span>
                <span className={stats.advancedStats.autodisciplineLevel.color}>{stats.advancedStats.autodiscipline}%</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default UserStats;
