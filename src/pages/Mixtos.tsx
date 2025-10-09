import { NeoCard } from "@/components/NeoCard";
import { Shuffle, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

const Mixtos = () => {
  const mockTracks = [
    { id: 1, program: "BP", name: "Escalfament", position: 1, favorite: true },
    { id: 2, program: "BP", name: "Squats", position: 2, favorite: true },
    { id: 3, program: "BC", name: "Combat 1", position: 3, favorite: true },
    { id: 4, program: "BB", name: "Balance Flow", position: 4, favorite: true },
    { id: 5, program: "BP", name: "Estiraments", position: 10, favorite: true },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shuffle className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Mixtos</h1>
          <p className="text-muted-foreground">Crea mixes personalitzats amb els teus tracks preferits</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <NeoCard className="md:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Mix actual</h2>
          <div className="space-y-3 mb-6">
            {mockTracks.map((track, index) => (
              <div
                key={track.id}
                className="flex items-center gap-4 p-3 rounded-xl shadow-neo-inset"
              >
                <span className="text-muted-foreground font-mono text-sm w-8">{index + 1}</span>
                <div className="flex-1">
                  <p className="font-medium">{track.name}</p>
                  <p className="text-sm text-muted-foreground">{track.program}</p>
                </div>
                <Button variant="ghost" size="icon" className="shadow-neo hover:shadow-neo-sm">
                  <Play className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button className="w-full shadow-neo hover:shadow-neo-sm">
            Generar nou mix
          </Button>
        </NeoCard>

        <NeoCard>
          <h3 className="font-semibold mb-4">Estadístiques</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Tracks preferits</p>
              <p className="text-2xl font-bold text-primary">15</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Mixos creats</p>
              <p className="text-2xl font-bold text-primary">8</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Durada mitjana</p>
              <p className="text-2xl font-bold text-primary">45 min</p>
            </div>
          </div>
        </NeoCard>
      </div>
    </div>
  );
};

export default Mixtos;
