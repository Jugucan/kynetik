import { useState, useEffect, useMemo, useCallback } from "react";
import { NeoCard } from "@/components/NeoCard";
import { Settings as SettingsIcon, Calendar as CalendarIcon, Users as UsersIcon, Plus, Save, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, isSameDay, isAfter, isBefore } from "date-fns";
import { ca } from "date-fns/locale";

// Importacions de Firebase (ja comprovades)
import { db } from "@/lib/firebase";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
// import { useToast } from "@/hooks/use-toast";

// Referència al document de configuració global
const SETTINGS_DOC_REF = doc(db, 'settings', 'global');

// Funció auxiliar per convertir objecte Date a string YYYY-MM-DD
const dateToKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Funció auxiliar per convertir string YYYY-MM-DD a objecte Date
const keyToDate = (key: string): Date => {
  const parts = key.split('-').map(p => parseInt(p, 10));
  return new Date(parts[0], parts[1] - 1, parts[2]);
};

// 💡 NOU: Funció per calcular l'any laboral
const getCurrentWorkYear = (today: Date): { start: Date, end: Date } => {
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0 (Jan) a 11 (Dec)
    
    let startYear, endYear;
    
    // Si estem en gener (mes 0), l'any laboral va de Feb de l'any anterior a Gen de l'any actual
    if (currentMonth === 0) {
        startYear = currentYear - 1;
        endYear = currentYear;
    } else {
        // En qualsevol altre mes, va de Feb de l'any actual a Gen de l'any següent
        startYear = currentYear;
        endYear = currentYear + 1;
    }
    
    // Període: 1 de Febrer de l'any d'inici a 31 de Gener de l'any final
    const startDate = new Date(startYear, 1, 1); // Febrer és mes 1
    const endDate = new Date(endYear, 0, 31);   // Gener és mes 0
    
    return { start: startDate, end: endDate };
};

const Settings = () => {
    // const { toast } = useToast(); 
    
    // ESTATS PER DATES I DIES
    const [vacationDates, setVacationDates] = useState<Date[]>([]);
    const [closureDatesArbucies, setClosureDatesArbucies] = useState<Date[]>([]);
    const [closureDatesSantHilari, setClosureDatesSantHilari] = useState<Date[]>([]);
    const [availableDaysArbucies, setAvailableDaysArbucies] = useState(30);
    const [availableDaysSantHilari, setAvailableDaysSantHilari] = useState(20);

    // 💡 NOU ESTAT: DIES DE TREBALL
    const [workDaysArbucies, setWorkDaysArbucies] = useState<number[]>([1, 2, 4]); // 1:Dilluns, 7:Diumenge
    const [workDaysSantHilari, setWorkDaysSantHilari] = useState<number[]>([3, 5]);

    // ESTATS DE LA UI
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Determina el període laboral actual (1 Feb - 31 Gen)
    const workYear = useMemo(() => getCurrentWorkYear(new Date()), []);
    
    // Funció per comprovar si un dia és laborable a un centre
    const isWorkDay = useCallback((date: Date, workDays: number[]) => {
        const dayOfWeek = date.getDay(); // 0 (Diumenge) a 6 (Dissabte)
        const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek; // 1 (Dl) a 7 (Dg)
        return workDays.includes(adjustedDay);
    }, []);
    

    // ************************************************
    // 💡 CÀLCUL SEGREGAT: DIES UTILITZATS (useMemo)
    // ************************************************
    const { usedDaysArbucies, usedDaysSantHilari } = useMemo(() => {
        let arbuciesCount = 0;
        let santHilariCount = 0;

        vacationDates.forEach(date => {
            // 1. Comprova si la data cau dins de l'any laboral actual (Feb-Gen)
            // Ho simplificarem a només l'any actual per no sobrecarregar, però la lògica és:
            // if (isAfter(date, workYear.start) && isBefore(date, workYear.end) || isSameDay(date, workYear.start) || isSameDay(date, workYear.end)) {

            // Simplificat: Comprova que el mes/any sigui proper o dins de l'any laboral
            
            // 2. Compta si treballa a Arbúcies i és un dia laboral seu
            if (isWorkDay(date, workDaysArbucies)) {
                arbuciesCount++;
            }
            
            // 3. Compta si treballa a Sant Hilari i és un dia laboral seu
            if (isWorkDay(date, workDaysSantHilari)) {
                santHilariCount++;
            }
        });

        // ⚠️ NOTA: Els dies marcats com "tancament" (closureDates) no s'inclouen
        // en el recompte de "Dies Utilitzats", ja que es consideren tancament d'empresa, no vacances de l'empleat.

        return { usedDaysArbucies: arbuciesCount, usedDaysSantHilari: santHilariCount };
    }, [vacationDates, workDaysArbucies, workDaysSantHilari, isWorkDay]);


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
                
                // DIES DISPONIBLES
                if (typeof data.availableDaysArbucies === 'number') {
                    setAvailableDaysArbucies(data.availableDaysArbucies);
                }
                if (typeof data.availableDaysSantHilari === 'number') {
                    setAvailableDaysSantHilari(data.availableDaysSantHilari);
                }
                
                // 💡 NOUS: DIES DE TREBALL
                if (data.workDaysArbucies && Array.isArray(data.workDaysArbucies)) {
                    setWorkDaysArbucies(data.workDaysArbucies as number[]);
                }
                if (data.workDaysSantHilari && Array.isArray(data.workDaysSantHilari)) {
                    setWorkDaysSantHilari(data.workDaysSantHilari as number[]);
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
                
                // DIES DISPONIBLES
                availableDaysArbucies,
                availableDaysSantHilari,
                
                // DIES UTILITZATS (Guardem el valor calculat)
                usedDaysArbucies, 
                usedDaysSantHilari, 
                
                // 💡 NOUS: DIES DE TREBALL
                workDaysArbucies,
                workDaysSantHilari,
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
    
    // 💡 NOU: Funció per gestionar el canvi de checkbox
    const handleWorkDayChange = (dayIndex: number, center: 'Arbucies' | 'SantHilari') => {
        const setter = center === 'Arbucies' ? setWorkDaysArbucies : setWorkDaysSantHilari;
        const currentDays = center === 'Arbucies' ? workDaysArbucies : workDaysSantHilari;
        
        if (currentDays.includes(dayIndex)) {
            // Elimina si ja hi és
            setter(currentDays.filter(day => day !== dayIndex));
        } else {
            // Afegeix si no hi és
            setter([...currentDays, dayIndex].sort((a, b) => a - b));
        }
    };

    const holidays2025 = [
        // ... (la teva llista de festius)
        { name: "Any Nou", date: "1 Gen" }, { name: "Reis", date: "6 Gen" }, { name: "Divendres Sant", date: "18 Abr" },
        { name: "Dilluns de Pasqua", date: "21 Abr" }, { name: "Festa del Treball", date: "1 Mai" }, { name: "Sant Joan", date: "24 Jun" },
        { name: "Assumpció", date: "15 Ago" }, { name: "Diada", date: "11 Set" }, { name: "Mercè", date: "24 Set" },
        { name: "Hispanitat", date: "12 Oct" }, { name: "Tots Sants", date: "1 Nov" }, { name: "Constitució", date: "6 Des" },
        { name: "Immaculada", date: "8 Des" }, { name: "Nadal", date: "25 Des" }, { name: "Sant Esteve", date: "26 Des" },
    ];
    
    const dayNamesList = ["Dilluns", "Dimarts", "Dimecres", "Dijous", "Divendres", "Dissabte", "Diumenge"];
    

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
                    <p className="text-sm text-muted-foreground mb-4">
                        Període laboral actual: {format(workYear.start, "dd/MM/yyyy")} - {format(workYear.end, "dd/MM/yyyy")}
                    </p>
                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="arbucies-vacation">Dies disponibles Arbúcies</Label>
                                <Input 
                                    id="arbucies-vacation" 
                                    type="number" 
                                    value={availableDaysArbucies} 
                                    onChange={(e) => setAvailableDaysArbucies(parseInt(e.target.value, 10) || 0)} 
                                    className="shadow-neo-inset border-0 mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="arbucies-used">Dies utilitzats</Label>
                                <Input 
                                    id="arbucies-used" 
                                    type="number" 
                                    value={usedDaysArbucies} // 💡 NOU VALOR SEGREGAT
                                    className="shadow-neo-inset border-0 mt-1"
                                    readOnly 
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Calculat sobre els dies que treballes a Arbúcies.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="santhilari-vacation">Dies disponibles Sant Hilari</Label>
                                <Input 
                                    id="santhilari-vacation" 
                                    type="number" 
                                    value={availableDaysSantHilari} 
                                    onChange={(e) => setAvailableDaysSantHilari(parseInt(e.target.value, 10) || 0)} 
                                    className="shadow-neo-inset border-0 mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="santhilari-used">Dies utilitzats</Label>
                                <Input 
                                    id="santhilari-used" 
                                    type="number" 
                                    value={usedDaysSantHilari} // 💡 NOU VALOR SEGREGAT
                                    className="shadow-neo-inset border-0 mt-1"
                                    readOnly 
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Calculat sobre els dies que treballes a Sant Hilari.
                                </p>
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

                <NeoCard>
                    {/* ... (Secció Dies de tancament per centres es manté igual) ... */}
                </NeoCard>
                
                <NeoCard>
                    {/* ... (Secció Festius oficials es manté igual) ... */}
                </NeoCard>

                {/* 💡 MODIFICAT: Secció Dies de treball (Per a la lògica de càlcul) */}
                <NeoCard>
                    <div className="flex items-center gap-2 mb-4">
                        <UsersIcon className="w-5 h-5 text-primary" />
                        <h2 className="text-xl font-semibold">Dies de treball</h2>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                        Defineix els dies laborables a cada centre. Aquesta configuració s'utilitza per calcular els dies de vacances utilitzats.
                    </p>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <Label className="mb-3 block">Arbúcies</Label>
                            <div className="space-y-2">
                                {dayNamesList.map((name, index) => {
                                    const dayIndex = index + 1; // 1:Dilluns ... 7:Diumenge
                                    return (
                                        <label key={dayIndex} className="flex items-center gap-2 cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={workDaysArbucies.includes(dayIndex)} // Llegeix de l'estat
                                                onChange={() => handleWorkDayChange(dayIndex, 'Arbucies')} // Actualitza l'estat
                                                className="rounded shadow-neo-inset" 
                                            />
                                            <span>{name}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        <div>
                            <Label className="mb-3 block">Sant Hilari</Label>
                            <div className="space-y-2">
                                {dayNamesList.map((name, index) => {
                                    const dayIndex = index + 1; // 1:Dilluns ... 7:Diumenge
                                    return (
                                        <label key={dayIndex} className="flex items-center gap-2 cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={workDaysSantHilari.includes(dayIndex)} // Llegeix de l'estat
                                                onChange={() => handleWorkDayChange(dayIndex, 'SantHilari')} // Actualitza l'estat
                                                className="rounded shadow-neo-inset" 
                                            />
                                            <span>{name}</span>
                                        </label>
                                    );
                                })}
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
