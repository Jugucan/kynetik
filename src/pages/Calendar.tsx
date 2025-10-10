import { useState } from "react";
import { NeoCard } from "@/components/NeoCard";
import { DaySessionsModal } from "@/components/DaySessionsModal";
import { Calendar as CalendarIcon } from "lucide-react";
import { programColors, weekSchedule, holidays2025, Session } from "@/lib/programColors";

const Calendar = () => {
  const [customSessions, setCustomSessions] = useState<Record<string, Session[]>>({});
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const currentMonth = new Date().toLocaleDateString("ca-ES", { 
    month: "long", 
    year: "numeric" 
  });

  // Mock vacances i tancaments
  const vacations = ["2025-03-24", "2025-03-25", "2025-03-26", "2025-03-27", "2025-03-28"];
  const closures = ["2025-03-15"];

  const getSessionsForDate = (date: Date): Session[] => {
    const dateKey = date.toISOString().split("T")[0];
    
    if (customSessions[dateKey]) {
      return customSessions[dateKey];
    }
    
    const dayOfWeek = date.getDay();
    const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek;
    return weekSchedule[adjustedDay] || [];
  };

  const handleUpdateSessions = (date: Date, sessions: Session[]) => {
    const dateKey = date.toISOString().split("T")[0];
    setCustomSessions((prev) => ({
      ...prev,
      [dateKey]: sessions,
    }));
  };

  const handleDayClick = (day: number) => {
    const now = new Date();
    const date = new Date(now.getFullYear(), now.getMonth(), day);
    setSelectedDate(date);
    setIsModalOpen(true);
  };

  const isHoliday = (day: number) => {
    const now = new Date();
    const dateKey = new Date(now.getFullYear(), now.getMonth(), day)
      .toISOString()
      .split("T")[0];
    return holidays2025.some((h) => h.date === dateKey);
  };

  const isVacation = (day: number) => {
    const now = new Date();
    const dateKey = new Date(now.getFullYear(), now.getMonth(), day)
      .toISOString()
      .split("T")[0];
    return vacations.includes(dateKey);
  };

  const isClosure = (day: number) => {
    const now = new Date();
    const dateKey = new Date(now.getFullYear(), now.getMonth(), day)
      .toISOString()
      .split("T")[0];
    return closures.includes(dateKey);
  };

  const getHolidayName = (day: number) => {
    const now = new Date();
    const dateKey = new Date(now.getFullYear(), now.getMonth(), day)
      .toISOString()
      .split("T")[0];
    const holiday = holidays2025.find((h) => h.date === dateKey);
    return holiday?.name || "";
  };

  // Simulació de dies del mes
  const daysInMonth = Array.from({ length: 31 }, (_, i) => {
    const day = i + 1;
    const now = new Date();
    const date = new Date(now.getFullYear(), now.getMonth(), day);
    const sessions = getSessionsForDate(date);
    const holiday = isHoliday(day);
    const vacation = isVacation(day);
    const closure = isClosure(day);
    
    return { day, date, sessions, holiday, vacation, closure };
  });

  const dayNames = ["Dl", "Dt", "Dc", "Dj", "Dv", "Ds", "Dg"];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CalendarIcon className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Calendari</h1>
          <p className="text-muted-foreground capitalize">{currentMonth}</p>
        </div>
      </div>

      <div className="grid gap-6">
        <NeoCard>
          <h2 className="text-xl font-semibold mb-4">Sessions del mes</h2>
          
          {/* Grid del calendari */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {dayNames.map((day) => (
              <div key={day} className="text-center font-semibold text-sm text-muted-foreground py-2">
                {day}
              </div>
            ))}
            {daysInMonth.map((dayInfo) => (
              <button
                key={dayInfo.day}
                onClick={() => handleDayClick(dayInfo.day)}
                className={`aspect-square rounded-xl shadow-neo hover:shadow-neo-sm transition-all flex flex-col items-center justify-start font-medium p-2 ${
                  dayInfo.holiday
                    ? "bg-yellow-500/20 border-2 border-yellow-500/50"
                    : dayInfo.vacation
                    ? "bg-blue-500/20 border-2 border-blue-500/50"
                    : dayInfo.closure
                    ? "bg-gray-500/20 border-2 border-gray-500/50"
                    : ""
                }`}
              >
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
      />
    </div>
  );
};

export default Calendar;
