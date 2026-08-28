'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getProducts, addOrder } from '../lib/store';

// ── QR Placeholder (SVG pattern) ──────────────────────────────────────────────
function QRCodePlaceholder({ amount }) {
  // Simple deterministic pattern based on amount
  const pattern = [
    1,1,1,1,1,1,1,0,1,0,
    1,0,0,0,0,0,1,0,0,1,
    1,0,1,1,1,0,1,0,1,0,
    1,0,1,1,1,0,1,1,0,1,
    1,0,1,1,1,0,1,0,1,0,
    1,0,0,0,0,0,1,1,0,0,
    1,1,1,1,1,1,1,0,1,0,
    0,0,0,0,0,0,0,0,1,1,
    1,0,1,1,0,1,0,1,0,1,
    0,1,0,0,1,0,1,1,0,1,
  ];
  return (
    <div className="qr-placeholder">
      <div className="qr-grid">
        {pattern.map((cell, i) => (
          <div
            key={i}
            className="qr-cell"
            style={{ background: cell ? '#0f172a' : 'transparent', width: 14, height: 14 }}
          />
        ))}
      </div>
      <p>สแกนเพื่อชำระ ฿{amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</p>
    </div>
  );
}

// ── Toast ──────────────────────────────────────────────────────────────────────
function Toast({ message, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
  return <div className={`toast ${type}`}><span>{icon}</span>{message}</div>;
}

// ── Payment Modal ──────────────────────────────────────────────────────────────
function PaymentModal({ cart, total, onClose, onSuccess }) {
  const [method, setMethod] = useState(null);
  const [cashInput, setCashInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const cashAmount = parseFloat(cashInput) || 0;
  const change = cashAmount - total;
  const cashSufficient = cashAmount >= total;

  const canConfirm =
    method === 'qr' || (method === 'cash' && cashSufficient);

  const handleConfirm = async () => {
    if (!method) { setError('กรุณาเลือกวิธีชำระเงิน'); return; }
    setLoading(true);
    setError('');
    try {
      addOrder(cart, method);
      onSuccess(method, change > 0 ? change : 0);
    } catch (err) {
      setError(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="payment-modal-title">
        <div className="modal-header">
          <h3 id="payment-modal-title">ชำระเงิน</h3>
          <button className="modal-close" onClick={onClose} aria-label="ปิด">✕</button>
        </div>

        {/* Order Summary */}
        <div className="payment-summary">
          <div className="payment-items">
            {cart.map(item => (
              <div key={item.id} className="payment-item-row">
                <span>{item.name} × {item.qty}</span>
                <span>฿{(item.price * item.qty).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
          </div>
          <hr className="payment-divider" />
          <div className="payment-total-row">
            <span>ยอดรวม</span>
            <span>฿{total.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Payment Method */}
        <div className="payment-methods">
          <button
            id="pay-cash-btn"
            className={`payment-method-btn ${method === 'cash' ? 'selected' : ''}`}
            onClick={() => setMethod('cash')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="6" width="20" height="12" rx="2"/>
              <circle cx="12" cy="12" r="2"/>
              <path d="M6 12h.01M18 12h.01"/>
            </svg>
            เงินสด
          </button>
          <button
            id="pay-qr-btn"
            className={`payment-method-btn ${method === 'qr' ? 'selected' : ''}`}
            onClick={() => setMethod('qr')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="5" height="5" rx="1"/>
              <rect x="16" y="3" width="5" height="5" rx="1"/>
              <rect x="3" y="16" width="5" height="5" rx="1"/>
              <path d="M21 16h-3a2 2 0 0 0-2 2v3M16 21v.01M21 21v.01M14 14h.01M21 11h.01"/>
            </svg>
            QR Code
          </button>
        </div>

        {/* Cash section */}
        {method === 'cash' && (
          <div className="cash-input-section">
            <label htmlFor="cash-received">รับเงินมา (บาท)</label>
            <input
              id="cash-received"
              className="cash-input"
              type="number"
              min="0"
              step="0.01"
              placeholder={`อย่างน้อย ${total.toFixed(2)}`}
              value={cashInput}
              onChange={e => setCashInput(e.target.value)}
              autoFocus
            />
            {cashInput && (
              <div className={`change-display ${!cashSufficient ? 'change-insufficient' : ''}`}>
                <span className="change-label">
                  {cashSufficient ? 'เงินทอน' : 'เงินไม่พอ ขาด'}
                </span>
                <span className="change-value">
                  ฿{Math.abs(change).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>
        )}

        {/* QR section */}
        {method === 'qr' && <QRCodePlaceholder amount={total} />}

        {error && (
          <p style={{ color: 'var(--danger-color)', fontSize: 13, marginBottom: 12 }}>⚠ {error}</p>
        )}

        <button
          id="confirm-payment-btn"
          className="confirm-payment-btn"
          onClick={handleConfirm}
          disabled={!canConfirm || loading}
        >
          {loading ? 'กำลังบันทึก...' : '✓ ยืนยันชำระเงิน'}
        </button>
      </div>
    </div>
  );
}

// ── Main POS Page ──────────────────────────────────────────────────────────────
export default function POS() {
  const [products, setProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [showPayment, setShowPayment] = useState(false);
  const [toast, setToast] = useState(null);

  // Load products from localStorage (seeded from products.json if first time)
  useEffect(() => {
    setProducts(getProducts());
  }, []);

  const categories = ['All', ...new Set(products.map(p => p.category))];

  const filteredProducts = products.filter(p => {
    const matchCat = activeCategory === 'All' || p.category === activeCategory;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, key: Date.now() });
  }, []);

  const addToCart = (product) => {
    if (product.stock <= 0) {
      showToast(`"${product.name}" หมด Stock แล้ว`, 'error');
      return;
    }
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) {
          showToast(`"${product.name}" มี Stock เหลือแค่ ${product.stock} ชิ้น`, 'error');
          return prev;
        }
        return prev.map(item =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateQty = (id, delta) => {
    const product = products.find(p => p.id === id);
    setCart(prev =>
      prev
        .map(item => {
          if (item.id !== id) return item;
          const newQty = item.qty + delta;
          if (newQty <= 0) return null;
          if (product && newQty > product.stock) {
            showToast(`Stock เหลือแค่ ${product.stock} ชิ้น`, 'error');
            return item;
          }
          return { ...item, qty: newQty };
        })
        .filter(Boolean)
    );
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const handlePaymentSuccess = useCallback((method, change) => {
    setShowPayment(false);
    setCart([]);
    // Reload products to reflect deducted stock
    setProducts(getProducts());
    const msg = method === 'cash'
      ? `ชำระเสร็จสิ้น! เงินทอน ฿${change.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
      : 'ชำระด้วย QR เสร็จสิ้น!';
    showToast(msg, 'success');
  }, [showToast]);

  const getStockStatus = (stock) => {
    if (stock <= 0) return 'out';
    if (stock <= 5) return 'low';
    return 'ok';
  };
  const stockLabel = { ok: 'พร้อมขาย', low: 'ใกล้หมด', out: 'หมด' };

  return (
    <>
      <div className="pos-container">
        {/* ── Sidebar ── */}
        <div className="sidebar">
          <div className="sidebar-title">หมวดหมู่</div>
          {categories.map(cat => {
            const count = cat === 'All'
              ? products.length
              : products.filter(p => p.category === cat).length;
            return (
              <button
                key={cat}
                id={`cat-${cat.replace(/\s+/g, '-').toLowerCase()}`}
                className={`category-btn ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
                <span className="cat-count">{count}</span>
              </button>
            );
          })}
        </div>

        {/* ── Main Content ── */}
        <div className="main-content">
          <div className="pos-header">
            <h2>สินค้า</h2>
            <div className="search-wrapper">
              <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                id="product-search"
                type="text"
                className="search-input"
                placeholder="ค้นหาสินค้า..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="product-grid">
            {filteredProducts.map(product => {
              const status = getStockStatus(product.stock);
              return (
                <div
                  key={product.id}
                  id={`product-${product.id}`}
                  className={`product-card ${status === 'out' ? 'out-of-stock' : ''}`}
                  onClick={() => addToCart(product)}
                >
                  <span className={`stock-badge ${status}`}>{stockLabel[status]}</span>
                  <img src={product.image_url} alt={product.name} className="product-image" />
                  <div className="product-info">
                    <div className="product-title">{product.name}</div>
                    <div className="product-price">
                      ฿{product.price.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="product-stock-label">Stock: {product.stock} ชิ้น</div>
                  </div>
                </div>
              );
            })}
            {filteredProducts.length === 0 && (
              <p style={{ color: 'var(--text-muted)', gridColumn: '1/-1' }}>
                {searchQuery ? `ไม่พบสินค้า "${searchQuery}"` : 'ไม่มีสินค้าในหมวดนี้'}
              </p>
            )}
          </div>
        </div>

        {/* ── Cart Panel ── */}
        <div className="cart-panel">
          <div className="cart-header">
            <h3>รายการสั่ง</h3>
            {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
          </div>

          <div className="cart-items">
            {cart.length === 0 ? (
              <div className="cart-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                </svg>
                <p>ยังไม่มีสินค้าในตะกร้า</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.id} className="cart-item" id={`cart-item-${item.id}`}>
                  <div className="cart-item-info">
                    <div className="cart-item-title">{item.name}</div>
                    <div className="cart-item-price">
                      ฿{(item.price * item.qty).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="cart-item-controls">
                    <button className="qty-btn" onClick={() => updateQty(item.id, -1)} aria-label="ลด">−</button>
                    <span className="qty-display">{item.qty}</span>
                    <button className="qty-btn" onClick={() => updateQty(item.id, 1)} aria-label="เพิ่ม">+</button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="cart-footer">
            <div className="cart-total">
              <span className="cart-total-label">ยอดรวม</span>
              <span>฿{total.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
            </div>
            <button
              id="checkout-btn"
              className="checkout-btn"
              disabled={cart.length === 0}
              onClick={() => setShowPayment(true)}
            >
              ชำระเงิน
            </button>
          </div>
        </div>
      </div>

      {/* ── Payment Modal ── */}
      {showPayment && (
        <PaymentModal
          cart={cart}
          total={total}
          onClose={() => setShowPayment(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* ── Toast ── */}
      {toast && (
        <Toast
          key={toast.key}
          message={toast.message}
          type={toast.type}
          onDone={() => setToast(null)}
        />
      )}
    </>
  );
}
