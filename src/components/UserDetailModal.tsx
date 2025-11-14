import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  User, Phone, Mail, MapPin, Calendar, Award, TrendingUp, 
  Activity, Clock, ChevronDown, Edit, Trophy, Target, Zap
} from "lucide-react";
import { useMemo, useState } from "react";
import { 
  calculateAdvancedStats, 
  calculateUserRanking, 
  calculateProgramRanking,
  type UserRanking
} from "@/utils/advancedStats";

export interface UserSession {
  date: string;
  activity: string;
  time: string;
  center: string;
}

export interface User {
  id: string;
  name: string;
  age: number;
  phone: string;
  email: string;
  address: string;
  center: string;
  preferredPrograms: string[];
  notes: string;
  sessions: UserSession[];
}

interface UserDetailModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (user: User) => void;
  allUsers: User[];
}

export function UserDetailModal({ user, isOpen, onClose, onEdit, allUsers }: UserDetailModalProps) {
  const [isMonthlyFrequencyOpen, setIsMonthlyFrequencyOpen] = useState(false);

  const stats = useMemo(() => {
    if (!user) return null;

    const sessions = user.sessions || [];
    const programCounts: { [key: string]: number } = {};
    const centerCounts: { [key: string]: number } = {};
    const yearCounts: { [key: string]: number } = {};

    sessions.forEach((session) => {
      programCounts[session.activity] = (programCounts[session.activity] || 0) + 1;
      centerCounts[session.center] = (centerCounts[session.center] || 0) + 1;
      const year = new Date(session.date).getFullYear().toString();
      yearCounts[year] = (yearCounts[year] || 0) + 1;
    });

    const sortedYears = Object.entries(yearCounts)
      .sort(([a], [b]) => parseInt(b) - parseInt(a))
      .map(([year, count]) => ({ year, count }));

    const bestYear = sortedYears.length > 0 
      ? sortedYears.reduce((max, current) => current.count > max.count ? current : max)
      : null;

    const worstYear = sortedYears.length > 0
      ? sortedYears.reduce((min, current) => current.count < min.count ? current : min)
      : null;

    const lastSession = sessions.length > 0
      ? sessions.reduce((latest, current) =>
          new Date(current.date) > new Date(latest.date) ? current : latest
        )
      : null;

    const daysSinceLastSession = lastSession
      ? Math.floor((new Date().getTime() - new Date(lastSession.date).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // Calculate rankings
    const generalRanking = calculateUserRanking(allUsers, user, 'totalSessions');
    const autodisciplineRanking = calculateUserRanking(allUsers, user, 'autodiscipline');
    
    // Calculate program rankings for all programs the user participates in
    const programRankings: { [program: string]: UserRanking } = {};
    Object.keys(programCounts).forEach(program => {
      programRankings[program] = calculateProgramRanking(allUsers, user, program);
    });

    // Calculate advanced stats
    const advancedStats = calculateAdvancedStats(user);

    return {
      totalSessions: sessions.length,
      programCounts,
      centerCounts,
      yearlyTrend: sortedYears,
      bestYear,
      worstYear,
      daysSinceLastSession,
      generalRanking,
      autodisciplineRanking,
      programRankings,
      advancedStats
    };
  }, [user, allUsers]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ca-ES', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  const sessionsByDate = useMemo(() => {
    if (!user) return {};
    const grouped: { [date: string]: UserSession[] } = {};
    user.sessions.forEach((session) => {
      if (!grouped[session.date]) {
        grouped[session.date] = [];
      }
      grouped[session.date].push(session);
    });
    return grouped;
  }, [user]);

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Fixed Header */}
        <div className="flex-shrink-0 border-b pb-4">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} />
                  <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div>
                  <DialogTitle className="text-2xl">{user.name}</DialogTitle>
                  <div className="flex items-center gap-2 text-muted-foreground mt-1">
                    <span>{user.age} anys</span>
                    <span>•</span>
                    <span>{user.center}</span>
                  </div>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => onEdit(user)}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            </div>
          </DialogHeader>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-3 sticky top-0 bg-background z-10">
              <TabsTrigger value="info">Info</TabsTrigger>
              <TabsTrigger value="stats">Estadístiques</TabsTrigger>
              <TabsTrigger value="history">Historial</TabsTrigger>
            </TabsList>

            <div className="p-6">
              <TabsContent value="info" className="space-y-6 mt-0">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Informació de Contacte
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{user.phone}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{user.email}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{user.address}</span>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Programes Preferits
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {user.preferredPrograms.map((program) => (
                      <Badge key={program} variant="secondary">
                        {program}
                      </Badge>
                    ))}
                  </div>
                </Card>

                {user.notes && (
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Notes</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">{user.notes}</p>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="stats" className="space-y-6 mt-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="h-5 w-5 text-primary" />
                      <span className="text-sm text-muted-foreground">Sessions Totals</span>
                    </div>
                    <p className="text-3xl font-bold">{stats?.totalSessions || 0}</p>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Award className="h-5 w-5 text-primary" />
                      <span className="text-sm text-muted-foreground">Programes</span>
                    </div>
                    <p className="text-3xl font-bold">{Object.keys(stats?.programCounts || {}).length}</p>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-5 w-5 text-primary" />
                      <span className="text-sm text-muted-foreground">Dies des de l'última</span>
                    </div>
                    <p className="text-3xl font-bold">
                      {stats?.daysSinceLastSession !== null ? stats?.daysSinceLastSession : 'N/A'}
                    </p>
                  </Card>
                </div>

                {/* Rankings Section */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    Rànquings
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Rànquing General</span>
                        <Badge variant="secondary">
                          #{stats?.generalRanking.rank} de {stats?.generalRanking.total}
                        </Badge>
                      </div>
                      <Progress value={stats?.generalRanking.percentile} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">
                        Top {100 - (stats?.generalRanking.percentile || 0)}%
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Advanced Stats Section */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-500" />
                    Estadístiques Avançades
                  </h3>
                  
                  <div className="space-y-6">
                    {/* Monthly Frequency */}
                    <Collapsible open={isMonthlyFrequencyOpen} onOpenChange={setIsMonthlyFrequencyOpen}>
                      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-5 w-5" />
                          <span className="font-medium">Freqüència Mensual</span>
                        </div>
                        <ChevronDown className={`h-5 w-5 transition-transform ${isMonthlyFrequencyOpen ? 'rotate-180' : ''}`} />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-3 space-y-2">
                        {stats?.advancedStats.monthlyFrequency.map(({ month, count }) => (
                          <div key={month} className="flex items-center justify-between p-2 bg-background rounded">
                            <span className="text-sm">{month}</span>
                            <Badge variant="outline">{count} sessions</Badge>
                          </div>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Days Between Sessions */}
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-5 w-5" />
                        <span className="font-medium">Dies entre Sessions</span>
                      </div>
                      <p className="text-2xl font-bold">
                        {stats?.advancedStats.daysBetweenSessions || 'N/A'} dies
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Mitjana de temps entre assistències
                      </p>
                    </div>

                    {/* Autodiscipline Score */}
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <Zap className="h-5 w-5" />
                        <span className="font-medium">Autodisciplina</span>
                      </div>
                      
                      {stats?.advancedStats.autodiscipline !== undefined && stats.advancedStats.autodiscipline > 0 ? (
                        <>
                          <div className="flex items-center gap-3 mb-3">
                            <span className="text-3xl">{stats.advancedStats.autodisciplineLevel.emoji}</span>
                            <div>
                              <p className={`text-xl font-bold ${stats.advancedStats.autodisciplineLevel.color}`}>
                                {stats.advancedStats.autodisciplineLevel.label}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {stats.advancedStats.autodisciplineLevel.percentage}% de puntuació
                              </p>
                            </div>
                          </div>
                          <Progress 
                            value={stats.advancedStats.autodisciplineLevel.percentage} 
                            className="h-3"
                          />
                        </>
                      ) : (
                        <p className="text-muted-foreground">N/A</p>
                      )}
                    </div>

                    {/* Improvement Recent */}
                    {stats?.advancedStats.improvementRecent && (
                      <div className="p-4 bg-muted rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className={`h-5 w-5 ${
                            stats.advancedStats.improvementRecent.trend === 'improving' ? 'text-green-500' :
                            stats.advancedStats.improvementRecent.trend === 'declining' ? 'text-red-500' :
                            'text-blue-500'
                          }`} />
                          <span className="font-medium">Tendència Recent</span>
                        </div>
                        <p className="text-lg font-semibold">
                          {stats.advancedStats.improvementRecent.message}
                        </p>
                      </div>
                    )}

                    {/* Program Rankings */}
                    {stats?.programRankings && Object.keys(stats.programRankings).length > 0 && (
                      <div className="space-y-3">
                        <h4 className="font-medium flex items-center gap-2">
                          <Trophy className="h-4 w-4" />
                          Posició per Programa
                        </h4>
                        {Object.entries(stats.programRankings).map(([program, ranking]) => (
                          <div key={program} className="p-3 bg-background rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">{program}</span>
                              <Badge variant="secondary">
                                {ranking.rank > 0 ? `#${ranking.rank} de ${ranking.total}` : 'N/A'}
                              </Badge>
                            </div>
                            {ranking.rank > 0 && (
                              <>
                                <Progress value={ranking.percentile} className="h-2" />
                                <p className="text-xs text-muted-foreground mt-1">
                                  Top {100 - ranking.percentile}% al teu centre
                                </p>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>

                {/* Yearly Evolution */}
                {stats?.yearlyTrend && stats.yearlyTrend.length > 0 && (
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Evolució Anual
                    </h3>
                    <div className="space-y-3">
                      {stats.yearlyTrend.map(({ year, count }) => (
                        <div key={year} className="flex items-center justify-between">
                          <span className="font-medium">{year}</span>
                          <div className="flex items-center gap-3">
                            <div className="w-32 bg-muted rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full transition-all"
                                style={{
                                  width: `${(count / Math.max(...stats.yearlyTrend.map(y => y.count))) * 100}%`
                                }}
                              />
                            </div>
                            <span className="text-sm font-semibold w-12 text-right">{count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {stats.bestYear && stats.worstYear && (
                      <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Millor any</p>
                          <p className="text-lg font-bold text-green-600">
                            {stats.bestYear.year} ({stats.bestYear.count})
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Pitjor any</p>
                          <p className="text-lg font-bold text-red-600">
                            {stats.worstYear.year} ({stats.worstYear.count})
                          </p>
                        </div>
                      </div>
                    )}
                  </Card>
                )}

                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Sessions per Programa</h3>
                  <div className="space-y-3">
                    {Object.entries(stats?.programCounts || {})
                      .sort(([, a], [, b]) => b - a)
                      .map(([program, count]) => (
                        <div key={program} className="flex items-center justify-between">
                          <span className="font-medium">{program}</span>
                          <div className="flex items-center gap-3">
                            <div className="w-32 bg-muted rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full transition-all"
                                style={{
                                  width: `${(count / Math.max(...Object.values(stats?.programCounts || {}))) * 100}%`
                                }}
                              />
                            </div>
                            <span className="text-sm font-semibold w-12 text-right">{count}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Sessions per Centre</h3>
                  <div className="space-y-3">
                    {Object.entries(stats?.centerCounts || {})
                      .sort(([, a], [, b]) => b - a)
                      .map(([center, count]) => (
                        <div key={center} className="flex items-center justify-between">
                          <span className="font-medium">{center}</span>
                          <div className="flex items-center gap-3">
                            <div className="w-32 bg-muted rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full transition-all"
                                style={{
                                  width: `${(count / Math.max(...Object.values(stats?.centerCounts || {}))) * 100}%`
                                }}
                              />
                            </div>
                            <span className="text-sm font-semibold w-12 text-right">{count}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="history" className="mt-0">
                <div className="space-y-4">
                  {Object.entries(sessionsByDate)
                    .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
                    .map(([date, sessions]) => (
                      <Card key={date} className="p-4">
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {formatDate(date)}
                        </h4>
                        <div className="space-y-2">
                          {sessions.map((session, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 bg-muted rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <Activity className="h-4 w-4 text-primary" />
                                <span className="font-medium">{session.activity}</span>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {session.time}
                                </span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {session.center}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    ))}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
