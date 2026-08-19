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

export interface IncentiveEntry {
  id: string;
  instructorId: string;
  periodStart: string; // 'YYYY-MM-DD'
  periodEnd: string;   // 'YYYY-MM-DD'
  amount: number;
  createdAt: string;
}

export type NewIncentiveEntry = Omit<IncentiveEntry, 'id' | 'createdAt'>;
