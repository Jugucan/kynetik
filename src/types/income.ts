// src/types/income.ts
// Tipus per al registre d'ingressos i nòmines

export interface PayrollEntry {
  id: string;
  instructorId: string;
  centerId: string;
  periodStart: string; // 'YYYY-MM-DD' (dia 26)
  periodEnd: string;   // 'YYYY-MM-DD' (dia 25)
  amount: number;
  notes?: string;
  createdAt: string;
}

export type NewPayrollEntry = Omit<PayrollEntry, 'id' | 'createdAt'>;
