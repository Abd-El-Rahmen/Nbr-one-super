import React, { useState, useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar/Sidebar';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner/Spinner';
import { Menu, X, Store, LogOut } from 'lucide-react';
import styles from './AdminLayout.module.css';

const AdminLayout = () => {
  const { user, loading, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, []);

  if (loading) return <Spinner center size="lg" />;
  if (!user) return <Navigate to="/admin/login" replace />;

  return (
    <div className={styles.layout}>
      {/* Mobile Topbar */}
      <header className={styles.mobileTopbar}>
        <button
          className={styles.hamburger}
          onClick={() => setSidebarOpen(true)}
          aria-label="فتح القائمة"
        >
          <Menu size={22} />
        </button>
        <div className={styles.mobileBrand}>
          <Store size={20} />
          <span>نمبر وان</span>
        </div>
        <button
          className={styles.mobileLogout}
          onClick={() => { logout(); }}
          aria-label="تسجيل الخروج"
        >
          <LogOut size={18} />
        </button>
      </header>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className={styles.overlay}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={styles.content}>
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayout;
