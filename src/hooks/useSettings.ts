// src/hooks/useSettings.ts

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase'; 
import { doc, onSnapshot } from 'firebase/firestore'; 

// Defineix la interfície per a les dades de configuració
export interface SettingsData {
  // Ara són Record<string, string> (Map de data -> motiu)
  vacations: Record<string, string>;
  closuresArbucies: Record<string, string>;
  closuresSantHilari: Record<string, string>;
  loading: boolean;
}

const defaultSettings: SettingsData = {
    vacations: {},
    closuresArbucies: {},
    closuresSantHilari: {},
    loading: true,
};

export const useSettings = (): SettingsData => {
  const [settings, setSettings] = useState<SettingsData>(defaultSettings);
  
  const docRef = doc(db, 'settings', 'global'); 

  useEffect(() => {
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // CORRECCIÓ: Ara llegim els camps com a Objectes/Maps
        setSettings({
            // Utilitzem un fallback a {} si el camp no existeix o no és un objecte.
            vacations: (data.vacations && typeof data.vacations === 'object') ? data.vacations : {},
            closuresArbucies: (data.closuresArbucies && typeof data.closuresArbucies === 'object') ? data.closuresArbucies : {},
            closuresSantHilari: (data.closuresSantHilari && typeof data.closuresSantHilari === 'object') ? data.closuresSantHilari : {},
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
