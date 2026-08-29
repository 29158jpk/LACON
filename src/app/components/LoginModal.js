'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getUsers, loginWithPin, loginWithPassword, registerUser, switchUserById } from '../../lib/store';

export default function LoginModal({
  isOpen,
  onClose,
  onSuccess,
  initialRoleNeeded = null,
  initialTab = 'login', // 'login' | 'register'
  title = 'เข้าสู่ระบบ / สมัครสมาชิก Horizon x CPU'
}) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab); // 'login' | 'register'
  const [loginMethod, setLoginMethod] = useState('password'); // 'password' | 'pin'
  
  // Login form state
  const [identifier, setIdentifier] = useState(''); // username or email
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // PIN mode state
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [pin, setPin] = useState('');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const allUsers = getUsers();
      setUsers(allUsers);
      setActiveTab(initialTab || 'login');
      if (initialRoleNeeded === 'admin') {
        const adminUser = allUsers.find(u => u.role === 'admin') || null;
        setSelectedUser(adminUser);
        setLoginMethod('pin');
      } else {
        setSelectedUser(null);
        setLoginMethod('password');
      }
      setPin('');
      setIdentifier('');
      setPassword('');
      setRegName('');
      setRegUsername('');
      setRegEmail('');
      setRegPassword('');
      setRegConfirmPassword('');
      setError('');
      setSuccessMsg('');
    }
  }, [isOpen, initialTab, initialRoleNeeded]);

  // Keyboard shortcut listener for PIN entry
  useEffect(() => {
    if (!isOpen || activeTab !== 'login' || loginMethod !== 'pin') return;
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (['0','1','2','3','4','5','6','7','8','9'].includes(e.key)) {
        handlePinDigit(e.key);
      } else if (e.key === 'Backspace') {
        handlePinBackspace();
      } else if (e.key === 'Escape' && onClose) {
        onClose();
      } else if (e.key === 'Enter') {
        handlePinSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeTab, loginMethod, pin, selectedUser]);

  if (!isOpen || !mounted) return null;

  // ── PIN Handlers ──────────────────────────────────────────────────────────
  const handlePinDigit = (digit) => {
    if (pin.length < 6) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError('');
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

  // ── Password Login Handler ────────────────────────────────────────────────
  const handlePasswordLogin = (e) => {
    if (e) e.preventDefault();
    if (!identifier.trim()) {
      setError('กรุณากรอก Username หรือ Email');
      return;
    }
    if (!password) {
      setError('กรุณากรอกรหัสผ่าน');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const loggedUser = loginWithPassword(identifier, password);
      if (initialRoleNeeded === 'admin' && loggedUser.role !== 'admin') {
        throw new Error('จำเป็นต้องใช้สิทธิ์ Admin เพื่อเข้าถึงส่วนนี้');
      }
      if (onSuccess) onSuccess(loggedUser);
      if (onClose) onClose();
    } catch (err) {
      setError(err.message || 'Username/Email หรือรหัสผ่านไม่ถูกต้อง');
    } finally {
      setLoading(false);
    }
  };

  // ── Register Handler ──────────────────────────────────────────────────────
  const handleRegisterSubmit = (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const newUser = registerUser({
        name: regName,
        username: regUsername,
        email: regEmail,
        password: regPassword,
        confirmPassword: regConfirmPassword,
      });

      setSuccessMsg(`สมัครสมาชิกสำเร็จ! ยินดีต้อนรับคุณ ${newUser.name}`);
      setTimeout(() => {
        if (onSuccess) onSuccess(newUser);
        if (onClose) onClose();
      }, 600);
    } catch (err) {
      setError(err.message || 'เกิดข้อผิดพลาดในการสมัครสมาชิก');
    } finally {
      setLoading(false);
    }
  };

  // Filter staff users with PIN for PIN selection mode
  const staffUsers = users.filter(u => u.role === 'admin' || u.role === 'employee' || u.pin);

  const modalContent = (
    <div className="modal-overlay auth-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose && onClose()}>
      <div className="modal auth-modal-container" role="dialog" aria-modal="true">
        {/* Header */}
        <div className="modal-header auth-modal-header">
          <div className="auth-header-left">
            <div className="auth-icon-circle">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{title}</h3>
              <p style={{ margin: '2px 0 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                {activeTab === 'login' ? 'เข้าสู่ระบบเพื่อดำเนินการต่อ' : 'สมัครสมาชิกลูกค้าใหม่ (Customer)'}
              </p>
            </div>
          </div>
          {onClose && (
            <button className="modal-close" onClick={onClose} aria-label="ปิด">✕</button>
          )}
        </div>

        {/* Primary Tabs: Login vs Register (Disabled if admin role is strictly needed) */}
        {!initialRoleNeeded && (
          <div className="auth-primary-tabs">
            <button
              type="button"
              className={`auth-tab-btn ${activeTab === 'login' ? 'active' : ''}`}
              onClick={() => { setActiveTab('login'); setError(''); setSuccessMsg(''); }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                <polyline points="10 17 15 12 10 7"/>
                <line x1="15" y1="12" x2="3" y2="12"/>
              </svg>
              <span>เข้าสู่ระบบ (Sign In)</span>
            </button>
            <button
              type="button"
              className={`auth-tab-btn ${activeTab === 'register' ? 'active' : ''}`}
              onClick={() => { setActiveTab('register'); setError(''); setSuccessMsg(''); }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="8.5" cy="7" r="4"/>
                <line x1="20" y1="8" x2="20" y2="14"/>
                <line x1="23" y1="11" x2="17" y2="11"/>
              </svg>
              <span>สมัครสมาชิก (Register)</span>
            </button>
          </div>
        )}

        <div className="auth-modal-body">
          {/* Error Message */}
          {error && (
            <div className="auth-error-banner">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {successMsg && (
            <div className="auth-success-banner">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
              <span>{successMsg}</span>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              TAB 1: LOGIN
              ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'login' && (
            <div className="auth-login-section">
              {/* Sub-tabs: Password vs PIN */}
              <div className="auth-method-toggle">
                <button
                  type="button"
                  className={`method-toggle-btn ${loginMethod === 'password' ? 'active' : ''}`}
                  onClick={() => { setLoginMethod('password'); setError(''); }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <span>Username / Password</span>
                </button>
                <button
                  type="button"
                  className={`method-toggle-btn ${loginMethod === 'pin' ? 'active' : ''}`}
                  onClick={() => { setLoginMethod('pin'); setError(''); }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2"/><circle cx="9" cy="9" r="1"/><circle cx="15" cy="9" r="1"/><circle cx="9" cy="15" r="1"/><circle cx="15" cy="15" r="1"/></svg>
                  <span>PIN หน้าร้าน 4 หลัก</span>
                </button>
              </div>

              {/* Password Login Form */}
              {loginMethod === 'password' && (
                <form onSubmit={handlePasswordLogin} className="auth-form">
                  <div className="form-group">
                    <label className="form-label" htmlFor="login-identifier">Username หรือ Email</label>
                    <input
                      id="login-identifier"
                      type="text"
                      className="form-input"
                      placeholder="เช่น admin หรือ user@example.com"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      autoFocus
                    />
                  </div>

                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="form-label" htmlFor="login-password">รหัสผ่าน</label>
                      <button
                        type="button"
                        className="auth-show-pass-btn"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? 'ซ่อน' : 'แสดง'}
                      </button>
                    </div>
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      className="form-input"
                      placeholder="กรอกรหัสผ่านของคุณ"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    id="btn-login-submit"
                    className="btn-primary auth-submit-btn"
                    disabled={loading}
                  >
                    {loading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ →'}
                  </button>

                  <div className="auth-hint-box">
                    <span className="hint-tag">Default บัญชีทดสอบ:</span>
                    <div className="hint-accounts">
                      <span>👑 Admin: <code>admin</code> / <code>admin</code></span>
                      <span>👤 Employee: <code>cashier1</code> / <code>cashier1</code></span>
                    </div>
                  </div>
                </form>
              )}

              {/* PIN Fast Login */}
              {loginMethod === 'pin' && (
                <div className="auth-pin-section">
                  {/* Select User Chip (Optional) */}
                  <div className="pin-users-picker">
                    <span className="pin-picker-label">เลือกพนักงาน (หรือกด PIN ได้ทันที):</span>
                    <div className="pin-users-scroll">
                      {staffUsers.map((u) => {
                        const isSelected = selectedUser?.id === u.id;
                        return (
                          <button
                            key={u.id}
                            type="button"
                            className={`pin-user-chip ${isSelected ? 'selected' : ''}`}
                            onClick={() => {
                              setSelectedUser(isSelected ? null : u);
                              setError('');
                            }}
                          >
                            <div className="chip-avatar" style={{ background: u.avatarColor || '#3b82f6' }}>
                              {(u.name || u.username)[0]?.toUpperCase()}
                            </div>
                            <div className="chip-info">
                              <span className="chip-name">{u.name}</span>
                              <span className={`chip-role-tag ${u.role}`}>{u.role.toUpperCase()}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* PIN Display Dots */}
                  <div className="pin-dots-container">
                    {[0, 1, 2, 3].map((idx) => (
                      <div
                        key={idx}
                        className={`pin-dot ${pin.length > idx ? 'filled' : ''}`}
                      />
                    ))}
                  </div>

                  {/* Numpad */}
                  <div className="pin-numpad-grid">
                    {['1','2','3','4','5','6','7','8','9'].map((digit) => (
                      <button
                        key={digit}
                        type="button"
                        className="numpad-btn"
                        onClick={() => handlePinDigit(digit)}
                      >
                        {digit}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="numpad-btn action-btn"
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
                      className="numpad-btn action-btn"
                      onClick={handlePinBackspace}
                      title="ลบตัวสุดท้าย"
                    >
                      ⌫
                    </button>
                  </div>

                  <button
                    type="button"
                    id="btn-pin-submit"
                    className="btn-primary auth-submit-btn"
                    style={{ marginTop: 14 }}
                    onClick={() => handlePinSubmit()}
                    disabled={!pin || loading}
                  >
                    {loading ? 'กำลังเข้าสู่ระบบ...' : 'ยืนยันรหัส PIN →'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              TAB 2: REGISTER (สมัครสมาชิกลูกค้า)
              ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="auth-form auth-register-form">
              <div className="register-role-notice">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                <span>บัญชีใหม่จะได้รับสิทธิ์ <strong>CUSTOMER</strong> เพื่อสั่งซื้อสินค้าและดูประวัติการสั่งซื้อ</span>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="reg-name">
                  ชื่อ-นามสกุล / ชื่อที่ใช้แสดง <span className="req-star">*</span>
                </label>
                <input
                  id="reg-name"
                  type="text"
                  className="form-input"
                  placeholder="เช่น นายสมศักดิ์ รักไอที"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="reg-username">
                    Username <span className="req-star">*</span>
                  </label>
                  <input
                    id="reg-username"
                    type="text"
                    className="form-input"
                    placeholder="เช่น somsakit99"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    required
                  />
                  <span className="field-hint">ภาษาอังกฤษ/ตัวเลข 3-24 ตัว</span>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="reg-email">
                    Email <span className="req-star">*</span>
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    className="form-input"
                    placeholder="name@example.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="form-label" htmlFor="reg-password">
                      รหัสผ่าน <span className="req-star">*</span>
                    </label>
                    <button
                      type="button"
                      className="auth-show-pass-btn"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                    >
                      {showRegPassword ? 'ซ่อน' : 'แสดง'}
                    </button>
                  </div>
                  <input
                    id="reg-password"
                    type={showRegPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="อย่างน้อย 6 ตัวอักษร"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="reg-confirm-password">
                    ยืนยันรหัสผ่าน <span className="req-star">*</span>
                  </label>
                  <input
                    id="reg-confirm-password"
                    type={showRegPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="กรอกรหัสผ่านอีกครั้ง"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                id="btn-register-submit"
                className="btn-primary auth-submit-btn register-btn"
                disabled={loading}
              >
                {loading ? 'กำลังลงทะเบียน...' : '✓ สร้างบัญชีและเข้าสู่ระบบทันที'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
