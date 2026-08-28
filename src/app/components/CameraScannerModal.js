'use client';

import { useState, useEffect, useRef } from 'react';
import { playScanSound } from '../../lib/barcode';

export default function CameraScannerModal({ onClose, onScan }) {
  const videoRef = useRef(null);
  const [hasCamera, setHasCamera] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [isScanning, setIsScanning] = useState(true);
  const [lastScanned, setLastScanned] = useState('');
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    let active = true;

    async function startCamera() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('เบราว์เซอร์นี้ไม่รองรับการเข้าถึงกล้อง (WebRTC)');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        });

        if (!active) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }

        // Initialize BarcodeDetector if supported
        if ('BarcodeDetector' in window) {
          const barcodeDetector = new window.BarcodeDetector({
            formats: ['code_128', 'ean_13', 'ean_8', 'qr_code', 'upc_a', 'upc_e', 'code_39'],
          });

          const detectFrame = async () => {
            if (!active || !videoRef.current) return;
            if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
              try {
                const barcodes = await barcodeDetector.detect(videoRef.current);
                if (barcodes.length > 0) {
                  const detected = barcodes[0].rawValue;
                  if (detected && detected !== lastScanned) {
                    setLastScanned(detected);
                    playScanSound();
                    onScan(detected);
                    // Pause briefly before scanning next
                    setTimeout(() => {
                      if (active) setLastScanned('');
                    }, 1500);
                  }
                }
              } catch {
                // Ignore per-frame detection error
              }
            }
            if (active) {
              animationFrameRef.current = requestAnimationFrame(detectFrame);
            }
          };

          animationFrameRef.current = requestAnimationFrame(detectFrame);
        }
      } catch (err) {
        if (active) {
          setHasCamera(false);
          setErrorMsg(err.name === 'NotAllowedError'
            ? 'กรุณาอนุญาตการใช้งานกล้องในเบราว์เซอร์'
            : err.message || 'ไม่สามารถเปิดกล้องได้');
        }
      }
    }

    startCamera();

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [onScan, lastScanned]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    playScanSound();
    onScan(manualCode.trim());
    setManualCode('');
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal camera-scanner-modal" role="dialog" aria-modal="true">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            <h3>สแกน Barcode ด้วยกล้อง</h3>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="ปิด">✕</button>
        </div>

        <div className="scanner-video-container">
          {hasCamera ? (
            <div className="video-viewport">
              <video ref={videoRef} playsInline muted className="scanner-video" />
              <div className="scanner-laser-overlay">
                <div className="laser-line" />
                <div className="scanner-corners" />
              </div>
              {lastScanned && (
                <div className="scan-success-badge">
                  ✓ พบรหัส: {lastScanned}
                </div>
              )}
            </div>
          ) : (
            <div className="scanner-error-placeholder">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--warning-color)" strokeWidth="1.5">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <line x1="1" y1="1" x2="23" y2="23" stroke="var(--danger-color)" strokeWidth="2"/>
              </svg>
              <p style={{ marginTop: 12, color: 'var(--text-muted)', fontSize: 13 }}>{errorMsg}</p>
            </div>
          )}
        </div>

        {/* Quick Manual / Scanner input */}
        <form onSubmit={handleManualSubmit} style={{ marginTop: 16 }}>
          <label className="form-label" htmlFor="manual-scan-input">หรือพิมพ์รหัส Barcode / SKU ด้านล่าง</label>
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <input
              id="manual-scan-input"
              type="text"
              className="form-input"
              placeholder="กรอกรหัสบาร์โค้ดแล้วกด Enter..."
              value={manualCode}
              onChange={e => setManualCode(e.target.value)}
              autoFocus
            />
            <button type="submit" className="btn-primary" style={{ padding: '0 20px', flexShrink: 0 }}>
              ค้นหา/เพิ่ม
            </button>
          </div>
        </form>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            💡 นำกล้องส่องที่แท่งบาร์โค้ด หรือใช้เครื่องสแกนบาร์โค้ดยิงได้เลย
          </span>
          <button type="button" className="btn-secondary" onClick={onClose} style={{ padding: '8px 16px', fontSize: 13 }}>
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
}
