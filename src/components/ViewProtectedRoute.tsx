import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ReactNode } from 'react';

interface ViewProtectedRouteProps {
  children: ReactNode;
  allowedViews: ('instructor' | 'user')[];
}

export const ViewProtectedRoute = ({ children, allowedViews }: ViewProtectedRouteProps) => {
  const { viewMode } = useAuth();

  // Si la vista actual no està permesa, redirigir a inici
  if (!allowedViews.includes(viewMode)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
