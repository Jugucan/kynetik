import { NeoCard } from "@/components/NeoCard";
import { Dumbbell, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const Programs = () => {
  const mockPrograms = [
    {
      id: 1,
      name: "BodyPump",
      code: "BP",
      color: "bg-red-500",
      activeSubprogram: "BP 120",
      activeDays: 45,
    },
    {
      id: 2,
      name: "BodyCombat",
      code: "BC",
      color: "bg-orange-500",
      activeSubprogram: "BC 95",
      activeDays: 30,
    },
    {
      id: 3,
      name: "BodyBalance",
      code: "BB",
      color: "bg-green-500",
      activeSubprogram: "BB 105",
      activeDays: 60,
    },
    {
      id: 4,
      name: "Sh'Bam",
      code: "SB",
      color: "bg-pink-500",
      activeSubprogram: "SB 50",
      activeDays: 20,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Dumbbell className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Programes</h1>
            <p className="text-muted-foreground">Gestió dels programes i subprogrames</p>
          </div>
        </div>
        <Button className="shadow-neo hover:shadow-neo-sm gap-2">
          <Plus className="w-4 h-4" />
          Nou programa
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {mockPrograms.map((program) => (
          <NeoCard key={program.id} className="cursor-pointer hover:shadow-neo-lg transition-all">
            <div className="flex items-start gap-4">
              <div className={`w-16 h-16 ${program.color} rounded-xl shadow-neo flex items-center justify-center text-white font-bold text-xl`}>
                {program.code}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-1">{program.name}</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Subprograma actiu: <span className="text-primary font-medium">{program.activeSubprogram}</span>
                </p>
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1 rounded-full shadow-neo-inset text-sm">
                    {program.activeDays} dies actiu
                  </div>
                </div>
              </div>
            </div>
          </NeoCard>
        ))}
      </div>
    </div>
  );
};

export default Programs;
