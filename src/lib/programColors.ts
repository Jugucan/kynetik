// Configuració de colors i dades dels programes
export const programColors = {
  BP: { color: "bg-red-500", textColor: "text-red-500", name: "BodyPump" },
  BC: { color: "bg-orange-500", textColor: "text-orange-500", name: "BodyCombat" },
  SB: { color: "bg-purple-500", textColor: "text-purple-500", name: "Sh'Bam" },
  BB: { color: "bg-green-500", textColor: "text-green-500", name: "BodyBalance" },
  ES: { color: "bg-blue-500", textColor: "text-blue-500", name: "Estiraments" },
};

export type ProgramCode = keyof typeof programColors;

export interface Session {
  time: string;
  program: ProgramCode;
}

// Horari setmanal base - Dilluns=1, Dimarts=2, Dimecres=3, Dijous=4, Divendres=5
export const weekSchedule: Record<number, Session[]> = {
  1: [
    { time: "18:15", program: "SB" },
    { time: "19:05", program: "BP" },
    { time: "20:00", program: "BP" },
  ],
  2: [{ time: "19:30", program: "BC" }],
  3: [{ time: "17:00", program: "BP" }],
  4: [
    { time: "19:10", program: "SB" },
    { time: "20:00", program: "BP" },
  ],
  5: [
    { time: "17:00", program: "SB" },
    { time: "18:00", program: "BC" },
    { time: "19:00", program: "BP" },
    { time: "20:00", program: "ES" },
  ],
};

// Festius 2025
export const holidays2025 = [
  { date: "2025-01-01", name: "Any Nou" },
  { date: "2025-01-06", name: "Reis" },
  { date: "2025-04-18", name: "Divendres Sant" },
  { date: "2025-04-21", name: "Dilluns de Pasqua" },
  { date: "2025-05-01", name: "Festa del Treball" },
  { date: "2025-06-24", name: "Sant Joan" },
  { date: "2025-08-15", name: "Assumpció" },
  { date: "2025-09-11", name: "Diada" },
  { date: "2025-10-12", name: "Festa Nacional" },
  { date: "2025-11-01", name: "Tots Sants" },
  { date: "2025-12-06", name: "Constitució" },
  { date: "2025-12-08", name: "Immaculada" },
  { date: "2025-12-25", name: "Nadal" },
  { date: "2025-12-26", name: "Sant Esteve" },
];
