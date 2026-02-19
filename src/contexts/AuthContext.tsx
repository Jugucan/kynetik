import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
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
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('viewMode');
    return (saved === 'user' || saved === 'instructor' || saved === 'superadmin') ? saved : 'instructor';
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        // Carreguem el perfil de l'usuari des de Firestore
        const profileRef = doc(db, 'userProfiles', user.uid);
        const profileSnap = await getDoc(profileRef);

        if (profileSnap.exists()) {
          const data = profileSnap.data();
          // Si no té camp status, considerem que és aprovat (usuaris antics)
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
          // Perfil nou sense document → el creem com a pendent
          setUserStatus('pending');
        }
      } else {
        setUserProfile(null);
        setUserStatus(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    localStorage.setItem('viewMode', viewMode);
  }, [viewMode]);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signup = async (email: string, password: string, data: RegisterData) => {
    // 1. Creem el compte a Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 2. Guardem el perfil a Firestore amb estat "pending"
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
      status: 'pending',        // ← sempre comença com a pendent
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  };

  const logout = async () => {
    await signOut(auth);
    setUserProfile(null);
    setUserStatus(null);
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
