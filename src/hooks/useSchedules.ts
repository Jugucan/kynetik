// src/hooks/useSchedules.ts
import { useAppData } from '@/contexts/AppDataContext';
export type { Schedule, ScheduleSession, CenterType } from '@/contexts/AppDataContext';

export interface SchedulesData {
  schedules: import('@/contexts/AppDataContext').Schedule[];
  loading: boolean;
}

export const useSchedules = () => {
  const {
    schedules,
    schedulesLoading: loading,
    saveSchedules,
    getActiveSchedule,
    createNewSchedule,
    deactivateSchedule,
  } = useAppData();
  return { schedules, loading, saveSchedules, getActiveSchedule, createNewSchedule, deactivateSchedule };
};
