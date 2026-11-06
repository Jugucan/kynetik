// src/types/reception.ts
// Tipus per a l'horari de recepció (independent de l'horari de classes dirigides).

export interface ReceptionShift {
  start: string; // 'HH:MM'
  end: string;   // 'HH:MM'
}

// 'absent' = aquell dia no hi vaig (malaltia, permís, etc.)
// 'custom' = aquell dia faig un horari diferent del de la plantilla (o hi vaig fora del meu horari)
export type ReceptionOverrideType = 'absent' | 'custom';

export interface ReceptionOverride {
  type: ReceptionOverrideType;
  start?: string;
  end?: string;
  note?: string;
}

export interface ReceptionScheduleData {
  // Plantilla setmanal. Claus "1" (dilluns) ... "7" (diumenge). Els dies sense torn no hi són.
  weekly: Record<string, ReceptionShift>;
  // Excepcions per dia concret. Clau 'YYYY-MM-DD'.
  overrides: Record<string, ReceptionOverride>;
}

export type ReceptionOffReason = 'absent' | 'vacation' | 'holiday' | 'closure' | 'no-shift';

export type ReceptionDayStatus =
  | { kind: 'shift'; start: string; end: string; minutes: number; source: 'template' | 'override'; note?: string }
  | { kind: 'off'; reason: ReceptionOffReason; note?: string };
