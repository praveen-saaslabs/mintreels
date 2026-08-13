import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/providers/auth-provider';

export function PublicOnlyRoute() {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background text-sm text-muted-foreground">
        Checking session…
      </div>
    );
  }

  if (status === 'authenticated') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
