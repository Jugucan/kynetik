// src/hooks/usePayrolls.ts
// CRUD de nòmines. Una única lectura (getDocs) per sessió quan es visita la pàgina d'Ingressos,
// filtrada per instructorId. No usa onSnapshot.

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import type { PayrollEntry, NewPayrollEntry } from '@/types/income';

export const usePayrolls = () => {
  const { firestoreUserId } = useAuth();
  const [payrolls, setPayrolls] = useState<PayrollEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPayrolls = useCallback(async () => {
    if (!firestoreUserId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const q = query(collection(db, 'payrolls'), where('instructorId', '==', firestoreUserId));
      const snap = await getDocs(q);
      const data: PayrollEntry[] = [];
      snap.forEach((d) => data.push({ id: d.id, ...(d.data() as Omit<PayrollEntry, 'id'>) }));
      data.sort((a, b) => b.periodStart.localeCompare(a.periodStart));
      setPayrolls(data);
    } catch (error) {
      console.error('Error carregant nòmines:', error);
    } finally {
      setLoading(false);
    }
  }, [firestoreUserId]);

  useEffect(() => {
    loadPayrolls();
  }, [loadPayrolls]);

  const addPayroll = async (entry: NewPayrollEntry) => {
    const newEntry = { ...entry, createdAt: new Date().toISOString() };
    const docRef = await addDoc(collection(db, 'payrolls'), newEntry);
    setPayrolls((prev) =>
      [{ id: docRef.id, ...newEntry }, ...prev].sort((a, b) => b.periodStart.localeCompare(a.periodStart))
    );
  };

  const updatePayroll = async (id: string, updates: Partial<NewPayrollEntry>) => {
    await updateDoc(doc(db, 'payrolls', id), updates);
    setPayrolls((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const deletePayroll = async (id: string) => {
    await deleteDoc(doc(db, 'payrolls', id));
    setPayrolls((prev) => prev.filter((p) => p.id !== id));
  };

  return { payrolls, loading, addPayroll, updatePayroll, deletePayroll, reload: loadPayrolls };
};
