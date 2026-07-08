import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCart, DollarSign, Users, Package,
  AlertTriangle, MessageSquare, TrendingUp, ArrowLeft
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { dashboardAPI } from '../../../api';
import Spinner from '../../../components/Spinner/Spinner';
import s from '../../../styles/admin.module.css';
import t from '../../../components/Table/Table.module.css';
import ds from './Dashboard.module.css';

const fmt = (n) => new Intl.NumberFormat('ar-DZ').format(n);

const statusLabel = {
  pending: 'قيد الانتظار',
  confirmed: 'مؤكد',
  delivered: 'تم التوصيل',
  rejected: 'مرفوض',
  failed: 'فشل',
};

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    dashboardAPI.getStats()
      .then(res => setStats(res.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner center size="lg" />;
  if (error) return <div className={`${s.alert} ${s.alertError}`}>{error}</div>;

  const { orders, revenue, customers, products, top_products, low_stock, complaints } = stats;

  const calcTrend = (today, yesterday) => {
    if (yesterday === 0) return today > 0 ? '+100%' : '0%';
    const diff = today - yesterday;
    const pct = (diff / yesterday) * 100;
    const isPos = pct > 0;
    return <span style={{ color: isPos ? 'var(--success)' : (pct < 0 ? 'var(--danger)' : 'inherit'), fontWeight: 700 }}>
      {isPos ? '+' : ''}{Math.round(pct)}%
    </span>;
  };

  return (
    <div className={ds.dashPage}>

      {/* Page Header */}
      <div className={s.pageHeader}>
        <div className={s.headerText}>
          <h1 className={s.pageTitle}>لوحة التحكم</h1>
          <p className={s.pageSubtitle}>نظرة عامة على أداء المتجر</p>
        </div>
      </div>

      {/* KPI Row */}
      <div className={s.kpiRow}>
        <div className={s.kpiCard}>
          <div>
            <div className={s.kpiLabel}>طلبات اليوم</div>
            <div className={s.kpiValue}>{fmt(orders.today)}</div>
            <div className={s.kpiSub}>
              {calcTrend(orders.today, orders.yesterday)} مقارنة بأمس (إجمالي: {fmt(orders.total)})
            </div>
          </div>
          <div className={s.kpiIcon}><ShoppingCart size={22} /></div>
        </div>

        <div className={s.kpiCard}>
          <div>
            <div className={s.kpiLabel}>إيرادات اليوم</div>
            <div className={s.kpiValue}>{fmt(Math.round(revenue.today))}.00</div>
            <div className={s.kpiSub}>
              {calcTrend(revenue.today, revenue.yesterday)} مقارنة بأمس (إجمالي: {fmt(Math.round(revenue.total))})
            </div>
          </div>  
          <div className={s.kpiIcon}><DollarSign size={22} /></div>
        </div>

        <div className={s.kpiCard}>
          <div>
            <div className={s.kpiLabel}>إجمالي العملاء</div>
            <div className={s.kpiValue}>{fmt(customers.total)}</div>
            <div className={s.kpiSub}>منتجات نشطة: {products.active}</div>
          </div>
          <div className={s.kpiIcon}><Users size={22} /></div>
        </div>

        <div className={`${s.kpiCard} ${complaints.open > 0 ? s.error : ''}`}>
          <div>
            <div className={s.kpiLabel}>شكاوى مفتوحة</div>
            <div className={s.kpiValue}>{fmt(complaints.open)}</div>
            <div className={s.kpiSub}>
              {complaints.open > 0 ? 'تتطلب المتابعة' : 'لا توجد شكاوى'}
            </div>
          </div>
          <div className={`${s.kpiIcon} ${complaints.open > 0 ? s.error : ''}`}>
            <AlertTriangle size={22} />
          </div>
        </div>
      </div>

      {/* Two column grid — collapses on mobile */}
      <div className={ds.twoCol}>

        {/* Top Products */}
        <div className={s.card}>
          <div className={ds.cardHeader}>
            <h2 className={ds.cardTitle}>
              <TrendingUp size={18} /> أكثر المنتجات مبيعاً
            </h2>
            <Link to="/admin/products" className={ds.cardLink}>
              عرض الكل <ArrowLeft size={14} />
            </Link>
          </div>
          <div className={ds.cardBody}>
            {top_products.length === 0 ? (
              <p className={ds.emptyMsg}>لا توجد بيانات بعد</p>
            ) : top_products.map((p, i) => (
              <div key={p.id} className={`${ds.productRow} ${i < top_products.length - 1 ? ds.productRowBorder : ''}`}>
                <span className={ds.productRank}>{i + 1}</span>
                {p.image_url && (
                  <img src={p.image_url} alt={p.name} className={ds.productImg} />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{p.name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{fmt(p.total_sold)} وحدة مباعة</div>
                </div>
                <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                  {fmt(Math.round(p.total_revenue))} دج
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Low Stock */}
        <div className={s.card}>
          <div className={ds.cardHeader}>
            <h2 className={ds.cardTitle} style={{ color: low_stock.length > 0 ? 'var(--danger)' : 'var(--text)' }}>
              <Package size={18} /> مخزون منخفض (أقل من 5)
            </h2>
            <Link to="/admin/inventory" className={ds.cardLink}>
              إعادة التخزين <ArrowLeft size={14} />
            </Link>
          </div>
          {low_stock.length === 0 ? (
            <p className={ds.emptyMsg} style={{ padding: '24px' }}>✅ جميع المنتجات لديها مخزون كافٍ</p>
          ) : (
            <div className={t.wrapper}>
              <table className={t.table}>
                <thead>
                  <tr>
                    <th>المنتج</th>
                    <th>المتغير</th>
                    <th>الكمية</th>
                  </tr>
                </thead>
                <tbody>
                  {low_stock.map(item => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 700 }}>{item.product_name}</td>
                      <td>{item.variant_name}</td>
                      <td>
                        <span style={{ background: item.stock_quantity === 0 ? 'var(--danger-bg)' : 'var(--warning-bg)', color: item.stock_quantity === 0 ? 'var(--danger)' : 'var(--warning)', padding: '3px 10px', borderRadius: 'var(--radius-pill)', fontWeight: 800, fontSize: '0.82rem' }}>
                          {item.stock_quantity === 0 ? 'نفد' : item.stock_quantity}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Revenue last 7 days */}
      <div className={s.card}>
        <div className={ds.cardHeader}>
          <h2 className={ds.cardTitle}>
            <TrendingUp size={18} /> إيرادات آخر 7 أيام
          </h2>
        </div>
        {revenue.daily.length === 0 ? (
          <p className={ds.emptyMsg} style={{ padding: 24 }}>لا توجد بيانات في آخر 7 أيام</p>
        ) : (
          <div style={{ width: '100%', height: 320, padding: '20px 20px 10px 0' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenue.daily} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} tickMargin={10} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} tickFormatter={n => `${n} دج`} />
                <Tooltip
                  cursor={{ fill: 'var(--bg)' }}
                  contentStyle={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}
                  formatter={(val) => [`${fmt(Math.round(val))} دج`, 'الإيرادات']}
                  labelStyle={{ fontWeight: 800, marginBottom: 5, color: 'var(--text)' }}
                  itemStyle={{ color: 'var(--primary)', fontWeight: 700 }}
                />
                <Bar dataKey="revenue" fill="var(--primary)" radius={[6, 6, 0, 0]} maxBarSize={60} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

    </div>
  );
};

export default Dashboard;
