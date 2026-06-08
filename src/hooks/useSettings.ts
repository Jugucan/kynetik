// src/hooks/useSettings.ts
import { useAppData } from '@/contexts/AppDataContext';
export type { SettingsData } from '@/contexts/AppDataContext';

export const keyToDate = (key: string): Date | null => {
  if (typeof key !== 'string') return null;
  const parts = key.split('-').map(p => parseInt(p, 10));
  if (parts.length < 3 || parts.some(isNaN)) return null;
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  date.setHours(0, 0, 0, 0);
  return isNaN(date.getTime()) ? null : date;
};

export const useSettings = () => {
  const { settings, settingsLoading: loading, saveSettings } = useAppData();
  return { ...settings, loading, saveSettings };
};
