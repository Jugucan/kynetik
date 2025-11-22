import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { NeoCard } from "@/components/NeoCard";
import { Settings as SettingsIcon, Calendar as CalendarIcon, Users as UsersIcon, Plus, Save, Loader2, X, RefreshCw, Building2, Power, PowerOff, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, isSameDay, isAfter, isBefore } from "date-fns";
import { ca } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getFiscalYear, getFiscalYearsRange } from "@/lib/utils";
import { useCenters, Center, LocalHoliday } from "@/hooks/useCenters";
import { db } from "@/lib/firebase";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

// Càlcul de Pasqua (algorisme de Butcher)
const calculateEaster = (year: number): Date => {
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

const filterDatesByFiscalYear = (dates: DateWithReason[], fiscalYear: number): DateWithReason[] => {
    if (!dates) return [];
    return dates.filter(d => getFiscalYear(d.date) === fiscalYear);
};

// 🆕 FUNCIÓ ACTUALITZADA: Genera festius incloent els locals dels centres actius
const generateHolidays = (workYearStart: Date, workYearEnd: Date, activeCenters: Center[]): DateWithReason[] => {
    const holidays: DateWithReason[] = [];
    const startYear = workYearStart.getFullYear();
    const endYear = workYearEnd.getFullYear();
    
    const addHolidayIfInRange = (date: Date, reason: string) => {
        if ((isAfter(date, workYearStart) || isSameDay(date, workYearStart)) && 
            (isBefore(date, workYearEnd) || isSameDay(date, workYearEnd))) {
            // Evitar duplicats
            if (!holidays.some(h => isSameDay(h.date, date))) {
                holidays.push({ date, reason });
            }
        }
    };
    
    const yearsToCheck = Array.from(new Set([startYear, endYear]));

    yearsToCheck.forEach(year => {
        // FESTIUS FIXOS GENERALS
        addHolidayIfInRange(new Date(year, 0, 1), "Any Nou");
        addHolidayIfInRange(new Date(year, 0, 6), "Reis");
        addHolidayIfInRange(new Date(year, 4, 1), "Festa del Treball");
        addHolidayIfInRange(new Date(year, 5, 24), "Sant Joan");
        addHolidayIfInRange(new Date(year, 7, 15), "Assumpció");
        addHolidayIfInRange(new Date(year, 8, 11), "Diada de Catalunya");
        addHolidayIfInRange(new Date(year, 8, 24), "La Mercè");
        addHolidayIfInRange(new Date(year, 9, 12), "Hispanitat");
        addHolidayIfInRange(new Date(year, 10, 1), "Tots Sants");
        addHolidayIfInRange(new Date(year, 11, 6), "Constitució");
        addHolidayIfInRange(new Date(year, 11, 8), "Immaculada");
        addHolidayIfInRange(new Date(year, 11, 25), "Nadal");
        addHolidayIfInRange(new Date(year, 11, 26), "Sant Esteve");
        
        // FESTIUS VARIABLES (Setmana Santa)
        const easter = calculateEaster(year);
        const goodFriday = new Date(easter);
        goodFriday.setDate(easter.getDate() - 2);
        addHolidayIfInRange(goodFriday, "Divendres Sant");
        
        const easterMonday = new Date(easter);
        easterMonday.setDate(easter.getDate() + 1);
        addHolidayIfInRange(easterMonday, "Dilluns de Pasqua");
        
        // 🆕 FESTIUS LOCALS DELS CENTRES ACTIUS
        activeCenters.forEach(center => {
            center.localHolidays.forEach(holiday => {
                const holidayDate = new Date(year, holiday.month, holiday.day);
                addHolidayIfInRange(holidayDate, `${holiday.name} (${center.name})`);
            });
        });
    });
    
    return holidays.sort((a, b) => a.date.getTime() - b.date.getTime());
};

const getWorkYearDates = (fiscalYear: number): { start: Date, end: Date } => {
    const startYear = fiscalYear;
    const endYear = fiscalYear + 1;
    const startDate = new Date(startYear, 1, 1);
    const endDate = new Date(endYear, 0, 31);
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
    // Hook de centres
    const { 
        centers, 
        activeCenters, 
        loading: centersLoading,
        addCenter,
        deactivateCenter,
        reactivateCenter,
        updateCenter,
    } = useCenters();

    // Estat per any fiscal
    const currentFiscalYear = useMemo(() => getFiscalYear(new Date()), []);
    const [selectedFiscalYear, setSelectedFiscalYear] = useState(currentFiscalYear);
    const workYear = useMemo(() => getWorkYearDates(selectedFiscalYear), [selectedFiscalYear]);
    
    // Estats per a les dates
    const [allVacationDates, setAllVacationDates] = useState<DateWithReason[]>([]);
    const [allClosuresByCenter, setAllClosuresByCenter] = useState<Record<string, DateWithReason[]>>({});
    const [allOfficialHolidays, setAllOfficialHolidays] = useState<DateWithReason[]>([]);
    
    // Estats del formulari
    const [currentReason, setCurrentReason] = useState('');
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [currentEditingCenter, setCurrentEditingCenter] = useState<string | null>(null);
    const [isEditingVacation, setIsEditingVacation] = useState(false);

    // Estats per afegir nou centre
    const [showAddCenter, setShowAddCenter] = useState(false);
    const [newCenterName, setNewCenterName] = useState('');
    const [newCenterWorkDays, setNewCenterWorkDays] = useState<number[]>([]);
    const [newCenterVacationDays, setNewCenterVacationDays] = useState(20);
    const [newCenterHolidays, setNewCenterHolidays] = useState<LocalHoliday[]>([]);

    // Estats per gestionar centres
    const [expandedCenters, setExpandedCenters] = useState<Record<string, boolean>>({});
    const [centerToDeactivate, setCenterToDeactivate] = useState<Center | null>(null);

    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    // Anys fiscals disponibles
    const availableFiscalYears = useMemo(() => {
        const allDates = [
            ...allVacationDates, 
            ...Object.values(allClosuresByCenter).flat(),
            ...allOfficialHolidays
        ];
        const allFiscalYears = allDates.map(item => getFiscalYear(item.date));
        const years = Array.from(new Set([...allFiscalYears, currentFiscalYear]));
        if (years.length === 0) return [currentFiscalYear];
        const minYear = Math.min(...years);
        const maxYear = Math.max(...years);
        return getFiscalYearsRange(minYear, maxYear).sort((a, b) => b - a);
    }, [allVacationDates, allClosuresByCenter, allOfficialHolidays, currentFiscalYear]);

    // Dades filtrades per visualització
    const vacationDates = useMemo(() => 
        filterDatesByFiscalYear(allVacationDates, selectedFiscalYear), 
        [allVacationDates, selectedFiscalYear]
    );

    const closuresByCenter = useMemo(() => {
        const filtered: Record<string, DateWithReason[]> = {};
        Object.entries(allClosuresByCenter).forEach(([centerId, dates]) => {
            filtered[centerId] = filterDatesByFiscalYear(dates, selectedFiscalYear);
        });
        return filtered;
    }, [allClosuresByCenter, selectedFiscalYear]);

    const officialHolidays = useMemo(() => 
        filterDatesByFiscalYear(allOfficialHolidays, selectedFiscalYear), 
        [allOfficialHolidays, selectedFiscalYear]
    );

    const isWorkDay = useCallback((date: Date, workDays: number[]) => {
        const dayOfWeek = date.getDay(); 
        const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek;
        return workDays.includes(adjustedDay);
    }, []);
    
    // Càlcul de dies utilitzats per centre
    const usedDaysByCenter = useMemo(() => {
        const result: Record<string, number> = {};
        
        activeCenters.forEach(center => {
            let count = 0;
            vacationDates.forEach(({ date }) => {
                const isWithinWorkYear = (
                    (isAfter(date, workYear.start) || isSameDay(date, workYear.start)) && 
                    (isBefore(date, workYear.end) || isSameDay(date, workYear.end))
                );
                if (isWithinWorkYear && isWorkDay(date, center.workDays)) {
                    count++;
                }
            });
            result[center.id] = count;
        });
        
        return result;
    }, [vacationDates, activeCenters, isWorkDay, workYear]);

    const convertToDateWithReason = (dataField: Record<string, string> | undefined): DateWithReason[] => {
        if (!dataField || typeof dataField !== 'object' || Array.isArray(dataField)) return [];
        return Object.entries(dataField).flatMap(([key, value]) => {
            const date = keyToDate(key); 
            if (!date) return [];
            const reason = String(value) || ''; 
            return [{ date, reason }];
        });
    };

    // Guardar a Firebase
    const saveToFirebase = async (
        vacationsToSave: DateWithReason[],
        closuresToSave: Record<string, DateWithReason[]>,
        holidaysToSave: DateWithReason[]
    ) => {
        try {
            // Convertir closures per centre a format Firebase
            const closuresByCenter: Record<string, Record<string, string>> = {};
            Object.entries(closuresToSave).forEach(([centerId, dates]) => {
                closuresByCenter[centerId] = convertToFirebaseFormat(dates);
            });

            // 🔙 COMPATIBILITAT: Mantenir camps antics per Calendar.tsx
            const dataToSave = {
                vacations: convertToFirebaseFormat(vacationsToSave),
                closuresByCenter,
                officialHolidays: convertToFirebaseFormat(holidaysToSave),
                // Camps de compatibilitat
                closuresArbucies: closuresByCenter['arbucies'] || {},
                closuresSantHilari: closuresByCenter['sant-hilari'] || {},
            };

            await setDoc(SETTINGS_DOC_REF, dataToSave, { merge: true });
            console.log("✅ Dades guardades a Firebase");
        } catch (error) {
            console.error("❌ Error al guardar a Firebase:", error);
        }
    };
    
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        await saveToFirebase(allVacationDates, allClosuresByCenter, allOfficialHolidays);
        setIsSaving(false);
    };

    const handleRegenerateHolidays = async () => {
        const newHolidaysForSelectedYear = generateHolidays(workYear.start, workYear.end, activeCenters);
        const holidaysOtherYears = allOfficialHolidays.filter(d => getFiscalYear(d.date) !== selectedFiscalYear);
        const newAllHolidays = [...holidaysOtherYears, ...newHolidaysForSelectedYear];
        setAllOfficialHolidays(newAllHolidays);
        await saveToFirebase(allVacationDates, allClosuresByCenter, newAllHolidays);
    };

    const handleRemoveHoliday = async (dateToRemove: Date) => {
        if (isInitialLoad) return;
        const newAllHolidays = allOfficialHolidays.filter(d => !isSameDay(d.date, dateToRemove));
        setAllOfficialHolidays(newAllHolidays);
        await saveToFirebase(allVacationDates, allClosuresByCenter, newAllHolidays);
    };

    const handleEditHolidayReason = async (dateToUpdate: Date, newReason: string) => {
        if (isInitialLoad) return;
        const newAllHolidays = allOfficialHolidays.map(d => 
            isSameDay(d.date, dateToUpdate) ? { ...d, reason: newReason } : d
        );
        setAllOfficialHolidays(newAllHolidays);
        await saveToFirebase(allVacationDates, allClosuresByCenter, newAllHolidays);
    };

    // Càrrega inicial
    useEffect(() => {
        const unsubscribe = onSnapshot(SETTINGS_DOC_REF, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                
                const newVacations = convertToDateWithReason(data.vacations).sort((a, b) => a.date.getTime() - b.date.getTime());
                const newHolidays = convertToDateWithReason(data.officialHolidays).sort((a, b) => a.date.getTime() - b.date.getTime());
                
                // Carregar closures per centre
                const closures: Record<string, DateWithReason[]> = {};
                if (data.closuresByCenter) {
                    Object.entries(data.closuresByCenter).forEach(([centerId, dates]) => {
                        closures[centerId] = convertToDateWithReason(dates as Record<string, string>)
                            .sort((a, b) => a.date.getTime() - b.date.getTime());
                    });
                }
                // Migrar dades antigues si cal
                if (!data.closuresByCenter) {
                    if (data.closuresArbucies) {
                        closures['arbucies'] = convertToDateWithReason(data.closuresArbucies)
                            .sort((a, b) => a.date.getTime() - b.date.getTime());
                    }
                    if (data.closuresSantHilari) {
                        closures['sant-hilari'] = convertToDateWithReason(data.closuresSantHilari)
                            .sort((a, b) => a.date.getTime() - b.date.getTime());
                    }
                }
                
                setAllVacationDates(newVacations);
                setAllClosuresByCenter(closures);
                
                if (newHolidays.length === 0 && activeCenters.length > 0) {
                    const currentWorkYear = getWorkYearDates(currentFiscalYear);
                    const generatedHolidays = generateHolidays(currentWorkYear.start, currentWorkYear.end, activeCenters);
                    setAllOfficialHolidays(generatedHolidays);
                    saveToFirebase(newVacations, closures, generatedHolidays);
                } else {
                    setAllOfficialHolidays(newHolidays);
                }
            }
            setIsLoading(false);
            setIsInitialLoad(false);
        }, (error) => {
            console.error("❌ Error:", error);
            setIsLoading(false);
            setIsInitialLoad(false);
        });

        return () => unsubscribe();
    }, [currentFiscalYear, activeCenters.length]);

    // Gestió de dates del calendari
    const handleDateSelect = async (selectedDates: Date[] | undefined, type: 'vacation' | 'closure', centerId?: string) => {
        if (!selectedDates || isInitialLoad) return;
        
        if (type === 'vacation') {
            const existingOtherYears = allVacationDates.filter(d => getFiscalYear(d.date) !== selectedFiscalYear);
            const newDatesForYear = selectedDates.map(date => {
                const existing = allVacationDates.find(d => isSameDay(d.date, date));
                return existing || { date, reason: '' };
            });
            const newAllVacations = [...existingOtherYears, ...newDatesForYear].sort((a, b) => a.date.getTime() - b.date.getTime());
            setAllVacationDates(newAllVacations);
            await saveToFirebase(newAllVacations, allClosuresByCenter, allOfficialHolidays);
        } else if (type === 'closure' && centerId) {
            const currentClosures = allClosuresByCenter[centerId] || [];
            const existingOtherYears = currentClosures.filter(d => getFiscalYear(d.date) !== selectedFiscalYear);
            const newDatesForYear = selectedDates.map(date => {
                const existing = currentClosures.find(d => isSameDay(d.date, date));
                return existing || { date, reason: '' };
            });
            const newClosuresForCenter = [...existingOtherYears, ...newDatesForYear].sort((a, b) => a.date.getTime() - b.date.getTime());
            const newAllClosures = { ...allClosuresByCenter, [centerId]: newClosuresForCenter };
            setAllClosuresByCenter(newAllClosures);
            await saveToFirebase(allVacationDates, newAllClosures, allOfficialHolidays);
        }
    };
    
    const handleRemoveDate = async (dateToRemove: Date, type: 'vacation' | 'closure', centerId?: string) => {
        if (isInitialLoad) return;
        
        if (type === 'vacation') {
            const newAllVacations = allVacationDates.filter(d => !isSameDay(d.date, dateToRemove));
            setAllVacationDates(newAllVacations);
            await saveToFirebase(newAllVacations, allClosuresByCenter, allOfficialHolidays);
        } else if (type === 'closure' && centerId) {
            const currentClosures = allClosuresByCenter[centerId] || [];
            const newClosuresForCenter = currentClosures.filter(d => !isSameDay(d.date, dateToRemove));
            const newAllClosures = { ...allClosuresByCenter, [centerId]: newClosuresForCenter };
            setAllClosuresByCenter(newAllClosures);
            await saveToFirebase(allVacationDates, newAllClosures, allOfficialHolidays);
        }
    };

    const handleReasonChange = useCallback((dateToUpdate: Date, newReason: string, type: 'vacation' | 'closure', centerId?: string) => {
        if (isInitialLoad) return;
        
        if (type === 'vacation') {
            const newAllVacations = allVacationDates.map(d => 
                isSameDay(d.date, dateToUpdate) ? { ...d, reason: newReason } : d
            );
            setAllVacationDates(newAllVacations);
        } else if (type === 'closure' && centerId) {
            const currentClosures = allClosuresByCenter[centerId] || [];
            const newClosuresForCenter = currentClosures.map(d => 
                isSameDay(d.date, dateToUpdate) ? { ...d, reason: newReason } : d
            );
            setAllClosuresByCenter(prev => ({ ...prev, [centerId]: newClosuresForCenter }));
        }
    }, [allVacationDates, allClosuresByCenter, isInitialLoad]);

    // Gestió de centres
    const handleAddCenter = async () => {
        if (!newCenterName.trim()) return;
        
        await addCenter({
            name: newCenterName.trim(),
            isActive: true,
            workDays: newCenterWorkDays,
            availableVacationDays: newCenterVacationDays,
            localHolidays: newCenterHolidays,
        });
        
        // Reset form
        setNewCenterName('');
        setNewCenterWorkDays([]);
        setNewCenterVacationDays(20);
        setNewCenterHolidays([]);
        setShowAddCenter(false);
    };

    const handleDeactivateCenter = async () => {
        if (!centerToDeactivate) return;
        await deactivateCenter(centerToDeactivate.id);
        setCenterToDeactivate(null);
    };

    const handleWorkDayChange = async (centerId: string, dayIndex: number) => {
        const center = centers.find(c => c.id === centerId);
        if (!center) return;
        
        const currentDays = center.workDays;
        const newDays = currentDays.includes(dayIndex)
            ? currentDays.filter(d => d !== dayIndex)
            : [...currentDays, dayIndex].sort((a, b) => a - b);
        
        await updateCenter(centerId, { workDays: newDays });
    };

    const handleVacationDaysChange = async (centerId: string, days: number) => {
        await updateCenter(centerId, { availableVacationDays: days });
    };

    const toggleCenterExpanded = (centerId: string) => {
        setExpandedCenters(prev => ({ ...prev, [centerId]: !prev[centerId] }));
    };

    const dayNamesList = ["Dilluns", "Dimarts", "Dimecres", "Dijous", "Divendres", "Dissabte", "Diumenge"];
    const getDatesOnly = (datesWithReason: DateWithReason[]): Date[] => datesWithReason.map(d => d.date);

    if (isLoading || centersLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Carregant configuració...
            </div>
        );
    }

    // Components interns
    const ReasonInput = ({ date, reason, type, centerId }: { 
        date: Date, 
        reason: string,
        type: 'vacation' | 'closure',
        centerId?: string
    }) => {
        const [currentReasonValue, setCurrentReasonValue] = useState(reason);
        const timeoutRef = useRef<NodeJS.Timeout | null>(null);
        
        useEffect(() => { setCurrentReasonValue(reason); }, [reason]);

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const newReason = e.target.value;
            setCurrentReasonValue(newReason);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => {
                handleReasonChange(date, newReason, type, centerId);
                // Guardar a Firebase
                if (type === 'vacation') {
                    const updated = allVacationDates.map(d => isSameDay(d.date, date) ? { ...d, reason: newReason } : d);
                    saveToFirebase(updated, allClosuresByCenter, allOfficialHolidays);
                } else if (centerId) {
                    const current = allClosuresByCenter[centerId] || [];
                    const updated = current.map(d => isSameDay(d.date, date) ? { ...d, reason: newReason } : d);
                    saveToFirebase(allVacationDates, { ...allClosuresByCenter, [centerId]: updated }, allOfficialHolidays);
                }
            }, 1000);
        };
        
        useEffect(() => { return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }; }, []);

        return (
            <Input
                type="text"
                value={currentReasonValue}
                onChange={handleChange}
                placeholder="Afegir motiu (opcional)"
                className="h-6 text-xs p-1 mt-1 shadow-neo-inset border-0 bg-transparent"
            />
        );
    };

    const DateList = ({ dates, type, centerId }: {
        dates: DateWithReason[],
        type: 'vacation' | 'closure',
        centerId?: string
    }) => {
        const baseColor = type === 'vacation' ? 'blue' : 'gray';
        const label = type === 'vacation' ? 'Vacances' : 'Tancament';

        return dates.length > 0 ? (
            <div className="p-3 mt-2 rounded-xl shadow-neo-inset">
                <p className="text-sm font-medium mb-2">{label}: {dates.length} dies</p>
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
                                    onClick={() => handleRemoveDate(d.date, type, centerId)}
                                />
                            </div>
                            <ReasonInput date={d.date} reason={d.reason} type={type} centerId={centerId} />
                        </div>
                    ))}
                </div>
            </div>
        ) : null;
    };

    const HolidayReasonInput = ({ date, reason }: { date: Date, reason: string }) => {
        const [currentReasonValue, setCurrentReasonValue] = useState(reason);
        const timeoutRef = useRef<NodeJS.Timeout | null>(null);
        
        useEffect(() => { setCurrentReasonValue(reason); }, [reason]);

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const newReason = e.target.value;
            setCurrentReasonValue(newReason);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => { handleEditHolidayReason(date, newReason); }, 1000);
        };
        
        useEffect(() => { return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }; }, []);

        return (
            <Input
                type="text"
                value={currentReasonValue}
                onChange={handleChange}
                placeholder="Nom del festiu"
                className="h-6 text-xs p-1 mt-1 shadow-neo-inset border-0 bg-transparent placeholder:text-accent-600/70"
            />
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <SettingsIcon className="w-8 h-8 text-primary" />
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Configuració</h1>
                    <p className="text-muted-foreground">Gestiona centres, vacances, dies de tancament i dies laborables</p>
                </div>
            </div>

            {/* SELECTOR D'ANY FISCAL */}
            <NeoCard className="p-4 bg-gray-50 border-gray-200">
                <div className="flex items-center space-x-4">
                    <Label htmlFor="fiscal-year-select" className="whitespace-nowrap font-semibold text-lg">
                        Any Fiscal (Feb-Gen)
                    </Label>
                    <Select 
                        value={String(selectedFiscalYear)} 
                        onValueChange={(value) => setSelectedFiscalYear(Number(value))}
                    >
                        <SelectTrigger id="fiscal-year-select" className="w-[180px] shadow-neo">
                            <SelectValue placeholder="Selecciona any" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableFiscalYears.map((year) => (
                                <SelectItem key={year} value={String(year)}>
                                    {year} - {year + 1}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                    Mostrant dades des de l'1 de Febrer de <strong>{selectedFiscalYear}</strong> fins al 31 de Gener de <strong>{selectedFiscalYear + 1}</strong>.
                </p>
            </NeoCard>

            {/* 🆕 SECCIÓ DE GESTIÓ DE CENTRES */}
            <NeoCard>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-primary" />
                        <h2 className="text-xl font-semibold">Centres</h2>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAddCenter(!showAddCenter)}
                        className="shadow-neo hover:shadow-neo-sm"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Afegir centre
                    </Button>
                </div>

                {/* Formulari per afegir nou centre */}
                {showAddCenter && (
                    <div className="p-4 mb-4 rounded-xl shadow-neo-inset bg-green-50">
                        <h3 className="font-semibold mb-3">Nou centre</h3>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="new-center-name">Nom del centre</Label>
                                <Input
                                    id="new-center-name"
                                    value={newCenterName}
                                    onChange={(e) => setNewCenterName(e.target.value)}
                                    placeholder="Ex: Girona"
                                    className="mt-1 shadow-neo-inset border-0"
                                />
                            </div>
                            <div>
                                <Label>Dies laborables</Label>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {dayNamesList.map((name, index) => {
                                        const dayIndex = index + 1;
                                        return (
                                            <label key={dayIndex} className="flex items-center gap-1 cursor-pointer text-sm">
                                                <input 
                                                    type="checkbox" 
                                                    checked={newCenterWorkDays.includes(dayIndex)} 
                                                    onChange={() => {
                                                        setNewCenterWorkDays(prev => 
                                                            prev.includes(dayIndex) 
                                                                ? prev.filter(d => d !== dayIndex)
                                                                : [...prev, dayIndex].sort((a, b) => a - b)
                                                        );
                                                    }}
                                                    className="rounded" 
                                                />
                                                <span>{name.slice(0, 3)}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="new-center-vacation">Dies de vacances disponibles</Label>
                                <Input
                                    id="new-center-vacation"
                                    type="number"
                                    value={newCenterVacationDays}
                                    onChange={(e) => setNewCenterVacationDays(parseInt(e.target.value) || 0)}
                                    className="mt-1 shadow-neo-inset border-0 w-24"
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={handleAddCenter} disabled={!newCenterName.trim()}>
                                    <Save className="h-4 w-4 mr-2" />
                                    Crear centre
                                </Button>
                                <Button variant="outline" onClick={() => setShowAddCenter(false)}>
                                    Cancel·lar
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Llista de centres */}
                <div className="space-y-3">
                    {centers.map((center) => (
                        <div 
                            key={center.id} 
                            className={`p-4 rounded-xl shadow-neo ${center.isActive ? 'bg-white' : 'bg-gray-100 opacity-75'}`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => toggleCenterExpanded(center.id)}
                                        className="p-1 rounded hover:bg-gray-100"
                                    >
                                        {expandedCenters[center.id] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                    </button>
                                    <div>
                                        <h3 className="font-semibold">{center.name}</h3>
                                        <p className="text-xs text-muted-foreground">
                                            {center.isActive ? (
                                                <>Dies: {center.workDays.map(d => dayNamesList[d-1]?.slice(0,2)).join(', ')} • {center.availableVacationDays} dies vacances</>
                                            ) : (
                                                <span className="text-orange-600">Desactivat el {center.deactivatedAt}</span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {center.isActive ? (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCenterToDeactivate(center)}
                                            className="text-orange-600 hover:text-orange-700"
                                        >
                                            <PowerOff className="h-4 w-4 mr-1" />
                                            Desactivar
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => reactivateCenter(center.id)}
                                            className="text-green-600 hover:text-green-700"
                                        >
                                            <Power className="h-4 w-4 mr-1" />
                                            Reactivar
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Detalls expandits del centre */}
                            {expandedCenters[center.id] && center.isActive && (
                                <div className="mt-4 pt-4 border-t space-y-4">
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div>
                                            <Label>Dies laborables</Label>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {dayNamesList.map((name, index) => {
                                                    const dayIndex = index + 1;
                                                    return (
                                                        <label key={dayIndex} className="flex items-center gap-1 cursor-pointer text-sm">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={center.workDays.includes(dayIndex)} 
                                                                onChange={() => handleWorkDayChange(center.id, dayIndex)}
                                                                className="rounded" 
                                                            />
                                                            <span>{name.slice(0, 3)}</span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        <div>
                                            <Label>Dies vacances disponibles</Label>
                                            <Input
                                                type="number"
                                                value={center.availableVacationDays}
                                                onChange={(e) => handleVacationDaysChange(center.id, parseInt(e.target.value) || 0)}
                                                className="mt-1 shadow-neo-inset border-0 w-24"
                                            />
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Utilitzats: {usedDaysByCenter[center.id] || 0} dies
                                            </p>
                                        </div>
                                    </div>

                                    {/* Tancaments del centre */}
                                    <div>
                                        <Label className="mb-2 block">Dies de tancament</Label>
                                        <Popover 
                                            open={isPopoverOpen && currentEditingCenter === center.id} 
                                            onOpenChange={(open) => {
                                                setIsPopoverOpen(open);
                                                if (open) {
                                                    setCurrentEditingCenter(center.id);
                                                    setIsEditingVacation(false);
                                                } else {
                                                    setCurrentEditingCenter(null);
                                                }
                                            }}
                                        >
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" className="w-full shadow-neo hover:shadow-neo-sm justify-start" disabled={isSaving}>
                                                    <Plus className="mr-2 h-4 w-4" />
                                                    Afegir dies de tancament
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-3" align="start">
                                                <div className="space-y-3">
                                                    <p className="text-sm text-muted-foreground">Selecciona les dates. Prem "Tancar" quan acabis.</p>
                                                    <Calendar
                                                        mode="multiple"
                                                        selected={getDatesOnly(closuresByCenter[center.id] || [])}
                                                        onSelect={(dates) => handleDateSelect(dates, 'closure', center.id)}
                                                        locale={ca}
                                                        className="rounded-md border shadow-neo"
                                                    />
                                                    <Button onClick={() => { setIsPopoverOpen(false); setCurrentEditingCenter(null); }} className="w-full" size="sm">
                                                        Tancar
                                                    </Button>
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                        <DateList dates={closuresByCenter[center.id] || []} type="closure" centerId={center.id} />
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </NeoCard>

            <form onSubmit={handleSave} className="grid gap-6">
                {/* VACANCES GENERALS */}
                <NeoCard>
                    <div className="flex items-center gap-2 mb-4">
                        <CalendarIcon className="w-5 h-5 text-primary" />
                        <h2 className="text-xl font-semibold">Dies de vacances generals</h2>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-4">
                        Període laboral: {format(workYear.start, "dd/MM/yyyy")} - {format(workYear.end, "dd/MM/yyyy")}
                    </p>

                    {/* Resum per centres actius */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        {activeCenters.map(center => (
                            <div key={center.id} className="p-3 rounded-lg shadow-neo-inset">
                                <h4 className="font-medium">{center.name}</h4>
                                <div className="flex justify-between text-sm mt-2">
                                    <span className="text-muted-foreground">Disponibles:</span>
                                    <span className="font-bold">{center.availableVacationDays}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Utilitzats:</span>
                                    <span className="font-bold text-primary">{usedDaysByCenter[center.id] || 0}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Restants:</span>
                                    <span className={`font-bold ${(center.availableVacationDays - (usedDaysByCenter[center.id] || 0)) < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                        {center.availableVacationDays - (usedDaysByCenter[center.id] || 0)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-3">
                        <Label>Seleccionar període de vacances generals</Label>
                        <Popover 
                            open={isPopoverOpen && isEditingVacation} 
                            onOpenChange={(open) => {
                                setIsPopoverOpen(open);
                                if (open) {
                                    setIsEditingVacation(true);
                                    setCurrentEditingCenter(null);
                                } else {
                                    setIsEditingVacation(false);
                                }
                            }}
                        >
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full shadow-neo hover:shadow-neo-sm justify-start" disabled={isSaving}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    Afegir vacances
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-3" align="start">
                                <div className="space-y-3">
                                    <p className="text-sm text-muted-foreground">Selecciona les dates. Prem "Tancar" quan acabis.</p>
                                    <Calendar
                                        mode="multiple"
                                        selected={getDatesOnly(vacationDates)}
                                        onSelect={(dates) => handleDateSelect(dates, 'vacation')}
                                        locale={ca}
                                        className="rounded-md border shadow-neo"
                                    />
                                    <Button onClick={() => { setIsPopoverOpen(false); setIsEditingVacation(false); }} className="w-full" size="sm">
                                        Tancar
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                        
                        <DateList dates={vacationDates} type="vacation" />
                    </div>
                </NeoCard>

                <hr className="my-6 border-t border-gray-200" />

                {/* FESTIUS OFICIALS */}
                <NeoCard>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <CalendarIcon className="w-5 h-5 text-accent" />
                            <h2 className="text-xl font-semibold">Festius oficials</h2>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleRegenerateHolidays}
                            className="shadow-neo hover:shadow-neo-sm"
                        >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Regenerar festius
                        </Button>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-4">
                        Període: {format(workYear.start, "dd/MM/yyyy")} - {format(workYear.end, "dd/MM/yyyy")} ({officialHolidays.length} festius)
                    </p>
                    
                    {officialHolidays.length > 0 ? (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {officialHolidays.sort((a, b) => a.date.getTime() - b.date.getTime()).map((holiday) => (
                                <div 
                                    key={holiday.date.getTime()} 
                                    className="flex flex-col p-3 rounded-xl shadow-neo-inset bg-accent-500/10"
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-semibold text-sm text-accent-700">
                                            {format(holiday.date, "dd MMM yyyy", { locale: ca })}
                                        </span>
                                        <X 
                                            className="h-3 w-3 ml-2 text-red-500 hover:text-red-700 cursor-pointer transition-colors"
                                            onClick={() => handleRemoveHoliday(holiday.date)}
                                            title="Eliminar festiu"
                                        />
                                    </div>
                                    <HolidayReasonInput date={holiday.date} reason={holiday.reason} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground italic">
                            No hi ha festius configurats. Prem "Regenerar festius" per crear-los automàticament.
                        </p>
                    )}
                </NeoCard>

                <div className="flex justify-end">
                    <Button type="submit" disabled={isSaving} className="shadow-neo hover:shadow-neo-sm">
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        {isSaving ? "Desant..." : "Desar canvis"}
                    </Button>
                </div>
            </form>

            {/* Diàleg de confirmació per desactivar centre */}
            <AlertDialog open={!!centerToDeactivate} onOpenChange={() => setCenterToDeactivate(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Desactivar centre "{centerToDeactivate?.name}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                            El centre es desactivarà però <strong>totes les dades històriques es conservaran</strong>.
                            No podràs afegir noves vacances ni tancaments a aquest centre mentre estigui desactivat.
                            Podràs reactivar-lo en qualsevol moment.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel·lar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeactivateCenter} className="bg-orange-600 hover:bg-orange-700">
                            Desactivar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default Settings;
