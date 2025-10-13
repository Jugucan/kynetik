import { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';

export interface User {
  id: string;
  name: string;
  email: string;
  center: string;
  birthday: string;
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
        const usersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as User[];
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
      await addDoc(collection(db, 'users'), userData);
      toast.success('Usuari afegit correctament');
    } catch (error) {
      console.error('Error adding user:', error);
      toast.error('Error al afegir usuari');
      throw error;
    }
  };

  const updateUser = async (id: string, userData: Partial<User>) => {
    try {
      await updateDoc(doc(db, 'users', id), userData);
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
