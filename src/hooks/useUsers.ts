import { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';

// ── Utilitats de dates ──────────────────────────────────────────────────────

const dateStringToDate = (dateString: string): Date | null => {
  if (!dateString) return null;
  const parts = dateString.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const date = new Date(year, month, day);
    if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
      return date;
    }
  }
  return null;
};

const dateToDisplayString = (dateInput: Timestamp | string | Date): string => {
  if (!dateInput) return '';
  let date: Date;
  if (dateInput instanceof Timestamp) {
    date = dateInput.toDate();
  } else if (typeof dateInput === 'string') {
    const d = dateStringToDate(dateInput);
    if (d) { date = d; } else { return dateInput; }
  } else {
    date = dateInput;
  }
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const calculateAge = (birthday: string | Timestamp | Date): number => {
  let birthDate: Date | null = null;
  if (birthday instanceof Timestamp) { birthDate = birthday.toDate(); }
  else if (typeof birthday === 'string') { birthDate = dateStringToDate(birthday); }
  else if (birthday instanceof Date) { birthDate = birthday; }
  if (!birthDate) return 0;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) { age--; }
  return age;
};

// ── Interfícies ─────────────────────────────────────────────────────────────

export interface UserSession {
  date: string;
  activity: string;
  time: string;
  sala: string;
  center: string;
}

export interface RankingCache {
  totalSessions: { rank: number; total: number; percentile: number };
  programs: { [program: string]: { rank: number; total: number; percentile: number } };
  updatedAt: string;
}

// Usuari SENSE sessions (lleuger)
export interface User {
  id: string;
  name: string;
  email: string;
  center: string;
  birthday: Timestamp | string;
  age: number;
  phone: string;
  avatar: string;
  preferredPrograms: string[];
  profileImageUrl: string;
  notes: string;
  totalSessions?: number;
  firstSession?: string;
  lastSession?: string;
  daysSinceLastSession?: number;
  rankingCache?: RankingCache;
}

// Usuari AMB sessions (pesat, només per a estadístiques)
export interface UserWithSessions extends User {
  sessions: UserSession[];
}

// ── Processament de dades ───────────────────────────────────────────────────

const processUserDoc = (docId: string, data: any, includeSessions: boolean): User | UserWithSessions => {
  const birthdayDisplay = dateToDisplayString(data.birthday);
  const calculatedAge = calculateAge(data.birthday);
  const preferredPrograms: string[] = Array.isArray(data.preferredPrograms) ? data.preferredPrograms : [];
  const profileImageUrl: string = typeof data.profileImageUrl === 'string' ? data.profileImageUrl : '';
  const notes: string = typeof data.notes === 'string' ? data.notes : '';

  const base: User = {
    id: docId,
    ...data,
    birthday: birthdayDisplay,
    age: calculatedAge,
    preferredPrograms,
    profileImageUrl,
    notes,
    totalSessions: data.totalSessions || 0,
    firstSession: data.firstSession || '',
    lastSession: data.lastSession || '',
    daysSinceLastSession: data.daysSinceLastSession || 0,
    rankingCache: data.rankingCache || null,
  };

  if (!includeSessions) return base;

  const sessions: UserSession[] = Array.isArray(data.sessions) ? data.sessions : [];
  let firstSession = '';
  let lastSession = '';
  let daysSinceLastSession = 0;

  if (sessions.length > 0) {
    const sortedDates = sessions.map(s => s.date).sort((a, b) => a.localeCompare(b));
    firstSession = sortedDates[0];
    lastSession = sortedDates[sortedDates.length - 1];
    const lastDate = new Date(lastSession);
    const today = new Date();
    daysSinceLastSession = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  return {
    ...base,
    sessions,
    totalSessions: sessions.length,
    firstSession,
    lastSession,
    daysSinceLastSession,
  } as UserWithSessions;
};

// ── Preparació per a Firestore ──────────────────────────────────────────────

const prepareDataForFirestore = (userData: Partial<UserWithSessions>) => {
  const dataToSave: any = { ...userData };

  if (dataToSave.birthday && typeof dataToSave.birthday === 'string') {
    const dateObj = dateStringToDate(dataToSave.birthday);
    if (dateObj) {
      dataToSave.birthday = Timestamp.fromDate(dateObj);
      dataToSave.age = calculateAge(dateObj);
    } else {
      delete dataToSave.birthday;
    }
  }
  if (dataToSave.birthday instanceof Timestamp) {
    dataToSave.age = calculateAge(dataToSave.birthday);
  }
  if (dataToSave.preferredPrograms && typeof dataToSave.preferredPrograms === 'string') {
    dataToSave.preferredPrograms = (dataToSave.preferredPrograms as string)
      .split(',').map((p: string) => p.trim()).filter((p: string) => p.length > 0);
  }
  if (dataToSave.sessions && !Array.isArray(dataToSave.sessions)) {
    dataToSave.sessions = [];
  }
  if (Array.isArray(dataToSave.sessions)) {
    dataToSave.totalSessions = dataToSave.sessions.length;
    if (dataToSave.sessions.length > 0) {
      const sortedDates = dataToSave.sessions.map((s: UserSession) => s.date).sort((a: string, b: string) => a.localeCompare(b));
      dataToSave.firstSession = sortedDates[0];
      dataToSave.lastSession = sortedDates[sortedDates.length - 1];
      const lastDate = new Date(dataToSave.lastSession);
      const today = new Date();
      dataToSave.daysSinceLastSession = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    } else {
      dataToSave.totalSessions = 0;
      dataToSave.firstSession = '';
      dataToSave.lastSession = '';
      dataToSave.daysSinceLastSession = 0;
    }
  }
  return dataToSave;
};

// ── Hook lleuger: SENSE sessions ────────────────────────────────────────────
// Usa aquest hook a: Index.tsx, Users.tsx, UserFormModal, components/Users.tsx

export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'users'));
        const usersData = snapshot.docs.map(doc =>
          processUserDoc(doc.id, doc.data(), false)
        ) as User[];
        setUsers(usersData);
      } catch (error) {
        console.error('Error fetching users:', error);
        toast.error('Error al carregar usuaris');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const addUser = async (userData: Omit<UserWithSessions, 'id'>) => {
    try {
      const dataToSave = prepareDataForFirestore(userData);
      const docRef = await addDoc(collection(db, 'users'), dataToSave);
      const newUser = processUserDoc(docRef.id, dataToSave, false) as User;
      setUsers(prev => [...prev, newUser]);
      toast.success('Usuari afegit correctament');
    } catch (error) {
      console.error('Error adding user:', error);
      toast.error('Error al afegir usuari');
      throw error;
    }
  };

  const updateUser = async (id: string, userData: Partial<UserWithSessions>) => {
    try {
      const dataToSave = prepareDataForFirestore(userData);
      await updateDoc(doc(db, 'users', id), dataToSave);
      setUsers(prev => prev.map(u =>
        u.id === id ? { ...u, ...processUserDoc(id, { ...u, ...dataToSave }, false) } : u
      ));
      toast.success('Usuari actualitzat correctament');
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Error al actualitzar usuari');
      throw error;
    }
  };

  const deleteUser = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'users', id));
      setUsers(prev => prev.filter(u => u.id !== id));
      toast.success('Usuari eliminat correctament');
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Error al eliminar usuari');
      throw error;
    }
  };

  return { users, loading, addUser, updateUser, deleteUser };
};

// ── Hook usuari actual: AMB sessions (1 sola lectura!) ──────────────────────
// Usa aquest hook a: UserIndex.tsx, UserStats.tsx, Badges.tsx
// Rep el firestoreUserId de AuthContext

export const useCurrentUserWithSessions = (firestoreUserId: string | null) => {
  const [user, setUser] = useState<UserWithSessions | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firestoreUserId) {
      setLoading(false);
      return;
    }

    const fetchUser = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'users', firestoreUserId));
        if (docSnap.exists()) {
          setUser(processUserDoc(docSnap.id, docSnap.data(), true) as UserWithSessions);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [firestoreUserId]);

  return { user, loading };
};

// ── Hook pesat: AMB sessions (NOMÉS per a instructora/admin) ───────────────
// Usa aquest hook a: Stats.tsx

export const useUsersWithSessions = () => {
  const [users, setUsers] = useState<UserWithSessions[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'users'));
        const usersData = snapshot.docs.map(doc =>
          processUserDoc(doc.id, doc.data(), true)
        ) as UserWithSessions[];
        setUsers(usersData);
      } catch (error) {
        console.error('Error fetching users with sessions:', error);
        toast.error('Error al carregar usuaris');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  return { users, loading };
};
