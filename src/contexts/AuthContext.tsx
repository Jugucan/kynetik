import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { UserProfile, UserStatus } from '@/types/user';

type ViewMode = 'instructor' | 'user' | 'superadmin';

interface RegisterData {
  firstName: string;
  lastName: string;
  phone: string;
  birthDate: string;
}

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  userStatus: UserStatus | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  
  // Guardem la referència a l'escolta del perfil per poder cancel·lar-la
  const profileUnsubscribeRef = useRef<(() => void) | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('viewMode');
    return (saved === 'user' || saved === 'instructor' || saved === 'superadmin') ? saved : 'instructor';
  });

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      // Cancel·lem l'escolta anterior del perfil si n'hi havia una
      if (profileUnsubscribeRef.current) {
        profileUnsubscribeRef.current();
        profileUnsubscribeRef.current = null;
      }

      setCurrentUser(user);

      if (user) {
        // Iniciem una nova escolta del perfil
        const profileRef = doc(db, 'userProfiles', user.uid);
        const unsubscribeProfile = onSnapshot(
          profileRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              const status: UserStatus = data.status || 'approved';
              setUserStatus(status);
              setUserProfile({
                uid: user.uid,
                email: user.email || '',
                role: data.role || 'user',
                displayName: data.displayName || '',
                firstName: data.firstName,
                lastName: data.lastName,
                phone: data.phone,
                birthDate: data.birthDate,
                gender: data.gender || null,
                center: data.center,
                monitorId: data.monitorId,
                status: status,
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate() || new Date(),
              });
            } else {
              setUserStatus('pending');
            }
            setLoading(false);
          },
          (error) => {
            // Error d'escolta — probablement l'usuari ha tancat sessió
            console.warn('Escolta del perfil cancel·lada:', error.code);
            setLoading(false);
          }
        );

        // Guardem la funció de cancel·lació
        profileUnsubscribeRef.current = unsubscribeProfile;
      } else {
        setUserProfile(null);
        setUserStatus(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (profileUnsubscribeRef.current) {
        profileUnsubscribeRef.current();
      }
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('viewMode', viewMode);
  }, [viewMode]);

  // Quan es carrega el perfil, assegurem que el viewMode sigui coherent amb el rol
  useEffect(() => {
    if (userProfile) {
      if (userProfile.role === 'user') {
        setViewMode('user');
        localStorage.setItem('viewMode', 'user');
      } else if (userProfile.role !== 'superadmin' && viewMode === 'superadmin') {
        setViewMode('instructor');
        localStorage.setItem('viewMode', 'instructor');
      }
    }
  }, [userProfile]);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signup = async (email: string, password: string, data: RegisterData) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const displayName = `${data.firstName} ${data.lastName}`.trim();
    const profileRef = doc(db, 'userProfiles', user.uid);

    await setDoc(profileRef, {
      uid: user.uid,
      email: email,
      role: 'user',
      displayName: displayName,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      birthDate: data.birthDate,
      gender: null,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  };

  const logout = async () => {
    // Cancel·lem l'escolta del perfil ABANS de fer signOut
    if (profileUnsubscribeRef.current) {
      profileUnsubscribeRef.current();
      profileUnsubscribeRef.current = null;
    }
    setUserProfile(null);
    setUserStatus(null);
    await signOut(auth);
  };

  const value = {
    currentUser,
    userProfile,
    loading,
    viewMode,
    setViewMode,
    login,
    signup,
    logout,
    userStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
