'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import BarcodeView from './BarcodeView';

export default function BarcodePrintModal({ product, products = [], onClose }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  // If a single product is passed, print that product; if null, allow batch printing
  const isBatch = !product && products.length > 0;
  const [printQty, setPrintQty] = useState(product ? Math.max(1, Math.min(product.stock || 1, 10)) : 1);
  const [selectedProducts, setSelectedProducts] = useState(
    isBatch ? products.map(p => p.id) : [product?.id]
  );
  const [labelSize, setLabelSize] = useState('standard'); // 'standard' (50x30mm) or 'compact'

  const handlePrint = () => {
    window.print();
  };

  const toggleSelect = (id) => {
    setSelectedProducts(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedProducts(products.map(p => p.id));
  const deselectAll = () => setSelectedProducts([]);

  const itemsToPrint = isBatch
    ? products.filter(p => selectedProducts.includes(p.id))
    : (product ? [product] : []);

  if (!mounted) return null;

  const modalContent = (
    <div className="modal-overlay barcode-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-wide barcode-print-modal" role="dialog" aria-modal="true">
        <div className="modal-header no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            <h3>{isBatch ? 'พิมพ์สติ๊กเกอร์ Barcode ทั้งหมด' : `พิมพ์ Barcode: ${product?.name}`}</h3>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="ปิด">✕</button>
        </div>

        {/* Controls - Hide on print */}
        <div className="barcode-print-controls no-print">
          <div className="form-grid" style={{ marginBottom: 16 }}>
            {!isBatch && (
              <div className="form-group">
                <label className="form-label">จำนวนดวงที่พิมพ์</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    className="qty-btn"
                    onClick={() => setPrintQty(q => Math.max(1, q - 1))}
                  >−</button>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    className="form-input"
                    style={{ width: 80, textAlign: 'center' }}
                    value={printQty}
                    onChange={e => setPrintQty(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                  <button
                    type="button"
                    className="qty-btn"
                    onClick={() => setPrintQty(q => q + 1)}
                  >+</button>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: '6px 12px', fontSize: 12 }}
                    onClick={() => setPrintQty(product?.stock || 1)}
                  >
                    ตาม Stock ({product?.stock || 0})
                  </button>
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">ขนาดป้ายสติ๊กเกอร์</label>
              <select
                className="form-select"
                value={labelSize}
                onChange={e => setLabelSize(e.target.value)}
              >
                <option value="standard">มาตรฐาน (50 × 30 mm - ป้ายราคา + บาร์โค้ด)</option>
                <option value="compact">กะทัดรัด (40 × 25 mm - บาร์โค้ด + SKU)</option>
              </select>
            </div>
          </div>

          {isBatch && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                เลือกแล้ว {selectedProducts.length} จาก {products.length} รายการ
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={selectAll}>เลือกทั้งหมด</button>
                <button type="button" className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={deselectAll}>ยกเลิกทั้งหมด</button>
              </div>
            </div>
          )}
        </div>

        {/* Printable Area */}
        <div className="barcode-labels-preview-container">
          <div className={`barcode-labels-grid ${labelSize}`}>
            {itemsToPrint.map(item => {
              const count = isBatch ? 1 : printQty;
              const barcodeValue = item.barcode || item.sku || item.id;
              return Array.from({ length: count }).map((_, idx) => (
                <div key={`${item.id}-${idx}`} className={`barcode-label-card ${labelSize}`}>
                  <div className="label-store-name">Horizon x CPU</div>
                  <div className="label-product-name">{item.name}</div>
                  
                  <div className="label-barcode-wrapper">
                    <BarcodeView
                      value={barcodeValue}
                      height={labelSize === 'compact' ? 32 : 42}
                      barWidth={1.6}
                      showText={true}
                      bgColor="#ffffff"
                      color="#000000"
                    />
                  </div>

                  <div className="label-footer">
                    <span className="label-sku">SKU: {item.sku || 'N/A'}</span>
                    <span className="label-price">฿{Number(item.price || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              ));
            })}
          </div>
        </div>

        {/* Footer Actions - Hide on print */}
        <div className="form-actions no-print" style={{ marginTop: 20 }}>
          <button type="button" className="btn-primary" onClick={handlePrint} id="btn-do-print">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
              <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            🖨️ สั่งพิมพ์สติ๊กเกอร์ Barcode
          </button>
          <button type="button" className="btn-secondary" onClick={onClose}>
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
