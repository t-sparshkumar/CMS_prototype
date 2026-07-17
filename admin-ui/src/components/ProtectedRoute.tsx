import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import AuthBootstrapGate from './AuthBootstrapGate';
import { useAuthStore } from '../stores/authStore';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping);

  if (isBootstrapping) {
    return <AuthBootstrapGate>{null}</AuthBootstrapGate>;
  }

  if (!isAuthenticated || !accessToken) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
