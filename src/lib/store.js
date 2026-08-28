/**
 * HorizonPOS — localStorage Data Layer
 * Works offline without Supabase configuration.
 * All data persisted in browser localStorage.
 */

import mockProducts from '../data/products.json';

const PRODUCTS_KEY = 'horizonpos_products';
const ORDERS_KEY = 'horizonpos_orders';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function isClient() {
  return typeof window !== 'undefined';
}

function readLS(key) {
  if (!isClient()) return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeLS(key, data) {
  if (!isClient()) return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('localStorage write failed:', e);
  }
}

// ─────────────────────────────────────────────
// Products
// ─────────────────────────────────────────────

export function getProducts() {
  const stored = readLS(PRODUCTS_KEY);
  if (stored && stored.length > 0) return stored;
  // Seed from mock data on first load
  writeLS(PRODUCTS_KEY, mockProducts);
  return mockProducts;
}

export function saveProducts(products) {
  writeLS(PRODUCTS_KEY, products);
}

export function addProduct(product) {
  const products = getProducts();
  const newProduct = {
    ...product,
    id: Date.now().toString(),
    stock: Number(product.stock) || 0,
    price: Number(product.price) || 0,
    cost: Number(product.cost) || 0,
  };
  const updated = [...products, newProduct];
  saveProducts(updated);
  return updated;
}

export function updateProduct(id, updates) {
  const products = getProducts();
  const updated = products.map(p =>
    p.id === id
      ? {
          ...p,
          ...updates,
          price: Number(updates.price ?? p.price),
          cost: Number(updates.cost ?? p.cost),
          stock: Number(updates.stock ?? p.stock),
        }
      : p
  );
  saveProducts(updated);
  return updated;
}

export function deleteProduct(id) {
  const products = getProducts().filter(p => p.id !== id);
  saveProducts(products);
  return products;
}

/** Deduct stock after a successful sale. Throws if any item would go negative. */
export function deductStock(items) {
  const products = getProducts();
  // Validate all items have enough stock first
  for (const item of items) {
    const product = products.find(p => p.id === item.id);
    if (!product) throw new Error(`Product "${item.name}" not found`);
    if (product.stock < item.qty)
      throw new Error(`"${item.name}" มี Stock เหลือแค่ ${product.stock} ชิ้น`);
  }
  // Deduct
  const updated = products.map(p => {
    const soldItem = items.find(i => i.id === p.id);
    return soldItem ? { ...p, stock: p.stock - soldItem.qty } : p;
  });
  saveProducts(updated);
  return updated;
}

// ─────────────────────────────────────────────
// Orders
// ─────────────────────────────────────────────

export function getOrders() {
  return readLS(ORDERS_KEY) || [];
}

export function saveOrders(orders) {
  writeLS(ORDERS_KEY, orders);
}

/**
 * Create a new order, deduct stock, and persist everything.
 * @param {Array} items  - cart items [{id, name, price, cost, qty}]
 * @param {'cash'|'qr'} paymentMethod
 * @returns {object} The saved order
 */
export function addOrder(items, paymentMethod) {
  // Deduct stock first (throws on insufficient stock)
  deductStock(items);

  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  const totalCost = items.reduce((s, i) => s + (i.cost || 0) * i.qty, 0);
  const profit = total - totalCost;

  const order = {
    id: Date.now().toString(),
    items: items.map(i => ({ id: i.id, name: i.name, price: i.price, cost: i.cost || 0, qty: i.qty })),
    total,
    totalCost,
    profit,
    paymentMethod,
    createdAt: new Date().toISOString(),
  };

  const orders = getOrders();
  saveOrders([...orders, order]);
  return order;
}

// ─────────────────────────────────────────────
// Dashboard Analytics
// ─────────────────────────────────────────────

export function getDashboardStats() {
  const orders = getOrders();

  const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
  const totalCost = orders.reduce((s, o) => s + o.totalCost, 0);
  const totalProfit = orders.reduce((s, o) => s + o.profit, 0);
  const totalOrders = orders.length;

  // Top products by qty sold
  const soldMap = {};
  orders.forEach(order => {
    order.items.forEach(item => {
      if (!soldMap[item.id]) soldMap[item.id] = { name: item.name, qty: 0, revenue: 0 };
      soldMap[item.id].qty += item.qty;
      soldMap[item.id].revenue += item.price * item.qty;
    });
  });
  const topProducts = Object.values(soldMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  // Daily sales — last 7 days
  const dailySales = getLast7Days(orders);

  // Monthly sales — last 6 months
  const monthlySales = getLast6Months(orders);

  return { totalRevenue, totalCost, totalProfit, totalOrders, topProducts, dailySales, monthlySales };
}

function getLast7Days(orders) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric' });
    const revenue = orders
      .filter(o => o.createdAt.slice(0, 10) === dateStr)
      .reduce((s, o) => s + o.total, 0);
    const profit = orders
      .filter(o => o.createdAt.slice(0, 10) === dateStr)
      .reduce((s, o) => s + o.profit, 0);
    days.push({ label, revenue, profit });
  }
  return days;
}

function getLast6Months(orders) {
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const year = d.getFullYear();
    const month = d.getMonth();
    const label = d.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' });
    const revenue = orders
      .filter(o => {
        const od = new Date(o.createdAt);
        return od.getFullYear() === year && od.getMonth() === month;
      })
      .reduce((s, o) => s + o.total, 0);
    months.push({ label, revenue });
  }
  return months;
}
