import { useState, useEffect, useMemo } from "react";
import { NeoCard } from "@/components/NeoCard";
import { Settings as SettingsIcon, Calendar as CalendarIcon, Users as UsersIcon, Plus, Save, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ca } from "date-fns/locale";

// Importacions de Firebase (ja comprovades)
import { db } from "@/lib/firebase";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
// import { useToast } from "@/hooks/use-toast"; // Descomenta si fas servir `useToast`

// Referència al document de configuració global
const SETTINGS_DOC_REF = doc(db, 'settings', 'global');

// Funció auxiliar per convertir objecte Date a string YYYY-MM-DD (Ja la tenies)
const dateToKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Funció auxiliar per convertir string YYYY-MM-DD a objecte Date (Ja la tenies)
const keyToDate = (key: string): Date => {
  const parts = key.split('-').map(p => parseInt(p, 10));
  return new Date(parts[0], parts[1] - 1, parts[2]);
};


const Settings = () => {
    // const { toast } = useToast(); 
    
    // ESTATS PER LES DATES DE VACANCES/TANCAMENT
    const [vacationDates, setVacationDates] = useState<Date[]>([]);
    const [closureDatesArbucies, setClosureDatesArbucies] = useState<Date[]>([]);
    const [closureDatesSantHilari, setClosureDatesSantHilari] = useState<Date[]>([]);
    
    // 💡 NOU ESTAT: DIES DISPONIBLES PER CENTRE
    const [availableDaysArbucies, setAvailableDaysArbucies] = useState(30);
    const [availableDaysSantHilari, setAvailableDaysSantHilari] = useState(20);

    // ESTATS DE LA UI
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    
    // ************************************************
    // 💡 NOU CÀLCUL: DIES UTILITZATS (Càlcul automàtic)
    // ************************************************
    const usedDays = useMemo(() => {
        // Simplement comptem el nombre de dies seleccionats al calendari de vacances
        return vacationDates.length;
    }, [vacationDates]);


    // ************************************************
    // CÀRREGA DE DADES (READ) de Firebase
    // ************************************************
    useEffect(() => {
        const unsubscribe = onSnapshot(SETTINGS_DOC_REF, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                
                // DATES DE TANCAMENT
                if (data.vacations && Array.isArray(data.vacations)) {
                    setVacationDates((data.vacations as string[]).map(keyToDate));
                }
                if (data.closuresArbucies && Array.isArray(data.closuresArbucies)) {
                    setClosureDatesArbucies((data.closuresArbucies as string[]).map(keyToDate));
                }
                if (data.closuresSantHilari && Array.isArray(data.closuresSantHilari)) {
                    setClosureDatesSantHilari((data.closuresSantHilari as string[]).map(keyToDate));
                }
                
                // 💡 NOUS: DIES DISPONIBLES
                if (typeof data.availableDaysArbucies === 'number') {
                    setAvailableDaysArbucies(data.availableDaysArbucies);
                }
                if (typeof data.availableDaysSantHilari === 'number') {
                    setAvailableDaysSantHilari(data.availableDaysSantHilari);
                }
            } else {
                console.log("Document de configuració no trobat. Utilitzant valors per defecte.");
            }
            setIsLoading(false);
        }, (error) => {
            console.error("Error al carregar la configuració:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []); 

    
    // ************************************************
    // FUNCIÓ per GUARDAR DADES (WRITE) a Firebase
    // ************************************************
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            // Converteix les dates a strings
            const processedVacations = vacationDates.map(dateToKey);
            const processedClosuresArbucies = closureDatesArbucies.map(dateToKey);
            const processedClosuresSantHilari = closureDatesSantHilari.map(dateToKey);

            const dataToSave = {
                // DATES
                vacations: processedVacations, 
                closuresArbucies: processedClosuresArbucies, 
                closuresSantHilari: processedClosuresSantHilari,
                
                // 💡 NOUS: DIES DISPONIBLES
                availableDaysArbucies,
                availableDaysSantHilari,
                
                // 💡 NOU: DIES UTILITZATS (Guardem el valor calculat)
                usedDays, 
            };

            await setDoc(SETTINGS_DOC_REF, dataToSave, { merge: true });

            // toast({ title: "Guardat!", description: "La configuració s'ha actualitzada.", });
            console.log("Configuració guardada correctament!");
            
        } catch (error) {
            console.error("Error al guardar a Firebase:", error);
            // toast({ title: "Error al guardar", description: "Hi ha hagut un error.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };
    
    // Funció per eliminar una data de la llista (es manté)
    const handleRemoveDate = (dateToRemove: Date, setter: React.Dispatch<React.SetStateAction<Date[]>>, currentDates: Date[]) => {
        setter(currentDates.filter(date => date.getTime() !== dateToRemove.getTime()));
    };


    const holidays2025 = [
        // ... (la teva llista de festius)
        { name: "Any Nou", date: "1 Gen" }, { name: "Reis", date: "6 Gen" }, { name: "Divendres Sant", date: "18 Abr" },
        { name: "Dilluns de Pasqua", date: "21 Abr" }, { name: "Festa del Treball", date: "1 Mai" }, { name: "Sant Joan", date: "24 Jun" },
        { name: "Assumpció", date: "15 Ago" }, { name: "Diada", date: "11 Set" }, { name: "Mercè", date: "24 Set" },
        { name: "Hispanitat", date: "12 Oct" }, { name: "Tots Sants", date: "1 Nov" }, { name: "Constitució", date: "6 Des" },
        { name: "Immaculada", date: "8 Des" }, { name: "Nadal", date: "25 Des" }, { name: "Sant Esteve", date: "26 Des" },
    ];
    
    
    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Carregant configuració des de Firebase...
            </div>
        );
    }


    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <SettingsIcon className="w-8 h-8 text-primary" />
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Configuració</h1>
                    <p className="text-muted-foreground">Gestiona vacances, dies de tancament i més</p>
                </div>
            </div>

            <form onSubmit={handleSave} className="grid gap-6"> 
                
                <NeoCard>
                    <div className="flex items-center gap-2 mb-4">
                        <CalendarIcon className="w-5 h-5 text-primary" />
                        <h2 className="text-xl font-semibold">Dies de vacances generals</h2>
                    </div>
                    
                    {/* INPUTS DE DIES DISPONIBLES I UTILITZATS */}
                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="arbucies-vacation">Dies disponibles Arbúcies</Label>
                                <Input 
                                    id="arbucies-vacation" 
                                    type="number" 
                                    value={availableDaysArbucies} // 💡 Llegeix de l'estat
                                    onChange={(e) => setAvailableDaysArbucies(parseInt(e.target.value, 10) || 0)} // 💡 Actualitza l'estat
                                    className="shadow-neo-inset border-0 mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="arbucies-used">Dies utilitzats</Label>
                                <Input 
                                    id="arbucies-used" 
                                    type="number" 
                                    value={usedDays} // 💡 VALOR CALCULAT
                                    className="shadow-neo-inset border-0 mt-1"
                                    readOnly // No es pot editar, es calcula
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="santhilari-vacation">Dies disponibles Sant Hilari</Label>
                                <Input 
                                    id="santhilari-vacation" 
                                    type="number" 
                                    value={availableDaysSantHilari} // 💡 Llegeix de l'estat
                                    onChange={(e) => setAvailableDaysSantHilari(parseInt(e.target.value, 10) || 0)} // 💡 Actualitza l'estat
                                    className="shadow-neo-inset border-0 mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="santhilari-used">Dies utilitzats</Label>
                                <Input 
                                    id="santhilari-used" 
                                    type="number" 
                                    value={usedDays} // 💡 VALOR CALCULAT
                                    className="shadow-neo-inset border-0 mt-1"
                                    readOnly // No es pot editar, es calcula
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label>Seleccionar període de vacances</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full shadow-neo hover:shadow-neo-sm justify-start" disabled={isSaving}>
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
                        
                        {/* Llista de dates seleccionades */}
                        {vacationDates.length > 0 && (
                            <div className="p-3 rounded-xl shadow-neo-inset">
                                <p className="text-sm font-medium mb-2">Dies seleccionats: {vacationDates.length}</p>
                                <div className="flex flex-wrap gap-2">
                                    {vacationDates.map((date, i) => (
                                        <span 
                                            key={i} 
                                            className="text-xs px-2 py-1 rounded-full shadow-neo bg-blue-500/10 text-blue-700 flex items-center gap-1 cursor-pointer hover:bg-red-500/20 transition-colors"
                                            onClick={() => handleRemoveDate(date, setVacationDates, vacationDates)}
                                        >
                                            {format(date, "dd MMM", { locale: ca })}
                                            <X className="h-3 w-3" />
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </NeoCard>

                {/* ... (La secció de tancaments per centre es manté igual) ... */}
                <NeoCard>
                    <div className="flex items-center gap-2 mb-4">
                        <CalendarIcon className="w-5 h-5 text-destructive" />
                        <h2 className="text-xl font-semibold">Dies de tancament per centres</h2>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <Label className="mb-2 block">Arbúcies</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full shadow-neo hover:shadow-neo-sm justify-start" disabled={isSaving}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Afegir dies de tancament Arbúcies
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="multiple"
                                        selected={closureDatesArbucies}
                                        onSelect={(dates) => setClosureDatesArbucies(dates || [])}
                                        locale={ca}
                                        className="rounded-md border shadow-neo"
                                    />
                                </PopoverContent>
                            </Popover>
                            {closureDatesArbucies.length > 0 && (
                                <div className="p-3 mt-2 rounded-xl shadow-neo-inset">
                                    <p className="text-sm font-medium mb-2">Tancaments Arbúcies: {closureDatesArbucies.length}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {closureDatesArbucies.map((date, i) => (
                                            <span 
                                                key={i} 
                                                className="text-xs px-2 py-1 rounded-full shadow-neo bg-gray-500/10 text-gray-700 flex items-center gap-1 cursor-pointer hover:bg-red-500/20 transition-colors"
                                                onClick={() => handleRemoveDate(date, setClosureDatesArbucies, closureDatesArbucies)}
                                            >
                                                {format(date, "dd MMM", { locale: ca })}
                                                <X className="h-3 w-3" />
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div>
                            <Label className="mb-2 block">Sant Hilari</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full shadow-neo hover:shadow-neo-sm justify-start" disabled={isSaving}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Afegir dies de tancament Sant Hilari
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="multiple"
                                        selected={closureDatesSantHilari}
                                        onSelect={(dates) => setClosureDatesSantHilari(dates || [])}
                                        locale={ca}
                                        className="rounded-md border shadow-neo"
                                    />
                                </PopoverContent>
                            </Popover>
                            {closureDatesSantHilari.length > 0 && (
                                <div className="p-3 mt-2 rounded-xl shadow-neo-inset">
                                    <p className="text-sm font-medium mb-2">Tancaments Sant Hilari: {closureDatesSantHilari.length}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {closureDatesSantHilari.map((date, i) => (
                                            <span 
                                                key={i} 
                                                className="text-xs px-2 py-1 rounded-full shadow-neo bg-gray-500/10 text-gray-700 flex items-center gap-1 cursor-pointer hover:bg-red-500/20 transition-colors"
                                                onClick={() => handleRemoveDate(date, setClosureDatesSantHilari, closureDatesSantHilari)}
                                            >
                                                {format(date, "dd MMM", { locale: ca })}
                                                <X className="h-3 w-3" />
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </NeoCard>
                
                {/* ... (La secció de Festius Oficials es manté igual) ... */}
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

                {/* ... (La secció de Dies de treball es manté igual) ... */}
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

                {/* BOTÓ DE GUARDAR */}
                <div className="flex justify-end">
                    <Button 
                        type="submit" 
                        disabled={isSaving}
                        className="shadow-neo hover:shadow-neo-sm"
                    >
                        {isSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                            <Save className="h-4 w-4 mr-2" />
                        )}
                        {isSaving ? "Desant..." : "Desar canvis"}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default Settings;
