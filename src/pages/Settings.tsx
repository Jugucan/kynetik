import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Settings as SettingsIcon, Save, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isSameDay, isAfter, isBefore } from "date-fns";
import { format } from "date-fns";
import { ca } from "date-fns/locale";
import { getFiscalYear, getFiscalYearsRange } from "@/lib/utils";
import { useCenters } from "@/hooks/useCenters";
import { db } from "@/lib/firebase";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { 
  DateWithReason, 
  filterDatesByFiscalYear, 
  generateHolidays, 
  getWorkYearDates, 
  convertToFirebaseFormat,
  convertToDateWithReason
} from "@/utils/dateHelpers";
import { FiscalYearSelector } from "@/components/settings/FiscalYearSelector";
import { CenterManagement } from "@/components/settings/CenterManagement";
import { VacationManagement } from "@/components/settings/VacationManagement";
import { HolidayManagement } from "@/components/settings/HolidayManagement";

const SETTINGS_DOC_REF = doc(db, 'settings', 'global');

const Settings = () => {
    const { 
        centers, 
        activeCenters, 
        loading: centersLoading,
        addCenter,
        deactivateCenter,
        reactivateCenter,
        updateCenter,
        deleteCenter,
    } = useCenters();

    const currentFiscalYear = useMemo(() => getFiscalYear(new Date()), []);
    const [selectedFiscalYear, setSelectedFiscalYear] = useState(currentFiscalYear);
    const workYear = useMemo(() => getWorkYearDates(selectedFiscalYear), [selectedFiscalYear]);
    
    const [allVacationDates, setAllVacationDates] = useState<DateWithReason[]>([]);
    const [allClosuresByCenter, setAllClosuresByCenter] = useState<Record<string, DateWithReason[]>>({});
    const [allOfficialHolidays, setAllOfficialHolidays] = useState<DateWithReason[]>([]);
    
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [currentEditingCenter, setCurrentEditingCenter] = useState<string | null>(null);
    const [isEditingVacation, setIsEditingVacation] = useState(false);
    const [expandedCenters, setExpandedCenters] = useState<Record<string, boolean>>({});

    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

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

    const saveToFirebase = async (
        vacationsToSave: DateWithReason[],
        closuresToSave: Record<string, DateWithReason[]>,
        holidaysToSave: DateWithReason[]
    ) => {
        try {
            const closuresByCenter: Record<string, Record<string, string>> = {};
            Object.entries(closuresToSave).forEach(([centerId, dates]) => {
                closuresByCenter[centerId] = convertToFirebaseFormat(dates);
            });

            const dataToSave = {
                vacations: convertToFirebaseFormat(vacationsToSave),
                closuresByCenter,
                officialHolidays: convertToFirebaseFormat(holidaysToSave),
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

    useEffect(() => {
        const unsubscribe = onSnapshot(SETTINGS_DOC_REF, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                
                const newVacations = convertToDateWithReason(data.vacations).sort((a, b) => a.date.getTime() - b.date.getTime());
                const newHolidays = convertToDateWithReason(data.officialHolidays).sort((a, b) => a.date.getTime() - b.date.getTime());
                
                const closures: Record<string, DateWithReason[]> = {};
                if (data.closuresByCenter) {
                    Object.entries(data.closuresByCenter).forEach(([centerId, dates]) => {
                        closures[centerId] = convertToDateWithReason(dates as Record<string, string>)
                            .sort((a, b) => a.date.getTime() - b.date.getTime());
                    });
                }
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

    const handleReactivateCenter = async (centerId: string) => {
        console.log("🔄 Intentant reactivar centre:", centerId);
        try {
            await reactivateCenter(centerId);
            console.log("✅ Centre reactivat correctament");
        } catch (error) {
            console.error("❌ Error reactivant centre:", error);
        }
    };

    const getDatesOnly = (datesWithReason: DateWithReason[]): Date[] => datesWithReason.map(d => d.date);

    // Components de renderització
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

    const renderDateList = (dates: DateWithReason[], centerId?: string) => {
        const type = centerId ? 'closure' : 'vacation';
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

    if (isLoading || centersLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Carregant configuració...
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <SettingsIcon className="w-8 h-8 text-primary" />
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Configuració</h1>
                    <p className="text-muted-foreground">Gestiona centres, vacances, dies de tancament i dies laborables</p>
                </div>
            </div>

            <FiscalYearSelector
                selectedFiscalYear={selectedFiscalYear}
                availableFiscalYears={availableFiscalYears}
                onYearChange={setSelectedFiscalYear}
            />

            <CenterManagement
                centers={centers}
                closuresByCenter={closuresByCenter}
                usedDaysByCenter={usedDaysByCenter}
                expandedCenters={expandedCenters}
                currentEditingCenter={currentEditingCenter}
                isPopoverOpen={isPopoverOpen}
                isSaving={isSaving}
                onAddCenter={addCenter}
                onDeactivateCenter={deactivateCenter}
                onReactivateCenter={handleReactivateCenter}
                onDeleteCenter={deleteCenter}
                onUpdateCenter={updateCenter}
                onToggleExpanded={(id) => setExpandedCenters(prev => ({ ...prev, [id]: !prev[id] }))}
                onDateSelect={(dates, centerId) => handleDateSelect(dates, 'closure', centerId)}
                onPopoverChange={(open, centerId) => {
                    setIsPopoverOpen(open);
                    setCurrentEditingCenter(open ? centerId : null);
                    setIsEditingVacation(false);
                }}
                getDatesOnly={getDatesOnly}
                renderDateList={renderDateList}
            />

            <form onSubmit={handleSave} className="grid gap-6">
                <VacationManagement
                    workYear={workYear}
                    activeCenters={activeCenters}
                    vacationDates={vacationDates}
                    usedDaysByCenter={usedDaysByCenter}
                    isPopoverOpen={isPopoverOpen}
                    isEditingVacation={isEditingVacation}
                    isSaving={isSaving}
                    onDateSelect={(dates) => handleDateSelect(dates, 'vacation')}
                    onPopoverChange={(open) => {
                        setIsPopoverOpen(open);
                        setIsEditingVacation(open);
                        if (open) setCurrentEditingCenter(null);
                    }}
                    getDatesOnly={getDatesOnly}
                    renderDateList={(dates) => renderDateList(dates)}
                />

                <hr className="my-6 border-t border-gray-200" />

                <HolidayManagement
                    workYear={workYear}
                    officialHolidays={officialHolidays}
                    onRegenerateHolidays={handleRegenerateHolidays}
                    onRemoveHoliday={handleRemoveHoliday}
                    onEditHolidayReason={handleEditHolidayReason}
                />

                <div className="flex justify-end">
                    <Button type="submit" disabled={isSaving} className="shadow-neo hover:shadow-neo-sm">
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        {isSaving ? "Desant..." : "Desar canvis"}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default Settings;
