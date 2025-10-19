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

// NOTA: weekSchedule i holidays2025 ja no s'utilitzen aquí.
// Ara els horaris es gestionen a través de la pàgina "Horaris" i es guarden a Firebase.
// Els festius també es gestionen a "Configuració" i es guarden a Firebase.
