'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ConfettiCanvas from './ConfettiCanvas';
import { playPaymentSuccessSound } from '../../lib/soundHelper';

function fmt(num) {
  return Number(num || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PaymentSuccessModal({ isOpen, order, onViewReceipt, onNewSale }) {
  const [mounted, setMounted] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && order) {
      setShowConfetti(true);
      playPaymentSuccessSound();
    } else {
      setShowConfetti(false);
    }
  }, [isOpen, order]);

  if (!isOpen || !order || !mounted) return null;

  const isCash = order.paymentMethod === 'cash';
  const hasChange = isCash && Number(order.change) > 0;

  const modalContent = (
    <div className="modal-overlay payment-success-overlay">
      {/* Celebration Confetti Effect */}
      <ConfettiCanvas active={showConfetti} />

      <div className="modal payment-success-modal" role="dialog" aria-modal="true">
        {/* Animated Ripple Icon */}
        <div className="success-hero-section">
          <div className="success-ripple-container">
            <div className="success-ripple-ring ring-1" />
            <div className="success-ripple-ring ring-2" />
            <div className="success-icon-badge">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" className="success-checkmark-svg" />
              </svg>
            </div>
          </div>

          <h2 className="success-heading">ชำระเงินสำเร็จ!</h2>
          <p className="success-subheading">ทำรายการขายและตัดสต็อกสินค้าในระบบเรียบร้อย</p>
        </div>

        {/* Change Display Banner (if Cash & has change) */}
        {hasChange && (
          <div className="success-change-card">
            <div className="change-card-header">
              <span className="change-badge">💵 เงินทอน</span>
              <span className="change-received">รับเงินมา: ฿{fmt(order.cashReceived)}</span>
            </div>
            <div className="change-amount-display">
              ฿{fmt(order.change)}
            </div>
          </div>
        )}

        {/* Order Details Card */}
        <div className="success-order-details">
          <div className="success-detail-row">
            <span className="detail-label">ยอดชำระทั้งหมด:</span>
            <span className="detail-value total-val">฿{fmt(order.total)}</span>
          </div>
          <div className="success-detail-row">
            <span className="detail-label">ช่องทางชำระเงิน:</span>
            <span className="detail-value method-val">
              {isCash ? '💵 เงินสด (Cash)' : '📱 PromptPay QR Code'}
            </span>
          </div>
          <div className="success-detail-row">
            <span className="detail-label">เลขที่บิล:</span>
            <span className="detail-value font-mono order-no-val">{order.orderNo}</span>
          </div>
          {order.cashier && (
            <div className="success-detail-row">
              <span className="detail-label">พนักงานแคชเชียร์:</span>
              <span className="detail-value">{order.cashier.name}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="success-actions-grid">
          <button
            type="button"
            id="btn-success-view-receipt"
            className="btn-secondary success-btn-receipt"
            onClick={onViewReceipt}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            <span>🖨️ ดูใบเสร็จ & พิมพ์สลิป</span>
          </button>

          <button
            type="button"
            id="btn-success-new-sale"
            className="btn-primary success-btn-next"
            onClick={onNewSale}
            autoFocus
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"/>
              <circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            <span>🛒 เริ่มต้นการขายใหม่ (Enter)</span>
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
