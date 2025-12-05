import { useState, useEffect } from "react";
import { BarChart3, MapPin } from "lucide-react";
import { useUsers } from "@/hooks/useUsers";
import { useSettings } from "@/hooks/useSettings";
import { useSchedules } from "@/hooks/useSchedules";
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

const StatsNew = () => {
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

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6 px-2 sm:px-4 max-w-7xl mx-auto overflow-x-hidden">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 text-primary flex-shrink-0" />
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-bold text-foreground truncate">Les Meves Estadístiques</h1>
            <p className="text-sm text-muted-foreground">Anàlisi del teu rendiment com a instructora</p>
          </div>
        </div>
        <div className="text-center py-8 text-muted-foreground">Carregant estadístiques...</div>
      </div>
    );
  }

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
            <TabsList className="grid grid-cols-3 sm:grid-cols-6 w-full gap-1 pb-6">
              <TabsTrigger value="overview" className="text-xs sm:text-sm px-2">Resum</TabsTrigger>
              <TabsTrigger value="evolution" className="text-xs sm:text-sm px-2">Evolució</TabsTrigger>
              <TabsTrigger value="programs" className="text-xs sm:text-sm px-2">Programes</TabsTrigger>
              <TabsTrigger value="users" className="text-xs sm:text-sm px-2">Usuaris</TabsTrigger>
              <TabsTrigger value="centers" className="text-xs sm:text-sm px-2">Centres</TabsTrigger>
              <TabsTrigger value="weekdays" className="text-xs sm:text-sm px-2">Dies setmana</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview">
            <TabOverview stats={stats} />
          </TabsContent>

          <TabsContent value="evolution">
            <TabEvolution stats={stats} />
          </TabsContent>

          <TabsContent value="programs">
            <TabPrograms stats={stats} />
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
