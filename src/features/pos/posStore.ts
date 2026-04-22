import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_PRODUCTS, type CartItem, type PosProduct } from './posTypes';

interface Sale {
  id: string;
  items: CartItem[];
  total: number;
  createdAt: string;
}

interface PosState {
  products: PosProduct[];
  cart: CartItem[];
  sales: Sale[];
  addToCart: (product: PosProduct) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  checkout: () => Sale | null;
}

export const usePosStore = create<PosState>()(
  persist(
    (set, get) => ({
      products: DEFAULT_PRODUCTS,
      cart: [],
      sales: [],
      addToCart: (product) =>
        set((state) => {
          const existing = state.cart.find((i) => i.product.id === product.id);
          if (existing) {
            return {
              cart: state.cart.map((i) =>
                i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i,
              ),
            };
          }
          return { cart: [...state.cart, { product, quantity: 1 }] };
        }),
      removeFromCart: (productId) =>
        set((state) => ({ cart: state.cart.filter((i) => i.product.id !== productId) })),
      updateQuantity: (productId, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return { cart: state.cart.filter((i) => i.product.id !== productId) };
          }
          return {
            cart: state.cart.map((i) =>
              i.product.id === productId ? { ...i, quantity } : i,
            ),
          };
        }),
      clearCart: () => set({ cart: [] }),
      checkout: () => {
        const { cart, sales } = get();
        if (cart.length === 0) return null;
        const total = cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
        const sale: Sale = {
          id: crypto.randomUUID(),
          items: cart,
          total,
          createdAt: new Date().toISOString(),
        };
        set({ cart: [], sales: [sale, ...sales].slice(0, 50) });
        return sale;
      },
    }),
    { name: 'nexa-pos-storage' },
  ),
);
