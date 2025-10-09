import { NeoCard } from "@/components/NeoCard";
import { Shuffle, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Mixtos = () => {
  const programs = [
    { code: "BP", name: "BodyPump", color: "bg-red-500" },
    { code: "BC", name: "BodyCombat", color: "bg-orange-500" },
    { code: "BB", name: "BodyBalance", color: "bg-green-500" },
    { code: "SB", name: "Sh'Bam", color: "bg-pink-500" },
  ];

  const mockTracks = {
    BP: [
      { id: 1, name: "Escalfament", position: 1 },
      { id: 2, name: "Squats", position: 2 },
      { id: 3, name: "Pit", position: 3 },
      { id: 10, name: "Estiraments", position: 10 },
    ],
    BC: [
      { id: 11, name: "Escalfament", position: 1 },
      { id: 12, name: "Combat 1", position: 2 },
      { id: 13, name: "Combat 2", position: 3 },
      { id: 20, name: "Estiraments", position: 10 },
    ],
    BB: [
      { id: 21, name: "Inici", position: 1 },
      { id: 22, name: "Flow 1", position: 2 },
      { id: 30, name: "Relaxació", position: 10 },
    ],
    SB: [
      { id: 31, name: "Warm up", position: 1 },
      { id: 32, name: "Dance 1", position: 2 },
      { id: 40, name: "Cool down", position: 10 },
    ],
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shuffle className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Mixtos</h1>
          <p className="text-muted-foreground">Crea mixes personalitzats per cada programa</p>
        </div>
      </div>

      <Tabs defaultValue="BP" className="space-y-6">
        <TabsList className="shadow-neo">
          {programs.map((program) => (
            <TabsTrigger key={program.code} value={program.code}>
              <div className={`w-6 h-6 ${program.color} rounded mr-2 shadow-neo`}></div>
              {program.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {programs.map((program) => (
          <TabsContent key={program.code} value={program.code}>
            <div className="grid md:grid-cols-3 gap-6">
              <NeoCard className="md:col-span-2">
                <h2 className="text-xl font-semibold mb-4">Mix de {program.name}</h2>
                <div className="space-y-3 mb-6">
                  {mockTracks[program.code as keyof typeof mockTracks].map((track, index) => (
                    <div
                      key={track.id}
                      className="flex items-center gap-4 p-3 rounded-xl shadow-neo-inset"
                    >
                      <span className="text-muted-foreground font-mono text-sm w-8">{index + 1}</span>
                      <div className="flex-1">
                        <p className="font-medium">{track.name}</p>
                        <p className="text-sm text-muted-foreground">Posició: {track.position}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="shadow-neo hover:shadow-neo-sm">
                        <Play className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button className="w-full shadow-neo hover:shadow-neo-sm">
                  Generar nou mix de {program.name}
                </Button>
              </NeoCard>

              <NeoCard>
                <h3 className="font-semibold mb-4">Estadístiques {program.code}</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Tracks preferits</p>
                    <p className="text-2xl font-bold text-primary">{mockTracks[program.code as keyof typeof mockTracks].length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Mixos creats</p>
                    <p className="text-2xl font-bold text-primary">5</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Durada mitjana</p>
                    <p className="text-2xl font-bold text-primary">45 min</p>
                  </div>
                </div>
              </NeoCard>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default Mixtos;
