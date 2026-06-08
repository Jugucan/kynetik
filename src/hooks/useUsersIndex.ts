// src/hooks/useUsersIndex.ts
// Hook lleuger per a Index.tsx — llegeix només el document usersIndex
// en lloc de carregar tots els usuaris

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export interface BirthdayEntry {
  id: string;
  name: string;
  birthday: string;
  center: string;
  profileImageUrl: string;
}

export interface UsersIndexData {
  totalUsers: number;
  birthdays: BirthdayEntry[];
  loading: boolean;
}

export const useUsersIndex = (): UsersIndexData => {
  const [data, setData] = useState<UsersIndexData>({
    totalUsers: 0,
    birthdays: [],
    loading: true,
  });

  useEffect(() => {
    const fetch = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'usersIndex'));
        if (snap.exists()) {
          const d = snap.data();
          setData({
            totalUsers: d.totalUsers || 0,
            birthdays: d.birthdays || [],
            loading: false,
          });
        } else {
          setData({ totalUsers: 0, birthdays: [], loading: false });
        }
      } catch (error) {
        console.error('Error carregant usersIndex:', error);
        setData({ totalUsers: 0, birthdays: [], loading: false });
      }
    };
    fetch();
  }, []);

  return data;
};
