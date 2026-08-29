/**
 * HorizonPOS — localStorage Data Layer
 * Works offline without Supabase configuration.
 * All data persisted in browser localStorage with SKU & Barcode support.
 */

import mockProducts from '../data/products.json';
import { generateSKU, generateBarcode } from './barcode';
import { cleanImageUrl } from './imageHelper';

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

/**
 * Migration helper: Ensure all products have SKU, Barcode, and valid image URLs
 */
function migrateProducts(products) {
  let hasChanges = false;
  const migrated = products.map((p, idx) => {
    let updated = { ...p };

    // Auto-generate missing SKU
    if (!updated.sku || typeof updated.sku !== 'string' || updated.sku.trim() === '') {
      updated.sku = generateSKU(updated.category);
      hasChanges = true;
    }

    // Auto-generate missing Barcode
    if (!updated.barcode || typeof updated.barcode !== 'string' || updated.barcode.trim() === '') {
      updated.barcode = generateBarcode();
      hasChanges = true;
    }

    // Fix legacy broken local images with matching mock image
    if (updated.image_url && updated.image_url.startsWith('/images/')) {
      const match = mockProducts.find(m => m.id === updated.id || m.name === updated.name);
      if (match && match.image_url && !match.image_url.startsWith('/images/')) {
        updated.image_url = match.image_url;
        hasChanges = true;
      }
    }

    return updated;
  });

  if (hasChanges) {
    writeLS(PRODUCTS_KEY, migrated);
  }
  return migrated;
}

// ─────────────────────────────────────────────
// Products
// ─────────────────────────────────────────────

export function getProducts() {
  const stored = readLS(PRODUCTS_KEY);
  if (stored && stored.length > 0) {
    return migrateProducts(stored);
  }
  // Seed from mock data on first load
  writeLS(PRODUCTS_KEY, mockProducts);
  return mockProducts;
}

export function saveProducts(products) {
  writeLS(PRODUCTS_KEY, products);
}

export function addProduct(product) {
  const products = getProducts();
  const { cleanUrl } = cleanImageUrl(product.image_url || '');

  const newProduct = {
    ...product,
    id: Date.now().toString(),
    sku: (product.sku && product.sku.trim()) || generateSKU(product.category),
    barcode: (product.barcode && product.barcode.trim()) || generateBarcode(),
    image_url: cleanUrl,
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
  const cleanUpdates = { ...updates };
  if (cleanUpdates.image_url !== undefined) {
    const { cleanUrl } = cleanImageUrl(cleanUpdates.image_url);
    cleanUpdates.image_url = cleanUrl;
  }

  const updated = products.map(p =>
    p.id === id
      ? {
          ...p,
          ...cleanUpdates,
          sku: cleanUpdates.sku !== undefined ? (cleanUpdates.sku.trim() || p.sku) : p.sku,
          barcode: cleanUpdates.barcode !== undefined ? (cleanUpdates.barcode.trim() || p.barcode) : p.barcode,
          price: Number(cleanUpdates.price ?? p.price),
          cost: Number(cleanUpdates.cost ?? p.cost),
          stock: Number(cleanUpdates.stock ?? p.stock),
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

/** Export all products to a downloadable JSON file */
export function exportProductsJSON() {
  const products = getProducts();
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(products, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `horizonpos_products_backup_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/** Import products from a JSON file */
export function importProductsJSON(importedArray) {
  if (!Array.isArray(importedArray)) throw new Error('ไฟล์ JSON ไม่ถูกต้อง (ต้องเป็นรายการสินค้า)');
  saveProducts(importedArray);
  return importedArray;
}

/** Reset all products back to default mock data */
export function resetToDefaultProducts() {
  saveProducts(mockProducts);
  return mockProducts;
}

/**
 * Search for a product by exact Barcode, SKU, or ID
 * @param {string} code 
 * @returns {object|null}
 */
export function findProductByBarcodeOrSku(code) {
  if (!code || typeof code !== 'string') return null;
  const searchCode = code.trim().toLowerCase();
  const products = getProducts();
  
  return products.find(p => 
    (p.barcode && p.barcode.toLowerCase() === searchCode) ||
    (p.sku && p.sku.toLowerCase() === searchCode) ||
    (p.id && p.id.toLowerCase() === searchCode)
  ) || null;
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

/** Format or generate clean readable Order Bill Number */
export function formatOrderNo(order) {
  if (order.orderNo) return order.orderNo;
  const datePart = (order.createdAt || '').slice(0, 10).replace(/-/g, '') || new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const idPart = (order.id || Date.now().toString()).slice(-4);
  return `ORD-${datePart}-${idPart}`;
}

export function getOrders() {
  const orders = readLS(ORDERS_KEY) || [];
  return orders.map(o => ({
    ...o,
    orderNo: formatOrderNo(o),
    cashReceived: o.cashReceived !== undefined ? o.cashReceived : (o.paymentMethod === 'cash' ? o.total : null),
    change: o.change !== undefined ? o.change : 0,
  }));
}

export function saveOrders(orders) {
  writeLS(ORDERS_KEY, orders);
}

export function getOrderById(id) {
  const orders = getOrders();
  return orders.find(o => o.id === id || o.orderNo === id) || null;
}

/** Restore stock for items (e.g. upon order cancellation/refund) */
export function restoreStock(items) {
  if (!Array.isArray(items) || items.length === 0) return getProducts();
  const products = getProducts();
  const updated = products.map(p => {
    const item = items.find(i => i.id === p.id);
    return item ? { ...p, stock: p.stock + (Number(item.qty) || 0) } : p;
  });
  saveProducts(updated);
  return updated;
}

/**
 * Create a new order, deduct stock, and persist everything.
 * @param {Array} items  - cart items [{id, name, price, cost, qty, sku, barcode}]
 * @param {'cash'|'qr'} paymentMethod
 * @param {object} [extra] - { cashReceived, change, notes }
 * @returns {object} The saved order
 */
export function addOrder(items, paymentMethod, extra = {}) {
  // Deduct stock first (throws on insufficient stock)
  deductStock(items);

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const orderNo = `ORD-${dateStr}-${randomSuffix}`;

  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  const totalCost = items.reduce((s, i) => s + (i.cost || 0) * i.qty, 0);
  const profit = total - totalCost;

  const order = {
    id: Date.now().toString(),
    orderNo,
    items: items.map(i => ({
      id: i.id,
      name: i.name,
      sku: i.sku || '',
      barcode: i.barcode || '',
      price: i.price,
      cost: i.cost || 0,
      qty: i.qty,
    })),
    total,
    totalCost,
    profit,
    paymentMethod,
    cashReceived: extra.cashReceived !== undefined ? extra.cashReceived : (paymentMethod === 'cash' ? total : null),
    change: extra.change !== undefined ? extra.change : 0,
    notes: extra.notes || '',
    createdAt: now.toISOString(),
  };

  const orders = readLS(ORDERS_KEY) || [];
  saveOrders([...orders, order]);
  return order;
}

/**
 * Delete / Refund an order and optionally return items to inventory stock
 * @param {string} id
 * @param {boolean} shouldRestoreStock
 * @returns {Array} Updated orders list
 */
export function deleteOrder(id, shouldRestoreStock = true) {
  const orders = readLS(ORDERS_KEY) || [];
  const orderToDelete = orders.find(o => o.id === id);
  if (!orderToDelete) return getOrders();

  if (shouldRestoreStock && Array.isArray(orderToDelete.items)) {
    restoreStock(orderToDelete.items);
  }

  const updatedOrders = orders.filter(o => o.id !== id);
  saveOrders(updatedOrders);
  return getOrders();
}

/** Clear all orders */
export function clearAllOrders() {
  saveOrders([]);
  return [];
}

/** Export orders to CSV file */
export function exportOrdersCSV() {
  const orders = getOrders();
  if (orders.length === 0) throw new Error('ไม่มีข้อมูลประวัติการขายให้ส่งออก');

  const headers = ['เลขที่บิล', 'วันที่/เวลา', 'วิธีชำระเงิน', 'จำนวนรายการ', 'ยอดรวม (฿)', 'ต้นทุนรวม (฿)', 'กำไรสุทธิ (฿)', 'รายการสินค้า'];
  const rows = orders.map(o => {
    const itemSummary = o.items.map(i => `${i.name} (x${i.qty})`).join('; ');
    const dateFormatted = new Date(o.createdAt).toLocaleString('th-TH');
    const payment = o.paymentMethod === 'cash' ? 'เงินสด' : 'QR Code';
    return [
      `"${o.orderNo || o.id}"`,
      `"${dateFormatted}"`,
      `"${payment}"`,
      o.items.reduce((s, i) => s + i.qty, 0),
      o.total.toFixed(2),
      o.totalCost.toFixed(2),
      o.profit.toFixed(2),
      `"${itemSummary.replace(/"/g, '""')}"`,
    ];
  });

  const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `horizonpos_orders_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Export orders to JSON file */
export function exportOrdersJSON() {
  const orders = getOrders();
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(orders, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `horizonpos_orders_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
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
