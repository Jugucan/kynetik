// src/hooks/useSettings.ts

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase'; 
import { doc, onSnapshot } from 'firebase/firestore'; 

// Defineix la interfície per a les dades de configuració
export interface SettingsData {
  vacations: string[]; // Ara seran array de strings YYYY-MM-DD
  closuresArbucies: string[];
  closuresSantHilari: string[];
  loading: boolean;
  // Afegeix camps addicionals si calen per a altres pàgines, com workDays/availableDays
  workDaysArbucies?: number[]; 
  workDaysSantHilari?: number[];
}

const defaultSettings: SettingsData = {
    vacations: [],
    closuresArbucies: [],
    closuresSantHilari: [],
    loading: true,
    workDaysArbucies: [],
    workDaysSantHilari: [],
};

// Funció per convertir l'objecte de Firebase {'YYYY-MM-DD': 'reason'} en array de strings ['YYYY-MM-DD']
const convertMapToArray = (dataField: Record<string, string> | any): string[] => {
  // Comprova si és un objecte (el nou format) i no un array (l'antic)
  if (dataField && typeof dataField === 'object' && !Array.isArray(dataField)) {
    return Object.keys(dataField); // Extreu les claus (que són les dates en format string)
  }
  // Si encara és l'antic format (array de strings) o és null, retorna un array buit o el que sigui
  return Array.isArray(dataField) ? dataField : [];
};

export const useSettings = (): SettingsData => {
  const [settings, setSettings] = useState<SettingsData>(defaultSettings);
  
  // ⚠️ IMPORTANT: Utilitzem el mateix camí que a Settings.tsx
  const docRef = doc(db, 'settings', 'global'); 

  useEffect(() => {
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Aplica el nou conversor per solucionar el TypeError a Calendar.tsx
        setSettings({
            vacations: convertMapToArray(data.vacations),
            closuresArbucies: convertMapToArray(data.closuresArbucies),
            closuresSantHilari: convertMapToArray(data.closuresSantHilari),
            loading: false,
            // Afegeix els altres camps que Settings.tsx està guardant
            workDaysArbucies: data.workDaysArbucies || [],
            workDaysSantHilari: data.workDaysSantHilari || [],
        });
      } else {
        // Document no existeix
        setSettings(prev => ({ ...prev, loading: false }));
      }
    }, (error) => {
        console.error("Error al carregar la configuració des de useSettings:", error);
        setSettings(prev => ({ ...prev, loading: false }));
    });

    return () => unsubscribe();
  }, []);

  return settings;
};
