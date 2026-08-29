'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getUsers, addUser, updateUser, deleteUser, getCurrentUser } from '../../lib/store';

export default function StaffManagementModal({ isOpen, onClose, onStaffUpdated }) {
  const [mounted, setMounted] = useState(false);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    pin: '',
    password: '',
    role: 'employee',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadData = () => {
    const list = getUsers();
    setUsers(list);
    setCurrentUser(getCurrentUser());
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      setShowAddForm(false);
      setEditingUser(null);
      setError('');
      setSuccess('');
    }
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showAddForm) {
          setShowAddForm(false);
          setEditingUser(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showAddForm, onClose]);

  if (!isOpen || !mounted) return null;

  const handleStartAdd = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      username: '',
      pin: Math.floor(1000 + Math.random() * 9000).toString(),
      password: '',
      role: 'employee',
    });
    setShowAddForm(true);
    setError('');
    setSuccess('');
  };

  const handleStartEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      username: user.username,
      pin: user.pin,
      password: user.password || '',
      role: user.role,
    });
    setShowAddForm(true);
    setError('');
    setSuccess('');
  };

  const handleDelete = (id, name) => {
    if (users.length <= 1) {
      setError('ไม่สามารถลบผู้ใช้งานคนสุดท้ายได้');
      return;
    }
    if (confirm(`ยืนยันการลบพนักงาน "${name}" หรือไม่?`)) {
      try {
        const updated = deleteUser(id);
        setUsers(updated);
        setSuccess(`ลบพนักงาน "${name}" เรียบร้อยแล้ว`);
        if (onStaffUpdated) onStaffUpdated();
      } catch (err) {
        setError(err.message || 'ไม่สามารถลบพนักงานได้');
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.name.trim()) {
      setError('กรุณากรอกชื่อ-นามสกุลพนักงาน');
      return;
    }
    if (!formData.username.trim()) {
      setError('กรุณากรอก Username');
      return;
    }
    if (!formData.pin.trim() || formData.pin.trim().length !== 4 || !/^\d+$/.test(formData.pin.trim())) {
      setError('รหัส PIN ต้องเป็นตัวเลข 4 หลักเท่านั้น');
      return;
    }

    try {
      if (editingUser) {
        updateUser(editingUser.id, {
          name: formData.name.trim(),
          username: formData.username.trim().toLowerCase(),
          pin: formData.pin.trim(),
          password: formData.password || formData.pin.trim(),
          role: formData.role,
        });
        setSuccess(`แก้ไขข้อมูลของ "${formData.name}" สำเร็จ`);
      } else {
        addUser({
          name: formData.name.trim(),
          username: formData.username.trim().toLowerCase(),
          pin: formData.pin.trim(),
          password: formData.password || formData.pin.trim(),
          role: formData.role,
        });
        setSuccess(`เพิ่มพนักงานใหม่ "${formData.name}" สำเร็จ`);
      }
      loadData();
      setShowAddForm(false);
      setEditingUser(null);
      if (onStaffUpdated) onStaffUpdated();
    } catch (err) {
      setError(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  const modalContent = (
    <div className="modal-overlay staff-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-wide staff-modal-container" role="dialog" aria-modal="true" aria-labelledby="staff-modal-title">
        {/* Header - Fixed top */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="auth-icon-badge" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div>
              <h3 id="staff-modal-title" style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>จัดการพนักงาน & สิทธิ์ (Staff)</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '2px 0 0 0' }}>
                กำหนดบทบาท Admin / Employee และรหัส PIN หน้าร้าน
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="ปิด">✕</button>
        </div>

        {error && (
          <div className="auth-error-banner" style={{ marginBottom: 16 }}>
            <span>⚠️ {error}</span>
          </div>
        )}

        {success && (
          <div className="auth-success-banner" style={{ marginBottom: 16 }}>
            <span>✓ {success}</span>
          </div>
        )}

        {/* Modal Body - Scrollable */}
        <div className="staff-modal-body">
          {showAddForm ? (
            <form onSubmit={handleSubmit} className="staff-form">
              <h4 style={{ fontSize: 15, marginBottom: 14, color: 'var(--text-main)', fontWeight: 600 }}>
                {editingUser ? `✏️ แก้ไขข้อมูล: ${editingUser.name}` : '➕ เพิ่มพนักงานใหม่'}
              </h4>

              <div className="form-grid">
                <div className="form-group form-full">
                  <label className="form-label" htmlFor="staff-name">ชื่อ - นามสกุล *</label>
                  <input
                    id="staff-name"
                    type="text"
                    className="form-input"
                    placeholder="เช่น สมชาย ใจดี"
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="staff-username">Username *</label>
                  <input
                    id="staff-username"
                    type="text"
                    className="form-input"
                    placeholder="เช่น cashier3"
                    value={formData.username}
                    onChange={e => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="staff-pin">รหัส PIN 4 หลัก (สำหรับหน้าร้าน) *</label>
                  <input
                    id="staff-pin"
                    type="text"
                    maxLength={4}
                    className="form-input"
                    placeholder="เช่น 1234"
                    value={formData.pin}
                    onChange={e => setFormData(prev => ({ ...prev, pin: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                  />
                </div>

                <div className="form-group form-full">
                  <label className="form-label">สิทธิ์การใช้งาน (Role) *</label>
                  <div className="role-selection-grid">
                    <label className={`role-card ${formData.role === 'admin' ? 'active is-admin' : ''}`}>
                      <input
                        type="radio"
                        name="role"
                        value="admin"
                        checked={formData.role === 'admin'}
                        onChange={() => setFormData(prev => ({ ...prev, role: 'admin' }))}
                      />
                      <div className="role-card-content">
                        <div className="role-card-title">👑 ผู้ดูแลระบบ (Admin)</div>
                        <div className="role-card-desc">สิทธิ์เต็ม: ขายสินค้า, จัดการสต็อก, ดูรายงาน Dashboard, และจัดการพนักงาน</div>
                      </div>
                    </label>

                    <label className={`role-card ${formData.role === 'employee' ? 'active is-employee' : ''}`}>
                      <input
                        type="radio"
                        name="role"
                        value="employee"
                        checked={formData.role === 'employee'}
                        onChange={() => setFormData(prev => ({ ...prev, role: 'employee' }))}
                      />
                      <div className="role-card-content">
                        <div className="role-card-title">👤 พนักงานขาย (Employee)</div>
                        <div className="role-card-desc">สิทธิ์เฉพาะการขาย (POS) และดูใบเสร็จ ไม่สามารถแก้ไขสต็อกหรือดูรายงานต้นทุนกำไรได้</div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => { setShowAddForm(false); setEditingUser(null); }}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 2 }}
                >
                  {editingUser ? '💾 บันทึกการแก้ไข' : '✓ ยืนยันเพิ่มพนักงาน'}
                </button>
              </div>
            </form>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  ทั้งหมด <strong>{users.length}</strong> บัญชี
                </div>
                <button
                  type="button"
                  id="btn-add-staff"
                  className="btn-primary"
                  style={{ padding: '8px 14px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  onClick={handleStartAdd}
                >
                  <span>+ เพิ่มพนักงาน</span>
                </button>
              </div>

              <div className="staff-list-container">
                {users.map(u => {
                  const isAdmin = u.role === 'admin';
                  const isCurrent = currentUser?.id === u.id;
                  return (
                    <div key={u.id} className="staff-list-item">
                      <div
                        className="staff-item-avatar"
                        style={{ background: u.avatarColor || (isAdmin ? '#3b82f6' : '#10b981') }}
                      >
                        {isAdmin ? '👑' : '👤'}
                      </div>

                      <div className="staff-item-info">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="staff-item-name">{u.name}</span>
                          {isCurrent && <span className="staff-current-tag">คุณ</span>}
                          <span className={`staff-role-badge ${isAdmin ? 'admin' : 'employee'}`}>
                            {isAdmin ? '👑 Admin' : '👤 Employee'}
                          </span>
                        </div>
                        <div className="staff-item-meta">
                          <span>Username: <strong>{u.username}</strong></span>
                          <span>•</span>
                          <span>PIN: <strong className="font-mono">{u.pin}</strong></span>
                        </div>
                      </div>

                      <div className="staff-item-actions">
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ padding: '6px 12px', fontSize: 12 }}
                          onClick={() => handleStartEdit(u)}
                          title="แก้ไขข้อมูลพนักงาน"
                        >
                          ✏️ แก้ไข
                        </button>
                        <button
                          type="button"
                          className="btn-danger"
                          style={{ padding: '6px 12px', fontSize: 12 }}
                          onClick={() => handleDelete(u.id, u.name)}
                          disabled={users.length <= 1}
                          title="ลบพนักงาน"
                        >
                          🗑️ ลบ
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
