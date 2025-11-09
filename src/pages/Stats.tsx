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

    // DEBUG: Comprovem allRealClasses
    const sampleClasses = allRealClasses.slice(0, 5).map(c => ({
      date: c.date,
      center: c.center,
      normalized: normalizeCenterName(c.center)
    }));

    const allUserAttendances = users.flatMap(user => 
      (user.sessions || []).map(s => ({
        ...s,
        userName: user.name
      }))
    );

    const filteredClasses = centerFilter === "all" 
      ? allRealClasses 
      : allRealClasses.filter(c => c.center === centerFilter);

    const filteredAttendances = centerFilter === "all"
      ? allUserAttendances
      : allUserAttendances.filter(a => a.center === centerFilter);

    // Usuaris únics que han vingut al centre filtrat
    const totalUsers = centerFilter === "all"
      ? users.length
      : users.filter(user => 
          (user.sessions || []).some(s => s.center === centerFilter)
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
    allUserAttendances.forEach(attendance => {
      const key = `${attendance.date}-${attendance.time}-${attendance.activity}-${attendance.center}`;
      uniqueClassesMap.set(key, (uniqueClassesMap.get(key) || 0) + 1);
    });
    
    const totalAttendeesInClasses = Array.from(uniqueClassesMap.values()).reduce((sum, count) => sum + count, 0);
    const avgAttendees = uniqueClassesMap.size > 0
      ? (totalAttendeesInClasses / uniqueClassesMap.size).toFixed(1)
      : 0;
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activeUsers = users.filter(user => {
      if (!user.lastSession) return false;
      const lastSession = new Date(user.lastSession);
      return lastSession >= thirtyDaysAgo;
    }).length;
    
    const recurrentUsers = users.filter(u => (u.totalSessions || 0) > 1).length;
    const retentionRate = totalUsers > 0 ? ((recurrentUsers / totalUsers) * 100).toFixed(1) : 0;
    
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
    
    const filteredUsers = centerFilter === "all" 
      ? users 
      : users.map(user => ({
          ...user,
          totalSessions: (user.sessions || []).filter(s => s.center === centerFilter).length
        }));
    
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
      recurrentUsers
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
      {/* DEBUG INFO - TEMPORAL */}
      {centerFilter !== "all" && (
        <div className="p-4 bg-yellow-100 border-2 border-yellow-500 rounded">
          <p className="font-bold">🔍 DEBUG INFO:</p>
          <p>Centre seleccionat: {centerFilter}</p>
          <p>Centre normalitzat: {normalizeCenterName(centerFilter)}</p>
          <p>Total classes: {stats.totalSessions}</p>
          <p>Total assistències: {stats.totalAttendances}</p>
        </div>
      )}
      
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
              <Calendar className="w-8 h-8 sm:w-10 sm:h-10 text-green-600" />
              <div>
                <p className="text-2xl sm:text-3xl font-bold text-green-700">{stats.totalSessions}</p>
                <p className="text-xs sm:text-sm text-green-600">Classes fetes</p>
              </div>
            </div>
            <InfoButton 
              title="Classes fetes" 
              description="Total de classes que has impartit segons el teu calendari. No inclou dies festius, vacances o tancaments dels gimnasos."
            />
          </div>
        </NeoCard>

        <NeoCard className="p-4 sm:p-6 bg-gradient-to-br from-purple-50 to-purple-100">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Target className="w-8 h-8 sm:w-10 sm:h-10 text-purple-600" />
              <div>
                <p className="text-2xl sm:text-3xl font-bold text-purple-700">{stats.avgAttendees}</p>
                <p className="text-xs sm:text-sm text-purple-600">Assistents/classe</p>
              </div>
            </div>
            <InfoButton 
              title="Assistents per classe" 
              description="Mitjana de persones que assisteixen a cada una de les teves classes. Es calcula dividint el total d'assistències entre el total de classes."
            />
          </div>
        </NeoCard>

        <NeoCard className="p-4 sm:p-6 bg-gradient-to-br from-orange-50 to-orange-100">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <UserCheck className="w-8 h-8 sm:w-10 sm:h-10 text-orange-600" />
              <div>
                <p className="text-2xl sm:text-3xl font-bold text-orange-700">{stats.activeUsers}</p>
                <p className="text-xs sm:text-sm text-orange-600">Actius (30d)</p>
              </div>
            </div>
            <InfoButton 
              title="Usuaris actius" 
              description="Nombre d'usuaris que han assistit almenys una vegada a les teves classes en els últims 30 dies."
            />
          </div>
        </NeoCard>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <NeoCard className="p-3 sm:p-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-blue-600" />
              <p className="text-xs text-muted-foreground">Taxa de retenció</p>
            </div>
            <InfoButton 
              title="Taxa de retenció" 
              description={`Percentatge d'usuaris que han vingut més d'una vegada a les teves classes. Indica la fidelitat dels teus alumnes.\n\n📊 ${stats.recurrentUsers} de ${stats.totalUsers} usuaris han repetit.`}
            />
          </div>
          <p className="text-xl sm:text-2xl font-bold">{stats.retentionRate}%</p>
        </NeoCard>

        <NeoCard className="p-3 sm:p-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <p className="text-xs text-muted-foreground">Creixement mensual</p>
            </div>
            <InfoButton 
              title="Creixement mensual" 
              description="Comparació del nombre de classes entre el mes actual i l'anterior. Un valor positiu indica que has fet més classes aquest mes que l'anterior."
            />
          </div>
          <p className="text-xl sm:text-2xl font-bold">{stats.monthlyGrowth}%</p>
        </NeoCard>

        <NeoCard className="p-3 sm:p-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-600" />
              <p className="text-xs text-muted-foreground">Dia més popular</p>
            </div>
            <InfoButton 
              title="Dia més popular" 
              description="El dia de la setmana en què fas més classes habitualment."
            />
          </div>
          <p className="text-base sm:text-lg font-bold">{stats.mostPopularDay?.[0] || 'N/A'}</p>
        </NeoCard>

        <NeoCard className="p-3 sm:p-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-600" />
              <p className="text-xs text-muted-foreground">Franja preferida</p>
            </div>
            <InfoButton 
              title="Franja horària preferida" 
              description="La franja horària on fas més classes:\n• Matí: abans de les 12h\n• Tarda: de 12h a 18h\n• Vespre: després de les 18h"
            />
          </div>
          <p className="text-base sm:text-lg font-bold">{stats.preferredTimeSlot}</p>
        </NeoCard>
      </div>

      <Tabs defaultValue="evolution" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="evolution" className="text-xs sm:text-sm">Evolució</TabsTrigger>
          <TabsTrigger value="programs" className="text-xs sm:text-sm">Programes</TabsTrigger>
          <TabsTrigger value="users" className="text-xs sm:text-sm">Usuaris</TabsTrigger>
          <TabsTrigger value="centers" className="text-xs sm:text-sm">Centres</TabsTrigger>
        </TabsList>

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
              <h4 className="font-medium text-sm sm:text-base">Classes Realitzades per Any</h4>
              {stats.yearlyData.map((yearData) => {
                const maxCount = Math.max(...stats.yearlyData.map(y => y.count));
                const percentage = (yearData.count / maxCount) * 100;
                
                return (
                  <div key={yearData.year} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{yearData.year}</span>
                      <Badge variant="outline">{yearData.count} classes</Badge>
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
            <h3 className="text-lg sm:text-xl font-semibold mb-4">Total Assistències per Any</h3>
            <Separator className="mb-4" />
            <div className="space-y-3">
              {stats.yearlyAttendanceData.map((yearData) => {
                const maxCount = Math.max(...stats.yearlyAttendanceData.map(y => y.count));
                const percentage = (yearData.count / maxCount) * 100;
                
                return (
                  <div key={yearData.year} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{yearData.year}</span>
                      <Badge variant="outline" className="bg-blue-50">{yearData.count} assistències</Badge>
                    </div>
                    <div className="h-8 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 transition-all flex items-center justify-end pr-2"
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
            <ScrollArea className="h-80">
              <div className="space-y-4">
                {stats.monthlyData.map((month) => {
                  const maxClasses = Math.max(...stats.monthlyData.map(m => m.classes));
                  const maxAttendances = Math.max(...stats.monthlyData.map(m => m.attendances));
                  const classesPercentage = maxClasses > 0 ? (month.classes / maxClasses) * 100 : 0;
                  const attendancesPercentage = maxAttendances > 0 ? (month.attendances / maxAttendances) * 100 : 0;
                  
                  return (
                    <div key={month.month} className="space-y-2">
                      <span className="text-xs sm:text-sm font-medium block">{month.month}</span>
                      
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground min-w-[70px]">Classes:</span>
                        <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500 transition-all"
                            style={{ width: `${classesPercentage}%` }}
                          />
                        </div>
                        <Badge variant="outline" className="text-xs min-w-[45px] justify-center">{month.classes}</Badge>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground min-w-[70px]">Assistències:</span>
                        <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 transition-all"
                            style={{ width: `${attendancesPercentage}%` }}
                          />
                        </div>
                        <Badge variant="outline" className="text-xs bg-blue-50 min-w-[45px] justify-center">{month.attendances}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
            <div className="flex gap-4 text-xs text-muted-foreground border-t pt-3 mt-3">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-green-500"></div>
                <span>Classes fetes</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-blue-500"></div>
                <span>Total assistències</span>
              </div>
            </div>
          </NeoCard>
        </TabsContent>

        <TabsContent value="programs" className="space-y-4">
          <NeoCard className="p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-primary" />
              <h3 className="text-lg sm:text-xl font-semibold">Classes per Programa</h3>
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

        <TabsContent value="centers" className="space-y-4">
          <NeoCard className="p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-primary" />
              <h3 className="text-lg sm:text-xl font-semibold">Distribució per Centre</h3>
            </div>
            <Separator className="mb-4" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(stats.centerCount).map(([center, count]) => {
                const totalAllCenters = Object.values(stats.centerCount).reduce((a, b) => a + b, 0);
                const percentage = (count / totalAllCenters) * 100;
                
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
