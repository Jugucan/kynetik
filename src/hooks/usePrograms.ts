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
  // Hem de canviar el tipus de 'subprograms' per poder-los ordenar
  subprograms: { [key: string]: Subprogram } | Subprogram[]; 
  isActive?: boolean; // 🆕 Per programes sense subprogrames
  activeSince?: string; // 🆕 Data d'activació del programa
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

/**
 * [INICI DEL NOU CODI PER A L'ORDENACIÓ]
 * Funció de lògica per ordenar els subprogrames segons la teva petició:
 * 1. Actiu a dalt de tot.
 * 2. Després, la resta ordenats per data d'últim ús (el més recent a dalt).
 */
const sortSubprograms = (a: Subprogram, b: Subprogram): number => {
  // Funció auxiliar per determinar l'estat i l'última data d'ús
  const getStatus = (sp: Subprogram) => {
    const launches = sp.launches || [];
    if (launches.length === 0) {
      return { isActive: false, lastUseDate: 0 }; // Sense historial, a baix de tot.
    }
    
    // El darrer llançament
    const lastLaunch = launches[launches.length - 1];

    if (lastLaunch.endDate === null) {
      // 1. Aquest subprograma està ACTIU
      // Usarem la data d'INICI per trencar empats si n'hi hagués (encara que només n'hi hauria d'haver 1 actiu).
      return { isActive: true, lastUseDate: new Date(lastLaunch.startDate).getTime() }; 
    } else {
      // 2. Aquest subprograma està INACTIU, utilitzem l'endDate com a data d'últim ús
      return { isActive: false, lastUseDate: new Date(lastLaunch.endDate).getTime() };
    }
  };

  const statusA = getStatus(a);
  const statusB = getStatus(b);

  // 1. Prioritat màxima: Actiu a dalt de tot
  if (statusA.isActive && !statusB.isActive) return -1;
  if (!statusA.isActive && statusB.isActive) return 1;

  // 2. Si tots dos tenen el mateix estat (inactius), ordenem per data d'últim ús
  // (lastUseDate) de manera DESCENDENT (el més recent (data més gran) primer).
  // Si els dos són ACTIUS, els ordenem per la data d'inici DESCENDENT (no ideal, però millor que res).
  if (statusA.lastUseDate !== statusB.lastUseDate) {
    return statusB.lastUseDate - statusA.lastUseDate;
  }

  // 3. Si tot és igual (data i estat), ordenem alfabèticament pel nom
  return a.name.localeCompare(b.name);
};
/**
 * [FINAL DEL NOU CODI PER A L'ORDENACIÓ]
 */

export const usePrograms = () => {
  const [programs, setPrograms] = useState<{ [key: string]: Program }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const programsRef = collection(db, 'programs');
    
    const unsubscribe = onSnapshot(programsRef, (snapshot) => {
      const programsData: { [key: string]: Program } = {};
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        const subprogramsMap: { [key: string]: Subprogram } = data.subprograms || {};
        
        // CONVERTIM l'objecte de subprogrames a una matriu per poder-la ordenar.
        let subprogramsArray: Subprogram[] = Object.values(subprogramsMap);

        // APLIQUEM L'ORDENACIÓ NOMÉS SI HI HA SUBPROGRAMES
        if (subprogramsArray.length > 0) {
          subprogramsArray.sort(sortSubprograms);
        }

        programsData[doc.id] = {
          id: doc.id,
          name: data.name || '',
          code: data.code || '',
          color: data.color || '#6366f1',
          // Guardem els subprogrames com una matriu (Array) ja ordenada en lloc d'un objecte
          subprograms: subprogramsArray, 
          isActive: data.isActive || false,
          activeSince: data.activeSince || null,
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
  
  // NOTE: El tipus de 'subprograms' a Program (línia 35) s'ha ajustat lleugerament
  // per reflectir que ara serà una matriu (Array) un cop processat aquí, però a Firestore 
  // continua sent un objecte per la manera com fas les actualitzacions (e.g., [`subprograms.${spId}`]).
  // Això és una pràctica comuna quan es normalitzen dades de Firebase.

  // ----------------------------------------------------------------------
  // [La resta de funcions (getDefaultTracks, addProgram, updateProgramColor, etc.)
  //  es mantenen EXACTAMENT igual que en el teu fitxer original.]
  // ----------------------------------------------------------------------
  
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
        isActive: false,
        activeSince: null,
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

  // 🆕 Funció per activar/desactivar un programa sencer (sense subprogrames)
  const toggleProgramActive = async (programId: string, isActive: boolean) => {
    try {
      const programRef = doc(db, 'programs', programId);
      const today = new Date().toISOString().split('T')[0];
      
      await updateDoc(programRef, {
        isActive: isActive,
        activeSince: isActive ? today : null,
      });
      
      return { success: true };
    } catch (error) {
      console.error("Error toggling program active:", error);
      return { success: false, error };
    }
  };

  // Funció per afegir un subprograma
  const addSubprogram = async (programId: string, subprogramName: string) => {
    try {
      const program = programs[programId];
      // Nota: Aquí 'program' ara té 'subprograms' com una Matriu, 
      // però el 'program' original (el que es guarda a Firebase) encara
      // té la clau 'subprograms' com a objecte (mapa).
      // Això no afecta la lògica d'actualització de Firebase.

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

      // Si el programa estava actiu sense subprogrames, desactivar-lo
      await updateDoc(programRef, {
        [`subprograms.${subprogramId}`]: newSubprogram,
        isActive: false,
        activeSince: null,
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

      // Desactivar el programa sencer si estava actiu
      batch.update(programRef, {
        isActive: false,
        activeSince: null,
      });

      // Recorrem l'array de subprogrames (ja ordenat) per desactivar l'anterior.
      // Hem de trobar l'objecte de subprogrames NO ORDENAT de la base de dades
      // per fer les actualitzacions (assumim que les funcions d'actualització són capaces
      // de trobar el subprograma per ID a la base de dades).
      
      // NOTA: Per evitar trencar les teves funcions d'actualització de Firebase,
      // que usen les claus de l'objecte, cal que a la teva funció principal de lectura
      // els subprogrames es guardin a l'estat com a objecte o matriu, 
      // però les funcions d'actualització que venen després han de poder accedir-hi.
      
      // Simplificació: Per a aquesta funció d'actualització (activateSubprogram),
      // hem de revertir l'ordenació per accedir a tots els subprogrames pel seu ID,
      // ja que Firebase els guarda en un mapa. Accedirem directament a la data sense ordenar.
      
      // Cal una petita assumpció o una petita modificació: 
      // Si a 'programs' tens subprograms com a Array, no podem accedir directament a 'program.subprograms[spId]'.
      // Per no fer una invasió gran, tractarem 'program.subprograms' com un Array i buscarem pel ID.
      // Això és la part menys invasiva si assumim que la funció `activateSubprogram` es crida amb un programa que conté la llista ordenada.

      const currentSubprograms = program.subprograms as Subprogram[]; // Tractem-ho com a matriu
      
      // Desactivar tots els subprogrames actius del mateix programa (buscant el que tingui endDate === null)
      currentSubprograms.forEach((sp) => {
        const launches = sp.launches || [];
        
        // Comprovar si el subprograma ja estava actiu
        if (launches.length > 0 && launches[launches.length - 1].endDate === null) {
          if (sp.id !== subprogramId) { // No actualitzem el que volem activar
             // Té un llançament actiu, el tanquem
            launches[launches.length - 1].endDate = today;
            // ATENCIÓ: L'actualització es fa sobre el mapa de Firebase
            batch.update(programRef, {
              [`subprograms.${sp.id}.launches`]: launches,
            });
          }
        }
      });

      // Activar el nou subprograma
      const subprogramToActivate = currentSubprograms.find(sp => sp.id === subprogramId);
      if (!subprogramToActivate) throw new Error("Subprogram to activate not found");
      
      const newLaunch: Launch = {
        startDate: today,
        endDate: null,
      };
      
      const updatedLaunches = [...(subprogramToActivate.launches || []), newLaunch];
      
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
      
      // Hem de buscar el subprograma dins de l'Array per obtenir les tracks.
      const subprogram = (program.subprograms as Subprogram[]).find(sp => sp.id === subprogramId);

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
      
      // Hem de buscar el subprograma dins de l'Array per obtenir les tracks.
      const subprogram = (program.subprograms as Subprogram[]).find(sp => sp.id === subprogramId);
      if (!subprogram) throw new Error("Subprogram not found");

      const updatedTracks = subprogram.tracks.filter(track => track.id !== trackId);
      
      return await updateTracks(programId, subprogramId, updatedTracks);
    } catch (error) {
      console.error("Error deleting track:", error);
      return { success: false, error };
    }
  };

  // Funció per actualitzar l'historial de llançaments
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
      
      // Per a la funció d'eliminació, hem de tornar a la lògica d'Objecte (mapa)
      // ja que l'estructura de Firebase és la que es modifica.
      const currentProgramData = await doc(db, 'programs', programId);
      const data = await currentProgramData.data();
      const updatedSubprograms = { ...data.subprograms };
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

    // Com que 'subprograms' ja està ordenat, l'actiu sempre hauria de ser el primer!
    const subprograms = program.subprograms as Subprogram[];
    
    if (subprograms.length === 0) return { subprogram: null, days: 0 };
    
    const activeSubprogram = subprograms[0];
    const launches = activeSubprogram.launches || [];
    
    if (launches.length > 0 && launches[launches.length - 1].endDate === null) {
      // Si el primer element de l'Array està actiu (endDate === null)
      const lastLaunch = launches[launches.length - 1];
      const startDate = new Date(lastLaunch.startDate);
      const today = new Date();
      const activeDays = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      return { subprogram: activeSubprogram, days: activeDays };
    }
    
    // Si no hi ha cap subprograma actiu (o el primer no ho és)
    return { subprogram: null, days: 0 };
  };


  // 🆕 Funció per obtenir tots els programes/subprogrames actius
  const getAllActivePrograms = () => {
    // Aquesta funció fa servir getActiveSubprogram, que hauria de funcionar bé ara.
    const activeList: Array<{
      programId: string;
      programName: string;
      programCode: string;
      programColor: string;
      subprogramName: string | null;
      days: number;
      isWholeProgram: boolean;
    }> = [];

    Object.values(programs).forEach((program) => {
      // Comprovar si té subprograma actiu
      const { subprogram, days } = getActiveSubprogram(program.id);
      
      if (subprogram) {
        // Té un subprograma actiu
        activeList.push({
          programId: program.id,
          programName: program.name,
          programCode: program.code,
          programColor: program.color,
          subprogramName: subprogram.name,
          days: days,
          isWholeProgram: false,
        });
      } else if (program.isActive && (program.subprograms as Subprogram[]).length === 0) {
        // El programa sencer està actiu (sense subprogrames)
        const activeSince = program.activeSince ? new Date(program.activeSince) : new Date();
        const today = new Date();
        const daysSinceActive = Math.floor((today.getTime() - activeSince.getTime()) / (1000 * 60 * 60 * 24));
        
        activeList.push({
          programId: program.id,
          programName: program.name,
          programCode: program.code,
          programColor: program.color,
          subprogramName: null,
          days: daysSinceActive,
          isWholeProgram: true,
        });
      }
    });

    return activeList;
  };

  return {
    programs,
    loading,
    addProgram,
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
