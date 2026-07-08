import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, RefreshCw, ClipboardList, AlertCircle, ShoppingBag, Printer } from 'lucide-react';
import { ordersAPI } from '../../../api';

const fmt = n => new Intl.NumberFormat('ar-DZ').format(Math.round(n));

const STATUS_CONFIG = {
  pending:   { label: 'قيد الانتظار',     color: '#f59e0b', bg: '#fef3c7', icon: '⏳' },
  confirmed: { label: 'جاري التحضير',     color: '#3b82f6', bg: '#dbeafe', icon: '📦' },
  shipped:   { label: 'تم الشحن',         color: '#8b5cf6', bg: '#ede9fe', icon: '🚚' },
  delivered: { label: 'تم التوصيل ✅',    color: '#059669', bg: '#d1fae5', icon: '✅' },
  rejected:  { label: 'ملغى',             color: '#ef4444', bg: '#fee2e2', icon: '❌' },
  failed:    { label: 'فشل التوصيل',      color: '#dc2626', bg: '#fee2e2', icon: '⚠️' },
};

const MyOrders = () => {
  const [savedOrders, setSavedOrders] = useState([]);
  const [orderDetails, setOrderDetails] = useState({}); // { orderId: { status, items, ... } }
  const [loading, setLoading] = useState(false);
  const [searchId, setSearchId] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('my_orders') || '[]');
      setSavedOrders(stored);
      if (stored.length > 0) fetchStatuses(stored);
    } catch {
      setSavedOrders([]);
    }
  }, []);

  const fetchStatuses = async (orders) => {
    setLoading(true);
    const details = {};
    await Promise.all(orders.map(async (o) => {
      try {
        const res = await ordersAPI.track(o.id, o.phone);
        details[o.id] = res.data;
      } catch {
        details[o.id] = null;
      }
    }));
    setOrderDetails(details);
    setLoading(false);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchId || !searchPhone) return;
    setSearching(true);
    setSearchError('');
    setSearchResult(null);
    try {
      const res = await ordersAPI.track(searchId.trim(), searchPhone.trim());
      setSearchResult(res.data);
    } catch (err) {
      setSearchError(err.message || 'لم يتم العثور على الطلب. تأكد من رقم الطلب ورقم الهاتف.');
    } finally {
      setSearching(false);
    }
  };

  const removeOrder = (id) => {
    const updated = savedOrders.filter(o => o.id !== id);
    setSavedOrders(updated);
    localStorage.setItem('my_orders', JSON.stringify(updated));
    const newDetails = { ...orderDetails };
    delete newDetails[id];
    setOrderDetails(newDetails);
  };

  const handlePrint = (savedOrder, detail) => {
    if (!detail) return; // Need details to print full receipt
    const items = detail?.items || [];
    const id = savedOrder.id;
    const subTotal = items.reduce((s, i) => s + i.price_at_purchase * i.quantity, 0);
    const delivFee = parseFloat(savedOrder.delivery_fee || 0);
    const grandTotal = subTotal + delivFee;

    const itemsHtml = items.map(item => `
      <tr style="border-bottom: 1px solid #f3f4f6">
        <td style="padding: 8px 10px; color: #1f2937; font-weight: 600">
          ${item.product_name} ${item.variant_name ? `(${item.variant_name})` : ''}
        </td>
        <td style="padding: 8px 10px; text-align: center; color: #6b7280">×${item.quantity}</td>
        <td style="padding: 8px 10px; text-align: left; font-weight: 700; color: #059669">
          ${new Intl.NumberFormat('ar-DZ').format(Math.round(item.price_at_purchase * item.quantity))} دج
        </td>
      </tr>
    `).join('');

    const content = `
      <div style="background: #fff; border-radius: 16px; padding: 32px; max-width: 560px; margin: 0 auto; border: 1px solid #e5e7eb; box-shadow: 0 4px 24px rgba(0,0,0,0.07)">
        <div style="text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px dashed #e5e7eb">
          <div style="font-size: 1.4rem; font-weight: 900; color: #059669; letter-spacing: 1px">NUMBER ONE</div>
          <div style="font-size: 0.85rem; color: #6b7280; margin-top: 4px">سوبرماركت رقم واحد</div>
          <div style="margin-top: 12px; display: inline-block; background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 8px; padding: 4px 16px">
            <span style="font-weight: 800; color: #16a34a; font-size: 1rem">رقم الطلب: #${id}</span>
          </div>
        </div>
        <div style="display: flex; gap: 16px; margin-bottom: 20px; flex-wrap: wrap">
          <div style="flex: 1; min-width: 180px; background: #f9fafb; border-radius: 10px; padding: 12px 16px">
            <div style="font-weight: 700; margin-bottom: 6px; color: #374151; font-size: 0.88rem">👤 بيانات العميل</div>
            <div style="font-size: 0.85rem; color: #4b5563; line-height: 1.8">
              <div><strong>الاسم:</strong> ${detail?.full_name || 'غير متوفر'}</div>
              <div><strong>الهاتف:</strong> ${savedOrder.phone}</div>
            </div>
          </div>
          <div style="flex: 1; min-width: 180px; background: #f9fafb; border-radius: 10px; padding: 12px 16px">
            <div style="font-weight: 700; margin-bottom: 6px; color: #374151; font-size: 0.88rem">📍 عنوان التوصيل</div>
            <div style="font-size: 0.85rem; color: #4b5563; line-height: 1.8">
              <div><strong>الولاية:</strong> ${savedOrder.wilaya}</div>
              <div><strong>البلدية:</strong> ${savedOrder.commune}</div>
              ${savedOrder.delivery_type === 'home' && detail?.address_line ? `<div><strong>العنوان:</strong> ${detail.address_line}</div>` : ''}
              <div><strong>النوع:</strong> ${savedOrder.delivery_type === 'home' ? '🏠 توصيل للمنزل' : '🏢 مكتب توقف'}</div>
            </div>
          </div>
        </div>
        <div style="margin-bottom: 16px">
          <div style="font-weight: 700; margin-bottom: 10px; color: #374151; font-size: 0.88rem">🛒 تفاصيل الطلب</div>
          <table style="width: 100%; border-collapse: collapse; font-size: 0.84rem">
            <thead>
              <tr style="background: #f3f4f6">
                <th style="padding: 8px 10px; text-align: right; border-radius: 6px 0 0 6px; color: #374151">المنتج</th>
                <th style="padding: 8px 10px; text-align: center; color: #374151">الكمية</th>
                <th style="padding: 8px 10px; text-align: left; border-radius: 0 6px 6px 0; color: #374151">السعر</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
        </div>
        <div style="background: #f9fafb; border-radius: 10px; padding: 12px 16px">
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 0.9rem; color: #6b7280">
            <span>المجموع الفرعي</span>
            <span>${new Intl.NumberFormat('ar-DZ').format(Math.round(subTotal))} دج</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 0.9rem; color: #6b7280">
            <span>رسوم التوصيل</span>
            <span>${new Intl.NumberFormat('ar-DZ').format(delivFee)} دج</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding-top: 10px; border-top: 2px solid #e5e7eb; font-weight: 900; font-size: 1.05rem; color: #059669">
            <span>الإجمالي الكلي</span>
            <span>${new Intl.NumberFormat('ar-DZ').format(Math.round(grandTotal))} دج</span>
          </div>
        </div>
        <div style="text-align: center; margin-top: 20px; padding-top: 16px; border-top: 2px dashed #e5e7eb; color: #9ca3af; font-size: 0.78rem">
          <div>${new Date(savedOrder.date).toLocaleString('ar-DZ')}</div>
          <div style="margin-top: 4px">شكراً لتسوقكم من NumberOne 💚</div>
        </div>
      </div>
    `;

    const printWin = window.open('', '_blank', 'width=640,height=900');
    printWin.document.write(`
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <title>فاتورة طلب #${id} - NumberOne</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;900&display=swap');
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Tajawal', Arial, sans-serif; background: #fff; padding: 24px; color: #1f2937; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 8px 10px; }
            @media print { body { padding: 0; } .no-print { display: none !important; } }
          </style>
        </head>
        <body>
          ${content}
          <div class="no-print" style="text-align:center;margin-top:24px">
            <button onclick="window.print()" style="background:#059669;color:#fff;border:none;padding:12px 32px;border-radius:10px;font-size:1rem;font-family:Tajawal,Arial,sans-serif;font-weight:700;cursor:pointer">
              🖨️ طباعة / حفظ كصورة PDF
            </button>
          </div>
        </body>
      </html>
    `);
    printWin.document.close();
    printWin.focus();
  };

  const renderStatusBadge = (status) => {
    const cfg = STATUS_CONFIG[status] || { label: status, color: '#6b7280', bg: '#f3f4f6', icon: '❓' };
    return (
      <span style={{
        background: cfg.bg,
        color: cfg.color,
        fontWeight: 700,
        fontSize: '0.82rem',
        padding: '4px 12px',
        borderRadius: 20,
        border: `1px solid ${cfg.color}33`,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
      }}>
        {cfg.icon} {cfg.label}
      </span>
    );
  };

  const renderOrderCard = (savedOrder, detail, onRemove) => {
    const status = detail?.status || 'pending';
    const items = detail?.items || [];
    const id = savedOrder.id;

    return (
      <div key={id} style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 16,
        padding: '20px 24px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        transition: 'transform 0.2s, box-shadow 0.2s',
        direction: 'rtl',
      }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'; e.currentTarget.style.transform = 'none'; }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: '1.1rem', color: '#059669' }}>طلب #{id}</div>
            <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: 2 }}>
              {new Date(savedOrder.date).toLocaleString('ar-DZ')}
            </div>
          </div>
          {detail ? renderStatusBadge(status) : (
            <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>⏳ جاري التحقق...</span>
          )}
        </div>

        {/* Location */}
        <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: 12 }}>
          📍 {savedOrder.wilaya} — {savedOrder.commune} &nbsp;|&nbsp;
          {savedOrder.delivery_type === 'home' ? '🏠 توصيل للمنزل' : '🏢 مكتب توقف'}
        </div>

        {/* Items */}
        {items.length > 0 && (
          <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 12, marginBottom: 12 }}>
            {items.slice(0, 3).map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', color: '#374151', marginBottom: 4 }}>
                <span>{item.product_name} {item.variant_name ? `(${item.variant_name})` : ''} ×{item.quantity}</span>
                <span style={{ fontWeight: 700, color: '#059669' }}>{fmt(item.price_at_purchase * item.quantity)} دج</span>
              </div>
            ))}
            {items.length > 3 && (
              <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>+ {items.length - 3} منتجات أخرى</div>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ fontWeight: 900, fontSize: '1rem', color: '#1f2937' }}>
            الإجمالي: <span style={{ color: '#059669' }}>{fmt(savedOrder.total)} دج</span>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {detail && (
              <button
                onClick={() => handlePrint(savedOrder, detail)}
                style={{ background: '#f3f4f6', border: 'none', color: '#374151', padding: '6px 12px', borderRadius: 8, fontSize: '0.8rem', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Printer size={14} /> الفاتورة
              </button>
            )}
            <button
              onClick={() => onRemove(id)}
              style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }}
            >
              إزالة من قائمتي
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-light)', padding: '32px 16px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', direction: 'rtl' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, background: 'rgba(5,150,105,0.1)', borderRadius: '50%', marginBottom: 12 }}>
            <Package size={32} color="#059669" />
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text)', marginBottom: 6 }}>طلباتي 📦</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            تتبع حالة طلباتك السابقة من هذا الجهاز
          </p>
        </div>

        {/* Search by Order Number */}
        <div style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 16,
          padding: '24px',
          marginBottom: 32,
          boxShadow: '0 2px 12px rgba(0,0,0,0.05)'
        }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16, color: '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ClipboardList size={18} color="#059669" /> البحث برقم الطلب
          </h2>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              type="number"
              placeholder="رقم الطلب (مثال: 123)"
              value={searchId}
              onChange={e => setSearchId(e.target.value)}
              style={{
                flex: 1, minWidth: 120,
                padding: '10px 14px',
                border: '1.5px solid #d1d5db',
                borderRadius: 10,
                fontSize: '0.9rem',
                outline: 'none',
                direction: 'rtl',
              }}
            />
            <input
              type="tel"
              placeholder="رقم الهاتف (مثال: 0550123456)"
              value={searchPhone}
              onChange={e => setSearchPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              style={{
                flex: 1, minWidth: 160,
                padding: '10px 14px',
                border: '1.5px solid #d1d5db',
                borderRadius: 10,
                fontSize: '0.9rem',
                outline: 'none',
                direction: 'rtl',
              }}
            />
            <button
              type="submit"
              disabled={searching || !searchId || !searchPhone}
              style={{
                background: '#059669', color: '#fff',
                border: 'none', borderRadius: 10,
                padding: '10px 20px',
                fontWeight: 700, fontSize: '0.9rem',
                cursor: searching ? 'wait' : 'pointer',
                opacity: (!searchId || !searchPhone) ? 0.6 : 1,
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {searching ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <ClipboardList size={16} />}
              {searching ? 'جاري البحث...' : 'بحث'}
            </button>
          </form>

          {searchError && (
            <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 14px', color: '#dc2626', fontSize: '0.88rem', fontWeight: 600 }}>
              <AlertCircle size={16} /> {searchError}
            </div>
          )}

          {searchResult && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 8, color: '#059669' }}>✅ تم العثور على الطلب:</div>
              {renderOrderCard(
                {
                  id: searchResult.id,
                  phone: searchPhone,
                  date: searchResult.created_at,
                  total: parseFloat(searchResult.total_price),
                  wilaya: searchResult.wilaya || '',
                  commune: searchResult.commune || '',
                  delivery_type: searchResult.delivery_type,
                  delivery_fee: parseFloat(searchResult.delivery_fee || 0),
                },
                searchResult,
                () => setSearchResult(null)
              )}
            </div>
          )}
        </div>

        {/* Saved Orders */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShoppingBag size={18} color="#059669" /> طلباتي المحفوظة {savedOrders.length > 0 && <span style={{ background: '#d1fae5', color: '#059669', borderRadius: 20, padding: '2px 10px', fontSize: '0.8rem', fontWeight: 800 }}>{savedOrders.length}</span>}
            </h2>
            {savedOrders.length > 0 && (
              <button
                onClick={() => fetchStatuses(savedOrders)}
                disabled={loading}
                style={{ background: 'none', border: '1.5px solid #d1d5db', borderRadius: 8, padding: '6px 12px', fontSize: '0.8rem', color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
              >
                <RefreshCw size={14} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
                تحديث الحالات
              </button>
            )}
          </div>

          {savedOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 24px', background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb' }}>
              <Package size={48} color="#d1d5db" style={{ marginBottom: 12 }} />
              <p style={{ color: '#9ca3af', fontWeight: 600, marginBottom: 8 }}>لا توجد طلبات محفوظة على هذا الجهاز</p>
              <p style={{ color: '#d1d5db', fontSize: '0.85rem', marginBottom: 20 }}>
                الطلبات تُحفظ تلقائياً بعد إتمام الدفع على هذا المتصفح
              </p>
              <Link to="/shop" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: '#059669', color: '#fff',
                padding: '10px 24px', borderRadius: 10,
                fontWeight: 700, textDecoration: 'none', fontSize: '0.9rem'
              }}>
                <ShoppingBag size={16} /> ابدأ التسوق
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {savedOrders.map(o => renderOrderCard(o, orderDetails[o.id], removeOrder))}
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 32, color: '#9ca3af', fontSize: '0.78rem' }}>
          💡 الطلبات محفوظة في هذا المتصفح فقط. إذا استخدمت متصفحاً آخر، ابحث برقم الطلب ورقم هاتفك.
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default MyOrders;
