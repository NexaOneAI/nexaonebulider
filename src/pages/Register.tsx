import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '@/features/auth/authService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Zap, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authService.signUp({ email, password, full_name: fullName });
      toast.success('Cuenta creada. Revisa tu email para confirmar.');
      navigate('/dashboard');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al registrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-20%,hsl(260_70%_58%/0.08),transparent_70%)]" />
      <div className="relative w-full max-w-md rounded-2xl border border-border/50 bg-card p-8 shadow-elevated">
        <div className="mb-8 text-center">
          <Link to="/" className="mb-4 inline-flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
          </Link>
          <h1 className="text-2xl font-bold">Crea tu cuenta</h1>
          <p className="mt-1 text-sm text-muted-foreground">Empieza a construir con IA</p>
        </div>
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <Label htmlFor="name">Nombre completo</Label>
            <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Tu nombre" required className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" required className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required minLength={6} className="mt-1.5" />
          </div>
          <Button type="submit" className="w-full bg-gradient-primary hover:opacity-90" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Crear cuenta
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          ¿Ya tienes cuenta? <Link to="/login" className="font-medium text-primary hover:underline">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}
