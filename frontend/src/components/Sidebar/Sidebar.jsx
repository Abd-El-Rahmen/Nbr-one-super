import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Package, Users, BarChart2,
  MessageSquare, AlertCircle, Warehouse, Settings, LogOut, Store, X, Truck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { dashboardAPI } from '../../api';
import styles from './Sidebar.module.css';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  const [pendingOrders, setPendingOrders]     = useState(0);
  const [confirmedOrders, setConfirmedOrders] = useState(0);
  const [shippedOrders, setShippedOrders]     = useState(0);
  const [newMessages, setNewMessages]         = useState(0);
  const [openComplaints, setOpenComplaints]   = useState(0);
  const [lowStock, setLowStock]               = useState(0);
  const [outOfStock, setOutOfStock]           = useState(0);

  const fetchBadges = () => {
    dashboardAPI.getStats()
      .then(res => {
        const d = res.data || {};
        const o = d.orders || {};
        setPendingOrders(Number(o.pending) || 0);
        setConfirmedOrders(Number(o.confirmed) || 0);
        setShippedOrders(Number(o.shipped) || 0);
        setLowStock(Number(d.low_stock_count) || 0);
        setOutOfStock(Number(d.out_of_stock_count) || 0);
        setNewMessages(Number(d.messages?.total) || 0);
        setOpenComplaints(Number(d.complaints?.open) || 0);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchBadges();
    const interval = setInterval(fetchBadges, 5000);
    return () => clearInterval(interval);
  }, []);

  const ordersBadge    = pendingOrders + confirmedOrders + shippedOrders;
  const inventoryBadge = outOfStock + lowStock;

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  const Badge = ({ count, color }) => {
    if (!count || count === 0) return null;
    const bg = color === 'orange' ? '#f59e0b' : color === 'yellow' ? '#eab308' : 'var(--danger)';
    const glow = color === 'orange' ? 'rgba(245,158,11,0.5)' : color === 'yellow' ? 'rgba(234,179,8,0.5)' : 'rgba(230,57,70,0.5)';
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        minWidth: 18, height: 18, borderRadius: 99,
        background: bg, color: '#fff',
        fontSize: '0.68rem', fontWeight: 900, padding: '0 5px',
        flexShrink: 0, lineHeight: 1,
        boxShadow: `0 0 0 2px var(--surface), 0 2px 6px ${glow}`,
        animation: 'pulseBadge 2s infinite',
      }}>
        {count > 99 ? '99+' : count}
      </span>
    );
  };

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
      <div className={styles.brand}>
        <div style={{ width: '100%', height: '65px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <img src="/logo.png" alt="Number One" style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center' }} />
        </div>
        <button className={styles.closeBtn} onClick={onClose} aria-label="إغلاق القائمة">
          <X size={20} />
        </button>
      </div>

      <nav className={styles.nav}>
        <NavLink to="/admin/dashboard" onClick={handleNavClick}
          className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            <LayoutDashboard size={19} />
            <span>لوحة التحكم</span>
          </div>
        </NavLink>

        <NavLink to="/admin/statistics" onClick={handleNavClick}
          className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            <BarChart2 size={19} />
            <span>الإحصائيات</span>
          </div>
        </NavLink>

        <NavLink to="/admin/delivery-pricing" onClick={handleNavClick}
          className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            <Truck size={19} />
            <span>تسعيرة التوصيل</span>
          </div>
        </NavLink>

        <NavLink to="/admin/orders" onClick={handleNavClick}
          className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            <ShoppingCart size={19} />
            <span>الطلبات</span>
          </div>
          <Badge count={ordersBadge} />
        </NavLink>

        <NavLink to="/admin/products" onClick={handleNavClick}
          className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            <Package size={19} />
            <span>المنتجات</span>
          </div>
        </NavLink>

        <NavLink to="/admin/offers" onClick={handleNavClick}
          className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            <Store size={19} />
            <span>العروض والحزم</span>
          </div>
        </NavLink>

        <NavLink to="/admin/categories" onClick={handleNavClick}
          className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            <Package size={19} />
            <span>الأقسام</span>
          </div>
        </NavLink>

        <NavLink to="/admin/inventory" onClick={handleNavClick}
          className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            <Warehouse size={19} />
            <span>المخزون</span>
          </div>
          <Badge count={inventoryBadge} color={outOfStock > 0 ? "danger" : "orange"} />
        </NavLink>

        <NavLink to="/admin/customers" onClick={handleNavClick}
          className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            <Users size={19} />
            <span>العملاء</span>
          </div>
        </NavLink>

        <NavLink to="/admin/complaints" onClick={handleNavClick}
          className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            <MessageSquare size={19} />
            <span>رسائل العملاء</span>
          </div>
          <Badge count={openComplaints} />
        </NavLink>

        {isSuperAdmin && (
          <NavLink to="/admin/users" onClick={handleNavClick}
            className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
              <Settings size={19} />
              <span>إدارة المستخدمين</span>
            </div>
          </NavLink>
        )}
      </nav>

      <div className={styles.footer}>
        <div className={styles.user}>
          <div className={styles.avatar}>{user?.name?.[0] ?? 'A'}</div>
          <div>
            <div className={styles.userName}>{user?.name ?? 'المشرف'}</div>
            <div className={styles.userRole}>{user?.role ?? 'admin'}</div>
          </div>
        </div>
        <button className={styles.logout} onClick={handleLogout}>
          <LogOut size={17} /> خروج
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
