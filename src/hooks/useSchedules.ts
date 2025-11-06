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

  // ✅ FIX: Assegurar que el listener està sempre actiu
  useEffect(() => {
    console.log("📡 Iniciant listener de Firebase per horaris...");
    
    const unsubscribe = onSnapshot(
      SCHEDULES_DOC_REF,
      (docSnap) => {
        console.log("🔄 Firebase ha detectat canvi en horaris!");
        
        if (docSnap.exists()) {
          const firebaseData = docSnap.data();
          const schedulesData = firebaseData.schedules || [];
          
          console.log("✅ Horaris carregats:", schedulesData.length, "horaris");
          schedulesData.forEach((schedule: Schedule) => {
            console.log(`   - ${schedule.name || 'Horari sense nom'} (${schedule.isActive ? 'ACTIU' : 'inactiu'})`);
          });
          
          setData({
            schedules: schedulesData,
            loading: false,
          });
        } else {
          console.log("ℹ️ No hi ha document de horaris a Firebase");
          setData({
            schedules: [],
            loading: false,
          });
        }
      },
      (error) => {
        console.error('❌ Error carregant horaris de Firebase:', error);
        setData((prev) => ({ ...prev, loading: false }));
      }
    );

    return () => {
      console.log("🛑 Tancant listener de Firebase");
      unsubscribe();
    };
  }, []);

  const saveSchedules = async (schedules: Schedule[]) => {
    try {
      console.log("💾 Desant horaris a Firebase...", schedules.length, "horaris");
      await setDoc(SCHEDULES_DOC_REF, { schedules }, { merge: true });
      console.log("✅ Horaris guardats correctament a Firebase");
    } catch (error) {
      console.error('❌ Error al guardar horaris:', error);
      throw error;
    }
  };

  const getActiveSchedule = (): Schedule | null => {
    const active = data.schedules.find((s) => s.isActive) || null;
    if (active) {
      console.log("🟢 Horari actiu:", active.name || 'Sense nom');
    } else {
      console.log("⚠️ No hi ha horari actiu");
    }
    return active;
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

    console.log("📝 Creat horari nou:", newSchedule.id, newSchedule.name);
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

    console.log("🔴 Desactivant horari:", scheduleId);
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
