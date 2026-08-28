'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
} from '../../lib/store';
import { generateSKU, generateBarcode } from '../../lib/barcode';
import { cleanImageUrl, compressImageFile, getCategoryPlaceholder } from '../../lib/imageHelper';
import ProductImage from '../components/ProductImage';
import BarcodeView from '../components/BarcodeView';
import BarcodePrintModal from '../components/BarcodePrintModal';

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
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    name: product?.name || '',
    category: product?.category || (categories[0] || 'Computer Parts'),
    sku: product?.sku || (product ? '' : generateSKU(categories[0] || '')),
    barcode: product?.barcode || (product ? '' : generateBarcode()),
    price: product?.price ?? '',
    cost: product?.cost ?? '',
    stock: product?.stock ?? '',
    image_url: product?.image_url || '',
  });

  const [newCat, setNewCat] = useState('');
  const [useNewCat, setUseNewCat] = useState(false);
  const [error, setError] = useState('');
  const [isGoogleDetected, setIsGoogleDetected] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const set = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  // Handle image URL input change & Google image search auto-extraction
  const handleImageUrlChange = (e) => {
    const val = e.target.value;
    const { cleanUrl, isGoogleExtracted } = cleanImageUrl(val);
    set('image_url', cleanUrl);
    setIsGoogleDetected(isGoogleExtracted);
  };

  // Handle local file upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setError('');
    try {
      const dataUrl = await compressImageFile(file, 800, 800, 0.85);
      set('image_url', dataUrl);
      setIsGoogleDetected(false);
    } catch (err) {
      setError(err.message || 'ไม่สามารถอัปโหลดไฟล์รูปภาพได้');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleGenerateSKU = () => {
    const finalCat = useNewCat ? newCat.trim() || form.category : form.category;
    set('sku', generateSKU(finalCat));
  };

  const handleGenerateBarcode = () => {
    set('barcode', generateBarcode());
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('กรุณากรอกชื่อสินค้า'); return; }
    if (!form.price || Number(form.price) < 0) { setError('กรุณากรอกราคาขายให้ถูกต้อง'); return; }
    if (form.cost !== '' && Number(form.cost) < 0) { setError('ราคาทุนต้องไม่ติดลบ'); return; }
    if (form.stock !== '' && Number(form.stock) < 0) { setError('จำนวน Stock ต้องไม่ติดลบ'); return; }

    const finalCat = useNewCat ? newCat.trim() || form.category : form.category;
    const finalSku = form.sku.trim() || generateSKU(finalCat);
    const finalBarcode = form.barcode.trim() || generateBarcode();

    onSave({
      ...form,
      category: finalCat,
      sku: finalSku,
      barcode: finalBarcode,
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
            {/* Name */}
            <div className="form-group form-full">
              <label className="form-label" htmlFor="prod-name">ชื่อสินค้า *</label>
              <input
                id="prod-name"
                className="form-input"
                type="text"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="เช่น ASUS ROG Strix GeForce RTX 4080 16GB"
                autoFocus
              />
            </div>

            {/* Category */}
            <div className="form-group form-full">
              <label className="form-label" htmlFor="prod-category">หมวดหมู่</label>
              {!useNewCat ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <select
                    id="prod-category"
                    className="form-select"
                    value={form.category}
                    onChange={e => set('category', e.target.value)}
                    style={{ flex: 1 }}
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: '0 14px', fontSize: 13, whiteSpace: 'nowrap' }}
                    onClick={() => setUseNewCat(true)}
                  >
                    + หมวดใหม่
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="form-input"
                    type="text"
                    value={newCat}
                    onChange={e => setNewCat(e.target.value)}
                    placeholder="ชื่อหมวดหมู่ใหม่"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: '0 14px', fontSize: 13, whiteSpace: 'nowrap' }}
                    onClick={() => setUseNewCat(false)}
                  >
                    เลือกจากรายการ
                  </button>
                </div>
              )}
            </div>

            {/* SKU */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" htmlFor="prod-sku">รหัสสินค้า (SKU)</label>
                <button
                  type="button"
                  onClick={handleGenerateSKU}
                  style={{ color: 'var(--primary-accent)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
                >
                  ✨ สุ่ม SKU
                </button>
              </div>
              <input
                id="prod-sku"
                className="form-input"
                type="text"
                value={form.sku}
                onChange={e => set('sku', e.target.value)}
                placeholder="เช่น GPU-MSI-4090"
              />
            </div>

            {/* Barcode */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" htmlFor="prod-barcode">รหัส Barcode</label>
                <button
                  type="button"
                  onClick={handleGenerateBarcode}
                  style={{ color: 'var(--primary-accent)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
                >
                  ✨ สุ่ม Barcode
                </button>
              </div>
              <input
                id="prod-barcode"
                className="form-input"
                type="text"
                value={form.barcode}
                onChange={e => set('barcode', e.target.value)}
                placeholder="เช่น 885100010001"
              />
            </div>

            {/* Price */}
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

            {/* Cost */}
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

            {/* Stock */}
            <div className="form-group form-full">
              <label className="form-label" htmlFor="prod-stock">จำนวนคงเหลือใน Stock</label>
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

            {/* Image URL & File Upload */}
            <div className="form-group form-full">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" htmlFor="prod-image">URL รูปภาพสินค้า (รองรับทุกลิงก์เว็บ & Google Images)</label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ color: 'var(--primary-accent)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                >
                  📁 อัปโหลดไฟล์ภาพจากเครื่อง
                </button>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handleFileUpload}
              />

              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  id="prod-image"
                  className="form-input"
                  type="text"
                  value={form.image_url}
                  onChange={handleImageUrlChange}
                  placeholder="วางลิงก์รูปภาพ เช่น https://images.unsplash.com/... หรือ ลิงก์จาก Google"
                  style={{ flex: 1 }}
                />
              </div>

              {isGoogleDetected && (
                <div style={{ fontSize: 12, color: 'var(--success-color)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span>✓</span> ระบบได้ดึง Direct URL จาก Google Image Search ให้เรียบร้อยแล้ว
                </div>
              )}
            </div>

            {/* Previews: Image + Barcode */}
            <div className="form-group form-full">
              <label className="form-label">พรีวิวรูปภาพและ Barcode</label>
              <div className="modal-preview-box">
                {/* Image Preview */}
                <div className="preview-image-wrapper">
                  <ProductImage
                    src={form.image_url}
                    alt={form.name || 'พรีวิว'}
                    category={form.category}
                    className="modal-preview-img"
                  />
                  <span className="preview-label">รูปภาพ</span>
                </div>

                {/* Barcode Preview */}
                <div className="preview-barcode-wrapper">
                  <BarcodeView
                    value={form.barcode || form.sku || '000000'}
                    height={44}
                    barWidth={1.7}
                    showText={true}
                    bgColor="#ffffff"
                    color="#000000"
                  />
                  <span className="preview-label">Barcode (Code-128)</span>
                </div>
              </div>
            </div>
          </div>

          {error && <p style={{ color: 'var(--danger-color)', fontSize: 13, marginTop: 12 }}>⚠ {error}</p>}

          <div className="form-actions">
            <button type="submit" className="btn-primary" id="save-product-btn" disabled={uploadingImage}>
              {uploadingImage ? 'กำลังประมวลผลรูป...' : (isEdit ? '💾 บันทึกการแก้ไข' : '+ เพิ่มสินค้า')}
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
  const [modal, setModal] = useState(null); // null | {type: 'add'|'edit'|'delete'|'print', product?}
  const [toast, setToast] = useState(null);

  useEffect(() => {
    setProducts(getProducts());
  }, []);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, key: Date.now() });
  }, []);

  const reload = () => setProducts(getProducts());

  const categories = [...new Set(products.map(p => p.category))];

  // Enhanced search: checks Name, Category, SKU, and Barcode
  const filtered = products.filter(p => {
    const s = search.toLowerCase().trim();
    return (
      p.name.toLowerCase().includes(s) ||
      p.category.toLowerCase().includes(s) ||
      (p.sku && p.sku.toLowerCase().includes(s)) ||
      (p.barcode && p.barcode.toLowerCase().includes(s))
    );
  });

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
  const totalStockValue = products.reduce((s, p) => s + (p.cost || 0) * p.stock, 0);

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
          <p>จัดการสินค้า, ราคา, SKU, Barcode และ Stock</p>
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
              placeholder="ค้นหาชื่อ, หมวดหมู่, SKU หรือ Barcode..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, marginLeft: 'auto', flexWrap: 'wrap' }}>
            <button
              id="btn-print-all-barcodes"
              className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 16px' }}
              onClick={() => setModal({ type: 'print', product: null })}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
              พิมพ์ Barcode ทั้งหมด
            </button>

            <button id="add-product-btn" className="btn-add" onClick={() => setModal({ type: 'add' })}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              เพิ่มสินค้า
            </button>
          </div>
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
                <th>SKU / Barcode</th>
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
                  <td colSpan={9} className="empty-table">
                    {search ? `ไม่พบสินค้าตรงกับ "${search}"` : 'ยังไม่มีสินค้า'}
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
                          <ProductImage
                            src={product.image_url}
                            alt={product.name}
                            category={product.category}
                            className="product-thumb"
                          />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span className="product-name-text">{product.name}</span>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>ID: {product.id}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="sku-barcode-cell">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span className="sku-badge">{product.sku || 'N/A'}</span>
                          </div>
                          <div
                            className="barcode-preview-clickable"
                            title="คลิกเพื่อดูและพิมพ์ Barcode"
                            onClick={() => setModal({ type: 'print', product })}
                          >
                            <BarcodeView
                              value={product.barcode || product.sku}
                              height={24}
                              barWidth={1.2}
                              showText={false}
                              bgColor="transparent"
                              color="#94a3b8"
                            />
                            <span className="barcode-number">{product.barcode || product.sku}</span>
                          </div>
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
                            className="btn-barcode"
                            title="พิมพ์ป้ายบาร์โค้ด"
                            onClick={() => setModal({ type: 'print', product })}
                          >
                            🖨️
                          </button>
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
      {modal?.type === 'print' && (
        <BarcodePrintModal
          product={modal.product}
          products={products}
          onClose={() => setModal(null)}
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
