import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '@/features/auth/authService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import logo from '@/assets/logo.png';
import { toast } from 'sonner';
import { GoogleButton } from '@/components/auth/GoogleButton';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authService.signIn({ email, password });
      navigate('/dashboard');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-20%,hsl(200_90%_48%/0.08),transparent_70%)]" />
      <div className="relative w-full max-w-md rounded-2xl border border-border/50 bg-card p-8 shadow-elevated">
        <div className="mb-8 text-center">
          <Link to="/" className="mb-4 inline-flex items-center gap-2">
            <img src={logo} alt="Nexa One" className="h-12 w-12 rounded-xl object-cover" />
          </Link>
          <h1 className="text-2xl font-bold">Bienvenido de vuelta</h1>
          <p className="mt-1 text-sm text-muted-foreground">Inicia sesión en tu cuenta</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" required className="mt-1.5" />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Contraseña</Label>
              <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required className="mt-1.5" />
          </div>
          <Button type="submit" className="w-full bg-gradient-primary hover:opacity-90" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Iniciar sesión
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">o</span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <GoogleButton />

        <p className="mt-6 text-center text-sm text-muted-foreground">
          ¿No tienes cuenta? <Link to="/register" className="font-medium text-primary hover:underline">Regístrate</Link>
        </p>
      </div>
    </div>
  );
}
