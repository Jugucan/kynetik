// src/hooks/useReceptionSchedule.ts
// Horari de recepció (versions de l'horari setmanal + excepcions per dia). Un únic document per usuària:
// receptionSchedules/{uid}. Una sola lectura (getDoc) per sessió. No usa onSnapshot.

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, deleteField, FieldPath } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { dateToKey } from '@/utils/statsHelpers';
import type { ReceptionScheduleData, ReceptionTemplate, ReceptionOverride } from '@/types/reception';

const EMPTY: ReceptionScheduleData = { templates: [], overrides: {} };

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
      const ref = doc(db, 'receptionSchedules', currentUser.uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        setData(EMPTY);
        return;
      }
      const d = snap.data();
      let templates: ReceptionTemplate[] = Array.isArray(d.templates) ? d.templates : [];

      // Migració: si només hi ha l'antiga plantilla única ("weekly"), la convertim en la primera versió.
      if (templates.length === 0 && d.weekly && Object.keys(d.weekly).length > 0) {
        templates = [
          {
            id: `rt_${Date.now()}`,
            name: 'Horari de recepció',
            startDate: dateToKey(new Date()),
            endDate: null,
            weekly: d.weekly,
          },
        ];
        await setDoc(ref, { templates }, { mergeFields: ['templates'] });
      }

      setData({ templates, overrides: d.overrides || {} });
    } catch (error) {
      console.error('Error carregant horari de recepció:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    load();
  }, [load]);

  // Substitueix totes les versions de l'horari (només el camp "templates", no toca les excepcions)
  const saveTemplates = async (templates: ReceptionTemplate[]) => {
    if (!currentUser) return;
    await setDoc(doc(db, 'receptionSchedules', currentUser.uid), { templates }, { mergeFields: ['templates'] });
    setData((prev) => ({ ...prev, templates }));
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

  return { data, loading, saveTemplates, setOverride, removeOverride };
};
