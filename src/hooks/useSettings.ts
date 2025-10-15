// src/hooks/useSettings.ts

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase'; 
import { doc, onSnapshot } from 'firebase/firestore'; 

// Defineix la interfície per a les dades de configuració
export interface SettingsData {
  vacations: string[];
  closuresArbucies: string[];
  closuresSantHilari: string[];
  loading: boolean;
}

const defaultSettings: SettingsData = {
    vacations: [],
    closuresArbucies: [],
    closuresSantHilari: [],
    loading: true,
};

// Funció auxiliar per convertir YYYY-MM-DD a objecte Date (la necessitaràs al Calendar.tsx)
// const keyToDate = (key: string): Date => {
//   const parts = key.split('-').map(p => parseInt(p, 10));
//   return new Date(parts[0], parts[1] - 1, parts[2]);
// };

export const useSettings = (): SettingsData => {
  const [settings, setSettings] = useState<SettingsData>(defaultSettings);
  
  // ⚠️ IMPORTANT: Utilitzem el mateix camí que a Settings.tsx
  const docRef = doc(db, 'settings', 'global'); 

  useEffect(() => {
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Assumim que Firebase guarda els camps com a array de strings (YYYY-MM-DD)
        setSettings({
            vacations: data.vacations || [],
            closuresArbucies: data.closuresArbucies || [],
            closuresSantHilari: data.closuresSantHilari || [],
            loading: false,
        });
      } else {
        // Document no existeix
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
