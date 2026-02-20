import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, onSnapshot, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { UserProfile, UserStatus } from '@/types/user';

type ViewMode = 'instructor' | 'user' | 'superadmin';

interface RegisterData {
  firstName: string;
  lastName: string;
  phone: string;
  birthDate: string;
  gender?: string | null;
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
  firestoreUserId: string | null; // ID del document a la col·lecció 'users'
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
  const [firestoreUserId, setFirestoreUserId] = useState<string | null>(null);

  const profileUnsubscribeRef = useRef<(() => void) | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('viewMode');
    return (saved === 'user' || saved === 'instructor' || saved === 'superadmin') ? saved : 'instructor';
  });

  // Cerca i vincula el document de 'users' amb el perfil autenticat
  const linkFirestoreUserId = async (email: string, uid: string, existingId: string | null) => {
    // Si ja el tenim guardat al perfil, no cal fer res
    if (existingId) {
      setFirestoreUserId(existingId);
      return;
    }

    try {
      const q = query(collection(db, 'users'), where('email', '==', email));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const foundId = snapshot.docs[0].id;
        setFirestoreUserId(foundId);

        // Guardem l'ID al userProfile perquè les properes vegades no calgui la query
        await updateDoc(doc(db, 'userProfiles', uid), {
          firestoreUserId: foundId
        });
      } else {
        // L'usuari té compte però encara no té document a 'users' (no s'ha importat)
        setFirestoreUserId(null);
      }
    } catch (error) {
      console.warn('No s\'ha pogut vincular firestoreUserId:', error);
      setFirestoreUserId(null);
    }
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (profileUnsubscribeRef.current) {
        profileUnsubscribeRef.current();
        profileUnsubscribeRef.current = null;
      }

      setCurrentUser(user);
      setFirestoreUserId(null);

      if (user) {
        const profileRef = doc(db, 'userProfiles', user.uid);
        const unsubscribeProfile = onSnapshot(
          profileRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              const status: UserStatus = data.status || 'approved';
              setUserStatus(status);

              const profile: UserProfile = {
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
              };
              setUserProfile(profile);

              // Vincular firestoreUserId només per usuaris normals (role='user')
              // Els instructors/admins no necessiten accedir al seu document de 'users'
              if (data.role === 'user' && user.email) {
                linkFirestoreUserId(user.email, user.uid, data.firestoreUserId || null);
              }
            } else {
              setUserStatus('pending');
            }
            setLoading(false);
          },
          (error) => {
            console.warn('Escolta del perfil cancel·lada:', error.code);
            setLoading(false);
          }
        );

        profileUnsubscribeRef.current = unsubscribeProfile;
      } else {
        setUserProfile(null);
        setUserStatus(null);
        setFirestoreUserId(null);
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
      gender: data.gender || null,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      // firestoreUserId s'afegirà automàticament quan faci login
      // si el seu email ja existeix a la col·lecció 'users'
    });
  };

  const logout = async () => {
    if (profileUnsubscribeRef.current) {
      profileUnsubscribeRef.current();
      profileUnsubscribeRef.current = null;
    }
    setUserProfile(null);
    setUserStatus(null);
    setFirestoreUserId(null);
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
    firestoreUserId,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
