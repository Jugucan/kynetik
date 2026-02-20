// src/hooks/useCenters.ts
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface YearlyConfig {
  workDays: number[];
  availableVacationDays: number;
}

export interface Center {
  id: string;
  name: string;
  color: string;
  isActive: boolean;
  localHolidays: LocalHoliday[];
  createdAt: string;
  deactivatedAt?: string;
  defaultConfig: YearlyConfig;
  yearlyConfigs?: Record<number, YearlyConfig>;
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

const defaultCenters: Center[] = [
  {
    id: 'arbucies',
    name: 'Arbúcies',
    color: 'blue',
    isActive: true,
    localHolidays: [{ month: 7, day: 16, name: 'Festa Major Arbúcies' }],
    createdAt: '2024-01-01',
    defaultConfig: { workDays: [1, 2, 4], availableVacationDays: 13 },
    yearlyConfigs: {},
  },
  {
    id: 'sant-hilari',
    name: 'Sant Hilari',
    isActive: true,
    color: 'green',
    localHolidays: [{ month: 0, day: 13, name: 'Sant Hilari (Festa Major)' }],
    createdAt: '2024-01-01',
    defaultConfig: { workDays: [3, 5], availableVacationDays: 9 },
    yearlyConfigs: {},
  },
];

const migrateCenterToNewFormat = (center: any): Center => {
  if (center.defaultConfig && center.yearlyConfigs !== undefined) {
    return center as Center;
  }
  return {
    ...center,
    defaultConfig: {
      workDays: center.workDays || [],
      availableVacationDays: center.availableVacationDays || 0,
    },
    yearlyConfigs: {},
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

  useEffect(() => {
    const fetchCenters = async () => {
      try {
        const docSnap = await getDoc(CENTERS_DOC_REF);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const loadedCenters = (data.centers || []).map(migrateCenterToNewFormat);
          setCenters(loadedCenters);
        } else {
          // No existeix el document: crear-lo amb els centres per defecte
          await setDoc(CENTERS_DOC_REF, { centers: defaultCenters });
          setCenters(defaultCenters);
        }
      } catch (error) {
        console.error("❌ Error carregant centres:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCenters();
  }, []);

  const saveCenters = async (newCenters: Center[]) => {
    await setDoc(CENTERS_DOC_REF, { centers: newCenters });
    // Actualitzem l'estat local perquè la UI es refresqui sense recarregar
    setCenters(newCenters);
  };

  const saveCenter = async (center: Center) => {
    const updatedCenters = centers.map(c => c.id === center.id ? center : c);
    await saveCenters(updatedCenters);
  };

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

    await saveCenters([...centers, newCenter]);
    return newCenter;
  };

  const deactivateCenter = async (centerId: string) => {
    const updatedCenters = centers.map(c =>
      c.id === centerId
        ? { ...c, isActive: false, deactivatedAt: new Date().toISOString().split('T')[0] }
        : c
    );
    await saveCenters(updatedCenters);
  };

  const reactivateCenter = async (centerId: string) => {
    const updatedCenters = centers.map(c => {
      if (c.id === centerId) {
        const { deactivatedAt, ...rest } = c;
        return { ...rest, isActive: true };
      }
      return c;
    });
    await saveCenters(updatedCenters);
  };

  const updateCenter = async (centerId: string, updates: Partial<Center>) => {
    const updatedCenters = centers.map(c => c.id === centerId ? { ...c, ...updates } : c);
    await saveCenters(updatedCenters);
  };

  const updateCenterYearlyConfig = async (centerId: string, fiscalYear: number, config: YearlyConfig) => {
    const updatedCenters = centers.map(c => {
      if (c.id === centerId) {
        return { ...c, yearlyConfigs: { ...c.yearlyConfigs, [fiscalYear]: config } };
      }
      return c;
    });
    await saveCenters(updatedCenters);
  };

  const deleteCenter = async (centerId: string) => {
    await saveCenters(centers.filter(c => c.id !== centerId));
  };

  const getCenterById = (centerId: string) => centers.find(c => c.id === centerId);

  const getCenterByLegacyId = (legacyId: 'Arbucies' | 'SantHilari') => {
    const mapping: Record<string, string> = { 'Arbucies': 'arbucies', 'SantHilari': 'sant-hilari' };
    return centers.find(c => c.id === mapping[legacyId]);
  };

  const getCenterConfig = (centerId: string, fiscalYear: number): YearlyConfig => {
    const center = getCenterById(centerId);
    if (!center) return { workDays: [], availableVacationDays: 0 };
    if (center.yearlyConfigs?.[fiscalYear]) return center.yearlyConfigs[fiscalYear];
    return center.defaultConfig;
  };

  const activeCenters = centers.filter(c => c.isActive);

  return {
    centers, activeCenters, loading,
    saveCenter, addCenter, deactivateCenter, reactivateCenter,
    updateCenter, updateCenterYearlyConfig, deleteCenter,
    getCenterById, getCenterByLegacyId, getCenterConfig,
  };
};
