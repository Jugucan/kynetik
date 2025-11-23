import { isSameDay, isAfter, isBefore } from "date-fns";
import { getFiscalYear } from "@/lib/utils";
import { Center } from "@/hooks/useCenters";

export interface DateWithReason {
    date: Date;
    reason: string;
}

export const dateToKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const keyToDate = (key: string): Date | null => {
  if (typeof key !== 'string') return null;
  const parts = key.split('-').map(p => parseInt(p, 10));
  if (parts.length < 3 || parts.some(isNaN)) return null;
  const date = new Date(parts[0], parts[1] - 1, parts[2]); 
  date.setHours(0, 0, 0, 0);
  if (isNaN(date.getTime())) return null;
  return date;
};

export const calculateEaster = (year: number): Date => {
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

export const filterDatesByFiscalYear = (dates: DateWithReason[], fiscalYear: number): DateWithReason[] => {
    if (!dates) return [];
    return dates.filter(d => getFiscalYear(d.date) === fiscalYear);
};

export const generateHolidays = (workYearStart: Date, workYearEnd: Date, activeCenters: Center[]): DateWithReason[] => {
    const holidays: DateWithReason[] = [];
    const startYear = workYearStart.getFullYear();
    const endYear = workYearEnd.getFullYear();
    
    const addHolidayIfInRange = (date: Date, reason: string) => {
        if ((isAfter(date, workYearStart) || isSameDay(date, workYearStart)) && 
            (isBefore(date, workYearEnd) || isSameDay(date, workYearEnd))) {
            if (!holidays.some(h => isSameDay(h.date, date))) {
                holidays.push({ date, reason });
            }
        }
    };
    
    const yearsToCheck = Array.from(new Set([startYear, endYear]));

    yearsToCheck.forEach(year => {
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
        
        const easter = calculateEaster(year);
        const goodFriday = new Date(easter);
        goodFriday.setDate(easter.getDate() - 2);
        addHolidayIfInRange(goodFriday, "Divendres Sant");
        
        const easterMonday = new Date(easter);
        easterMonday.setDate(easter.getDate() + 1);
        addHolidayIfInRange(easterMonday, "Dilluns de Pasqua");
        
        activeCenters.forEach(center => {
            center.localHolidays.forEach(holiday => {
                const holidayDate = new Date(year, holiday.month, holiday.day);
                addHolidayIfInRange(holidayDate, `${holiday.name} (${center.name})`);
            });
        });
    });
    
    return holidays.sort((a, b) => a.date.getTime() - b.date.getTime());
};

export const getWorkYearDates = (fiscalYear: number): { start: Date, end: Date } => {
    const startYear = fiscalYear;
    const endYear = fiscalYear + 1;
    const startDate = new Date(startYear, 1, 1);
    const endDate = new Date(endYear, 0, 31);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
    return { start: startDate, end: endDate };
};

export const convertToFirebaseFormat = (datesWithReason: DateWithReason[]): Record<string, string> => {
    if (datesWithReason.length === 0) return {};
    return datesWithReason.filter(d => d.date).reduce((acc, { date, reason }) => {
        acc[dateToKey(date)] = reason; 
        return acc;
    }, {} as Record<string, string>);
};

export const convertToDateWithReason = (dataField: Record<string, string> | undefined): DateWithReason[] => {
    if (!dataField || typeof dataField !== 'object' || Array.isArray(dataField)) return [];
    return Object.entries(dataField).flatMap(([key, value]) => {
        const date = keyToDate(key); 
        if (!date) return [];
        const reason = String(value) || ''; 
        return [{ date, reason }];
    });
};
