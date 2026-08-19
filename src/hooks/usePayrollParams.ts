// src/hooks/usePayrollParams.ts
// Paràmetres de nòmina (sou base, pagues, incentius per defecte, retencions) per any,
// per calcular una previsió del net dels mesos encara sense nòmina real introduïda.
// Una única lectura (getDocs) per sessió, filtrada per instructorId. No usa onSnapshot.

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import type { PayrollParams, NewPayrollParams } from '@/types/income';

export const usePayrollParams = () => {
  const { currentUser } = useAuth();
  const [paramsList, setParamsList] = useState<PayrollParams[]>([]);
  const [loading, setLoading] = useState(true);

  const loadParams = useCallback(async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const q = query(collection(db, 'payrollParams'), where('instructorId', '==', currentUser.uid));
      const snap = await getDocs(q);
      const data: PayrollParams[] = [];
      snap.forEach((d) => data.push({ id: d.id, ...(d.data() as Omit<PayrollParams, 'id'>) }));
      data.sort((a, b) => b.year - a.year);
      setParamsList(data);
    } catch (error) {
      console.error('Error carregant paràmetres de nòmina:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadParams();
  }, [loadParams]);

  // Retorna els paràmetres exactes de l'any, o si no n'hi ha, els de l'any conegut més proper
  const getParamsForYear = useCallback(
    (year: number): PayrollParams | undefined => {
      const exact = paramsList.find((p) => p.year === year);
      if (exact) return exact;
      const previous = paramsList.filter((p) => p.year < year).sort((a, b) => b.year - a.year)[0];
      if (previous) return previous;
      return paramsList.filter((p) => p.year > year).sort((a, b) => a.year - b.year)[0];
    },
    [paramsList]
  );

  const saveParamsForYear = async (year: number, values: Omit<NewPayrollParams, 'instructorId' | 'year'>) => {
    if (!currentUser) return;
    const existing = paramsList.find((p) => p.year === year);
    if (existing) {
      await updateDoc(doc(db, 'payrollParams', existing.id), values);
      setParamsList((prev) => prev.map((p) => (p.id === existing.id ? { ...p, ...values } : p)));
    } else {
      const newEntry: NewPayrollParams = { instructorId: currentUser.uid, year, ...values };
      const entryWithDate = { ...newEntry, createdAt: new Date().toISOString() };
      const docRef = await addDoc(collection(db, 'payrollParams'), entryWithDate);
      setParamsList((prev) => [{ id: docRef.id, ...entryWithDate }, ...prev]);
    }
  };

  return { paramsList, loading, getParamsForYear, saveParamsForYear };
};
