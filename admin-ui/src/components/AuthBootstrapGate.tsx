import type { ReactNode } from 'react';
import { useAuthStore } from '../stores/authStore';

interface AuthBootstrapGateProps {
  children: ReactNode;
}

export default function AuthBootstrapGate({ children }: AuthBootstrapGateProps) {
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping);

  if (isBootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    );
  }

  return children;
}
