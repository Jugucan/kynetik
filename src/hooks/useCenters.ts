// src/hooks/useCenters.ts
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

// Interfície que defineix un centre
export interface Center {
  id: string;                    // Identificador únic (ex: 'arbucies', 'sant-hilari')
  name: string;                  // Nom visible (ex: 'Arbúcies', 'Sant Hilari')
  isActive: boolean;             // Si el centre està actiu o desactivat
  workDays: number[];            // Dies laborables (1=Dilluns, 7=Diumenge)
  availableVacationDays: number; // Dies de vacances disponibles
  localHolidays: LocalHoliday[]; // Festius locals del centre
  createdAt: string;             // Data de creació
  deactivatedAt?: string;        // Data de desactivació (si està desactivat)
}

// Interfície per als festius locals
export interface LocalHoliday {
  month: number;  // Mes (0-11, on 0=Gener)
  day: number;    // Dia del mes
  name: string;   // Nom del festiu (ex: 'Festa Major')
}

// Interfície per a les dades retornades pel hook
export interface CentersData {
  centers: Center[];
  activeCenters: Center[];
  loading: boolean;
}

const CENTERS_DOC_REF = doc(db, 'settings', 'centers');

// Centres per defecte (els teus centres actuals)
const defaultCenters: Center[] = [
  {
    id: 'arbucies',
    name: 'Arbúcies',
    isActive: true,
    workDays: [1, 2, 4], // Dilluns, Dimarts, Dijous
    availableVacationDays: 30,
    localHolidays: [
      { month: 7, day: 16, name: 'Festa Major Arbúcies' } // Agost = mes 7
    ],
    createdAt: '2024-01-01',
  },
  {
    id: 'sant-hilari',
    name: 'Sant Hilari',
    isActive: true,
    workDays: [3, 5], // Dimecres, Divendres
    availableVacationDays: 20,
    localHolidays: [
      { month: 0, day: 13, name: 'Sant Hilari (Festa Major)' } // Gener = mes 0
    ],
    createdAt: '2024-01-01',
  },
];

export const useCenters = (): CentersData & {
  saveCenter: (center: Center) => Promise<void>;
  addCenter: (center: Omit<Center, 'id' | 'createdAt'>) => Promise<Center>;
  deactivateCenter: (centerId: string) => Promise<void>;
  reactivateCenter: (centerId: string) => Promise<void>;
  updateCenter: (centerId: string, updates: Partial<Center>) => Promise<void>;
  deleteCenter: (centerId: string) => Promise<void>;
  getCenterById: (centerId: string) => Center | undefined;
  getCenterByLegacyId: (legacyId: 'Arbucies' | 'SantHilari') => Center | undefined;
} => {
  const [centers, setCenters] = useState<Center[]>([]);
  const [loading, setLoading] = useState(true);

  // Carregar centres de Firebase
  useEffect(() => {
    console.log("🔄 Carregant centres de Firebase...");
    
    const unsubscribe = onSnapshot(
      CENTERS_DOC_REF,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const loadedCenters = data.centers || [];
          console.log("✅ Centres carregats:", loadedCenters.length);
          setCenters(loadedCenters);
        } else {
          // Si no existeix el document, crear-lo amb els centres per defecte
          console.log("ℹ️ No existeixen centres, creant per defecte...");
          setDoc(CENTERS_DOC_REF, { centers: defaultCenters })
            .then(() => {
              console.log("✅ Centres per defecte creats");
              setCenters(defaultCenters);
            })
            .catch((error) => {
              console.error("❌ Error creant centres per defecte:", error);
            });
        }
        setLoading(false);
      },
      (error) => {
        console.error("❌ Error carregant centres:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Guardar tots els centres a Firebase
  const saveCenters = async (newCenters: Center[]) => {
    try {
      await setDoc(CENTERS_DOC_REF, { centers: newCenters });
      console.log("✅ Centres guardats a Firebase");
    } catch (error) {
      console.error("❌ Error guardant centres:", error);
      throw error;
    }
  };

  // Guardar un centre individual
  const saveCenter = async (center: Center) => {
    const updatedCenters = centers.map(c => 
      c.id === center.id ? center : c
    );
    await saveCenters(updatedCenters);
  };

  // Afegir un nou centre
  const addCenter = async (centerData: Omit<Center, 'id' | 'createdAt'>): Promise<Center> => {
    // Generar ID únic basat en el nom
    const id = centerData.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Eliminar accents
      .replace(/[^a-z0-9]+/g, '-')     // Substituir caràcters especials per guions
      .replace(/^-+|-+$/g, '');        // Eliminar guions al principi/final

    const newCenter: Center = {
      ...centerData,
      id,
      createdAt: new Date().toISOString().split('T')[0],
    };

    const updatedCenters = [...centers, newCenter];
    await saveCenters(updatedCenters);
    
    console.log("✅ Nou centre afegit:", newCenter.name);
    return newCenter;
  };

  // Desactivar un centre (NO eliminar)
  const deactivateCenter = async (centerId: string) => {
    const updatedCenters = centers.map(c => 
      c.id === centerId 
        ? { 
            ...c, 
            isActive: false, 
            deactivatedAt: new Date().toISOString().split('T')[0] 
          } 
        : c
    );
    await saveCenters(updatedCenters);
    console.log("⏸️ Centre desactivat:", centerId);
  };

  // Reactivar un centre
  const reactivateCenter = async (centerId: string) => {
    const updatedCenters = centers.map(c => {
      if (c.id === centerId) {
        // Creem una còpia del centre sense el camp deactivatedAt
        const { deactivatedAt, ...centerWithoutDeactivatedAt } = c;
        return {
          ...centerWithoutDeactivatedAt,
          isActive: true,
        };
      }
      return c;
    });
    await saveCenters(updatedCenters);
    console.log("▶️ Centre reactivat:", centerId);
  };

  // Actualitzar propietats d'un centre
  const updateCenter = async (centerId: string, updates: Partial<Center>) => {
    const updatedCenters = centers.map(c => 
      c.id === centerId ? { ...c, ...updates } : c
    );
    await saveCenters(updatedCenters);
    console.log("✏️ Centre actualitzat:", centerId);
  };

  // Eliminar un centre permanentment (ús amb precaució!)
  const deleteCenter = async (centerId: string) => {
    const updatedCenters = centers.filter(c => c.id !== centerId);
    await saveCenters(updatedCenters);
    console.log("🗑️ Centre eliminat permanentment:", centerId);
  };

  // Obtenir centre per ID
  const getCenterById = (centerId: string): Center | undefined => {
    return centers.find(c => c.id === centerId);
  };

  // Obtenir centre per ID antic (per compatibilitat)
  // Això mapeja 'Arbucies' -> 'arbucies' i 'SantHilari' -> 'sant-hilari'
  const getCenterByLegacyId = (legacyId: 'Arbucies' | 'SantHilari'): Center | undefined => {
    const mapping: Record<string, string> = {
      'Arbucies': 'arbucies',
      'SantHilari': 'sant-hilari',
    };
    const newId = mapping[legacyId];
    return centers.find(c => c.id === newId);
  };

  // Filtrar només centres actius
  const activeCenters = centers.filter(c => c.isActive);

  return {
    centers,
    activeCenters,
    loading,
    saveCenter,
    addCenter,
    deactivateCenter,
    reactivateCenter,
    updateCenter,
    deleteCenter,
    getCenterById,
    getCenterByLegacyId,
  };
};
