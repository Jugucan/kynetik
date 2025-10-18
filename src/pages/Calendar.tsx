import { useState, useMemo, useCallback } from "react";
import { NeoCard } from "@/components/NeoCard";
import { DaySessionsModal } from "@/components/DaySessionsModal";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { programColors, weekSchedule, Session } from "@/lib/programColors";
import { useSettings } from "@/hooks/useSettings"; 

// Funció per generar la clau de data en format local 'YYYY-MM-DD'
const dateToKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const Calendar = () => {
  // 🎉 NOU: Ara també carreguem officialHolidays de Firebase
  const { vacations, closuresArbucies, closuresSantHilari, officialHolidays, loading } = useSettings(); 

  // ESTAT PER GESTIONAR EL MES QUE ES VEU
  const [currentViewDate, setCurrentViewDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  
  const [customSessions, setCustomSessions] = useState<Record<string, Session[]>>({});
  const [deletedSessions, setDeletedSessions] = useState<Record<string, Array<{sessionIndex: number, reason: string}>>>({});
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // FUNCIONS PER CANVIAR DE MES
  const goToPreviousMonth = useCallback(() => {
    setCurrentViewDate(prevDate => {
      return new Date(prevDate.getFullYear(), prevDate.getMonth() - 1, 1);
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentViewDate(prevDate => {
      return new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 1);
    });
  }, []);

  // Càlcul del mes i any per al títol
  const currentMonthText = useMemo(() => {
    return currentViewDate.toLocaleDateString("ca-ES", { 
      month: "long", 
      year: "numeric" 
    });
  }, [currentViewDate]);

  const getSessionsForDate = (date: Date): Session[] => {
    const dateKey = dateToKey(date);
    
    // Check if it's a holiday, general vacation, or closure at either center - no sessions
    if (isHoliday(date) || isVacation(date) || isClosure(date)) {
      return [];
    }
    
    if (customSessions[dateKey]) {
      return customSessions[dateKey];
    }
    
    const dayOfWeek = date.getDay();
    const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek;
    return weekSchedule[adjustedDay] || [];
  };

  const handleUpdateSessions = (date: Date, sessions: Session[]) => {
    const dateKey = dateToKey(date);
    setCustomSessions((prev) => ({
      ...prev,
      [dateKey]: sessions,
    }));
  };

  const handleDeleteSession = (date: Date, sessionIndex: number, reason: string) => {
    const dateKey = dateToKey(date);
    setDeletedSessions((prev) => ({
      ...prev,
      [dateKey]: [...(prev[dateKey] || []), { sessionIndex, reason }],
    }));
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setIsModalOpen(true);
  };

  // 🎉 NOU: Comprovar si és festiu oficial (des de Firebase)
  const isHoliday = (date: Date) => {
    const dateKey = dateToKey(date);
    return officialHolidays && officialHolidays.hasOwnProperty(dateKey);
  };

  // Comprovar si és vacances
  const isVacation = (date: Date) => {
    const dateKey = dateToKey(date);
    return vacations && vacations.hasOwnProperty(dateKey); 
  };
  
  // Comprovar si és tancament
  const isClosure = (date: Date) => {
    const dateKey = dateToKey(date);
    return (closuresArbucies && closuresArbucies.hasOwnProperty(dateKey)) || 
           (closuresSantHilari && closuresSantHilari.hasOwnProperty(dateKey)); 
  };

  // 🎉 NOU: Obtenir el nom del festiu des de Firebase
  const getHolidayName = (date: Date) => {
    const dateKey = dateToKey(date);
    return officialHolidays && officialHolidays[dateKey] ? officialHolidays[dateKey] : "";
  };

  // 🎉 NOU: Obtenir el motiu de les vacances
  const getVacationReason = (date: Date) => {
    const dateKey = dateToKey(date);
    return vacations && vacations[dateKey] ? vacations[dateKey] : "";
  };

  // 🎉 NOU: Obtenir el motiu del tancament
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

  // 🎉 NOU: Calcular properes festes i tancaments des de Firebase
  const upcomingEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const events: Array<{ date: Date; type: 'holiday' | 'vacation' | 'closure'; name: string; reason: string }> = [];
    
    // Afegir festius oficials
    if (officialHolidays) {
      Object.entries(officialHolidays).forEach(([dateKey, reason]) => {
        const date = new Date(dateKey);
        if (date >= today) {
          events.push({ date, type: 'holiday', name: reason, reason: 'Festiu oficial' });
        }
      });
    }
    
    // Afegir vacances
    if (vacations) {
      Object.entries(vacations).forEach(([dateKey, reason]) => {
        const date = new Date(dateKey);
        if (date >= today) {
          events.push({ date, type: 'vacation', name: 'Vacances', reason: reason || 'Vacances generals' });
        }
      });
    }
    
    // Afegir tancaments Arbúcies
    if (closuresArbucies) {
      Object.entries(closuresArbucies).forEach(([dateKey, reason]) => {
        const date = new Date(dateKey);
        if (date >= today) {
          events.push({ date, type: 'closure', name: 'Tancament Arbúcies', reason: reason || 'Tancament' });
        }
      });
    }
    
    // Afegir tancaments Sant Hilari
    if (closuresSantHilari) {
      Object.entries(closuresSantHilari).forEach(([dateKey, reason]) => {
        const date = new Date(dateKey);
        if (date >= today) {
          events.push({ date, type: 'closure', name: 'Tancament Sant Hilari', reason: reason || 'Tancament' });
        }
      });
    }
    
    // Ordenar per data i agafar els primers 5
    return events
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 5);
  }, [officialHolidays, vacations, closuresArbucies, closuresSantHilari]);

  // GENERACIÓ DEL CALENDARI
  const year = currentViewDate.getFullYear();
  const month = currentViewDate.getMonth();
  
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInCurrentMonth = lastDayOfMonth.getDate();
  
  const firstDayOfWeek = firstDayOfMonth.getDay();
  const adjustedFirstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
  
  const calendarDays: Array<{ day: number | null; date: Date | null; sessions: Session[]; holiday: boolean; vacation: boolean; closure: boolean }> = [];
  
  for (let i = 0; i < adjustedFirstDay; i++) {
    calendarDays.push({ day: null, date: null, sessions: [], holiday: false, vacation: false, closure: false });
  }
  
  for (let day = 1; day <= daysInCurrentMonth; day++) {
    const date = new Date(year, month, day);
    const sessions = getSessionsForDate(date);
    const holiday = isHoliday(date);
    const vacation = isVacation(date);
    const closure = isClosure(date);
    
    calendarDays.push({ day, date, sessions, holiday, vacation, closure });
  }

  const dayNames = ["Dl", "Dt", "Dc", "Dj", "Dv", "Ds", "Dg"];
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Carregant dades de configuració...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CalendarIcon className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Calendari</h1>
          <p className="text-muted-foreground capitalize">{currentMonthText}</p>
        </div>
      </div>

      <div className="grid gap-6">
        <NeoCard>
          
          {/* Botons de fletxa per canviar de mes */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Sessions del mes</h2>
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
          
          {/* Grid del calendari */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {dayNames.map((day) => (
              <div key={day} className="text-center font-semibold text-sm text-muted-foreground py-2">
                {day}
              </div>
            ))}
            {calendarDays.map((dayInfo, idx) => (
              <button
                key={idx}
                onClick={() => dayInfo.date && handleDayClick(dayInfo.date)}
                disabled={!dayInfo.day}
                className={`aspect-square rounded-xl shadow-neo hover:shadow-neo-sm transition-all flex flex-col items-center justify-start font-medium p-2 ${
                  !dayInfo.day
                    ? "invisible"
                    : dayInfo.holiday
                    ? "bg-yellow-500/20 border-2 border-yellow-500/50"
                    : dayInfo.vacation
                    ? "bg-blue-500/20 border-2 border-blue-500/50"
                    : dayInfo.closure
                    ? "bg-gray-500/20 border-2 border-gray-500/50"
                    : ""
                }`}
                title={
                  dayInfo.holiday 
                    ? `Festiu: ${getHolidayName(dayInfo.date!)}`
                    : dayInfo.vacation
                    ? `Vacances: ${getVacationReason(dayInfo.date!)}`
                    : dayInfo.closure
                    ? `Tancament: ${getClosureReason(dayInfo.date!)}`
                    : ""
                }
              >
                {dayInfo.day && (
                  <>
                    <span className="text-sm mb-1">{dayInfo.day}</span>
                    
                    {/* Indicador festiu/vacances/tancament */}
                    {dayInfo.holiday && (
                      <span className="text-[8px] text-yellow-700 font-bold mb-1">FESTIU</span>
                    )}
                    {dayInfo.vacation && (
                      <span className="text-[8px] text-blue-700 font-bold mb-1">VACANCES</span>
                    )}
                    {dayInfo.closure && (
                      <span className="text-[8px] text-gray-700 font-bold mb-1">TANCAT</span>
                    )}

                    {/* Sessions amb colors i inicials */}
                    {dayInfo.sessions.length > 0 && (
                      <div className="flex gap-0.5 flex-wrap justify-center w-full">
                        {dayInfo.sessions.map((session, idx) => (
                          <div
                            key={idx}
                            className={`w-7 h-7 rounded ${
                              programColors[session.program].color
                            } text-white text-[10px] flex items-center justify-center font-bold shadow-sm`}
                            title={`${session.time} - ${programColors[session.program].name}`}
                          >
                            {session.program}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </button>
            ))}
          </div>

          {/* Llegenda */}
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground border-t pt-3">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-yellow-500/50"></div>
              <span>Festiu</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-blue-500/50"></div>
              <span>Vacances</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-gray-500/50"></div>
              <span>Tancament</span>
            </div>
            {Object.entries(programColors).map(([code, data]) => (
              <div key={code} className="flex items-center gap-1">
                <div className={`w-3 h-3 rounded ${data.color}`}></div>
                <span>{code}</span>
              </div>
            ))}
          </div>
        </NeoCard>

        <div className="grid md:grid-cols-2 gap-6">
          <NeoCard>
            <h3 className="font-semibold mb-3">Arbúcies</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sessions realitzades:</span>
                <span className="font-bold text-primary">12</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dies treballats:</span>
                <span className="font-bold">15</span>
              </div>
            </div>
          </NeoCard>

          <NeoCard>
            <h3 className="font-semibold mb-3">Sant Hilari</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sessions realitzades:</span>
                <span className="font-bold text-primary">8</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dies treballats:</span>
                <span className="font-bold">10</span>
              </div>
            </div>
          </NeoCard>
        </div>

        {/* 🎉 NOU: Properes festes i tancaments (dinàmic des de Firebase) */}
        <NeoCard>
          <h3 className="font-semibold mb-4">Properes festes i tancaments</h3>
          {upcomingEvents.length > 0 ? (
            <div className="space-y-3">
              {upcomingEvents.map((event, idx) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const daysUntil = Math.ceil((event.date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                
                let daysText = "";
                if (daysUntil === 0) {
                  daysText = "Avui";
                } else if (daysUntil === 1) {
                  daysText = "Demà";
                } else {
                  daysText = `Falten ${daysUntil} dies`;
                }
                
                return (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl shadow-neo-inset">
                    <div className="flex-1">
                      <p className="font-medium">{event.name}</p>
                      <p className="text-sm text-muted-foreground">{event.reason}</p>
                    </div>
                    <div className="text-right ml-3">
                      <span className={`block text-sm font-medium ${
                        event.type === 'holiday' ? 'text-yellow-600' :
                        event.type === 'vacation' ? 'text-blue-600' :
                        'text-gray-600'
                      }`}>
                        {event.date.toLocaleDateString("ca-ES", { day: 'numeric', month: 'short' })}
                      </span>
                      <span className="block text-xs text-muted-foreground mt-0.5">
                        {daysText}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No hi ha properes festes o tancaments programats.</p>
          )}
        </NeoCard>
      </div>

      <DaySessionsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        date={selectedDate}
        sessions={selectedDate ? getSessionsForDate(selectedDate) : []}
        onUpdateSessions={handleUpdateSessions}
        onDeleteSession={handleDeleteSession}
      />
    </div>
  );
};

export default Calendar;
