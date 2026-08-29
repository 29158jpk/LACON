'use client';

import { useState, useEffect } from 'react';
import { getUsers, loginWithPin, loginWithPassword, switchUserById } from '../../lib/store';

export default function LoginModal({ isOpen, onClose, onSuccess, initialRoleNeeded = null, title = 'เข้าสู่ระบบ HorizonPOS' }) {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [pin, setPin] = useState('');
  const [loginMode, setLoginMode] = useState('pin'); // 'pin' | 'password'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const allUsers = getUsers();
      setUsers(allUsers);
      setSelectedUser(allUsers[0] || null);
      setPin('');
      setError('');
      setUsername('');
      setPassword('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePinDigit = (digit) => {
    if (pin.length < 6) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError('');
      // Auto-submit if 4 digits matching selected user PIN
      if (selectedUser && nextPin.length === 4 && selectedUser.pin === nextPin) {
        handlePinSubmit(nextPin);
      }
    }
  };

  const handlePinBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setError('');
  };

  const handlePinClear = () => {
    setPin('');
    setError('');
  };

  const handlePinSubmit = (pinToVerify = pin) => {
    if (!pinToVerify) {
      setError('กรุณากรอกรหัส PIN');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (selectedUser) {
        if (selectedUser.pin !== pinToVerify) {
          throw new Error(`รหัส PIN ไม่ถูกต้องสำหรับ ${selectedUser.name}`);
        }
        const loggedUser = switchUserById(selectedUser.id);
        if (initialRoleNeeded === 'admin' && loggedUser.role !== 'admin') {
          throw new Error('จำเป็นต้องใช้สิทธิ์ Admin เพื่อเข้าถึงส่วนนี้');
        }
        if (onSuccess) onSuccess(loggedUser);
        if (onClose) onClose();
      } else {
        const loggedUser = loginWithPin(pinToVerify);
        if (initialRoleNeeded === 'admin' && loggedUser.role !== 'admin') {
          throw new Error('จำเป็นต้องใช้สิทธิ์ Admin เพื่อเข้าถึงส่วนนี้');
        }
        if (onSuccess) onSuccess(loggedUser);
        if (onClose) onClose();
      }
    } catch (err) {
      setError(err.message || 'รหัส PIN ไม่ถูกต้อง');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (!username.trim()) { setError('กรุณากรอก Username'); return; }
    if (!password) { setError('กรุณากรอกรหัสผ่านหรือ PIN'); return; }

    setLoading(true);
    setError('');
    try {
      const loggedUser = loginWithPassword(username, password);
      if (initialRoleNeeded === 'admin' && loggedUser.role !== 'admin') {
        throw new Error('จำเป็นต้องใช้สิทธิ์ Admin เพื่อเข้าถึงส่วนนี้');
      }
      if (onSuccess) onSuccess(loggedUser);
      if (onClose) onClose();
    } catch (err) {
      setError(err.message || 'Username หรือรหัสผ่านไม่ถูกต้อง');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay auth-modal-overlay" onClick={e => e.target === e.currentTarget && onClose && onClose()}>
      <div className="modal auth-modal-container" role="dialog" aria-modal="true">
        <div className="modal-header" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="auth-icon-badge">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{title}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '2px 0 0 0' }}>
                {initialRoleNeeded === 'admin' ? '🔒 ต้องใช้รหัสยืนยันระดับ Admin' : 'เลือกผู้ใช้งานและใส่รหัส PIN เพื่อเข้าสู่ระบบ'}
              </p>
            </div>
          </div>
          {onClose && (
            <button className="modal-close" onClick={onClose} aria-label="ปิด">✕</button>
          )}
        </div>

        {/* Tab switch */}
        <div className="auth-mode-tabs">
          <button
            type="button"
            className={`auth-tab-btn ${loginMode === 'pin' ? 'active' : ''}`}
            onClick={() => { setLoginMode('pin'); setError(''); }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            PIN ด่วน 4 หลัก (หน้าร้าน)
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${loginMode === 'password' ? 'active' : ''}`}
            onClick={() => { setLoginMode('password'); setError(''); }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            Username & Password
          </button>
        </div>

        {loginMode === 'pin' ? (
          <div className="auth-pin-section">
            {/* User Profile Selector Cards */}
            <div className="auth-users-grid">
              {users.map(u => {
                const isSelected = selectedUser?.id === u.id;
                const isAdmin = u.role === 'admin';
                return (
                  <button
                    key={u.id}
                    type="button"
                    className={`auth-user-card ${isSelected ? 'selected' : ''} ${isAdmin ? 'is-admin' : ''}`}
                    onClick={() => {
                      setSelectedUser(u);
                      setPin('');
                      setError('');
                    }}
                  >
                    <div
                      className="auth-user-avatar"
                      style={{ background: u.avatarColor || (isAdmin ? '#3b82f6' : '#10b981') }}
                    >
                      {isAdmin ? '👑' : '👤'}
                    </div>
                    <div className="auth-user-name">{u.name}</div>
                    <div className={`auth-role-tag ${isAdmin ? 'admin' : 'employee'}`}>
                      {isAdmin ? 'Admin' : 'Employee'}
                    </div>
                    <div className="auth-pin-hint">PIN: {u.pin}</div>
                  </button>
                );
              })}
            </div>

            {/* Selected User Header */}
            {selectedUser && (
              <div className="selected-user-banner">
                <span>กำลังเข้าสู่ระบบในฐานะ:</span>
                <strong>{selectedUser.name} ({selectedUser.role === 'admin' ? 'ผู้จัดการ' : 'พนักงานขาย'})</strong>
              </div>
            )}

            {/* PIN Display Dots */}
            <div className="pin-display-wrapper">
              <div className="pin-dots-row">
                {[0, 1, 2, 3].map(idx => (
                  <div
                    key={idx}
                    className={`pin-dot ${pin.length > idx ? 'filled' : ''}`}
                  />
                ))}
              </div>
            </div>

            {error && (
              <div className="auth-error-banner">
                <span>⚠️ {error}</span>
              </div>
            )}

            {/* Numpad */}
            <div className="numpad-grid">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button
                  key={num}
                  type="button"
                  className="numpad-btn"
                  onClick={() => handlePinDigit(num.toString())}
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                className="numpad-btn numpad-fn-btn"
                onClick={handlePinClear}
                title="ล้างทั้งหมด"
              >
                C
              </button>
              <button
                type="button"
                className="numpad-btn"
                onClick={() => handlePinDigit('0')}
              >
                0
              </button>
              <button
                type="button"
                className="numpad-btn numpad-fn-btn"
                onClick={handlePinBackspace}
                title="ลบตัวสุดท้าย"
              >
                ⌫
              </button>
            </div>

            <button
              type="button"
              className="btn-primary auth-submit-btn"
              onClick={() => handlePinSubmit(pin)}
              disabled={loading || pin.length < 4}
            >
              {loading ? 'กำลังตรวจสอบ...' : '✓ เข้าสู่ระบบ'}
            </button>
          </div>
        ) : (
          <form onSubmit={handlePasswordSubmit} className="auth-form-section">
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="form-label" htmlFor="login-username">Username</label>
              <input
                id="login-username"
                type="text"
                className="form-input"
                placeholder="เช่น admin หรือ cashier1"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoFocus
              />
            </div>

            <div className="form-group" style={{ marginBottom: 18 }}>
              <label className="form-label" htmlFor="login-password">รหัสผ่าน หรือ รหัส PIN</label>
              <input
                id="login-password"
                type="password"
                className="form-input"
                placeholder="กรอกรหัสผ่าน หรือ PIN"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="auth-error-banner" style={{ marginBottom: 14 }}>
                <span>⚠️ {error}</span>
              </div>
            )}

            <div className="default-credentials-hint">
              <div className="hint-title">💡 บัญชีเริ่มต้นสำหรับทดสอบ:</div>
              <div className="hint-item">• <strong>Admin:</strong> admin / 1111 หรือ admin123</div>
              <div className="hint-item">• <strong>Employee 1:</strong> cashier1 / 1234</div>
              <div className="hint-item">• <strong>Employee 2:</strong> cashier2 / 5678</div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              {onClose && (
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ flex: 1 }}
                  onClick={onClose}
                >
                  ยกเลิก
                </button>
              )}
              <button
                type="submit"
                className="btn-primary"
                style={{ flex: 2 }}
                disabled={loading}
              >
                {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
