import { useState, useEffect, useCallback } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { adminService } from '@/features/admin/adminService';
import type { AdminUser, AdminStats } from '@/features/admin/adminTypes';
import { Shield, Users, CreditCard, Folder, Search, Coins, Infinity, Crown, RefreshCw, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Loader } from '@/components/ui/Loader';
import { toast } from 'sonner';

export default function Admin() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [creditDialog, setCreditDialog] = useState<{ user: AdminUser } | null>(null);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditReason, setCreditReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersData, statsData] = await Promise.all([
        adminService.getUsers(),
        adminService.getStats(),
      ]);
      setUsers(usersData);
      setStats(statsData);
    } catch (err) {
      toast.error('Error al cargar datos admin: ' + (err instanceof Error ? err.message : 'Error'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.full_name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const handleToggleUnlimited = async (user: AdminUser) => {
    setActionLoading(true);
    try {
      await adminService.toggleUnlimited(user.id, !user.is_unlimited);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_unlimited: !u.is_unlimited } : u))
      );
      toast.success(`${user.email}: modo ilimitado ${!user.is_unlimited ? 'activado' : 'desactivado'}`);
    } catch {
      toast.error('Error al cambiar modo ilimitado');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleWebContainers = async (user: AdminUser) => {
    setActionLoading(true);
    try {
      await adminService.toggleWebContainers(user.id, !user.webcontainers_enabled);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, webcontainers_enabled: !u.webcontainers_enabled } : u,
        ),
      );
      toast.success(
        `${user.email}: WebContainers ${!user.webcontainers_enabled ? 'activado' : 'desactivado'}`,
      );
    } catch {
      toast.error('Error al cambiar WebContainers');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignCredits = async () => {
    if (!creditDialog || !creditAmount) return;
    const amount = parseInt(creditAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Ingresa una cantidad válida');
      return;
    }
    setActionLoading(true);
    try {
      await adminService.assignCredits(creditDialog.user.id, amount, creditReason || undefined);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === creditDialog.user.id ? { ...u, credits: u.credits + amount } : u
        )
      );
      toast.success(`${amount} créditos asignados a ${creditDialog.user.email}`);
      setCreditDialog(null);
      setCreditAmount('');
      setCreditReason('');
    } catch {
      toast.error('Error al asignar créditos');
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangePlan = async (user: AdminUser, plan: string) => {
    setActionLoading(true);
    try {
      await adminService.changePlan(user.id, plan);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, plan } : u)));
      toast.success(`Plan de ${user.email} cambiado a ${plan}`);
    } catch {
      toast.error('Error al cambiar plan');
    } finally {
      setActionLoading(false);
    }
  };

  const planColors: Record<string, string> = {
    free: 'bg-muted text-muted-foreground',
    starter: 'bg-blue-500/20 text-blue-400',
    pro: 'bg-primary/20 text-primary',
    enterprise: 'bg-accent/20 text-accent',
  };

  if (loading) return <AppShell><div className="flex min-h-[60vh] items-center justify-center"><Loader size="lg" /></div></AppShell>;

  return (
    <AppShell>
      <div className="container max-w-7xl py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Admin Panel</h1>
              <p className="text-muted-foreground">Gestión de usuarios y créditos</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" /> Actualizar
          </Button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="mb-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-border/50 bg-card p-5 shadow-card">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Usuarios</p>
                  <p className="text-2xl font-bold">{stats.total_users}</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-border/50 bg-card p-5 shadow-card">
              <div className="flex items-center gap-3">
                <Folder className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Proyectos</p>
                  <p className="text-2xl font-bold">{stats.total_projects}</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-border/50 bg-card p-5 shadow-card">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Créditos usados</p>
                  <p className="text-2xl font-bold">{stats.total_credits_used}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por email o nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-hidden rounded-xl border border-border/50 bg-card shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Usuario</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Plan</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Créditos</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ilimitado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground" title="WebContainers (Node.js real en el browser)">WC</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rol</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Registro</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="transition-colors hover:bg-muted/10">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">{user.full_name || '—'}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={user.plan}
                        onValueChange={(plan) => handleChangePlan(user, plan)}
                        disabled={actionLoading}
                      >
                        <SelectTrigger className="h-7 w-28 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {['free', 'starter', 'pro', 'enterprise'].map((p) => (
                            <SelectItem key={p} value={p} className="text-xs capitalize">
                              {p}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">
                          {user.is_unlimited ? '∞' : user.credits}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Switch
                        checked={user.is_unlimited}
                        onCheckedChange={() => handleToggleUnlimited(user)}
                        disabled={actionLoading}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Switch
                        checked={user.webcontainers_enabled}
                        onCheckedChange={() => handleToggleWebContainers(user)}
                        disabled={actionLoading}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={user.role === 'admin' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {user.role === 'admin' && <Crown className="mr-1 h-3 w-3" />}
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString('es-MX')}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setCreditDialog({ user })}
                        disabled={actionLoading}
                      >
                        <Coins className="mr-1 h-3 w-3" />
                        Asignar créditos
                      </Button>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                      {search ? 'No se encontraron usuarios' : 'No hay usuarios registrados'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Credit Assignment Dialog */}
      <Dialog open={!!creditDialog} onOpenChange={() => setCreditDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar créditos</DialogTitle>
          </DialogHeader>
          {creditDialog && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Usuario: <span className="font-medium text-foreground">{creditDialog.user.email}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Créditos actuales: <span className="font-semibold text-foreground">{creditDialog.user.credits}</span>
              </p>
              <div className="space-y-2">
                <Label>Cantidad de créditos</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Ej: 50"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Razón (opcional)</Label>
                <Input
                  placeholder="Ej: Bonus por registro temprano"
                  value={creditReason}
                  onChange={(e) => setCreditReason(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreditDialog(null)}>
              Cancelar
            </Button>
            <Button onClick={handleAssignCredits} disabled={actionLoading || !creditAmount}>
              {actionLoading ? 'Asignando...' : 'Asignar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
