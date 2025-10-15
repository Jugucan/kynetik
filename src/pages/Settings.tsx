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
const keyToDate = (key: string): Date | null => {
  if (typeof key !== 'string') return null;
    
  const parts = key.split('-').map(p => parseInt(p, 10));
  
  if (parts.length < 3 || parts.some(isNaN)) {
      return null;
  }
  
  // Utilitzem UTC o ajust de zona horària per evitar problemes amb dates
  const date = new Date(parts[0], parts[1] - 1, parts[2]); 

  // Ajust de l'hora per assegurar que es manté com a dia complet (ajusta a les 00:00:00)
  date.setHours(0, 0, 0, 0);

  if (isNaN(date.getTime())) {
    return null;
  }
  return date;
};

// Funció per calcular l'any laboral (1 Gen - 31 Des de l'any actual)
const getCurrentWorkYear = (today: Date): { start: Date, end: Date } => {
    const currentYear = today.getFullYear();
    const startDate = new Date(currentYear, 0, 1);
    const endDate = new Date(currentYear, 11, 31);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
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

    // Darrere l'escena: 1=Dilluns... 7=Diumenge
    const [workDaysArbucies, setWorkDaysArbucies] = useState<number[]>([1, 2, 4]); 
    const [workDaysSantHilari, setWorkDaysSantHilari] = useState<number[]>([3, 5]);

    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const workYear = useMemo(() => getCurrentWorkYear(new Date()), []);
    
    // Funció per verificar si un dia és laborable
    const isWorkDay = useCallback((date: Date, workDays: number[]) => {
        const dayOfWeek = date.getDay(); 
        const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek; // Diumenge (0) a 7
        return workDays.includes(adjustedDay);
    }, []);
    
    // ************************************************
    // Càlcul de Dies Utilitzats (CORRECCIÓ: es recalculen al canviar workDays)
    // ************************************************
    const { usedDaysArbucies, usedDaysSantHilari } = useMemo(() => {
        let arbuciesCount = 0;
        let santHilariCount = 0;

        vacationDates.forEach(({ date }) => {
            // Comprovem si la data cau dins de l'any laboral definit (actualment any natural)
            const isWithinWorkYear = (
                (isAfter(date, workYear.start) || isSameDay(date, workYear.start)) && 
                (isBefore(date, workYear.end) || isSameDay(date, workYear.end))
            );

            if (isWithinWorkYear) {
                // Suma només si és un dia laborable del centre
                if (isWorkDay(date, workDaysArbucies)) {
                    arbuciesCount++;
                }
                if (isWorkDay(date, workDaysSantHilari)) {
                    santHilariCount++;
                }
            }
        });

        // Les dependències asseguren que el càlcul es faci només quan canvien les dates o els dies laborables
        return { usedDaysArbucies: arbuciesCount, usedDaysSantHilari: santHilariCount };
    }, [vacationDates, workDaysArbucies, workDaysSantHilari, isWorkDay, workYear]); 


    // FUNCIÓ per processar dades rebudes de Firebase
    const convertToDateWithReason = (dataField: Record<string, string> | Record<string, any> | undefined): DateWithReason[] => {
        if (!dataField || typeof dataField !== 'object') return [];
        
        return Object.entries(dataField).flatMap(([key, value]) => {
            
            let date: Date | null = null;
            let reason: string = '';

            // Format correcte: Key és Data 'YYYY-MM-DD', Value és Motiu 'string'
            date = keyToDate(key); 
            if (date) {
                reason = String(value) || ''; 
            } else {
                return []; 
            }
            
            return [{ date, reason }];
        }).filter(item => item.date !== null) as DateWithReason[];
    };


    // ************************************************
    // FUNCIÓ per GUARDAR DADES (WRITE) a Firebase
    // ************************************************
    const handleSave = useCallback(async (
        newVacations: DateWithReason[] | null = null, 
        newClosuresArbucies: DateWithReason[] | null = null,
        newClosuresSantHilari: DateWithReason[] | null = null,
        
    ) => {
        setIsSaving(true);

        try {
            // Totes les dades es guarden en el format NOU (Data com a clau, Motiu com a valor)
            const convertToFirebaseFormat = (datesWithReason: DateWithReason[]): Record<string, string> => {
                // Filtra les dates no vàlides si n'hi hagués
                return datesWithReason.filter(d => d.date).reduce((acc, { date, reason }) => {
                    // La clau és la data (YYYY-MM-DD) i el valor és el motiu (string)
                    acc[dateToKey(date)] = reason; 
                    return acc;
                }, {} as Record<string, string>);
            };

            const dataToSave = {
                // Utilitza els nous valors passats o l'estat actual si no s'han passat
                vacations: convertToFirebaseFormat(newVacations !== null ? newVacations : vacationDates), 
                closuresArbucies: convertToFirebaseFormat(newClosuresArbucies !== null ? newClosuresArbucies : closureDatesArbucies), 
                closuresSantHilari: convertToFirebaseFormat(newClosuresSantHilari !== null ? newClosuresSantHilari : closureDatesSantHilari),
                
                // Aquests valors sempre s'agafen de l'últim estat
                availableDaysArbucies,
                availableDaysSantHilari,
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
    }, [vacationDates, closureDatesArbucies, closureDatesSantHilari, availableDaysArbucies, availableDaysSantHilari, workDaysArbucies, workDaysSantHilari]);
    

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
                console.log("Document de configuració no trobat. Utilitzant valors per defecte.");
            }
            setIsLoading(false);
        }, (error) => {
            console.error("Error al carregar la configuració:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []); 

    
    // Funció per gestionar la selecció al calendari (mode multiple)
    // CORRECCIÓ: Aquesta funció ha estat reescrita per gestionar correctament
    // l'eliminació (des-selecció) i la conservació del motiu.
    const handleDateSelect = async (selectedDates: Date[] | undefined) => {
        if (!selectedDates) return;
        
        const center = currentCenterClosure;

        const setter = center === 'Arbucies' ? setClosureDatesArbucies 
            : center === 'SantHilari' ? setClosureDatesSantHilari 
            : setVacationDates;
        const currentDates = center === 'Arbucies' ? closureDatesArbucies
            : center === 'SantHilari' ? closureDatesSantHilari
            : vacationDates;
            
        // 1. Mapeja les dates seleccionades a l'estructura DateWithReason
        // Només inclou les dates que s'han mantingut o afegit
        const finalDates: DateWithReason[] = selectedDates.map(newDate => {
            // Busca si la data ja existia per mantenir el motiu
            const existing = currentDates.find(d => isSameDay(d.date, newDate));
            if (existing) {
                // Data existent: la retorna amb el seu motiu
                return existing; 
            }
            // Data nova: l'afegeix amb el motiu buit
            return { date: newDate, reason: '' }; 
        });

        // 2. Actualitza l'estat local amb les noves dates (ara inclou les eliminacions)
        setter(finalDates);

        // 3. GUARDA AUTOMÀTICAMENT ELS CANVIS A FIREBASE
        if (center === 'Vacation') {
            await handleSave(finalDates, closureDatesArbucies, closureDatesSantHilari);
        } else if (center === 'Arbucies') {
            await handleSave(vacationDates, finalDates, closureDatesSantHilari);
        } else if (center === 'SantHilari') {
            await handleSave(vacationDates, closureDatesArbucies, finalDates);
        }

        // Tanca el popover per netejar la vista (opcional)
        if (selectedDates.length !== currentDates.length) {
             setCurrentReason('');
             setIsPopoverOpen(false);
        }
    };
    
    // Funció per eliminar una data de la llista (ara amb DateWithReason)
    // CORRECCIÓ: S'afegeix el guardat automàtic
    const handleRemoveDate = useCallback(async (dateToRemove: Date, setter: React.Dispatch<React.SetStateAction<DateWithReason[]>>, currentDates: DateWithReason[], center: 'Vacation' | 'Arbucies' | 'SantHilari') => {
        
        const newDates = currentDates.filter(d => !isSameDay(d.date, dateToRemove));

        setter(newDates); // Actualitza l'estat de React
        
        // GUARDA AUTOMÀTICAMENT ELS CANVIS A FIREBASE
        if (center === 'Vacation') {
            await handleSave(newDates, closureDatesArbucies, closureDatesSantHilari);
        } else if (center === 'Arbucies') {
            await handleSave(vacationDates, newDates, closureDatesSantHilari);
        } else if (center === 'SantHilari') {
            await handleSave(vacationDates, closureDatesArbucies, newDates);
        }
    }, [handleSave, vacationDates, closureDatesArbucies, closureDatesSantHilari]);

    // FUNCIÓ PER ACTUALITZAR EL MOTIU
    // CORRECCIÓ: S'ha de cridar aquesta funció directament des de l'Input i amb el guardat automàtic
    const handleReasonChange = useCallback(async (dateToUpdate: Date, newReason: string, currentDates: DateWithReason[], center: 'Vacation' | 'Arbucies' | 'SantHilari') => {
        
        // 1. Crea el nou array de dates amb el motiu actualitzat
        const updatedDates = currentDates.map(d => {
            if (isSameDay(d.date, dateToUpdate)) {
                return { ...d, reason: newReason };
            }
            return d;
        });

        // 2. Actualitza l'estat de React amb el nou array
        if (center === 'Vacation') {
             setVacationDates(updatedDates);
             // 3. Guarda a Firebase
             await handleSave(updatedDates, closureDatesArbucies, closureDatesSantHilari);
        } else if (center === 'Arbucies') {
             setClosureDatesArbucies(updatedDates);
             await handleSave(vacationDates, updatedDates, closureDatesSantHilari);
        } else if (center === 'SantHilari') {
             setClosureDatesSantHilari(updatedDates);
             await handleSave(vacationDates, closureDatesArbucies, updatedDates);
        }

    }, [handleSave, vacationDates, closureDatesArbucies, closureDatesSantHilari]);
    
    // Funció per gestionar el canvi de checkbox (Dies de treball)
    // S'ha afegit una crida a handleSave al final per guardar workDays immediatament
    const handleWorkDayChange = async (dayIndex: number, center: 'Arbucies' | 'SantHilari') => {
        
        const currentDays = center === 'Arbucies' ? workDaysArbucies : workDaysSantHilari;
        
        const newDays = currentDays.includes(dayIndex) 
            ? currentDays.filter(day => day !== dayIndex)
            : [...currentDays, dayIndex].sort((a, b) => a - b);
        
        // Actualitza l'estat local
        if (center === 'Arbucies') {
            setWorkDaysArbucies(newDays);
            // Guarda per actualitzar la configuració i forçar el recalcul de dies utilitzats
            await handleSave(vacationDates, closureDatesArbucies, closureDatesSantHilari); 
        } else {
            setWorkDaysSantHilari(newDays);
            // Guarda per actualitzar la configuració i forçar el recalcul de dies utilitzats
            await handleSave(vacationDates, closureDatesArbucies, closureDatesSantHilari);
        }
    };

    const holidays2025 = [
        { name: "Any Nou", date: "1 Gen" }, { name: "Reis", date: "6 Gen" }, { name: "Divendres Sant", date: "18 Abr" },
        { name: "Dilluns de Pasqua", date: "21 Abr" }, { name: "Festa del Treball", date: "1 Mai" }, { name: "Sant Joan", date: "24 Jun" },
        { name: "Assumpció", date: "15 Ago" }, { name: "Diada", date: "11 Set" }, { name: "Mercè", date: "24 Set" },
        { name: "Hispanitat", date: "12 Oct" }, { name: "Tots Sants", date: "1 Nov" }, { name: "Constitució", date: "6 Des" },
        { name: "Immaculada", date: "8 Des" }, { name: "Nadal", date: "25 Des" }, { name: "Sant Esteve", date: "26 Des" },
    ];
    
    // Day Index: 1=Dilluns, ..., 7=Diumenge
    const dayNamesList = ["Dilluns", "Dimarts", "Dimecres", "Dijous", "Divendres", "Dissabte", "Diumenge"];
    
    // Funció que retorna només les dates (per al Calendar)
    const getDatesOnly = (datesWithReason: DateWithReason[]): Date[] => datesWithReason.map(d => d.date);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Carregant configuració...
            </div>
        );
    }

    // COMPONENT Reutilitzable per a la llista de dates
    const DateList = ({ dates, center, listName }: {
        dates: DateWithReason[],
        center: 'Vacation' | 'Tancament Arbúcies' | 'Tancament Sant Hilari',
        listName: string
    }) => {
        const baseColor = center.includes('Vacation') ? 'blue' : 'gray';
        const centerType = center === 'Vacation' ? 'Vacation' : center === 'Tancament Arbúcies' ? 'Arbucies' : 'SantHilari';

        return dates.length > 0 ? (
            <div className="p-3 mt-2 rounded-xl shadow-neo-inset">
                <p className="text-sm font-medium mb-2">{listName}: {dates.length} dies</p>
                <div className="flex flex-wrap gap-3">
                    {dates.sort((a, b) => a.date.getTime() - b.date.getTime()).map((d) => (
                        <div 
                            // CLAU ESTABLE
                            key={d.date.getTime()} 
                            className={`flex flex-col p-2 rounded-lg shadow-neo bg-${baseColor}-500/10 text-${baseColor}-700 relative`}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className="font-semibold text-sm">
                                    {format(d.date, "dd MMM", { locale: ca })}
                                </span>
                                <X 
                                    className="h-3 w-3 ml-2 text-red-500 hover:text-red-700 cursor-pointer transition-colors"
                                    // S'utilitza la funció d'esborrat amb el guardat automàtic
                                    onClick={() => handleRemoveDate(d.date, 
                                        centerType === 'Vacation' ? setVacationDates : centerType === 'Arbucies' ? setClosureDatesArbucies : setClosureDatesSantHilari,
                                        dates, 
                                        centerType
                                    )}
                                />
                            </div>
                            {/* Input per a la nota amb la correcció de Bug 2 */}
                            <Input
                                type="text"
                                value={d.reason}
                                // Aquí s'utilitza directament handleReasonChange per actualitzar el motiu i guardar-lo
                                onChange={(e) => handleReasonChange(d.date, e.target.value, dates, centerType)}
                                placeholder="Afegir motiu (opcional)"
                                className={`h-6 text-xs p-1 mt-1 shadow-neo-inset border-0 bg-transparent placeholder:text-${baseColor}-600/70`}
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

            {/* Crida a handleSave en fer submit per guardar les dades que no es guarden automàticament (Dies disponibles/laborals) */}
            <form onSubmit={(e) => {
                e.preventDefault(); // Prevé el comportament per defecte
                handleSave(); // Guarda tot
            }} className="grid gap-6"> 
                
                <NeoCard>
                    <div className="flex items-center gap-2 mb-4">
                        <CalendarIcon className="w-5 h-5 text-primary" />
                        <h2 className="text-xl font-semibold">Dies de vacances generals</h2>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-4">
                        Període laboral: {format(workYear.start, "dd/MM/yyyy")} - {format(workYear.end, "dd/MM/yyyy")}
                    </p>
                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                        {/* INPUTS DE DIES DISPONIBLES / UTILITZATS */}
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
                                    // Utilitza la variable d'estat calculada
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
                                    // Utilitza la variable d'estat calculada
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

                    {/* POPUP SELECCIÓ VACANCES */}
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
                        
                        {/* Llista de dates de vacances seleccionades amb Input editable */}
                        <DateList dates={vacationDates} center="Vacation" listName="Vacances" />
                    </div>
                </NeoCard>

                <hr className="my-6 border-t border-gray-200" /> 

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
                            {/* Llista de dates de tancament Arbúcies amb Input editable */}
                            <DateList dates={closureDatesArbucies} center="Tancament Arbúcies" listName="Tancament Arbúcies" />
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
                            {/* Llista de dates de tancament Sant Hilari amb Input editable */}
                            <DateList dates={closureDatesSantHilari} center="Tancament Sant Hilari" listName="Tancament Sant Hilari" />
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
                                    const dayIndex = index + 1; // 1 (Dilluns) a 7 (Diumenge)
                                    return (
                                        <label key={dayIndex} className="flex items-center gap-2 cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={workDaysArbucies.includes(dayIndex)} 
                                                // La funció guarda automàticament
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
                                    const dayIndex = index + 1; // 1 (Dilluns) a 7 (Diumenge)
                                    return (
                                        <label key={dayIndex} className="flex items-center gap-2 cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={workDaysSantHilari.includes(dayIndex)} 
                                                // La funció guarda automàticament
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


                {/* BOTÓ DE GUARDAR (per guardar Dies disponibles) */}
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
