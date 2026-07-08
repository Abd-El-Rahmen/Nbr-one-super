import React, { useEffect, useState, useMemo } from 'react';
import { dashboardAPI } from '../../../api';
import Spinner from '../../../components/Spinner/Spinner';
import s from '../../../styles/admin.module.css';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  TrendingUp, ShoppingBag, Users, DollarSign, XCircle,
  Package, RefreshCw, Clock, ChevronDown, ChevronUp,
  Award, Search, ArrowUp, ArrowDown,
} from 'lucide-react';

/* ── helpers ────────────────────────────────────────────────── */
const COLORS  = ['#1a6b3c','#ff8800','#e63946','#4361ee','#2ec4b6','#f72585','#7209b7','#fb8500'];
const fmt     = n => new Intl.NumberFormat('ar-DZ').format(Math.round(n || 0));
const fmtDec  = n => new Intl.NumberFormat('ar-DZ').format(+(n || 0).toFixed(0));

const STATUS_MAP = {
  pending:   { label: 'قيد الانتظار', color: '#f59e0b' },
  confirmed: { label: 'مؤكد',         color: '#3b82f6' },
  shipped:   { label: 'تم الشحن',     color: '#8b5cf6' },
  delivered: { label: 'تم التسليم',   color: '#10b981' },
  rejected:  { label: 'مرفوض',        color: '#ef4444' },
  failed:    { label: 'فشل',          color: '#6b7280' },
};

const PERIOD_BTNS = [
  { id: 'today', label: 'اليوم' },
  { id: 'week',  label: '7 أيام' },
  { id: 'month', label: 'شهر' },
  { id: 'year',  label: 'سنة' },
  { id: 'custom',label: 'مخصص ✏️' },
];

/* ── KPI Card ──────────────────────────────────────────────── */
const KpiCard = ({ icon: Icon, label, value, sub, color, bg, trend }) => (
  <div style={{
    background: 'var(--surface)', borderRadius: 16, padding: '20px 22px',
    border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10,
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)', transition: 'transform 0.2s, box-shadow 0.2s',
    cursor: 'default',
  }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.09)'; }}
    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; }}
  >
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={22} color={color} strokeWidth={2.5} />
      </div>
      {trend !== undefined && (
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: trend >= 0 ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', gap: 3 }}>
          {trend >= 0 ? <ArrowUp size={13}/> : <ArrowDown size={13}/>}
          {Math.abs(trend)}%
        </span>
      )}
    </div>
    <div>
      <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text)', lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: '0.75rem', color, marginTop: 3, fontWeight: 700 }}>{sub}</div>}
    </div>
  </div>
);

/* ── Custom Tooltip ─────────────────────────────────────────── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 160 }}>
      <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--text-muted)', fontSize: '0.78rem', borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: '0.85rem', marginBottom: 3, alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block', flexShrink: 0 }} />
            <span style={{ color: 'var(--text-muted)' }}>{p.name}</span>
          </span>
          <strong style={{ color: 'var(--text)' }}>{typeof p.value === 'number' && p.value > 100 ? fmt(p.value) + ' دج' : p.value}</strong>
        </div>
      ))}
    </div>
  );
};

/* ── Section Header ─────────────────────────────────────────── */
const SectionHeader = ({ icon, title, sub }) => (
  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 20 }}>
    <span style={{ fontSize: '1.2rem' }}>{icon}</span>
    <div>
      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>{title}</h3>
      {sub && <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2, display: 'block' }}>{sub}</span>}
    </div>
  </div>
);

/* ════════════════════════════════════════════════════════════
   Main Statistics Component
════════════════════════════════════════════════════════════ */
const Statistics = () => {
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [period,     setPeriod]     = useState('week');
  const [startDate,  setStartDate]  = useState('');
  const [endDate,    setEndDate]    = useState('');

  /* products table state */
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [prodSearch,      setProdSearch]      = useState('');
  const [prodSort,        setProdSort]        = useState({ key: 'total_sold', dir: 'desc' });

  const format = d => {
    const off = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - off).toISOString().split('T')[0];
  };

  const loadData = () => {
    setLoading(true);
    const params = {};
    const today = new Date();
    if (period === 'today')        { params.start_date = format(today); params.end_date = format(today); }
    else if (period === 'week')    { const d=new Date(today);d.setDate(d.getDate()-7);   params.start_date=format(d);params.end_date=format(today); }
    else if (period === 'month')   { const d=new Date(today);d.setMonth(d.getMonth()-1); params.start_date=format(d);params.end_date=format(today); }
    else if (period === 'year')    { const d=new Date(today);d.setFullYear(d.getFullYear()-1);params.start_date=format(d);params.end_date=format(today); }
    else if (period==='custom'&&startDate&&endDate) { params.start_date=startDate; params.end_date=endDate; }

    dashboardAPI.getAnalytics(params)
      .then(res => setData(res.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (period === 'custom' && (!startDate || !endDate)) return;
    setShowAllProducts(false);
    setProdSearch('');
    loadData();
  }, [period, startDate, endDate]);

  /* derived */
  const filteredProducts = useMemo(() => {
    if (!data?.top_products) return [];
    let list = [...data.top_products];
    if (prodSearch) list = list.filter(p => p.name.toLowerCase().includes(prodSearch.toLowerCase()));
    list.sort((a, b) => {
      const av = a[prodSort.key] ?? 0, bv = b[prodSort.key] ?? 0;
      return prodSort.dir === 'desc' ? bv - av : av - bv;
    });
    return list;
  }, [data?.top_products, prodSearch, prodSort]);

  const displayedProducts = showAllProducts ? filteredProducts : filteredProducts.slice(0, 10);
  const maxSold = filteredProducts[0]?.total_sold || 1;

  const pieData = (data?.order_status_distribution || [])
    .map(d => ({ ...d, name: STATUS_MAP[d.name]?.label || d.name, fill: STATUS_MAP[Object.keys(STATUS_MAP).find(k=>k===d.name)]?.color || '#999' }));

  const toggleSort = key => setProdSort(s => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }));
  const SortIcon = ({ k }) => prodSort.key === k ? (prodSort.dir === 'desc' ? <ArrowDown size={13}/> : <ArrowUp size={13}/>) : null;

  if (loading && !data) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 400, gap: 16 }}>
      <Spinner center size="lg" />
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>جارٍ تحميل الإحصائيات...</p>
    </div>
  );
  if (error) return <div className={`${s.alert} ${s.alertError}`} style={{ margin: 24 }}>{error}</div>;
  if (!data) return null;

  const kpi = data.kpi || {};

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1400 }} className={s.page}>

      {/* ── Page Header ── */}
      <div className={s.pageHeader} style={{ marginBottom: 24 }}>
        <div className={s.headerText}>
          <h1 className={s.pageTitle} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.6rem' }}>📊</span> التقارير والإحصائيات
          </h1>
          <p className={s.pageSubtitle}>تحليلات شاملة لأداء المتجر والمبيعات</p>
        </div>
        <div className={s.headerActions}>
          <button
            className={`${s.btn} ${s.btnOutline}`}
            onClick={loadData} disabled={loading}
          >
            <RefreshCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> تحديث
          </button>
        </div>
      </div>

      {/* ── Period Selector ── */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '14px 20px', marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-muted)' }}>الفترة:</span>
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg)', padding: 4, borderRadius: 12 }}>
          {PERIOD_BTNS.map(btn => (
            <button key={btn.id} onClick={() => setPeriod(btn.id)} style={{
              padding: '8px 20px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 700, transition: 'all 0.2s',
              background: period === btn.id ? 'var(--primary)' : 'transparent',
              color: period === btn.id ? '#fff' : 'var(--text-muted)',
              boxShadow: period === btn.id ? '0 2px 8px rgba(26,107,60,0.3)' : 'none',
            }}>{btn.label}</button>
          ))}
        </div>
        {period === 'custom' && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input type="date" className={s.input} style={{ height: 38, width: 160 }} value={startDate} onChange={e => setStartDate(e.target.value)} />
            <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>←</span>
            <input type="date" className={s.input} style={{ height: 38, width: 160 }} value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        )}
        {loading && <Spinner size="sm" />}
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16, marginBottom: 28 }}>
        <KpiCard icon={ShoppingBag} label="إجمالي الطلبات"      value={kpi.total_orders ?? '—'}              color="#1a6b3c" bg="rgba(26,107,60,0.1)" />
        <KpiCard icon={DollarSign}  label="إجمالي الإيرادات"    value={fmt(kpi.total_revenue) + ' دج'}       color="#ff8800" bg="rgba(255,136,0,0.1)" />
        <KpiCard icon={TrendingUp}  label="متوسط قيمة الطلب"   value={fmt(kpi.avg_order_value) + ' دج'}     color="#4361ee" bg="rgba(67,97,238,0.1)" />
        <KpiCard icon={Users}       label="عملاء فريدون"         value={kpi.unique_customers ?? '—'}          color="#2ec4b6" bg="rgba(46,196,182,0.1)"
          sub={kpi.new_customers ? `+${kpi.new_customers} عميل جديد` : null} />
        <KpiCard icon={XCircle}     label="نسبة الإلغاء والفشل" value={(kpi.cancellation_rate ?? 0) + '%'}
          color={kpi.cancellation_rate > 20 ? '#e63946' : '#10b981'}
          bg={kpi.cancellation_rate > 20 ? 'rgba(230,57,70,0.1)' : 'rgba(16,185,129,0.1)'} />
      </div>

      {/* ── Revenue Chart ── */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: '24px 28px', marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <SectionHeader icon="📈" title="الإيرادات وحجم الطلبات" sub="تطور المبيعات خلال الفترة المحددة" />
        {data.earnings_chart?.length > 0 ? (
          <div style={{ height: 300 }} dir="ltr">
            <ResponsiveContainer>
              <ComposedChart data={data.earnings_chart} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#1a6b3c" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#1a6b3c" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left"  tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 13 }} />
                <Bar yAxisId="left" name="الإيرادات (دج)" dataKey="revenue" fill="var(--primary)" radius={[8,8,0,0]} barSize={30} />
                <Line yAxisId="right" name="عدد الطلبات" type="monotone" dataKey="orders_count" stroke="#ff8800" strokeWidth={3} dot={{ r: 4, fill: '#ff8800', strokeWidth: 0 }} activeDot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexDirection: 'column', gap: 8 }}>
            <TrendingUp size={40} strokeWidth={1} />
            <span>لا توجد بيانات مبيعات في هذه الفترة</span>
          </div>
        )}
      </div>

      {/* ── Charts Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20, marginBottom: 24 }}>

        {/* Category Pie */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: '24px 28px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <SectionHeader
            icon="🗂️"
            title="المبيعات حسب القسم"
            sub={data.category_distribution?.[0]?._type === 'count' ? 'بناءً على عدد الطلبات' : 'بناءً على الإيرادات (دج)'}
          />
          {data.category_distribution?.length > 0 ? (
            <div style={{ height: 270 }} dir="ltr">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={data.category_distribution} cx="50%" cy="50%" innerRadius={65} outerRadius={105} paddingAngle={4} dataKey="value"
                    label={({ percent }) => percent > 0.05 ? `${(percent*100).toFixed(0)}%` : ''} labelLine={false}>
                    {data.category_distribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip
                    formatter={(v, name, props) => [
                      props.payload._type === 'count' ? `${v} طلب` : fmt(v) + ' دج',
                      props.payload.name
                    ]}
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}
                  />
                  <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 60 }}>لا توجد بيانات</div>}
        </div>

        {/* Order Status Pie */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: '24px 28px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <SectionHeader icon="📊" title="توزيع حالات الطلبات" />
          {pieData?.length > 0 ? (
            <div style={{ height: 270 }} dir="ltr">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={105} dataKey="value"
                    label={({ name, percent }) => percent > 0.06 ? `${(percent*100).toFixed(0)}%` : ''} labelLine={false}>
                    {pieData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                  <Tooltip formatter={v => [v, 'طلبات']} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }} />
                  <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 60 }}>لا توجد بيانات</div>}
        </div>
      </div>

      {/* ── All Selling Products ── */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: '24px 28px', marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
          <SectionHeader icon="🏆" title="ترتيب المنتجات حسب المبيعات" sub={`${filteredProducts.length} منتج في المجموع`} />
          {/* Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 14px', width: 220 }}>
            <Search size={14} color="var(--text-muted)" />
            <input
              placeholder="بحث عن منتج..."
              value={prodSearch}
              onChange={e => setProdSearch(e.target.value)}
              style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.88rem', width: '100%', color: 'var(--text)' }}
            />
          </div>
        </div>

        {filteredProducts.length > 0 ? (
          <>
            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 4px', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, paddingRight: 0 }}>#</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>المنتج</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('total_sold')}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>الوحدات المباعة <SortIcon k="total_sold" /></span>
                    </th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('total_revenue')}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>الإيرادات <SortIcon k="total_revenue" /></span>
                    </th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>نسبة من الأعلى</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedProducts.map((p, i) => {
                    const globalRank = filteredProducts.findIndex(x => x.id === p.id);
                    const barPct = Math.round((p.total_sold / maxSold) * 100);
                    return (
                      <tr key={p.id} style={{
                        background: globalRank < 3 ? `rgba(${globalRank===0?'255,215,0':globalRank===1?'192,192,192':'205,127,50'},0.07)` : 'var(--bg)',
                        borderRadius: 10, transition: 'background 0.15s',
                      }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-light)'}
                        onMouseLeave={e => e.currentTarget.style.background = globalRank < 3 ? `rgba(${globalRank===0?'255,215,0':globalRank===1?'192,192,192':'205,127,50'},0.07)` : 'var(--bg)'}
                      >
                        <td style={{ padding: '12px 12px 12px 0', borderRadius: '10px 0 0 10px' }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem', fontWeight: 900,
                            background: globalRank===0?'#ffd700':globalRank===1?'#c0c0c0':globalRank===2?'#cd7f32':'var(--surface)',
                            color: globalRank < 3 ? '#fff' : 'var(--text-muted)', border: '1px solid var(--border)',
                          }}>{globalRank+1}</div>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {p.image_url
                              ? <img src={p.image_url} alt={p.name} style={{ width: 38, height: 38, borderRadius: 8, objectFit: 'cover', flexShrink: 0, border: '1px solid var(--border)' }} />
                              : <div style={{ width: 38, height: 38, borderRadius: 8, background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid var(--border)' }}><Package size={16} color="var(--text-muted)" /></div>
                            }
                            <span style={{ fontWeight: 700, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px', fontWeight: 900, color: 'var(--primary)', fontSize: '1rem' }}>
                          {p.total_sold} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>قطعة</span>
                        </td>
                        <td style={{ padding: '12px', fontWeight: 700 }}>{fmt(p.total_revenue)} دج</td>
                        <td style={{ padding: '12px', borderRadius: '0 10px 10px 0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, height: 8, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                              <div style={{ height: '100%', borderRadius: 99, background: globalRank===0?'#ffd700':globalRank===1?'#c0c0c0':globalRank===2?'#cd7f32':'var(--primary)', width: `${barPct}%`, transition: 'width 0.5s ease' }} />
                            </div>
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', width: 32, textAlign: 'left' }}>{barPct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Show more / less */}
            {filteredProducts.length > 10 && (
              <button
                onClick={() => setShowAllProducts(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, margin: '16px auto 0', padding: '10px 28px', borderRadius: 10,
                  border: '1.5px solid var(--primary)', background: showAllProducts ? 'var(--primary)' : 'transparent',
                  color: showAllProducts ? '#fff' : 'var(--primary)', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                {showAllProducts ? <><ChevronUp size={16}/> عرض أقل</> : <><ChevronDown size={16}/> عرض جميع المنتجات ({filteredProducts.length})</>}
              </button>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <Award size={44} strokeWidth={1} />
            <span style={{ fontWeight: 600 }}>{prodSearch ? 'لا توجد نتائج للبحث' : 'لا توجد مبيعات في هذه الفترة'}</span>
          </div>
        )}
      </div>

      {/* ── Slow Moving Products ── */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: '24px 28px', marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <SectionHeader icon="⏳" title="المنتجات بطيئة الحركة" sub="منتجات نشطة بيعت أقل من 5 وحدات في الفترة — تحتاج إلى عروض ترويجية" />
        {data.slow_products?.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 4px', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>المنتج</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>مُباع</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>الإيرادات</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>المخزون</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {data.slow_products.map(p => (
                  <tr key={p.id} style={{ background: 'var(--bg)', borderRadius: 10 }}>
                    <td style={{ padding: '12px', borderRadius: '10px 0 0 10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {p.image_url
                          ? <img src={p.image_url} alt={p.name} style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border)' }} />
                          : <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}><Package size={14} color="var(--text-muted)" /></div>
                        }
                        <span style={{ fontWeight: 700 }}>{p.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px', fontWeight: 900, color: p.total_sold === 0 ? '#e63946' : '#f59e0b', fontSize: '1rem' }}>
                      {p.total_sold}
                    </td>
                    <td style={{ padding: '12px', fontWeight: 700 }}>{fmt(p.total_revenue)} دج</td>
                    <td style={{ padding: '12px', fontWeight: 700, color: p.stock_available === 0 ? '#e63946' : p.stock_available < 10 ? '#f59e0b' : 'var(--text)' }}>
                      {p.stock_available}
                    </td>
                    <td style={{ padding: '12px', borderRadius: '0 10px 10px 0' }}>
                      {p.total_sold === 0
                        ? <span style={{ background: '#fde8ea', color: '#e63946', borderRadius: 20, padding: '4px 12px', fontSize: '0.78rem', fontWeight: 700 }}>لا مبيعات ⚠️</span>
                        : <span style={{ background: '#fef3e2', color: '#f59e0b', borderRadius: 20, padding: '4px 12px', fontSize: '0.78rem', fontWeight: 700 }}>بطيء 🐌</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '2rem' }}>🎉</span>
            <span style={{ fontWeight: 700, color: '#10b981' }}>رائع! جميع منتجاتك تبيع بشكل ممتاز في هذه الفترة.</span>
          </div>
        )}
      </div>

      {/* ── Top Customers ── */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: '24px 28px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <SectionHeader icon="⭐" title="أفضل العملاء شراءً" />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 4px', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>#</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>العميل</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>رقم الهاتف</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>عدد الطلبات</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>إجمالي المشتريات</th>
              </tr>
            </thead>
            <tbody>
              {data.top_customers?.map((c, i) => (
                <tr key={c.id} style={{ background: 'var(--bg)', borderRadius: 10 }}>
                  <td style={{ padding: '12px', borderRadius: '10px 0 0 10px' }}>
                    <span style={{
                      width: 28, height: 28, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      background: i===0?'#ffd700':i===1?'#c0c0c0':i===2?'#cd7f32':'var(--surface)',
                      color: i < 3 ? '#fff' : 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 900, border: '1px solid var(--border)',
                    }}>{i+1}</span>
                  </td>
                  <td style={{ padding: '12px', fontWeight: 700 }}>{c.full_name}</td>
                  <td style={{ padding: '12px', color: 'var(--text-muted)' }} dir="ltr">{c.phone}</td>
                  <td style={{ padding: '12px', fontWeight: 800, color: 'var(--primary)' }}>{c.total_orders} طلب</td>
                  <td style={{ padding: '12px', fontWeight: 800, borderRadius: '0 10px 10px 0' }}>{fmt(c.total_spent)} دج</td>
                </tr>
              ))}
              {(!data.top_customers || data.top_customers.length === 0) && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>لا يوجد عملاء في هذه الفترة</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default Statistics;
