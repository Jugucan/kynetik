import { Calendar, TrendingUp, Award, Clock, Info, TrendingDown, Minus, BarChart3, ChevronDown, ChevronUp, MapPin } from "lucide-react";
import { useUsers } from "@/hooks/useUsers";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { calculateAdvancedStats, calculateProgramRanking, calculateYearlyTrend } from '@/utils/advancedStats';
import { NeoCard } from "@/components/NeoCard";
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
      <div className="space-y-4 px-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold">Les meves Estadístiques</h1>
        </div>
        <div className="text-center py-8 text-muted-foreground text-sm">Carregant...</div>
      </div>
    );
  }

  if (!currentUserData) {
    return (
      <div className="space-y-4 px-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold">Les meves Estadístiques</h1>
        </div>
        <NeoCard>
          <p className="text-muted-foreground text-sm text-center">Encara no tens sessions registrades.</p>
        </NeoCard>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4 max-w-7xl mx-auto pb-8">

      {/* Header */}
      <div className="flex items-center gap-3">
        <BarChart3 className="w-6 h-6 text-primary flex-shrink-0" />
        <div>
          <h1 className="text-xl font-bold">Les meves Estadístiques</h1>
          <p className="text-sm text-muted-foreground">Anàlisi detallada de la teva activitat</p>
        </div>
      </div>

      {/* Anàlisi Detallada */}
      <NeoCard className="p-4">
        <h3 className="font-semibold text-sm mb-3 flex items-center">
          <BarChart3 className="w-4 h-4 mr-2 text-primary" />
          Anàlisi Detallada
        </h3>

        <div className="space-y-3">

          {/* Freqüència Mensual */}
          <Collapsible
            open={isMonthlyFrequencyOpen}
            onOpenChange={setIsMonthlyFrequencyOpen}
          >
            <NeoCard pressed className="p-3">
              <CollapsibleTrigger className="flex items-center justify-between w-full">
                <h4 className="font-medium text-sm">Freqüència Mensual</h4>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {stats.advancedStats.monthlyFrequency.length} mesos
                  </Badge>
                  {isMonthlyFrequencyOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3">
                {stats.advancedStats.monthlyFrequency.length > 0 ? (
                  <div className="space-y-2">
                    {stats.advancedStats.monthlyFrequency.map((month, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{month.month}</span>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 transition-all"
                              style={{ width: `${Math.min(month.count * 20, 100)}%` }}
                            />
                          </div>
                          <Badge variant="outline" className="text-xs">{month.count}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No hi ha dades mensuals disponibles</p>
                )}
              </CollapsibleContent>
            </NeoCard>
          </Collapsible>

          {/* Dies Entre Sessions */}
          <NeoCard pressed className="p-3">
            <h4 className="font-medium text-sm mb-2">Dies entre Sessions</h4>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-green-600">
                {stats.advancedStats.daysBetweenSessions}
              </span>
              <span className="text-xs text-muted-foreground">dies de mitja</span>
            </div>
          </NeoCard>

          {/* Autodisciplina */}
          <NeoCard className={`p-3 ${stats.advancedStats.autodisciplineLevel.bgColor}`}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sm flex items-center gap-2">
                Autodisciplina
                <span className="text-base">{stats.advancedStats.autodisciplineLevel.emoji}</span>
              </h4>
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
                className="p-1 rounded-full hover:bg-white/50 transition-colors"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Mesura la regularitat amb què assisteixes al gimnàs
            </p>
            <div className="flex items-center justify-between mb-2">
              <span className={`font-bold text-sm ${stats.advancedStats.autodisciplineLevel.color}`}>
                {stats.advancedStats.autodisciplineLevel.label}
              </span>
              <span className="text-lg font-bold">
                {stats.advancedStats.autodiscipline}%
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${stats.advancedStats.autodisciplineLevel.barColor}`}
                style={{ width: `${stats.advancedStats.autodisciplineLevel.percentage}%` }}
              />
            </div>
          </NeoCard>

          {/* Evolució Recent */}
          <NeoCard pressed className="p-3">
            <h4 className="font-medium text-sm mb-1">Evolució Recent</h4>
            <p className="text-xs text-muted-foreground mb-2">
              Comparació del darrer mes amb la mitjana dels 3 mesos anteriors
            </p>
            <div className="grid grid-cols-2 gap-2">
              <NeoCard className="p-2 bg-blue-50 text-center">
                <div className="text-xl font-bold text-blue-700">{stats.advancedStats.improvementRecent.lastMonth}</div>
                <div className="text-xs text-blue-600">Darrer mes</div>
              </NeoCard>
              <NeoCard className="p-2 bg-purple-50 text-center">
                <div className="text-xl font-bold text-purple-700">{stats.advancedStats.improvementRecent.previousQuarterAverage}</div>
                <div className="text-xs text-purple-600">Mitjana 3 mesos ant.</div>
              </NeoCard>
            </div>
            <div className="mt-2 pt-2 border-t flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Tendència:</span>
              <div className="flex items-center gap-2">
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
                    <Minus className="w-3 h-3 mr-1" />
                    Estable
                  </Badge>
                )}
              </div>
            </div>
          </NeoCard>

        </div>
      </NeoCard>

      {/* Sessions i Posició per Programa */}
      {stats.programStats.length > 0 && (
        <NeoCard className="p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center">
            <Award className="w-4 h-4 mr-2 text-primary" />
            Sessions i Posició per Programa
          </h3>
          <div className="space-y-2">
            {stats.programStats.map((prog, idx) => {
              const ranking = stats.programRankings[prog.name];
              const percentage = (prog.count / stats.totalSessions) * 100;
              return (
                <NeoCard key={idx} pressed className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{prog.name}</span>
                    {ranking && ranking.total > 0 ? (
                      <Badge className="text-xs">#{ranking.rank} de {ranking.total}</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">N/A</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <Badge variant="outline" className="text-xs">{prog.count} sessions</Badge>
                  </div>
                </NeoCard>
              );
            })}
          </div>
        </NeoCard>
      )}

      {/* Evolució per Any */}
      <NeoCard className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm flex items-center">
            <Calendar className="w-4 h-4 mr-2 text-primary" />
            Evolució per Any
          </h3>
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
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 mb-2">
              {stats.bestYear && (
                <NeoCard className="p-2 bg-green-50 text-center">
                  <div className="text-xs text-green-600 mb-1">🏆 Millor any</div>
                  <div className="text-lg font-bold text-green-700">{stats.bestYear.year}</div>
                  <div className="text-xs text-green-600">{stats.bestYear.count} sessions</div>
                </NeoCard>
              )}
              {stats.worstYear && stats.yearlyStats.length > 1 && (
                <NeoCard className="p-2 bg-orange-50 text-center">
                  <div className="text-xs text-orange-600 mb-1">📉 Mínim</div>
                  <div className="text-lg font-bold text-orange-700">{stats.worstYear.year}</div>
                  <div className="text-xs text-orange-600">{stats.worstYear.count} sessions</div>
                </NeoCard>
              )}
            </div>
            {stats.yearlyStats.map((yearData) => {
              const maxCount = Math.max(...stats.yearlyStats.map(y => y.count));
              const percentage = (yearData.count / maxCount) * 100;
              const isBest = stats.bestYear?.year === yearData.year;
              const isWorst = stats.worstYear?.year === yearData.year;
              return (
                <NeoCard key={yearData.year} pressed className="p-2 flex items-center justify-between">
                  <span className={`font-medium text-sm min-w-[50px] ${isBest ? 'text-green-700' : isWorst ? 'text-orange-700' : ''}`}>
                    {yearData.year}
                  </span>
                  <div className="flex items-center gap-2 flex-1 ml-3">
                    <div className="h-5 flex-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${isBest ? 'bg-green-500' : isWorst ? 'bg-orange-400' : 'bg-primary'}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <Badge variant="outline" className="text-xs min-w-[45px] justify-center">
                      {yearData.count}
                    </Badge>
                  </div>
                </NeoCard>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-4">
            No hi ha dades d'assistència per any
          </p>
        )}
      </NeoCard>

      {/* Sessions per Centre */}
      {Object.keys(stats.centerCount).length > 0 && (
        <NeoCard className="p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center">
            <MapPin className="w-4 h-4 mr-2 text-primary" />
            Sessions per Centre
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(stats.centerCount).map(([center, count]) => (
              <NeoCard key={center} pressed className="p-3 text-center">
                <div className="text-xl font-bold">{count}</div>
                <div className="text-xs text-muted-foreground">{center}</div>
              </NeoCard>
            ))}
          </div>
        </NeoCard>
      )}

      {/* Historial Complet de Sessions */}
      <NeoCard className="p-4">
        <h3 className="font-semibold text-sm mb-3 flex items-center">
          <Clock className="w-4 h-4 mr-2 text-primary" />
          Historial Complet de Sessions
        </h3>
        <ScrollArea className="h-[500px] pr-4">
          {sessionsByDate.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No hi ha historial de sessions disponible
            </div>
          ) : (
            <div className="space-y-2">
              {sessionsByDate.map(([date, sessions]) => (
                <NeoCard key={date} pressed className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-3 h-3 text-primary" />
                    <h4 className="font-semibold text-sm">{formatDate(date)}</h4>
                    <Badge variant="outline" className="ml-auto text-xs">
                      {sessions.length} {sessions.length === 1 ? 'sessió' : 'sessions'}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    {sessions.map((session, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-background rounded-xl text-xs">
                        <Badge className="text-xs">{session.activity}</Badge>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          {session.time && (
                            <>
                              <Clock className="w-3 h-3" />
                              <span>{session.time}</span>
                            </>
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
                </NeoCard>
              ))}
            </div>
          )}
        </ScrollArea>
      </NeoCard>

    </div>
  );
};

export default UserStats;
