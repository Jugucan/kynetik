import { useState, useEffect } from "react";
import { BarChart3, MapPin, UserCircle } from "lucide-react";
import { useUsers } from "@/hooks/useUsers";
import { useSettings } from "@/hooks/useSettings";
import { useSchedules } from "@/hooks/useSchedules";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserDetailModal } from "@/components/UserDetailModal";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { Session } from "@/utils/statsHelpers";
import { useStatsCalculations } from "@/hooks/useStatsCalculations";
import { StatsCards } from "@/components/stats/StatsCards";
import { TabOverview } from "@/components/stats/TabOverview";
import { TabEvolution } from "@/components/stats/TabEvolution";
import { TabPrograms } from "@/components/stats/TabPrograms";
import { TabUsers } from "@/components/stats/TabUsers";
import { TabCenters } from "@/components/stats/TabCenters";
import { TabWeekdays } from "@/components/stats/TabWeekdays";
import { TabAudit } from "@/components/stats/TabAudit";

const StatsNew = () => {
  const { viewMode } = useAuth();
  const { userProfile } = useUserProfile();
  const { users, loading: usersLoading } = useUsers();
  const { vacations, closuresArbucies, closuresSantHilari, officialHolidays, loading: settingsLoading } = useSettings();
  const { schedules, loading: schedulesLoading } = useSchedules();
  const [centerFilter, setCenterFilter] = useState<string>("all");
  const [inactiveSortOrder, setInactiveSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewingUser, setViewingUser] = useState<any>(null);
  const [customSessions, setCustomSessions] = useState<Record<string, Session[]>>({});

  const loading = usersLoading || settingsLoading || schedulesLoading;

  useEffect(() => {
    const customSessionsDocRef = doc(db, 'settings', 'customSessions');

    const unsubscribe = onSnapshot(customSessionsDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const sessionsMap: Record<string, Session[]> = {};

        Object.entries(data).forEach(([dateKey, sessions]) => {
          if (Array.isArray(sessions)) {
            sessionsMap[dateKey] = sessions as Session[];
          }
        });

        setCustomSessions(sessionsMap);
      } else {
        setCustomSessions({});
      }
    });

    return () => unsubscribe();
  }, []);

  const stats = useStatsCalculations({
    users,
    schedules,
    customSessions,
    centerFilter,
    inactiveSortOrder,
    vacations,
    closuresArbucies,
    closuresSantHilari,
    officialHolidays
  });

  // Trobar les dades de l'usuari actual (quan està en mode usuària)
  const currentUserData = users.find(u => u.email === userProfile?.email);

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6 px-2 sm:px-4 max-w-7xl mx-auto overflow-x-hidden">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 text-primary flex-shrink-0" />
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-bold text-foreground truncate">Les Meves Estadístiques</h1>
            <p className="text-sm text-muted-foreground">
              {viewMode === 'instructor' ? 'Anàlisi del teu rendiment com a instructora' : 'Les teves estadístiques personals'}
            </p>
          </div>
        </div>
        <div className="text-center py-8 text-muted-foreground">Carregant estadístiques...</div>
      </div>
    );
  }

  // VISTA D'USUÀRIA
  if (viewMode === 'user') {
    if (!currentUserData) {
      return (
        <div className="space-y-4 sm:space-y-6 px-2 sm:px-4 max-w-7xl mx-auto overflow-x-hidden">
          <div className="flex items-center gap-3">
            <UserCircle className="w-6 h-6 sm:w-8 sm:h-8 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-xl sm:text-3xl font-bold text-foreground truncate">Les Meves Estadístiques</h1>
              <p className="text-sm text-muted-foreground">Vista d'usuària</p>
            </div>
          </div>
          <div className="p-8 rounded-xl shadow-neo bg-background text-center">
            <p className="text-muted-foreground mb-4">No s'han trobat dades del teu perfil com a usuària.</p>
            <p className="text-sm text-muted-foreground">Assegura't que el teu email ({userProfile?.email}) està registrat a la llista d'usuaris.</p>
          </div>
        </div>
      );
    }

    const userSessions = currentUserData.sessions || [];
    const totalSessions = userSessions.length;
    const recentSessions = userSessions.filter(s => {
      const sessionDate = new Date(s.date);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return sessionDate >= thirtyDaysAgo;
    }).length;

    // Programes únics
    const programsSet = new Set(userSessions.map(s => s.activity));
    const uniquePrograms = Array.from(programsSet);

    // Sessions per mes (últims 12 mesos)
    const monthlyData: { month: string; sessions: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('ca-ES', { month: 'short', year: 'numeric' });
      const yearMonth = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      
      const sessionsCount = userSessions.filter(s => s.date.startsWith(yearMonth)).length;
      monthlyData.push({ month: monthName, sessions: sessionsCount });
    }

    // Sessions per programa
    const programCount: { [program: string]: number } = {};
    userSessions.forEach(s => {
      programCount[s.activity] = (programCount[s.activity] || 0) + 1;
    });
    const programData = Object.entries(programCount)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));

    return (
      <div className="w-full max-w-full overflow-x-hidden">
        <div className="space-y-6 px-4 max-w-7xl mx-auto overflow-x-hidden pb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <UserCircle className="w-6 h-6 sm:w-8 sm:h-8 text-primary flex-shrink-0" />
              <div className="min-w-0">
                <h1 className="text-xl sm:text-3xl font-bold text-foreground truncate">Les Meves Estadístiques</h1>
                <p className="text-sm text-muted-foreground">La teva assistència i progressió</p>
              </div>
            </div>
          </div>

          {/* Targetes principals */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-6 rounded-xl shadow-neo bg-gradient-to-br from-blue-500/10 to-blue-600/5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground">Classes totals</p>
                <BarChart3 className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-3xl font-bold text-foreground">{totalSessions}</p>
            </div>

            <div className="p-6 rounded-xl shadow-neo bg-gradient-to-br from-green-500/10 to-green-600/5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground">Últims 30 dies</p>
                <BarChart3 className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-3xl font-bold text-foreground">{recentSessions}</p>
            </div>

            <div className="p-6 rounded-xl shadow-neo bg-gradient-to-br from-purple-500/10 to-purple-600/5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground">Programes diferents</p>
                <BarChart3 className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-3xl font-bold text-foreground">{uniquePrograms.length}</p>
            </div>

            <div className="p-6 rounded-xl shadow-neo bg-gradient-to-br from-orange-500/10 to-orange-600/5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground">Mitjana mensual</p>
                <BarChart3 className="w-5 h-5 text-orange-500" />
              </div>
              <p className="text-3xl font-bold text-foreground">
                {monthlyData.length > 0 ? (totalSessions / 12).toFixed(1) : 0}
              </p>
            </div>
          </div>

          {/* Gràfica d'evolució */}
          <div className="p-6 rounded-xl shadow-neo bg-background">
            <h3 className="text-lg font-semibold mb-4">Evolució d'assistència (últims 12 mesos)</h3>
            <div className="h-64 flex items-end justify-between gap-2">
              {monthlyData.map((item, idx) => {
                const maxSessions = Math.max(...monthlyData.map(d => d.sessions), 1);
                const height = (item.sessions / maxSessions) * 100;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full bg-primary/20 rounded-t-lg relative group cursor-pointer hover:bg-primary/30 transition-colors" style={{ height: `${height}%`, minHeight: item.sessions > 0 ? '20px' : '4px' }}>
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-background shadow-neo px-2 py-1 rounded text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {item.sessions} classes
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground -rotate-45 origin-top-left whitespace-nowrap">
                      {item.month}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Programes */}
          <div className="p-6 rounded-xl shadow-neo bg-background">
            <h3 className="text-lg font-semibold mb-4">Classes per programa</h3>
            <div className="space-y-3">
              {programData.map((program, idx) => {
                const maxCount = programData[0]?.count || 1;
                const percentage = (program.count / maxCount) * 100;
                return (
                  <div key={idx}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{program.name}</span>
                      <span className="text-sm text-muted-foreground">{program.count} classes</span>
                    </div>
                    <div className="w-full h-2 bg-primary/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Informació adicional */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 rounded-xl shadow-neo bg-background">
              <h3 className="text-lg font-semibold mb-3">Informació general</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Primera classe:</span>
                  <span className="text-sm font-medium">
                    {currentUserData.firstSession ? new Date(currentUserData.firstSession).toLocaleDateString('ca-ES') : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Última classe:</span>
                  <span className="text-sm font-medium">
                    {currentUserData.lastSession ? new Date(currentUserData.lastSession).toLocaleDateString('ca-ES') : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Dies des de última:</span>
                  <span className="text-sm font-medium">
                    {currentUserData.daysSinceLastSession || 0} dies
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-xl shadow-neo bg-background">
              <h3 className="text-lg font-semibold mb-3">Els teus programes</h3>
              <div className="flex flex-wrap gap-2">
                {uniquePrograms.map((program, idx) => (
                  <span key={idx} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                    {program}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // VISTA D'INSTRUCTORA (com abans)
  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <div className="space-y-6 px-4 max-w-7xl mx-auto overflow-x-hidden pb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-xl sm:text-3xl font-bold text-foreground truncate">Les Meves Estadístiques</h1>
              <p className="text-sm text-muted-foreground">Classes reals segons el teu calendari</p>
            </div>
          </div>

          <Select value={centerFilter} onValueChange={setCenterFilter}>
            <SelectTrigger className="w-full sm:w-56 shadow-neo-inset border-0 min-w-0">
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tots els Centres</SelectItem>
              <SelectItem value="arbucies">Arbúcies</SelectItem>
              <SelectItem value="santhilari">Sant Hilari</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <StatsCards
          totalUsers={stats.totalUsers}
          totalSessions={stats.totalSessions}
          avgAttendees={stats.avgAttendees}
          activeUsers={stats.activeUsers}
        />

        <Tabs defaultValue="overview" className="space-y-10 w-full">
          <div className="w-full">
            <TabsList className="grid grid-cols-3 sm:grid-cols-7 w-full gap-1 pb-6">
              <TabsTrigger value="overview" className="text-xs sm:text-sm px-2">Resum</TabsTrigger>
              <TabsTrigger value="evolution" className="text-xs sm:text-sm px-2">Evolució</TabsTrigger>
              <TabsTrigger value="programs" className="text-xs sm:text-sm px-2">Programes</TabsTrigger>
              <TabsTrigger value="users" className="text-xs sm:text-sm px-2">Usuaris</TabsTrigger>
              <TabsTrigger value="centers" className="text-xs sm:text-sm px-2">Centres</TabsTrigger>
              <TabsTrigger value="weekdays" className="text-xs sm:text-sm px-2">Dies setmana</TabsTrigger>
              <TabsTrigger value="audit" className="text-xs sm:text-sm px-2">Auditoria</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview">
            <TabOverview stats={stats} />
          </TabsContent>

          <TabsContent value="evolution">
            <TabEvolution stats={stats} />
          </TabsContent>

          <TabsContent value="programs">
            <TabPrograms stats={stats} onUserClick={setViewingUser} />
          </TabsContent>

          <TabsContent value="users">
            <TabUsers
              stats={stats}
              inactiveSortOrder={inactiveSortOrder}
              setInactiveSortOrder={setInactiveSortOrder}
              onUserClick={setViewingUser}
            />
          </TabsContent>

          <TabsContent value="centers">
            <TabCenters stats={stats} />
          </TabsContent>

          <TabsContent value="weekdays">
            <TabWeekdays stats={stats} />
          </TabsContent>

          <TabsContent value="audit">
            <TabAudit stats={stats} />
          </TabsContent>          
        </Tabs>

        <UserDetailModal
          user={viewingUser}
          isOpen={!!viewingUser}
          onClose={() => setViewingUser(null)}
          onEdit={() => {}}
          allUsers={users}
        />
      </div>
    </div>
  );
};

export default StatsNew;
