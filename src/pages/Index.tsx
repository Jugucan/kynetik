import { useAuth } from "@/contexts/AuthContext";
import { getBenvingut } from "@/utils/genderHelpers";
import UserIndex from "./UserIndex";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { 
  Calendar, 
  Users, 
  TrendingUp, 
  Cake, 
  PartyPopper, 
  ChevronLeft, 
  ChevronRight, 
  Dumbbell, 
  Clock 
} from "lucide-react";

// Components
import { NeoCard } from "@/components/NeoCard";
import { DayInfoModalReadOnly } from "@/components/DayInfoModalReadOnly";

// Hooks
import { useSettings } from "@/hooks/useSettings";
import { useSchedules } from "@/hooks/useSchedules";
import { useUsers } from "@/hooks/useUsers";
import { usePrograms } from "@/hooks/usePrograms";
import { useProgramColors } from "@/hooks/useProgramColors";

// Firebase
import { db } from "@/lib/firebase";

// ============================================================================
// INTERFACES
// ============================================================================

interface Session {
  time: string;
  program: string;
  center?: string;
  isCustom?: boolean;
  isDeleted?: boolean;
  deleteReason?: string;
  addReason?: string;
}

interface Birthday {
  name: string;
  date: string;
  status: "past" | "today" | "upcoming";
  age: number;
  center: string;
  photo: string;
  daysUntil: number;
}

interface NextClass {
  time: string;
  program: string;
  center?: string;
  hoursLeft: number;
  minutesLeft: number;
  isToday: boolean;
  daysUntil?: number;
}

interface CalendarDay {
  day: number | null;
  date: Date | null;
  sessions: Session[];
  holiday: boolean;
  vacation: boolean;
  closure: boolean;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const dateToKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getMonthName = (monthIndex: number): string => {
  const months = [
    "Gen", "Feb", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Oct", "Nov", "Des"
  ];
  return months[monthIndex];
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const Index = () => {
  const { viewMode, userProfile } = useAuth();

  // Si estem en mode usuària, mostrar la vista d'usuària
  if (viewMode === 'user') {
    return <UserIndex />;
  }

  // AQUÍ CONTINUA EL CODI ACTUAL DE LA PÀGINA D'INSTRUCTORA...
  const navigate = useNavigate();

  // ============================================================================
  // STATE
  // ============================================================================

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentViewDate, setCurrentViewDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [customSessions, setCustomSessions] = useState<Record<string, Session[]>>({});
  const [currentTime, setCurrentTime] = useState(new Date());

  // ============================================================================
  // HOOKS
  // ============================================================================

  const { vacations, closuresArbucies, closuresSantHilari, officialHolidays } = useSettings();
  const { schedules } = useSchedules();
  const { users } = useUsers();
  const { getAllActivePrograms, loading: programsLoading } = usePrograms();
  const { getProgramColor, getProgramName } = useProgramColors();

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Actualitzar el rellotge cada segon
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Carregar sessions personalitzades de Firebase
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

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const activePrograms = getAllActivePrograms();

  // ============================================================================
  // CALLBACK FUNCTIONS
  // ============================================================================

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
    
    // Si hi ha sessions personalitzades, retornar-les
    if (customSessions[dateKey]) {
      return customSessions[dateKey];
    }

    // Si és festiu, vacances o tancament, no hi ha sessions
    if (isHoliday(date) || isVacation(date) || isClosure(date)) {
      return [];
    }

    // Obtenir sessions de l'horari
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

  const getNextClass = useCallback((): NextClass | null => {
    const now = currentTime;
    const todayKey = dateToKey(now);
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;

    // Obtenir sessions d'avui
    const todaySessions = getSessionsForDate(now).filter(s => !s.isDeleted);

    // Buscar la següent classe d'avui
    for (const session of todaySessions) {
      const [hours, minutes] = session.time.split(':').map(Number);
      const sessionTimeInMinutes = hours * 60 + minutes;
      
      if (sessionTimeInMinutes > currentTimeInMinutes) {
        const diffMinutes = sessionTimeInMinutes - currentTimeInMinutes;
        const hoursLeft = Math.floor(diffMinutes / 60);
        const minutesLeft = diffMinutes % 60;
        
        return {
          time: session.time,
          program: session.program,
          center: session.center,
          hoursLeft,
          minutesLeft,
          isToday: true
        };
      }
    }

    // Si no hi ha més classes avui, buscar la primera de demà
    let searchDate = new Date(now);
    searchDate.setDate(searchDate.getDate() + 1);

    // Buscar fins a 7 dies endavant
    for (let i = 0; i < 7; i++) {
      const sessions = getSessionsForDate(searchDate).filter(s => !s.isDeleted);
      
      if (sessions.length > 0) {
        // Ordenar per hora i agafar la primera
        const sortedSessions = [...sessions].sort((a, b) => {
          const [aH, aM] = a.time.split(':').map(Number);
          const [bH, bM] = b.time.split(':').map(Number);
          return (aH * 60 + aM) - (bH * 60 + bM);
        });
        
        const nextSession = sortedSessions[0];
        const [hours, minutes] = nextSession.time.split(':').map(Number);
        
        // Calcular temps fins aquesta sessió
        const targetDate = new Date(searchDate);
        targetDate.setHours(hours, minutes, 0, 0);
        
        const diffMs = targetDate.getTime() - now.getTime();
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const hoursLeft = Math.floor(diffMinutes / 60);
        const minutesLeft = diffMinutes % 60;
        
        return {
          time: nextSession.time,
          program: nextSession.program,
          center: nextSession.center,
          hoursLeft,
          minutesLeft,
          isToday: false,
          daysUntil: i + 1
        };
      }
      
      searchDate.setDate(searchDate.getDate() + 1);
    }

    return null;
  }, [currentTime, getSessionsForDate]);

  const getUpcomingBirthdays = useCallback((): Birthday[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentYear = today.getFullYear();
    const birthdays: Birthday[] = [];

    users.forEach(user => {
      const birthdayParts = user.birthday.toString().split('/');
      if (birthdayParts.length !== 3) return;

      const day = parseInt(birthdayParts[0], 10);
      const month = parseInt(birthdayParts[1], 10) - 1;

      const birthdayThisYear = new Date(currentYear, month, day);
      birthdayThisYear.setHours(0, 0, 0, 0);
      
      const diffTime = birthdayThisYear.getTime() - today.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      // Només mostrar aniversaris 3 dies abans i després
      if (diffDays >= -3 && diffDays <= 3) {
        let status: "past" | "today" | "upcoming";
        
        if (diffDays < 0) {
          status = "past";
        } else if (diffDays === 0) {
          status = "today";
        } else {
          status = "upcoming";
        }

        const dateString = `${day} ${getMonthName(month)}`;

        birthdays.push({
          name: user.name,
          date: dateString,
          status: status,
          age: user.age,
          center: user.center,
          photo: user.profileImageUrl || user.avatar || 
                 `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`,
          daysUntil: diffDays
        });
      }
    });

    // Ordenar cronològicament
    birthdays.sort((a, b) => a.daysUntil - b.daysUntil);

    return birthdays;
  }, [users]);

  const getHolidayName = useCallback((date: Date) => {
    const dateKey = dateToKey(date);
    return officialHolidays && officialHolidays[dateKey] ? officialHolidays[dateKey] : "";
  }, [officialHolidays]);

  const getVacationReason = useCallback((date: Date) => {
    const dateKey = dateToKey(date);
    return vacations && vacations[dateKey] ? vacations[dateKey] : "";
  }, [vacations]);

  const getClosureReason = useCallback((date: Date) => {
    const dateKey = dateToKey(date);
    if (closuresArbucies && closuresArbucies[dateKey]) {
      return `Arbúcies: ${closuresArbucies[dateKey]}`;
    }
    if (closuresSantHilari && closuresSantHilari[dateKey]) {
      return `Sant Hilari: ${closuresSantHilari[dateKey]}`;
    }
    return "";
  }, [closuresArbucies, closuresSantHilari]);

  const goToPreviousMonth = useCallback(() => {
    setCurrentViewDate(prevDate => 
      new Date(prevDate.getFullYear(), prevDate.getMonth() - 1, 1)
    );
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentViewDate(prevDate => 
      new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 1)
    );
  }, []);

  const handleDayClick = useCallback((date: Date) => {
    setSelectedDate(date);
    setIsModalOpen(true);
  }, []);

  // ============================================================================
  // MEMOIZED VALUES
  // ============================================================================

  const nextClass = useMemo(() => getNextClass(), [getNextClass]);
  
  const upcomingBirthdays = useMemo(() => getUpcomingBirthdays(), [getUpcomingBirthdays]);

  const currentMonthText = useMemo(() => {
    return currentViewDate.toLocaleDateString("ca-ES", { 
      month: "long", 
      year: "numeric" 
    });
  }, [currentViewDate]);

  const calendarData = useMemo(() => {
    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInCurrentMonth = lastDayOfMonth.getDate();

    const weeks: CalendarDay[][] = [];
    let currentWeek: CalendarDay[] = [];

    for (let day = 1; day <= daysInCurrentMonth; day++) {
      const date = new Date(year, month, day);
      const dayOfWeek = date.getDay();
      
      // Només dies laborables (dilluns a divendres)
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        // Si és dilluns i ja hi ha una setmana, afegir-la
        if (dayOfWeek === 1 && currentWeek.length > 0) {
          while (currentWeek.length < 5) {
            currentWeek.push({
              day: null,
              date: null,
              sessions: [],
              holiday: false,
              vacation: false,
              closure: false
            });
          }
          weeks.push(currentWeek);
          currentWeek = [];
        }
        
        // Afegir espais buits al principi si cal
        if (day === 1 || (day > 1 && currentWeek.length === 0 && dayOfWeek > 1)) {
          const firstDayWeekday = new Date(year, month, 1).getDay();
          
          if (firstDayWeekday >= 1 && firstDayWeekday <= 5) {
            for (let i = 1; i < dayOfWeek; i++) {
              currentWeek.push({
                day: null,
                date: null,
                sessions: [],
                holiday: false,
                vacation: false,
                closure: false
              });
            }
          }
        }
        
        // Afegir el dia actual
        const sessions = getSessionsForDate(date);
        const holiday = isHoliday(date);
        const vacation = isVacation(date);
        const closure = isClosure(date);
        
        currentWeek.push({
          day,
          date,
          sessions,
          holiday,
          vacation,
          closure
        });
        
        // Si és divendres, completar la setmana
        if (dayOfWeek === 5) {
          while (currentWeek.length < 5) {
            currentWeek.push({
              day: null,
              date: null,
              sessions: [],
              holiday: false,
              vacation: false,
              closure: false
            });
          }
          weeks.push(currentWeek);
          currentWeek = [];
        }
      }
    }

    // Afegir l'última setmana si cal
    if (currentWeek.length > 0) {
      while (currentWeek.length < 5) {
        currentWeek.push({
          day: null,
          date: null,
          sessions: [],
          holiday: false,
          vacation: false,
          closure: false
        });
      }
      weeks.push(currentWeek);
    }

    return weeks.flat();
  }, [currentViewDate, getSessionsForDate, isHoliday, isVacation, isClosure]);

  const totalSessionsThisMonth = useMemo(() => {
    return calendarData
      .filter(day => day.date !== null)
      .reduce((total, day) => 
        total + day.sessions.filter(s => !s.isDeleted).length, 0
      );
  }, [calendarData]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">
          {getBenvingut(userProfile?.gender)}! 👋
        </h1>
        <p className="text-muted-foreground">
          Aquí tens un resum de l'activitat actual
        </p>
      </div>

      {/* Temporitzador següent classe */}
      {nextClass && (
        <NeoCard className="bg-gradient-to-r from-primary/10 to-accent/10 border-2 border-primary/30">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-primary/20 flex items-center justify-center shadow-neo-inset">
              <Clock className="w-8 h-8 text-primary animate-pulse" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-1">
                Propera classe
              </p>
              <p className="text-2xl font-bold text-primary mb-1">
                {nextClass.time} - {getProgramName(nextClass.program)}
              </p>
              <p className="text-sm text-muted-foreground">
                {nextClass.center && `${nextClass.center} · `}
                {nextClass.isToday ? (
                  <span className="text-primary font-semibold">
                    Comença en {nextClass.hoursLeft > 0 && `${nextClass.hoursLeft}h `}
                    {nextClass.minutesLeft}min
                  </span>
                ) : (
                  <span className="text-accent font-semibold">
                    {nextClass.daysUntil === 1 
                      ? 'Demà' 
                      : `D'aquí ${nextClass.daysUntil} dies`
                    } a les {nextClass.time}
                  </span>
                )}
              </p>
            </div>
          </div>
        </NeoCard>
      )}

      {/* Estadístiques ràpides */}
      <div className="grid md:grid-cols-3 gap-6">
        <NeoCard>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shadow-neo-inset">
              <Calendar className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Sessions aquest mes
              </p>
              <p className="text-2xl font-bold text-primary">
                {totalSessionsThisMonth}
              </p>
            </div>
          </div>
        </NeoCard>

        <NeoCard>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shadow-neo-inset">
              <Users className="w-6 h-6 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Usuaris actius
              </p>
              <p className="text-2xl font-bold text-accent">
                {users.length}
              </p>
            </div>
          </div>
        </NeoCard>

        <NeoCard>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center shadow-neo-inset">
              <TrendingUp className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Programes actius
              </p>
              <p className="text-2xl font-bold text-destructive">
                {activePrograms.length}
              </p>
            </div>
          </div>
        </NeoCard>
      </div>

      {/* Programes actius */}
      <NeoCard>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">
            Programes i subprogrames actius
          </h2>
          <button
            onClick={() => navigate('/programs')}
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            <Dumbbell className="w-4 h-4" />
            Gestionar programes
          </button>
        </div>
        
        {programsLoading ? (
          <div className="text-center py-8">
            <Dumbbell className="w-8 h-8 text-primary animate-pulse mx-auto mb-2" />
            <p className="text-muted-foreground">Carregant programes...</p>
          </div>
        ) : activePrograms.length === 0 ? (
          <div className="text-center py-8">
            <Dumbbell className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground mb-2">
              No hi ha cap programa o subprograma actiu
            </p>
            <button
              onClick={() => navigate('/programs')}
              className="text-sm text-primary hover:underline"
            >
              Anar a Programes per activar-ne un
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            {activePrograms.map((program) => (
              <div
                key={`${program.programId}-${program.subprogramName || 'main'}`}
                className="p-4 rounded-xl shadow-neo hover:shadow-neo-sm transition-all cursor-pointer"
                onClick={() => navigate('/programs')}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div 
                    className="w-10 h-10 rounded-lg shadow-neo flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: program.programColor }}
                  >
                    {program.programCode}
                  </div>
                  <div>
                    <p className="font-semibold">
                      {program.subprogramName || program.programName}
                    </p>
                    {program.subprogramName && (
                      <p className="text-xs text-muted-foreground">
                        {program.programName}
                      </p>
                    )}
                    {program.isWholeProgram && (
                      <p className="text-xs text-primary">
                        Programa complet
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {program.days} dies actiu
                </p>
              </div>
            ))}
          </div>
        )}
      </NeoCard>

      {/* Aniversaris propers */}
      <NeoCard>
        <div className="flex items-center gap-2 mb-4">
          <Cake className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Aniversaris propers</h2>
        </div>
        
        {upcomingBirthdays.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            No hi ha aniversaris propers (3 dies enrere/endavant)
          </p>
        ) : (
          <div className="space-y-2">
            {upcomingBirthdays.map((birthday, index) => (
              <div
                key={index}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                  birthday.status === "past" 
                    ? "shadow-neo-inset opacity-50" 
                    : birthday.status === "today"
                    ? "shadow-neo bg-gradient-to-r from-primary/20 to-accent/20 border-2 border-primary"
                    : "shadow-neo-inset"
                }`}
              >
                <img 
                  src={birthday.photo} 
                  alt={birthday.name} 
                  className="w-12 h-12 rounded-full shadow-neo object-cover"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${
                      birthday.status === "past" ? "text-muted-foreground" : ""
                    }`}>
                      {birthday.name}
                    </span>
                    {birthday.status === "today" && (
                      <PartyPopper className="w-5 h-5 text-primary animate-bounce" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {birthday.age} anys · {birthday.center}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-sm ${
                    birthday.status === "today" 
                      ? "text-primary font-bold" 
                      : "text-muted-foreground"
                  }`}>
                    {birthday.date}
                  </span>
                  {birthday.status === "past" && birthday.daysUntil < 0 && (
                    <p className="text-xs text-muted-foreground">
                      Fa {Math.abs(birthday.daysUntil)} {
                        Math.abs(birthday.daysUntil) === 1 ? 'dia' : 'dies'
                      }
                    </p>
                  )}
                  {birthday.status === "upcoming" && birthday.daysUntil > 0 && (
                    <p className="text-xs text-muted-foreground">
                      En {birthday.daysUntil} {
                        birthday.daysUntil === 1 ? 'dia' : 'dies'
                      }
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </NeoCard>

      {/* Calendari de dies laborables */}
      <NeoCard>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold capitalize">
            Dies laborables - {currentMonthText}
          </h2>
          <div className="flex space-x-2">
            <button 
              onClick={goToPreviousMonth} 
              className="p-2 rounded-full shadow-neo hover:shadow-neo-sm transition-all" 
              title="Mes anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button 
              onClick={goToNextMonth} 
              className="p-2 rounded-full shadow-neo hover:shadow-neo-sm transition-all" 
              title="Mes següent"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {/* Dies de la setmana */}
        <div className="grid grid-cols-5 gap-3 mb-4">
          {["Dilluns", "Dimarts", "Dimecres", "Dijous", "Divendres"].map((day) => (
            <div 
              key={day} 
              className="text-center font-semibold text-sm text-muted-foreground py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Dies del mes */}
        <div className="grid grid-cols-5 gap-3">
          {calendarData.map((dayInfo, idx) => {
            if (!dayInfo.day || !dayInfo.date) {
              return <div key={idx} className="aspect-square" />;
            }
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const isToday = dayInfo.date.getTime() === today.getTime();
            
            const dateKey = dateToKey(dayInfo.date);
            const hasModifications = customSessions[dateKey] && 
                                     customSessions[dateKey].length > 0;
            
            return (
              <button
                key={idx}
                onClick={() => handleDayClick(dayInfo.date!)}
                className={`aspect-square rounded-xl shadow-neo hover:shadow-neo-sm transition-all flex flex-col items-center justify-start font-medium p-2 ${
                  isToday
                    ? "bg-primary/20 border-2 border-primary ring-2 ring-primary/50"
                    : hasModifications
                    ? "border-2 border-green-500"
                    : dayInfo.holiday
                    ? "bg-yellow-500/20 border-2 border-yellow-500/50"
                    : dayInfo.vacation
                    ? "bg-blue-500/20 border-2 border-blue-500/50"
                    : dayInfo.closure
                    ? "bg-gray-500/20 border-2 border-gray-500/50"
                    : ""
                }`}
                title={
                  isToday
                    ? "Avui"
                    : hasModifications
                    ? "Dia amb modificacions a l'horari"
                    : dayInfo.holiday 
                    ? `Festiu: ${getHolidayName(dayInfo.date)}`
                    : dayInfo.vacation
                    ? `Vacances: ${getVacationReason(dayInfo.date)}`
                    : dayInfo.closure
                    ? `Tancament: ${getClosureReason(dayInfo.date)}`
                    : ""
                }
              >
                <span className={`text-sm mb-1 ${
                  isToday ? 'font-bold text-primary' : ''
                }`}>
                  {dayInfo.day}
                </span>
                
                {isToday && (
                  <span className="text-[8px] text-primary font-bold mb-1">
                    AVUI
                  </span>
                )}
                {dayInfo.holiday && (
                  <span className="text-[8px] text-yellow-700 font-bold mb-1">
                    FESTIU
                  </span>
                )}
                {dayInfo.vacation && (
                  <span className="text-[8px] text-blue-700 font-bold mb-1">
                    VAC
                  </span>
                )}
                {dayInfo.closure && (
                  <span className="text-[8px] text-gray-700 font-bold mb-1">
                    TANCAT
                  </span>
                )}
                
                {dayInfo.sessions.length > 0 && (
                  <div className="flex gap-0.5 flex-wrap justify-center w-full">
                    {dayInfo.sessions.map((session, sessionIdx) => {
                      const programColor = getProgramColor(session.program);
                      return (
                        <div
                          key={sessionIdx}
                          className={`w-7 h-7 rounded ${
                            session.isDeleted ? 
                            'bg-gray-300 opacity-50' : 
                            ''
                          } text-white text-[10px] flex items-center justify-center font-bold shadow-sm`}
                          style={!session.isDeleted ? 
                            { backgroundColor: programColor } : 
                            {}
                          }
                          title={
                            session.isDeleted 
                              ? `CANCEL·LADA: ${session.time} - ${getProgramName(session.program)}` 
                              : `${session.time} - ${getProgramName(session.program)}`
                          }
                        >
                          {session.program}
                        </div>
                      );
                    })}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Llegenda */}
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground border-t pt-3 mt-4">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-primary/50 ring-2 ring-primary/30" />
            <span>Dia actual</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded border-2 border-green-500" />
            <span>Modificat</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-yellow-500/50" />
            <span>Festiu</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-blue-500/50" />
            <span>Vacances</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-gray-500/50" />
            <span>Tancament</span>
          </div>
          {activePrograms.map((program) => (
            <div key={program.programCode} className="flex items-center gap-1">
              <div 
                className="w-3 h-3 rounded" 
                style={{ backgroundColor: program.programColor }}
              />
              <span>{program.programCode}</span>
            </div>
          ))}
        </div>
      </NeoCard>

      {/* Modal d'informació del dia */}
      <DayInfoModalReadOnly
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        date={selectedDate}
        sessions={selectedDate ? getSessionsForDate(selectedDate) : []}
        holidayName={selectedDate ? getHolidayName(selectedDate) : undefined}
        vacationReason={selectedDate ? getVacationReason(selectedDate) : undefined}
        closureReason={selectedDate ? getClosureReason(selectedDate) : undefined}
      />
    </div>
  );
};

export default Index;
