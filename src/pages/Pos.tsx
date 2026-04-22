import { useMemo, useState } from 'react';
import { Minus, Plus, ShoppingCart, Trash2, X, CheckCircle2, Receipt } from 'lucide-react';
import { usePosStore } from '@/features/pos/posStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const formatMXN = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

export default function Pos() {
  const products = usePosStore((s) => s.products);
  const cart = usePosStore((s) => s.cart);
  const addToCart = usePosStore((s) => s.addToCart);
  const updateQuantity = usePosStore((s) => s.updateQuantity);
  const removeFromCart = usePosStore((s) => s.removeFromCart);
  const clearCart = usePosStore((s) => s.clearCart);
  const checkout = usePosStore((s) => s.checkout);

  const [activeCategory, setActiveCategory] = useState<string>('Todos');
  const [cartOpen, setCartOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [lastTotal, setLastTotal] = useState(0);

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return ['Todos', ...Array.from(set)];
  }, [products]);

  const visibleProducts = useMemo(
    () =>
      activeCategory === 'Todos'
        ? products
        : products.filter((p) => p.category === activeCategory),
    [products, activeCategory],
  );

  const itemCount = cart.reduce((sum, i) => sum + i.quantity, 0);
  const total = cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

  const handleCheckout = () => {
    const sale = checkout();
    if (sale) {
      setLastTotal(sale.total);
      setCartOpen(false);
      setSuccessOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-primary-foreground">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">Mi Tienda POS</h1>
              <p className="text-xs text-muted-foreground">Punto de venta</p>
            </div>
          </div>
          <Sheet open={cartOpen} onOpenChange={setCartOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="relative">
                <ShoppingCart className="h-4 w-4" />
                <span className="hidden sm:inline">Carrito</span>
                {itemCount > 0 && (
                  <Badge className="absolute -right-2 -top-2 h-5 min-w-5 justify-center rounded-full px-1 text-[10px]">
                    {itemCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <CartSheet
              cart={cart}
              total={total}
              onUpdate={updateQuantity}
              onRemove={removeFromCart}
              onClear={clearCart}
              onCheckout={handleCheckout}
            />
          </Sheet>
        </div>

        {/* Categorías */}
        <ScrollArea className="w-full">
          <div className="flex gap-2 px-4 pb-3">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  'whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  activeCategory === cat
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-muted-foreground hover:text-foreground',
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </ScrollArea>
      </header>

      {/* Grid de productos */}
      <main className="mx-auto max-w-5xl px-4 py-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {visibleProducts.map((product) => (
            <Card
              key={product.id}
              onClick={() => addToCart(product)}
              className="group flex cursor-pointer flex-col items-center justify-center gap-2 border-border bg-card p-4 transition-all hover:border-primary hover:shadow-[var(--shadow-glow)] active:scale-95"
            >
              <div className="text-4xl">{product.emoji}</div>
              <div className="w-full text-center">
                <p className="line-clamp-1 text-sm font-medium">{product.name}</p>
                <p className="mt-1 text-base font-bold text-primary">{formatMXN(product.price)}</p>
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary opacity-0 transition-opacity group-hover:opacity-100">
                <Plus className="h-4 w-4" />
              </div>
            </Card>
          ))}
        </div>
      </main>

      {/* Barra inferior fija de cobro (móvil) */}
      {itemCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">{itemCount} artículo{itemCount !== 1 ? 's' : ''}</p>
              <p className="text-lg font-bold">{formatMXN(total)}</p>
            </div>
            <Button onClick={() => setCartOpen(true)} size="lg" className="flex-1 sm:flex-none">
              <ShoppingCart className="h-4 w-4" />
              Ver carrito
            </Button>
          </div>
        </div>
      )}

      {/* Diálogo de éxito */}
      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <DialogTitle className="text-center">¡Venta completada!</DialogTitle>
            <DialogDescription className="text-center">
              Cobro registrado por <span className="font-semibold text-foreground">{formatMXN(lastTotal)}</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setSuccessOpen(false)} className="w-full">
              Nueva venta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface CartSheetProps {
  cart: ReturnType<typeof usePosStore.getState>['cart'];
  total: number;
  onUpdate: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onCheckout: () => void;
}

function CartSheet({ cart, total, onUpdate, onRemove, onClear, onCheckout }: CartSheetProps) {
  return (
    <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
      <SheetHeader className="border-b border-border px-4 py-4">
        <SheetTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Carrito
        </SheetTitle>
      </SheetHeader>

      {cart.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
          <ShoppingCart className="h-12 w-12 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Tu carrito está vacío</p>
          <p className="text-xs text-muted-foreground">Toca un producto para agregarlo</p>
        </div>
      ) : (
        <>
          <ScrollArea className="flex-1">
            <ul className="divide-y divide-border">
              {cart.map((item) => (
                <li key={item.product.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-muted text-2xl">
                    {item.product.emoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatMXN(item.product.price)} c/u
                    </p>
                  </div>
                  <div className="flex items-center gap-1 rounded-md border border-border bg-card">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => onUpdate(item.product.id, item.quantity - 1)}
                      aria-label="Disminuir"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <span className="w-7 text-center text-sm font-semibold tabular-nums">
                      {item.quantity}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => onUpdate(item.product.id, item.quantity + 1)}
                      aria-label="Aumentar"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => onRemove(item.product.id)}
                    aria-label="Eliminar"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </ScrollArea>

          <div className="border-t border-border bg-card/50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-2xl font-bold">{formatMXN(total)}</span>
            </div>
            <div className="grid grid-cols-[auto_1fr] gap-2">
              <Button variant="outline" size="lg" onClick={onClear} aria-label="Vaciar carrito">
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button size="lg" onClick={onCheckout} className="font-semibold">
                Cobrar {formatMXN(total)}
              </Button>
            </div>
          </div>
        </>
      )}
    </SheetContent>
  );
}
