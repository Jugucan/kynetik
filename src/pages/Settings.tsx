import { NeoCard } from "@/components/NeoCard";
import { Settings as SettingsIcon, Calendar, Users as UsersIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const Settings = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <SettingsIcon className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Configuració</h1>
          <p className="text-muted-foreground">Gestiona vacances, dies de tancament i més</p>
        </div>
      </div>

      <div className="grid gap-6">
        <NeoCard>
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Dies de vacances</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="arbucies-vacation">Dies disponibles Arbúcies</Label>
                <Input 
                  id="arbucies-vacation" 
                  type="number" 
                  placeholder="30"
                  className="shadow-neo-inset border-0 mt-1"
                />
              </div>
              <div>
                <Label htmlFor="arbucies-used">Dies utilitzats</Label>
                <Input 
                  id="arbucies-used" 
                  type="number" 
                  value="5"
                  className="shadow-neo-inset border-0 mt-1"
                  readOnly
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="santhilari-vacation">Dies disponibles Sant Hilari</Label>
                <Input 
                  id="santhilari-vacation" 
                  type="number" 
                  placeholder="20"
                  className="shadow-neo-inset border-0 mt-1"
                />
              </div>
              <div>
                <Label htmlFor="santhilari-used">Dies utilitzats</Label>
                <Input 
                  id="santhilari-used" 
                  type="number" 
                  value="3"
                  className="shadow-neo-inset border-0 mt-1"
                  readOnly
                />
              </div>
            </div>
          </div>
        </NeoCard>

        <NeoCard>
          <div className="flex items-center gap-2 mb-4">
            <UsersIcon className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Dies de treball</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label className="mb-3 block">Arbúcies</Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded shadow-neo-inset" />
                  <span>Dilluns</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded shadow-neo-inset" />
                  <span>Dimarts</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded shadow-neo-inset" />
                  <span>Dijous</span>
                </label>
              </div>
            </div>

            <div>
              <Label className="mb-3 block">Sant Hilari</Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded shadow-neo-inset" />
                  <span>Dimecres</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded shadow-neo-inset" />
                  <span>Divendres</span>
                </label>
              </div>
            </div>
          </div>
        </NeoCard>

        <div className="flex justify-end">
          <Button className="shadow-neo hover:shadow-neo-sm">
            Desar canvis
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
