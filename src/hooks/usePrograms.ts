// src/hooks/usePrograms.ts
import { useAppData } from '@/contexts/AppDataContext';
export type { Program, Subprogram, Track, Launch } from '@/contexts/AppDataContext';

export const usePrograms = () => {
  const {
    programs,
    programsLoading: loading,
    addProgram,
    updateProgramName,
    updateProgramColor,
    toggleProgramActive,
    addSubprogram,
    activateSubprogram,
    updateTracks,
    addTrack,
    deleteTrack,
    updateLaunches,
    deleteProgram,
    deleteSubprogram,
    getActiveSubprogram,
    getAllActivePrograms,
  } = useAppData();

  return {
    programs,
    loading,
    addProgram,
    updateProgramName,
    updateProgramColor,
    toggleProgramActive,
    addSubprogram,
    activateSubprogram,
    updateTracks,
    addTrack,
    deleteTrack,
    updateLaunches,
    deleteProgram,
    deleteSubprogram,
    getActiveSubprogram,
    getAllActivePrograms,
  };
};
