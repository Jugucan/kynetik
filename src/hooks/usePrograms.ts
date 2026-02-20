import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, writeBatch, getDoc } from 'firebase/firestore';

export interface Track {
  id: string;
  name: string;
  favorite: boolean;
  notes: string;
}

export interface Launch {
  startDate: string;
  endDate: string | null;
}

export interface Subprogram {
  id: string;
  name: string;
  tracks: Track[];
  launches: Launch[];
  totalDaysActive?: number;
  activationCount?: number;
}

export interface Program {
  id: string;
  name: string;
  code: string;
  color: string;
  subprograms: { [key: string]: Subprogram };
  isActive?: boolean;
  activeSince?: string;
  category?: string;
}

const DEFAULT_TRACKS: { [key: string]: string[] } = {
  'BP': ['Escalfament','Squats','Pit','Esquena','Bíceps/Tríceps','Lunge','Espatlles','Abdominals','Estiraments'],
  'BC': ['1A Escalfament tren superior','1B Escalfament tren inferior','Combat 1','Power Training 1','Combat 2','Power Training 2','Combat 3','Muay Thai','Power Training 3','Abdominals','Estiraments'],
  'BB': ['Escalfament','Salutació al sol','Guerrers','Equilibris','Flexions endavant','Estiraments laterals','Extensions','Torsions','Relaxació final'],
  'DEFAULT': ['Track 1','Track 2','Track 3','Track 4','Track 5','Track 6','Track 7','Track 8','Track 9','Track 10']
};

const calculateSubprogramMetrics = (subprogram: Subprogram) => {
  let totalDays = 0;
  const launches = subprogram.launches || [];
  const activationCount = launches.length;

  launches.forEach((launch) => {
    const startDate = new Date(launch.startDate);
    const endDate = launch.endDate ? new Date(launch.endDate) : new Date();
    if (isNaN(startDate.getTime())) return;
    if (launch.endDate !== null && isNaN(endDate.getTime())) return;
    const diffDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    totalDays += diffDays;
  });

  return { totalDaysActive: totalDays, activationCount };
};

const sortSubprograms = (a: Subprogram, b: Subprogram): number => {
  const getStatus = (sp: Subprogram) => {
    const launches = sp.launches || [];
    if (launches.length === 0) return { isActive: false, lastUseDate: 0 };
    const lastLaunch = launches[launches.length - 1];
    if (lastLaunch.endDate === null) return { isActive: true, lastUseDate: new Date(lastLaunch.startDate).getTime() };
    return { isActive: false, lastUseDate: new Date(lastLaunch.endDate).getTime() };
  };

  const statusA = getStatus(a);
  const statusB = getStatus(b);
  if (statusA.isActive && !statusB.isActive) return -1;
  if (!statusA.isActive && statusB.isActive) return 1;
  if (statusA.lastUseDate !== statusB.lastUseDate) return statusB.lastUseDate - statusA.lastUseDate;
  return a.name.localeCompare(b.name);
};

const processProgram = (id: string, data: any): Program => {
  const subprogramsMap: { [key: string]: Subprogram } = data.subprograms || {};
  let subprogramsArray = Object.values(subprogramsMap).map(sp => {
    const { totalDaysActive, activationCount } = calculateSubprogramMetrics(sp);
    return { ...sp, totalDaysActive, activationCount };
  });
  if (subprogramsArray.length > 0) subprogramsArray.sort(sortSubprograms);
  const sortedSubprogramsMap: { [key: string]: Subprogram } = {};
  subprogramsArray.forEach(sp => { sortedSubprogramsMap[sp.id] = sp; });

  return {
    id,
    name: data.name || '',
    code: data.code || '',
    color: data.color || '#6366f1',
    subprograms: sortedSubprogramsMap,
    isActive: data.isActive || false,
    activeSince: data.activeSince || null,
    category: data.category || '',
  };
};

export const usePrograms = () => {
  const [programs, setPrograms] = useState<{ [key: string]: Program }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const programsRef = collection(db, 'programs');
        const snapshot = await getDocs(programsRef);
        const programsData: { [key: string]: Program } = {};
        snapshot.forEach((doc) => {
          programsData[doc.id] = processProgram(doc.id, doc.data());
        });
        setPrograms(programsData);
      } catch (error) {
        console.error("Error loading programs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrograms();
  }, []);

  // Funció interna per refrescar programes després d'una escriptura
  const refreshPrograms = async () => {
    const programsRef = collection(db, 'programs');
    const snapshot = await getDocs(programsRef);
    const programsData: { [key: string]: Program } = {};
    snapshot.forEach((doc) => {
      programsData[doc.id] = processProgram(doc.id, doc.data());
    });
    setPrograms(programsData);
  };

  const getDefaultTracks = (programCode: string): Track[] => {
    const trackNames = DEFAULT_TRACKS[programCode.toUpperCase()] || DEFAULT_TRACKS['DEFAULT'];
    return trackNames.map((name, index) => ({
      id: `track-${Date.now()}-${index}`,
      name,
      favorite: false,
      notes: '',
    }));
  };

  const addProgram = async (name: string, code: string, color: string) => {
    try {
      const programId = code.toLowerCase().replace(/\s+/g, '-');
      await setDoc(doc(db, 'programs', programId), {
        name, code, color, subprograms: {}, isActive: false, activeSince: null,
      });
      await refreshPrograms();
      return { success: true };
    } catch (error) {
      console.error("Error adding program:", error);
      return { success: false, error };
    }
  };

  const updateProgramName = async (programId: string, name: string) => {
    try {
      await updateDoc(doc(db, 'programs', programId), { name });
      await refreshPrograms();
      return { success: true };
    } catch (error) {
      console.error("Error updating program name:", error);
      return { success: false, error };
    }
  };

  const updateProgramColor = async (programId: string, color: string) => {
    try {
      await updateDoc(doc(db, 'programs', programId), { color });
      await refreshPrograms();
      return { success: true };
    } catch (error) {
      console.error("Error updating program color:", error);
      return { success: false, error };
    }
  };

  const toggleProgramActive = async (programId: string, isActive: boolean) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      await updateDoc(doc(db, 'programs', programId), {
        isActive,
        activeSince: isActive ? today : null,
      });
      await refreshPrograms();
      return { success: true };
    } catch (error) {
      console.error("Error toggling program active:", error);
      return { success: false, error };
    }
  };

  const addSubprogram = async (programId: string, subprogramName: string) => {
    try {
      const program = programs[programId];
      if (!program) throw new Error("Program not found");
      const subprogramId = subprogramName.toLowerCase().replace(/\s+/g, '-');
      const defaultTracks = getDefaultTracks(program.code);
      const newSubprogram: Subprogram = { id: subprogramId, name: subprogramName, tracks: defaultTracks, launches: [] };
      await updateDoc(doc(db, 'programs', programId), {
        [`subprograms.${subprogramId}`]: newSubprogram,
        isActive: false,
        activeSince: null,
      });
      await refreshPrograms();
      return { success: true };
    } catch (error) {
      console.error("Error adding subprogram:", error);
      return { success: false, error };
    }
  };

  const activateSubprogram = async (programId: string, subprogramId: string) => {
    try {
      const program = programs[programId];
      if (!program) throw new Error("Program not found");
      const batch = writeBatch(db);
      const programRef = doc(db, 'programs', programId);
      const today = new Date().toISOString().split('T')[0];
      batch.update(programRef, { isActive: false, activeSince: null });
      const currentSubprograms = program.subprograms;
      Object.values(currentSubprograms).forEach((sp) => {
        const launches = sp.launches || [];
        if (launches.length > 0 && launches[launches.length - 1].endDate === null && sp.id !== subprogramId) {
          launches[launches.length - 1].endDate = today;
          batch.update(programRef, { [`subprograms.${sp.id}.launches`]: launches });
        }
      });
      const subprogramToActivate = currentSubprograms[subprogramId];
      if (!subprogramToActivate) throw new Error("Subprogram not found");
      const launchesFromDb = subprogramToActivate.launches.map(l => ({ startDate: l.startDate, endDate: l.endDate }));
      batch.update(programRef, {
        [`subprograms.${subprogramId}.launches`]: [...launchesFromDb, { startDate: today, endDate: null }],
      });
      await batch.commit();
      await refreshPrograms();
      return { success: true };
    } catch (error) {
      console.error("Error activating subprogram:", error);
      return { success: false, error };
    }
  };

  const updateTracks = async (programId: string, subprogramId: string, tracks: Track[]) => {
    try {
      await updateDoc(doc(db, 'programs', programId), { [`subprograms.${subprogramId}.tracks`]: tracks });
      await refreshPrograms();
      return { success: true };
    } catch (error) {
      console.error("Error updating tracks:", error);
      return { success: false, error };
    }
  };

  const addTrack = async (programId: string, subprogramId: string) => {
    try {
      const subprogram = programs[programId]?.subprograms[subprogramId];
      if (!subprogram) throw new Error("Subprogram not found");
      const newTrack: Track = { id: `track-${Date.now()}`, name: `Track ${subprogram.tracks.length + 1}`, favorite: false, notes: '' };
      return await updateTracks(programId, subprogramId, [...subprogram.tracks, newTrack]);
    } catch (error) {
      console.error("Error adding track:", error);
      return { success: false, error };
    }
  };

  const deleteTrack = async (programId: string, subprogramId: string, trackId: string) => {
    try {
      const subprogram = programs[programId]?.subprograms[subprogramId];
      if (!subprogram) throw new Error("Subprogram not found");
      return await updateTracks(programId, subprogramId, subprogram.tracks.filter(t => t.id !== trackId));
    } catch (error) {
      console.error("Error deleting track:", error);
      return { success: false, error };
    }
  };

  const updateLaunches = async (programId: string, subprogramId: string, launches: Launch[]) => {
    try {
      const sorted = [...launches].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
      await updateDoc(doc(db, 'programs', programId), { [`subprograms.${subprogramId}.launches`]: sorted });
      await refreshPrograms();
      return { success: true };
    } catch (error) {
      console.error("Error updating launches:", error);
      return { success: false, error };
    }
  };

  const deleteProgram = async (programId: string) => {
    try {
      await deleteDoc(doc(db, 'programs', programId));
      await refreshPrograms();
      return { success: true };
    } catch (error) {
      console.error("Error deleting program:", error);
      return { success: false, error };
    }
  };

  const deleteSubprogram = async (programId: string, subprogramId: string) => {
    try {
      const programRef = doc(db, 'programs', programId);
      const programSnapshot = await getDoc(programRef);
      if (!programSnapshot.exists()) throw new Error("Program not found in DB");
      const updatedSubprograms = { ...programSnapshot.data().subprograms };
      delete updatedSubprograms[subprogramId];
      await updateDoc(programRef, { subprograms: updatedSubprograms });
      await refreshPrograms();
      return { success: true };
    } catch (error) {
      console.error("Error deleting subprogram:", error);
      return { success: false, error };
    }
  };

  const getActiveSubprogram = (programId: string): { subprogram: Subprogram | null, days: number } => {
    const program = programs[programId];
    if (!program) return { subprogram: null, days: 0 };
    for (const subprogram of Object.values(program.subprograms)) {
      const launches = subprogram.launches || [];
      if (launches.length > 0 && launches[launches.length - 1].endDate === null) {
        const activeDays = Math.floor((new Date().getTime() - new Date(launches[launches.length - 1].startDate).getTime()) / (1000 * 60 * 60 * 24));
        return { subprogram, days: activeDays };
      }
    }
    return { subprogram: null, days: 0 };
  };

  const getAllActivePrograms = () => {
    const activeList: Array<{
      programId: string; programName: string; programCode: string;
      programColor: string; subprogramName: string | null; days: number; isWholeProgram: boolean;
    }> = [];

    Object.values(programs).forEach((program) => {
      const { subprogram, days } = getActiveSubprogram(program.id);
      if (subprogram) {
        activeList.push({ programId: program.id, programName: program.name, programCode: program.code, programColor: program.color, subprogramName: subprogram.name, days, isWholeProgram: false });
      } else if (program.isActive && Object.keys(program.subprograms).length === 0) {
        const daysSinceActive = Math.floor((new Date().getTime() - new Date(program.activeSince || new Date()).getTime()) / (1000 * 60 * 60 * 24));
        activeList.push({ programId: program.id, programName: program.name, programCode: program.code, programColor: program.color, subprogramName: null, days: daysSinceActive, isWholeProgram: true });
      }
    });

    return activeList;
  };

  return {
    programs, loading,
    addProgram, updateProgramName, updateProgramColor, toggleProgramActive,
    addSubprogram, activateSubprogram, updateTracks, addTrack, deleteTrack,
    updateLaunches, deleteProgram, deleteSubprogram,
    getActiveSubprogram, getAllActivePrograms,
  };
};
