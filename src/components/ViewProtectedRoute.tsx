import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { ReactNode } from 'react';

interface ViewProtectedRouteProps {
  children: ReactNode;
  allowedViews: ('instructor' | 'user' | 'superadmin')[];
}

export const ViewProtectedRoute = ({ children, allowedViews }: ViewProtectedRouteProps) => {
  const { viewMode } = useAuth();
  const { userProfile } = useUserProfile();

  // Seguretat addicional: comprovem també el rol real de l'usuari
  // Un usuari amb rol 'user' mai pot accedir a rutes d'instructor o superadmin
  if (userProfile?.role === 'user' && allowedViews.every(v => v !== 'user')) {
    return <Navigate to="/" replace />;
  }

  // Un usuari sense rol superadmin no pot accedir a rutes de superadmin
  if (userProfile?.role !== 'superadmin' && allowedViews.every(v => v === 'superadmin')) {
    return <Navigate to="/" replace />;
  }

  // Comprovació normal del viewMode
  if (!allowedViews.includes(viewMode)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
