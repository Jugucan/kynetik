import { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase'; // Ruta corregida com ja vam fer
import { toast } from 'sonner';

// Funció utilitària per convertir DD/MM/YYYY a Date object
const dateStringToDate = (dateString: string): Date | null => {
  if (!dateString) return null;
  const parts = dateString.split('/');
  // Assumeix format DD/MM/YYYY
  if (parts.length === 3) {
    // Mesos a JS són 0-indexats (Gener és 0, Desembre és 11)
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; 
    const year = parseInt(parts[2], 10);
    
    // Validació simple de data
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
    // Si és una string, assumim format YYYY-MM-DD o DD/MM/YYYY
    const d = dateStringToDate(dateInput);
    if (d) {
        date = d;
    } else {
        return dateInput; // Retorna la string original si no la podem parsejar bé
    }
  } else {
    date = dateInput;
  }
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};


export interface User {
  id: string;
  name: string;
  email: string;
  center: string;
  // Hem de permetre Timestamp | string a l'entrada del hook, però la sortida serà string (DD/MM/YYYY)
  birthday: Timestamp | string; 
  age: number;
  phone: string;
  avatar: string; // Utilitzat com a valor per defecte
  
  // NOUS CAMPS:
  preferredPrograms: string[];
  profileImageUrl: string;
  notes: string;
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
            
            // CONVERSIÓ CLAU EN LECTURA: Timestamp a DD/MM/YYYY per a l'UI
            const birthdayDisplay = dateToDisplayString(data.birthday);
            
            // Per als nous camps, assignem valors per defecte si són undefined a Firestore
            const preferredPrograms: string[] = Array.isArray(data.preferredPrograms) 
                                                ? data.preferredPrograms 
                                                : [];
            const profileImageUrl: string = typeof data.profileImageUrl === 'string' 
                                          ? data.profileImageUrl 
                                          : ''; 
            const notes: string = typeof data.notes === 'string' 
                                ? data.notes 
                                : '';

            return {
              id: doc.id,
              ...data,
              birthday: birthdayDisplay, 
              preferredPrograms,
              profileImageUrl,
              notes,
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
      
      // CONVERSIÓ CLAU EN ESCRIPTURA: DD/MM/YYYY (string) a Timestamp
      if (dataToSave.birthday && typeof dataToSave.birthday === 'string') {
          const dateObj = dateStringToDate(dataToSave.birthday);
          if (dateObj) {
              dataToSave.birthday = Timestamp.fromDate(dateObj);
          } else {
              console.warn(`Format de data de naixement incorrecte: ${dataToSave.birthday}`);
              delete dataToSave.birthday; // Eliminar si no és vàlid
          }
      }

      // Converteix la string de programes (separada per comes) a un array de strings per a Firestore
      if (dataToSave.preferredPrograms && typeof dataToSave.preferredPrograms === 'string') {
          dataToSave.preferredPrograms = (dataToSave.preferredPrograms as string)
                                            .split(',')
                                            .map(p => p.trim())
                                            .filter(p => p.length > 0);
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
