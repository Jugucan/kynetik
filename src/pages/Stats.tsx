import { useMemo, useState } from "react";
import { NeoCard } from "@/components/NeoCard";
import { BarChart3, Users, Calendar, TrendingUp, Award, MapPin, Target, UserCheck, UserX, Clock, ArrowUpDown, Percent, TrendingDown } from "lucide-react";
import { useUsers } from "@/hooks/useUsers";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { UserDetailModal } from "@/components/UserDetailModal";

const Stats = () => {
  const { users, loading } = useUsers();
  const [centerFilter, setCenterFilter] = useState<string>("all");
  const [inactiveSortOrder, setInactiveSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewingUser, setViewingUser] = useState<any>(null);

  // 📊 CÀLCUL DE TOTES LES ESTADÍSTIQUES
  const stats = useMemo(() => {
    // Filtrem sessions per centre si cal
    const filteredUsers = centerFilter === "all" 
      ? users 
      : users.map(user => ({
          ...user,
          sessions: (user.sessions || []).filter(s => s.center === centerFilter),
          totalSessions: (user.sessions || []).filter(s => s.center === centerFilter).length
        }));
    
    const allSessions = filteredUsers.flatMap(user => user.sessions || []);
    const totalUsers = users.length; // Total sense filtrar
    const totalSessions = allSessions.length;
    
    // Sessions per any
    const sessionsByYear: { [year: string]: number } = {};
    allSessions.forEach(session => {
      const year = new Date(session.date).getFullYear().toString();
      sessionsByYear[year] = (sessionsByYear[year] || 0) + 1;
    });
    
    const yearlyData = Object.entries(sessionsByYear)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([year, count]) => ({ year, count }));
    
    // Sessions per mes (últims 12 mesos)
    const now = new Date();
    const monthlyData: { month: string; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('ca-ES', { month: 'short', year: 'numeric' });
      const count = allSessions.filter(s => {
        const sessionDate = new Date(s.date);
        return sessionDate.getFullYear() === date.getFullYear() && 
               sessionDate.getMonth() === date.getMonth();
      }).length;
      monthlyData.push({ month: monthName, count });
    }
    
    // Creixement mensual (comparació mes actual vs anterior)
    const currentMonthSessions = monthlyData[monthlyData.length - 1]?.count || 0;
    const previousMonthSessions = monthlyData[monthlyData.length - 2]?.count || 0;
    const monthlyGrowth = previousMonthSessions > 0 
      ? (((currentMonthSessions - previousMonthSessions) / previousMonthSessions) * 100).toFixed(1)
      : 0;
    
    // Assistents per sessió (mitjana)
    const usersPerSession: { [key: string]: number } = {};
    allSessions.forEach(session => {
      const key = `${session.date}-${session.activity}-${session.time}`;
      usersPerSession[key] = (usersPerSession[key] || 0) + 1;
    });
    const avgAttendees = Object.keys(usersPerSession).length > 0
      ? (totalSessions / Object.keys(usersPerSession).length).toFixed(1)
      : 0;
    
    // Usuaris actius (últims 30 dies)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activeUsers = users.filter(user => {
      if (!user.lastSession) return false;
      const lastSession = new Date(user.lastSession);
      return lastSession >= thirtyDaysAgo;
    }).length;
    
    // Taxa de retenció (usuaris amb més d'1 sessió)
    const recurrentUsers = filteredUsers.filter(u => (u.totalSessions || 0) > 1).length;
    const retentionRate = totalUsers > 0 ? ((recurrentUsers / totalUsers) * 100).toFixed(1) : 0;
    
    // Nous usuaris per any
    const newUsersByYear: { [year: string]: number } = {};
    users.forEach(user => {
      if (!user.firstSession) return;
      const year = new Date(user.firstSession).getFullYear().toString();
      newUsersByYear[year] = (newUsersByYear[year] || 0) + 1;
    });
    
    // Sessions per programa
    const programCount: { [program: string]: number } = {};
    allSessions.forEach(session => {
      programCount[session.activity] = (programCount[session.activity] || 0) + 1;
    });
    const programData = Object.entries(programCount)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
    
    // Sessions per centre
    const centerCount: { [center: string]: number } = {};
    allSessions.forEach(session => {
      centerCount[session.center] = (centerCount[session.center] || 0) + 1;
    });
    
    // Dia de la setmana més popular
    const dayCount: { [day: string]: number } = {};
    const dayNames = ['Diumenge', 'Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte'];
    allSessions.forEach(session => {
      const day = dayNames[new Date(session.date).getDay()];
      dayCount[day] = (dayCount[day] || 0) + 1;
    });
    const mostPopularDay = Object.entries(dayCount).sort((a, b) => b[1] - a[1])[0];
    
    // Franja horària preferida
    const timeSlotCount: { morning: number; afternoon: number; evening: number } = { morning: 0, afternoon: 0, evening: 0 };
    allSessions.forEach(session => {
      const hour = parseInt(session.time.split(':')[0]);
      if (hour < 12) timeSlotCount.morning++;
      else if (hour < 18) timeSlotCount.afternoon++;
      else timeSlotCount.evening++;
    });
    const preferredTimeSlot = Object.entries(timeSlotCount).sort((a, b) => b[1] - a[1])[0];
    const timeSlotNames = { morning: 'Matí', afternoon: 'Tarda', evening: 'Vespre' };
    
    // Usuaris més fidels (top 10)
    const topUsers = [...filteredUsers]
      .sort((a, b) => (b.totalSessions || 0) - (a.totalSessions || 0))
      .slice(0, 10);
    
    // Usuaris inactius (més de 60 dies sense venir)
    const inactiveUsers = users
      .filter(user => (user.daysSinceLastSession || 0) > 60)
      .sort((a, b) => {
        const diffA = a.daysSinceLastSession || 0;
        const diffB = b.daysSinceLastSession || 0;
        return inactiveSortOrder === 'desc' ? diffB - diffA : diffA - diffB;
      });
    
    // Tendència
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (yearlyData.length >= 2) {
      const lastYear = yearlyData[yearlyData.length - 1].count;
      const previousYear = yearlyData[yearlyData.length - 2].count;
      const diff = lastYear - previousYear;
      if (diff > 0) trend = 'up';
      else if (diff < 0) trend = 'down';
    }
    
    return {
      totalUsers,
      totalSessions,
      avgAttendees,
      activeUsers,
      yearlyData,
      monthlyData,
      monthlyGrowth,
      newUsersByYear,
      programData,
      centerCount,
      topUsers,
      inactiveUsers,
      trend,
      retentionRate,
      mostPopularDay,
      preferredTimeSlot: preferredTimeSlot ? timeSlotNames[preferredTimeSlot[0] as keyof typeof timeSlotNames] : 'N/A',
      recurrentUsers
    };
  }, [users, centerFilter, inactiveSortOrder]);

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Les Meves Estadístiques</h1>
            <p className="text-sm text-muted-foreground">Anàlisi del teu rendiment com a instructora</p>
          </div>
        </div>
        <div className="text-center py-8 text-muted-foreground">Carregant estadístiques...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      {/* Capçalera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Les Meves Estadístiques</h1>
            <p className="text-sm text-muted-foreground">Anàlisi del teu rendiment com a instructora</p>
          </div>
        </div>
        
        {/* Filtre per centre */}
        <Select value={centerFilter} onValueChange={setCenterFilter}>
          <SelectTrigger className="w-full sm:w-[200px] shadow-neo">
            <MapPin className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tots els Centres</SelectItem>
            <SelectItem value="Arbúcies">Arbúcies</SelectItem>
            <SelectItem value="Sant Hilari">Sant Hilari</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Resum General */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <NeoCard className="p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600" />
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-blue-700">{stats.totalUsers}</p>
              <p className="text-xs sm:text-sm text-blue-600">Usuaris únics</p>
            </div>
          </div>
        </NeoCard>

        <NeoCard className="p-4 sm:p-6 bg-gradient-to-br from-green-50 to-green-100">
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8 sm:w-10 sm:h-10 text-green-600" />
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-green-700">{stats.totalSessions}</p>
              <p className="text-xs sm:text-sm text-green-600">Sessions totals</p>
            </div>
          </div>
        </NeoCard>

        <NeoCard className="p-4 sm:p-6 bg-gradient-to-br from-purple-50 to-purple-100">
          <div className="flex items-center gap-3">
            <Target className="w-8 h-8 sm:w-10 sm:h-10 text-purple-600" />
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-purple-700">{stats.avgAttendees}</p>
              <p className="text-xs sm:text-sm text-purple-600">Assistents/sessió</p>
            </div>
          </div>
        </NeoCard>

        <NeoCard className="p-4 sm:p-6 bg-gradient-to-br from-orange-50 to-orange-100">
          <div className="flex items-center gap-3">
            <UserCheck className="w-8 h-8 sm:w-10 sm:h-10 text-orange-600" />
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-orange-700">{stats.activeUsers}</p>
              <p className="text-xs sm:text-sm text-orange-600">Actius (30d)</p>
            </div>
          </div>
        </NeoCard>
      </div>

      {/* Estadístiques addicionals */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <NeoCard className="p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-1">
            <Percent className="w-4 h-4 text-blue-600" />
            <p className="text-xs text-muted-foreground">Taxa de retenció</p>
          </div>
          <p className="text-xl sm:text-2xl font-bold">{stats.retentionRate}%</p>
        </NeoCard>

        <NeoCard className="p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <p className="text-xs text-muted-foreground">Creixement mensual</p>
          </div>
          <p className="text-xl sm:text-2xl font-bold">{stats.monthlyGrowth}%</p>
        </NeoCard>

        <NeoCard className="p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-purple-600" />
            <p className="text-xs text-muted-foreground">Dia més popular</p>
          </div>
          <p className="text-base sm:text-lg font-bold">{stats.mostPopularDay?.[0] || 'N/A'}</p>
        </NeoCard>

        <NeoCard className="p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-orange-600" />
            <p className="text-xs text-muted-foreground">Franja preferida</p>
          </div>
          <p className="text-base sm:text-lg font-bold">{stats.preferredTimeSlot}</p>
        </NeoCard>
      </div>

      {/* Pestanyes */}
      <Tabs defaultValue="evolution" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="evolution" className="text-xs sm:text-sm">Evolució</TabsTrigger>
          <TabsTrigger value="programs" className="text-xs sm:text-sm">Programes</TabsTrigger>
          <TabsTrigger value="users" className="text-xs sm:text-sm">Usuaris</TabsTrigger>
          <TabsTrigger value="centers" className="text-xs sm:text-sm">Centres</TabsTrigger>
        </TabsList>

        {/* TAB 1: EVOLUCIÓ */}
        <TabsContent value="evolution" className="space-y-4">
          <NeoCard className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg sm:text-xl font-semibold">Tendència General</h3>
              {stats.trend === 'up' && (
                <Badge className="bg-green-500">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  Creixement
                </Badge>
              )}
              {stats.trend === 'down' && (
                <Badge className="bg-red-500">
                  <TrendingDown className="w-4 h-4 mr-1" />
                  Decreixement
                </Badge>
              )}
              {stats.trend === 'stable' && (
                <Badge variant="outline">Estable</Badge>
              )}
            </div>
            <Separator className="mb-4" />
            
            <div className="space-y-3">
              <h4 className="font-medium text-sm sm:text-base">Sessions per Any</h4>
              {stats.yearlyData.map((yearData) => {
                const maxCount = Math.max(...stats.yearlyData.map(y => y.count));
                const percentage = (yearData.count / maxCount) * 100;
                
                return (
                  <div key={yearData.year} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{yearData.year}</span>
                      <Badge variant="outline">{yearData.count} sessions</Badge>
                    </div>
                    <div className="h-8 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all flex items-center justify-end pr-2"
                        style={{ width: `${percentage}%` }}
                      >
                        {percentage > 20 && (
                          <span className="text-xs text-white font-medium">
                            {yearData.count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </NeoCard>

          <NeoCard className="p-4 sm:p-6">
            <h3 className="text-lg sm:text-xl font-semibold mb-4">Últims 12 Mesos</h3>
            <Separator className="mb-4" />
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {stats.monthlyData.map((month) => {
                  const maxCount = Math.max(...stats.monthlyData.map(m => m.count));
                  const percentage = maxCount > 0 ? (month.count / maxCount) * 100 : 0;
                  
                  return (
                    <div key={month.month} className="flex items-center gap-3">
                      <span className="text-xs sm:text-sm font-medium min-w-[80px]">{month.month}</span>
                      <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <Badge variant="outline" className="text-xs">{month.count}</Badge>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </NeoCard>
        </TabsContent>

        {/* TAB 2: PROGRAMES */}
        <TabsContent value="programs" className="space-y-4">
          <NeoCard className="p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-primary" />
              <h3 className="text-lg sm:text-xl font-semibold">Sessions per Programa</h3>
            </div>
            <Separator className="mb-4" />
            <div className="space-y-3">
              {stats.programData.map((prog) => {
                const percentage = (prog.count / stats.totalSessions) * 100;
                
                return (
                  <div key={prog.name} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{prog.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs">
                          {percentage.toFixed(1)}%
                        </span>
                        <Badge variant="outline">{prog.count}</Badge>
                      </div>
                    </div>
                    <div className="h-6 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </NeoCard>
        </TabsContent>

        {/* TAB 3: USUARIS */}
        <TabsContent value="users" className="space-y-4">
          <NeoCard className="p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-yellow-600" />
              <h3 className="text-lg sm:text-xl font-semibold">Top 10 Usuaris Més Fidels</h3>
            </div>
            <Separator className="mb-4" />
            <div className="space-y-2">
              {stats.topUsers.map((user, idx) => (
                <div 
                  key={user.id} 
                  onClick={() => setViewingUser(user)}
                  className="flex items-center justify-between p-2 sm:p-3 bg-muted/30 rounded cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Badge className={idx < 3 ? 'bg-yellow-500' : 'bg-muted'}>
                      #{idx + 1}
                    </Badge>
                    <span className="font-medium text-sm sm:text-base truncate">{user.name}</span>
                  </div>
                  <Badge variant="outline">{user.totalSessions || 0} sessions</Badge>
                </div>
              ))}
            </div>
          </NeoCard>

          <NeoCard className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <UserX className="w-5 h-5 text-red-600" />
                <h3 className="text-lg sm:text-xl font-semibold">Usuaris Inactius (+60 dies)</h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInactiveSortOrder(inactiveSortOrder === 'desc' ? 'asc' : 'desc')}
                className="gap-2"
              >
                <ArrowUpDown className="w-4 h-4" />
                {inactiveSortOrder === 'desc' ? 'Més dies' : 'Menys dies'}
              </Button>
            </div>
            <Separator className="mb-4" />
            {stats.inactiveUsers.length > 0 ? (
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {stats.inactiveUsers.map((user) => (
                    <div 
                      key={user.id} 
                      onClick={() => setViewingUser(user)}
                      className="flex items-center justify-between p-2 bg-red-50 rounded cursor-pointer hover:bg-red-100 transition-colors"
                    >
                      <span className="font-medium text-sm truncate">{user.name}</span>
                      <Badge variant="outline" className="bg-white">
                        <Clock className="w-3 h-3 mr-1" />
                        {user.daysSinceLastSession} dies
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                🎉 No hi ha usuaris inactius!
              </p>
            )}
          </NeoCard>
        </TabsContent>

        {/* TAB 4: CENTRES */}
        <TabsContent value="centers" className="space-y-4">
          <NeoCard className="p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-primary" />
              <h3 className="text-lg sm:text-xl font-semibold">Distribució per Centre</h3>
            </div>
            <Separator className="mb-4" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(stats.centerCount).map(([center, count]) => {
                const percentage = (count / stats.totalSessions) * 100;
                
                return (
                  <div key={center} className="p-4 sm:p-6 bg-muted/30 rounded-lg text-center">
                    <p className="text-3xl sm:text-4xl font-bold mb-2">{count}</p>
                    <p className="text-sm font-medium mb-3">{center}</p>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${center === 'Arbúcies' ? 'bg-blue-500' : 'bg-green-500'}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {percentage.toFixed(1)}% del total
                    </p>
                  </div>
                );
              })}
            </div>
          </NeoCard>
        </TabsContent>
      </Tabs>

      {/* Modal de detall d'usuari */}
      <UserDetailModal
        user={viewingUser}
        isOpen={!!viewingUser}
        onClose={() => setViewingUser(null)}
        onEdit={() => {}}
      />
    </div>
  );
};

export default Stats;
