// src/hooks/useSchedules.ts
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export type CenterType = 'Arbucies' | 'SantHilari';

export interface ScheduleSession {
  time: string;
  program: string;
  center: CenterType;
}

export interface Schedule {
  id: string;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  sessions: Record<number, ScheduleSession[]>;
  name?: string;
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
    const fetchSchedules = async () => {
      try {
        const docSnap = await getDoc(SCHEDULES_DOC_REF);
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
      } catch (error) {
        console.error('Error loading schedules from Firebase:', error);
        setData((prev) => ({ ...prev, loading: false }));
      }
    };

    fetchSchedules();
  }, []);

  const saveSchedules = async (schedules: Schedule[]) => {
    try {
      await setDoc(SCHEDULES_DOC_REF, { schedules });
      // Actualitzem l'estat local també perquè la UI es refresqui
      setData(prev => ({ ...prev, schedules }));
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
    today.setDate(today.getDate() - 1);
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
