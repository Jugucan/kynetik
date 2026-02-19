import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ReactNode } from 'react';

interface ViewProtectedRouteProps {
  children: ReactNode;
  allowedViews: ('instructor' | 'user' | 'superadmin')[];
}

export const ViewProtectedRoute = ({ children, allowedViews }: ViewProtectedRouteProps) => {
  const { viewMode } = useAuth();

  if (!allowedViews.includes(viewMode)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
