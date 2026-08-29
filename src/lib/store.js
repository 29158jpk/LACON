/**
 * HorizonPOS — Universal Data Layer
 * Connects to Supabase Cloud Database (PostgreSQL) when configured.
 * Automatically synchronizes with browser cache and provides Realtime updates.
 */

import mockProducts from '../data/products.json' with { type: 'json' };
import { generateSKU, generateBarcode } from './barcode.js';
import { cleanImageUrl } from './imageHelper.js';
import { hashPasswordSync, isValidEmail, isValidUsername } from './authHelper.js';
import { supabase, isSupabaseConfigured } from './supabase.js';

export const PRODUCTS_KEY = 'horizonpos_products';
export const ORDERS_KEY = 'horizonpos_orders';
export const USERS_KEY = 'horizonpos_users';
export const CURRENT_USER_KEY = 'horizonpos_current_user';

export const DEFAULT_USERS = [
  {
    id: 'u-admin',
    name: 'ผู้จัดการ (Admin)',
    username: 'admin',
    email: 'admin@horizonpos.com',
    pin: '1111',
    password: 'admin',
    passwordHash: hashPasswordSync('admin'),
    role: 'admin',
    avatarColor: '#3b82f6',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'u-cashier1',
    name: 'สมชาย ใจดี',
    username: 'cashier1',
    email: 'cashier1@horizonpos.com',
    pin: '1234',
    password: 'cashier1',
    passwordHash: hashPasswordSync('cashier1'),
    role: 'employee',
    avatarColor: '#10b981',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'u-cashier2',
    name: 'สมหญิง รักบริการ',
    username: 'cashier2',
    email: 'cashier2@horizonpos.com',
    pin: '5678',
    password: 'cashier2',
    passwordHash: hashPasswordSync('cashier2'),
    role: 'employee',
    avatarColor: '#8b5cf6',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

// ─────────────────────────────────────────────
// Local Storage Helpers & Cache
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
  const migrated = (products || []).map((p) => {
    let updated = { ...p };

    if (!updated.sku || typeof updated.sku !== 'string' || updated.sku.trim() === '') {
      updated.sku = generateSKU(updated.category || 'General');
      hasChanges = true;
    }

    if (!updated.barcode || typeof updated.barcode !== 'string' || updated.barcode.trim() === '') {
      updated.barcode = generateBarcode();
      hasChanges = true;
    }

    if (updated.image_url && updated.image_url.startsWith('/images/')) {
      const match = mockProducts.find(m => m.id === updated.id || m.name === updated.name);
      if (match && match.image_url && !match.image_url.startsWith('/images/')) {
        updated.image_url = match.image_url;
        hasChanges = true;
      }
    }

    return updated;
  });

  if (hasChanges && isClient()) {
    writeLS(PRODUCTS_KEY, migrated);
  }
  return migrated;
}

// ─────────────────────────────────────────────
// Realtime Subscriptions
// ─────────────────────────────────────────────

/**
 * Subscribe to live order creations / updates from any device via Supabase
 */
export function subscribeToOrders(onOrderChange) {
  if (!supabase || !isSupabaseConfigured()) return null;
  try {
    const channel = supabase
      .channel('realtime:orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        async (payload) => {
          // Re-fetch all orders to maintain consistent ordering and cache
          await getOrdersAsync();
          if (onOrderChange) onOrderChange(payload);
          if (isClient()) {
            window.dispatchEvent(new CustomEvent('horizonpos_orders_change', { detail: payload }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Realtime orders subscription error:', err);
    return null;
  }
}

/**
 * Subscribe to live stock / product updates from any device via Supabase
 */
export function subscribeToProducts(onProductChange) {
  if (!supabase || !isSupabaseConfigured()) return null;
  try {
    const channel = supabase
      .channel('realtime:products')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        async (payload) => {
          await getProductsAsync();
          if (onProductChange) onProductChange(payload);
          if (isClient()) {
            window.dispatchEvent(new CustomEvent('horizonpos_products_change', { detail: payload }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Realtime products subscription error:', err);
    return null;
  }
}

// ─────────────────────────────────────────────
// Products Layer (Supabase + Local Cache)
// ─────────────────────────────────────────────

export function getProducts() {
  const stored = readLS(PRODUCTS_KEY);
  if (stored && stored.length > 0) {
    return migrateProducts(stored);
  }
  const initial = migrateProducts(mockProducts);
  writeLS(PRODUCTS_KEY, initial);
  return initial;
}

export async function getProductsAsync() {
  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        if (data.length === 0) {
          // Seed Supabase with initial product catalog if database is fresh
          const initialSeed = migrateProducts(mockProducts).map(p => ({
            id: String(p.id),
            name: p.name,
            category: p.category,
            sku: p.sku,
            barcode: p.barcode,
            price: Number(p.price) || 0,
            cost: Number(p.cost) || 0,
            image_url: p.image_url || '',
            stock: Number(p.stock) || 0,
          }));

          const { data: seeded, error: seedErr } = await supabase
            .from('products')
            .insert(initialSeed)
            .select();

          if (!seedErr && seeded) {
            writeLS(PRODUCTS_KEY, seeded);
            return seeded;
          }
        }

        const normalized = data.map(p => ({
          ...p,
          price: Number(p.price) || 0,
          cost: Number(p.cost) || 0,
          stock: Number(p.stock) || 0,
        }));
        writeLS(PRODUCTS_KEY, normalized);
        return normalized;
      }
    } catch (err) {
      console.warn('Supabase getProductsAsync fallback to local:', err);
    }
  }
  return getProducts();
}

export function saveProducts(products) {
  writeLS(PRODUCTS_KEY, products);
  if (isClient()) {
    window.dispatchEvent(new CustomEvent('horizonpos_products_change'));
  }
}

export async function addProductAsync(product) {
  const { cleanUrl } = cleanImageUrl(product.image_url || '');
  const newProduct = {
    id: Date.now().toString(),
    name: product.name,
    category: product.category || 'General',
    sku: (product.sku && product.sku.trim()) || generateSKU(product.category),
    barcode: (product.barcode && product.barcode.trim()) || generateBarcode(),
    image_url: cleanUrl,
    stock: Number(product.stock) || 0,
    price: Number(product.price) || 0,
    cost: Number(product.cost) || 0,
  };

  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert([newProduct])
        .select()
        .single();
      if (!error && data) {
        const products = getProducts();
        saveProducts([data, ...products]);
        return data;
      }
    } catch (err) {
      console.warn('Supabase addProductAsync error:', err);
    }
  }

  const products = getProducts();
  const updated = [newProduct, ...products];
  saveProducts(updated);
  return newProduct;
}

export function addProduct(product) {
  // Sync in local cache immediately
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
  const products = getProducts();
  const updated = [newProduct, ...products];
  saveProducts(updated);

  // Background Cloud Sync
  if (supabase && isSupabaseConfigured()) {
    supabase.from('products').insert([newProduct]).then();
  }
  return updated;
}

export async function updateProductAsync(id, updates) {
  const cleanUpdates = { ...updates };
  if (cleanUpdates.image_url !== undefined) {
    const { cleanUrl } = cleanImageUrl(cleanUpdates.image_url);
    cleanUpdates.image_url = cleanUrl;
  }

  if (cleanUpdates.price !== undefined) cleanUpdates.price = Number(cleanUpdates.price);
  if (cleanUpdates.cost !== undefined) cleanUpdates.cost = Number(cleanUpdates.cost);
  if (cleanUpdates.stock !== undefined) cleanUpdates.stock = Number(cleanUpdates.stock);

  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('products')
        .update(cleanUpdates)
        .eq('id', id)
        .select()
        .single();
      if (!error && data) {
        const products = getProducts().map(p => p.id === id ? { ...p, ...data } : p);
        saveProducts(products);
        return data;
      }
    } catch (err) {
      console.warn('Supabase updateProductAsync error:', err);
    }
  }

  const products = getProducts().map(p => p.id === id ? { ...p, ...cleanUpdates } : p);
  saveProducts(products);
  return products.find(p => p.id === id);
}

export function updateProduct(id, updates) {
  const cleanUpdates = { ...updates };
  if (cleanUpdates.image_url !== undefined) {
    const { cleanUrl } = cleanImageUrl(cleanUpdates.image_url);
    cleanUpdates.image_url = cleanUrl;
  }
  const products = getProducts().map(p =>
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
  saveProducts(products);

  if (supabase && isSupabaseConfigured()) {
    supabase.from('products').update(cleanUpdates).eq('id', id).then();
  }
  return products;
}

export async function deleteProductAsync(id) {
  if (supabase && isSupabaseConfigured()) {
    try {
      await supabase.from('products').delete().eq('id', id);
    } catch (err) {
      console.warn('Supabase deleteProductAsync error:', err);
    }
  }
  const products = getProducts().filter(p => p.id !== id);
  saveProducts(products);
  return products;
}

export function deleteProduct(id) {
  const products = getProducts().filter(p => p.id !== id);
  saveProducts(products);
  if (supabase && isSupabaseConfigured()) {
    supabase.from('products').delete().eq('id', id).then();
  }
  return products;
}

export function findProductByBarcodeOrSku(query) {
  if (!query) return null;
  const q = query.trim().toLowerCase();
  const products = getProducts();
  return (
    products.find(p => p.barcode && p.barcode.toLowerCase() === q) ||
    products.find(p => p.sku && p.sku.toLowerCase() === q) ||
    products.find(p => p.id && String(p.id).toLowerCase() === q) ||
    null
  );
}

export async function adjustStockAsync(id, delta, reason = 'manual_adjustment') {
  const products = getProducts();
  const product = products.find(p => p.id === id);
  if (!product) throw new Error('ไม่พบสินค้าที่ต้องการปรับสต็อก');

  const newStock = Math.max(0, (Number(product.stock) || 0) + delta);

  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('products')
        .update({ stock: newStock })
        .eq('id', id)
        .select()
        .single();
      if (!error && data) {
        const updated = products.map(p => p.id === id ? { ...p, stock: newStock } : p);
        saveProducts(updated);
        return updated;
      }
    } catch (err) {
      console.warn('Supabase adjustStockAsync error:', err);
    }
  }

  const updated = products.map(p => p.id === id ? { ...p, stock: newStock } : p);
  saveProducts(updated);
  return updated;
}

export function adjustStock(id, delta, reason = 'manual_adjustment') {
  const products = getProducts();
  const product = products.find(p => p.id === id);
  if (!product) throw new Error('ไม่พบสินค้าที่ต้องการปรับสต็อก');

  const newStock = Math.max(0, (Number(product.stock) || 0) + delta);
  const updated = products.map(p => p.id === id ? { ...p, stock: newStock } : p);
  saveProducts(updated);

  if (supabase && isSupabaseConfigured()) {
    supabase.from('products').update({ stock: newStock }).eq('id', id).then();
  }
  return updated;
}

export function deductStock(items) {
  const products = getProducts();
  // Validate stock
  for (const item of items) {
    const p = products.find(prod => prod.id === item.id);
    if (!p) throw new Error(`ไม่พบสินค้า "${item.name}" ในระบบ`);
    if (p.stock < item.qty) {
      throw new Error(`สินค้า "${item.name}" มี Stock เหลือเพียง ${p.stock} ชิ้น (ต้องการ ${item.qty} ชิ้น)`);
    }
  }

  // Deduct
  const updated = products.map(p => {
    const item = items.find(i => i.id === p.id);
    return item ? { ...p, stock: p.stock - item.qty } : p;
  });

  saveProducts(updated);
  return updated;
}

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

export function importProductsJSON(jsonData) {
  if (!Array.isArray(jsonData)) throw new Error('รูปแบบไฟล์ JSON ไม่ถูกต้อง (ต้องเป็น Array ของสินค้า)');
  const validated = jsonData.map(p => {
    if (!p.name || p.price === undefined) throw new Error('ข้อมูลสินค้าในไฟล์ไม่สมบูรณ์ (ต้องมี name และ price)');
    return {
      ...p,
      id: p.id ? String(p.id) : Date.now().toString() + Math.random().toString(36).slice(2, 6),
      sku: p.sku || generateSKU(p.category || 'General'),
      barcode: p.barcode || generateBarcode(),
      price: Number(p.price) || 0,
      cost: Number(p.cost) || 0,
      stock: Number(p.stock) || 0,
    };
  });
  saveProducts(validated);
  if (supabase && isSupabaseConfigured()) {
    supabase.from('products').upsert(validated).then();
  }
  return validated;
}

// ─────────────────────────────────────────────
// Orders Layer (Supabase + Local Cache)
// ─────────────────────────────────────────────

export function getOrders() {
  return readLS(ORDERS_KEY) || [];
}

export async function getOrdersAsync() {
  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const normalized = data.map(o => ({
          ...o,
          id: String(o.id),
          total: Number(o.total) || 0,
          totalCost: Number(o.total_cost || o.totalCost) || 0,
          profit: Number(o.profit) || 0,
          cashReceived: o.cash_received !== null ? Number(o.cash_received) : null,
          change: Number(o.change) || 0,
          paymentMethod: o.payment_method || o.paymentMethod,
          createdAt: o.created_at || o.createdAt,
          items: Array.isArray(o.items) ? o.items : [],
          cashier: o.cashier || {},
          customer: o.customer || null,
        }));
        writeLS(ORDERS_KEY, normalized);
        return normalized;
      }
    } catch (err) {
      console.warn('Supabase getOrdersAsync error:', err);
    }
  }
  return getOrders();
}

export function saveOrders(orders) {
  writeLS(ORDERS_KEY, orders);
  if (isClient()) {
    window.dispatchEvent(new CustomEvent('horizonpos_orders_change'));
  }
}

/**
 * Add and persist a new Order into Supabase & Local Cache with strict session checking
 */
export async function addOrderAsync(items, paymentMethod, extra = {}) {
  const currentUser = getCurrentUser();
  if (!currentUser || !currentUser.id || !currentUser.role) {
    throw new Error('กรุณาเข้าสู่ระบบหรือสมัครสมาชิกก่อนทำรายการ');
  }

  if (!items || items.length === 0) {
    throw new Error('ไม่มีรายการสินค้าในตะกร้า');
  }

  // 1. Stock Check & Atomic Deduction
  if (supabase && isSupabaseConfigured()) {
    // Fetch live product stock from Supabase
    const { data: dbProducts, error: prodErr } = await supabase
      .from('products')
      .select('id, name, stock')
      .in('id', items.map(i => String(i.id)));

    if (!prodErr && dbProducts) {
      for (const item of items) {
        const live = dbProducts.find(p => String(p.id) === String(item.id));
        if (live && live.stock < item.qty) {
          throw new Error(`สินค้า "${item.name}" ในคลังเหลือเพียง ${live.stock} ชิ้น (ต้องการ ${item.qty} ชิ้น)`);
        }
      }
    }
  }

  // Deduct local stock
  deductStock(items);

  let cashier = null;
  let customer = null;

  if (currentUser.role === 'customer') {
    customer = {
      id: currentUser.id,
      name: currentUser.name,
      username: currentUser.username,
      email: currentUser.email || '',
    };
    cashier = {
      id: currentUser.id,
      name: `${currentUser.name} (ลูกค้าสั่งซื้อ)`,
      username: currentUser.username,
      role: 'customer',
    };
  } else {
    // Admin or Employee
    cashier = {
      id: currentUser.id,
      name: currentUser.name,
      username: currentUser.username,
      role: currentUser.role,
    };
    if (extra.customer) {
      customer = extra.customer;
    }
  }

  if (extra.cashier) cashier = extra.cashier;
  if (extra.customer) customer = extra.customer;

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const orderNo = `ORD-${dateStr}-${randomSuffix}`;

  const total = items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.qty) || 0), 0);
  const totalCost = items.reduce((s, i) => s + (Number(i.cost) || 0) * (Number(i.qty) || 0), 0);
  const profit = total - totalCost;

  const order = {
    id: Date.now().toString(),
    orderNo,
    cashier,
    customer,
    items: items.map(i => ({
      id: String(i.id),
      name: i.name,
      sku: i.sku || '',
      barcode: i.barcode || '',
      price: Number(i.price) || 0,
      cost: Number(i.cost) || 0,
      qty: Number(i.qty) || 0,
    })),
    total,
    totalCost,
    profit,
    paymentMethod,
    cashReceived: extra.cashReceived !== undefined ? Number(extra.cashReceived) : (paymentMethod === 'cash' ? total : null),
    change: extra.change !== undefined ? Number(extra.change) : 0,
    notes: extra.notes || '',
    createdAt: now.toISOString(),
  };

  // 2. Persist in Supabase Cloud DB
  if (supabase && isSupabaseConfigured()) {
    try {
      const dbPayload = {
        id: order.id,
        order_no: order.orderNo,
        total: order.total,
        total_cost: order.totalCost,
        profit: order.profit,
        payment_method: order.paymentMethod,
        cash_received: order.cashReceived,
        change: order.change,
        notes: order.notes,
        cashier: order.cashier,
        customer: order.customer,
        items: order.items,
        created_at: order.createdAt,
      };

      const { data: savedDbOrder, error: orderErr } = await supabase
        .from('orders')
        .insert([dbPayload])
        .select()
        .single();

      if (orderErr) {
        console.error('Supabase addOrderAsync insert error:', orderErr);
      } else {
        // Deduct stock in Supabase for each item
        for (const item of items) {
          try {
            const { data: currentP } = await supabase.from('products').select('stock').eq('id', String(item.id)).single();
            if (currentP) {
              const newStk = Math.max(0, (Number(currentP.stock) || 0) - Number(item.qty));
              await supabase.from('products').update({ stock: newStk }).eq('id', String(item.id));
            }
          } catch (stkErr) {
            console.warn('Stock update error in Supabase:', stkErr);
          }
        }
      }
    } catch (err) {
      console.error('Supabase addOrderAsync error:', err);
    }
  }

  // 3. Update local cache
  const orders = getOrders();
  saveOrders([order, ...orders]);
  return order;
}

export function addOrder(items, paymentMethod, extra = {}) {
  // Sync fallback
  const currentUser = getCurrentUser();
  if (!currentUser || !currentUser.id || !currentUser.role) {
    throw new Error('กรุณาเข้าสู่ระบบหรือสมัครสมาชิกก่อนทำรายการ');
  }

  if (!items || items.length === 0) {
    throw new Error('ไม่มีรายการสินค้าในตะกร้า');
  }

  deductStock(items);

  let cashier = null;
  let customer = null;

  if (currentUser.role === 'customer') {
    customer = {
      id: currentUser.id,
      name: currentUser.name,
      username: currentUser.username,
      email: currentUser.email || '',
    };
    cashier = {
      id: currentUser.id,
      name: `${currentUser.name} (ลูกค้าสั่งซื้อ)`,
      username: currentUser.username,
      role: 'customer',
    };
  } else {
    cashier = {
      id: currentUser.id,
      name: currentUser.name,
      username: currentUser.username,
      role: currentUser.role,
    };
    if (extra.customer) customer = extra.customer;
  }

  if (extra.cashier) cashier = extra.cashier;
  if (extra.customer) customer = extra.customer;

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const orderNo = `ORD-${dateStr}-${randomSuffix}`;

  const total = items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.qty) || 0), 0);
  const totalCost = items.reduce((s, i) => s + (Number(i.cost) || 0) * (Number(i.qty) || 0), 0);
  const profit = total - totalCost;

  const order = {
    id: Date.now().toString(),
    orderNo,
    cashier,
    customer,
    items: items.map(i => ({
      id: String(i.id),
      name: i.name,
      sku: i.sku || '',
      barcode: i.barcode || '',
      price: Number(i.price) || 0,
      cost: Number(i.cost) || 0,
      qty: Number(i.qty) || 0,
    })),
    total,
    totalCost,
    profit,
    paymentMethod,
    cashReceived: extra.cashReceived !== undefined ? Number(extra.cashReceived) : (paymentMethod === 'cash' ? total : null),
    change: extra.change !== undefined ? Number(extra.change) : 0,
    notes: extra.notes || '',
    createdAt: now.toISOString(),
  };

  const orders = getOrders();
  saveOrders([order, ...orders]);

  // Background async sync to Supabase
  if (supabase && isSupabaseConfigured()) {
    addOrderAsync(items, paymentMethod, extra).catch(console.error);
  }

  return order;
}

export async function deleteOrderAsync(id, shouldRestoreStock = true) {
  const orders = getOrders();
  const target = orders.find(o => o.id === id);

  if (shouldRestoreStock && target && Array.isArray(target.items)) {
    for (const item of target.items) {
      try {
        adjustStock(item.id, Number(item.qty) || 1, 'order_refund');
      } catch (err) {
        console.warn('Restore stock failed for item:', item.id, err);
      }
    }
  }

  if (supabase && isSupabaseConfigured()) {
    try {
      await supabase.from('orders').delete().eq('id', id);
    } catch (err) {
      console.warn('Supabase deleteOrderAsync error:', err);
    }
  }

  const updated = orders.filter(o => o.id !== id);
  saveOrders(updated);
  return updated;
}

export function deleteOrder(id, shouldRestoreStock = true) {
  const orders = getOrders();
  const target = orders.find(o => o.id === id);

  if (shouldRestoreStock && target && Array.isArray(target.items)) {
    for (const item of target.items) {
      try {
        adjustStock(item.id, Number(item.qty) || 1, 'order_refund');
      } catch (err) {
        console.warn('Restore stock failed for item:', item.id, err);
      }
    }
  }

  const updated = orders.filter(o => o.id !== id);
  saveOrders(updated);

  if (supabase && isSupabaseConfigured()) {
    deleteOrderAsync(id, false).catch(console.error);
  }

  return updated;
}

export function formatOrderNo(order) {
  if (order.orderNo) return order.orderNo;
  const d = new Date(order.createdAt || 0);
  const dateStr = d.toISOString().slice(0, 10).replace(/-/g, '');
  const shortId = (order.id || '0000').slice(-4);
  return `ORD-${dateStr}-${shortId}`;
}

export function exportOrdersCSV() {
  const orders = getOrders();
  if (orders.length === 0) throw new Error('ไม่มีข้อมูลการขายสำหรับส่งออก');

  const headers = ['Order No', 'Date', 'Time', 'Customer', 'Cashier', 'Role', 'Items Count', 'Payment Method', 'Total (THB)', 'Total Cost (THB)', 'Profit (THB)'];
  const rows = orders.map(o => {
    const d = new Date(o.createdAt || 0);
    const dateStr = d.toLocaleDateString('th-TH');
    const timeStr = d.toLocaleTimeString('th-TH');
    const itemsCount = (o.items || []).reduce((s, i) => s + (Number(i.qty) || 0), 0);
    return [
      `"${o.orderNo || formatOrderNo(o)}"`,
      `"${dateStr}"`,
      `"${timeStr}"`,
      `"${o.customer?.name || '-'}"`,
      `"${o.cashier?.name || '-'}"`,
      `"${o.cashier?.role || '-'}"`,
      itemsCount,
      `"${o.paymentMethod || 'cash'}"`,
      Number(o.total || 0).toFixed(2),
      Number(o.totalCost || 0).toFixed(2),
      Number(o.profit || 0).toFixed(2),
    ];
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', url);
  downloadAnchor.setAttribute('download', `horizonpos_sales_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  URL.revokeObjectURL(url);
}

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
// Users & Authentication Layer (Supabase + Local)
// ─────────────────────────────────────────────

export function getUsers() {
  const stored = readLS(USERS_KEY);
  if (stored && stored.length > 0) return stored;
  writeLS(USERS_KEY, DEFAULT_USERS);
  return DEFAULT_USERS;
}

export async function getUsersAsync() {
  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('users').select('*');
      if (!error && data) {
        if (data.length === 0) {
          const { data: seeded } = await supabase.from('users').insert(DEFAULT_USERS.map(u => ({
            id: u.id,
            name: u.name,
            username: u.username,
            email: u.email,
            pin: u.pin,
            password: u.password,
            password_hash: u.passwordHash,
            role: u.role,
            avatar_color: u.avatarColor,
          }))).select();
          if (seeded) {
            writeLS(USERS_KEY, seeded);
            return seeded;
          }
        }
        const normalized = data.map(u => ({
          ...u,
          passwordHash: u.password_hash || u.passwordHash,
          avatarColor: u.avatar_color || u.avatarColor,
        }));
        writeLS(USERS_KEY, normalized);
        return normalized;
      }
    } catch (err) {
      console.warn('Supabase getUsersAsync error:', err);
    }
  }
  return getUsers();
}

export function saveUsers(users) {
  writeLS(USERS_KEY, users);
  if (isClient()) {
    window.dispatchEvent(new CustomEvent('horizonpos_users_change'));
  }
}

export function getCurrentUser() {
  const session = readLS(CURRENT_USER_KEY);
  if (session && session.id && session.role) {
    return session;
  }
  return null;
}

export function setCurrentUser(user) {
  if (user) {
    const safeUser = {
      id: String(user.id),
      name: user.name,
      username: user.username,
      email: user.email || '',
      role: user.role || 'customer',
      avatarColor: user.avatarColor || user.avatar_color || '#3b82f6',
    };
    writeLS(CURRENT_USER_KEY, safeUser);
  } else {
    if (isClient()) {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  }
  if (isClient()) {
    window.dispatchEvent(new CustomEvent('horizonpos_auth_change', { detail: user }));
  }
}

export function logout() {
  setCurrentUser(null);
}

export async function registerUserAsync({ name, username, email, password, confirmPassword }) {
  const cleanName = (name || '').trim();
  const cleanUsername = (username || '').trim().toLowerCase();
  const cleanEmail = (email || '').trim().toLowerCase();

  if (!cleanName) throw new Error('กรุณากรอกชื่อ-นามสกุล');
  if (!cleanUsername) throw new Error('กรุณากรอก Username');
  if (!isValidUsername(cleanUsername)) throw new Error('Username ต้องมีอย่างน้อย 3 ตัวอักษร (a-z, 0-9, _, -)');
  if (!cleanEmail) throw new Error('กรุณากรอก Email');
  if (!isValidEmail(cleanEmail)) throw new Error('รูปแบบ Email ไม่ถูกต้อง');
  if (!password || password.length < 6) throw new Error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
  if (password !== confirmPassword) throw new Error('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน');

  const passwordHash = hashPasswordSync(password);
  const newUser = {
    id: 'u-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: cleanName,
    username: cleanUsername,
    email: cleanEmail,
    pin: null,
    password_hash: passwordHash,
    role: 'customer',
    avatar_color: '#06b6d4',
  };

  if (supabase && isSupabaseConfigured()) {
    // Check duplicate in Supabase
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, username, email')
      .or(`username.eq.${cleanUsername},email.eq.${cleanEmail}`);

    if (existingUser && existingUser.length > 0) {
      if (existingUser.some(u => u.username === cleanUsername)) {
        throw new Error(`Username "${cleanUsername}" มีผู้ใช้งานในระบบแล้ว`);
      }
      if (existingUser.some(u => u.email === cleanEmail)) {
        throw new Error(`Email "${cleanEmail}" มีผู้ใช้งานในระบบแล้ว`);
      }
    }

    const { data: inserted, error: insertErr } = await supabase
      .from('users')
      .insert([newUser])
      .select()
      .single();

    if (insertErr) throw new Error(insertErr.message || 'ไม่สามารถสมัครสมาชิกได้');

    const normalized = {
      ...inserted,
      avatarColor: inserted.avatar_color,
      passwordHash: inserted.password_hash,
    };

    const localUsers = getUsers();
    saveUsers([...localUsers, normalized]);
    setCurrentUser(normalized);
    return normalized;
  }

  // Local fallback
  const allUsers = getUsers();
  if (allUsers.some(u => u.username.toLowerCase() === cleanUsername)) {
    throw new Error(`Username "${cleanUsername}" มีผู้ใช้งานในระบบแล้ว`);
  }
  if (allUsers.some(u => u.email && u.email.toLowerCase() === cleanEmail)) {
    throw new Error(`Email "${cleanEmail}" มีผู้ใช้งานในระบบแล้ว`);
  }

  const localUserObj = {
    id: newUser.id,
    name: cleanName,
    username: cleanUsername,
    email: cleanEmail,
    pin: null,
    passwordHash,
    role: 'customer',
    avatarColor: '#06b6d4',
    createdAt: new Date().toISOString(),
  };

  saveUsers([...allUsers, localUserObj]);
  setCurrentUser(localUserObj);
  return localUserObj;
}

export function registerUser(payload) {
  const cleanName = (payload.name || '').trim();
  const cleanUsername = (payload.username || '').trim().toLowerCase();
  const cleanEmail = (payload.email || '').trim().toLowerCase();
  const { password, confirmPassword } = payload;

  if (!cleanName) throw new Error('กรุณากรอกชื่อ-นามสกุล');
  if (!cleanUsername) throw new Error('กรุณากรอก Username');
  if (!isValidUsername(cleanUsername)) throw new Error('Username ต้องมีอย่างน้อย 3 ตัวอักษร (a-z, 0-9, _, -)');
  if (!cleanEmail) throw new Error('กรุณากรอก Email');
  if (!isValidEmail(cleanEmail)) throw new Error('รูปแบบ Email ไม่ถูกต้อง');
  if (!password || password.length < 6) throw new Error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
  if (password !== confirmPassword) throw new Error('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน');

  const allUsers = getUsers();
  if (allUsers.some(u => u.username.toLowerCase() === cleanUsername)) {
    throw new Error(`Username "${cleanUsername}" มีผู้ใช้งานในระบบแล้ว`);
  }
  if (allUsers.some(u => u.email && u.email.toLowerCase() === cleanEmail)) {
    throw new Error(`Email "${cleanEmail}" มีผู้ใช้งานในระบบแล้ว`);
  }

  const passwordHash = hashPasswordSync(password);
  const newUser = {
    id: 'u-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: cleanName,
    username: cleanUsername,
    email: cleanEmail,
    pin: null,
    passwordHash,
    role: 'customer',
    avatarColor: '#06b6d4',
    createdAt: new Date().toISOString(),
  };

  saveUsers([...allUsers, newUser]);
  setCurrentUser(newUser);

  if (supabase && isSupabaseConfigured()) {
    registerUserAsync(payload).catch(console.error);
  }

  return newUser;
}

export async function loginWithPasswordAsync(identifier, password) {
  const cleanId = (identifier || '').trim().toLowerCase();
  if (!cleanId) throw new Error('กรุณากรอก Username หรือ Email');
  if (!password) throw new Error('กรุณากรอกรหัสผ่าน');

  const expectedHash = hashPasswordSync(password);

  if (supabase && isSupabaseConfigured()) {
    const { data: matched, error } = await supabase
      .from('users')
      .select('*')
      .or(`username.eq.${cleanId},email.eq.${cleanId}`)
      .limit(1);

    if (!error && matched && matched.length > 0) {
      const user = matched[0];
      const userHash = user.password_hash || user.passwordHash;
      const isMatch = (userHash && userHash === expectedHash) || (user.password && user.password === password);
      if (isMatch) {
        const normalized = {
          id: user.id,
          name: user.name,
          username: user.username,
          email: user.email || '',
          role: user.role || 'customer',
          avatarColor: user.avatar_color || '#3b82f6',
        };
        setCurrentUser(normalized);
        return normalized;
      }
    }
  }

  // Local fallback
  return loginWithPassword(identifier, password);
}

export function loginWithPassword(identifier, password) {
  const cleanId = (identifier || '').trim().toLowerCase();
  if (!cleanId) throw new Error('กรุณากรอก Username หรือ Email');
  if (!password) throw new Error('กรุณากรอกรหัสผ่าน');

  const allUsers = getUsers();
  const user = allUsers.find(
    u => u.username.toLowerCase() === cleanId || (u.email && u.email.toLowerCase() === cleanId)
  );

  if (!user) {
    throw new Error('ไม่พบบัญชีผู้ใช้งานนี้ในระบบ');
  }

  const expectedHash = hashPasswordSync(password);
  const isMatch = (user.passwordHash && user.passwordHash === expectedHash) || (user.password && user.password === password);

  if (!isMatch) {
    throw new Error('รหัสผ่านไม่ถูกต้อง');
  }

  setCurrentUser(user);
  return user;
}

export async function loginWithPinAsync(pin) {
  const cleanPin = (pin || '').trim();
  if (supabase && isSupabaseConfigured()) {
    const { data: matched } = await supabase.from('users').select('*').eq('pin', cleanPin).limit(1);
    if (matched && matched.length > 0) {
      const user = matched[0];
      const normalized = {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email || '',
        role: user.role || 'employee',
        avatarColor: user.avatar_color || '#3b82f6',
      };
      setCurrentUser(normalized);
      return normalized;
    }
  }
  return loginWithPin(pin);
}

export function loginWithPin(pin) {
  const cleanPin = (pin || '').trim();
  const allUsers = getUsers();
  const user = allUsers.find(u => u.pin && u.pin.trim() === cleanPin);
  if (!user) {
    throw new Error('PIN ไม่ถูกต้อง');
  }
  setCurrentUser(user);
  return user;
}

export function switchUserById(id) {
  const allUsers = getUsers();
  const user = allUsers.find(u => u.id === id);
  if (!user) return false;
  setCurrentUser(user);
  return true;
}

export function canManageStaff(user = getCurrentUser()) {
  return user?.role === 'admin';
}

export function addUser(user) {
  const users = getUsers();
  const newUser = {
    ...user,
    id: 'u-' + Date.now().toString(36),
    createdAt: new Date().toISOString(),
  };
  saveUsers([...users, newUser]);
  if (supabase && isSupabaseConfigured()) {
    supabase.from('users').insert([{
      id: newUser.id,
      name: newUser.name,
      username: newUser.username,
      email: newUser.email,
      pin: newUser.pin,
      password: newUser.password,
      password_hash: newUser.passwordHash || hashPasswordSync(newUser.password || '1234'),
      role: newUser.role || 'employee',
      avatar_color: newUser.avatarColor || '#3b82f6',
    }]).then();
  }
  return newUser;
}

export function updateUser(id, updates) {
  const users = getUsers().map(u => u.id === id ? { ...u, ...updates } : u);
  saveUsers(users);
  if (supabase && isSupabaseConfigured()) {
    supabase.from('users').update({
      name: updates.name,
      username: updates.username,
      email: updates.email,
      role: updates.role,
      avatar_color: updates.avatarColor,
    }).eq('id', id).then();
  }
  return users;
}

export function deleteUser(id) {
  const users = getUsers().filter(u => u.id !== id);
  saveUsers(users);
  if (supabase && isSupabaseConfigured()) {
    supabase.from('users').delete().eq('id', id).then();
  }
  return users;
}

export function resetUserPin(id, newPin) {
  const users = getUsers().map(u => u.id === id ? { ...u, pin: newPin } : u);
  saveUsers(users);
  if (supabase && isSupabaseConfigured()) {
    supabase.from('users').update({ pin: newPin }).eq('id', id).then();
  }
  return users;
}

// ─────────────────────────────────────────────
// Dashboard Statistics (computed from Orders)
// ─────────────────────────────────────────────

function computeDashboardStats(orders) {
  const totalRevenue = orders.reduce((s, o) => s + (Number(o.total) || 0), 0);
  const totalCost = orders.reduce((s, o) => s + (Number(o.totalCost || o.total_cost) || 0), 0);
  const totalProfit = orders.reduce((s, o) => s + (Number(o.profit) || 0), 0);
  const totalOrders = orders.length;

  // Top 5 selling products
  const productQtyMap = {};
  for (const order of orders) {
    for (const item of (order.items || [])) {
      if (!productQtyMap[item.name]) productQtyMap[item.name] = 0;
      productQtyMap[item.name] += Number(item.qty) || 0;
    }
  }
  const topProducts = Object.entries(productQtyMap)
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  // Daily sales — last 7 days
  const dailySalesMap = {};
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
    dailySalesMap[key] = { label: key, revenue: 0, profit: 0 };
  }
  for (const order of orders) {
    const d = new Date(order.createdAt || order.created_at);
    if (isNaN(d.getTime())) continue;
    const key = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
    if (dailySalesMap[key]) {
      dailySalesMap[key].revenue += Number(order.total) || 0;
      dailySalesMap[key].profit += Number(order.profit) || 0;
    }
  }
  const dailySales = Object.values(dailySalesMap);

  // Monthly sales — last 6 months
  const monthlySalesMap = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' });
    monthlySalesMap[key] = { label: key, revenue: 0, profit: 0 };
  }
  for (const order of orders) {
    const d = new Date(order.createdAt || order.created_at);
    if (isNaN(d.getTime())) continue;
    const key = d.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' });
    if (monthlySalesMap[key]) {
      monthlySalesMap[key].revenue += Number(order.total) || 0;
      monthlySalesMap[key].profit += Number(order.profit) || 0;
    }
  }
  const monthlySales = Object.values(monthlySalesMap);

  return { totalRevenue, totalCost, totalProfit, totalOrders, topProducts, dailySales, monthlySales };
}

export function getDashboardStats() {
  const orders = getOrders();
  return computeDashboardStats(orders);
}

export async function getDashboardStatsAsync() {
  const orders = await getOrdersAsync();
  return computeDashboardStats(orders || []);
}

// ─────────────────────────────────────────────
// Reset Products to Default (Inventory)
// ─────────────────────────────────────────────

export async function resetToDefaultProducts() {
  const initial = migrateProducts(mockProducts);
  writeLS(PRODUCTS_KEY, initial);

  if (supabase && isSupabaseConfigured()) {
    try {
      await supabase.from('products').delete().neq('id', 'x');
      await supabase.from('products').insert(initial.map(p => ({
        id: String(p.id),
        name: p.name,
        category: p.category,
        sku: p.sku,
        barcode: p.barcode,
        price: Number(p.price) || 0,
        cost: Number(p.cost) || 0,
        image_url: p.image_url || '',
        stock: Number(p.stock) || 0,
      })));
    } catch (err) {
      console.warn('resetToDefaultProducts Supabase error:', err);
    }
  }

  if (isClient()) {
    window.dispatchEvent(new CustomEvent('horizonpos_products_change'));
  }
  return initial;
}

