import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';

// Interfícies TypeScript
export interface Track {
  id: string;
  name: string;
  favorite: boolean;
  notes: string;
}

export interface Launch {
  startDate: string; // Format: YYYY-MM-DD
  endDate: string | null; // null si està actiu
}

export interface Subprogram {
  id: string;
  name: string;
  tracks: Track[];
  launches: Launch[];
}

export interface Program {
  id: string;
  name: string;
  code: string;
  color: string;
  subprograms: { [key: string]: Subprogram };
}

// Plantilles de tracks per defecte segons el programa
const DEFAULT_TRACKS: { [key: string]: string[] } = {
  'BP': [
    'Escalfament',
    'Squats',
    'Pit',
    'Esquena',
    'Bíceps/Tríceps',
    'Lunge',
    'Espatlles',
    'Abdominals',
    'Estiraments'
  ],
  'BC': [
    '1A Escalfament tren superior',
    '1B Escalfament tren inferior',
    'Combat 1',
    'Power Training 1',
    'Combat 2',
    'Power Training 2',
    'Combat 3',
    'Muay Thai',
    'Power Training 3',
    'Abdominals',
    'Estiraments'
  ],
  'BB': [
    'Escalfament',
    'Salutació al sol',
    'Guerrers',
    'Equilibris',
    'Flexions endavant',
    'Estiraments laterals',
    'Extensions',
    'Torsions',
    'Relaxació final'
  ],
  'DEFAULT': [
    'Track 1',
    'Track 2',
    'Track 3',
    'Track 4',
    'Track 5',
    'Track 6',
    'Track 7',
    'Track 8',
    'Track 9',
    'Track 10'
  ]
};

export const usePrograms = () => {
  const [programs, setPrograms] = useState<{ [key: string]: Program }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const programsRef = collection(db, 'programs');
    
    const unsubscribe = onSnapshot(programsRef, (snapshot) => {
      const programsData: { [key: string]: Program } = {};
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        programsData[doc.id] = {
          id: doc.id,
          name: data.name || '',
          code: data.code || '',
          color: data.color || '#6366f1',
          subprograms: data.subprograms || {},
        };
      });
      
      setPrograms(programsData);
      setLoading(false);
    }, (error) => {
      console.error("Error loading programs:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Funció per obtenir tracks per defecte segons el codi del programa
  const getDefaultTracks = (programCode: string): Track[] => {
    const trackNames = DEFAULT_TRACKS[programCode.toUpperCase()] || DEFAULT_TRACKS['DEFAULT'];
    
    return trackNames.map((name, index) => ({
      id: `track-${Date.now()}-${index}`,
      name: name,
      favorite: false,
      notes: '',
    }));
  };

  // Funció per afegir un nou programa
  const addProgram = async (name: string, code: string, color: string) => {
    try {
      const programId = code.toLowerCase().replace(/\s+/g, '-');
      const programRef = doc(db, 'programs', programId);
      
      await setDoc(programRef, {
        name,
        code,
        color,
        subprograms: {},
      });
      
      return { success: true };
    } catch (error) {
      console.error("Error adding program:", error);
      return { success: false, error };
    }
  };

  // Funció per actualitzar el color d'un programa
  const updateProgramColor = async (programId: string, color: string) => {
    try {
      const programRef = doc(db, 'programs', programId);
      
      await updateDoc(programRef, {
        color: color,
      });
      
      return { success: true };
    } catch (error) {
      console.error("Error updating program color:", error);
      return { success: false, error };
    }
  };

  // Funció per afegir un subprograma
  const addSubprogram = async (programId: string, subprogramName: string) => {
    try {
      const program = programs[programId];
      if (!program) throw new Error("Program not found");

      const subprogramId = subprogramName.toLowerCase().replace(/\s+/g, '-');
      const programRef = doc(db, 'programs', programId);

      // Obtenir tracks per defecte segons el codi del programa
      const defaultTracks = getDefaultTracks(program.code);

      const newSubprogram: Subprogram = {
        id: subprogramId,
        name: subprogramName,
        tracks: defaultTracks,
        launches: [],
      };

      await updateDoc(programRef, {
        [`subprograms.${subprogramId}`]: newSubprogram,
      });

      return { success: true };
    } catch (error) {
      console.error("Error adding subprogram:", error);
      return { success: false, error };
    }
  };

  // Funció per activar un subprograma (i desactivar l'anterior)
  const activateSubprogram = async (programId: string, subprogramId: string) => {
    try {
      const program = programs[programId];
      if (!program) throw new Error("Program not found");

      const batch = writeBatch(db);
      const programRef = doc(db, 'programs', programId);
      const today = new Date().toISOString().split('T')[0];

      // Desactivar tots els subprogrames actius del mateix programa
      Object.keys(program.subprograms).forEach((spId) => {
        const sp = program.subprograms[spId];
        const launches = sp.launches || [];
        
        if (launches.length > 0 && launches[launches.length - 1].endDate === null) {
          // Té un llançament actiu, el tanquem
          launches[launches.length - 1].endDate = today;
          batch.update(programRef, {
            [`subprograms.${spId}.launches`]: launches,
          });
        }
      });

      // Activar el nou subprograma
      const subprogram = program.subprograms[subprogramId];
      const newLaunch: Launch = {
        startDate: today,
        endDate: null,
      };
      
      const updatedLaunches = [...(subprogram.launches || []), newLaunch];
      
      batch.update(programRef, {
        [`subprograms.${subprogramId}.launches`]: updatedLaunches,
      });

      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error("Error activating subprogram:", error);
      return { success: false, error };
    }
  };

  // Funció per actualitzar tracks d'un subprograma
  const updateTracks = async (programId: string, subprogramId: string, tracks: Track[]) => {
    try {
      const programRef = doc(db, 'programs', programId);
      
      await updateDoc(programRef, {
        [`subprograms.${subprogramId}.tracks`]: tracks,
      });

      return { success: true };
    } catch (error) {
      console.error("Error updating tracks:", error);
      return { success: false, error };
    }
  };

  // Funció per afegir un track nou
  const addTrack = async (programId: string, subprogramId: string) => {
    try {
      const program = programs[programId];
      if (!program) throw new Error("Program not found");
      
      const subprogram = program.subprograms[subprogramId];
      if (!subprogram) throw new Error("Subprogram not found");

      const newTrack: Track = {
        id: `track-${Date.now()}`,
        name: `Track ${subprogram.tracks.length + 1}`,
        favorite: false,
        notes: '',
      };

      const updatedTracks = [...subprogram.tracks, newTrack];
      
      return await updateTracks(programId, subprogramId, updatedTracks);
    } catch (error) {
      console.error("Error adding track:", error);
      return { success: false, error };
    }
  };

  // Funció per eliminar un track
  const deleteTrack = async (programId: string, subprogramId: string, trackId: string) => {
    try {
      const program = programs[programId];
      if (!program) throw new Error("Program not found");
      
      const subprogram = program.subprograms[subprogramId];
      if (!subprogram) throw new Error("Subprogram not found");

      const updatedTracks = subprogram.tracks.filter(track => track.id !== trackId);
      
      return await updateTracks(programId, subprogramId, updatedTracks);
    } catch (error) {
      console.error("Error deleting track:", error);
      return { success: false, error };
    }
  };

  // 🆕 Funció per actualitzar l'historial de llançaments
  const updateLaunches = async (programId: string, subprogramId: string, launches: Launch[]) => {
    try {
      const programRef = doc(db, 'programs', programId);
      
      // Ordenar llançaments per data d'inici
      const sortedLaunches = [...launches].sort((a, b) => 
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );
      
      await updateDoc(programRef, {
        [`subprograms.${subprogramId}.launches`]: sortedLaunches,
      });

      return { success: true };
    } catch (error) {
      console.error("Error updating launches:", error);
      return { success: false, error };
    }
  };

  // Funció per eliminar un programa
  const deleteProgram = async (programId: string) => {
    try {
      await deleteDoc(doc(db, 'programs', programId));
      return { success: true };
    } catch (error) {
      console.error("Error deleting program:", error);
      return { success: false, error };
    }
  };

  // Funció per eliminar un subprograma
  const deleteSubprogram = async (programId: string, subprogramId: string) => {
    try {
      const program = programs[programId];
      if (!program) throw new Error("Program not found");

      const programRef = doc(db, 'programs', programId);
      
      // Crear una còpia dels subprogrames sense el que volem eliminar
      const updatedSubprograms = { ...program.subprograms };
      delete updatedSubprograms[subprogramId];

      await updateDoc(programRef, {
        subprograms: updatedSubprograms,
      });

      return { success: true };
    } catch (error) {
      console.error("Error deleting subprogram:", error);
      return { success: false, error };
    }
  };

  // Funció per obtenir el subprograma actiu d'un programa
  const getActiveSubprogram = (programId: string): { subprogram: Subprogram | null, days: number } => {
    const program = programs[programId];
    if (!program) return { subprogram: null, days: 0 };

    let activeSubprogram: Subprogram | null = null;
    let activeDays = 0;

    Object.values(program.subprograms).forEach((sp) => {
      const launches = sp.launches || [];
      if (launches.length > 0) {
        const lastLaunch = launches[launches.length - 1];
        if (lastLaunch.endDate === null) {
          // Aquest subprograma està actiu
          activeSubprogram = sp;
          const startDate = new Date(lastLaunch.startDate);
          const today = new Date();
          activeDays = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        }
      }
    });

    return { subprogram: activeSubprogram, days: activeDays };
  };

  return {
    programs,
    loading,
    addProgram,
    updateProgramColor,
    addSubprogram,
    activateSubprogram,
    updateTracks,
    addTrack,
    deleteTrack,
    updateLaunches,
    deleteProgram,
    deleteSubprogram,
    getActiveSubprogram,
  };
};
