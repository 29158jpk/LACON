'use client';

import { useState, useEffect, useRef } from 'react';
import { getCurrentUser, logout } from '../../lib/store';
import LoginModal from './LoginModal';
import StaffManagementModal from './StaffManagementModal';

export default function UserNavWidget() {
  const [currentUser, setCurrentUser] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const dropdownRef = useRef(null);

  const loadUser = () => {
    setCurrentUser(getCurrentUser());
  };

  useEffect(() => {
    loadUser();

    const handleAuthChange = () => loadUser();
    const handleUsersChange = () => loadUser();

    window.addEventListener('horizonpos_auth_change', handleAuthChange);
    window.addEventListener('horizonpos_users_change', handleUsersChange);

    return () => {
      window.removeEventListener('horizonpos_auth_change', handleAuthChange);
      window.removeEventListener('horizonpos_users_change', handleUsersChange);
    };
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isAdmin = currentUser?.role === 'admin';

  const handleLogout = () => {
    logout();
    setShowDropdown(false);
    setShowLoginModal(true);
  };

  return (
    <>
      <div className="user-nav-widget" ref={dropdownRef}>
        {currentUser ? (
          <button
            type="button"
            id="user-profile-btn"
            className={`user-nav-btn ${isAdmin ? 'is-admin' : 'is-employee'}`}
            onClick={() => setShowDropdown(prev => !prev)}
            title="คลิกเพื่อสลับผู้ใช้งานหรือจัดการสิทธิ์"
          >
            <div
              className="user-nav-avatar"
              style={{ background: currentUser.avatarColor || (isAdmin ? '#3b82f6' : '#10b981') }}
            >
              {isAdmin ? '👑' : '👤'}
            </div>

            <div className="user-nav-info">
              <span className="user-nav-name">{currentUser.name}</span>
              <span className={`user-nav-role ${isAdmin ? 'admin' : 'employee'}`}>
                {isAdmin ? '👑 Admin' : '👤 Employee'}
              </span>
            </div>

            <svg className={`user-nav-arrow ${showDropdown ? 'open' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
        ) : (
          <button
            type="button"
            id="nav-login-btn"
            className="user-nav-login-btn"
            onClick={() => setShowLoginModal(true)}
            title="คลิกเพื่อเข้าสู่ระบบ"
          >
            <span className="login-btn-icon">🔑</span>
            <span className="login-btn-text">เข้าสู่ระบบ (Login)</span>
          </button>
        )}

        {showDropdown && (
          <div className="user-nav-dropdown">
            <div className="dropdown-user-header">
              <div className="dropdown-user-name">{currentUser.name}</div>
              <div className="dropdown-user-sub">
                Username: <strong>{currentUser.username}</strong> • PIN: <strong>{currentUser.pin}</strong>
              </div>
            </div>

            <div className="dropdown-divider" />

            <button
              type="button"
              id="dropdown-switch-user-btn"
              className="dropdown-item-btn"
              onClick={() => {
                setShowDropdown(false);
                setShowLoginModal(true);
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="8.5" cy="7" r="4"/>
                <polyline points="17 11 19 13 23 9"/>
              </svg>
              <span>สลับผู้ใช้ / เข้าสู่ระบบด้วย PIN</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                id="dropdown-manage-staff-btn"
                className="dropdown-item-btn"
                onClick={() => {
                  setShowDropdown(false);
                  setShowStaffModal(true);
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <span>จัดการพนักงาน & สิทธิ์ (Staff)</span>
              </button>
            )}

            <div className="dropdown-divider" />

            <button
              type="button"
              id="dropdown-logout-btn"
              className="dropdown-item-btn logout"
              onClick={handleLogout}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              <span>ออกจากระบบ</span>
            </button>
          </div>
        )}
      </div>

      {/* Login / Switch User Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
        }}
      />

      {/* Staff Management Modal */}
      <StaffManagementModal
        isOpen={showStaffModal}
        onClose={() => setShowStaffModal(false)}
        onStaffUpdated={loadUser}
      />
    </>
  );
}
