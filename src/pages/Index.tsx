import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader } from '@/components/ui/Loader';
import Landing from './Landing';

const Index = () => {
  const { isAuthenticated, loading, initialized } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (initialized && isAuthenticated) navigate('/dashboard');
  }, [initialized, isAuthenticated, navigate]);

  if (!initialized || loading) return <Loader fullScreen />;

  return <Landing />;
};

export default Index;
