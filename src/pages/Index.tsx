import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader } from '@/components/ui/Loader';
import Landing from './Landing';

/**
 * Index page — entry point of the app.
 * - If loading → show spinner
 * - If authenticated → redirect to dashboard
 * - If not authenticated → show landing page
 */
const Index = () => {
  const { isAuthenticated, loading, initialized } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (initialized && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [initialized, isAuthenticated, navigate]);

  // Show loading while checking auth
  if (!initialized || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Loader size="lg" />
          <p className="mt-4 text-sm text-muted-foreground">Cargando Nexa One...</p>
        </div>
      </div>
    );
  }

  // If authenticated, don't render landing (redirect is pending)
  if (isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader size="lg" />
      </div>
    );
  }

  // Not authenticated — show landing
  return <Landing />;
};

export default Index;
