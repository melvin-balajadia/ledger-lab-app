import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSession } from '../hooks/useAuth';
import { useCurrentProject } from '../hooks/useProjectData';

export function ProtectedRoute() {
  const { session, isLoading: sessionLoading } = useSession();
  const { needsSetup, isLoading: projectLoading } = useCurrentProject();
  const location = useLocation();

  if (sessionLoading || (session && projectLoading)) return null;
  if (!session) return <Navigate to="/login" replace />;
  if (needsSetup && location.pathname !== '/setup') return <Navigate to="/setup" replace />;
  if (!needsSetup && location.pathname === '/setup') return <Navigate to="/" replace />;
  return <Outlet />;
}
