import { NeoCard } from "@/components/NeoCard";
import { Settings as SettingsIcon, Calendar as CalendarIcon, Users as UsersIcon, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ca } from "date-fns/locale";
import { useState } from "react";

const Settings = () => {
  const [vacationDates, setVacationDates] = useState<Date[]>([]);
  const [closureDates, setClosureDates] = useState<{ center: string; dates: Date[] }[]>([]);

  const holidays2025 = [
    { name: "Any Nou", date: "1 Gen" },
    { name: "Reis", date: "6 Gen" },
    { name: "Divendres Sant", date: "18 Abr" },
    { name: "Dilluns de Pasqua", date: "21 Abr" },
    { name: "Festa del Treball", date: "1 Mai" },
    { name: "Sant Joan", date: "24 Jun" },
    { name: "Assumpció", date: "15 Ago" },
    { name: "Diada", date: "11 Set" },
    { name: "Mercè", date: "24 Set" },
    { name: "Hispanitat", date: "12 Oct" },
    { name: "Tots Sants", date: "1 Nov" },
    { name: "Constitució", date: "6 Des" },
    { name: "Immaculada", date: "8 Des" },
    { name: "Nadal", date: "25 Des" },
    { name: "Sant Esteve", date: "26 Des" },
  ];

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
            <CalendarIcon className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Dies de vacances</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="arbucies-vacation">Dies disponibles Arbúcies</Label>
                <Input 
                  id="arbucies-vacation" 
                  type="number" 
                  defaultValue="30"
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
                  defaultValue="20"
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

          <div className="space-y-3">
            <Label>Seleccionar període de vacances</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full shadow-neo hover:shadow-neo-sm justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  Afegir vacances
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="multiple"
                  selected={vacationDates}
                  onSelect={(dates) => setVacationDates(dates || [])}
                  locale={ca}
                  className="rounded-md border shadow-neo"
                />
              </PopoverContent>
            </Popover>
            
            {vacationDates.length > 0 && (
              <div className="p-3 rounded-xl shadow-neo-inset">
                <p className="text-sm font-medium mb-2">Dies seleccionats: {vacationDates.length}</p>
                <div className="flex flex-wrap gap-2">
                  {vacationDates.map((date, i) => (
                    <span key={i} className="text-xs px-2 py-1 rounded-full shadow-neo">
                      {format(date, "dd MMM", { locale: ca })}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </NeoCard>

        <NeoCard>
          <div className="flex items-center gap-2 mb-4">
            <CalendarIcon className="w-5 h-5 text-destructive" />
            <h2 className="text-xl font-semibold">Dies de tancament</h2>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Arbúcies</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full shadow-neo hover:shadow-neo-sm justify-start">
                    <Plus className="mr-2 h-4 w-4" />
                    Afegir dies de tancament
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="multiple"
                    locale={ca}
                    className="rounded-md border shadow-neo"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label className="mb-2 block">Sant Hilari</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full shadow-neo hover:shadow-neo-sm justify-start">
                    <Plus className="mr-2 h-4 w-4" />
                    Afegir dies de tancament
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="multiple"
                    locale={ca}
                    className="rounded-md border shadow-neo"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </NeoCard>

        <NeoCard>
          <div className="flex items-center gap-2 mb-4">
            <CalendarIcon className="w-5 h-5 text-accent" />
            <h2 className="text-xl font-semibold">Festius oficials 2025</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {holidays2025.map((holiday, index) => (
              <div key={index} className="p-3 rounded-xl shadow-neo-inset">
                <p className="font-medium">{holiday.name}</p>
                <p className="text-sm text-muted-foreground">{holiday.date}</p>
              </div>
            ))}
          </div>
        </NeoCard>

        <NeoCard>
          <div className="flex items-center gap-2 mb-4">
            <UsersIcon className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Dies de treball</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Selecciona els dies que treballes a cada centre. Pots treballar el mateix dia en ambdós centres.</p>

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
                  <input type="checkbox" className="rounded shadow-neo-inset" />
                  <span>Dimecres</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded shadow-neo-inset" />
                  <span>Dijous</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded shadow-neo-inset" />
                  <span>Divendres</span>
                </label>
              </div>
            </div>

            <div>
              <Label className="mb-3 block">Sant Hilari</Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded shadow-neo-inset" />
                  <span>Dilluns</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded shadow-neo-inset" />
                  <span>Dimarts</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded shadow-neo-inset" />
                  <span>Dimecres</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded shadow-neo-inset" />
                  <span>Dijous</span>
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
