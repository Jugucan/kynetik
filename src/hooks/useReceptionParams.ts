// src/hooks/useReceptionParams.ts
// Paràmetres de nòmina de Recepció (sou base + pagues + retencions), independents
// dels de classes dirigides. Una única lectura (getDocs), filtrada per instructorId.

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import type { ReceptionParams, NewReceptionParams } from '@/types/income';

export const useReceptionParams = () => {
  const { currentUser } = useAuth();
  const [paramsList, setParamsList] = useState<ReceptionParams[]>([]);
  const [loading, setLoading] = useState(true);

  const loadParams = useCallback(async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const q = query(collection(db, 'receptionParams'), where('instructorId', '==', currentUser.uid));
      const snap = await getDocs(q);
      const data: ReceptionParams[] = [];
      snap.forEach((d) => data.push({ id: d.id, ...(d.data() as Omit<ReceptionParams, 'id'>) }));
      data.sort((a, b) => b.year - a.year);
      setParamsList(data);
    } catch (error) {
      console.error('Error carregant paràmetres de recepció:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadParams();
  }, [loadParams]);

  const getParamsForYear = useCallback(
    (year: number): ReceptionParams | undefined => {
      const exact = paramsList.find((p) => p.year === year);
      if (exact) return exact;
      const previous = paramsList.filter((p) => p.year < year).sort((a, b) => b.year - a.year)[0];
      if (previous) return previous;
      return paramsList.filter((p) => p.year > year).sort((a, b) => a.year - b.year)[0];
    },
    [paramsList]
  );

  const saveParamsForYear = async (year: number, values: Omit<NewReceptionParams, 'instructorId' | 'year'>) => {
    if (!currentUser) return;
    const existing = paramsList.find((p) => p.year === year);
    if (existing) {
      await updateDoc(doc(db, 'receptionParams', existing.id), values);
      setParamsList((prev) => prev.map((p) => (p.id === existing.id ? { ...p, ...values } : p)));
    } else {
      const newEntry: NewReceptionParams = { instructorId: currentUser.uid, year, ...values };
      const entryWithDate = { ...newEntry, createdAt: new Date().toISOString() };
      const docRef = await addDoc(collection(db, 'receptionParams'), entryWithDate);
      setParamsList((prev) => [{ id: docRef.id, ...entryWithDate }, ...prev]);
    }
  };

  return { loading, getParamsForYear, saveParamsForYear };
};
