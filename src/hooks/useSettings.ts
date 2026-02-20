// src/hooks/useSettings.ts (Actualitzat per suportar centres dinàmics)

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase'; 
import { doc, getDoc } from 'firebase/firestore'; 

// Defineix la interfície per a les dades de configuració
export interface SettingsData {
  vacations: Record<string, string>;
  closuresByCenter: Record<string, Record<string, string>>;
  officialHolidays: Record<string, string>;
  closuresArbucies: Record<string, string>;
  closuresSantHilari: Record<string, string>;
  workDaysArbucies: number[];
  workDaysSantHilari: number[];
  availableDaysArbucies: number;
  availableDaysSantHilari: number;
  loading: boolean;
}

const defaultSettings: SettingsData = {
    vacations: {},
    closuresByCenter: {},
    officialHolidays: {},
    closuresArbucies: {},
    closuresSantHilari: {},
    workDaysArbucies: [1, 2, 4], 
    workDaysSantHilari: [3, 5],
    availableDaysArbucies: 30,
    availableDaysSantHilari: 20,
    loading: true,
};

export const keyToDate = (key: string): Date | null => {
    if (typeof key !== 'string') return null;
    const parts = key.split('-').map(p => parseInt(p, 10));
    if (parts.length < 3 || parts.some(isNaN)) return null;
    const date = new Date(parts[0], parts[1] - 1, parts[2]); 
    date.setHours(0, 0, 0, 0);
    return isNaN(date.getTime()) ? null : date;
};

export const useSettings = (): SettingsData => {
  const [settings, setSettings] = useState<SettingsData>(defaultSettings);
  
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'global');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          
          let closuresByCenter: Record<string, Record<string, string>> = {};
          if (data.closuresByCenter && typeof data.closuresByCenter === 'object') {
            closuresByCenter = data.closuresByCenter;
          }
          
          if (Object.keys(closuresByCenter).length === 0) {
            if (data.closuresArbucies && Object.keys(data.closuresArbucies).length > 0) {
              closuresByCenter['arbucies'] = data.closuresArbucies;
            }
            if (data.closuresSantHilari && Object.keys(data.closuresSantHilari).length > 0) {
              closuresByCenter['sant-hilari'] = data.closuresSantHilari;
            }
          }
          
          setSettings({
              vacations: (data.vacations && typeof data.vacations === 'object' && !Array.isArray(data.vacations)) ? data.vacations : {},
              closuresByCenter,
              officialHolidays: (data.officialHolidays && typeof data.officialHolidays === 'object' && !Array.isArray(data.officialHolidays)) ? data.officialHolidays : {},
              closuresArbucies: closuresByCenter['arbucies'] || 
                ((data.closuresArbucies && typeof data.closuresArbucies === 'object' && !Array.isArray(data.closuresArbucies)) ? data.closuresArbucies : {}),
              closuresSantHilari: closuresByCenter['sant-hilari'] || 
                ((data.closuresSantHilari && typeof data.closuresSantHilari === 'object' && !Array.isArray(data.closuresSantHilari)) ? data.closuresSantHilari : {}),
              workDaysArbucies: (data.workDaysArbucies && Array.isArray(data.workDaysArbucies)) ? data.workDaysArbucies : defaultSettings.workDaysArbucies,
              workDaysSantHilari: (data.workDaysSantHilari && Array.isArray(data.workDaysSantHilari)) ? data.workDaysSantHilari : defaultSettings.workDaysSantHilari,
              availableDaysArbucies: typeof data.availableDaysArbucies === 'number' ? data.availableDaysArbucies : defaultSettings.availableDaysArbucies,
              availableDaysSantHilari: typeof data.availableDaysSantHilari === 'number' ? data.availableDaysSantHilari : defaultSettings.availableDaysSantHilari,
              loading: false,
          });
        } else {
          setSettings(prev => ({ ...prev, loading: false }));
        }
      } catch (error) {
        console.error("Error loading settings from Firebase:", error);
        setSettings(prev => ({ ...prev, loading: false }));
      }
    };

    fetchSettings();
  }, []);

  return settings;
};
