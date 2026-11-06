// src/hooks/useReceptionSchedule.ts
// Horari de recepció (plantilla setmanal + excepcions per dia). Un únic document per usuària:
// receptionSchedules/{uid}. Una sola lectura (getDoc) per sessió. No usa onSnapshot.

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, deleteField, FieldPath } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import type { ReceptionScheduleData, ReceptionShift, ReceptionOverride } from '@/types/reception';

const EMPTY: ReceptionScheduleData = { weekly: {}, overrides: {} };

export const useReceptionSchedule = () => {
  const { currentUser } = useAuth();
  const [data, setData] = useState<ReceptionScheduleData>(EMPTY);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, 'receptionSchedules', currentUser.uid));
      if (snap.exists()) {
        const d = snap.data();
        setData({ weekly: d.weekly || {}, overrides: d.overrides || {} });
      } else {
        setData(EMPTY);
      }
    } catch (error) {
      console.error('Error carregant horari de recepció:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    load();
  }, [load]);

  // Substitueix tota la plantilla setmanal (només el camp "weekly", no toca les excepcions)
  const saveWeekly = async (weekly: Record<string, ReceptionShift>) => {
    if (!currentUser) return;
    await setDoc(doc(db, 'receptionSchedules', currentUser.uid), { weekly }, { mergeFields: ['weekly'] });
    setData((prev) => ({ ...prev, weekly }));
  };

  const setOverride = async (dateKey: string, override: ReceptionOverride) => {
    if (!currentUser) return;
    // Firestore no accepta valors "undefined": només guardem els camps que tenen valor
    const clean: ReceptionOverride = { type: override.type };
    if (override.start) clean.start = override.start;
    if (override.end) clean.end = override.end;
    if (override.note && override.note.trim()) clean.note = override.note.trim();
    await setDoc(
      doc(db, 'receptionSchedules', currentUser.uid),
      { overrides: { [dateKey]: clean } },
      { merge: true }
    );
    setData((prev) => ({ ...prev, overrides: { ...prev.overrides, [dateKey]: clean } }));
  };

  const removeOverride = async (dateKey: string) => {
    if (!currentUser) return;
    await updateDoc(
      doc(db, 'receptionSchedules', currentUser.uid),
      new FieldPath('overrides', dateKey),
      deleteField()
    );
    setData((prev) => {
      const next = { ...prev.overrides };
      delete next[dateKey];
      return { ...prev, overrides: next };
    });
  };

  return { data, loading, saveWeekly, setOverride, removeOverride };
};
