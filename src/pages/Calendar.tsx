import { NeoCard } from "@/components/NeoCard";
import { Calendar as CalendarIcon } from "lucide-react";

const Calendar = () => {
  const currentMonth = new Date().toLocaleDateString("ca-ES", { 
    month: "long", 
    year: "numeric" 
  });

  // Simulació de dies del mes
  const daysInMonth = Array.from({ length: 31 }, (_, i) => i + 1);
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
            {daysInMonth.map((day) => (
              <button
                key={day}
                className="aspect-square rounded-xl shadow-neo hover:shadow-neo-sm transition-all flex items-center justify-center font-medium"
              >
                {day}
              </button>
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
    </div>
  );
};

export default Calendar;
