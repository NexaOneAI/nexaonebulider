import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Loader2 } from 'lucide-react';
import Landing from './Landing';

const Index = () => {
  const { session, loading, initialized, initialize } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => { initialize(); }, [initialize]);

  useEffect(() => {
    if (initialized && session) {
      navigate('/dashboard');
    }
  }, [initialized, session, navigate]);

  if (!initialized || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <Landing />;
};

export default Index;
