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

  // Funció per afegir un subprograma
  const addSubprogram = async (programId: string, subprogramName: string, tracks: Track[]) => {
    try {
      const program = programs[programId];
      if (!program) throw new Error("Program not found");

      const subprogramId = subprogramName.toLowerCase().replace(/\s+/g, '-');
      const programRef = doc(db, 'programs', programId);

      const newSubprogram: Subprogram = {
        id: subprogramId,
        name: subprogramName,
        tracks: tracks,
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
    addSubprogram,
    activateSubprogram,
    updateTracks,
    deleteProgram,
    getActiveSubprogram,
  };
};
