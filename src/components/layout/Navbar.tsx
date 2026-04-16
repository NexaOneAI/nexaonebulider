import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Zap, LogOut, LayoutDashboard, CreditCard, Shield } from 'lucide-react';

export function Navbar() {
  const { session, profile, signOut } = useAuthStore();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-50 glass border-b border-border/50">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight">Nexa One</span>
        </Link>

        <div className="flex items-center gap-2">
          {session ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
                <LayoutDashboard className="mr-1.5 h-4 w-4" />
                Dashboard
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/billing')}>
                <CreditCard className="mr-1.5 h-4 w-4" />
                Billing
              </Button>
              {profile?.role === 'admin' && (
                <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
                  <Shield className="mr-1.5 h-4 w-4" />
                  Admin
                </Button>
              )}
              <div className="ml-2 flex items-center gap-2 rounded-lg bg-secondary px-3 py-1.5">
                <Zap className="h-3.5 w-3.5 text-primary" />
                <span className="text-sm font-medium">{profile?.credits ?? 0}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                Iniciar sesión
              </Button>
              <Button size="sm" className="bg-gradient-primary hover:opacity-90" onClick={() => navigate('/register')}>
                Registrarse
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
