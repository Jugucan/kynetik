import { useState, useMemo, useCallback, useEffect } from "react";
import { NeoCard } from "@/components/NeoCard";
import { DaySessionsModal } from "@/components/DaySessionsModal";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Loader2, Building2 } from "lucide-react";
import { useProgramColors } from "@/hooks/useProgramColors";
import { useSettings } from "@/hooks/useSettings";
import { useSchedules } from "@/hooks/useSchedules";
import { useCenters } from "@/hooks/useCenters";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

// Definició de Session
export interface Session {
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

const getBillingPeriod = (referenceDate: Date): { start: Date; end: Date } => {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const day = referenceDate.getDate();
  
  let startMonth: number;
  let startYear: number;
  
  // Si el dia és menor que 26, el període comença el mes anterior
  if (day < 26) {
    startMonth = month - 1;
    startYear = year;
    // Si estem al gener (month=0) i day<26, anem a desembre de l'any anterior
    if (startMonth < 0) {
      startMonth = 11;
      startYear = year - 1;
    }
  } else {
    // Si el dia és 26 o més, el període comença aquest mateix mes
    startMonth = month;
    startYear = year;
  }
  
  // La data d'inici és sempre el dia 26 del startMonth/startYear
  const startDate = new Date(startYear, startMonth, 26);
  startDate.setHours(0, 0, 0, 0);
  
  // La data final és el dia 25 del mes següent
  let endMonth = startMonth + 1;
  let endYear = startYear;
  if (endMonth > 11) {
    endMonth = 0;
    endYear = startYear + 1;
  }
  
  const endDate = new Date(endYear, endMonth, 25);
  endDate.setHours(23, 59, 59, 999);
  
  return { start: startDate, end: endDate };
};

const Calendar = () => {
  const { vacations, closuresArbucies, closuresSantHilari, officialHolidays, loading: settingsLoading } = useSettings();
  const { schedules, loading: schedulesLoading } = useSchedules();
  const { activeCenters, loading: centersLoading, getCenterByLegacyId } = useCenters();
  const { getProgramColor, getProgramName, getAllProgramColors } = useProgramColors();
  
  const [currentViewDate, setCurrentViewDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [customSessions, setCustomSessions] = useState<Record<string, Session[]>>({});
  const [deletedSessions, setDeletedSessions] = useState<Record<string, Array<{sessionIndex: number, reason: string}>>>({});
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // 🆕 Estat per al filtre de centres
  const [selectedCenterFilter, setSelectedCenterFilter] = useState<string>("all");

  const loading = settingsLoading || schedulesLoading || centersLoading;

  // Carregar sessions personalitzades de Firebase amb listener en temps real
  useEffect(() => {
    console.log("🔄 Iniciant listener de sessions personalitzades...");
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
        console.log("✅ Sessions personalitzades carregades:", Object.keys(sessionsMap).length, "dies amb sessions modificades");
        console.log("📅 Dies amb modificacions:", Object.keys(sessionsMap));
      } else {
        setCustomSessions({});
        console.log("ℹ️ No hi ha sessions personalitzades guardades");
      }
    }, (error) => {
      console.error("❌ Error carregant sessions personalitzades:", error);
    });

    return () => {
      console.log("🛑 Tancant listener de sessions personalitzades");
      unsubscribe();
    };
  }, []);

  const getScheduleForDate = useCallback((date: Date) => {
    const dateStr = dateToKey(date);
    
    // 🎯 CANVI IMPORTANT: Ordenar horaris per data d'inici (més recent primer)
    const sortedSchedules = [...schedules].sort((a, b) => {
      return b.startDate.localeCompare(a.startDate);
    });
    
    // Buscar el primer horari que compleixi les condicions
    return sortedSchedules.find(schedule => {
      const startDate = schedule.startDate;
      const endDate = schedule.endDate || '9999-12-31';
      return dateStr >= startDate && dateStr <= endDate;
    });
  }, [schedules]);

  const viewBillingPeriod = useMemo(() => getBillingPeriod(currentViewDate), [currentViewDate]);

  const goToPreviousMonth = useCallback(() => {
    setCurrentViewDate(prevDate => new Date(prevDate.getFullYear(), prevDate.getMonth() - 1, 1));
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentViewDate(prevDate => new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 1));
  }, []);

  const currentMonthText = useMemo(() => {
    return currentViewDate.toLocaleDateString("ca-ES", { month: "long", year: "numeric" });
  }, [currentViewDate]);

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
    
    console.log(`🔍 getSessionsForDate per ${dateKey}:`, {
      teCustomSessions: !!customSessions[dateKey],
      numCustomSessions: customSessions[dateKey]?.length || 0,
      totalDiesAmbCustom: Object.keys(customSessions).length
    });
    
    if (customSessions[dateKey]) {
      console.log("📌 Usant sessions personalitzades per:", dateKey, customSessions[dateKey]);
      return customSessions[dateKey];
    }
    
    if (isHoliday(date) || isVacation(date) || isClosure(date)) {
      console.log("🚫 Dia especial (festiu/vacances/tancament):", dateKey);
      return [];
    }
    
    const scheduleForDate = getScheduleForDate(date);
    
    if (scheduleForDate) {
      const dayOfWeek = date.getDay();
      const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek;
      const scheduleSessions = scheduleForDate.sessions[adjustedDay] || [];
      
      console.log("📅 Usant horari estàndard per:", dateKey, scheduleSessions.length, "sessions");
      
      return scheduleSessions.map(s => ({
        time: s.time,
        program: s.program,
        center: s.center,
        isCustom: false,
        isDeleted: false,
      }));
    }
    
    console.log("⚠️ No s'ha trobat cap sessió per:", dateKey);
    return [];
  }, [customSessions, getScheduleForDate, isHoliday, isVacation, isClosure]);

  // 🆕 Funció per filtrar sessions segons el centre seleccionat
  const filterSessionsByCenter = useCallback((sessions: Session[]): Session[] => {
    if (selectedCenterFilter === "all") {
      return sessions;
    }
    
    // Mapear l'ID del centre al format antic (per compatibilitat)
    const centerMapping: Record<string, string> = {
      'arbucies': 'Arbucies',
      'sant-hilari': 'SantHilari',
    };
    
    const legacyId = centerMapping[selectedCenterFilter];
    
    return sessions.filter(session => session.center === legacyId);
  }, [selectedCenterFilter]);

  const handleUpdateSessions = (date: Date, sessions: Session[]) => {
    const dateKey = dateToKey(date);
    console.log("📝 Actualitzant sessions locals per:", dateKey, sessions.length, "sessions");
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

  // 🆕 Estadístiques filtrades per centre
  const sessionStats = useMemo(() => {
    const stats: Record<string, { sessions: number; days: number }> = {};
    
    // Inicialitzar estadístiques per cada centre actiu
    activeCenters.forEach(center => {
      stats[center.id] = { sessions: 0, days: 0 };
    });

    const currentDate = new Date(viewBillingPeriod.start);
    
    while (currentDate <= viewBillingPeriod.end) {
      const sessions = getSessionsForDate(currentDate);
      const activeSessions = sessions.filter(s => !s.isDeleted);
      
      if (activeSessions.length > 0) {
        const centerDaysCount: Record<string, boolean> = {};
        
        activeSessions.forEach(session => {
          // Mapear center antic al nou ID
          const centerMapping: Record<string, string> = {
            'Arbucies': 'arbucies',
            'SantHilari': 'sant-hilari',
          };
          
          const centerId = session.center ? centerMapping[session.center] : null;
          
          if (centerId && stats[centerId]) {
            stats[centerId].sessions++;
            centerDaysCount[centerId] = true;
          }
        });
        
        // Incrementar dies treballats
        Object.keys(centerDaysCount).forEach(centerId => {
          stats[centerId].days++;
        });
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return stats;
  }, [viewBillingPeriod, getSessionsForDate, activeCenters]);

  const upcomingEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const events: Array<{ date: Date; type: 'holiday' | 'vacation' | 'closure'; name: string; reason: string }> = [];
    
    if (officialHolidays) {
      Object.entries(officialHolidays).forEach(([dateKey, reason]) => {
        const date = new Date(dateKey);
        const dayOfWeek = date.getDay();
        // 🎉 NOU: Filtrar caps de setmana (0=diumenge, 6=dissabte)
        if (date >= today && dayOfWeek !== 0 && dayOfWeek !== 6) {
          events.push({ date, type: 'holiday', name: reason, reason: 'Festiu oficial' });
        }
      });
    }
    
    if (vacations) {
      Object.entries(vacations).forEach(([dateKey, reason]) => {
        const date = new Date(dateKey);
        const dayOfWeek = date.getDay();
        // 🎉 NOU: Filtrar caps de setmana
        if (date >= today && dayOfWeek !== 0 && dayOfWeek !== 6) {
          events.push({ date, type: 'vacation', name: 'Vacances', reason: reason || 'Vacances generals' });
        }
      });
    }
    
    if (closuresArbucies) {
      Object.entries(closuresArbucies).forEach(([dateKey, reason]) => {
        const date = new Date(dateKey);
        const dayOfWeek = date.getDay();
        // 🎉 NOU: Filtrar caps de setmana
        if (date >= today && dayOfWeek !== 0 && dayOfWeek !== 6) {
          events.push({ date, type: 'closure', name: 'Tancament Arbúcies', reason: reason || 'Tancament' });
        }
      });
    }
    
    if (closuresSantHilari) {
      Object.entries(closuresSantHilari).forEach(([dateKey, reason]) => {
        const date = new Date(dateKey);
        const dayOfWeek = date.getDay();
        // 🎉 NOU: Filtrar caps de setmana
        if (date >= today && dayOfWeek !== 0 && dayOfWeek !== 6) {
          events.push({ date, type: 'closure', name: 'Tancament Sant Hilari', reason: reason || 'Tancament' });
        }
      });
    }
    
    return events.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 5);
  }, [officialHolidays, vacations, closuresArbucies, closuresSantHilari]);

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
    const allSessions = getSessionsForDate(date);
    const sessions = filterSessionsByCenter(allSessions);
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
          Carregant dades...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CalendarIcon className="w-8 h-8 text-primary" />
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">Calendari</h1>
          <p className="text-2xl font-semibold text-primary capitalize mt-1">{currentMonthText}</p>
        </div>
      </div>

      {/* 🆕 SELECTOR DE CENTRES */}
      <NeoCard>
        <div className="flex items-center gap-3">
          <Building2 className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Filtrar per centre</h3>
        </div>
        <div className="flex gap-2 mt-3 flex-wrap">
          <button
            onClick={() => setSelectedCenterFilter("all")}
            className={`px-4 py-2 rounded-lg shadow-neo hover:shadow-neo-sm transition-all font-medium ${
              selectedCenterFilter === "all" 
                ? "bg-primary text-white" 
                : "bg-white text-foreground"
            }`}
          >
            Tots els centres
          </button>
          {activeCenters.map(center => (
            <button
              key={center.id}
              onClick={() => setSelectedCenterFilter(center.id)}
              className={`px-4 py-2 rounded-lg shadow-neo hover:shadow-neo-sm transition-all font-medium ${
                selectedCenterFilter === center.id 
                  ? "bg-primary text-white" 
                  : "bg-white text-foreground"
              }`}
            >
              {center.name}
            </button>
          ))}
        </div>
      </NeoCard>

      <div className="grid gap-6">
        <NeoCard>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Sessions del mes</h2>
            <div className="flex space-x-2">
              <button onClick={goToPreviousMonth} className="p-2 rounded-full shadow-neo hover:shadow-neo-sm transition-all" title="Mes anterior">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button onClick={goToNextMonth} className="p-2 rounded-full shadow-neo hover:shadow-neo-sm transition-all" title="Mes següent">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-7 gap-2 mb-4">
            {dayNames.map((day) => (
              <div key={day} className="text-center font-semibold text-sm text-muted-foreground py-2">
                {day}
              </div>
            ))}
            {calendarDays.map((dayInfo, idx) => {
              // 🎉 NOU: Comprovar si és el dia actual
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const isToday = dayInfo.date && dayInfo.date.getTime() === today.getTime();
              
              // 🎉 NOU: Comprovar si té sessions modificades
              const dateKey = dayInfo.date ? dateToKey(dayInfo.date) : '';
              const hasModifications = customSessions[dateKey] && customSessions[dateKey].length > 0;
              
              return (
                <button
                  key={idx}
                  onClick={() => dayInfo.date && handleDayClick(dayInfo.date)}
                  disabled={!dayInfo.day}
                  className={`aspect-square rounded-xl shadow-neo hover:shadow-neo-sm transition-all flex flex-col items-center justify-start font-medium p-2 ${
                    !dayInfo.day
                      ? "invisible"
                      : isToday
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
                      <span className={`text-sm mb-1 ${isToday ? 'font-bold text-primary' : ''}`}>{dayInfo.day}</span>
                      {isToday && <span className="text-[8px] text-primary font-bold mb-1">AVUI</span>}
                      {dayInfo.holiday && <span className="text-[8px] text-yellow-700 font-bold mb-1">FESTIU</span>}
                      {dayInfo.vacation && <span className="text-[8px] text-blue-700 font-bold mb-1">VACANCES</span>}
                      {dayInfo.closure && <span className="text-[8px] text-gray-700 font-bold mb-1">TANCAT</span>}
                      {dayInfo.sessions.length > 0 && (
                        <div className="flex gap-0.5 flex-wrap justify-center w-full">
                          {dayInfo.sessions.map((session, idx) => {
                            const programColor = getProgramColor(session.program);
                            return (
                              <div
                                key={idx}
                                className={`w-7 h-7 rounded ${
                                  session.isDeleted ? 'bg-gray-300 dark:bg-gray-600 opacity-50' : ''
                                } text-white text-[10px] flex items-center justify-center font-bold shadow-sm ${session.isDeleted ? 'line-through' : ''}`}
                                style={!session.isDeleted ? { backgroundColor: programColor } : {}}
                                title={session.isDeleted ? `ELIMINADA: ${session.time} - ${getProgramName(session.program)} - ${session.deleteReason || 'Sense motiu'}` : `${session.time} - ${getProgramName(session.program)} - ${session.center || 'N/A'}`}
                              >
                                {session.program}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground border-t pt-3">
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-primary/50 ring-2 ring-primary/30"></div><span>Dia actual</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded border-2 border-green-500"></div><span>Modificat</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-yellow-500/50"></div><span>Festiu</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-blue-500/50"></div><span>Vacances</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-gray-500/50"></div><span>Tancament</span></div>
            {Object.entries(getAllProgramColors()).map(([code, color]) => (
              <div key={code} className="flex items-center gap-1"><div className="w-3 h-3 rounded" style={{ backgroundColor: color }}></div><span>{code}</span></div>
            ))}
          </div>
        </NeoCard>

        {/* 🆕 ESTADÍSTIQUES DINÀMIQUES PER CENTRE */}
        <div className="grid md:grid-cols-2 gap-6">
          {(selectedCenterFilter === "all" ? activeCenters : activeCenters.filter(c => c.id === selectedCenterFilter)).map(center => (
            <NeoCard key={center.id}>
              <h3 className="font-semibold mb-3">{center.name}</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Període: {viewBillingPeriod.start.toLocaleDateString("ca-ES", { day: 'numeric', month: 'short' })} - {viewBillingPeriod.end.toLocaleDateString("ca-ES", { day: 'numeric', month: 'short' })}
              </p>
              <div className="space-y-2">
                <div className="flex justify-between"><span className="text-muted-foreground">Sessions realitzades:</span><span className="font-bold text-primary">{sessionStats[center.id]?.sessions || 0}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Dies treballats:</span><span className="font-bold">{sessionStats[center.id]?.days || 0}</span></div>
              </div>
            </NeoCard>
          ))}
        </div>

        <NeoCard>
          <h3 className="font-semibold mb-4">Properes festes i tancaments</h3>
          {upcomingEvents.length > 0 ? (
            <div className="space-y-3">
              {upcomingEvents.map((event, idx) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const daysUntil = Math.ceil((event.date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                let daysText = daysUntil === 0 ? "Avui" : daysUntil === 1 ? "Demà" : `Falten ${daysUntil} dies`;
                
                return (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl shadow-neo-inset">
                    <div className="flex-1">
                      <p className="font-medium">{event.name}</p>
                      <p className="text-sm text-muted-foreground">{event.reason}</p>
                    </div>
                    <div className="text-right ml-3">
                      <span className={`block text-sm font-medium ${event.type === 'holiday' ? 'text-yellow-600' : event.type === 'vacation' ? 'text-blue-600' : 'text-gray-600'}`}>
                        {event.date.toLocaleDateString("ca-ES", { day: 'numeric', month: 'short' })}
                      </span>
                      <span className="block text-xs text-muted-foreground mt-0.5">{daysText}</span>
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
