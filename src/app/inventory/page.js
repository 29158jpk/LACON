'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
} from '../../lib/store';

// ── Toast ──────────────────────────────────────────────────────────────────────
function Toast({ message, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
  return <div className={`toast ${type}`}><span>{icon}</span>{message}</div>;
}

// ── Product Form Modal ─────────────────────────────────────────────────────────
function ProductModal({ product, onClose, onSave, categories }) {
  const isEdit = Boolean(product?.id);
  const [form, setForm] = useState({
    name: product?.name || '',
    category: product?.category || (categories[0] || ''),
    price: product?.price ?? '',
    cost: product?.cost ?? '',
    stock: product?.stock ?? '',
    image_url: product?.image_url || '',
  });
  const [newCat, setNewCat] = useState('');
  const [useNewCat, setUseNewCat] = useState(false);
  const [error, setError] = useState('');

  const set = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('กรุณากรอกชื่อสินค้า'); return; }
    if (!form.price || Number(form.price) < 0) { setError('กรุณากรอกราคาขายให้ถูกต้อง'); return; }
    if (form.cost !== '' && Number(form.cost) < 0) { setError('ราคาทุนต้องไม่ติดลบ'); return; }
    if (form.stock !== '' && Number(form.stock) < 0) { setError('จำนวน Stock ต้องไม่ติดลบ'); return; }

    const finalCat = useNewCat ? newCat.trim() || form.category : form.category;
    onSave({
      ...form,
      category: finalCat,
      price: Number(form.price),
      cost: Number(form.cost) || 0,
      stock: Number(form.stock) || 0,
    });
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="product-modal-title">
        <div className="modal-header">
          <h3 id="product-modal-title">{isEdit ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}</h3>
          <button className="modal-close" onClick={onClose} aria-label="ปิด">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group form-full">
              <label className="form-label" htmlFor="prod-name">ชื่อสินค้า *</label>
              <input
                id="prod-name"
                className="form-input"
                type="text"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="เช่น ASUS ROG Monitor"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="prod-category">หมวดหมู่</label>
              {!useNewCat ? (
                <select
                  id="prod-category"
                  className="form-select"
                  value={form.category}
                  onChange={e => set('category', e.target.value)}
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  <option value="__new__" onClick={() => setUseNewCat(true)}>+ เพิ่มหมวดใหม่</option>
                </select>
              ) : (
                <input
                  className="form-input"
                  type="text"
                  value={newCat}
                  onChange={e => setNewCat(e.target.value)}
                  placeholder="ชื่อหมวดหมู่ใหม่"
                />
              )}
              {!useNewCat && (
                <button type="button" onClick={() => setUseNewCat(true)} style={{ color: 'var(--primary-accent)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, textAlign: 'left', marginTop: 4 }}>
                  + เพิ่มหมวดหมู่ใหม่
                </button>
              )}
              {useNewCat && (
                <button type="button" onClick={() => setUseNewCat(false)} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, textAlign: 'left', marginTop: 4 }}>
                  ← เลือกจากรายการ
                </button>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="prod-stock">จำนวน Stock</label>
              <input
                id="prod-stock"
                className="form-input"
                type="number"
                min="0"
                value={form.stock}
                onChange={e => set('stock', e.target.value)}
                placeholder="0"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="prod-price">ราคาขาย (฿) *</label>
              <input
                id="prod-price"
                className="form-input"
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={e => set('price', e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="prod-cost">ราคาทุน (฿)</label>
              <input
                id="prod-cost"
                className="form-input"
                type="number"
                min="0"
                step="0.01"
                value={form.cost}
                onChange={e => set('cost', e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="form-group form-full">
              <label className="form-label" htmlFor="prod-image">URL รูปภาพ</label>
              <input
                id="prod-image"
                className="form-input"
                type="text"
                value={form.image_url}
                onChange={e => set('image_url', e.target.value)}
                placeholder="https://... หรือ /images/..."
              />
            </div>

            {form.image_url && (
              <div className="form-group form-full">
                <img
                  src={form.image_url}
                  alt="preview"
                  style={{ height: 80, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border-color)' }}
                  onError={e => e.target.style.display = 'none'}
                />
              </div>
            )}
          </div>

          {error && <p style={{ color: 'var(--danger-color)', fontSize: 13, marginTop: 12 }}>⚠ {error}</p>}

          <div className="form-actions">
            <button type="submit" className="btn-primary" id="save-product-btn">
              {isEdit ? '💾 บันทึกการแก้ไข' : '+ เพิ่มสินค้า'}
            </button>
            <button type="button" className="btn-secondary" onClick={onClose}>ยกเลิก</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Confirm Delete Modal ───────────────────────────────────────────────────────
function ConfirmDeleteModal({ product, onClose, onConfirm }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 400 }} role="dialog" aria-modal="true">
        <div className="modal-header">
          <h3>ยืนยันการลบ</h3>
          <button className="modal-close" onClick={onClose} aria-label="ปิด">✕</button>
        </div>
        <div className="confirm-dialog">
          <p>คุณต้องการลบ <strong style={{ color: 'var(--text-main)' }}>"{product.name}"</strong> ออกจากระบบหรือไม่? <br/>การกระทำนี้ไม่สามารถย้อนกลับได้</p>
          <div className="confirm-actions">
            <button id="confirm-delete-btn" className="btn-danger" onClick={onConfirm}>ลบสินค้า</button>
            <button className="btn-secondary" onClick={onClose}>ยกเลิก</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Inventory Page ────────────────────────────────────────────────────────
export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // null | {type: 'add'|'edit'|'delete', product?}
  const [toast, setToast] = useState(null);

  useEffect(() => {
    setProducts(getProducts());
  }, []);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, key: Date.now() });
  }, []);

  const reload = () => setProducts(getProducts());

  const categories = [...new Set(products.map(p => p.category))];

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  // ── CRUD handlers ──────────────────────────────────────────────────────────
  const handleSave = (formData) => {
    if (modal?.type === 'edit' && modal.product) {
      updateProduct(modal.product.id, formData);
      showToast('แก้ไขสินค้าเรียบร้อย');
    } else {
      addProduct(formData);
      showToast('เพิ่มสินค้าใหม่เรียบร้อย');
    }
    reload();
    setModal(null);
  };

  const handleDelete = () => {
    if (modal?.product) {
      deleteProduct(modal.product.id);
      showToast(`ลบ "${modal.product.name}" เรียบร้อย`, 'info');
      reload();
      setModal(null);
    }
  };

  const handleStockAdjust = (id, delta) => {
    const product = products.find(p => p.id === id);
    if (!product) return;
    const newStock = product.stock + delta;
    if (newStock < 0) {
      showToast('Stock ไม่สามารถติดลบได้', 'error');
      return;
    }
    updateProduct(id, { stock: newStock });
    reload();
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalProducts = products.length;
  const lowStockCount = products.filter(p => p.stock > 0 && p.stock <= 5).length;
  const outOfStockCount = products.filter(p => p.stock <= 0).length;
  const totalStockValue = products.reduce((s, p) => s + p.cost * p.stock, 0);

  const getStockStatus = (stock) => {
    if (stock <= 0) return 'out';
    if (stock <= 5) return 'low';
    return null;
  };

  return (
    <>
      <div className="inventory-page">
        <div className="page-header">
          <h1>Inventory</h1>
          <p>จัดการสินค้า, ราคา และ Stock</p>
        </div>

        {/* ── Toolbar ── */}
        <div className="inventory-toolbar">
          <div className="search-wrapper">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              id="inventory-search"
              type="text"
              className="search-input"
              placeholder="ค้นหาสินค้า หรือหมวดหมู่..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button id="add-product-btn" className="btn-add" onClick={() => setModal({ type: 'add' })}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            เพิ่มสินค้า
          </button>
        </div>

        {/* ── Summary Stats ── */}
        <div className="inventory-stats-bar">
          <div className="inv-stat">
            <div className="inv-stat-dot" style={{ background: 'var(--primary-accent)' }} />
            <span className="inv-stat-label">สินค้าทั้งหมด</span>
            <span className="inv-stat-value">{totalProducts} รายการ</span>
          </div>
          <div className="inv-stat">
            <div className="inv-stat-dot" style={{ background: 'var(--warning-color)' }} />
            <span className="inv-stat-label">ใกล้หมด (≤5)</span>
            <span className="inv-stat-value" style={{ color: lowStockCount > 0 ? 'var(--warning-color)' : undefined }}>
              {lowStockCount} รายการ
            </span>
          </div>
          <div className="inv-stat">
            <div className="inv-stat-dot" style={{ background: 'var(--danger-color)' }} />
            <span className="inv-stat-label">หมด Stock</span>
            <span className="inv-stat-value" style={{ color: outOfStockCount > 0 ? 'var(--danger-color)' : undefined }}>
              {outOfStockCount} รายการ
            </span>
          </div>
          <div className="inv-stat">
            <div className="inv-stat-dot" style={{ background: 'var(--success-color)' }} />
            <span className="inv-stat-label">มูลค่าสต็อก (ทุน)</span>
            <span className="inv-stat-value">
              ฿{totalStockValue.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="inventory-table-wrapper">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>สินค้า</th>
                <th>หมวดหมู่</th>
                <th>ราคาขาย</th>
                <th>ราคาทุน</th>
                <th>กำไร/ชิ้น</th>
                <th>Stock</th>
                <th>ปรับ Stock</th>
                <th>การจัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty-table">
                    {search ? `ไม่พบสินค้า "${search}"` : 'ยังไม่มีสินค้า'}
                  </td>
                </tr>
              ) : (
                filtered.map(product => {
                  const status = getStockStatus(product.stock);
                  const profitPerUnit = product.price - (product.cost || 0);
                  return (
                    <tr key={product.id} id={`inv-row-${product.id}`}>
                      <td>
                        <div className="product-name-cell">
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="product-thumb"
                            onError={e => { e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="38" height="38"><rect width="38" height="38" fill="%231e293b"/></svg>'; }}
                          />
                          <span className="product-name-text">{product.name}</span>
                        </div>
                      </td>
                      <td>
                        <span className="product-category-tag">{product.category}</span>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--primary-accent)' }}>
                        ฿{product.price.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>
                        ฿{(product.cost || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ color: profitPerUnit >= 0 ? 'var(--success-color)' : 'var(--danger-color)', fontWeight: 600 }}>
                        ฿{profitPerUnit.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                      <td>
                        <div className="stock-cell">
                          <span className="stock-num">{product.stock}</span>
                          {status && (
                            <span className={`stock-badge-inline ${status}`}>
                              {status === 'out' ? 'หมด' : 'ใกล้หมด'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="stock-adjust-btns">
                          <button
                            className="stock-adj-btn"
                            id={`stock-dec-${product.id}`}
                            onClick={() => handleStockAdjust(product.id, -1)}
                            aria-label="ลด stock"
                          >−</button>
                          <span style={{ minWidth: 28, textAlign: 'center', fontSize: 13, fontWeight: 600 }}>{product.stock}</span>
                          <button
                            className="stock-adj-btn"
                            id={`stock-inc-${product.id}`}
                            onClick={() => handleStockAdjust(product.id, 1)}
                            aria-label="เพิ่ม stock"
                          >+</button>
                        </div>
                      </td>
                      <td>
                        <div className="action-btns">
                          <button
                            className="btn-edit"
                            id={`edit-${product.id}`}
                            onClick={() => setModal({ type: 'edit', product })}
                          >แก้ไข</button>
                          <button
                            className="btn-delete"
                            id={`delete-${product.id}`}
                            onClick={() => setModal({ type: 'delete', product })}
                          >ลบ</button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modals ── */}
      {(modal?.type === 'add' || modal?.type === 'edit') && (
        <ProductModal
          product={modal.product}
          categories={categories}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
      {modal?.type === 'delete' && (
        <ConfirmDeleteModal
          product={modal.product}
          onClose={() => setModal(null)}
          onConfirm={handleDelete}
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
