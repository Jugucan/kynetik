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

import { db } from "@/lib/firebase";
import { doc, setDoc, onSnapshot } from "firebase/firestore";

const SETTINGS_DOC_REF = doc(db, 'settings', 'global');

interface DateWithReason {
    date: Date;
    reason: string;
}

const dateToKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const keyToDate = (key: string): Date | null => {
  if (typeof key !== 'string') return null;
  const parts = key.split('-').map(p => parseInt(p, 10));
  if (parts.length < 3 || parts.some(isNaN)) return null;
  const date = new Date(parts[0], parts[1] - 1, parts[2]); 
  date.setHours(0, 0, 0, 0);
  if (isNaN(date.getTime())) return null;
  return date;
};

// Algoritme de Gauss per calcular la data de Pasqua
const getEasterDate = (year: number): Date => {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    
    return new Date(year, month - 1, day); 
};

// Funció per obtenir els festius nacionals i autonòmics (Catalunya) per a un any
const getOfficialHolidays = (year: number): DateWithReason[] => {
    
    const easter = getEasterDate(year);
    
    // Dilluns de Pasqua
    const easterMonday = new Date(easter);
    easterMonday.setDate(easter.getDate() + 1);
    
    // Divendres Sant (2 dies abans de Pasqua)
    const goodFriday = new Date(easter);
    goodFriday.setDate(easter.getDate() - 2);

    // Festius Fixos (Mesos: 0=Gen, 1=Feb, ...)
    const holidays = [
        // Any Nou (Any en curs)
        new Date(year, 0, 1), 
        // Reis (Any en curs)
        new Date(year, 0, 6), 
        // Festa del Treball (Any en curs)
        new Date(year, 4, 1), 
        // Sant Joan (Any en curs)
        new Date(year, 5, 24), 
        // Assumpció (Any en curs)
        new Date(year, 7, 15), 
        // Diada Nacional de Catalunya (Any en curs)
        new Date(year, 8, 11),
        // Mercè (Festiu local BCN, afegit per context, si cal canviar-lo)
        new Date(year, 8, 24), 
        // Festa Nacional d'Espanya (Any en curs)
        new Date(year, 9, 12), 
        // Tots Sants (Any en curs)
        new Date(year, 10, 1), 
        // Dia de la Constitució (Any en curs)
        new Date(year, 11, 6), 
        // La Immaculada Concepció (Any en curs)
        new Date(year, 11, 8), 
        // Nadal (Any en curs)
        new Date(year, 11, 25), 
        // Sant Esteve (Any en curs)
        new Date(year, 11, 26), 
    ].map(date => {
        date.setHours(0, 0, 0, 0); 
        return date;
    });

    // Festius Mòbils
    holidays.push(goodFriday, easterMonday);

    // Afegir Festius de l'any següent (que entren en el període laboral Feb-Gen)
    holidays.push(new Date(year + 1, 0, 1)); // 1 Gen de l'any següent
    holidays.push(new Date(year + 1, 0, 6)); // 6 Gen de l'any següent

    // Retorna llista única i formatada
    const uniqueDates = holidays.filter((date, index, self) => 
        index === self.findIndex(d => d.getTime() === date.getTime())
    );

    return uniqueDates.map(date => ({
        date: date,
        reason: format(date, "EEEE", { locale: ca }), 
    }));
};


const getCurrentWorkYear = (today: Date): { start: Date, end: Date } => {
    const currentYear = today.getFullYear();
    let startYear = currentYear;
    let endYear = currentYear;

    // Febrer és el mes 1 (0 = Gen, 1 = Feb)
    const startMonth = 1; // Febrer
    const startDay = 1;   // Dia 1

    // Gener és el mes 0
    const endMonth = 0;   // Gener
    const endDay = 31;    // Dia 31

    // Data de referència: 1 de Febrer de l'any actual
    const currentFebFirst = new Date(currentYear, startMonth, startDay);
    currentFebFirst.setHours(0, 0, 0, 0);

    if (isBefore(today, currentFebFirst) || isSameDay(today, new Date(currentYear, endMonth, endDay))) {
        startYear = currentYear - 1;
        endYear = currentYear;
    } else {
        startYear = currentYear;
        endYear = currentYear + 1;
    }

    const startDate = new Date(startYear, startMonth, startDay); // 1 de Febrer (de startYear)
    const endDate = new Date(endYear, endMonth, endDay);         // 31 de Gener (de endYear)

    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    return { start: startDate, end: endDate };
};

const convertToFirebaseFormat = (datesWithReason: DateWithReason[]): Record<string, string> => {
    if (datesWithReason.length === 0) return {};
    return datesWithReason.filter(d => d.date).reduce((acc, { date, reason }) => {
        acc[dateToKey(date)] = reason; 
        return acc;
    }, {} as Record<string, string>);
};

const Settings = () => {
    
    const [vacationDates, setVacationDates] = useState<DateWithReason[]>([]);
    const [closureDatesArbucies, setClosureDatesArbucies] = useState<DateWithReason[]>([]);
    const [closureDatesSantHilari, setClosureDatesSantHilari] = useState<DateWithReason[]>([]);
    const [officialHolidays, setOfficialHolidays] = useState<DateWithReason[]>([]); 

    const [currentReason, setCurrentReason] = useState('');
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [currentCenterClosure, setCurrentCenterClosure] = useState<'Arbucies' | 'SantHilari' | 'Vacation' | 'Holiday' | null>(null);

    const [availableDaysArbucies, setAvailableDaysArbucies] = useState(30);
    const [availableDaysSantHilari, setAvailableDaysSantHilari] = useState(20);

    const [workDaysArbucies, setWorkDaysArbucies] = useState<number[]>([1, 2, 4]); 
    const [workDaysSantHilari, setWorkDaysSantHilari] = useState<number[]>([3, 5]);

    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

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
                if (isWorkDay(date, workDaysArbucies)) arbuciesCount++;
                if (isWorkDay(date, workDaysSantHilari)) santHilariCount++;
            }
        });

        return { usedDaysArbucies: arbuciesCount, usedDaysSantHilari: santHilariCount };
    }, [vacationDates, workDaysArbucies, workDaysSantHilari, isWorkDay, workYear]); 

    const convertToDateWithReason = (dataField: Record<string, string> | Record<string, any> | undefined): DateWithReason[] => {
        if (!dataField || typeof dataField !== 'object' || Array.isArray(dataField)) return [];
        
        return Object.entries(dataField).flatMap(([key, value]) => {
            const date = keyToDate(key); 
            if (!date) return [];
            const reason = String(value) || ''; 
            return [{ date, reason }];
        });
    };

    const saveToFirebase = async (
        vacationsToSave: DateWithReason[],
        closuresArbuciesToSave: DateWithReason[],
        closuresSantHilariToSave: DateWithReason[],
        holidaysToSave: DateWithReason[],
        availableArbucies: number,
        availableSantHilari: number,
        workArbucies: number[],
        workSantHilari: number[]
    ) => {
        try {
            const dataToSave = {
                vacations: convertToFirebaseFormat(vacationsToSave), 
                closuresArbucies: convertToFirebaseFormat(closuresArbuciesToSave), 
                closuresSantHilari: convertToFirebaseFormat(closuresSantHilariToSave),
                officialHolidays: convertToFirebaseFormat(holidaysToSave),
                availableDaysArbucies: availableArbucies,
                availableDaysSantHilari: availableSantHilari,
                workDaysArbucies: workArbucies,
                workDaysSantHilari: workSantHilari,
            };

            console.log("📤 Guardant a Firebase:", dataToSave); 
            await setDoc(SETTINGS_DOC_REF, dataToSave, { merge: true }); 
            console.log("✅ Dades guardades correctament a Firebase");
            
        } catch (error) {
            console.error("❌ Error al guardar a Firebase:", error);
        }
    };
    
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        await saveToFirebase(
            vacationDates, closureDatesArbucies, closureDatesSantHilari, officialHolidays,
            availableDaysArbucies, availableDaysSantHilari,
            workDaysArbucies, workDaysSantHilari
        );
        setIsSaving(false);
    };

    useEffect(() => {
        console.log("🔄 Configurant listener de Firebase...");
        
        const unsubscribe = onSnapshot(SETTINGS_DOC_REF, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                console.log("📥 Dades rebudes de Firebase:", data);
                
                const newVacations = convertToDateWithReason(data.vacations);
                const newClosuresArbucies = convertToDateWithReason(data.closuresArbucies);
                const newClosuresSantHilari = convertToDateWithReason(data.closuresSantHilari);
                const newHolidays = convertToDateWithReason(data.officialHolidays);
                
                // Lògica d'inicialització de festius
                if (newHolidays.length === 0) {
                    const calculatedHolidays = getOfficialHolidays(workYear.end.getFullYear());
                    setOfficialHolidays(calculatedHolidays);
                } else {
                    setOfficialHolidays(newHolidays);
                }
                
                setVacationDates(newVacations);
                setClosureDatesArbucies(newClosuresArbucies);
                setClosureDatesSantHilari(newClosuresSantHilari);
                
                if (typeof data.availableDaysArbucies === 'number') setAvailableDaysArbucies(data.availableDaysArbucies);
                if (typeof data.availableDaysSantHilari === 'number') setAvailableDaysSantHilari(data.availableDaysSantHilari);
                if (data.workDaysArbucies && Array.isArray(data.workDaysArbucies)) setWorkDaysArbucies(data.workDaysArbucies);
                if (data.workDaysSantHilari && Array.isArray(data.workDaysSantHilari)) setWorkDaysSantHilari(data.workDaysSantHilari);
            } else {
                 // Si no existeix el document, calculem els festius per defecte
                const calculatedHolidays = getOfficialHolidays(workYear.end.getFullYear());
                setOfficialHolidays(calculatedHolidays);
            }
            setIsLoading(false);
            setIsInitialLoad(false);
        }, (error) => {
            console.error("❌ Error:", error);
            setIsLoading(false);
            setIsInitialLoad(false);
        });

        return () => unsubscribe();
    }, [workYear]); 

    // **FUNCIÓ CLAU RECUPERADA I CORREGIDA**
    const handleDateSelect = async (selectedDates: Date[] | undefined) => {
        if (!selectedDates || isInitialLoad) return;
        
        console.log("📅 Dates seleccionades:", selectedDates.length);
        
        let listToUpdate: DateWithReason[] = [];
        let setter: React.Dispatch<React.SetStateAction<DateWithReason[]>>;
        let currentList: DateWithReason[] = [];

        // 1. Determina quina llista s'ha d'actualitzar
        if (currentCenterClosure === 'Vacation') {
            currentList = vacationDates;
            setter = setVacationDates;
        } else if (currentCenterClosure === 'Arbucies') {
            currentList = closureDatesArbucies;
            setter = setClosureDatesArbucies;
        } else if (currentCenterClosure === 'SantHilari') {
            currentList = closureDatesSantHilari;
            setter = setClosureDatesSantHilari;
        } else if (currentCenterClosure === 'Holiday') {
            currentList = officialHolidays;
            setter = setOfficialHolidays;
        } else {
            return;
        }
        
        // 2. Converteix la selecció a DateWithReason (manté el motiu si ja existeix)
        listToUpdate = selectedDates.map(newDate => {
            const existing = currentList.find(d => isSameDay(d.date, newDate));
            return existing || { date: newDate, reason: currentReason || '' };
        });
        
        // 3. Actualitza l'estat local
        setter(listToUpdate);

        // 4. Guarda a Firebase (Passant totes les llistes actualitzades)
        await saveToFirebase(
            currentCenterClosure === 'Vacation' ? listToUpdate : vacationDates,
            currentCenterClosure === 'Arbucies' ? listToUpdate : closureDatesArbucies,
            currentCenterClosure === 'SantHilari' ? listToUpdate : closureDatesSantHilari,
            currentCenterClosure === 'Holiday' ? listToUpdate : officialHolidays,
            availableDaysArbucies, availableDaysSantHilari, workDaysArbucies, workDaysSantHilari
        );
    };
    
    // **FUNCIÓ CLAU RECUPERADA I CORREGIDA**
    const handleRemoveDate = async (dateToRemove: Date, center: 'Vacation' | 'Arbucies' | 'SantHilari' | 'Holiday') => {
        if (isInitialLoad) return;
        
        console.log("🗑️ Eliminant:", format(dateToRemove, "dd/MM/yyyy"));
        
        let newVacations = vacationDates;
        let newClosuresArbucies = closureDatesArbucies;
        let newClosuresSantHilari = closureDatesSantHilari;
        let newHolidays = officialHolidays;

        if (center === 'Vacation') {
            newVacations = vacationDates.filter(d => !isSameDay(d.date, dateToRemove));
            setVacationDates(newVacations);
        } else if (center === 'Arbucies') {
            newClosuresArbucies = closureDatesArbucies.filter(d => !isSameDay(d.date, dateToRemove));
            setClosureDatesArbucies(newClosuresArbucies);
        } else if (center === 'SantHilari') {
            newClosuresSantHilari = closureDatesSantHilari.filter(d => !isSameDay(d.date, dateToRemove));
            setClosureDatesSantHilari(newClosuresSantHilari);
        } else if (center === 'Holiday') {
             newHolidays = officialHolidays.filter(d => !isSameDay(d.date, dateToRemove));
            setOfficialHolidays(newHolidays);
        }
        
        await saveToFirebase(newVacations, newClosuresArbucies, newClosuresSantHilari, newHolidays,
            availableDaysArbucies, availableDaysSantHilari, workDaysArbucies, workDaysSantHilari);
        
        console.log("✅ Eliminada");
    };

    // **FUNCIÓ CLAU RECUPERADA I CORREGIDA**
    const handleReasonChange = useCallback((dateToUpdate: Date, newReason: string, center: 'Vacation' | 'Arbucies' | 'SantHilari' | 'Holiday') => {
        if (isInitialLoad) return;
        
        let newVacations = vacationDates;
        let newClosuresArbucies = closureDatesArbucies;
        let newClosuresSantHilari = closureDatesSantHilari;
        let newHolidays = officialHolidays;
        
        if (center === 'Vacation') {
            newVacations = vacationDates.map(d => isSameDay(d.date, dateToUpdate) ? { ...d, reason: newReason } : d);
            setVacationDates(newVacations);
        } else if (center === 'Arbucies') {
            newClosuresArbucies = closureDatesArbucies.map(d => isSameDay(d.date, dateToUpdate) ? { ...d, reason: newReason } : d);
            setClosureDatesArbucies(newClosuresArbucies);
        } else if (center === 'SantHilari') {
            newClosuresSantHilari = closureDatesSantHilari.map(d => isSameDay(d.date, dateToUpdate) ? { ...d, reason: newReason } : d);
            setClosureDatesSantHilari(newClosuresSantHilari);
        } else if (center === 'Holiday') {
            newHolidays = officialHolidays.map(d => isSameDay(d.date, dateToUpdate) ? { ...d, reason: newReason } : d);
            setOfficialHolidays(newHolidays);
        }
        
        // NO guardem immediatament, el component ReasonInput s'encarregarà amb debounce
    }, [vacationDates, closureDatesArbucies, closureDatesSantHilari, officialHolidays, isInitialLoad]);
    
    const handleWorkDayChange = (dayIndex: number, center: 'Arbucies' | 'SantHilari') => {
        const setter = center === 'Arbucies' ? setWorkDaysArbucies : setWorkDaysSantHilari;
        const currentDays = center === 'Arbucies' ? workDaysArbucies : workDaysSantHilari;
        
        if (currentDays.includes(dayIndex)) {
            setter(currentDays.filter(day => day !== dayIndex));
        } else {
            setter([...currentDays, dayIndex].sort((a, b) => a - b));
        }
    };

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

    const ReasonInput = ({ date, reason, center }: { 
        date: Date, 
        reason: string,
        center: 'Vacation' | 'Arbucies' | 'SantHilari' | 'Holiday'
    }) => {
        
        const [currentReasonValue, setCurrentReasonValue] = useState(reason);
        const timeoutRef = useRef<NodeJS.Timeout | null>(null);
        
        useEffect(() => {
             setCurrentReasonValue(reason);
        }, [reason]);

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const newReason = e.target.value;
            setCurrentReasonValue(newReason);
            
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            
            timeoutRef.current = setTimeout(() => {
                handleReasonChange(date, newReason, center);
                
                // Guarda a Firebase després del debounce
                let newVacations = vacationDates;
                let newClosuresArbucies = closureDatesArbucies;
                let newClosuresSantHilari = closureDatesSantHilari;
                let newHolidays = officialHolidays;
                
                if (center === 'Vacation') {
                    newVacations = vacationDates.map(d => isSameDay(d.date, date) ? { ...d, reason: newReason } : d);
                } else if (center === 'Arbucies') {
                    newClosuresArbucies = closureDatesArbucies.map(d => isSameDay(d.date, date) ? { ...d, reason: newReason } : d);
                } else if (center === 'SantHilari') {
                    newClosuresSantHilari = closureDatesSantHilari.map(d => isSameDay(d.date, date) ? { ...d, reason: newReason } : d);
                } else if (center === 'Holiday') {
                    newHolidays = officialHolidays.map(d => isSameDay(d.date, date) ? { ...d, reason: newReason } : d);
                }
                
                saveToFirebase(newVacations, newClosuresArbucies, newClosuresSantHilari, newHolidays,
                    availableDaysArbucies, availableDaysSantHilari, workDaysArbucies, workDaysSantHilari);
            }, 1000);
        };
        
        useEffect(() => {
            return () => {
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                }
            };
        }, []);

        const baseColor = center === 'Vacation' ? 'blue' : center === 'Holiday' ? 'accent' : 'gray';

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

    const DateList = ({ dates, listName, center }: {
        dates: DateWithReason[],
        listName: 'Vacances' | 'Tancament Arbúcies' | 'Tancament Sant Hilari' | 'Festius Oficials',
        center: 'Vacation' | 'Arbucies' | 'SantHilari' | 'Holiday'
    }) => {
        const baseColor = listName.includes('Vacances') ? 'blue' : listName.includes('Festius') ? 'accent' : 'gray';
        
        // Filtra les dates per al període laboral actual
        const dateList = dates
            .filter(d => 
                (isAfter(d.date, workYear.start) || isSameDay(d.date, workYear.start)) && 
                (isBefore(d.date, workYear.end) || isSameDay(d.date, workYear.end))
            )
            .sort((a, b) => a.date.getTime() - b.date.getTime());
        
        return dateList.length > 0 ? (
            <div className="p-3 mt-2 rounded-xl shadow-neo-inset">
                <p className="text-sm font-medium mb-2">{listName}: {dateList.length} dies</p>
                <div className="flex flex-wrap gap-3">
                    {dateList.map((d) => (
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
                                    onClick={() => handleRemoveDate(d.date, center)}
                                />
                            </div>
                            <ReasonInput 
                                date={d.date}
                                reason={d.reason}
                                center={center}
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
                            if (open) {
                                setCurrentCenterClosure('Vacation');
                            } else {
                                setCurrentReason('');
                                setCurrentCenterClosure(null);
                            }
                        }}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full shadow-neo hover:shadow-neo-sm justify-start" disabled={isSaving}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    Afegir vacances
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-3" align="start">
                                <div className="space-y-3">
                                    <p className="text-sm text-muted-foreground">
                                        Selecciona les dates que vulguis. Prem "Tancar" quan acabis.
                                    </p>
                                    <Calendar
                                    mode="multiple"
                                    selected={getDatesOnly(vacationDates)} 
                                    onSelect={handleDateSelect}
                                    locale={ca}
                                    className="rounded-md border shadow-neo"
                                    />
                                    <Button 
                                        onClick={() => {
                                            setIsPopoverOpen(false);
                                            setCurrentCenterClosure(null);
                                        }}
                                        className="w-full"
                                        size="sm"
                                    >
                                        Tancar
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                        
                        <DateList dates={vacationDates} listName="Vacances" center="Vacation" />
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
                                if (open) {
                                    setCurrentCenterClosure('Arbucies');
                                } else {
                                    setCurrentReason('');
                                    setCurrentCenterClosure(null);
                                }
                            }}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full shadow-neo hover:shadow-neo-sm justify-start" disabled={isSaving}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Afegir dies de tancament Arbúcies
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-3" align="start">
                                    <div className="space-y-3">
                                        <p className="text-sm text-muted-foreground">
                                            Selecciona les dates que vulguis. Prem "Tancar" quan acabis.
                                        </p>
                                        <Calendar
                                            mode="multiple"
                                            selected={getDatesOnly(closureDatesArbucies)}
                                            onSelect={handleDateSelect}
                                            locale={ca}
                                            className="rounded-md border shadow-neo"
                                        />
                                        <Button 
                                            onClick={() => {
                                                setIsPopoverOpen(false);
                                                setCurrentCenterClosure(null);
                                            }}
                                            className="w-full"
                                            size="sm"
                                        >
                                            Tancar
                                        </Button>
                                    </div>
                                </PopoverContent>
                            </Popover>
                            <DateList dates={closureDatesArbucies} listName="Tancament Arbúcies" center="Arbucies" />
                        </div>

                        <div>
                            <Label className="mb-2 block">Sant Hilari</Label>
                            <Popover open={isPopoverOpen && currentCenterClosure === 'SantHilari'} onOpenChange={(open) => {
                                setIsPopoverOpen(open);
                                if (open) {
                                    setCurrentCenterClosure('SantHilari');
                                } else {
                                    setCurrentReason('');
                                    setCurrentCenterClosure(null);
                                }
                            }}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full shadow-neo hover:shadow-neo-sm justify-start" disabled={isSaving}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Afegir dies de tancament Sant Hilari
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-3" align="start">
                                    <div className="space-y-3">
                                        <p className="text-sm text-muted-foreground">
                                            Selecciona les dates que vulguis. Prem "Tancar" quan acabis.
                                        </p>
                                        <Calendar
                                            mode="multiple"
                                            selected={getDatesOnly(closureDatesSantHilari)}
                                            onSelect={handleDateSelect}
                                            locale={ca}
                                            className="rounded-md border shadow-neo"
                                        />
                                        <Button 
                                            onClick={() => {
                                                setIsPopoverOpen(false);
                                                setCurrentCenterClosure(null);
                                            }}
                                            className="w-full"
                                            size="sm"
                                        >
                                            Tancar
                                        </Button>
                                    </div>
                                </PopoverContent>
                            </Popover>
                            <DateList dates={closureDatesSantHilari} listName="Tancament Sant Hilari" center="SantHilari" />
                        </div>
                    </div>
                </NeoCard>

                <hr className="my-6 border-t border-gray-200" /> 

                {/* Secció de Festius Oficials */}
                <NeoCard>
                    <div className="flex items-center gap-2 mb-4">
                        <CalendarIcon className="w-5 h-5 text-accent" />
                        <h2 className="text-xl font-semibold">Festius oficials {workYear.start.getFullYear()} - {workYear.end.getFullYear()} (Editable)</h2>
                    </div>
                    
                    <div className="space-y-3">
                        <Label>Afegir/Editar Festius (Calculats automàticament per l'any laboral)</Label>
                        <Popover open={isPopoverOpen && currentCenterClosure === 'Holiday'} onOpenChange={(open) => {
                            setIsPopoverOpen(open);
                            if (open) {
                                setCurrentCenterClosure('Holiday');
                            } else {
                                setCurrentReason('');
                                setCurrentCenterClosure(null);
                            }
                        }}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full shadow-neo hover:shadow-neo-sm justify-start" disabled={isSaving}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Afegir/Treure Festius
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-3" align="start">
                                <div className="space-y-3">
                                    <p className="text-sm text-muted-foreground">
                                        Selecciona les dates que vulguis. Els dies marcats es consideraran festius. Prem "Tancar" quan acabis.
                                    </p>
                                    <Calendar
                                    mode="multiple"
                                    selected={getDatesOnly(officialHolidays)} 
                                    onSelect={handleDateSelect}
                                    locale={ca}
                                    className="rounded-md border shadow-neo"
                                    />
                                    <Button 
                                        onClick={() => {
                                            setIsPopoverOpen(false);
                                            setCurrentCenterClosure(null);
                                        }}
                                        className="w-full"
                                        size="sm"
                                    >
                                        Tancar
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                        
                        <DateList dates={officialHolidays} listName="Festius Oficials" center="Holiday" />
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
