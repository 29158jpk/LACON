'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getDashboardStats } from '../../lib/store';

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmt(num) {
  return num.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

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

// ── Bar Chart ──────────────────────────────────────────────────────────────────
function BarChart({ data, maxVal, barClass, labelKey = 'label', valueKey = 'revenue', secondKey = null }) {
  const max = maxVal || Math.max(...data.map(d => d[valueKey] || 0), 1);
  return (
    <div className="bar-chart-wrapper">
      {data.map((d, i) => (
        <div key={i} className="bar-col">
          {secondKey && (
            <div
              className={`bar profit`}
              style={{ height: `${((d[secondKey] || 0) / max) * 130}px` }}
              title={`กำไร ฿${fmt(d[secondKey] || 0)}`}
            />
          )}
          <div
            className={`bar ${barClass}`}
            style={{ height: `${((d[valueKey] || 0) / max) * 130}px` }}
            title={`฿${fmt(d[valueKey] || 0)}`}
          />
          <div className="bar-label">{d[labelKey]}</div>
        </div>
      ))}
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setStats(getDashboardStats());
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="dashboard-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>กำลังโหลด...</p>
      </div>
    );
  }

  const { totalRevenue, totalCost, totalProfit, totalOrders, topProducts, dailySales, monthlySales } = stats;
  const hasData = totalOrders > 0;

  const marginPct = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0.0';

  return (
    <div className="dashboard-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1>Dashboard</h1>
          <p>ภาพรวมยอดขายและกำไรของร้านค้า</p>
        </div>
        <Link
          href="/orders"
          className="btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none', padding: '9px 16px', borderRadius: 10, fontSize: 13 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          ดูประวัติการขาย (Orders) →
        </Link>
      </div>

      {/* ── Stats Cards ── */}
      <div className="stats-grid">
        <StatCard
          label="ยอดขายรวม"
          value={`฿${fmt(totalRevenue)}`}
          sub={`${totalOrders} ออเดอร์`}
          colorClass="blue"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          }
        />
        <StatCard
          label="ต้นทุนรวม"
          value={`฿${fmt(totalCost)}`}
          sub="ราคาทุนสะสม"
          colorClass="red"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            </svg>
          }
        />
        <StatCard
          label="กำไรสุทธิ"
          value={`฿${fmt(totalProfit)}`}
          sub={`Margin ${marginPct}%`}
          colorClass="green"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
            </svg>
          }
        />
        <StatCard
          label="จำนวนออเดอร์"
          value={totalOrders.toLocaleString('th-TH')}
          sub="ออเดอร์ทั้งหมด"
          colorClass="purple"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
          }
        />
      </div>

      {!hasData ? (
        <div className="empty-dashboard">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2"/>
            <path d="M8 21h8M12 17v4"/>
          </svg>
          <h3>ยังไม่มีข้อมูลการขาย</h3>
          <p style={{ marginBottom: 20 }}>ลองขายสินค้าใน POS แล้วกลับมาดู Dashboard ได้เลย</p>
          <Link href="/" className="btn-primary" style={{ display: 'inline-block', padding: '12px 24px', borderRadius: 10, background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', textDecoration: 'none', fontWeight: 600 }}>
            ไปหน้า POS →
          </Link>
        </div>
      ) : (
        <>
          {/* ── Charts ── */}
          <div className="charts-grid">
            {/* Daily Sales */}
            <div className="chart-card">
              <div className="chart-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
                </svg>
                ยอดขายรายวัน (7 วันล่าสุด)
              </div>
              <BarChart
                data={dailySales}
                barClass="revenue"
                secondKey="profit"
                valueKey="revenue"
              />
              <div className="chart-legend">
                <div className="legend-item">
                  <div className="legend-dot" style={{ background: '#3b82f6' }} />
                  ยอดขาย
                </div>
                <div className="legend-item">
                  <div className="legend-dot" style={{ background: '#10b981' }} />
                  กำไร
                </div>
              </div>
            </div>

            {/* Monthly Sales */}
            <div className="chart-card">
              <div className="chart-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                ยอดขายรายเดือน (6 เดือน)
              </div>
              <BarChart
                data={monthlySales}
                barClass="monthly"
                valueKey="revenue"
              />
              <div className="chart-legend">
                <div className="legend-item">
                  <div className="legend-dot" style={{ background: '#8b5cf6' }} />
                  ยอดขาย
                </div>
              </div>
            </div>
          </div>

          {/* ── Top Products ── */}
          <div className="top-products-card">
            <div className="chart-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--warning-color)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              สินค้าขายดี Top 5
            </div>
            {topProducts.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>ยังไม่มีข้อมูล</p>
            ) : (
              <div className="top-products-list">
                {topProducts.map((p, i) => {
                  const maxQty = topProducts[0]?.qty || 1;
                  return (
                    <div key={p.name} className="top-product-item">
                      <div className={`top-product-rank ${i === 0 ? 'gold' : ''}`}>
                        {i + 1}
                      </div>
                      <div className="top-product-info">
                        <div className="top-product-name">{p.name}</div>
                        <div className="top-product-bar-bg">
                          <div
                            className="top-product-bar-fill"
                            style={{ width: `${(p.qty / maxQty) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div className="top-product-qty">{p.qty} ชิ้น</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
