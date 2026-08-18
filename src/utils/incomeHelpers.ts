// src/utils/incomeHelpers.ts
// Càlculs de períodes de nòmina (26 del mes anterior al 25 del mes en curs)
// i comptatge automàtic de classes per centre, en memòria, sense lectures noves a Firebase.

import { dateToKey } from '@/utils/statsHelpers';
import type { Schedule, SettingsData, Center } from '@/contexts/AppDataContext';

export interface PayPeriod {
  start: string;      // 'YYYY-MM-DD'
  end: string;         // 'YYYY-MM-DD'
  monthLabel: string;  // "Juliol"
  rangeLabel: string;  // "26 jul. - 25 d'ag. del 2026"
}

const MONTH_FULL = ['Gener', 'Febrer', 'Març', 'Abril', 'Maig', 'Juny', 'Juliol', 'Agost', 'Setembre', 'Octubre', 'Novembre', 'Desembre'];
const MONTH_ABBR = ['gen.', 'febr.', 'març', 'abr.', 'maig', 'juny', 'jul.', 'ag.', 'set.', 'oct.', 'nov.', 'des.'];
const VOWEL_MONTHS = [3, 7, 9]; // abril, agost, octubre -> porten "d'" en lloc de "de "

// Donada una data, retorna el període de nòmina (26 -> 25) al qual pertany
export const getPayPeriodForDate = (date: Date): { start: string; end: string } => {
  const day = date.getDate();
  let periodStart: Date;
  let periodEnd: Date;

  if (day >= 26) {
    periodStart = new Date(date.getFullYear(), date.getMonth(), 26);
    periodEnd = new Date(date.getFullYear(), date.getMonth() + 1, 25);
  } else {
    periodStart = new Date(date.getFullYear(), date.getMonth() - 1, 26);
    periodEnd = new Date(date.getFullYear(), date.getMonth(), 25);
  }

  return { start: dateToKey(periodStart), end: dateToKey(periodEnd) };
};

// Genera "Juliol" (mes en gran) i "26 jul. - 25 d'ag. del 2026" (rang en petit)
// El mes gran es basa en el dia d'INICI del període (dia 26).
export const getPeriodLabels = (periodStart: string, periodEnd: string): { monthLabel: string; rangeLabel: string } => {
  const start = new Date(periodStart);
  const end = new Date(periodEnd);

  const monthLabel = MONTH_FULL[start.getMonth()];

  const startDay = start.getDate();
  const startAbbr = MONTH_ABBR[start.getMonth()];
  const endDay = end.getDate();
  const endAbbr = MONTH_ABBR[end.getMonth()];
  const endYear = end.getFullYear();
  const endPrep = VOWEL_MONTHS.includes(end.getMonth()) ? "d'" : "de ";

  const rangeLabel = `${startDay} ${startAbbr} - ${endDay} ${endPrep}${endAbbr} del ${endYear}`;

  return { monthLabel, rangeLabel };
};

// Retorna els últims `count` períodes, començant pel període actual (índex 0)
export const getRecentPeriods = (count: number, fromDate: Date = new Date()): PayPeriod[] => {
  const periods: PayPeriod[] = [];
  let cursor = new Date(fromDate);

  for (let i = 0; i < count; i++) {
    const { start, end } = getPayPeriodForDate(cursor);
    const { monthLabel, rangeLabel } = getPeriodLabels(start, end);
    periods.push({ start, end, monthLabel, rangeLabel });

    const prevDay = new Date(start);
    prevDay.setDate(prevDay.getDate() - 1); // últim dia del període anterior
    cursor = prevDay;
  }

  return periods;
};

// Compta les classes programades per centre dins d'un període,
// respectant vacances, tancaments i festius. NOMÉS horari fix
// (no inclou substitucions puntuals fetes des del Calendari).
export const countSessionsInPeriod = (
  schedules: Schedule[],
  settings: SettingsData,
  periodStart: string,
  periodEnd: string,
  getCenterByLegacyId: (legacyId: 'Arbucies' | 'SantHilari') => Center | undefined
): Record<string, number> => {
  const counts: Record<string, number> = {};
  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  const current = new Date(start);

  const sortedSchedules = [...schedules].sort((a, b) => b.startDate.localeCompare(a.startDate));

  while (current <= end) {
    const dateKey = dateToKey(current);

    const isHoliday = !!settings.officialHolidays?.hasOwnProperty(dateKey);
    const isVacation = !!settings.vacations?.hasOwnProperty(dateKey);
    const isClosure = Object.values(settings.closuresByCenter || {}).some(
      (closures) => closures && closures.hasOwnProperty(dateKey)
    );

    if (!isHoliday && !isVacation && !isClosure) {
      const schedule = sortedSchedules.find((s) => {
        const sStart = s.startDate;
        const sEnd = s.endDate || '9999-12-31';
        return dateKey >= sStart && dateKey <= sEnd;
      });

      if (schedule) {
        const dayOfWeek = current.getDay();
        const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek;
        const sessions = schedule.sessions[adjustedDay] || [];
        sessions.forEach((session) => {
          const center = getCenterByLegacyId(session.center);
          const centerId = center?.id || session.center;
          counts[centerId] = (counts[centerId] || 0) + 1;
        });
      }
    }

    current.setDate(current.getDate() + 1);
  }

  return counts;
};
