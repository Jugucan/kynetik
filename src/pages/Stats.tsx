import { useMemo, useState, useEffect, useCallback } from "react";
import { NeoCard } from "@/components/NeoCard";
import { BarChart3, Users, Calendar, TrendingUp, Award, MapPin, Target, UserCheck, UserX, Clock, ArrowUpDown, Percent, TrendingDown, Info } from "lucide-react";
import { useUsers } from "@/hooks/useUsers";
import { useSettings } from "@/hooks/useSettings";
import { useSchedules } from "@/hooks/useSchedules";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { UserDetailModal } from "@/components/UserDetailModal";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

interface Session {
  time: string;
  program: string;
  center?: string;
  isCustom?: boolean;
  isDeleted?: boolean;
  deleteReason?: string;
  addReason?: string;
}

const dateToKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Funció per normalitzar noms de centres
const normalizeCenterName = (center: string | undefined): string => {
  if (!center) return 'na';
  
  // Convertim a minúscules i creem un map manual per als accents
  let normalized = center.toLowerCase().replace(/\s+/g, '');
  
  // Reemplacem accents manualment
  const accentsMap: { [key: string]: string } = {
    'á': 'a', 'à': 'a', 'ä': 'a', 'â': 'a',
    'é': 'e', 'è': 'e', 'ë': 'e', 'ê': 'e',
    'í': 'i', 'ì': 'i', 'ï': 'i', 'î': 'i',
    'ó': 'o', 'ò': 'o', 'ö': 'o', 'ô': 'o',
    'ú': 'u', 'ù': 'u', 'ü': 'u', 'û': 'u',
    'ç': 'c', 'ñ': 'n'
  };
  
  return normalized.split('').map(char => accentsMap[char] || char).join('');
};

// Funció per comparar centres
const centersMatch = (center1: string | undefined, center2: string | undefined): boolean => {
  return normalizeCenterName(center1) === normalizeCenterName(center2);
};

// Component per mostrar info
const InfoButton = ({ title, description }: { title: string; description: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="ml-2 p-1 rounded-full hover:bg-primary/10 transition-colors"
        aria-label="Més informació"
      >
        <Info className="w-4 h-4 text-primary" />
      </button>
      
      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription className="text-base pt-2">
              {description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Button onClick={() => setIsOpen(false)}>Entesos!</Button>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

const Stats = () => {
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

  const getScheduleForDate = useCallback((date: Date) => {
    const dateStr = dateToKey(date);
    return schedules.find(schedule => {
      const startDate = schedule.startDate;
      const endDate = schedule.endDate || '9999-12-31';
      return dateStr >= startDate && dateStr <= endDate;
    });
  }, [schedules]);

  const isHoliday = useCallback((date: Date) => {
    const dateKey = dateToKey(date);
    return officialHolidays && officialHolidays.hasOwnProperty(dateKey);
  }, [officialHolidays]);

  const isVacation = useCallback((date: Date) => {
    const dateKey = dateToKey(date);
    return vacations && vacations.hasOwnProperty(dateKey);
  }, [vacations]);
  
  const isClosure = useCallback((date: Date) => {
    const dateKey = dateToKey(date);
    return (closuresArbucies && closuresArbucies.hasOwnProperty(dateKey)) || 
           (closuresSantHilari && closuresSantHilari.hasOwnProperty(dateKey));
  }, [closuresArbucies, closuresSantHilari]);

  const getSessionsForDate = useCallback((date: Date): Session[] => {
    const dateKey = dateToKey(date);
    
    if (customSessions[dateKey]) {
      return customSessions[dateKey];
    }
    
    if (isHoliday(date) || isVacation(date) || isClosure(date)) {
      return [];
    }
    
    const scheduleForDate = getScheduleForDate(date);
    
    if (scheduleForDate) {
      const dayOfWeek = date.getDay();
      const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek;
      const scheduleSessions = scheduleForDate.sessions[adjustedDay] || [];
      
      return scheduleSessions.map(s => ({
        time: s.time,
        program: s.program,
        center: s.center,
        isCustom: false,
        isDeleted: false,
      }));
    }
    
    return [];
  }, [customSessions, getScheduleForDate, isHoliday, isVacation, isClosure]);

  const stats = useMemo(() => {
    // Normalitzem el filtre de centre
    const normalizedCenterFilter = centerFilter === "all" ? "all" : normalizeCenterName(centerFilter);
    
    console.log("🔍 DEBUG - Center Filter:", centerFilter);
    console.log("🔍 DEBUG - Normalized Filter:", normalizedCenterFilter);
    
    const allRealClasses: Array<{
      date: string;
      activity: string;
      time: string;
      center: string;
    }> = [];

    const oldestScheduleDate = schedules.length > 0 
      ? schedules.reduce((oldest, schedule) => {
          return schedule.startDate < oldest ? schedule.startDate : oldest;
        }, schedules[0].startDate)
      : '2020-01-01';

    const startDate = new Date(oldestScheduleDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const currentDate = new Date(startDate);
    while (currentDate <= today) {
      const sessions = getSessionsForDate(currentDate);
      const activeSessions = sessions.filter(s => !s.isDeleted);
      
      activeSessions.forEach(session => {
        allRealClasses.push({
          date: dateToKey(currentDate),
          activity: session.program,
          time: session.time,
          center: session.center || 'N/A'
        });
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const allUserAttendances = users.flatMap(user => 
      (user.sessions || []).map(s => ({
        ...s,
        userName: user.name
      }))
    );

    const filteredClasses = centerFilter === "all"
      ? allRealClasses
      : allRealClasses.filter(c => centersMatch(c.center, centerFilter));

    const filteredAttendances = centerFilter === "all"
      ? allUserAttendances
      : allUserAttendances.filter(a => centersMatch(a.center, centerFilter));

    // Usuaris únics que han vingut al centre filtrat
    const totalUsers = centerFilter === "all"
      ? users.length
      : users.filter(user =>
          (user.sessions || []).some(s => centersMatch(s.center, centerFilter))
        ).length;
    
    const totalSessions = filteredClasses.length;
    const totalAttendances = filteredAttendances.length;
    
    const sessionsByYear: { [year: string]: number } = {};
    filteredClasses.forEach(classItem => {
      const year = classItem.date.split('-')[0];
      sessionsByYear[year] = (sessionsByYear[year] || 0) + 1;
    });
    
    const yearlyData = Object.entries(sessionsByYear)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([year, count]) => ({ year, count }));
    
    const attendancesByYear: { [year: string]: number } = {};
    filteredAttendances.forEach(attendance => {
      const year = attendance.date.split('-')[0];
      attendancesByYear[year] = (attendancesByYear[year] || 0) + 1;
    });
    
    const yearlyAttendanceData = Object.entries(attendancesByYear)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([year, count]) => ({ year, count }));
    
    const now = new Date();
    const monthlyData: { month: string; classes: number; attendances: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('ca-ES', { month: 'short', year: 'numeric' });
      const yearMonth = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      
      const classesCount = filteredClasses.filter(c => c.date.startsWith(yearMonth)).length;
      const attendancesCount = filteredAttendances.filter(a => a.date.startsWith(yearMonth)).length;
      
      monthlyData.push({ month: monthName, classes: classesCount, attendances: attendancesCount });
    }
    
    const currentMonthSessions = monthlyData[monthlyData.length - 1]?.classes || 0;
    const previousMonthSessions = monthlyData[monthlyData.length - 2]?.classes || 0;
    const monthlyGrowth = previousMonthSessions > 0 
      ? (((currentMonthSessions - previousMonthSessions) / previousMonthSessions) * 100).toFixed(1)
      : 0;
    
    const uniqueClassesMap = new Map<string, number>();
    filteredAttendances.forEach(attendance => {
      const key = `${attendance.date}-${attendance.time}-${attendance.activity}-${attendance.center}`;
      uniqueClassesMap.set(key, (uniqueClassesMap.get(key) || 0) + 1);
    });

    const totalAttendeesInClasses = Array.from(uniqueClassesMap.values()).reduce((sum, count) => sum + count, 0);
    const avgAttendees = uniqueClassesMap.size > 0
      ? (totalAttendeesInClasses / uniqueClassesMap.size).toFixed(1)
      : 0;
    
    // CORRECCIÓ: Definim filteredUsers ABANS d'utilitzar-lo
    const filteredUsers = centerFilter === "all"
      ? users
      : users.map(user => ({
          ...user,
          totalSessions: (user.sessions || []).filter(s => centersMatch(s.center, centerFilter)).length,
          // Mantenim l'últim session global per calcular usuaris actius
          lastSession: user.lastSession
        })).filter(user => user.totalSessions > 0); // Només usuaris que han vingut a aquest centre
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activeUsers = filteredUsers.filter(user => {
      if (!user.lastSession) return false;
      const lastSession = new Date(user.lastSession);
      return lastSession >= thirtyDaysAgo;
    }).length;
    
    const recurrentUsersFiltered = filteredUsers.filter(u => (u.totalSessions || 0) > 1).length;
    const retentionRate = totalUsers > 0 ? ((recurrentUsersFiltered / totalUsers) * 100).toFixed(1) : 0;
    
    const newUsersByYear: { [year: string]: number } = {};
    users.forEach(user => {
      if (!user.firstSession) return;
      const year = new Date(user.firstSession).getFullYear().toString();
      newUsersByYear[year] = (newUsersByYear[year] || 0) + 1;
    });
    
    const programCount: { [program: string]: number } = {};
    filteredClasses.forEach(classItem => {
      programCount[classItem.activity] = (programCount[classItem.activity] || 0) + 1;
    });
    const programData = Object.entries(programCount)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
    
    const centerCount: { [center: string]: number } = {};
    allRealClasses.forEach(classItem => {
      centerCount[classItem.center] = (centerCount[classItem.center] || 0) + 1;
    });
    
    const dayCount: { [day: string]: number } = {};
    const dayNames = ['Diumenge', 'Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte'];
    filteredClasses.forEach(classItem => {
      const [year, month, day] = classItem.date.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      const dayName = dayNames[date.getDay()];
      dayCount[dayName] = (dayCount[dayName] || 0) + 1;
    });
    const mostPopularDay = Object.entries(dayCount).sort((a, b) => b[1] - a[1])[0];
    
    const timeSlotCount: { morning: number; afternoon: number; evening: number } = { morning: 0, afternoon: 0, evening: 0 };
    filteredClasses.forEach(classItem => {
      const hour = parseInt(classItem.time.split(':')[0]);
      if (hour < 12) timeSlotCount.morning++;
      else if (hour < 18) timeSlotCount.afternoon++;
      else timeSlotCount.evening++;
    });
    const preferredTimeSlot = Object.entries(timeSlotCount).sort((a, b) => b[1] - a[1])[0];
    const timeSlotNames = { morning: 'Matí', afternoon: 'Tarda', evening: 'Vespre' };
    
    const topUsers = [...filteredUsers]
      .sort((a, b) => (b.totalSessions || 0) - (a.totalSessions || 0))
      .slice(0, 10);
    
    const inactiveUsers = users
      .filter(user => (user.daysSinceLastSession || 0) > 60)
      .sort((a, b) => {
        const diffA = a.daysSinceLastSession || 0;
        const diffB = b.daysSinceLastSession || 0;
        return inactiveSortOrder === 'desc' ? diffB - diffA : diffA - diffB;
      });
    
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
      totalAttendances,
      avgAttendees,
      activeUsers,
      yearlyData,
      yearlyAttendanceData,
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
      recurrentUsers: recurrentUsersFiltered
    };
  }, [users, centerFilter, inactiveSortOrder, schedules, customSessions, getSessionsForDate]);

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Les Meves Estadístiques</h1>
            <p className="text-sm text-muted-foreground">Classes reals segons el teu calendari</p>
          </div>
        </div>
        
        <Select value={centerFilter} onValueChange={setCenterFilter}>
          <SelectTrigger className="w-full sm:w-[200px] shadow-neo">
            <MapPin className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tots els Centres</SelectItem>
            <SelectItem value="arbucies">Arbúcies</SelectItem>
            <SelectItem value="santhilari">Sant Hilari</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <NeoCard className="p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600" />
              <div>
                <p className="text-2xl sm:text-3xl font-bold text-blue-700">{stats.totalUsers}</p>
                <p className="text-xs sm:text-sm text-blue-600">Usuaris únics</p>
              </div>
            </div>
            <InfoButton 
              title="Usuaris únics" 
              description="Total de persones diferents que han vingut a les teves classes des del començament."
            />
          </div>
        </NeoCard>

        <NeoCard className="p-4 sm:p-6 bg-gradient-to-br from-green-50 to-green-100">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <UserCheck className="w-8 h-8 sm:w-10 sm:h-10 text-green-600" />
              <div>
                <p className="text-2xl sm:text-3xl font-bold text-green-700">{stats.activeUsers}</p>
                <p className="text-xs sm:text-sm text-green-600">Usuaris actius</p>
              </div>
            </div>
            <InfoButton 
              title="Usuaris actius" 
              description="Usuaris que han vingut a una classe en els últims 30 dies."
            />
          </div>
        </NeoCard>

        <NeoCard className="p-4 sm:p-6 bg-gradient-to-br from-purple-50 to-purple-100">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 sm:w-10 sm:h-10 text-purple-600" />
              <div>
                <p className="text-2xl sm:text-3xl font-bold text-purple-700">{stats.totalSessions}</p>
                <p className="text-xs sm:text-sm text-purple-600">Classes impartides</p>
              </div>
            </div>
            <InfoButton 
              title="Classes impartides" 
              description="Total de sessions que has donat segons el teu calendari de classes."
            />
          </div>
        </NeoCard>

        <NeoCard className="p-4 sm:p-6 bg-gradient-to-br from-orange-50 to-orange-100">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 sm:w-10 sm:h-10 text-orange-600" />
              <div>
                <p className="text-2xl sm:text-3xl font-bold text-orange-700">{stats.totalAttendances}</p>
                <p className="text-xs sm:text-sm text-orange-600">Assistències totals</p>
              </div>
            </div>
            <InfoButton 
              title="Assistències totals" 
              description="Suma de totes les vegades que els usuaris han vingut a les teves classes."
            />
          </div>
        </NeoCard>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <NeoCard className="p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-2">
            <Target className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Mitjana assistents</h3>
            <InfoButton 
              title="Mitjana d'assistents" 
              description="Nombre mitjà de persones que vénen a cada classe."
            />
          </div>
          <p className="text-3xl font-bold text-primary">{stats.avgAttendees}</p>
          <p className="text-sm text-muted-foreground">persones per classe</p>
        </NeoCard>

        <NeoCard className="p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-2">
            <Percent className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Taxa de retenció</h3>
            <InfoButton 
              title="Taxa de retenció" 
              description="Percentatge d'usuaris que han vingut més d'una vegada. Indica la fidelització dels teus clients."
            />
          </div>
          <p className="text-3xl font-bold text-primary">{stats.retentionRate}%</p>
          <p className="text-sm text-muted-foreground">{stats.recurrentUsers} usuaris recurrents</p>
        </NeoCard>

        <NeoCard className="p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-2">
            <Award className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Dia més popular</h3>
            <InfoButton 
              title="Dia més popular" 
              description="El dia de la setmana amb més classes programades."
            />
          </div>
          <p className="text-3xl font-bold text-primary">{stats.mostPopularDay?.[0] || 'N/A'}</p>
          <p className="text-sm text-muted-foreground">{stats.mostPopularDay?.[1] || 0} classes</p>
        </NeoCard>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="users">Usuaris</TabsTrigger>
          <TabsTrigger value="programs">Programes</TabsTrigger>
          <TabsTrigger value="trends">Tendències</TabsTrigger>
          <TabsTrigger value="inactive">Inactius</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <NeoCard className="p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <Award className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Top 10 Usuaris més actius</h3>
              <InfoButton 
                title="Usuaris més actius" 
                description="Els 10 usuaris que han vingut més vegades a les teves classes."
              />
            </div>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {stats.topUsers.map((user, index) => (
                  <div 
                    key={user.id}
                    className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg hover:bg-secondary/70 transition-colors cursor-pointer"
                    onClick={() => setViewingUser(user)}
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant={index < 3 ? "default" : "secondary"} className="w-8 h-8 flex items-center justify-center">
                        {index + 1}
                      </Badge>
                      <div>
                        <p className="font-medium text-foreground">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">{user.totalSessions || 0}</p>
                      <p className="text-xs text-muted-foreground">sessions</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </NeoCard>
        </TabsContent>

        <TabsContent value="programs" className="space-y-4">
          <NeoCard className="p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Distribució per programes</h3>
              <InfoButton 
                title="Programes" 
                description="Nombre de classes impartides de cada programa."
              />
            </div>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {stats.programData.map((program, index) => (
                  <div key={program.name} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="w-8 h-8 flex items-center justify-center">
                        {index + 1}
                      </Badge>
                      <p className="font-medium text-foreground">{program.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">{program.count}</p>
                      <p className="text-xs text-muted-foreground">classes</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </NeoCard>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <NeoCard className="p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                <Calendar className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Sessions per any</h3>
                <InfoButton 
                  title="Sessions anuals" 
                  description="Evolució del nombre de classes impartides cada any."
                />
              </div>
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {stats.yearlyData.map(year => (
                    <div key={year.year} className="flex items-center justify-between p-2 bg-secondary/30 rounded">
                      <span className="font-medium text-foreground">{year.year}</span>
                      <span className="text-primary font-bold">{year.count}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </NeoCard>

            <NeoCard className="p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Assistències per any</h3>
                <InfoButton 
                  title="Assistències anuals" 
                  description="Evolució del nombre total d'assistències cada any."
                />
              </div>
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {stats.yearlyAttendanceData.map(year => (
                    <div key={year.year} className="flex items-center justify-between p-2 bg-secondary/30 rounded">
                      <span className="font-medium text-foreground">{year.year}</span>
                      <span className="text-primary font-bold">{year.count}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </NeoCard>
          </div>

          <NeoCard className="p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Tendència últims 12 mesos</h3>
              <InfoButton 
                title="Tendència mensual" 
                description="Evolució de classes i assistències durant l'últim any."
              />
            </div>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {stats.monthlyData.map(month => (
                  <div key={month.month} className="p-3 bg-secondary/30 rounded">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-foreground">{month.month}</span>
                      <div className="flex gap-4">
                        <span className="text-sm text-muted-foreground">
                          Classes: <span className="text-primary font-bold">{month.classes}</span>
                        </span>
                        <span className="text-sm text-muted-foreground">
                          Assist.: <span className="text-primary font-bold">{month.attendances}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </NeoCard>
        </TabsContent>

        <TabsContent value="inactive" className="space-y-4">
          <NeoCard className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <UserX className="w-5 h-5 text-orange-600" />
                <h3 className="font-semibold text-foreground">Usuaris inactius (+60 dies)</h3>
                <InfoButton 
                  title="Usuaris inactius" 
                  description="Usuaris que no han vingut a cap classe en els últims 60 dies. Potser necessiten una motivació extra!"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInactiveSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                className="gap-2"
              >
                <ArrowUpDown className="w-4 h-4" />
                {inactiveSortOrder === 'desc' ? 'Més dies' : 'Menys dies'}
              </Button>
            </div>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {stats.inactiveUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <UserCheck className="w-12 h-12 mx-auto mb-3 text-green-500" />
                    <p>Fantàstic! No tens usuaris inactius 🎉</p>
                  </div>
                ) : (
                  stats.inactiveUsers.map((user) => (
                    <div 
                      key={user.id}
                      className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-950/30 transition-colors cursor-pointer border border-orange-200 dark:border-orange-900"
                      onClick={() => setViewingUser(user)}
                    >
                      <div>
                        <p className="font-medium text-foreground">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-orange-600">{user.daysSinceLastSession || 0}</p>
                        <p className="text-xs text-muted-foreground">dies sense venir</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </NeoCard>
        </TabsContent>
      </Tabs>

      {viewingUser && (
        <UserDetailModal
          user={viewingUser}
          isOpen={!!viewingUser}
          onClose={() => setViewingUser(null)}
        />
      )}
    </div>
  );
};

export default Stats;
