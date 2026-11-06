// src/utils/receptionHelpers.ts
// Càlcul de què toca fer a recepció un dia concret, tenint en compte la plantilla setmanal,
// les excepcions manuals, les vacances, els festius i els tancaments del centre.
// Tot en memòria, sense cap lectura a Firebase.

import { dateToKey } from '@/utils/statsHelpers';
import type { SettingsData } from '@/contexts/AppDataContext';
import type { ReceptionScheduleData, ReceptionDayStatus } from '@/types/reception';

const toMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

export const shiftMinutes = (start: string, end: string): number =>
  Math.max(0, toMinutes(end) - toMinutes(start));

export const formatMinutes = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
};

export const parseDateKey = (dateKey: string): Date => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const isCenterClosed = (dateKey: string, settings: SettingsData, centerId: string): boolean => {
  if (settings.closuresByCenter && Object.keys(settings.closuresByCenter).length > 0) {
    const closures = settings.closuresByCenter[centerId];
    return !!closures && closures.hasOwnProperty(dateKey);
  }
  if (centerId === 'arbucies') return !!settings.closuresArbucies?.hasOwnProperty(dateKey);
  if (centerId === 'sant-hilari') return !!settings.closuresSantHilari?.hasOwnProperty(dateKey);
  return false;
};

// Prioritat: excepció manual > festiu > vacances > tancament del centre > plantilla setmanal.
// Una excepció "custom" guanya a tot (per si un dia festiu hi vas igualment).
export const getReceptionStatusForDate = (
  date: Date,
  data: ReceptionScheduleData,
  settings: SettingsData,
  centerId: string
): ReceptionDayStatus => {
  const dateKey = dateToKey(date);

  const override = data.overrides[dateKey];
  if (override) {
    if (override.type === 'absent') {
      return { kind: 'off', reason: 'absent', note: override.note };
    }
    if (override.start && override.end) {
      return {
        kind: 'shift',
        start: override.start,
        end: override.end,
        minutes: shiftMinutes(override.start, override.end),
        source: 'override',
        note: override.note,
      };
    }
  }

  if (settings.officialHolidays?.hasOwnProperty(dateKey)) return { kind: 'off', reason: 'holiday' };
  if (settings.vacations?.hasOwnProperty(dateKey)) return { kind: 'off', reason: 'vacation' };
  if (isCenterClosed(dateKey, settings, centerId)) return { kind: 'off', reason: 'closure' };

  const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay();
  const shift = data.weekly[String(dayOfWeek)];
  if (shift) {
    return {
      kind: 'shift',
      start: shift.start,
      end: shift.end,
      minutes: shiftMinutes(shift.start, shift.end),
      source: 'template',
    };
  }

  return { kind: 'off', reason: 'no-shift' };
};
