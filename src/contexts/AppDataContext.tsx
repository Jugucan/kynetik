// src/contexts/AppDataContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, writeBatch, deleteDoc, collection, getDocs } from 'firebase/firestore';

// ── Tipus importats dels hooks originals ────────────────────────────────────

export type CenterType = 'Arbucies' | 'SantHilari';

export interface ScheduleSession {
  time: string;
  program: string;
  center: CenterType;
}

export interface Schedule {
  id: string;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  sessions: Record<number, ScheduleSession[]>;
  name?: string;
}

export interface SettingsData {
  vacations: Record<string, string>;
  closuresByCenter: Record<string, Record<string, string>>;
  officialHolidays: Record<string, string>;
  closuresArbucies: Record<string, string>;
  closuresSantHilari: Record<string, string>;
  workDaysArbucies: number[];
  workDaysSantHilari: number[];
  availableDaysArbucies: number;
  availableDaysSantHilari: number;
}

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

export interface YearlyConfig {
  workDays: number[];
  availableVacationDays: number;
}

export interface LocalHoliday {
  month: number;
  day: number;
  name: string;
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

// ── Valors per defecte ──────────────────────────────────────────────────────

const defaultSettings: SettingsData = {
  vacations: {},
  closuresByCenter: {},
  officialHolidays: {},
  closuresArbucies: {},
  closuresSantHilari: {},
  workDaysArbucies: [1, 2, 4],
  workDaysSantHilari: [3, 5],
  availableDaysArbucies: 30,
  availableDaysSantHilari: 20,
};

// ── Helpers de programs (copiats de usePrograms) ────────────────────────────

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

// ── Tipus del context ───────────────────────────────────────────────────────

interface AppDataContextType {
  // Settings
  settings: SettingsData;
  settingsLoading: boolean;
  saveSettings: (newSettings: Partial<SettingsData>) => Promise<void>;

  // Schedules
  schedules: Schedule[];
  schedulesLoading: boolean;
  saveSchedules: (schedules: Schedule[]) => Promise<void>;
  getActiveSchedule: () => Schedule | null;
  createNewSchedule: (copyFrom?: Schedule) => Schedule;
  deactivateSchedule: (scheduleId: string) => void;

  // Centers
  centers: Center[];
  activeCenters: Center[];
  centersLoading: boolean;
  saveCenters: (centers: Center[]) => Promise<void>;
  addCenter: (center: Omit<Center, 'id' | 'createdAt'>) => Promise<Center>;
  deactivateCenter: (centerId: string) => Promise<void>;
  reactivateCenter: (centerId: string) => Promise<void>;
  updateCenter: (centerId: string, updates: Partial<Center>) => Promise<void>;
  updateCenterYearlyConfig: (centerId: string, fiscalYear: number, config: YearlyConfig) => Promise<void>;
  deleteCenter: (centerId: string) => Promise<void>;
  getCenterById: (centerId: string) => Center | undefined;
  getCenterByLegacyId: (legacyId: 'Arbucies' | 'SantHilari') => Center | undefined;
  getCenterConfig: (centerId: string, fiscalYear: number) => YearlyConfig;
  
  // Programs
  programs: { [key: string]: Program };
  programsLoading: boolean;
  addProgram: (name: string, code: string, color: string) => Promise<{ success: boolean; error?: any }>;
  updateProgramName: (programId: string, name: string) => Promise<{ success: boolean; error?: any }>;
  updateProgramColor: (programId: string, color: string) => Promise<{ success: boolean; error?: any }>;
  toggleProgramActive: (programId: string, isActive: boolean) => Promise<{ success: boolean; error?: any }>;
  addSubprogram: (programId: string, subprogramName: string) => Promise<{ success: boolean; error?: any }>;
  activateSubprogram: (programId: string, subprogramId: string) => Promise<{ success: boolean; error?: any }>;
  updateTracks: (programId: string, subprogramId: string, tracks: Track[]) => Promise<{ success: boolean; error?: any }>;
  addTrack: (programId: string, subprogramId: string) => Promise<{ success: boolean; error?: any }>;
  deleteTrack: (programId: string, subprogramId: string, trackId: string) => Promise<{ success: boolean; error?: any }>;
  updateLaunches: (programId: string, subprogramId: string, launches: Launch[]) => Promise<{ success: boolean; error?: any }>;
  deleteProgram: (programId: string) => Promise<{ success: boolean; error?: any }>;
  deleteSubprogram: (programId: string, subprogramId: string) => Promise<{ success: boolean; error?: any }>;
  getActiveSubprogram: (programId: string) => { subprogram: Subprogram | null; days: number };
  getAllActivePrograms: () => Array<{
    programId: string; programName: string; programCode: string;
    programColor: string; subprogramName: string | null; days: number; isWholeProgram: boolean;
  }>;
}

// ── Context i Provider ──────────────────────────────────────────────────────

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export const useAppData = () => {
  const context = useContext(AppDataContext);
  if (!context) throw new Error('useAppData must be used within AppDataProvider');
  return context;
};

const DEFAULT_CENTERS: Center[] = [
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

const DEFAULT_TRACKS: { [key: string]: string[] } = {
  'BP': ['Escalfament','Squats','Pit','Esquena','Bíceps/Tríceps','Lunge','Espatlles','Abdominals','Estiraments'],
  'BC': ['1A Escalfament tren superior','1B Escalfament tren inferior','Combat 1','Power Training 1','Combat 2','Power Training 2','Combat 3','Muay Thai','Power Training 3','Abdominals','Estiraments'],
  'BB': ['Escalfament','Salutació al sol','Guerrers','Equilibris','Flexions endavant','Estiraments laterals','Extensions','Torsions','Relaxació final'],
  'DEFAULT': ['Track 1','Track 2','Track 3','Track 4','Track 5','Track 6','Track 7','Track 8','Track 9','Track 10']
};

export const AppDataProvider = ({ children }: { children: ReactNode }) => {

  // ── State ─────────────────────────────────────────────────────────────────

  const [settings, setSettings] = useState<SettingsData>(defaultSettings);
  const [settingsLoading, setSettingsLoading] = useState(true);

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(true);

  const [programs, setPrograms] = useState<{ [key: string]: Program }>({});
  const [programsLoading, setProgramsLoading] = useState(true);
  const [centers, setCenters] = useState<Center[]>([]);
  const [centersLoading, setCentersLoading] = useState(true);

  // ── Càrrega inicial: UNA SOLA VEGADA per sessió ───────────────────────────

  useEffect(() => {
    const loadAll = async () => {
      try {
        const [settingsSnap, schedulesSnap, programsSnap, centersSnap] = await Promise.all([
          getDoc(doc(db, 'settings', 'global')),
          getDoc(doc(db, 'settings', 'schedules')),
          getDocs(collection(db, 'programs')),
          getDoc(doc(db, 'settings', 'centers')),
        ]);

        // Settings
        if (settingsSnap.exists()) {
          const data = settingsSnap.data();
          let closuresByCenter: Record<string, Record<string, string>> = {};
          if (data.closuresByCenter && typeof data.closuresByCenter === 'object') {
            closuresByCenter = data.closuresByCenter;
          }
          if (Object.keys(closuresByCenter).length === 0) {
            if (data.closuresArbucies) closuresByCenter['arbucies'] = data.closuresArbucies;
            if (data.closuresSantHilari) closuresByCenter['sant-hilari'] = data.closuresSantHilari;
          }
          setSettings({
            vacations: data.vacations || {},
            closuresByCenter,
            officialHolidays: data.officialHolidays || {},
            closuresArbucies: closuresByCenter['arbucies'] || data.closuresArbucies || {},
            closuresSantHilari: closuresByCenter['sant-hilari'] || data.closuresSantHilari || {},
            workDaysArbucies: data.workDaysArbucies || defaultSettings.workDaysArbucies,
            workDaysSantHilari: data.workDaysSantHilari || defaultSettings.workDaysSantHilari,
            availableDaysArbucies: data.availableDaysArbucies ?? defaultSettings.availableDaysArbucies,
            availableDaysSantHilari: data.availableDaysSantHilari ?? defaultSettings.availableDaysSantHilari,
          });
        }
        setSettingsLoading(false);

        // Schedules
        if (schedulesSnap.exists()) {
          setSchedules(schedulesSnap.data().schedules || []);
        }
        setSchedulesLoading(false);

        // Programs
        const programsData: { [key: string]: Program } = {};
        programsSnap.forEach((d) => { programsData[d.id] = processProgram(d.id, d.data()); });
        setPrograms(programsData);
        setProgramsLoading(false);

        // Centers
        if (centersSnap.exists()) {
          const data = centersSnap.data();
          setCenters((data.centers || []).map(migrateCenterToNewFormat));
        } else {
          await setDoc(doc(db, 'settings', 'centers'), { centers: DEFAULT_CENTERS });
          setCenters(DEFAULT_CENTERS);
        }
        setCentersLoading(false);

      } catch (error) {
        console.error('Error carregant dades inicials:', error);
        setSettingsLoading(false);
        setSchedulesLoading(false);
        setProgramsLoading(false);
      }
    };

    loadAll();
  }, []);

  // ── Settings: guardar ─────────────────────────────────────────────────────

  const saveSettings = async (newSettings: Partial<SettingsData>) => {
    const updated = { ...settings, ...newSettings };
    await setDoc(doc(db, 'settings', 'global'), updated);
    setSettings(updated);
  };

  // ── Schedules: funcions ───────────────────────────────────────────────────

  const saveSchedules = async (newSchedules: Schedule[]) => {
    await setDoc(doc(db, 'settings', 'schedules'), { schedules: newSchedules });
    setSchedules(newSchedules);
  };

  const getActiveSchedule = useCallback((): Schedule | null => {
    return schedules.find((s) => s.isActive) || null;
  }, [schedules]);

  const createNewSchedule = useCallback((copyFrom?: Schedule): Schedule => {
    const today = new Date().toISOString().split('T')[0];
    return {
      id: `schedule_${Date.now()}`,
      startDate: today,
      endDate: null,
      isActive: false,
      sessions: copyFrom ? { ...copyFrom.sessions } : {},
      name: copyFrom ? `${copyFrom.name || 'Horari'} (còpia)` : 'Horari nou',
    };
  }, []);

  const deactivateSchedule = useCallback((scheduleId: string) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];
    const updated = schedules.map((s) =>
      s.id === scheduleId ? { ...s, isActive: false, endDate: dateStr } : s
    );
    saveSchedules(updated);
  }, [schedules]);

  // ── Centers: funcions ─────────────────────────────────────────────────────

  const saveCenters = async (newCenters: Center[]) => {
    await setDoc(doc(db, 'settings', 'centers'), { centers: newCenters });
    setCenters(newCenters);
  };

  const addCenter = async (centerData: Omit<Center, 'id' | 'createdAt'>): Promise<Center> => {
    const id = centerData.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const newCenter: Center = { ...centerData, id, createdAt: new Date().toISOString().split('T')[0], yearlyConfigs: {} };
    await saveCenters([...centers, newCenter]);
    return newCenter;
  };

  const deactivateCenter = async (centerId: string) => {
    await saveCenters(centers.map(c =>
      c.id === centerId ? { ...c, isActive: false, deactivatedAt: new Date().toISOString().split('T')[0] } : c
    ));
  };

  const reactivateCenter = async (centerId: string) => {
    await saveCenters(centers.map(c => {
      if (c.id === centerId) { const { deactivatedAt, ...rest } = c; return { ...rest, isActive: true }; }
      return c;
    }));
  };

  const updateCenter = async (centerId: string, updates: Partial<Center>) => {
    await saveCenters(centers.map(c => c.id === centerId ? { ...c, ...updates } : c));
  };

  const updateCenterYearlyConfig = async (centerId: string, fiscalYear: number, config: YearlyConfig) => {
    await saveCenters(centers.map(c =>
      c.id === centerId ? { ...c, yearlyConfigs: { ...c.yearlyConfigs, [fiscalYear]: config } } : c
    ));
  };

  const deleteCenter = async (centerId: string) => {
    await saveCenters(centers.filter(c => c.id !== centerId));
  };

  const getCenterById = useCallback((centerId: string) =>
    centers.find(c => c.id === centerId), [centers]);

  const getCenterByLegacyId = useCallback((legacyId: 'Arbucies' | 'SantHilari') => {
    const mapping: Record<string, string> = { 'Arbucies': 'arbucies', 'SantHilari': 'sant-hilari' };
    return centers.find(c => c.id === mapping[legacyId]);
  }, [centers]);

  const getCenterConfig = useCallback((centerId: string, fiscalYear: number): YearlyConfig => {
    const center = getCenterById(centerId);
    if (!center) return { workDays: [], availableVacationDays: 0 };
    if (center.yearlyConfigs?.[fiscalYear]) return center.yearlyConfigs[fiscalYear];
    return center.defaultConfig;
  }, [centers, getCenterById]);
  
  // ── Programs: helpers interns ─────────────────────────────────────────────

  // Actualitza els programs en memòria a partir d'un document modificat
  const updateProgramInMemory = useCallback((programId: string, data: any) => {
    setPrograms(prev => ({
      ...prev,
      [programId]: processProgram(programId, {
        ...prev[programId],
        ...data,
      }),
    }));
  }, []);

  const getDefaultTracks = (programCode: string): Track[] => {
    const trackNames = DEFAULT_TRACKS[programCode.toUpperCase()] || DEFAULT_TRACKS['DEFAULT'];
    return trackNames.map((name, index) => ({
      id: `track-${Date.now()}-${index}`,
      name,
      favorite: false,
      notes: '',
    }));
  };

  // ── Programs: funcions públiques ──────────────────────────────────────────

  const addProgram = async (name: string, code: string, color: string) => {
    try {
      const programId = code.toLowerCase().replace(/\s+/g, '-');
      const data = { name, code, color, subprograms: {}, isActive: false, activeSince: null };
      await setDoc(doc(db, 'programs', programId), data);
      setPrograms(prev => ({ ...prev, [programId]: processProgram(programId, data) }));
      return { success: true };
    } catch (error) { return { success: false, error }; }
  };

  const updateProgramName = async (programId: string, name: string) => {
    try {
      await updateDoc(doc(db, 'programs', programId), { name });
      updateProgramInMemory(programId, { name });
      return { success: true };
    } catch (error) { return { success: false, error }; }
  };

  const updateProgramColor = async (programId: string, color: string) => {
    try {
      await updateDoc(doc(db, 'programs', programId), { color });
      updateProgramInMemory(programId, { color });
      return { success: true };
    } catch (error) { return { success: false, error }; }
  };

  const toggleProgramActive = async (programId: string, isActive: boolean) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      await updateDoc(doc(db, 'programs', programId), { isActive, activeSince: isActive ? today : null });
      updateProgramInMemory(programId, { isActive, activeSince: isActive ? today : null });
      return { success: true };
    } catch (error) { return { success: false, error }; }
  };

  const addSubprogram = async (programId: string, subprogramName: string) => {
    try {
      const program = programs[programId];
      if (!program) throw new Error('Program not found');
      const subprogramId = subprogramName.toLowerCase().replace(/\s+/g, '-');
      const defaultTracks = getDefaultTracks(program.code);
      const newSubprogram: Subprogram = { id: subprogramId, name: subprogramName, tracks: defaultTracks, launches: [] };
      await updateDoc(doc(db, 'programs', programId), {
        [`subprograms.${subprogramId}`]: newSubprogram,
        isActive: false,
        activeSince: null,
      });
      updateProgramInMemory(programId, {
        subprograms: { ...program.subprograms, [subprogramId]: newSubprogram },
        isActive: false,
        activeSince: null,
      });
      return { success: true };
    } catch (error) { return { success: false, error }; }
  };

  const activateSubprogram = async (programId: string, subprogramId: string) => {
    try {
      const program = programs[programId];
      if (!program) throw new Error('Program not found');
      const batch = writeBatch(db);
      const programRef = doc(db, 'programs', programId);
      const today = new Date().toISOString().split('T')[0];
      batch.update(programRef, { isActive: false, activeSince: null });
      const updatedSubprograms = { ...program.subprograms };
      Object.values(updatedSubprograms).forEach((sp) => {
        const launches = [...(sp.launches || [])];
        if (launches.length > 0 && launches[launches.length - 1].endDate === null && sp.id !== subprogramId) {
          launches[launches.length - 1] = { ...launches[launches.length - 1], endDate: today };
          batch.update(programRef, { [`subprograms.${sp.id}.launches`]: launches });
          updatedSubprograms[sp.id] = { ...sp, launches };
        }
      });
      const spToActivate = updatedSubprograms[subprogramId];
      if (!spToActivate) throw new Error('Subprogram not found');
      const newLaunches = [...spToActivate.launches, { startDate: today, endDate: null }];
      batch.update(programRef, { [`subprograms.${subprogramId}.launches`]: newLaunches });
      updatedSubprograms[subprogramId] = { ...spToActivate, launches: newLaunches };
      await batch.commit();
      updateProgramInMemory(programId, { subprograms: updatedSubprograms, isActive: false, activeSince: null });
      return { success: true };
    } catch (error) { return { success: false, error }; }
  };

  const updateTracks = async (programId: string, subprogramId: string, tracks: Track[]) => {
    try {
      await updateDoc(doc(db, 'programs', programId), { [`subprograms.${subprogramId}.tracks`]: tracks });
      const program = programs[programId];
      if (program) {
        updateProgramInMemory(programId, {
          subprograms: { ...program.subprograms, [subprogramId]: { ...program.subprograms[subprogramId], tracks } },
        });
      }
      return { success: true };
    } catch (error) { return { success: false, error }; }
  };

  const addTrack = async (programId: string, subprogramId: string) => {
    try {
      const subprogram = programs[programId]?.subprograms[subprogramId];
      if (!subprogram) throw new Error('Subprogram not found');
      const newTrack: Track = { id: `track-${Date.now()}`, name: `Track ${subprogram.tracks.length + 1}`, favorite: false, notes: '' };
      return await updateTracks(programId, subprogramId, [...subprogram.tracks, newTrack]);
    } catch (error) { return { success: false, error }; }
  };

  const deleteTrack = async (programId: string, subprogramId: string, trackId: string) => {
    try {
      const subprogram = programs[programId]?.subprograms[subprogramId];
      if (!subprogram) throw new Error('Subprogram not found');
      return await updateTracks(programId, subprogramId, subprogram.tracks.filter(t => t.id !== trackId));
    } catch (error) { return { success: false, error }; }
  };

  const updateLaunches = async (programId: string, subprogramId: string, launches: Launch[]) => {
    try {
      const sorted = [...launches].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
      await updateDoc(doc(db, 'programs', programId), { [`subprograms.${subprogramId}.launches`]: sorted });
      const program = programs[programId];
      if (program) {
        updateProgramInMemory(programId, {
          subprograms: { ...program.subprograms, [subprogramId]: { ...program.subprograms[subprogramId], launches: sorted } },
        });
      }
      return { success: true };
    } catch (error) { return { success: false, error }; }
  };

  const deleteProgram = async (programId: string) => {
    try {
      await deleteDoc(doc(db, 'programs', programId));
      setPrograms(prev => { const next = { ...prev }; delete next[programId]; return next; });
      return { success: true };
    } catch (error) { return { success: false, error }; }
  };

  const deleteSubprogram = async (programId: string, subprogramId: string) => {
    try {
      const programRef = doc(db, 'programs', programId);
      const programSnap = await getDoc(programRef);
      if (!programSnap.exists()) throw new Error('Program not found');
      const updatedSubprograms = { ...programSnap.data().subprograms };
      delete updatedSubprograms[subprogramId];
      await updateDoc(programRef, { subprograms: updatedSubprograms });
      updateProgramInMemory(programId, { subprograms: updatedSubprograms });
      return { success: true };
    } catch (error) { return { success: false, error }; }
  };

  const getActiveSubprogram = useCallback((programId: string): { subprogram: Subprogram | null; days: number } => {
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
  }, [programs]);

  const getAllActivePrograms = useCallback(() => {
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
  }, [programs, getActiveSubprogram]);

  // ── Valor del context ─────────────────────────────────────────────────────

  return (
    <AppDataContext.Provider value={{
      settings, settingsLoading, saveSettings,
      centers, activeCenters: centers.filter(c => c.isActive), centersLoading,
      saveCenters, addCenter, deactivateCenter, reactivateCenter,
      updateCenter, updateCenterYearlyConfig, deleteCenter,
      getCenterById, getCenterByLegacyId, getCenterConfig,
      schedules, schedulesLoading, saveSchedules, getActiveSchedule, createNewSchedule, deactivateSchedule,
      programs, programsLoading,
      addProgram, updateProgramName, updateProgramColor, toggleProgramActive,
      addSubprogram, activateSubprogram, updateTracks, addTrack, deleteTrack,
      updateLaunches, deleteProgram, deleteSubprogram,
      getActiveSubprogram, getAllActivePrograms,
    }}>
      {children}
    </AppDataContext.Provider>
  );
};
