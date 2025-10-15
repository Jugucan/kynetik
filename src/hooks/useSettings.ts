// src/hooks/useSettings.ts

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase'; 
import { doc, onSnapshot } from 'firebase/firestore'; 

// Defineix la interfície per a les dades de configuració
export interface SettingsData {
  // Canvi CLAU: Ara són Objectes (Map de data -> motiu)
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

// Funció auxiliar per convertir string YYYY-MM-DD a objecte Date (la pots necessitar al Calendar.tsx)
export const keyToDate = (key: string): Date | null => {
  if (typeof key !== 'string') return null;
    
  const parts = key.split('-').map(p => parseInt(p, 10));
  
  if (parts.length < 3 || parts.some(isNaN)) {
      return null;
  }
  
  const date = new Date(parts[0], parts[1] - 1, parts[2]); 
  date.setHours(0, 0, 0, 0);

  if (isNaN(date.getTime())) {
    return null;
  }
  return date;
};


export const useSettings = (): SettingsData => {
  const [settings, setSettings] = useState<SettingsData>(defaultSettings);
  
  const docRef = doc(db, 'settings', 'global'); 

  useEffect(() => {
    // ⚠️ IMPORTANT: La funció de neteja ('unsubscribe') evita que la subscripció a Firebase 
    // causi pèrdues de memòria o bucles si el component es desmunta i torna a muntar.
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // CORRECCIÓ: Llegim els camps com a Objectes/Maps
        setSettings({
            // Utilitzem una verificació robusta: si existeix i és un Objecte (Map), l'usem, si no, `{}`.
            vacations: (data.vacations && typeof data.vacations === 'object' && !Array.isArray(data.vacations)) ? data.vacations : {},
            closuresArbucies: (data.closuresArbucies && typeof data.closuresArbucies === 'object' && !Array.isArray(data.closuresArbucies)) ? data.closuresArbucies : {},
            closuresSantHilari: (data.closuresSantHilari && typeof data.closuresSantHilari === 'object' && !Array.isArray(data.closuresSantHilari)) ? data.closuresSantHilari : {},
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
  }, []); // Dependència buida per executar només una vegada

  return settings;
};
