import { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase'; // Corregit per l'estructura de directoris, assumeixo que és './lib/firebase'
import { toast } from '../components/ui/sonner'; // Corregit per l'estructura de directoris, si fas servir el teu toast de 'sonner'

export interface User {
  id: string;
  name: string;
  email: string;
  center: string;
  // Canviem a Timestamp | string: Pot ser Timestamp quan es llegeix, o string quan s'escriu
  birthday: Timestamp | string; 
  age: number;
  phone: string;
  avatar: string;
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
            
            // LÒGICA DE CONVERSIÓ CLAU:
            // Si birthday és un objecte Timestamp, el convertim a una string de data senzilla (YYYY-MM-DD)
            let birthdayString: string = '';
            if (data.birthday instanceof Timestamp) {
                // Utilitzem toDate() per convertir-lo a un objecte Date i després a una string ISO
                birthdayString = data.birthday.toDate().toISOString().split('T')[0];
            } else if (typeof data.birthday === 'string') {
                birthdayString = data.birthday;
            }
            
            return {
              id: doc.id,
              ...data,
              birthday: birthdayString, // Assignem la string convertida
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

  const addUser = async (userData: Omit<User, 'id'>) => {
    try {
      // Quan guardem, ens assegurem que la data es desa com a Timestamp a Firestore,
      // per evitar problemes futurs amb les cerques de Firebase.
      const dataToSave = {
        ...userData,
        birthday: userData.birthday ? Timestamp.fromDate(new Date(userData.birthday as string)) : null,
      };
      
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
      const dataToUpdate: Partial<User> = { ...userData };

      // Conversió de la data de nou a Timestamp si s'està actualitzant
      if (dataToUpdate.birthday && typeof dataToUpdate.birthday === 'string') {
          dataToUpdate.birthday = Timestamp.fromDate(new Date(dataToUpdate.birthday));
      }

      await updateDoc(doc(db, 'users', id), dataToUpdate);
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
