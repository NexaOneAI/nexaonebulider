export interface PosProduct {
  id: string;
  name: string;
  price: number;
  emoji: string;
  category: string;
}

export interface CartItem {
  product: PosProduct;
  quantity: number;
}

export const DEFAULT_PRODUCTS: PosProduct[] = [
  { id: 'p1', name: 'Café Americano', price: 35, emoji: '☕', category: 'Bebidas' },
  { id: 'p2', name: 'Cappuccino', price: 45, emoji: '☕', category: 'Bebidas' },
  { id: 'p3', name: 'Latte', price: 50, emoji: '🥛', category: 'Bebidas' },
  { id: 'p4', name: 'Té Chai', price: 40, emoji: '🍵', category: 'Bebidas' },
  { id: 'p5', name: 'Croissant', price: 38, emoji: '🥐', category: 'Panadería' },
  { id: 'p6', name: 'Muffin', price: 32, emoji: '🧁', category: 'Panadería' },
  { id: 'p7', name: 'Donut', price: 28, emoji: '🍩', category: 'Panadería' },
  { id: 'p8', name: 'Sandwich', price: 65, emoji: '🥪', category: 'Comida' },
  { id: 'p9', name: 'Hamburguesa', price: 95, emoji: '🍔', category: 'Comida' },
  { id: 'p10', name: 'Pizza Slice', price: 55, emoji: '🍕', category: 'Comida' },
  { id: 'p11', name: 'Ensalada', price: 75, emoji: '🥗', category: 'Comida' },
  { id: 'p12', name: 'Brownie', price: 30, emoji: '🍫', category: 'Postres' },
];
