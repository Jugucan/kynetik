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

// Estructura per a guardar dates amb el motiu
interface DateWithReason {
    date: Date;
    reason: string;
}

// Funció auxiliar per convertir objecte Date a string YYYY-MM-DD
const dateToKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Funció auxiliar per convertir string YYYY-MM-DD a objecte Date
// 💡 IMPORTANT: Hem eliminat el 'console.warn' per netejar la consola.
const keyToDate = (key: string): Date | null => {
  if (typeof key !== 'string') return null;
    
  const parts = key.split('-').map(p => parseInt(p, 10));
  
  // 1. Validació bàsica de format
  if (parts.length < 3 || parts.some(isNaN)) {
      return null;
  }
  
  // Creeem la data (local time: YYYY, MM-1, DD)
  const date = new Date(parts[0], parts[1] - 1, parts[2]); 

  // 2. Validació si la Date és vàlida (getTime() retorna NaN si és Invalid Date)
  if (isNaN(date.getTime())) {
    return null;
  }
  return date;
};

// Funció per calcular l'any laboral (1 Feb - 31 Gen)
const getCurrentWorkYear = (today: Date): { start: Date, end: Date } => {
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0 (Jan) a 11 (Dec)
    
    let startYear, endYear;
    
    if (currentMonth === 0) {
        startYear = currentYear - 1;
        endYear = currentYear;
    } else {
        startYear = currentYear;
        endYear = currentYear + 1;
    }
    
    const startDate = new Date(startYear, 1, 1); // Febrer és mes 1
    const endDate = new Date(endYear, 1, 0);   // Últim dia de Gener.
    
    return { start: startDate, end: endDate };
};

const Settings = () => {
    
    const [vacationDates, setVacationDates] = useState<DateWithReason[]>([]);
    const [closureDatesArbucies, setClosureDatesArbucies] = useState<DateWithReason[]>([]);
    const [closureDatesSantHilari, setClosureDatesSantHilari] = useState<DateWithReason[]>([]);
    
    const [currentReason, setCurrentReason] = useState('');
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [currentCenterClosure, setCurrentCenterClosure] = useState<'Arbucies' | 'SantHilari' | 'Vacation' | null>(null);

    const [availableDaysArbucies, setAvailableDaysArbucies] = useState(30);
    const [availableDaysSantHilari, setAvailableDaysSantHilari] = useState(20);

    const [workDaysArbucies, setWorkDaysArbucies] = useState<number[]>([1, 2, 4]); 
    const [workDaysSantHilari, setWorkDaysSantHilari] = useState<number[]>([3, 5]);

    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const workYear = useMemo(() => getCurrentWorkYear(new Date()), []);
    
    const isWorkDay = useCallback((date: Date, workDays: number[]) => {
        const dayOfWeek = date.getDay(); 
        const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek; 
        return workDays.includes(adjustedDay);
    }, []);
    
    const { usedDaysArbucies, usedDaysSantHilari } = useMemo(() => {
        let arbuciesCount = 0;
        let santHilariCount = 0;

        vacationDates.forEach(({ date }) => {
            const isWithinWorkYear = (
                (isAfter(date, workYear.start) || isSameDay(date, workYear.start)) && 
                (isBefore(date, workYear.end) || isSameDay(date, workYear.end))
            );

            if (isWithinWorkYear) {
                if (isWorkDay(date, workDaysArbucies)) {
                    arbuciesCount++;
                }
                if (isWorkDay(date, workDaysSantHilari)) {
                    santHilariCount++;
                }
            }
        });

        return { usedDaysArbucies: arbuciesCount, usedDaysSantHilari: santHilariCount };
    }, [vacationDates, workDaysArbucies, workDaysSantHilari, isWorkDay, workYear]);


    // 💡 CORRECCIÓ FINAL PER RETROCOMPATIBILITAT
    const convertToDateWithReason = (dataField: Record<string, string> | Record<string, any> | undefined): DateWithReason[] => {
        if (!dataField || typeof dataField !== 'object') return [];
        
        return Object.entries(dataField).flatMap(([key, value]) => {
            
            let date: Date | null = null;
            let reason: string = '';

            // TENTATIVA 1: Format Nou (Key és Data 'YYYY-MM-DD', Value és Motiu 'string')
            date = keyToDate(key); 
            if (date) {
                // Si la clau és una data vàlida, usem el valor com a motiu.
                reason = String(value) || ''; 
            } else if (/^\d+$/.test(key) && typeof value === 'string') {
                // TENTATIVA 2: Format Antic (Key és Índex '0', '1', '2', Value és Data 'YYYY-MM-DD')
                // Si la clau és un índex numèric i el valor és string, el valor conté la data.
                date = keyToDate(value); 
                reason = ''; // El motiu és buit per les dades antigues
            }
            
            // Si cap de les temptatives ha trobat una data vàlida, saltem l'element.
            if (!date) {
                // Si troba dades que no són ni data ni índex, les ignora (ex: metadata)
                return []; 
            }
            
            return [{ date, reason }];
        });
    };


    // ************************************************
    // CÀRREGA DE DADES (READ) de Firebase
    // ************************************************
    useEffect(() => {
        const unsubscribe = onSnapshot(SETTINGS_DOC_REF, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                
                // DATES DE TANCAMENT (Utilitza la funció corregida)
                setVacationDates(convertToDateWithReason(data.vacations));
                setClosureDatesArbucies(convertToDateWithReason(data.closuresArbucies));
                setClosureDatesSantHilari(convertToDateWithReason(data.closuresSantHilari));
                
                // DIES DISPONIBLES i DIES DE TREBALL es mantenen igual
                if (typeof data.availableDaysArbucies === 'number') {
                    setAvailableDaysArbucies(data.availableDaysArbucies);
                }
                if (typeof data.availableDaysSantHilari === 'number') {
                    setAvailableDaysSantHilari(data.availableDaysSantHilari);
                }
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
            // Totes les dades es guarden en el format NOU (Data com a clau, Motiu com a valor)
            const convertToFirebaseFormat = (datesWithReason: DateWithReason[]): Record<string, string> => {
                return datesWithReason.reduce((acc, { date, reason }) => {
                    acc[dateToKey(date)] = reason;
                    return acc;
                }, {} as Record<string, string>);
            };

            const dataToSave = {
                vacations: convertToFirebaseFormat(vacationDates), 
                closuresArbucies: convertToFirebaseFormat(closureDatesArbucies), 
                closuresSantHilari: convertToFirebaseFormat(closureDatesSantHilari),
                
                availableDaysArbucies,
                availableDaysSantHilari,
                usedDaysArbucies, 
                usedDaysSantHilari, 
                workDaysArbucies,
                workDaysSantHilari,
            };

            await setDoc(SETTINGS_DOC_REF, dataToSave, { merge: true });

            console.log("Configuració guardada correctament!");
            
        } catch (error) {
            console.error("Error al guardar a Firebase:", error);
        } finally {
            setIsSaving(false);
        }
    };
    
    // Funció per gestionar la selecció al calendari (mode multiple)
    const handleDateSelect = (selectedDates: Date[] | undefined) => {
        if (!selectedDates) return;
        
        const setter = currentCenterClosure === 'Arbucies' ? setClosureDatesArbucies 
            : currentCenterClosure === 'SantHilari' ? setClosureDatesSantHilari 
            : setVacationDates;
        const currentDates = currentCenterClosure === 'Arbucies' ? closureDatesArbucies
            : currentCenterClosure === 'SantHilari' ? closureDatesSantHilari
            : vacationDates;
            
        const currentDatesOnly = currentDates.map(d => d.date);

        // Afegeix o elimina dates
        const newDatesWithReason = selectedDates.map(newDate => {
            // Busca si la data ja existia
            const existing = currentDates.find(d => isSameDay(d.date, newDate));
            if (existing) {
                return existing; // Manté la data i el motiu existent
            }
            // Si és una data nova, l'afegeix amb el motiu actual
            return { date: newDate, reason: currentReason };
        });

        // Filtra les dates que ja no estan seleccionades
        const finalDates = newDatesWithReason.filter(d => selectedDates.some(s => isSameDay(s, d.date)));
        
        setter(finalDates);

        // Si l'usuari només ha triat una data nova, resetegem el motiu i tanquem el Popover per a la usabilitat
        if (selectedDates.length === currentDatesOnly.length + 1) {
             setCurrentReason('');
             setIsPopoverOpen(false);
        }
    };
    
    // Funció per eliminar una data de la llista (ara amb DateWithReason)
    const handleRemoveDate = (dateToRemove: Date, setter: React.Dispatch<React.SetStateAction<DateWithReason[]>>, currentDates: DateWithReason[]) => {
        setter(currentDates.filter(d => d.date.getTime() !== dateToRemove.getTime()));
    };
    
    // Funció per gestionar el canvi de checkbox (Dies de treball)
    const handleWorkDayChange = (dayIndex: number, center: 'Arbucies' | 'SantHilari') => {
        const setter = center === 'Arbucies' ? setWorkDaysArbucies : setWorkDaysSantHilari;
        const currentDays = center === 'Arbucies' ? workDaysArbucies : workDaysSantHilari;
        
        if (currentDays.includes(dayIndex)) {
            setter(currentDays.filter(day => day !== dayIndex));
        } else {
            setter([...currentDays, dayIndex].sort((a, b) => a - b));
        }
    };

    const holidays2025 = [
        { name: "Any Nou", date: "1 Gen" }, { name: "Reis", date: "6 Gen" }, { name: "Divendres Sant", date: "18 Abr" },
        { name: "Dilluns de Pasqua", date: "21 Abr" }, { name: "Festa del Treball", date: "1 Mai" }, { name: "Sant Joan", date: "24 Jun" },
        { name: "Assumpció", date: "15 Ago" }, { name: "Diada", date: "11 Set" }, { name: "Mercè", date: "24 Set" },
        { name: "Hispanitat", date: "12 Oct" }, { name: "Tots Sants", date: "1 Nov" }, { name: "Constitució", date: "6 Des" },
        { name: "Immaculada", date: "8 Des" }, { name: "Nadal", date: "25 Des" }, { name: "Sant Esteve", date: "26 Des" },
    ];
    
    const dayNamesList = ["Dilluns", "Dimarts", "Dimecres", "Dijous", "Divendres", "Dissabte", "Diumenge"];
    
    // Funció que retorna només les dates (per al Calendar)
    const getDatesOnly = (datesWithReason: DateWithReason[]): Date[] => datesWithReason.map(d => d.date);

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
                                    value={usedDaysArbucies} 
                                    className="shadow-neo-inset border-0 mt-1"
                                    readOnly 
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Calculat sobre els dies laborables (Arbúcies).
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
                                    value={usedDaysSantHilari} 
                                    className="shadow-neo-inset border-0 mt-1"
                                    readOnly 
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Calculat sobre els dies laborables (Sant Hilari).
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label>Seleccionar període de vacances generals (amb motiu)</Label>
                        <Popover open={isPopoverOpen && currentCenterClosure === 'Vacation'} onOpenChange={(open) => {
                            setIsPopoverOpen(open);
                            if (open) setCurrentCenterClosure('Vacation');
                            else setCurrentReason(''); 
                        }}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full shadow-neo hover:shadow-neo-sm justify-start" disabled={isSaving}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    Afegir vacances
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-3" align="start">
                                <div className="space-y-3 mb-3">
                                    <Label htmlFor="vacation-reason">Motiu / Nota de la sol·licitud</Label>
                                    <Input 
                                        id="vacation-reason" 
                                        value={currentReason} 
                                        onChange={(e) => setCurrentReason(e.target.value)} 
                                        placeholder="Ex: Curs de formació, viatge familiar..."
                                        className="shadow-neo-inset"
                                    />
                                </div>
                                <Calendar
                                mode="multiple"
                                selected={getDatesOnly(vacationDates)} 
                                onSelect={handleDateSelect}
                                locale={ca}
                                className="rounded-md border shadow-neo"
                                />
                            </PopoverContent>
                        </Popover>
                        
                        {/* Llista de dates seleccionades amb motiu */}
                        {vacationDates.length > 0 && (
                            <div className="p-3 rounded-xl shadow-neo-inset">
                                <p className="text-sm font-medium mb-2">Dies seleccionats: {vacationDates.length}</p>
                                <div className="flex flex-wrap gap-2">
                                    {vacationDates.map((d, i) => (
                                        <span 
                                            key={i} 
                                            className="text-xs px-2 py-1 rounded-full shadow-neo bg-blue-500/10 text-blue-700 flex items-center gap-1 cursor-pointer hover:bg-red-500/20 transition-colors group"
                                            onClick={() => handleRemoveDate(d.date, setVacationDates, vacationDates)}
                                        >
                                            {format(d.date, "dd MMM", { locale: ca })}
                                            {d.reason && (
                                                <span className="ml-1 font-normal text-blue-600/70 opacity-80 group-hover:opacity-100 transition-opacity">
                                                    ({d.reason})
                                                </span>
                                            )}
                                            <X className="h-3 w-3 ml-1" />
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
                        <h2 className="text-xl font-semibold">Dies de tancament per centres</h2>
                    </div>

                    <div className="space-y-4">
                        {/* ARBÚCIES */}
                        <div>
                            <Label className="mb-2 block">Arbúcies</Label>
                            <Popover open={isPopoverOpen && currentCenterClosure === 'Arbucies'} onOpenChange={(open) => {
                                setIsPopoverOpen(open);
                                if (open) setCurrentCenterClosure('Arbucies');
                                else setCurrentReason('');
                            }}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full shadow-neo hover:shadow-neo-sm justify-start" disabled={isSaving}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Afegir dies de tancament Arbúcies
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-3" align="start">
                                    <div className="space-y-3 mb-3">
                                        <Label htmlFor="arbucies-closure-reason">Motiu del tancament</Label>
                                        <Input 
                                            id="arbucies-closure-reason" 
                                            value={currentReason} 
                                            onChange={(e) => setCurrentReason(e.target.value)} 
                                            placeholder="Ex: Festa Major, Manteniment anual..."
                                            className="shadow-neo-inset"
                                        />
                                    </div>
                                    <Calendar
                                        mode="multiple"
                                        selected={getDatesOnly(closureDatesArbucies)}
                                        onSelect={handleDateSelect}
                                        locale={ca}
                                        className="rounded-md border shadow-neo"
                                    />
                                </PopoverContent>
                            </Popover>
                            {closureDatesArbucies.length > 0 && (
                                <div className="p-3 mt-2 rounded-xl shadow-neo-inset">
                                    <p className="text-sm font-medium mb-2">Tancaments Arbúcies: {closureDatesArbucies.length}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {closureDatesArbucies.map((d, i) => (
                                            <span 
                                                key={i} 
                                                className="text-xs px-2 py-1 rounded-full shadow-neo bg-gray-500/10 text-gray-700 flex items-center gap-1 cursor-pointer hover:bg-red-500/20 transition-colors group"
                                                onClick={() => handleRemoveDate(d.date, setClosureDatesArbucies, closureDatesArbucies)}
                                            >
                                                {format(d.date, "dd MMM", { locale: ca })}
                                                {d.reason && (
                                                    <span className="ml-1 font-normal text-gray-600/70 opacity-80 group-hover:opacity-100 transition-opacity">
                                                        ({d.reason})
                                                    </span>
                                                )}
                                                <X className="h-3 w-3 ml-1" />
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* SANT HILARI */}
                        <div>
                            <Label className="mb-2 block">Sant Hilari</Label>
                            <Popover open={isPopoverOpen && currentCenterClosure === 'SantHilari'} onOpenChange={(open) => {
                                setIsPopoverOpen(open);
                                if (open) setCurrentCenterClosure('SantHilari');
                                else setCurrentReason('');
                            }}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full shadow-neo hover:shadow-neo-sm justify-start" disabled={isSaving}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Afegir dies de tancament Sant Hilari
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-3" align="start">
                                    <div className="space-y-3 mb-3">
                                        <Label htmlFor="santhilari-closure-reason">Motiu del tancament</Label>
                                        <Input 
                                            id="santhilari-closure-reason" 
                                            value={currentReason} 
                                            onChange={(e) => setCurrentReason(e.target.value)} 
                                            placeholder="Ex: Festa Major, Manteniment anual..."
                                            className="shadow-neo-inset"
                                        />
                                    </div>
                                    <Calendar
                                        mode="multiple"
                                        selected={getDatesOnly(closureDatesSantHilari)}
                                        onSelect={handleDateSelect}
                                        locale={ca}
                                        className="rounded-md border shadow-neo"
                                    />
                                </PopoverContent>
                            </Popover>
                            {closureDatesSantHilari.length > 0 && (
                                <div className="p-3 mt-2 rounded-xl shadow-neo-inset">
                                    <p className="text-sm font-medium mb-2">Tancaments Sant Hilari: {closureDatesSantHilari.length}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {closureDatesSantHilari.map((d, i) => (
                                            <span 
                                                key={i} 
                                                className="text-xs px-2 py-1 rounded-full shadow-neo bg-gray-500/10 text-gray-700 flex items-center gap-1 cursor-pointer hover:bg-red-500/20 transition-colors group"
                                                onClick={() => handleRemoveDate(d.date, setClosureDatesSantHilari, closureDatesSantHilari)}
                                            >
                                                {format(d.date, "dd MMM", { locale: ca })}
                                                {d.reason && (
                                                    <span className="ml-1 font-normal text-gray-600/70 opacity-80 group-hover:opacity-100 transition-opacity">
                                                        ({d.reason})
                                                    </span>
                                                )}
                                                <X className="h-3 w-3 ml-1" />
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
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
                    <p className="text-sm text-muted-foreground mb-4">
                        Defineix els dies laborables a cada centre. Aquesta configuració s'utilitza per calcular els dies de vacances utilitzats.
                    </p>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <Label className="mb-3 block">Arbúcies</Label>
                            <div className="space-y-2">
                                {dayNamesList.map((name, index) => {
                                    const dayIndex = index + 1; 
                                    return (
                                        <label key={dayIndex} className="flex items-center gap-2 cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={workDaysArbucies.includes(dayIndex)} 
                                                onChange={() => handleWorkDayChange(dayIndex, 'Arbucies')} 
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
                                    const dayIndex = index + 1; 
                                    return (
                                        <label key={dayIndex} className="flex items-center gap-2 cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={workDaysSantHilari.includes(dayIndex)} 
                                                onChange={() => handleWorkDayChange(dayIndex, 'SantHilari')} 
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
