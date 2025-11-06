// src/hooks/useSchedules.ts
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

export type CenterType = 'Arbucies' | 'SantHilari';

export interface ScheduleSession {
  time: string;
  program: string; // BP, BC, SB, BB, ES
  center: CenterType;
}

export interface Schedule {
  id: string;
  startDate: string; // Format YYYY-MM-DD
  endDate: string | null; // null = actiu
  isActive: boolean;
  sessions: Record<number, ScheduleSession[]>; // 1=Dilluns, 2=Dimarts, etc.
  name?: string; // Nom opcional per identificar l'horari
}

export interface SchedulesData {
  schedules: Schedule[];
  loading: boolean;
}

const SCHEDULES_DOC_REF = doc(db, 'settings', 'schedules');

const defaultSchedulesData: SchedulesData = {
  schedules: [],
  loading: true,
};

export const useSchedules = (): SchedulesData & {
  saveSchedules: (schedules: Schedule[]) => Promise<void>;
  getActiveSchedule: () => Schedule | null;
  createNewSchedule: (copyFrom?: Schedule) => Schedule;
  deactivateSchedule: (scheduleId: string) => void;
} => {
  const [data, setData] = useState<SchedulesData>(defaultSchedulesData);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      SCHEDULES_DOC_REF,
      (docSnap) => {
        if (docSnap.exists()) {
          const firebaseData = docSnap.data();
          setData({
            schedules: firebaseData.schedules || [],
            loading: false,
          });
        } else {
          setData({
            schedules: [],
            loading: false,
          });
        }
      },
      (error) => {
        console.error('Error loading schedules from Firebase:', error);
        setData((prev) => ({ ...prev, loading: false }));
      }
    );

    return () => unsubscribe();
  }, []);

  const saveSchedules = async (schedules: Schedule[]) => {
    try {
      await setDoc(SCHEDULES_DOC_REF, { schedules });
      console.log('✅ Horaris guardats a Firebase');
    } catch (error) {
      console.error('❌ Error al guardar horaris:', error);
    }
  };

  const getActiveSchedule = (): Schedule | null => {
    return data.schedules.find((s) => s.isActive) || null;
  };

  const createNewSchedule = (copyFrom?: Schedule): Schedule => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    
    const newSchedule: Schedule = {
      id: `schedule_${Date.now()}`,
      startDate: dateStr,
      endDate: null,
      isActive: false,
      sessions: copyFrom ? { ...copyFrom.sessions } : {},
      name: copyFrom ? `${copyFrom.name || 'Horari'} (còpia)` : 'Horari nou',
    };

    return newSchedule;
  };

  const deactivateSchedule = (scheduleId: string) => {
    const today = new Date();
    today.setDate(today.getDate() - 1); // Finalitza ahir
    const dateStr = today.toISOString().split('T')[0];

    const updatedSchedules = data.schedules.map((s) =>
      s.id === scheduleId
        ? { ...s, isActive: false, endDate: dateStr }
        : s
    );

    saveSchedules(updatedSchedules);
  };

  return {
    ...data,
    saveSchedules,
    getActiveSchedule,
    createNewSchedule,
    deactivateSchedule,
  };
};
