'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getCurrentUser } from '../../lib/store';

export default function NavLinks() {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    setCurrentUser(getCurrentUser());
    const handleAuth = () => setCurrentUser(getCurrentUser());
    window.addEventListener('horizonpos_auth_change', handleAuth);
    return () => window.removeEventListener('horizonpos_auth_change', handleAuth);
  }, []);

  const isAdmin = currentUser?.role === 'admin';

  const links = [
    {
      href: '/',
      label: 'POS',
      id: 'nav-pos',
      adminOnly: false,
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2"/>
          <path d="M8 21h8M12 17v4"/>
        </svg>
      ),
    },
    {
      href: '/orders',
      label: 'Sales History',
      id: 'nav-orders',
      adminOnly: false,
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
      ),
    },
    {
      href: '/dashboard',
      label: 'Dashboard',
      id: 'nav-dashboard',
      adminOnly: true,
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1"/>
          <rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/>
          <rect x="14" y="14" width="7" height="7" rx="1"/>
        </svg>
      ),
    },
    {
      href: '/inventory',
      label: 'Inventory',
      id: 'nav-inventory',
      adminOnly: true,
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
          <line x1="12" y1="22.08" x2="12" y2="12"/>
        </svg>
      ),
    },
  ];

  return (
    <div className="nav-links">
      {links.map(link => {
        const isActive = link.href === '/'
          ? pathname === '/'
          : pathname.startsWith(link.href);
        const isLocked = link.adminOnly && !isAdmin;

        return (
          <Link
            key={link.href}
            href={link.href}
            id={link.id}
            className={`nav-link${isActive ? ' active' : ''}${isLocked ? ' is-restricted' : ''}`}
            title={isLocked ? 'เฉพาะสิทธิ์ Admin (คลิกเพื่อขอสิทธิ์)' : link.label}
          >
            {link.icon}
            {link.label}
            {isLocked && <span className="nav-lock-badge" title="เฉพาะสิทธิ์ Admin">🔒</span>}
          </Link>
        );
      })}
    </div>
  );
}
