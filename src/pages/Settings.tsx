import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { NeoCard } from "@/components/NeoCard";
import { Settings as SettingsIcon, Calendar as CalendarIcon, Users as UsersIcon, Plus, Save, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, isSameDay, isAfter, isBefore } from "date-fns";
import { ca } from "date-fns/locale";

// Importacions de Firebase
import { db } from "@/lib/firebase";
import { doc, setDoc, onSnapshot } from "firebase/firestore";

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
const keyToDate = (key: string): Date | null => {
  if (typeof key !== 'string') return null;
    
  const parts = key.split('-').map(p => parseInt(p, 10));
  
  if (parts.length < 3 || parts.some(isNaN)) {
      return null;
  }
  
  const date = new Date(parts[0], parts[1] - 1, parts[2]); 

  // Ajust de l'hora per assegurar que es manté com a dia complet
  date.setHours(0, 0, 0, 0);

  if (isNaN(date.getTime())) {
    return null;
  }
  return date;
};

// Funció per calcular l'any laboral
const getCurrentWorkYear = (today: Date): { start: Date, end: Date } => {
    const currentYear = today.getFullYear();
    const startDate = new Date(currentYear, 0, 1);
    const endDate = new Date(currentYear, 11, 31);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
    return { start: startDate, end: endDate };
};

const Settings = () => {
    
    // ESTATS PRINCIPALS
    const [vacationDates, setVacationDates] = useState<DateWithReason[]>([]);
    const [closureDatesArbucies, setClosureDatesArbucies] = useState<DateWithReason[]>([]);
    const [closureDatesSantHilari, setClosureDatesSantHilari] = useState<DateWithReason[]>([]);
    
    // REFS per garantir l'estat fresc
    const vacationDatesRef = useRef<DateWithReason[]>([]);
    const closureDatesArbuciesRef = useRef<DateWithReason[]>([]);
    const closureDatesSantHilariRef = useRef<DateWithReason[]>([]);

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
    
    // Funció per verificar si un dia és laborable
    const isWorkDay = useCallback((date: Date, workDays: number[]) => {
        const dayOfWeek = date.getDay(); 
        const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek;
        return workDays.includes(adjustedDay);
    }, []);
    
    // Recàlcul de Dies Utilitzats
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


    // FUNCIÓ per processar dades rebudes de Firebase
    const convertToDateWithReason = (dataField: Record<string, string> | Record<string, any> | undefined): DateWithReason[] => {
        if (!dataField || typeof dataField !== 'object' || Array.isArray(dataField)) return [];
        
        return Object.entries(dataField).flatMap(([key, value]) => {
            let date: Date | null = null;
            let reason: string = '';

            date = keyToDate(key); 
            if (date) {
                reason = String(value) || ''; 
            }
            
            if (!date) {
                return []; 
            }
            
            return [{ date, reason }];
        });
    };


    // FUNCIÓ per GUARDAR DADES a Firebase
    const saveToFirebase = useCallback(async (
        newVacations: DateWithReason[] | null = null, 
        newClosuresArbucies: DateWithReason[] | null = null,
        newClosuresSantHilari: DateWithReason[] | null = null,
    ) => {
        try {
            const convertToFirebaseFormat = (datesWithReason: DateWithReason[]): Record<string, string> => {
                if (datesWithReason.length === 0) return {};
                
                return datesWithReason.filter(d => d.date).reduce((acc, { date, reason }) => {
                    acc[dateToKey(date)] = reason; 
                    return acc;
                }, {} as Record<string, string>);
            };

            // Llegeix dels arguments O del Ref
            const currentVacations = newVacations !== null ? newVacations : vacationDatesRef.current;
            const currentClosuresArbucies = newClosuresArbucies !== null ? newClosuresArbucies : closureDatesArbuciesRef.current;
            const currentClosuresSantHilari = newClosuresSantHilari !== null ? newClosuresSantHilari : closureDatesSantHilariRef.current;

            const dataToSave = {
                vacations: convertToFirebaseFormat(currentVacations), 
                closuresArbucies: convertToFirebaseFormat(currentClosuresArbucies), 
                closuresSantHilari: convertToFirebaseFormat(currentClosuresSantHilari),
                availableDaysArbucies,
                availableDaysSantHilari,
                workDaysArbucies,
                workDaysSantHilari,
            };

            console.log("📤 Guardant a Firebase:", dataToSave); 

            await setDoc(SETTINGS_DOC_REF, dataToSave, { merge: true });

            console.log("✅ Dades guardades correctament a Firebase");
            
        } catch (error) {
            console.error("❌ Error al guardar a Firebase:", error);
        }
    }, [
        availableDaysArbucies, 
        availableDaysSantHilari, 
        workDaysArbucies, 
        workDaysSantHilari
    ]);
    
    
    // Funció per guardar manualment (botó principal)
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        await saveToFirebase();
        setIsSaving(false);
    };


    // CÀRREGA DE DADES de Firebase
    useEffect(() => {
        console.log("🔄 Configurant listener de Firebase...");
        
        const unsubscribe = onSnapshot(SETTINGS_DOC_REF, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                console.log("📥 Dades rebudes de Firebase:", data);
                
                // DATES
                const newVacations = convertToDateWithReason(data.vacations);
                const newClosuresArbucies = convertToDateWithReason(data.closuresArbucies);
                const newClosuresSantHilari = convertToDateWithReason(data.closuresSantHilari);
                
                console.log("📅 Vacances processades:", newVacations.length, "dies");
                console.log("📅 Tancaments Arbúcies:", newClosuresArbucies.length, "dies");
                console.log("📅 Tancaments Sant Hilari:", newClosuresSantHilari.length, "dies");
                
                // Actualitza estat i ref
                setVacationDates(newVacations);
                setClosureDatesArbucies(newClosuresArbucies);
                setClosureDatesSantHilari(newClosuresSantHilari);
                
                vacationDatesRef.current = newVacations;
                closureDatesArbuciesRef.current = newClosuresArbucies;
                closureDatesSantHilariRef.current = newClosuresSantHilari;
                
                // Altres dades
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
                console.log("⚠️ Document de configuració no trobat. Utilitzant valors per defecte.");
            }
            setIsLoading(false);
        }, (error) => {
            console.error("❌ Error al carregar la configuració:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []); 


    
    // Funció per gestionar la selecció al calendari
    const handleDateSelect = async (selectedDates: Date[] | undefined) => {
        if (!selectedDates) return;
        
        console.log("📅 Dates seleccionades:", selectedDates.length);
        
        const setter = currentCenterClosure === 'Arbucies' ? setClosureDatesArbucies 
            : currentCenterClosure === 'SantHilari' ? setClosureDatesSantHilari 
            : setVacationDates;
        const currentDates = currentCenterClosure === 'Arbucies' ? closureDatesArbucies
            : currentCenterClosure === 'SantHilari' ? closureDatesSantHilari
            : vacationDates;
        
        const refToUpdate = currentCenterClosure === 'Arbucies' ? closureDatesArbuciesRef
            : currentCenterClosure === 'SantHilari' ? closureDatesSantHilariRef
            : vacationDatesRef;
            
        // Mapeja les dates seleccionades
        const finalDates = selectedDates.map(newDate => {
            const existing = currentDates.find(d => isSameDay(d.date, newDate));
            if (existing) {
                return existing; 
            }
            return { date: newDate, reason: currentReason || '' }; 
        });

        // Actualitza estat i ref
        setter(finalDates);
        refToUpdate.current = finalDates;

        // GUARDA A FIREBASE
        if (currentCenterClosure === 'Vacation') {
            await saveToFirebase(finalDates, null, null);
        } else if (currentCenterClosure === 'Arbucies') {
            await saveToFirebase(null, finalDates, null);
        } else if (currentCenterClosure === 'SantHilari') {
            await saveToFirebase(null, null, finalDates);
        }

        setCurrentReason('');
        setIsPopoverOpen(false);
    };
    
    // ⚠️ FUNCIÓ CORREGIDA: Eliminar una data
    const handleRemoveDate = async (
        dateToRemove: Date, 
        setter: React.Dispatch<React.SetStateAction<DateWithReason[]>>, 
        currentDates: DateWithReason[], 
        center: 'Vacation' | 'Arbucies' | 'SantHilari'
    ) => {
        
        console.log("🗑️ Eliminant data:", format(dateToRemove, "dd/MM/yyyy"));
        console.log("📋 Dates abans d'eliminar:", currentDates.length);
        
        // 1. Crea el NOU array sense la data
        const newDates = currentDates.filter(d => !isSameDay(d.date, dateToRemove));
        
        console.log("📋 Dates després d'eliminar:", newDates.length);
        
        const refToUpdate = center === 'Arbucies' ? closureDatesArbuciesRef
            : center === 'SantHilari' ? closureDatesSantHilariRef
            : vacationDatesRef;

        // 2. Actualitza estat i ref
        setter(newDates); 
        refToUpdate.current = newDates;

        // 3. ✅ CORRECCIÓ: Passa el NOU array (newDates) en lloc de l'antic
        if (center === 'Vacation') {
            await saveToFirebase(newDates, null, null);
        } else if (center === 'Arbucies') {
            await saveToFirebase(null, newDates, null);
        } else if (center === 'SantHilari') {
            await saveToFirebase(null, null, newDates);
        }
        
        console.log("✅ Data eliminada i guardada a Firebase");
    };

    // Actualitzar el motiu
    const handleReasonChange = (
        dateToUpdate: Date, 
        newReason: string, 
        setter: React.Dispatch<React.SetStateAction<DateWithReason[]>>, 
        currentDates: DateWithReason[], 
        center: 'Vacation' | 'Arbucies' | 'SantHilari'
    ) => {
        
        const updatedDates = currentDates.map(d => {
            if (isSameDay(d.date, dateToUpdate)) {
                return { ...d, reason: newReason };
            }
            return d;
        });
        
        const refToUpdate = center === 'Arbucies' ? closureDatesArbuciesRef
            : center === 'SantHilari' ? closureDatesSantHilariRef
            : vacationDatesRef;

        setter(updatedDates);
        refToUpdate.current = updatedDates;
        
        if (center === 'Vacation') {
             saveToFirebase(updatedDates, null, null);
        } else if (center === 'Arbucies') {
             saveToFirebase(null, updatedDates, null);
        } else if (center === 'SantHilari') {
             saveToFirebase(null, null, updatedDates);
        }
    };
    
    // Canvi de dies de treball
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
    
    const getDatesOnly = (datesWithReason: DateWithReason[]): Date[] => datesWithReason.map(d => d.date);


    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Carregant configuració...
            </div>
        );
    }

    // Subcomponent per a l'Input del motiu
    const ReasonInput = ({ date, reason, setter, dates, baseColor, center }: { 
        date: Date, 
        reason: string, 
        setter: React.Dispatch<React.SetStateAction<DateWithReason[]>>, 
        dates: DateWithReason[],
        baseColor: string,
        center: 'Vacation' | 'Arbucies' | 'SantHilari'
    }) => {
        
        const [currentReasonValue, setCurrentReasonValue] = useState(reason);
        
        useEffect(() => {
             setCurrentReasonValue(reason);
        }, [reason]);

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const newReason = e.target.value;
            setCurrentReasonValue(newReason);
            
            handleReasonChange(date, newReason, setter, dates, center);
        };

        return (
            <Input
                type="text"
                value={currentReasonValue}
                onChange={handleChange}
                placeholder="Afegir motiu (opcional)"
                className={`h-6 text-xs p-1 mt-1 shadow-neo-inset border-0 bg-transparent placeholder:text-${baseColor}-600/70`}
            />
        );
    };

    // Component per a la llista de dates
    const DateList = ({ dates, setter, listName }: {
        dates: DateWithReason[],
        setter: React.Dispatch<React.SetStateAction<DateWithReason[]>>,
        listName: 'Vacances' | 'Tancament Arbúcies' | 'Tancament Sant Hilari'
    }) => {
        const baseColor = listName.includes('Vacances') ? 'blue' : 'gray';
        const centerType = listName === 'Vacances' ? 'Vacation' : listName === 'Tancament Arbúcies' ? 'Arbucies' : 'SantHilari';

        return dates.length > 0 ? (
            <div className="p-3 mt-2 rounded-xl shadow-neo-inset">
                <p className="text-sm font-medium mb-2">{listName}: {dates.length} dies</p>
                <div className="flex flex-wrap gap-3">
                    {dates.sort((a, b) => a.date.getTime() - b.date.getTime()).map((d) => (
                        <div 
                            key={d.date.getTime()} 
                            className={`flex flex-col p-2 rounded-lg shadow-neo bg-${baseColor}-500/10 text-${baseColor}-700 relative`}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className="font-semibold text-sm">
                                    {format(d.date, "dd MMM", { locale: ca })}
                                </span>
                                <X 
                                    className="h-3 w-3 ml-2 text-red-500 hover:text-red-700 cursor-pointer transition-colors"
                                    onClick={() => handleRemoveDate(d.date, setter, dates, centerType)}
                                />
                            </div>
                            <ReasonInput 
                                date={d.date}
                                reason={d.reason}
                                setter={setter}
                                dates={dates}
                                baseColor={baseColor}
                                center={centerType}
                            />
                        </div>
                    ))}
                </div>
            </div>
        ) : null;
    };


    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <SettingsIcon className="w-8 h-8 text-primary" />
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Configuració</h1>
                    <p className="text-muted-foreground">Gestiona vacances, dies de tancament i dies laborables</p>
                </div>
            </div>

            <form onSubmit={handleSave} className="grid gap-6"> 
                
                <NeoCard>
                    <div className="flex items-center gap-2 mb-4">
                        <CalendarIcon className="w-5 h-5 text-primary" />
                        <h2 className="text-xl font-semibold">Dies de vacances generals</h2>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-4">
                        Període laboral: {format(workYear.start, "dd/MM/yyyy")} - {format(workYear.end, "dd/MM/yyyy")}
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
                                    Calculat sobre els dies laborables d'Arbúcies.
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
                                    Calculat sobre els dies laborables de Sant Hilari.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label>Seleccionar període de vacances generals</Label>
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
                                <p className="text-sm text-muted-foreground mb-3">
                                    Selecciona les dates. El motiu es pot afegir després.
                                </p>
                                <Calendar
                                mode="multiple"
                                selected={getDatesOnly(vacationDates)} 
                                onSelect={handleDateSelect}
                                locale={ca}
                                className="rounded-md border shadow-neo"
                                />
                            </PopoverContent>
                        </Popover>
                        
                        <DateList dates={vacationDates} setter={setVacationDates} listName="Vacances" />
                    </div>
                </NeoCard>

                <hr className="my-6 border-t border-gray-200" /> 

                <NeoCard>
                    <div className="flex items-center gap-2 mb-4">
                        <CalendarIcon className="w-5 h-5 text-destructive" />
                        <h2 className="text-xl font-semibold">Dies de tancament per centres</h2>
                    </div>

                    <div className="space-y-4">
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
                                    <p className="text-sm text-muted-foreground mb-3">
                                        Selecciona les dates. El motiu es pot afegir després.
                                    </p>
                                    <Calendar
                                        mode="multiple"
                                        selected={getDatesOnly(closureDatesArbucies)}
                                        onSelect={handleDateSelect}
                                        locale={ca}
                                        className="rounded-md border shadow-neo"
                                    />
                                </PopoverContent>
                            </Popover>
                            <DateList dates={closureDatesArbucies} setter={setClosureDatesArbucies} listName="Tancament Arbúcies" />
                        </div>

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
                                    <p className="text-sm text-muted-foreground mb-3">
                                        Selecciona les dates. El motiu es pot afegir després.
                                    </p>
                                    <Calendar
                                        mode="multiple"
                                        selected={getDatesOnly(closureDatesSantHilari)}
                                        onSelect={handleDateSelect}
                                        locale={ca}
                                        className="rounded-md border shadow-neo"
                                    />
                                </PopoverContent>
                            </Popover>
                            <DateList dates={closureDatesSantHilari} setter={setClosureDatesSantHilari} listName="Tancament Sant Hilari" />
                        </div>
                    </div>
                </NeoCard>

                <hr className="my-6 border-t border-gray-200" /> 

                <NeoCard>
                    <div className="flex items-center gap-2 mb-4">
                        <UsersIcon className="w-5 h-5 text-primary" />
                        <h2 className="text-xl font-semibold">Dies de treball</h2>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                        Defineix els dies laborables (Dilluns=1, Diumenge=7).
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

                <hr className="my-6 border-t border-gray-200" /> 

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
