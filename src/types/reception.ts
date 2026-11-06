// src/types/reception.ts
// Tipus per a l'horari de recepció (independent de l'horari de classes dirigides).

export interface ReceptionShift {
  start: string; // 'HH:MM'
  end: string;   // 'HH:MM'
}

// Una versió de l'horari setmanal de recepció, vàlida en un interval de dates
// (ex: "Horari habitual", "Horari d'estiu", "Horari de Nadal").
export interface ReceptionTemplate {
  id: string;
  name: string;
  startDate: string;       // 'YYYY-MM-DD'
  endDate: string | null;  // 'YYYY-MM-DD' o null = sense data de fi
  weekly: Record<string, ReceptionShift>; // claus "1" (dilluns) ... "7" (diumenge)
}

// 'absent' = aquell dia no hi vaig (malaltia, permís, etc.)
// 'custom' = aquell dia faig un horari diferent del de l'horari (o hi vaig fora del meu horari)
export type ReceptionOverrideType = 'absent' | 'custom';

export interface ReceptionOverride {
  type: ReceptionOverrideType;
  start?: string;
  end?: string;
  note?: string;
}

export interface ReceptionScheduleData {
  templates: ReceptionTemplate[];
  // Excepcions per dia concret. Clau 'YYYY-MM-DD'.
  overrides: Record<string, ReceptionOverride>;
}

export type ReceptionOffReason = 'absent' | 'vacation' | 'holiday' | 'closure' | 'no-shift' | 'no-template';

export type ReceptionDayStatus =
  | { kind: 'shift'; start: string; end: string; minutes: number; source: 'template' | 'override'; note?: string }
  | { kind: 'off'; reason: ReceptionOffReason; note?: string };
