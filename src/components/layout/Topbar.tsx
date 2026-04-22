import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Zap, LogOut, LayoutDashboard, CreditCard, Shield, Plug, Menu } from 'lucide-react';
import logo from '@/assets/logo.png';

export function Topbar() {
  const { session, profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    navigate('/');
  };

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <nav className="sticky top-0 z-50 glass border-b border-border/50">
      <div className="container flex h-14 items-center justify-between sm:h-16">
        <Link to="/" className="flex items-center gap-2" aria-label="Inicio Nexa One">
          <img
            src={logo}
            alt="Nexa One"
            className="h-8 w-8 rounded-lg object-cover"
            loading="eager"
            decoding="async"
          />
          <span className="text-base font-bold tracking-tight sm:text-lg">Nexa One</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-2 md:flex">
          {session ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
                <LayoutDashboard className="mr-1.5 h-4 w-4" /> Dashboard
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/billing')}>
                <CreditCard className="mr-1.5 h-4 w-4" /> Billing
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/connectors')}>
                <Plug className="mr-1.5 h-4 w-4" /> Connectors
              </Button>
              {isAdmin && (
                <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
                  <Shield className="mr-1.5 h-4 w-4" /> Admin
                </Button>
              )}
              <div className="ml-2 flex items-center gap-2 rounded-lg bg-secondary px-3 py-1.5">
                <Zap className="h-3.5 w-3.5 text-primary" />
                <span className="text-sm font-medium">{profile?.credits ?? 0}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Cerrar sesión">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>Iniciar sesión</Button>
              <Button size="sm" className="bg-gradient-primary hover:opacity-90" onClick={() => navigate('/register')}>Registrarse</Button>
            </>
          )}
        </div>

        {/* Mobile nav */}
        <div className="flex items-center gap-2 md:hidden">
          {session && (
            <div className="flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1.5">
              <Zap className="h-3.5 w-3.5 text-primary" />
              <span className="text-sm font-medium">{profile?.credits ?? 0}</span>
            </div>
          )}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Abrir menú">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] max-w-xs p-0">
              <div className="flex h-full flex-col">
                <div className="flex items-center gap-2 border-b border-border/50 p-4">
                  <img src={logo} alt="Nexa One" className="h-8 w-8 rounded-lg object-cover" />
                  <span className="font-bold">Nexa One</span>
                </div>
                <nav className="flex flex-1 flex-col gap-1 p-3">
                  {session ? (
                    <>
                      <Button variant="ghost" className="justify-start" onClick={() => go('/dashboard')}>
                        <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                      </Button>
                      <Button variant="ghost" className="justify-start" onClick={() => go('/billing')}>
                        <CreditCard className="mr-2 h-4 w-4" /> Billing
                      </Button>
                      <Button variant="ghost" className="justify-start" onClick={() => go('/connectors')}>
                        <Plug className="mr-2 h-4 w-4" /> Connectors
                      </Button>
                      {isAdmin && (
                        <Button variant="ghost" className="justify-start" onClick={() => go('/admin')}>
                          <Shield className="mr-2 h-4 w-4" /> Admin
                        </Button>
                      )}
                      <div className="mt-auto border-t border-border/50 pt-3">
                        <Button variant="ghost" className="w-full justify-start" onClick={handleSignOut}>
                          <LogOut className="mr-2 h-4 w-4" /> Cerrar sesión
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <Button variant="ghost" className="justify-start" onClick={() => go('/login')}>Iniciar sesión</Button>
                      <Button className="bg-gradient-primary hover:opacity-90" onClick={() => go('/register')}>Registrarse</Button>
                    </>
                  )}
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
