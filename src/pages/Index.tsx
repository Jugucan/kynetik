import { NeoCard } from "@/components/NeoCard";
import { Calendar, Users, TrendingUp, Cake, PartyPopper } from "lucide-react";

const Index = () => {
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
