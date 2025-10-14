import { useState, useMemo, useCallback } from "react";
import { NeoCard } from "@/components/NeoCard";
import { DaySessionsModal } from "@/components/DaySessionsModal";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
// S'assumeix que programColors, weekSchedule, holidays2025 i Session són tipus i dades vàlides
import { programColors, weekSchedule, holidays2025, Session } from "@/lib/programColors"; 

// ******************************************************************************
// NOU: FUNCIÓ PER GENERAR LA CLAU DE DATA EN FORMAT LOCAL (YYYY-MM-DD)
// Sense aquesta funció, la conversió a ISOString pot canviar el dia 
// a causa de l'ajust del fus horari a UTC.
// ******************************************************************************
const dateToKey = (date: Date): string => {
  const year = date.getFullYear();
  // El mes és base 0, per això afegim 1
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};
// ******************************************************************************


const Calendar = () => {
  // ESTAT PER GESTIONAR EL MES QUE ES VEU
  const [currentViewDate, setCurrentViewDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  
  // Els teus estats existents
  const [customSessions, setCustomSessions] = useState<Record<string, Session[]>>({});
  const [deletedSessions, setDeletedSessions] = useState<Record<string, Array<{sessionIndex: number, reason: string}>>>({});
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // FUNCIONS PER CANVIAR DE MES
  const goToPreviousMonth = useCallback(() => {
    setCurrentViewDate(prevDate => {
      // Restem un mes
      return new Date(prevDate.getFullYear(), prevDate.getMonth() - 1, 1);
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentViewDate(prevDate => {
      // Sumem un mes
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

  // Mock vacances i tancaments
  const vacations = ["2025-03-24", "2025-03-25", "2025-03-26", "2025-03-27", "2025-03-28"];
  const closures = ["2025-03-15"];

  const getSessionsForDate = (date: Date): Session[] => {
    // CLAU DE DATA CORREGIDA
    const dateKey = dateToKey(date);
    
    // Check if it's a holiday or vacation - no sessions
    if (isHoliday(date) || isVacation(date) || isClosure(date)) { // Afegim isClosure aquí per si de cas
      return [];
    }
    
    if (customSessions[dateKey]) {
      return customSessions[dateKey];
    }
    
    const dayOfWeek = date.getDay();
    const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek; // Diumenge (0) -> 7
    return weekSchedule[adjustedDay] || [];
  };

  const handleUpdateSessions = (date: Date, sessions: Session[]) => {
    // CLAU DE DATA CORREGIDA
    const dateKey = dateToKey(date);
    setCustomSessions((prev) => ({
      ...prev,
      [dateKey]: sessions,
    }));
  };

  const handleDeleteSession = (date: Date, sessionIndex: number, reason: string) => {
    // CLAU DE DATA CORREGIDA
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

  const isHoliday = (date: Date) => {
    // CLAU DE DATA CORREGIDA
    const dateKey = dateToKey(date);
    // Assegurem que l'estructura de holidays2025 és d'objectes amb propietat 'date' (string YYYY-MM-DD)
    return holidays2025.some((h: { date: string, name: string }) => h.date === dateKey);
  };

  const isVacation = (date: Date) => {
    // CLAU DE DATA CORREGIDA
    const dateKey = dateToKey(date);
    return vacations.includes(dateKey);
  };

  const isClosure = (date: Date) => {
    // CLAU DE DATA CORREGIDA
    const dateKey = dateToKey(date);
    return closures.includes(dateKey);
  };

  const getHolidayName = (date: Date) => {
    // CLAU DE DATA CORREGIDA
    const dateKey = dateToKey(date);
    const holiday = holidays2025.find((h: { date: string, name: string }) => h.date === dateKey);
    return holiday?.name || "";
  };

  // GENERACIÓ DEL CALENDARI: UTILITZANT currentViewDate (això ja estava bé)
  const year = currentViewDate.getFullYear();
  const month = currentViewDate.getMonth();
  
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInCurrentMonth = lastDayOfMonth.getDate();
  
  const firstDayOfWeek = firstDayOfMonth.getDay();
  const adjustedFirstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Ajust de diumenge (0) a dilluns (6)
  
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

  return (
    <div className="space-y-6">
      {/* TÍTOL I BOTONS DE NAVEGACIÓ */}
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

        {/* Informació d'Arbúcies i Sant Hilari (Es manté el codi) */}
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

        {/* Properes festes i tancaments (Es manté el codi) */}
        <NeoCard>
          <h3 className="font-semibold mb-4">Properes festes i tancaments</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl shadow-neo-inset">
              <div>
                <p className="font-medium">Divendres Sant</p>
                <p className="text-sm text-muted-foreground">Festiu general</p>
              </div>
              <span className="text-sm font-medium text-primary">29 Mar</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl shadow-neo-inset">
              <div>
                <p className="font-medium">Dilluns de Pasqua</p>
                <p className="text-sm text-muted-foreground">Festiu general</p>
              </div>
              <span className="text-sm font-medium text-primary">1 Abr</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl shadow-neo-inset">
              <div>
                <p className="font-medium">Tancament Arbúcies</p>
                <p className="text-sm text-muted-foreground">Manteniment</p>
              </div>
              <span className="text-sm font-medium text-destructive">10-12 Abr</span>
            </div>
          </div>
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
