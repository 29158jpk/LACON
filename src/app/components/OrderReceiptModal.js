'use client';

import { useState } from 'react';
import { formatOrderNo } from '../../lib/store';

function fmt(num) {
  return Number(num || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatThaiDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export default function OrderReceiptModal({ order, onClose, onDeleteOrder }) {
  const [copied, setCopied] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [restoreStockOnDelete, setRestoreStockOnDelete] = useState(true);

  if (!order) return null;

  const orderNo = order.orderNo || formatOrderNo(order);
  const totalItemsCount = (order.items || []).reduce((s, i) => s + (Number(i.qty) || 0), 0);
  const profitMargin = order.total > 0 ? ((order.profit / order.total) * 100).toFixed(1) : '0.0';

  const handleCopyOrderNo = () => {
    if (navigator.clipboard && orderNo) {
      navigator.clipboard.writeText(orderNo);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDelete = () => {
    if (onDeleteOrder) {
      onDeleteOrder(order.id, restoreStockOnDelete);
    }
    setShowConfirmDelete(false);
    onClose();
  };

  return (
    <div className="modal-overlay receipt-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-wide receipt-modal-container" role="dialog" aria-modal="true" aria-labelledby="receipt-title">
        {/* Header - Screen only */}
        <div className="modal-header no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="receipt-icon-badge">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
            </div>
            <div>
              <h3 id="receipt-title" style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>รายละเอียดบิล</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                <span className="order-code-badge">{orderNo}</span>
                <button
                  type="button"
                  className="btn-copy-code"
                  onClick={handleCopyOrderNo}
                  title="คัดลอกเลขที่บิล"
                >
                  {copied ? '✓ คัดลอกแล้ว' : '📋 คัดลอก'}
                </button>
              </div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="ปิด">✕</button>
        </div>

        {/* Delete Confirmation Popup */}
        {showConfirmDelete ? (
          <div className="receipt-delete-confirm-box no-print">
            <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
            <h4>ต้องการยกเลิกบิล {orderNo} หรือไม่?</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
              การยกเลิกบิลจะลบรายการสั่งซื้อนี้ออกจากระบบประวัติการขาย
            </p>
            <label className="checkbox-label" style={{ marginBottom: 18, justifyContent: 'center' }}>
              <input
                type="checkbox"
                checked={restoreStockOnDelete}
                onChange={e => setRestoreStockOnDelete(e.target.checked)}
              />
              <span>คืนจำนวนสินค้าเข้าคลังสต็อกอัตโนมัติ ({totalItemsCount} ชิ้น)</span>
            </label>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowConfirmDelete(false)}
              >
                ย้อนกลับ
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={handleDelete}
              >
                ยืนยันยกเลิกบิล
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Printable Receipt Paper Container */}
            <div className="receipt-paper" id="printable-receipt">
              {/* Receipt Header */}
              <div className="receipt-header-center">
                <div className="receipt-brand-logo">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#2563eb" strokeWidth="2.5"/>
                    <path d="M12 7V17M7 12H17" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                  <span>HorizonPOS</span>
                </div>
                <div className="receipt-store-subtitle">ใบเสร็จรับเงิน / ใบกำกับภาษีอย่างย่อ</div>
                <div className="receipt-store-address">สาขาหลัก • โทร. 02-123-4567 • TAX ID: 0-1055-67890-12-3</div>
              </div>

              <div className="receipt-dashed-line" />

              {/* Meta info */}
              <div className="receipt-meta-grid">
                <div className="receipt-meta-row">
                  <span className="meta-label">เลขที่บิล:</span>
                  <span className="meta-val font-mono">{orderNo}</span>
                </div>
                <div className="receipt-meta-row">
                  <span className="meta-label">วันที่/เวลา:</span>
                  <span className="meta-val">{formatThaiDate(order.createdAt)}</span>
                </div>
                <div className="receipt-meta-row">
                  <span className="meta-label">วิธีชำระเงิน:</span>
                  <span className="meta-val">
                    {order.paymentMethod === 'cash' ? '💵 เงินสด (Cash)' : '📱 QR Code PromptPay'}
                  </span>
                </div>
                <div className="receipt-meta-row">
                  <span className="meta-label">พนักงานขาย:</span>
                  <span className="meta-val">Admin (แคชเชียร์ 01)</span>
                </div>
              </div>

              <div className="receipt-dashed-line" />

              {/* Items Table */}
              <table className="receipt-items-table">
                <thead>
                  <tr>
                    <th style={{ width: '45%', textAlign: 'left' }}>รายการ</th>
                    <th style={{ width: '15%', textAlign: 'center' }}>จำนวน</th>
                    <th style={{ width: '20%', textAlign: 'right' }}>หน่วยละ</th>
                    <th style={{ width: '20%', textAlign: 'right' }}>รวม (฿)</th>
                  </tr>
                </thead>
                <tbody>
                  {(order.items || []).map((item, idx) => (
                    <tr key={idx}>
                      <td>
                        <div className="receipt-item-name">{item.name}</div>
                        {(item.sku || item.barcode) && (
                          <div className="receipt-item-sku">
                            {item.sku ? `SKU: ${item.sku}` : ''} {item.barcode ? `• Barcode: ${item.barcode}` : ''}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'center', verticalAlign: 'top' }}>x{item.qty}</td>
                      <td style={{ textAlign: 'right', verticalAlign: 'top' }}>{fmt(item.price)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, verticalAlign: 'top' }}>
                        {fmt(item.price * item.qty)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="receipt-dashed-line" />

              {/* Financial Totals */}
              <div className="receipt-calc-block">
                <div className="receipt-calc-row">
                  <span>จำนวนชิ้นรวม</span>
                  <span>{totalItemsCount} ชิ้น</span>
                </div>
                <div className="receipt-calc-row">
                  <span>ยอดรวมสินค้า</span>
                  <span>฿{fmt(order.total)}</span>
                </div>
                <div className="receipt-calc-row">
                  <span>ภาษีมูลค่าเพิ่ม (VAT 7% รวมในราคา)</span>
                  <span>฿{fmt((order.total * 7) / 107)}</span>
                </div>
                <div className="receipt-calc-row receipt-grand-total">
                  <span>ยอดสุทธิ (Total)</span>
                  <span>฿{fmt(order.total)}</span>
                </div>

                {order.paymentMethod === 'cash' && order.cashReceived && (
                  <>
                    <div className="receipt-dashed-line" style={{ margin: '6px 0' }} />
                    <div className="receipt-calc-row">
                      <span>รับเงินสดมา</span>
                      <span>฿{fmt(order.cashReceived)}</span>
                    </div>
                    <div className="receipt-calc-row" style={{ fontWeight: 600, color: 'var(--success-color)' }}>
                      <span>เงินทอน</span>
                      <span>฿{fmt(order.change || 0)}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Profit & Cost breakdown (Visible on screen for manager/staff, styled cleanly) */}
              <div className="receipt-profit-badge no-print">
                <div className="profit-badge-col">
                  <span className="profit-badge-label">ต้นทุนรวม</span>
                  <span className="profit-badge-val">฿{fmt(order.totalCost)}</span>
                </div>
                <div className="profit-badge-divider" />
                <div className="profit-badge-col">
                  <span className="profit-badge-label">กำไรสุทธิ</span>
                  <span className="profit-badge-val highlight">฿{fmt(order.profit)}</span>
                </div>
                <div className="profit-badge-divider" />
                <div className="profit-badge-col">
                  <span className="profit-badge-label">อัตรากำไร (Margin)</span>
                  <span className="profit-badge-val">{profitMargin}%</span>
                </div>
              </div>

              <div className="receipt-dashed-line" />

              {/* Footer */}
              <div className="receipt-footer-center">
                <p style={{ margin: 0, fontWeight: 600 }}>ขอบคุณที่ใช้บริการ HorizonPOS</p>
                <p style={{ margin: '4px 0 0 0', fontSize: 11, color: '#64748b' }}>
                  กรุณาเก็บใบเสร็จไว้เป็นหลักฐานการซื้อสินค้า
                </p>
              </div>
            </div>

            {/* Actions Toolbar - Screen only */}
            <div className="modal-actions-toolbar no-print">
              <div style={{ display: 'flex', gap: 8 }}>
                {onDeleteOrder && (
                  <button
                    type="button"
                    className="btn-danger-ghost"
                    onClick={() => setShowConfirmDelete(true)}
                    title="ยกเลิกบิลและคืนสต็อกสินค้า"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                    ยกเลิกบิล
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={onClose}
                >
                  ปิดหน้าต่าง
                </button>
                <button
                  type="button"
                  id="btn-print-receipt"
                  className="btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: 7 }}
                  onClick={handlePrint}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 6 2 18 2 18 9"/>
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                    <rect x="6" y="14" width="12" height="8"/>
                  </svg>
                  พิมพ์ใบเสร็จ
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
