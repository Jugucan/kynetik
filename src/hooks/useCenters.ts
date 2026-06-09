// src/hooks/useCenters.ts
// Ara llegeix del context compartit (AppDataContext) en lloc de Firebase directament.
import { useAppData } from '@/contexts/AppDataContext';
export type { Center, YearlyConfig, LocalHoliday } from '@/contexts/AppDataContext';

export const useCenters = () => {
  const {
    centers,
    activeCenters,
    centersLoading: loading,
    saveCenters,
    addCenter,
    deactivateCenter,
    reactivateCenter,
    updateCenter,
    updateCenterYearlyConfig,
    deleteCenter,
    getCenterById,
    getCenterByLegacyId,
    getCenterConfig,
  } = useAppData();

  return {
    centers,
    activeCenters,
    loading,
    saveCenters,
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
