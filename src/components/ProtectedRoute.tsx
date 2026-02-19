import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { UserRole } from '@/types/user';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { currentUser, loading: authLoading, userStatus } = useAuth();
  const { userProfile, loading: profileLoading } = useUserProfile();

  if (authLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Si no està autenticat, al login
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Si està pendent o rebutjat, a la pàgina d'espera
  if (userStatus === 'pending' || userStatus === 'rejected') {
    return <Navigate to="/pending" replace />;
  }

  // Si té rols restringits i no compleix, accés denegat
  if (allowedRoles && userProfile && !allowedRoles.includes(userProfile.role)) {
    return (
      <div className="flex items-center justify-center h-screen p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Accés denegat</h1>
          <p className="text-muted-foreground">
            No tens permisos per accedir a aquesta pàgina
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
