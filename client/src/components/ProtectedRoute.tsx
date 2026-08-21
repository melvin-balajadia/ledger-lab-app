import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSession } from '../hooks/useAuth';
import { useCurrentProject } from '../hooks/useProjectData';
import { Home } from '../pages/Home';

export function ProtectedRoute() {
  const { session, isLoading: sessionLoading } = useSession();
  const { needsSetup, isLoading: projectLoading } = useCurrentProject();
  const location = useLocation();

  if (sessionLoading || (session && projectLoading)) return null;
  if (!session) {
    // The public marketing homepage lives at "/" for logged-out visitors --
    // every other path still redirects to /login exactly as before.
    if (location.pathname === '/') return <Home />;
    return <Navigate to="/login" replace />;
  }
  if (needsSetup && location.pathname !== '/setup') return <Navigate to="/setup" replace />;
  if (!needsSetup && location.pathname === '/setup') return <Navigate to="/" replace />;
  return <Outlet />;
}
