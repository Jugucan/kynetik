import { Mail, Phone, Cake, MapPin, Calendar, TrendingUp, Award, Clock, Info, TrendingDown, Minus, BarChart3, Zap, ChevronDown, ChevronUp } from "lucide-react";
import { useUsers } from "@/hooks/useUsers";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { calculateAdvancedStats, calculateUserRanking, calculateProgramRanking } from '@/utils/advancedStats';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const UserIndex = () => {
  const { userProfile } = useUserProfile();
  const { users, loading } = useUsers();
  const [isMonthlyFrequencyOpen, setIsMonthlyFrequencyOpen] = useState(false);

  // Trobar l'usuari actual
  const currentUserData = users.find(u => u.email === userProfile?.email);

  // Calcular estadístiques completes
  const stats = useMemo(() => {
    // Si no hi ha usuari o sessions, retornar valors per defecte
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
    
    // Comptador per programa
    const programCount: { [key: string]: number } = {};
    sessions.forEach(session => {
      programCount[session.activity] = (programCount[session.activity] || 0) + 1;
    });
    
    const programStats = Object.entries(programCount)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
    
    // Comptador per centre
    const centerCount: { [key: string]: number } = {};
    sessions.forEach(session => {
      if (session.center) {
        centerCount[session.center] = (centerCount[session.center] || 0) + 1;
      }
    });
    
    // Sessions per any
    const yearlyCount: { [key: string]: number } = {};
    sessions.forEach(session => {
      const year = new Date(session.date).getFullYear().toString();
      yearlyCount[year] = (yearlyCount[year] || 0) + 1;
    });
    
    const yearlyStats = Object.entries(yearlyCount)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([year, count]) => ({ year, count }));
    
    // Tendència
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (yearlyStats.length >= 2) {
      const lastYear = yearlyStats[yearlyStats.length - 1].count;
      const previousYear = yearlyStats[yearlyStats.length - 2].count;
      const difference = lastYear - previousYear;
      
      if (difference > 0) trend = 'up';
      else if (difference < 0) trend = 'down';
    }
    
    const bestYear = yearlyStats.length > 0 
      ? yearlyStats.reduce((max, curr) => curr.count > max.count ? curr : max)
      : null;
    const worstYear = yearlyStats.length > 0
      ? yearlyStats.reduce((min, curr) => curr.count < min.count ? curr : min)
      : null;
    
    const advancedStats = calculateAdvancedStats(currentUserData);
    const generalRanking = calculateUserRanking(users, currentUserData, 'totalSessions');

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

  // Comprovacions DESPRÉS del useMemo
  if (loading) {
    return (
      <div className="space-y-6 px-4 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold">Benvinguda!</h1>
        <div className="text-center py-8 text-muted-foreground">Carregant...</div>
      </div>
    );
  }

  if (!currentUserData) {
    return (
      <div className="space-y-6 px-4 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold">Benvinguda, {userProfile?.displayName}!</h1>
        <div className="p-8 rounded-xl shadow-neo bg-background text-center">
          <p className="text-muted-foreground">Encara no tens sessions registrades.</p>
          <p className="text-sm text-muted-foreground mt-2">Quan assisteixis a la teva primera classe, les teves estadístiques apareixeran aquí!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 max-w-7xl mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <img 
          src={currentUserData.profileImageUrl || currentUserData.avatar} 
          alt={currentUserData.name}
          className="w-20 h-20 rounded-full shadow-neo object-cover"
        />
        <div>
          <h1 className="text-3xl font-bold">Benvinguda, {userProfile?.displayName}! 👋</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge variant="outline" className={currentUserData.center === "Arbúcies" ? "bg-blue-100" : "bg-green-100"}>
              <MapPin className="w-3 h-3 mr-1" />
              {currentUserData.center}
            </Badge>
            <Badge variant="outline">
              <Cake className="w-3 h-3 mr-1" />
              {currentUserData.age} anys
            </Badge>
          </div>
        </div>
      </div>

      {/* Resum General */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-neo text-center">
          <div className="text-3xl font-bold text-blue-700">{stats.totalSessions}</div>
          <div className="text-sm text-blue-600 mt-1">Sessions Totals</div>
        </div>
        <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-neo text-center">
          <div className="text-3xl font-bold text-green-700">{stats.programStats.length}</div>
          <div className="text-sm text-green-600 mt-1">Programes</div>
        </div>
        <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-neo text-center">
          <div className="text-3xl font-bold text-purple-700">{currentUserData.daysSinceLastSession || 0}</div>
          <div className="text-sm text-purple-600 mt-1">Dies sense venir</div>
        </div>
        <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow-neo text-center">
          <div className="text-2xl font-bold text-orange-700">
            {currentUserData.firstSession ? new Date(currentUserData.firstSession).getFullYear() : 'N/A'}
          </div>
          <div className="text-sm text-orange-600 mt-1">Des de</div>
        </div>
      </div>

      {/* Informació de contacte */}
      <div className="p-6 rounded-xl shadow-neo bg-background">
        <h3 className="font-semibold text-lg mb-4 flex items-center">
          <Mail className="w-5 h-5 mr-2 text-primary" />
          La teva Informació
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex items-center space-x-2 p-3 bg-muted/30 rounded-lg">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm truncate">{currentUserData.email || 'No disponible'}</span>
          </div>
          <div className="flex items-center space-x-2 p-3 bg-muted/30 rounded-lg">
            <Phone className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">{currentUserData.phone || 'No disponible'}</span>
          </div>
          <div className="flex items-center space-x-2 p-3 bg-muted/30 rounded-lg">
            <Cake className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">{currentUserData.birthday}</span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Ranking General */}
      <div className="p-6 rounded-xl shadow-neo bg-background">
        <h3 className="font-semibold text-lg mb-4 flex items-center">
          <Zap className="w-5 h-5 mr-2 text-primary" />
          La teva Posició
        </h3>
        <div className="p-5 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl shadow-neo">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-indigo-600 mb-1">Ranking General</div>
              <div className="text-4xl font-bold text-indigo-700">
                #{stats.generalRanking.rank}
              </div>
            </div>
            {stats.generalRanking.total > 0 && (
              <div className="text-right">
                <div className="text-sm text-indigo-600">
                  de {stats.generalRanking.total} usuaris
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* Estadístiques Avançades */}
      <div className="p-6 rounded-xl shadow-neo bg-background">
        <h3 className="font-semibold text-lg mb-4 flex items-center">
          <BarChart3 className="w-5 h-5 mr-2 text-primary" />
          Anàlisi Detallada
        </h3>

        <div className="space-y-4">
          {/* Freqüència Mensual */}
          <Collapsible 
            open={isMonthlyFrequencyOpen} 
            onOpenChange={setIsMonthlyFrequencyOpen}
            className="p-4 bg-muted/30 rounded-lg"
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full">
              <h4 className="font-medium">Freqüència Mensual</h4>
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
                      <span className="text-sm text-muted-foreground">{month.month}</span>
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
          </Collapsible>

          {/* Dies Entre Sessions */}
          <div className="p-4 bg-muted/30 rounded-lg">
            <h4 className="font-medium mb-2">Dies entre Sessions</h4>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold text-green-600">
                {stats.advancedStats.daysBetweenSessions}
              </div>
              <span className="text-sm text-muted-foreground">dies de mitja</span>
            </div>
          </div>

          {/* Autodisciplina */}
          <div className={`p-5 rounded-lg shadow-neo ${stats.advancedStats.autodisciplineLevel.bgColor}`}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium flex items-center gap-2">
                Autodisciplina
                <span className="text-2xl">{stats.advancedStats.autodisciplineLevel.emoji}</span>
              </h4>
              <button
                onClick={() => alert(`COM ES CALCULA L'AUTODISCIPLINA?\n\n` +
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
                className="p-1.5 rounded-full hover:bg-white/50 transition-colors"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Mesura la regularitat amb què assisteixes al gimnàs
            </p>
            
            <div className="flex items-center justify-between mb-3">
              <span className={`font-bold text-lg ${stats.advancedStats.autodisciplineLevel.color}`}>
                {stats.advancedStats.autodisciplineLevel.label}
              </span>
              <span className="text-2xl font-bold">
                {stats.advancedStats.autodiscipline}%
              </span>
            </div>
            
            <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${stats.advancedStats.autodisciplineLevel.barColor}`}
                style={{ width: `${stats.advancedStats.autodisciplineLevel.percentage}%` }}
              />
            </div>
          </div>

          {/* Evolució Recent */}
          <div className="p-4 bg-muted/30 rounded-lg">
            <h4 className="font-medium mb-3">Evolució Recent</h4>
            <p className="text-xs text-muted-foreground mb-3">
              Comparació del darrer mes amb la mitjana dels 3 mesos anteriors
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-700">{stats.advancedStats.improvementRecent.lastMonth}</div>
                <div className="text-sm text-blue-600">Darrer mes</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-700">{stats.advancedStats.improvementRecent.previousQuarterAverage}</div>
                <div className="text-sm text-purple-600">Mitjana 3 mesos ant.</div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tendència:</span>
                <div className="flex items-center gap-2">
                  {stats.advancedStats.improvementRecent.trend === 'up' && (
                    <Badge className="bg-green-500">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      +{stats.advancedStats.improvementRecent.percentageChange}%
                    </Badge>
                  )}
                  {stats.advancedStats.improvementRecent.trend === 'down' && (
                    <Badge className="bg-red-500">
                      <TrendingDown className="w-3 h-3 mr-1" />
                      {stats.advancedStats.improvementRecent.percentageChange}%
                    </Badge>
                  )}
                  {stats.advancedStats.improvementRecent.trend === 'stable' && (
                    <Badge variant="outline">
                      <Minus className="w-3 h-3 mr-1" />
                      Estable
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Sessions i Posició per Programa */}
      {stats.programStats.length > 0 && (
        <div className="p-6 rounded-xl shadow-neo bg-background">
          <h3 className="font-semibold text-lg mb-4 flex items-center">
            <Award className="w-5 h-5 mr-2 text-primary" />
            Sessions i Posició per Programa
          </h3>
          <div className="space-y-3">
            {stats.programStats.map((prog, idx) => {
              const ranking = stats.programRankings[prog.name];
              const percentage = (prog.count / stats.totalSessions) * 100;
              
              return (
                <div key={idx} className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{prog.name}</span>
                    {ranking && ranking.total > 0 ? (
                      <Badge className="text-xs">
                        #{ranking.rank} de {ranking.total}
                      </Badge>
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
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Separator />

      {/* Evolució per Any */}
      <div className="p-6 rounded-xl shadow-neo bg-background">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-primary" />
            Evolució per Any
          </h3>
          {stats.trend === 'up' && (
            <Badge className="bg-green-500">
              <TrendingUp className="w-3 h-3 mr-1" />
              A l'alça
            </Badge>
          )}
          {stats.trend === 'down' && (
            <Badge className="bg-red-500">
              <TrendingDown className="w-3 h-3 mr-1" />
              A la baixa
            </Badge>
          )}
          {stats.trend === 'stable' && (
            <Badge variant="outline">
              <Minus className="w-3 h-3 mr-1" />
              Estable
            </Badge>
          )}
        </div>
        
        {stats.yearlyStats.length > 0 ? (
          <div className="space-y-3">
            {/* Millor i pitjor any */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              {stats.bestYear && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                  <div className="text-xs text-green-600 mb-1">🏆 Millor any</div>
                  <div className="text-xl font-bold text-green-700">{stats.bestYear.year}</div>
                  <div className="text-xs text-green-600">{stats.bestYear.count} sessions</div>
                </div>
              )}
              {stats.worstYear && stats.yearlyStats.length > 1 && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-center">
                  <div className="text-xs text-orange-600 mb-1">📉 Mínim</div>
                  <div className="text-xl font-bold text-orange-700">{stats.worstYear.year}</div>
                  <div className="text-xs text-orange-600">{stats.worstYear.count} sessions</div>
                </div>
              )}
            </div>
            
            {/* Gràfic per any */}
            {stats.yearlyStats.map((yearData) => {
              const maxCount = Math.max(...stats.yearlyStats.map(y => y.count));
              const percentage = (yearData.count / maxCount) * 100;
              const isBest = stats.bestYear?.year === yearData.year;
              const isWorst = stats.worstYear?.year === yearData.year;
              
              return (
                <div key={yearData.year} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <span className={`font-medium min-w-[60px] ${isBest ? 'text-green-700' : isWorst ? 'text-orange-700' : ''}`}>
                    {yearData.year}
                  </span>
                  <div className="flex items-center gap-3 flex-1 ml-3">
                    <div className="h-8 flex-1 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${isBest ? 'bg-green-500' : isWorst ? 'bg-orange-400' : 'bg-primary'}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <Badge variant="outline" className="min-w-[50px] justify-center">
                      {yearData.count}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No hi ha dades d'assistència per any
          </p>
        )}
      </div>

      {/* Sessions per Centre */}
      {Object.keys(stats.centerCount).length > 0 && (
        <>
          <Separator />
          <div className="p-6 rounded-xl shadow-neo bg-background">
            <h3 className="font-semibold text-lg mb-4 flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-primary" />
              Sessions per Centre
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(stats.centerCount).map(([center, count]) => (
                <div key={center} className="p-4 bg-muted/30 rounded-lg text-center">
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-sm text-muted-foreground">{center}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default UserIndex;
