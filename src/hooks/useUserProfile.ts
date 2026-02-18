import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile } from '@/types/user';
import { useAuth } from '@/contexts/AuthContext';

export const useUserProfile = () => {
  const { currentUser } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setUserProfile(null);
      setLoading(false);
      return;
    }

    const userProfileRef = doc(db, 'userProfiles', currentUser.uid);
    
    const unsubscribe = onSnapshot(
      userProfileRef,
      async (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserProfile({
            uid: currentUser.uid,
            email: currentUser.email || '',
            role: data.role,
            displayName: data.displayName,
            gender: data.gender || null,
            center: data.center,
            monitorId: data.monitorId,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          });
        } else {
          const defaultProfile: UserProfile = {
            uid: currentUser.uid,
            email: currentUser.email || '',
            role: 'monitor',
            displayName: currentUser.email?.split('@')[0] || 'Monitor',
            gender: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          
          await setDoc(userProfileRef, {
            ...defaultProfile,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          
          setUserProfile(defaultProfile);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error loading user profile:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const updateProfile = async (data: { displayName?: string; gender?: string | null }) => {
    if (!currentUser) return;
    const userProfileRef = doc(db, 'userProfiles', currentUser.uid);
    await updateDoc(userProfileRef, {
      ...data,
      updatedAt: new Date(),
    });
  };

  return { userProfile, loading, updateProfile };
};
