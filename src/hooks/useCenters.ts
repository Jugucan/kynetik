// src/hooks/useCenters.ts
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

// 🆕 Configuració per any fiscal
export interface YearlyConfig {
  workDays: number[];
  availableVacationDays: number;
}

// Interfície que defineix un centre
export interface Center {
  id: string;
  name: string;
  isActive: boolean;
  localHolidays: LocalHoliday[];
  createdAt: string;
  deactivatedAt?: string;
  
  // 🆕 Configuració per defecte (per compatibilitat i nous anys)
  defaultConfig: YearlyConfig;
  
  // 🆕 Configuracions específiques per any fiscal
  yearlyConfigs?: Record<number, YearlyConfig>;
  
  // 🔙 COMPATIBILITAT: Camps antics (es mantenen però no s'usen)
  workDays?: number[];
  availableVacationDays?: number;
}

export interface LocalHoliday {
  month: number;
  day: number;
  name: string;
}

export interface CentersData {
  centers: Center[];
  activeCenters: Center[];
  loading: boolean;
}

const CENTERS_DOC_REF = doc(db, 'settings', 'centers');

// Centres per defecte amb la nova estructura
const defaultCenters: Center[] = [
  {
    id: 'arbucies',
    name: 'Arbúcies',
    isActive: true,
    localHolidays: [
      { month: 7, day: 16, name: 'Festa Major Arbúcies' }
    ],
    createdAt: '2024-01-01',
    defaultConfig: {
      workDays: [1, 2, 4],
      availableVacationDays: 13,
    },
    yearlyConfigs: {},
  },
  {
    id: 'sant-hilari',
    name: 'Sant Hilari',
    isActive: true,
    localHolidays: [
      { month: 0, day: 13, name: 'Sant Hilari (Festa Major)' }
    ],
    createdAt: '2024-01-01',
    defaultConfig: {
      workDays: [3, 5],
      availableVacationDays: 9,
    },
    yearlyConfigs: {},
  },
];

// 🆕 Funció per migrar centres antics al nou format
const migrateCenterToNewFormat = (center: any): Center => {
  // Si ja té la nova estructura, retornar-lo tal qual
  if (center.defaultConfig && center.yearlyConfigs !== undefined) {
    return center as Center;
  }
  
  // Migrar del format antic al nou
  console.log("🔄 Migrant centre al nou format:", center.name);
  
  return {
    ...center,
    defaultConfig: {
      workDays: center.workDays || [],
      availableVacationDays: center.availableVacationDays || 0,
    },
    yearlyConfigs: {},
    // Mantenim els camps antics per compatibilitat
    workDays: center.workDays,
    availableVacationDays: center.availableVacationDays,
  };
};

export const useCenters = (): CentersData & {
  saveCenter: (center: Center) => Promise<void>;
  addCenter: (center: Omit<Center, 'id' | 'createdAt'>) => Promise<Center>;
  deactivateCenter: (centerId: string) => Promise<void>;
  reactivateCenter: (centerId: string) => Promise<void>;
  updateCenter: (centerId: string, updates: Partial<Center>) => Promise<void>;
  updateCenterYearlyConfig: (centerId: string, fiscalYear: number, config: YearlyConfig) => Promise<void>;
  deleteCenter: (centerId: string) => Promise<void>;
  getCenterById: (centerId: string) => Center | undefined;
  getCenterByLegacyId: (legacyId: 'Arbucies' | 'SantHilari') => Center | undefined;
  getCenterConfig: (centerId: string, fiscalYear: number) => YearlyConfig;
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
          const loadedCenters = (data.centers || []).map(migrateCenterToNewFormat);
          console.log("✅ Centres carregats i migrats:", loadedCenters.length);
          setCenters(loadedCenters);
        } else {
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
    const id = centerData.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const newCenter: Center = {
      ...centerData,
      id,
      createdAt: new Date().toISOString().split('T')[0],
      yearlyConfigs: {},
    };

    const updatedCenters = [...centers, newCenter];
    await saveCenters(updatedCenters);
    
    console.log("✅ Nou centre afegit:", newCenter.name);
    return newCenter;
  };

  // Desactivar un centre
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

  // 🆕 Actualitzar configuració d'un any específic
  const updateCenterYearlyConfig = async (
    centerId: string, 
    fiscalYear: number, 
    config: YearlyConfig
  ) => {
    const updatedCenters = centers.map(c => {
      if (c.id === centerId) {
        return {
          ...c,
          yearlyConfigs: {
            ...c.yearlyConfigs,
            [fiscalYear]: config,
          },
        };
      }
      return c;
    });
    await saveCenters(updatedCenters);
    console.log(`✏️ Configuració actualitzada per ${centerId} any ${fiscalYear}-${fiscalYear + 1}`);
  };

  // Eliminar un centre permanentment
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
  const getCenterByLegacyId = (legacyId: 'Arbucies' | 'SantHilari'): Center | undefined => {
    const mapping: Record<string, string> = {
      'Arbucies': 'arbucies',
      'SantHilari': 'sant-hilari',
    };
    const newId = mapping[legacyId];
    return centers.find(c => c.id === newId);
  };

  // 🆕 Obtenir configuració d'un centre per un any fiscal específic
  const getCenterConfig = (centerId: string, fiscalYear: number): YearlyConfig => {
    const center = getCenterById(centerId);
    if (!center) {
      return { workDays: [], availableVacationDays: 0 };
    }

    // Si hi ha configuració específica per aquest any, usar-la
    if (center.yearlyConfigs && center.yearlyConfigs[fiscalYear]) {
      return center.yearlyConfigs[fiscalYear];
    }

    // Si no, usar la configuració per defecte
    return center.defaultConfig;
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
    updateCenterYearlyConfig,
    deleteCenter,
    getCenterById,
    getCenterByLegacyId,
    getCenterConfig,
  };
};
