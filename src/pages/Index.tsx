import { NeoCard } from "@/components/NeoCard";
import { Calendar, Users, TrendingUp, Cake } from "lucide-react";

const Index = () => {
  const activePrograms = [
    { name: "BodyPump 120", code: "BP", days: 45, color: "bg-red-500" },
    { name: "BodyCombat 95", code: "BC", days: 30, color: "bg-orange-500" },
    { name: "BodyBalance 105", code: "BB", days: 60, color: "bg-green-500" },
  ];

  const upcomingBirthdays = [
    { name: "Maria García", date: "15 Mar", isPast: false },
    { name: "Joan Martínez", date: "18 Mar", isPast: false },
    { name: "Anna López", date: "22 Mar", isPast: false },
  ];

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
              className="flex items-center justify-between p-3 rounded-xl shadow-neo-inset"
            >
              <span className="font-medium">{birthday.name}</span>
              <span className="text-sm text-primary">{birthday.date}</span>
            </div>
          ))}
        </div>
      </NeoCard>

      {/* Mini calendari */}
      <NeoCard>
        <h2 className="text-xl font-semibold mb-4">Calendari del mes</h2>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 31 }, (_, i) => (
            <div
              key={i}
              className="aspect-square rounded-lg shadow-neo hover:shadow-neo-sm transition-all flex items-center justify-center text-sm font-medium cursor-pointer"
            >
              {i + 1}
            </div>
          ))}
        </div>
      </NeoCard>
    </div>
  );
};

export default Index;
