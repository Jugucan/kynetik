// src/utils/sessionHelpers.ts
// Càlcul de les sessions "efectives" d'un dia, EXACTAMENT igual que a Calendar.tsx,
// perquè altres pantalles (com Ingressos) mostrin sempre les mateixes dades que el Calendari.
// IMPORTANT: és una còpia intencionada de la lògica de Calendar.tsx (getSessionsForDate).
// Si mai canvies com es calculen les sessions al Calendari, actualitza també aquest fitxer.

import { dateToKey } from '@/utils/statsHelpers';
import type { Schedule, SettingsData } from '@/contexts/AppDataContext';

export interface EffectiveSession {
  time: string;
  program: string;
  center?: string;
  isCustom?: boolean;
  isDeleted?: boolean;
}

const CENTER_ID_TO_LEGACY: Record<string, string> = {
  'arbucies': 'Arbucies',
  'sant-hilari': 'SantHilari',
};

const getClosedCentersForDate = (dateKey: string, settings: SettingsData): string[] => {
  const closedCenters: string[] = [];
  if (settings.closuresByCenter && Object.keys(settings.closuresByCenter).length > 0) {
    Object.entries(settings.closuresByCenter).forEach(([centerId, closures]) => {
      if (closures && closures.hasOwnProperty(dateKey)) closedCenters.push(centerId);
    });
  } else {
    if (settings.closuresArbucies?.hasOwnProperty(dateKey)) closedCenters.push('arbucies');
    if (settings.closuresSantHilari?.hasOwnProperty(dateKey)) closedCenters.push('sant-hilari');
  }
  return closedCenters;
};

export const getEffectiveSessionsForDate = (
  date: Date,
  schedules: Schedule[],
  settings: SettingsData,
  customSessions: Record<string, EffectiveSession[]>
): EffectiveSession[] => {
  const dateKey = dateToKey(date);

  // Sessions personalitzades (modificades des del Calendari) tenen prioritat absoluta
  if (customSessions[dateKey]) {
    return customSessions[dateKey];
  }

  const isHoliday = !!settings.officialHolidays?.hasOwnProperty(dateKey);
  const isVacation = !!settings.vacations?.hasOwnProperty(dateKey);
  if (isHoliday || isVacation) return [];

  const sortedSchedules = [...schedules].sort((a, b) => b.startDate.localeCompare(a.startDate));
  const scheduleForDate = sortedSchedules.find((s) => {
    const sStart = s.startDate;
    const sEnd = s.endDate || '9999-12-31';
    return dateKey >= sStart && dateKey <= sEnd;
  });
  if (!scheduleForDate) return [];

  const dayOfWeek = date.getDay();
  const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek;
  const scheduleSessions = scheduleForDate.sessions[adjustedDay] || [];

  const closedCenters = getClosedCentersForDate(dateKey, settings);
  const closedLegacyIds = closedCenters.map((id) => CENTER_ID_TO_LEGACY[id]).filter(Boolean);

  return scheduleSessions
    .filter((s) => !closedLegacyIds.includes(s.center))
    .map((s) => ({ time: s.time, program: s.program, center: s.center, isCustom: false, isDeleted: false }));
};
