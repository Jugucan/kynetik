import { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';

// Funció utilitària per convertir DD/MM/YYYY a Date object
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

// Funció utilitària per convertir Timestamp/Date a DD/MM/YYYY
const dateToDisplayString = (dateInput: Timestamp | string | Date): string => {
  if (!dateInput) return '';

  let date: Date;
  if (dateInput instanceof Timestamp) {
    date = dateInput.toDate();
  } else if (typeof dateInput === 'string') {
    const d = dateStringToDate(dateInput);
    if (d) {
        date = d;
    } else {
        return dateInput;
    }
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
  
  if (birthday instanceof Timestamp) {
    birthDate = birthday.toDate();
  } else if (typeof birthday === 'string') {
    birthDate = dateStringToDate(birthday);
  } else if (birthday instanceof Date) {
    birthDate = birthday;
  }
  
  if (!birthDate) return 0;
  
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

// 🆕 INTERFACE PER SESSIONS
export interface UserSession {
  date: string;
  activity: string;
  time: string;
  sala: string;
  center: string;
}

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
  
  // 🆕 NOUS CAMPS PER SESSIONS
  sessions?: UserSession[];
  totalSessions?: number;
  firstSession?: string;
  lastSession?: string;
  daysSinceLastSession?: number;
}

export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const usersData = snapshot.docs.map(doc => {
            const data = doc.data();
            
            const birthdayDisplay = dateToDisplayString(data.birthday);
            const calculatedAge = calculateAge(data.birthday);
            
            const preferredPrograms: string[] = Array.isArray(data.preferredPrograms) 
                                                ? data.preferredPrograms 
                                                : [];
            const profileImageUrl: string = typeof data.profileImageUrl === 'string' 
                                          ? data.profileImageUrl 
                                          : ''; 
            const notes: string = typeof data.notes === 'string' 
                                ? data.notes 
                                : '';
            
            // 🆕 RECUPEREM LES SESSIONS I RECALCULEM ESTADÍSTIQUES
            const sessions: UserSession[] = Array.isArray(data.sessions)
                                            ? data.sessions
                                            : [];
            
            // ✅ SEMPRE calculem totalSessions a partir de sessions.length
            const totalSessions: number = sessions.length;
            
            // ✅ Calculem firstSession, lastSession i daysSinceLastSession
            let firstSession: string = '';
            let lastSession: string = '';
            let daysSinceLastSession: number = 0;
            
            if (sessions.length > 0) {
              const sortedDates = sessions
                .map(s => s.date)
                .sort((a, b) => a.localeCompare(b));
              
              firstSession = sortedDates[0];
              lastSession = sortedDates[sortedDates.length - 1];
              
              // Calculem dies des de l'última sessió
              const lastDate = new Date(lastSession);
              const today = new Date();
              daysSinceLastSession = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
            }

            return {
              id: doc.id,
              ...data,
              birthday: birthdayDisplay, 
              age: calculatedAge,
              preferredPrograms,
              profileImageUrl,
              notes,
              sessions,
              totalSessions, // ✅ Recalculat automàticament
              firstSession,
              lastSession,
              daysSinceLastSession
            };
        }) as User[];
        
        setUsers(usersData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching users:', error);
        toast.error('Error al carregar usuaris');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const prepareDataForFirestore = (userData: Partial<User>) => {
      const dataToSave: any = { ...userData };
      
      if (dataToSave.birthday && typeof dataToSave.birthday === 'string') {
          const dateObj = dateStringToDate(dataToSave.birthday);
          if (dateObj) {
              dataToSave.birthday = Timestamp.fromDate(dateObj);
              dataToSave.age = calculateAge(dateObj);
          } else {
              console.warn(`Format de data de naixement incorrecte: ${dataToSave.birthday}`);
              delete dataToSave.birthday;
          }
      }
      
      if (dataToSave.birthday instanceof Timestamp) {
          dataToSave.age = calculateAge(dataToSave.birthday);
      }

      if (dataToSave.preferredPrograms && typeof dataToSave.preferredPrograms === 'string') {
          dataToSave.preferredPrograms = (dataToSave.preferredPrograms as string)
                                            .split(',')
                                            .map(p => p.trim())
                                            .filter(p => p.length > 0);
      }
      
      // 🆕 ASSEGUREM QUE LES SESSIONS ES GUARDEN COM A ARRAY
      if (dataToSave.sessions && !Array.isArray(dataToSave.sessions)) {
          dataToSave.sessions = [];
      }
      
      // ✅ RECALCULEM totalSessions automàticament abans de guardar
      if (Array.isArray(dataToSave.sessions)) {
        dataToSave.totalSessions = dataToSave.sessions.length;
        
        // ✅ Recalculem firstSession, lastSession i daysSinceLastSession
        if (dataToSave.sessions.length > 0) {
          const sortedDates = dataToSave.sessions
            .map((s: UserSession) => s.date)
            .sort((a: string, b: string) => a.localeCompare(b));
          
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
  }

  const addUser = async (userData: Omit<User, 'id'>) => {
    try {
      const dataToSave = prepareDataForFirestore(userData);
      await addDoc(collection(db, 'users'), dataToSave);
      toast.success('Usuari afegit correctament');
    } catch (error) {
      console.error('Error adding user:', error);
      toast.error('Error al afegir usuari');
      throw error;
    }
  };

  const updateUser = async (id: string, userData: Partial<User>) => {
    try {
      const dataToSave = prepareDataForFirestore(userData);
      await updateDoc(doc(db, 'users', id), dataToSave);
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
      toast.success('Usuari eliminat correctament');
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Error al eliminar usuari');
      throw error;
    }
  };

  return { users, loading, addUser, updateUser, deleteUser };
};
