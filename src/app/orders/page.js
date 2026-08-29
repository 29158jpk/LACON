'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  getOrders,
  deleteOrder,
  exportOrdersCSV,
  exportOrdersJSON,
  formatOrderNo,
  getCurrentUser,
  getUsers,
} from '../../lib/store';
import OrderReceiptModal from '../components/OrderReceiptModal';

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmt(num) {
  return Number(num || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateTimeThai(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function getRelativeTimeThai(dateStr) {
  if (!dateStr) return '';
  try {
    const now = new Date();
    const past = new Date(dateStr);
    const diffMs = now - past;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'เมื่อสักครู่';
    if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`;
    if (diffHour < 24) return `${diffHour} ชั่วโมงที่แล้ว`;
    if (diffDay === 1) return 'เมื่อวานนี้';
    if (diffDay < 30) return `${diffDay} วันที่แล้ว`;
    return '';
  } catch {
    return '';
  }
}

// ── Toast ──────────────────────────────────────────────────────────────────────
function Toast({ message, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
  return <div className={`toast ${type}`}><span>{icon}</span>{message}</div>;
}

// ── Metric Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, colorClass, icon }) {
  return (
    <div className={`stat-card ${colorClass}`}>
      <div className={`stat-icon ${colorClass}`}>{icon}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [toast, setToast] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [staffList, setStaffList] = useState([]);

  // Filters & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); // all, today, yesterday, 7days, 30days, thisMonth, custom
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all'); // all, cash, qr
  const [cashierFilter, setCashierFilter] = useState('all'); // all or userId
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, highest, lowest
  const [copiedId, setCopiedId] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, key: Date.now() });
  }, []);

  const loadData = useCallback(() => {
    try {
      const data = getOrders();
      setOrders(data);
      setCurrentUser(getCurrentUser());
      setStaffList(getUsers());
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const handleAuth = () => loadData();
    const handleUsers = () => setStaffList(getUsers());
    window.addEventListener('horizonpos_auth_change', handleAuth);
    window.addEventListener('horizonpos_users_change', handleUsers);
    return () => {
      window.removeEventListener('horizonpos_auth_change', handleAuth);
      window.removeEventListener('horizonpos_users_change', handleUsers);
    };
  }, [loadData]);

  // Handle Order Deletion / Refund
  const handleDeleteOrder = (id, restoreStock) => {
    try {
      const updated = deleteOrder(id, restoreStock);
      setOrders(updated);
      showToast(
        restoreStock
          ? '✓ ยกเลิกบิลและคืนสินค้าเข้าสต็อกเรียบร้อยแล้ว'
          : '✓ ลบบิลออกจากระบบแล้ว',
        'success'
      );
    } catch (err) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการลบบิล', 'error');
    }
  };

  // Copy Order Number
  const handleCopyOrderNo = (e, orderNo, id) => {
    e.stopPropagation();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(orderNo);
      setCopiedId(id);
      showToast(`✓ คัดลอกเลขที่บิล: ${orderNo}`, 'info');
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    try {
      exportOrdersCSV();
      showToast('✓ ส่งออกไฟล์ CSV สำเร็จ', 'success');
    } catch (err) {
      showToast(err.message || 'ไม่สามารถส่งออกไฟล์ได้', 'error');
    }
  };

  // Export JSON
  const handleExportJSON = () => {
    try {
      exportOrdersJSON();
      showToast('✓ ส่งออกไฟล์ JSON สำเร็จ', 'success');
    } catch (err) {
      showToast(err.message || 'ไม่สามารถส่งออกไฟล์ได้', 'error');
    }
  };

  // Filter & Search Logic
  const filteredOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return orders.filter(order => {
      const orderDateStr = (order.createdAt || '').slice(0, 10);
      const orderDate = new Date(order.createdAt || 0);
      const orderNo = (order.orderNo || formatOrderNo(order)).toLowerCase();

      // 1. Text Search (Order No, Item Names, SKUs, Barcodes)
      if (query) {
        const matchesOrderNo = orderNo.includes(query);
        const matchesId = (order.id || '').toLowerCase().includes(query);
        const matchesItems = (order.items || []).some(item =>
          (item.name || '').toLowerCase().includes(query) ||
          (item.sku || '').toLowerCase().includes(query) ||
          (item.barcode || '').toLowerCase().includes(query)
        );
        if (!matchesOrderNo && !matchesId && !matchesItems) return false;
      }

      // 2. Payment Method Filter
      if (paymentFilter !== 'all' && order.paymentMethod !== paymentFilter) {
        return false;
      }

      // 2.1 Salesperson / Cashier Filter
      if (cashierFilter !== 'all') {
        const matchesCashier =
          order.cashier?.id === cashierFilter ||
          order.cashier?.username === cashierFilter ||
          order.cashier?.name === cashierFilter;
        if (!matchesCashier) return false;
      }

      // 3. Date Filter
      if (dateFilter === 'today') {
        if (orderDateStr !== todayStr) return false;
      } else if (dateFilter === 'yesterday') {
        if (orderDateStr !== yesterdayStr) return false;
      } else if (dateFilter === '7days') {
        if (orderDate < sevenDaysAgo) return false;
      } else if (dateFilter === '30days') {
        if (orderDate < thirtyDaysAgo) return false;
      } else if (dateFilter === 'thisMonth') {
        if (orderDate.getFullYear() !== currentYear || orderDate.getMonth() !== currentMonth) return false;
      } else if (dateFilter === 'custom') {
        if (customStartDate && orderDateStr < customStartDate) return false;
        if (customEndDate && orderDateStr > customEndDate) return false;
      }

      return true;
    }).sort((a, b) => {
      // 4. Sorting
      if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === 'highest') return b.total - a.total;
      if (sortBy === 'lowest') return a.total - b.total;
      return 0;
    });
  }, [orders, searchQuery, paymentFilter, cashierFilter, dateFilter, customStartDate, customEndDate, sortBy]);

  const isAdmin = currentUser?.role === 'admin';

  // Overall Statistics from Filtered Data
  const stats = useMemo(() => {
    const totalRevenue = filteredOrders.reduce((s, o) => s + (o.total || 0), 0);
    const totalCost = filteredOrders.reduce((s, o) => s + (o.totalCost || 0), 0);
    const totalProfit = filteredOrders.reduce((s, o) => s + (o.profit || 0), 0);
    const totalOrdersCount = filteredOrders.length;
    const totalItemsCount = filteredOrders.reduce((s, o) => s + (o.items || []).reduce((is, i) => is + (Number(i.qty) || 0), 0), 0);
    const avgOrderValue = totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0;
    const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0.0';

    return {
      totalRevenue,
      totalCost,
      totalProfit,
      totalOrdersCount,
      totalItemsCount,
      avgOrderValue,
      profitMargin,
    };
  }, [filteredOrders]);

  if (loading) {
    return (
      <div className="orders-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>กำลังโหลดข้อมูลประวัติการขาย...</p>
      </div>
    );
  }

  return (
    <div className="orders-page">
      {/* ── Page Header ── */}
      <div className="page-header orders-page-header">
        <div>
          <div className="orders-header-title-row">
            <h1>Sales History</h1>
            <span className="orders-count-badge">{orders.length} บิลทั้งหมด</span>
          </div>
          <p>ตรวจสอบรายการขายย้อนหลัง ค้นหาเลขที่บิล พิมพ์ใบเสร็จ และจัดการยอดขาย</p>
        </div>

        <div className="orders-header-actions">
          <button
            type="button"
            className="btn-secondary btn-export"
            onClick={handleExportCSV}
            title="Export Orders as CSV for Excel"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export CSV
          </button>
          <button
            type="button"
            className="btn-secondary btn-export"
            onClick={handleExportJSON}
            title="Export Orders as JSON"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
            Export JSON
          </button>
          <Link href="/" className="btn-primary btn-go-pos">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2"/>
              <path d="M8 21h8M12 17v4"/>
            </svg>
            เปิดหน้าขาย (POS)
          </Link>
        </div>
      </div>

      {/* ── Summary Stats ── */}
      <div className="stats-grid orders-stats-grid">
        <StatCard
          label="ยอดขายรวม (ตามตัวกรอง)"
          value={`฿${fmt(stats.totalRevenue)}`}
          sub={`${stats.totalOrdersCount} บิล • รวม ${stats.totalItemsCount} ชิ้น`}
          colorClass="blue"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          }
        />
        <StatCard
          label="จำนวนบิลทั้งหมด"
          value={stats.totalOrdersCount.toLocaleString('th-TH')}
          sub={dateFilter === 'today' ? 'เฉพาะวันนี้' : dateFilter === 'all' ? 'ประวัติทั้งหมด' : 'ตามช่วงเวลาที่เลือก'}
          colorClass="purple"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          }
        />
        <StatCard
          label="กำไรสุทธิรวม"
          value={isAdmin ? `฿${fmt(stats.totalProfit)}` : '🔒 เฉพาะ Admin'}
          sub={isAdmin ? `Margin ${stats.profitMargin}% • ทุน ฿${fmt(stats.totalCost)}` : 'พนักงานขายไม่สามารถดูต้นทุน/กำไร'}
          colorClass="green"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
            </svg>
          }
        />
        <StatCard
          label="ยอดเฉลี่ยต่อบิล"
          value={`฿${fmt(stats.avgOrderValue)}`}
          sub="Average Basket Size"
          colorClass="red"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          }
        />
      </div>

      {/* ── Filter & Search Toolbar ── */}
      <div className="orders-toolbar-container">
        {/* Top filter row: Search & Date Presets */}
        <div className="orders-filter-top">
          {/* Search Box */}
          <div className="search-wrapper orders-search-box">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              id="orders-search-input"
              type="text"
              className="search-input"
              placeholder="ค้นหาเลขที่บิล, ชื่อสินค้า, SKU, Barcode, พนักงานขาย..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchQuery('')}
                aria-label="ล้างคำค้นหา"
              >✕</button>
            )}
          </div>

          {/* Quick Date Buttons */}
          <div className="date-filter-group">
            {[
              { id: 'all', label: 'ทั้งหมด' },
              { id: 'today', label: 'วันนี้' },
              { id: 'yesterday', label: 'เมื่อวาน' },
              { id: '7days', label: '7 วันล่าสุด' },
              { id: '30days', label: '30 วันล่าสุด' },
              { id: 'thisMonth', label: 'เดือนนี้' },
              { id: 'custom', label: '📅 กำหนดเอง' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                className={`date-filter-btn ${dateFilter === tab.id ? 'active' : ''}`}
                onClick={() => setDateFilter(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Secondary Filter Row: Custom Dates, Cashier, Payment Method, Sorting */}
        <div className="orders-filter-bottom">
          {dateFilter === 'custom' && (
            <div className="custom-date-range-inputs">
              <div className="date-input-wrap">
                <label>ตั้งแต่วันที่</label>
                <input
                  type="date"
                  className="form-input date-picker-input"
                  value={customStartDate}
                  onChange={e => setCustomStartDate(e.target.value)}
                />
              </div>
              <span className="date-range-separator">ถึง</span>
              <div className="date-input-wrap">
                <label>ถึงวันที่</label>
                <input
                  type="date"
                  className="form-input date-picker-input"
                  value={customEndDate}
                  onChange={e => setCustomEndDate(e.target.value)}
                />
              </div>
              {(customStartDate || customEndDate) && (
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '6px 12px', fontSize: 12 }}
                  onClick={() => { setCustomStartDate(''); setCustomEndDate(''); }}
                >
                  ล้างวันที่
                </button>
              )}
            </div>
          )}

          <div className="filter-selects-wrap">
            {/* Salesperson Filter */}
            <div className="filter-select-group">
              <label>พนักงานขาย:</label>
              <select
                id="cashier-filter"
                className="form-select filter-select"
                value={cashierFilter}
                onChange={e => setCashierFilter(e.target.value)}
              >
                <option value="all">พนักงานทุกคน (All)</option>
                {staffList.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.role === 'admin' ? '👑' : '👤'} {u.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Filter */}
            <div className="filter-select-group">
              <label>วิธีชำระเงิน:</label>
              <select
                className="form-select filter-select"
                value={paymentFilter}
                onChange={e => setPaymentFilter(e.target.value)}
              >
                <option value="all">ทั้งหมดทุกวิธี</option>
                <option value="cash">💵 เงินสด (Cash)</option>
                <option value="qr">📱 QR Code</option>
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="filter-select-group">
              <label>เรียงลำดับ:</label>
              <select
                className="form-select filter-select"
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
              >
                <option value="newest">วันที่ล่าสุด → เก่าสุด</option>
                <option value="oldest">วันที่เก่าสุด → ล่าสุด</option>
                <option value="highest">ยอดเงินมากสุด → น้อยสุด</option>
                <option value="lowest">ยอดเงินน้อยสุด → มากสุด</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ── Orders Table ── */}
      <div className="inventory-table-wrapper orders-table-wrapper">
        {filteredOrders.length === 0 ? (
          <div className="empty-table empty-orders">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            <h3>No Orders Found</h3>
            <p>
              {orders.length === 0
                ? 'ยังไม่มีการทำรายการขายในระบบ ลองเปิดบิลขายที่หน้า POS เพื่อเริ่มต้น'
                : 'ไม่พบรายการที่ตรงกับเงื่อนไขการค้นหาหรือตัวกรองวันที่'}
            </p>
            {orders.length === 0 ? (
              <Link href="/" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 12, textDecoration: 'none', padding: '10px 20px', borderRadius: 10 }}>
                ไปเปิดบิลขายที่หน้า POS →
              </Link>
            ) : (
              <button
                type="button"
                className="btn-secondary"
                style={{ marginTop: 12 }}
                onClick={() => {
                  setSearchQuery('');
                  setDateFilter('all');
                  setPaymentFilter('all');
                  setCashierFilter('all');
                }}
              >
                ล้างตัวกรองทั้งหมด
              </button>
            )}
          </div>
        ) : (
          <table className="inventory-table orders-table">
            <thead>
              <tr>
                <th style={{ width: '16%' }}>เลขที่บิล</th>
                <th style={{ width: '15%' }}>วันที่ / เวลา</th>
                <th style={{ width: '14%' }}>พนักงานขาย</th>
                <th style={{ width: isAdmin ? '21%' : '30%' }}>รายการสินค้า</th>
                <th style={{ width: '11%' }}>วิธีชำระเงิน</th>
                {isAdmin && <th style={{ width: '11%', textAlign: 'right' }}>กำไร</th>}
                <th style={{ width: '12%', textAlign: 'right' }}>ยอดรวมสุทธิ</th>
                <th style={{ width: '9%', textAlign: 'center' }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => {
                const orderNo = order.orderNo || formatOrderNo(order);
                const itemsCount = (order.items || []).reduce((s, i) => s + (Number(i.qty) || 0), 0);
                const isCopied = copiedId === order.id;
                const isOrderAdmin = order.cashier?.role === 'admin';

                return (
                  <tr
                    key={order.id}
                    className="order-table-row"
                    onClick={() => setSelectedOrder(order)}
                  >
                    {/* Order No */}
                    <td>
                      <div className="order-no-cell">
                        <span className="order-no-pill">{orderNo}</span>
                        <button
                          type="button"
                          className="btn-copy-mini"
                          onClick={e => handleCopyOrderNo(e, orderNo, order.id)}
                          title="คัดลอกเลขที่บิล"
                        >
                          {isCopied ? '✓' : '📋'}
                        </button>
                      </div>
                    </td>

                    {/* Date / Time */}
                    <td>
                      <div className="order-date-cell">
                        <div className="order-date-text">{formatDateTimeThai(order.createdAt)}</div>
                        <div className="order-date-relative">{getRelativeTimeThai(order.createdAt)}</div>
                      </div>
                    </td>

                    {/* Cashier / Salesperson */}
                    <td>
                      <div className="order-cashier-badge">
                        <span className={`cashier-dot ${isOrderAdmin ? 'admin' : 'employee'}`} />
                        <span className="cashier-name-text">
                          {order.cashier?.name || 'Admin'}
                        </span>
                      </div>
                    </td>

                    {/* Order Items summary */}
                    <td>
                      <div className="order-items-cell">
                        <div className="order-items-badge-row">
                          <span className="order-items-count-badge">{itemsCount} ชิ้น</span>
                          <span className="order-items-types-count">({(order.items || []).length} รายการ)</span>
                        </div>
                        <div className="order-items-names-preview" title={(order.items || []).map(i => `${i.name} (${i.qty})`).join(', ')}>
                          {(order.items || []).slice(0, 2).map((item, idx) => (
                            <span key={idx} className="item-name-preview">
                              {item.name} <span className="item-qty-tag">x{item.qty}</span>
                            </span>
                          ))}
                          {(order.items || []).length > 2 && (
                            <span className="item-more-tag">+{(order.items || []).length - 2} อื่นๆ</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Payment Method */}
                    <td>
                      {order.paymentMethod === 'cash' ? (
                        <span className="payment-badge cash">
                          <span className="badge-dot" />
                          💵 เงินสด
                        </span>
                      ) : (
                        <span className="payment-badge qr">
                          <span className="badge-dot" />
                          📱 QR Code
                        </span>
                      )}
                    </td>

                    {/* Profit (Admin Only) */}
                    {isAdmin && (
                      <td style={{ textAlign: 'right' }}>
                        <span className="order-profit-text">+฿{fmt(order.profit)}</span>
                      </td>
                    )}

                    {/* Total Amount */}
                    <td style={{ textAlign: 'right' }}>
                      <span className="order-total-amount">฿{fmt(order.total)}</span>
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                        <button
                          type="button"
                          className="btn-view-bill"
                          onClick={() => setSelectedOrder(order)}
                          title="ดูรายละเอียดบิลและพิมพ์ใบเสร็จ"
                        >
                          ดูบิล
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Order Detail & Receipt Modal ── */}
      {selectedOrder && (
        <OrderReceiptModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onDeleteOrder={handleDeleteOrder}
        />
      )}

      {/* ── Toast Notification ── */}
      {toast && (
        <Toast
          key={toast.key}
          message={toast.message}
          type={toast.type}
          onDone={() => setToast(null)}
        />
      )}
    </div>
  );
}
