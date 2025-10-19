import { useState } from "react";
import { NeoCard } from "@/components/NeoCard";
import { DayInfoModal } from "@/components/DayInfoModal";
import { Calendar, Users, TrendingUp, Cake, PartyPopper } from "lucide-react";
import { programColors } from "@/lib/programColors";
import { useSettings } from "@/hooks/useSettings";
import { useSchedules } from "@/hooks/useSchedules";

// Definició de Session
interface Session {
  time: string;
  program: string;
  center?: string;
}

const Index = () => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 🎉 Carregar dades des de Firebase
  const { vacations, closuresArbucies, closuresSantHilari, officialHolidays } = useSettings();
  const { getActiveSchedule } = useSchedules();
  const activeSchedule = getActiveSchedule();

  const activePrograms = [
    { name: "BodyPump 120", code: "BP", days: 45, color: "bg-red-500" },
    { name: "BodyCombat 95", code: "BC", days: 30, color: "bg-orange-500" },
    { name: "BodyBalance 105", code: "BB", days: 60, color: "bg-green-500" },
  ];

  const upcomingBirthdays = [
    { name: "Joan Pérez", date: "2 Mar", status: "past", age: 34, center: "Arbúcies", photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=Joan" },
    { name: "Maria García", date: "8 Mar", status: "past", age: 28, center: "Sant Hilari", photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=Maria" },
    { name: "Laura Soler", date: "10 Mar", status: "today", age: 31, center: "Arbúcies", photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=Laura" },
    { name: "Joan Martínez", date: "15 Mar", status: "upcoming", age: 42, center: "Sant Hilari", photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=JoanM" },
    { name: "Anna López", date: "18 Mar", status: "upcoming", age: 25, center: "Arbúcies", photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=Anna" },
  ];

  const dateToKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 🎉 Obtenir sessions des de l'horari actiu de Firebase
  const getSessionsForDate = (date: Date): Session[] => {
    // Si és festiu, vacances o tancament, no hi ha sessions
    if (isHoliday(date) || isVacation(date) || isClosure(date)) {
      return [];
    }
    
    // Obtenir sessions de l'horari actiu
    if (activeSchedule) {
      const dayOfWeek = date.getDay();
      const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek;
      const scheduleSessions = activeSchedule.sessions[adjustedDay] || [];
      
      return scheduleSessions.map(s => ({
        time: s.time,
        program: s.program,
        center: s.center,
      }));
    }
    
    return [];
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setIsModalOpen(true);
  };

  // 🎉 Comprovar si és festiu oficial (des de Firebase)
  const isHoliday = (date: Date) => {
    const dateKey = dateToKey(date);
    return officialHolidays && officialHolidays.hasOwnProperty(dateKey);
  };

  // 🎉 Comprovar si és vacances (des de Firebase)
  const isVacation = (date: Date) => {
    const dateKey = dateToKey(date);
    return vacations && vacations.hasOwnProperty(dateKey);
  };

  // 🎉 Comprovar si és tancament (des de Firebase)
  const isClosure = (date: Date) => {
    const dateKey = dateToKey(date);
    return (closuresArbucies && closuresArbucies.hasOwnProperty(dateKey)) || 
           (closuresSantHilari && closuresSantHilari.hasOwnProperty(dateKey));
  };

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
              <p className="text-2xl font-bold text-primary">20</p>
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
              <p className="text-2xl font-bold text-accent">48</p>
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
                className="w-12 h-12 rounded-full shadow-neo"
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
      </NeoCard>

      {/* Mini calendari */}
      <NeoCard>
        <h2 className="text-xl font-semibold mb-4">Calendari del mes</h2>
        
        {/* Dies de la setmana */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {["Dl", "Dt", "Dc", "Dj", "Dv", "Ds", "Dg"].map((day) => (
            <div key={day} className="text-center font-semibold text-xs text-muted-foreground py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Dies del mes */}
        <div className="grid grid-cols-7 gap-2">
          {(() => {
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth();
            
            const firstDayOfMonth = new Date(year, month, 1);
            const lastDayOfMonth = new Date(year, month + 1, 0);
            const daysInCurrentMonth = lastDayOfMonth.getDate();
            
            const firstDayOfWeek = firstDayOfMonth.getDay();
            const adjustedFirstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
            
            const calendarDays: Array<{ day: number | null; date: Date | null }> = [];
            
            for (let i = 0; i < adjustedFirstDay; i++) {
              calendarDays.push({ day: null, date: null });
            }
            
            for (let day = 1; day <= daysInCurrentMonth; day++) {
              const date = new Date(year, month, day);
              calendarDays.push({ day, date });
            }
            
            return calendarDays.map((dayInfo, idx) => {
              if (!dayInfo.day || !dayInfo.date) {
                return <div key={idx} className="aspect-square" />;
              }
              
              const sessions = getSessionsForDate(dayInfo.date);
              const holiday = isHoliday(dayInfo.date);
              const vacation = isVacation(dayInfo.date);
              const closure = isClosure(dayInfo.date);

              return (
                <button
                  key={idx}
                  onClick={() => handleDayClick(dayInfo.date!)}
                  className={`aspect-square rounded-lg shadow-neo hover:shadow-neo-sm transition-all flex flex-col items-center justify-start p-1 text-sm font-medium cursor-pointer ${
                    holiday
                      ? "bg-yellow-500/20 border-2 border-yellow-500/50"
                      : vacation
                      ? "bg-blue-500/20 border-2 border-blue-500/50"
                      : closure
                      ? "bg-gray-500/20 border-2 border-gray-500/50"
                      : ""
                  }`}
                >
                  <span className="text-xs mb-1">{dayInfo.day}</span>
                  
                  {holiday && (
                    <span className="text-[6px] text-yellow-700 font-bold mb-0.5">FESTIU</span>
                  )}
                  {vacation && (
                    <span className="text-[6px] text-blue-700 font-bold mb-0.5">VAC</span>
                  )}
                  {closure && (
                    <span className="text-[6px] text-gray-700 font-bold mb-0.5">TANCAT</span>
                  )}
                  
                  {sessions.length > 0 && (
                    <div className="flex gap-0.5 flex-wrap justify-center">
                      {sessions.map((session, idx) => (
                        <div
                          key={idx}
                          className={`w-5 h-5 rounded ${
                            programColors[session.program as keyof typeof programColors]?.color || 'bg-gray-500'
                          } text-white text-[8px] flex items-center justify-center font-bold`}
                          title={`${session.time} - ${programColors[session.program as keyof typeof programColors]?.name || session.program}`}
                        >
                          {session.program}
                        </div>
                      ))}
                    </div>
                  )}
                </button>
              );
            });
          })()}
        </div>

        {/* Llegenda */}
        <div className="mt-4 flex flex-wrap gap-3 text-xs">
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
        </div>
      </NeoCard>

      <DayInfoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        date={selectedDate}
        sessions={selectedDate ? getSessionsForDate(selectedDate) : []}
      />
    </div>
  );
};

export default Index;
