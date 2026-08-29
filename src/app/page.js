'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { getProducts, addOrder, findProductByBarcodeOrSku, getCurrentUser } from '../lib/store';
import { playScanSound } from '../lib/barcode';
import ProductImage from './components/ProductImage';
import CameraScannerModal from './components/CameraScannerModal';
import OrderReceiptModal from './components/OrderReceiptModal';

// ── PromptPay QR Component ───────────────────────────────────────────────────
function PromptPayQRCode({ amount }) {
  return (
    <div className="promptpay-qr-box">
      <div className="promptpay-badge">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="5" height="5" rx="1"/>
          <rect x="16" y="3" width="5" height="5" rx="1"/>
          <rect x="3" y="16" width="5" height="5" rx="1"/>
          <path d="M21 16h-3a2 2 0 0 0-2 2v3M16 21v.01M21 21v.01M14 14h.01M21 11h.01"/>
        </svg>
        <span>Thai QR Payment / พร้อมเพย์</span>
      </div>

      <div className="promptpay-qr-img-wrapper">
        <img
          src="/promptpay-qr.png"
          alt="PromptPay QR Code"
          className="promptpay-qr-img"
        />
      </div>

      <div className="promptpay-account-info">
        <div className="account-row account-name">
          <span className="account-label">ชื่อ:</span>
          <strong className="account-val">นายบุณยวีร์ แซ่ตัง</strong>
        </div>
        <div className="account-row account-no">
          <span className="account-label">เลขบัญชี:</span>
          <strong className="account-val font-mono">207-8-22728-4</strong>
        </div>
        <div className="promptpay-amount-pill">
          สแกนชำระเงิน: <strong>฿{amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</strong>
        </div>
      </div>
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
      const savedOrder = addOrder(cart, method, {
        cashReceived: method === 'cash' ? cashAmount : total,
        change: method === 'cash' && change > 0 ? change : 0,
      });
      onSuccess(method, change > 0 ? change : 0, savedOrder);
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
        {method === 'qr' && <PromptPayQRCode amount={total} />}

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
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [viewReceiptModal, setViewReceiptModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const searchInputRef = useRef(null);

  // Load products and current user from localStorage
  useEffect(() => {
    setProducts(getProducts());
    setCurrentUser(getCurrentUser());
    const handleAuth = () => {
      setCurrentUser(getCurrentUser());
      setProducts(getProducts());
    };
    window.addEventListener('horizonpos_auth_change', handleAuth);
    return () => window.removeEventListener('horizonpos_auth_change', handleAuth);
  }, []);

  const categories = ['All', ...new Set(products.map(p => p.category))];

  const filteredProducts = products.filter(p => {
    const s = searchQuery.toLowerCase().trim();
    const matchCat = activeCategory === 'All' || p.category === activeCategory;
    const matchSearch =
      !s ||
      p.name.toLowerCase().includes(s) ||
      (p.sku && p.sku.toLowerCase().includes(s)) ||
      (p.barcode && p.barcode.toLowerCase().includes(s));
    return matchCat && matchSearch;
  });

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, key: Date.now() });
  }, []);

  const addToCart = useCallback((product) => {
    if (product.stock <= 0) {
      showToast(`"${product.name}" หมด Stock แล้ว`, 'error');
      return false;
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
    return true;
  }, [showToast]);

  // Handle Barcode Scanner / SKU Code input
  const handleBarcodeScan = useCallback((code) => {
    const cleanCode = code.trim();
    if (!cleanCode) return;

    const matchedProduct = findProductByBarcodeOrSku(cleanCode);
    if (matchedProduct) {
      playScanSound();
      const added = addToCart(matchedProduct);
      if (added) {
        showToast(`✓ สแกนสำเร็จ: ${matchedProduct.name}`, 'success');
      }
      setSearchQuery('');
    } else {
      showToast(`✕ ไม่พบสินค้าจากรหัส: "${cleanCode}"`, 'error');
    }
  }, [addToCart, showToast]);

  // Hardware Barcode Scanner Global Key Listener
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e) => {
      // Ignore if user is typing inside standard inputs or textarea (except search input)
      const target = e.target;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      
      const currentTime = Date.now();
      const diff = currentTime - lastKeyTime;
      lastKeyTime = currentTime;

      // Barcode scanners type very rapidly (< 50ms between keys)
      if (e.key === 'Enter') {
        if (buffer.length >= 3) {
          e.preventDefault();
          handleBarcodeScan(buffer);
          buffer = '';
        }
      } else if (e.key.length === 1) {
        // If rapid keystroke or not inside an input, buffer it
        if (diff > 100 && !isInput) {
          buffer = '';
        }
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleBarcodeScan]);

  // Search input keydown: trigger barcode scan on Enter
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      e.preventDefault();
      // Try exact barcode/SKU lookup first
      const matched = findProductByBarcodeOrSku(searchQuery);
      if (matched) {
        handleBarcodeScan(searchQuery);
      } else if (filteredProducts.length === 1) {
        // If exactly one search match, add to cart
        playScanSound();
        addToCart(filteredProducts[0]);
        showToast(`เพิ่ม "${filteredProducts[0].name}" ลงตะกร้าแล้ว`, 'success');
        setSearchQuery('');
      } else if (filteredProducts.length === 0) {
        showToast(`ไม่พบสินค้า "${searchQuery}"`, 'error');
      }
    }
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

  const removeFromCart = (id) => {
    const item = cart.find(i => i.id === id);
    setCart(prev => prev.filter(i => i.id !== id));
    if (item) {
      showToast(`ลบ "${item.name}" ออกจากตะกร้าแล้ว`, 'info');
    }
  };

  const clearCart = () => {
    if (cart.length === 0) return;
    setCart([]);
    showToast('ยกเลิกรายการสินค้าทั้งหมดในตะกร้าแล้ว', 'info');
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const handlePaymentSuccess = useCallback((method, change, savedOrder) => {
    setShowPayment(false);
    setCart([]);
    // Reload products to reflect deducted stock
    setProducts(getProducts());
    const msg = method === 'cash'
      ? `ชำระเสร็จสิ้น! เงินทอน ฿${change.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
      : 'ชำระด้วย QR เสร็จสิ้น!';
    showToast(msg, 'success');
    if (savedOrder) {
      setViewReceiptModal(savedOrder);
    }
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
            
            <div style={{ display: 'flex', gap: 10, flex: 1, maxWidth: 520, justifyContent: 'flex-end' }}>
              <div className="search-wrapper" style={{ maxWidth: 360 }}>
                <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input
                  ref={searchInputRef}
                  id="product-search"
                  type="text"
                  className="search-input"
                  placeholder="ค้นหาชื่อ, SKU หรือสแกน Barcode (Enter)..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                />
              </div>

              {/* Camera Scanner Button */}
              <button
                id="btn-open-camera-scanner"
                className="btn-camera-scan"
                title="สแกน Barcode ด้วยกล้อง"
                onClick={() => setShowCameraScanner(true)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
                <span>สแกนกล้อง</span>
              </button>
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
                  <ProductImage
                    src={product.image_url}
                    alt={product.name}
                    category={product.category}
                    className="product-image"
                  />
                  <div className="product-info">
                    <div className="product-card-sku-row">
                      <span className="card-sku-tag">{product.sku || `ID:${product.id}`}</span>
                      {product.barcode && <span className="card-barcode-text">#{product.barcode.slice(-4)}</span>}
                    </div>
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
              <p style={{ color: 'var(--text-muted)', gridColumn: '1/-1', padding: '40px 0', textAlign: 'center' }}>
                {searchQuery ? `ไม่พบสินค้า "${searchQuery}" (ลองค้นหาด้วยชื่อ, SKU หรือ Barcode)` : 'ไม่มีสินค้าในหมวดนี้'}
              </p>
            )}
          </div>
        </div>

        {/* ── Cart Panel ── */}
        <div className="cart-panel">
          <div className="cart-header">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3>รายการสั่ง</h3>
                {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-muted)' }}>
                <span>{currentUser?.role === 'admin' ? '👑' : '👤'}</span>
                <span>ผู้ขาย: <strong style={{ color: 'var(--text-main)' }}>{currentUser?.name || 'Admin'}</strong></span>
              </div>
            </div>
            {cart.length > 0 && (
              <button
                id="btn-clear-cart"
                className="btn-clear-cart"
                onClick={clearCart}
                title="ยกเลิกรายการสินค้าทั้งหมดในตะกร้า"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                <span>ยกเลิกทั้งหมด</span>
              </button>
            )}
          </div>

          <div className="cart-items">
            {cart.length === 0 ? (
              <div className="cart-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                </svg>
                <p>ยังไม่มีสินค้าในตะกร้า</p>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, display: 'block' }}>
                  คลิกที่สินค้า หรือสแกน Barcode เพื่อเพิ่มลงตะกร้า
                </span>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.id} className="cart-item" id={`cart-item-${item.id}`}>
                  <div className="cart-item-info">
                    <div className="cart-item-title">{item.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="cart-item-price">
                        ฿{(item.price * item.qty).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </span>
                      {item.sku && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({item.sku})</span>}
                    </div>
                  </div>
                  <div className="cart-item-controls">
                    <button className="qty-btn" onClick={() => updateQty(item.id, -1)} aria-label="ลด">−</button>
                    <span className="qty-display">{item.qty}</span>
                    <button className="qty-btn" onClick={() => updateQty(item.id, 1)} aria-label="เพิ่ม">+</button>
                    <button
                      className="qty-btn btn-cart-delete"
                      onClick={() => removeFromCart(item.id)}
                      title="ลบสินค้านี้ออกจากตะกร้า"
                      aria-label="ลบสินค้านี้"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                      </svg>
                    </button>
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

      {/* ── Camera Scanner Modal ── */}
      {showCameraScanner && (
        <CameraScannerModal
          onClose={() => setShowCameraScanner(false)}
          onScan={(code) => {
            handleBarcodeScan(code);
            setShowCameraScanner(false);
          }}
        />
      )}

      {/* ── Receipt Modal ── */}
      {viewReceiptModal && (
        <OrderReceiptModal
          order={viewReceiptModal}
          onClose={() => setViewReceiptModal(null)}
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
