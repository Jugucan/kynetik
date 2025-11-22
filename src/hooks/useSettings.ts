// src/hooks/useSettings.ts (Actualitzat per suportar centres dinàmics)

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase'; 
import { doc, onSnapshot } from 'firebase/firestore'; 

// Defineix la interfície per a les dades de configuració
export interface SettingsData {
  // Les dades són Objectes (Map de data -> motiu)
  vacations: Record<string, string>;
  // 🆕 Tancaments per centre: { centerId: { 'YYYY-MM-DD': 'motiu' } }
  closuresByCenter: Record<string, Record<string, string>>;
  officialHolidays: Record<string, string>;
  
  // 🔙 COMPATIBILITAT: Mantenim els camps antics per no trencar res
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
    // Compatibilitat
    closuresArbucies: {},
    closuresSantHilari: {},
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
        
        // Processar closuresByCenter si existeix
        let closuresByCenter: Record<string, Record<string, string>> = {};
        if (data.closuresByCenter && typeof data.closuresByCenter === 'object') {
          closuresByCenter = data.closuresByCenter;
        }
        
        // Si no hi ha closuresByCenter però sí els antics, migrar-los
        if (Object.keys(closuresByCenter).length === 0) {
          if (data.closuresArbucies && Object.keys(data.closuresArbucies).length > 0) {
            closuresByCenter['arbucies'] = data.closuresArbucies;
          }
          if (data.closuresSantHilari && Object.keys(data.closuresSantHilari).length > 0) {
            closuresByCenter['sant-hilari'] = data.closuresSantHilari;
          }
        }
        
        // Assegura que els camps de data són objectes
        setSettings({
            vacations: (data.vacations && typeof data.vacations === 'object' && !Array.isArray(data.vacations)) ? data.vacations : {},
            closuresByCenter,
            officialHolidays: (data.officialHolidays && typeof data.officialHolidays === 'object' && !Array.isArray(data.officialHolidays)) ? data.officialHolidays : {},
            
            // 🔙 COMPATIBILITAT: Mantenir els camps antics
            closuresArbucies: closuresByCenter['arbucies'] || 
              ((data.closuresArbucies && typeof data.closuresArbucies === 'object' && !Array.isArray(data.closuresArbucies)) ? data.closuresArbucies : {}),
            closuresSantHilari: closuresByCenter['sant-hilari'] || 
              ((data.closuresSantHilari && typeof data.closuresSantHilari === 'object' && !Array.isArray(data.closuresSantHilari)) ? data.closuresSantHilari : {}),
            
            // Càrrega d'altres dades (també per compatibilitat)
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
