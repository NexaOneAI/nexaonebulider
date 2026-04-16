import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';

const NotFound = () => {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,hsl(200_90%_48%/0.06),transparent_70%)]" />
      <div className="relative text-center">
        <Zap className="mx-auto mb-4 h-12 w-12 text-primary animate-pulse-glow" />
        <h1 className="mb-2 text-6xl font-extrabold text-gradient">404</h1>
        <p className="mb-6 text-lg text-muted-foreground">Página no encontrada</p>
        <Button onClick={() => navigate('/')} className="bg-gradient-primary hover:opacity-90">
          Volver al inicio
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
