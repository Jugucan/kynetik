import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PendingUserRequest, UserStatus } from '@/types/user';
import { toast } from 'sonner';

export const usePendingUsers = () => {
  const [pendingUsers, setPendingUsers] = useState<PendingUserRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Escoltem en temps real tots els usuaris amb status 'pending'
    const q = query(
      collection(db, 'userProfiles'),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          uid: doc.id,
          email: data.email || '',
          displayName: data.displayName || '',
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          birthDate: data.birthDate,
          createdAt: data.createdAt?.toDate() || new Date(),
          status: data.status as UserStatus,
        } as PendingUserRequest;
      });

      // Ordenem per data de registre, els més antics primer
      users.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      setPendingUsers(users);
      setLoading(false);
    }, (error) => {
      console.error('Error carregant sol·licituds pendents:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const approveUser = async (uid: string) => {
    try {
      await updateDoc(doc(db, 'userProfiles', uid), {
        status: 'approved',
        statusUpdatedAt: new Date(),
      });
      toast.success('Usuari aprovat correctament');
    } catch (error) {
      console.error('Error aprovant usuari:', error);
      toast.error('Error en aprovar l\'usuari');
    }
  };

  const rejectUser = async (uid: string) => {
    try {
      await updateDoc(doc(db, 'userProfiles', uid), {
        status: 'rejected',
        statusUpdatedAt: new Date(),
      });
      toast.success('Sol·licitud rebutjada');
    } catch (error) {
      console.error('Error rebutjant usuari:', error);
      toast.error('Error en rebutjar l\'usuari');
    }
  };

  return { pendingUsers, loading, approveUser, rejectUser };
};
