// src/hooks/useSettings.ts (Codi Corregit + Festius Oficials)

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase'; 
import { doc, onSnapshot } from 'firebase/firestore'; 

// Defineix la interfície per a les dades de configuració
export interface SettingsData {
  // Les dades són Objectes (Map de data -> motiu)
  vacations: Record<string, string>;
  closuresArbucies: Record<string, string>;
  closuresSantHilari: Record<string, string>;
  officialHolidays: Record<string, string>; // 🎉 NOU: Festius oficials
  // Altres dades
  workDaysArbucies: number[];
  workDaysSantHilari: number[];
  availableDaysArbucies: number;
  availableDaysSantHilari: number;
  loading: boolean;
}

const defaultSettings: SettingsData = {
    vacations: {},
    closuresArbucies: {},
    closuresSantHilari: {},
    officialHolidays: {}, // 🎉 NOU
    workDaysArbucies: [1, 2, 4], 
    workDaysSantHilari: [3, 5],
    availableDaysArbucies: 30,
    availableDaysSantHilari: 20,
    loading: true,
};

// Funció auxiliar per convertir string YYYY-MM-DD a objecte Date
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
  
  const docRef = doc(db, 'settings', 'global'); 

  useEffect(() => {
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Assegura que els camps de data són objectes
        setSettings({
            vacations: (data.vacations && typeof data.vacations === 'object' && !Array.isArray(data.vacations)) ? data.vacations : {},
            closuresArbucies: (data.closuresArbucies && typeof data.closuresArbucies === 'object' && !Array.isArray(data.closuresArbucies)) ? data.closuresArbucies : {},
            closuresSantHilari: (data.closuresSantHilari && typeof data.closuresSantHilari === 'object' && !Array.isArray(data.closuresSantHilari)) ? data.closuresSantHilari : {},
            officialHolidays: (data.officialHolidays && typeof data.officialHolidays === 'object' && !Array.isArray(data.officialHolidays)) ? data.officialHolidays : {}, // 🎉 NOU
            
            // Càrrega d'altres dades
            workDaysArbucies: (data.workDaysArbucies && Array.isArray(data.workDaysArbucies)) ? data.workDaysArbucies : defaultSettings.workDaysArbucies,
            workDaysSantHilari: (data.workDaysSantHilari && Array.isArray(data.workDaysSantHilari)) ? data.workDaysSantHilari : defaultSettings.workDaysSantHilari,
            availableDaysArbucies: typeof data.availableDaysArbucies === 'number' ? data.availableDaysArbucies : defaultSettings.availableDaysArbucies,
            availableDaysSantHilari: typeof data.availableDaysSantHilari === 'number' ? data.availableDaysSantHilari : defaultSettings.availableDaysSantHilari,
            
            loading: false,
        });
      } else {
        setSettings(prev => ({ ...prev, loading: false }));
      }
    }, (error) => {
        console.error("Error loading settings from Firebase:", error);
        setSettings(prev => ({ ...prev, loading: false }));
    });

    return () => unsubscribe();
  }, []);

  return settings;
};
