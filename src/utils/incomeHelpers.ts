// src/utils/incomeHelpers.ts
// Càlculs de períodes de nòmina (26 del mes anterior al 25 del mes en curs)
// i comptatge automàtic de classes per centre, en memòria, sense lectures noves a Firebase.

import { dateToKey } from '@/utils/statsHelpers';
import { getEffectiveSessionsForDate } from '@/utils/sessionHelpers';
import type { Schedule, SettingsData, Center } from '@/contexts/AppDataContext';

export interface PayPeriod {
  start: string;      // 'YYYY-MM-DD'
  end: string;         // 'YYYY-MM-DD'
  monthLabel: string;  // "Juliol"
  shortLabel: string;  // "jul. 26" (mes abreujat + any, per desambiguar entre anys)
  rangeLabel: string;  // "26 jul. - 25 d'ag. del 2026"
}

const MONTH_FULL = ['Gener', 'Febrer', 'Març', 'Abril', 'Maig', 'Juny', 'Juliol', 'Agost', 'Setembre', 'Octubre', 'Novembre', 'Desembre'];
const MONTH_ABBR = ['gen.', 'febr.', 'març', 'abr.', 'maig', 'juny', 'jul.', 'ag.', 'set.', 'oct.', 'nov.', 'des.'];
const VOWEL_MONTHS = [3, 7, 9]; // abril, agost, octubre -> porten "d'" en lloc de "de "

// IMPORTANT: parseja una clau 'YYYY-MM-DD' com a data LOCAL, mai com a UTC.
// "new Date('2024-11-25')" es interpreta com a UTC i pot desquadrar-se una hora
// als canvis d'horari d'estiu/hivern (per això fallava sempre al novembre).
const parseDateKey = (dateKey: string): Date => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
};

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
// El mes gran es basa en el dia de TANCAMENT del període (dia 25).
export const getPeriodLabels = (periodStart: string, periodEnd: string): { monthLabel: string; shortLabel: string; rangeLabel: string } => {
  const start = parseDateKey(periodStart);
  const end = parseDateKey(periodEnd);

  const monthLabel = MONTH_FULL[end.getMonth()];
  const endAbbr = MONTH_ABBR[end.getMonth()];
  const endYearShort = (end.getFullYear() % 100).toString().padStart(2, '0');
  const shortLabel = `${endAbbr} ${endYearShort}`; // ex: "nov. 24"

  const startDay = start.getDate();
  const startAbbr = MONTH_ABBR[start.getMonth()];
  const endDay = end.getDate();
  const endYear = end.getFullYear();
  const endPrep = VOWEL_MONTHS.includes(end.getMonth()) ? "d'" : "de ";

  const rangeLabel = `${startDay} ${startAbbr} - ${endDay} ${endPrep}${endAbbr} del ${endYear}`;

  return { monthLabel, shortLabel, rangeLabel };
};

// Retorna els últims `count` períodes, començant pel període actual (índex 0)
export const getRecentPeriods = (count: number, fromDate: Date = new Date()): PayPeriod[] => {
  const periods: PayPeriod[] = [];
  let cursor = new Date(fromDate);

  for (let i = 0; i < count; i++) {
    const { start, end } = getPayPeriodForDate(cursor);
    const { monthLabel, shortLabel, rangeLabel } = getPeriodLabels(start, end);
    periods.push({ start, end, monthLabel, shortLabel, rangeLabel });

    const prevDay = parseDateKey(start);
    prevDay.setDate(prevDay.getDate() - 1); // últim dia del període anterior
    cursor = prevDay;
  }

  return periods;
};

// Retorna els 12 períodes (Gener–Desembre) corresponents a un any concret,
// seguint la mateixa lògica que el teu Excel (columna = mes, període 26→25).
export const getPeriodsForYear = (year: number): PayPeriod[] => {
  const periods: PayPeriod[] = [];
  for (let month = 0; month < 12; month++) {
    const start = new Date(year, month - 1, 26);
    const end = new Date(year, month, 25);
    const startKey = dateToKey(start);
    const endKey = dateToKey(end);
    const { monthLabel, shortLabel, rangeLabel } = getPeriodLabels(startKey, endKey);
    periods.push({ start: startKey, end: endKey, monthLabel, shortLabel, rangeLabel });
  }
  return periods;
};

// Compta les sessions EFECTIVES per centre dins d'un període — inclou baixes,
// substitucions i qualsevol modificació feta des del Calendari (customSessions),
// per mostrar exactament el mateix que la pàgina de Calendari.
export const countEffectiveSessionsInPeriod = (
  schedules: Schedule[],
  settings: SettingsData,
  customSessions: Record<string, import('./sessionHelpers').EffectiveSession[]>,
  periodStart: string,
  periodEnd: string,
  getCenterByLegacyId: (legacyId: 'Arbucies' | 'SantHilari') => Center | undefined
): Record<string, number> => {
  const counts: Record<string, number> = {};
  const start = parseDateKey(periodStart);
  const end = parseDateKey(periodEnd);
  const current = new Date(start);

  while (current <= end) {
    const sessions = getEffectiveSessionsForDate(current, schedules, settings, customSessions);
    sessions
      .filter((s) => !s.isDeleted)
      .forEach((session) => {
        const center = getCenterByLegacyId(session.center as 'Arbucies' | 'SantHilari');
        const centerId = center?.id || session.center;
        if (centerId) counts[centerId] = (counts[centerId] || 0) + 1;
      });
    current.setDate(current.getDate() + 1);
  }

  return counts;
};
