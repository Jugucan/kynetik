// src/hooks/useIncentives.ts
// CRUD dels incentius mensuals (un import combinat, no separat per centre).
// Una única lectura (getDocs) per sessió, filtrada per instructorId. No usa onSnapshot.

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import type { IncentiveEntry, NewIncentiveEntry } from '@/types/income';

export const useIncentives = () => {
  const { currentUser } = useAuth();
  const [incentives, setIncentives] = useState<IncentiveEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadIncentives = useCallback(async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const q = query(collection(db, 'incentives'), where('instructorId', '==', currentUser.uid));
      const snap = await getDocs(q);
      const data: IncentiveEntry[] = [];
      snap.forEach((d) => data.push({ id: d.id, ...(d.data() as Omit<IncentiveEntry, 'id'>) }));
      setIncentives(data);
    } catch (error) {
      console.error('Error carregant incentius:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadIncentives();
  }, [loadIncentives]);

  const addIncentive = async (entry: NewIncentiveEntry) => {
    const newEntry = { ...entry, createdAt: new Date().toISOString() };
    const docRef = await addDoc(collection(db, 'incentives'), newEntry);
    setIncentives((prev) => [{ id: docRef.id, ...newEntry }, ...prev]);
  };

  const updateIncentive = async (id: string, updates: Partial<NewIncentiveEntry>) => {
    await updateDoc(doc(db, 'incentives', id), updates);
    setIncentives((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates } : i)));
  };

  const deleteIncentive = async (id: string) => {
    await deleteDoc(doc(db, 'incentives', id));
    setIncentives((prev) => prev.filter((i) => i.id !== id));
  };

  return { incentives, loading, addIncentive, updateIncentive, deleteIncentive, reload: loadIncentives };
};
