import { useState, useEffect, useCallback, useMemo } from "react";
import { NeoCard } from "@/components/NeoCard";
import { DayInfoModalReadOnly } from "@/components/DayInfoModalReadOnly";
import { Calendar, Users, TrendingUp, Cake, PartyPopper, ChevronLeft, ChevronRight } from "lucide-react";
import { programColors } from "@/lib/programColors";
import { useSettings } from "@/hooks/useSettings";
import { useSchedules } from "@/hooks/useSchedules";
import { useUsers } from "@/hooks/useUsers";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

// Definició de Session
interface Session {
  time: string;
  program: string;
  center?: string;
  isCustom?: boolean;
  isDeleted?: boolean;
  deleteReason?: string;
  addReason?: string;
}

// Interfície per als aniversaris
interface Birthday {
  name: string;
  date: string;
  status: "past" | "today" | "upcoming";
  age: number;
  center: string;
  photo: string;
}

const dateToKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const Index = () => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentViewDate, setCurrentViewDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [customSessions, setCustomSessions] = useState<Record<string, Session[]>>({});

  // 🎉 Carregar dades des de Firebase
  const { vacations, closuresArbucies, closuresSantHilari, officialHolidays } = useSettings();
  const { schedules } = useSchedules();
  const { users } = useUsers();

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

  const activePrograms = [
    { name: "BodyPump 120", code: "BP", days: 45, color: "bg-red-500" },
    { name: "BodyCombat 95", code: "BC", days: 30, color: "bg-orange-500" },
    { name: "BodyBalance 105", code: "BB", days: 60, color: "bg-green-500" },
  ];

  // FUNCIÓ PER CALCULAR ELS ANIVERSARIS REALS DELS USUARIS
  const getUpcomingBirthdays = (): Birthday[] => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const birthdays: Birthday[] = [];

    users.forEach(user => {
      const birthdayParts = user.birthday.toString().split('/');
      if (birthdayParts.length !== 3) return;

      const day = parseInt(birthdayParts[0], 10);
      const month = parseInt(birthdayParts[1], 10) - 1;

      const birthdayThisYear = new Date(currentYear, month, day);
      
      const diffTime = birthdayThisYear.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays >= -7 && diffDays <= 7) {
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
          photo: user.profileImageUrl || user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`
        });
      }
    });

    birthdays.sort((a, b) => {
      const statusOrder = { past: 0, today: 1, upcoming: 2 };
      return statusOrder[a.status] - statusOrder[b.status];
    });

    return birthdays;
  };

  const getMonthName = (monthIndex: number): string => {
    const months = [
      "Gen", "Feb", "Mar", "Abr", "Mai", "Jun",
      "Jul", "Ago", "Set", "Oct", "Nov", "Des"
    ];
    return months[monthIndex];
  };

  const upcomingBirthdays = getUpcomingBirthdays();

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

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setIsModalOpen(true);
  };

  const getHolidayName = (date: Date) => {
    const dateKey = dateToKey(date);
    return officialHolidays && officialHolidays[dateKey] ? officialHolidays[dateKey] : "";
  };

  const getVacationReason = (date: Date) => {
    const dateKey = dateToKey(date);
    return vacations && vacations[dateKey] ? vacations[dateKey] : "";
  };

  const getClosureReason = (date: Date) => {
    const dateKey = dateToKey(date);
    if (closuresArbucies && closuresArbucies[dateKey]) {
      return `Arbúcies: ${closuresArbucies[dateKey]}`;
    }
    if (closuresSantHilari && closuresSantHilari[dateKey]) {
      return `Sant Hilari: ${closuresSantHilari[dateKey]}`;
    }
    return "";
  };

  const goToPreviousMonth = useCallback(() => {
    setCurrentViewDate(prevDate => new Date(prevDate.getFullYear(), prevDate.getMonth() - 1, 1));
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentViewDate(prevDate => new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 1));
  }, []);

  const currentMonthText = useMemo(() => {
    return currentViewDate.toLocaleDateString("ca-ES", { month: "long", year: "numeric" });
  }, [currentViewDate]);

  // 🆕 GENERAR CALENDARI NOMÉS AMB DIES LABORABLES
  const year = currentViewDate.getFullYear();
  const month = currentViewDate.getMonth();
  
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInCurrentMonth = lastDayOfMonth.getDate();
  
  // 🆕 Calcular dies laborables del mes
  const workDays: Array<{ day: number; date: Date; sessions: Session[]; holiday: boolean; vacation: boolean; closure: boolean }> = [];
  
  for (let day = 1; day <= daysInCurrentMonth; day++) {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();
    
    // 🆕 Només afegir dies de dilluns (1) a divendres (5)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      const sessions = getSessionsForDate(date);
      const holiday = isHoliday(date);
      const vacation = isVacation(date);
      const closure = isClosure(date);
      
      workDays.push({ day, date, sessions, holiday, vacation, closure });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">Benvinguda! 👋</h1>
        <p className="text-muted-foreground">Aquí tens un resum de l'activitat actual</p>
      </div>

      {/* Estadístiques ràpides */}
      <div className="grid md:grid-cols-3 gap-6">
        <NeoCard>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shadow-neo-inset">
              <Calendar className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sessions aquest mes</p>
              <p className="text-2xl font-bold text-primary">
                {workDays.reduce((total, day) => total + day.sessions.filter(s => !s.isDeleted).length, 0)}
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
              <p className="text-sm text-muted-foreground">Usuaris actius</p>
              <p className="text-2xl font-bold text-accent">{users.length}</p>
            </div>
          </div>
        </NeoCard>

        <NeoCard>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center shadow-neo-inset">
              <TrendingUp className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Programes actius</p>
              <p className="text-2xl font-bold text-destructive">4</p>
            </div>
          </div>
        </NeoCard>
      </div>

      {/* Programes actius */}
      <NeoCard>
        <h2 className="text-xl font-semibold mb-4">Subprogrames actius</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {activePrograms.map((program) => (
            <div
              key={program.code}
              className="p-4 rounded-xl shadow-neo hover:shadow-neo-sm transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 ${program.color} rounded-lg shadow-neo flex items-center justify-center text-white font-bold`}>
                  {program.code}
                </div>
                <div>
                  <p className="font-semibold">{program.name}</p>
                  <p className="text-sm text-muted-foreground">{program.days} dies actiu</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </NeoCard>

      {/* Aniversaris */}
      <NeoCard>
        <div className="flex items-center gap-2 mb-4">
          <Cake className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Aniversaris propers</h2>
        </div>
        
        {upcomingBirthdays.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            No hi ha aniversaris propers (7 dies enrere/endavant)
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
                    <span className={`font-medium ${birthday.status === "past" ? "text-muted-foreground" : ""}`}>
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
                <span className={`text-sm ${
                  birthday.status === "today" ? "text-primary font-bold" : "text-muted-foreground"
                }`}>
                  {birthday.date}
                </span>
              </div>
            ))}
          </div>
        )}
      </NeoCard>

      {/* 🆕 CALENDARI NOMÉS DIES LABORABLES */}
      <NeoCard>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold capitalize">Dies laborables - {currentMonthText}</h2>
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
        
        {/* 🆕 GRID AMB 5 COLUMNES (DL-DV) */}
        <div className="grid grid-cols-5 gap-3 mb-4">
          {["Dilluns", "Dimarts", "Dimecres", "Dijous", "Divendres"].map((day) => (
            <div key={day} className="text-center font-semibold text-sm text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Dies laborables */}
        <div className="grid grid-cols-5 gap-3">
          {workDays.map((dayInfo, idx) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const isToday = dayInfo.date.getTime() === today.getTime();
            
            const dateKey = dateToKey(dayInfo.date);
            const hasModifications = customSessions[dateKey] && customSessions[dateKey].length > 0;
            
            return (
              <button
                key={idx}
                onClick={() => handleDayClick(dayInfo.date)}
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
                <span className={`text-sm mb-1 ${isToday ? 'font-bold text-primary' : ''}`}>{dayInfo.day}</span>
                {isToday && <span className="text-[8px] text-primary font-bold mb-1">AVUI</span>}
                {dayInfo.holiday && <span className="text-[8px] text-yellow-700 font-bold mb-1">FESTIU</span>}
                {dayInfo.vacation && <span className="text-[8px] text-blue-700 font-bold mb-1">VAC</span>}
                {dayInfo.closure && <span className="text-[8px] text-gray-700 font-bold mb-1">TANCAT</span>}
                
                {dayInfo.sessions.length > 0 && (
                  <div className="flex gap-0.5 flex-wrap justify-center w-full">
                    {dayInfo.sessions.map((session, idx) => (
                      <div
                        key={idx}
                        className={`w-7 h-7 rounded ${
                          session.isDeleted ?
                          'bg-gray-300 opacity-50' : 
                          programColors[session.program as keyof typeof programColors]?.color || 'bg-gray-500'
                        } text-white text-[10px] flex items-center justify-center font-bold shadow-sm`}
                        title={session.isDeleted ? `CANCEL·LADA: ${session.time} - ${session.program}` : `${session.time} - ${session.program}`}
                      >
                        {session.program}
                      </div>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Llegenda */}
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground border-t pt-3 mt-4">
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-primary/50 ring-2 ring-primary/30"></div><span>Dia actual</span></div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded border-2 border-green-500"></div><span>Modificat</span></div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-yellow-500/50"></div><span>Festiu</span></div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-blue-500/50"></div><span>Vacances</span></div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-gray-500/50"></div><span>Tancament</span></div>
          {Object.entries(programColors).map(([code, data]) => (
            <div key={code} className="flex items-center gap-1"><div className={`w-3 h-3 rounded ${data.color}`}></div><span>{code}</span></div>
          ))}
        </div>
      </NeoCard>

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
