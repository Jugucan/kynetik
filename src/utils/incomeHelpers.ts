// src/utils/incomeHelpers.ts
// Càlculs de períodes de nòmina (26 del mes anterior al 25 del mes en curs)
// i comptatge automàtic de classes per centre, en memòria, sense lectures noves a Firebase.

import { dateToKey } from '@/utils/statsHelpers';
import type { Schedule, SettingsData, Center } from '@/contexts/AppDataContext';

export interface PayPeriod {
  start: string; // 'YYYY-MM-DD'
  end: string;   // 'YYYY-MM-DD'
  label: string;
}

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

export const getPeriodLabel = (periodStart: string, periodEnd: string): string => {
  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  const startLabel = start.toLocaleDateString('ca-ES', { day: 'numeric', month: 'short' });
  const endLabel = end.toLocaleDateString('ca-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${startLabel} - ${endLabel}`;
};

// Retorna els últims `count` períodes, començant pel període actual (índex 0)
export const getRecentPeriods = (count: number, fromDate: Date = new Date()): PayPeriod[] => {
  const periods: PayPeriod[] = [];
  let cursor = new Date(fromDate);

  for (let i = 0; i < count; i++) {
    const { start, end } = getPayPeriodForDate(cursor);
    periods.push({ start, end, label: getPeriodLabel(start, end) });

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
