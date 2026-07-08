import React, { useEffect, useState, useCallback } from 'react';
import { Eye, RefreshCw, Printer, ChevronDown, ChevronUp } from 'lucide-react';
import { ordersAPI, dashboardAPI } from '../../../api';
import Spinner from '../../../components/Spinner/Spinner';
import Modal from '../../../components/Modal/Modal';
import s from '../../../styles/admin.module.css';
import t from '../../../components/Table/Table.module.css';

const STATUS_LABELS = {
  pending: 'قيد الانتظار',
  confirmed: 'التحضير',
  shipped: 'تم الشحن',
  rejected: 'مرفوض',
  delivered: 'تم التوصيل',
  failed: 'فشل',
};
const STATUS_OPTIONS = Object.keys(STATUS_LABELS);

const fmt = n => new Intl.NumberFormat('ar-DZ').format(n);

// XSS Prevention for Print Invoice
const escapeHTML = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');

  // Detail modal
  const [selected, setSelected] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    dashboardAPI.getStats().then(res => setStats(res.data.orders || res.data)).catch(console.error);

    const params = { page, limit: 20 };
    if (statusFilter) params.status = statusFilter;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    ordersAPI.getAll(params)
      .then(res => {
        setOrders(res.data);
        setPagination(res.pagination || {});
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [page, statusFilter, startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (id) => {
    try {
      const res = await ordersAPI.getOne(id);
      setSelected(res.data);
      setNewStatus(res.data.status);
      setShowHistory(false);
      setDetailOpen(true);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleStatusUpdate = async (statusToSet) => {
    if (!statusToSet || statusToSet === selected.status) return;
    setUpdatingStatus(true);
    try {
      await ordersAPI.updateStatus(selected.id, statusToSet);
      setSelected({ ...selected, status: statusToSet });
      setDetailOpen(false);
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handlePrint = (ordersToPrint) => {
    const list = Array.isArray(ordersToPrint) ? ordersToPrint : [selected];
    if (!list || list.length === 0) return;
    const printWindow = window.open('', '_blank');
    
    let html = `
      <html dir="rtl" lang="ar">
        <head>
          <title>طباعة الفواتير</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;900&display=swap');
            body { font-family: 'Tajawal', sans-serif; color: #333; margin: 0; padding: 0; background: #fff; }
            .invoice-page { padding: 40px; page-break-after: always; box-sizing: border-box; }
            .invoice-page:last-child { page-break-after: auto; }
            .header { text-align: center; margin-bottom: 30px; display: flex; flex-direction: column; align-items: center; }
            .header img { height: 60px; margin-bottom: 10px; }
            .header h1 { margin: 0; color: #2ec4b6; font-size: 28px; }
            .header p { margin: 5px 0; color: #777; }
            .details-box { display: flex; justify-content: space-between; background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
            .details-section h4 { margin-top: 0; margin-bottom: 10px; color: #555; }
            .details-section p { margin: 5px 0; font-weight: bold; }
            .details-section span { font-weight: normal; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { background: #f1f1f1; padding: 12px; text-align: right; border-bottom: 2px solid #ddd; }
            td { padding: 12px; border-bottom: 1px solid #eee; }
            .total-row td { font-weight: 700; font-size: 16px; border-top: 1px solid #ddd; }
            .grand-total td { font-weight: 900; font-size: 18px; border-top: 2px solid #333; }
            .footer { text-align: center; margin-top: 50px; color: #888; font-size: 14px; border-top: 1px solid #eee; padding-top: 20px; }
            @media print { body { padding: 0; } .no-print { display: none; } }
          </style>
        </head>
        <body>
    `;

    list.forEach(order => {
      html += `
        <div class="invoice-page">
          <div class="header">
            <img src="/logo.png" alt="NumberOne Logo" />
            <h1>NumberOne</h1>
            <p>فاتورة بيع رقم #${order.id}</p>
            <p>التاريخ: ${new Date().toLocaleString('ar-DZ')}</p>
          </div>

          <div class="details-box">
            <div class="details-section">
              <h4>تفاصيل العميل</h4>
              <p><span>الاسم:</span> ${escapeHTML(order.full_name) || 'غير محدد'}</p>
              <p><span>الهاتف:</span> ${escapeHTML(order.phone) || 'غير محدد'}</p>
              <p><span>الولاية:</span> ${escapeHTML(order.wilaya) || 'غير محدد'} - <span>البلدية:</span> ${escapeHTML(order.commune) || 'غير محدد'}</p>
              <p><span>العنوان:</span> ${escapeHTML(order.address_line) || 'غير محدد'}</p>
            </div>
            <div class="details-section">
              <h4>تفاصيل الطلب</h4>
              <p><span>تاريخ الطلب:</span> ${new Date(order.created_at).toLocaleString('ar-DZ')}</p>
              <p><span>طريقة الدفع:</span> ${order.payment_method === 'COD' ? 'دفع عند الاستلام' : escapeHTML(order.payment_method)}</p>
              <p><span>طريقة التوصيل:</span> ${order.delivery_type === 'stop_desk' ? 'مكتب توقف (Stop Desk)' : 'توصيل للمنزل'}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>المنتج</th>
                <th>الكمية</th>
                <th>سعر الوحدة</th>
                <th>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              ${(order.items || []).map(item => `
                <tr>
                  <td>${escapeHTML(item.product_name)} ${item.variant_name ? '(' + escapeHTML(item.variant_name) + ')' : ''}</td>
                  <td>${item.quantity}</td>
                  <td>${fmt(Math.round(item.price_at_purchase))} دج</td>
                  <td>${fmt(Math.round(item.price_at_purchase * item.quantity))} دج</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="3">المجموع الفرعي</td>
                <td>${fmt(Math.round(order.total_price) - Number(order.delivery_fee || 0))} دج</td>
              </tr>
              <tr class="total-row">
                <td colspan="3">رسوم التوصيل (Livraison)</td>
                <td>${fmt(Number(order.delivery_fee || 0))} دج</td>
              </tr>
              <tr class="grand-total">
                <td colspan="3">الإجمالي الكلي المكتوب</td>
                <td style="color: #2ec4b6;">${fmt(Math.round(order.total_price))} دج</td>
              </tr>
            </tbody>
          </table>

          ${order.notes ? `
          <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border-right: 4px solid #ffc107;">
            <strong>ملاحظة من العميل:</strong> ${escapeHTML(order.notes)}
          </div>
          ` : ''}

          <div class="footer">
            <p>شكراً لتسوقكم من NumberOne!</p>
            <p>للتواصل: support@numberone.dz</p>
          </div>
        </div>
      `;
    });

    html += `</body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  return (
    <div className={`${s.page} ${s.pageWrapper}`}>
      <div className={s.pageHeader}>
        <div className={s.headerText}>
          <h1 className={s.pageTitle}>الطلبات</h1>
          <p className={s.pageSubtitle}>إدارة جميع طلبات العملاء وتحديث حالاتها</p>
        </div>
        <div className={s.headerActions}>
          <button className={`${s.btn} ${s.btnOutline}`} onClick={load}>
            <RefreshCw size={16} /> تحديث
          </button>
        </div>
      </div>

      <div className={s.card}>
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '20px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-light)', borderTopLeftRadius: 'var(--radius-lg)', borderTopRightRadius: 'var(--radius-lg)', flexWrap: 'wrap' }}>
          {[
            { id: '',          label: 'الكل',          icon: '📋'  },
            { id: 'pending',   label: 'جديد',          icon: '🆕',  count: stats?.pending },
            { id: 'confirmed', label: 'التحضير',       icon: '📦',  count: stats?.confirmed },
            { id: 'shipped',   label: 'مشحون',         icon: '🚚',  count: stats?.shipped },
            { id: 'delivered', label: 'مُسلم',         icon: '✅'  },
            { id: 'rejected',  label: 'ملغى',          icon: '❌'  },
            { id: 'failed',    label: 'فشل التوصيل',   icon: '⚠️' }
          ].map(tab => {
            const isActive = statusFilter === tab.id;
            const showBadge = tab.count != null && tab.count > 0;
            return (
              <button
                key={tab.id}
                onClick={() => { setStatusFilter(tab.id); setPage(1); }}
                style={{
                  position: 'relative',
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 18px', borderRadius: 12,
                  border: isActive ? '2px solid var(--primary)' : '1px solid var(--border)',
                  background: isActive ? 'rgba(46, 196, 182, 0.08)' : 'var(--bg)',
                  color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: isActive ? 800 : 600,
                  cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s',
                  boxShadow: isActive ? '0 4px 14px rgba(46, 196, 182, 0.15)' : 'none',
                  fontSize: '0.88rem'
                }}
              >
                <span style={{ fontSize: '1.1rem' }}>{tab.icon}</span>
                <span>{tab.label}</span>
                {showBadge && (
                  <span style={{
                    background: '#e63946',
                    color: '#fff',
                    padding: '1px 7px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 900,
                    marginLeft: 2,
                    boxShadow: '0 2px 6px rgba(230, 57, 70, 0.35)',
                    lineHeight: '1.4'
                  }}>
                    {tab.count > 99 ? '99+' : tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className={s.toolbar} style={{ flexWrap: 'wrap', paddingTop: 16 }}>
          <input
            className={s.toolbarSearch} placeholder="بحث بالاسم أو رقم الطلب..."
            value={search} onChange={e => setSearch(e.target.value)}
          />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="date" className={s.input} value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1); }} title="من تاريخ" style={{ minWidth: 130 }} />
            <span style={{ color: 'var(--text-muted)' }}>إلى</span>
            <input type="date" className={s.input} value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1); }} title="إلى تاريخ" style={{ minWidth: 130 }} />
          </div>
          {statusFilter === 'confirmed' && orders.length > 0 && (
            <button className={`${s.btn} ${s.btnPrimary}`} onClick={() => handlePrint(orders)} style={{ marginRight: 'auto' }}>
              <Printer size={16} /> طباعة فواتير التحضير
            </button>
          )}
        </div>

        {loading ? <Spinner center /> : error ? (
          <div className={`${s.alert} ${s.alertError}`} style={{ margin: 24 }}>{error}</div>
        ) : (
          <div className={t.wrapper}>
            <table className={t.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>العميل</th>
                  <th>الهاتف</th>
                  <th>العنوان</th>
                  <th>الإجمالي</th>
                  <th>الحالة</th>
                  <th>التاريخ</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {orders.filter(o =>
                  !search || o.full_name?.includes(search) || String(o.id).includes(search)
                ).map(order => (
                  <tr key={order.id}>
                    <td style={{ fontWeight: 800, color: 'var(--primary)' }}>#{order.id}</td>
                    <td style={{ fontWeight: 700 }}>{order.full_name || '—'}</td>
                    <td>{order.phone || '—'}</td>
                    <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {order.address_line || '—'}
                    </td>
                    <td style={{ fontWeight: 800 }}>{fmt(Math.round(order.total_price))} دج</td>
                    <td>
                      <span className={`${t.statusBadge} status--${order.status}`}>
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {order.created_at ? new Date(order.created_at).toLocaleDateString('ar-DZ') : '—'}
                    </td>
                    <td>
                      <div className={t.actions}>
                        <button className={t.actionBtn} onClick={() => openDetail(order.id)} title="عرض التفاصيل">
                          <Eye size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr><td colSpan={8} className={t.empty}>لا توجد طلبات</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className={s.pagination}>
            <span>الصفحة {pagination.page} من {pagination.totalPages}</span>
            <div className={s.paginationBtns}>
              <button className={s.pageBtn} disabled={page === 1} onClick={() => setPage(p => p - 1)}>السابق</button>
              <button className={s.pageBtn} disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>التالي</button>
            </div>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title={`تفاصيل الطلب #${selected?.id}`} size="xl">
        {selected && (
          <div id="print-section" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Customer & Order Info Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, background: 'var(--bg)', borderRadius: 'var(--radius-md)', padding: '16px 20px' }}>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 3 }}>العميل</div>
                <div style={{ fontWeight: 800, fontSize: '1rem' }}>{selected.full_name || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 3 }}>رقم الهاتف</div>
                <div style={{ fontWeight: 700, direction: 'ltr', textAlign: 'right' }}>{selected.phone || '—'}</div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 3 }}>العنوان</div>
                <div style={{ fontWeight: 600 }}>{selected.address_line || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 3 }}>الرمز البريدي</div>
                <div>{selected.postal_code || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 3 }}>طريقة الدفع</div>
                <div style={{ fontWeight: 600 }}>{selected.payment_method === 'COD' ? '💵 دفع عند الاستلام' : selected.payment_method || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 3 }}>الإجمالي</div>
                <div style={{ color: 'var(--primary)', fontWeight: 900, fontSize: '1.1rem' }}>{fmt(Math.round(selected.total_price))} دج</div>
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 3 }}>التاريخ</div>
                <div style={{ fontSize: '0.88rem' }}>{selected.created_at ? new Date(selected.created_at).toLocaleString('ar-DZ') : '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 3 }}>الحالة الحالية</div>
                <span className={`${t.statusBadge} status--${selected.status}`}>
                  {STATUS_LABELS[selected.status] || selected.status}
                </span>
              </div>
              {selected.notes && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 3 }}>ملاحظات</div>
                  <div style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>{selected.notes}</div>
                </div>
              )}
            </div>

            {/* Status Update & Print (Moved UP) */}
            <div className="no-print" style={{ background: 'var(--surface)', border: '2px solid var(--primary-light)', borderRadius: 'var(--radius-md)', padding: '16px 20px', boxShadow: '0 4px 12px rgba(46, 196, 182, 0.08)' }}>
              <h4 style={{ marginBottom: 12, fontWeight: 800, color: 'var(--primary)' }}>الإجراءات</h4>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                {selected.status === 'pending' && (
                  <>
                    <button className={`${s.btn} ${s.btnPrimary}`} onClick={() => handleStatusUpdate('confirmed')} disabled={updatingStatus}>
                      📦 تأكيد وبدء التحضير
                    </button>
                    <button className={`${s.btn} ${s.btnOutline}`} style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => handleStatusUpdate('rejected')} disabled={updatingStatus}>
                      ❌ إلغاء الطلب
                    </button>
                  </>
                )}
                {selected.status === 'confirmed' && (
                  <>
                    <button className={`${s.btn} ${s.btnPrimary}`} onClick={() => handleStatusUpdate('shipped')} disabled={updatingStatus}>
                      🚚 شحن الطلب
                    </button>
                  </>
                )}
                {selected.status === 'shipped' && (
                  <>
                    <button className={`${s.btn} ${s.btnPrimary}`} style={{ background: 'var(--success)' }} onClick={() => handleStatusUpdate('delivered')} disabled={updatingStatus}>
                      ✅ تحديد كـ "مُسلم"
                    </button>
                    <button className={`${s.btn} ${s.btnOutline}`} style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => handleStatusUpdate('failed')} disabled={updatingStatus}>
                      ⚠️ فشل التوصيل
                    </button>
                  </>
                )}
                {(selected.status === 'delivered' || selected.status === 'rejected' || selected.status === 'failed') && (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>
                    الطلب مغلق (الحالة: {STATUS_LABELS[selected.status]})
                  </span>
                )}
                {selected.status === 'confirmed' && (
                  <>
                    <div style={{ width: '1px', height: '24px', background: 'var(--border)', margin: '0 8px' }}></div>
                    <button className={`${s.btn} ${s.btnOutline}`} onClick={() => handlePrint([selected])} style={{ color: 'var(--text)' }}>
                      <Printer size={16} /> طباعة الفاتورة
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Items */}
            {selected.items && selected.items.length > 0 && (
              <div>
                <h4 style={{ marginBottom: 12, fontWeight: 800 }}>منتجات الطلب</h4>
                <div className={t.wrapper}>
                  <table className={t.table}>
                    <thead>
                      <tr><th>المنتج</th><th>المتغير</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr>
                    </thead>
                    <tbody>
                      {selected.items.map((item, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 700 }}>{item.product_name}</td>
                          <td style={{ color: 'var(--text-muted)' }}>{item.variant_name || '—'}</td>
                          <td style={{ fontWeight: 700, textAlign: 'center' }}>{item.quantity}</td>
                          <td>{fmt(Math.round(item.price_at_purchase))} دج</td>
                          <td style={{ fontWeight: 800, color: 'var(--primary)' }}>{fmt(Math.round(item.price_at_purchase * item.quantity))} دج</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={4} style={{ fontWeight: 800, textAlign: 'left', padding: '12px 16px', borderTop: '2px solid var(--border)' }}>الإجمالي الكلي</td>
                        <td style={{ fontWeight: 900, color: 'var(--primary)', fontSize: '1.05rem', padding: '12px 16px', borderTop: '2px solid var(--border)' }}>
                          {fmt(Math.round(selected.total_price))} دج
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Customer History (Accordion - Moved down) */}
            {selected.history && selected.history.length > 0 && (
              <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                <button 
                  onClick={() => setShowHistory(!showHistory)}
                  style={{ width: '100%', padding: '16px 20px', background: 'var(--bg)', border: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', textAlign: 'right' }}
                >
                  <h4 style={{ margin: 0, fontWeight: 800, color: 'var(--primary-dark)' }}>
                    سجل طلبات العميل ({selected.history.length})
                  </h4>
                  <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.9rem' }}>
                    {showHistory ? 'إخفاء' : 'عرض السجل'}
                    {showHistory ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </button>
                
                {showHistory && (
                  <div style={{ padding: '0 20px 20px 20px' }}>
                    {/* Quick Stats */}
                    <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                      <div style={{ background: 'var(--surface)', padding: '8px 12px', borderRadius: 8, fontSize: '0.85rem', border: '1px solid var(--border)' }}>
                        <strong>إجمالي الطلبات:</strong> {selected.history.length}
                      </div>
                      <div style={{ background: 'rgba(46, 196, 182, 0.1)', color: 'var(--primary-dark)', padding: '8px 12px', borderRadius: 8, fontSize: '0.85rem' }}>
                        <strong>مستلمة بنجاح:</strong> {selected.history.filter(h => h.status === 'delivered').length}
                      </div>
                      <div style={{ background: 'rgba(230, 57, 70, 0.1)', color: 'var(--danger)', padding: '8px 12px', borderRadius: 8, fontSize: '0.85rem' }}>
                        <strong>مرفوضة / فشل توصيل:</strong> {selected.history.filter(h => h.status === 'failed' || h.status === 'rejected').length}
                      </div>
                    </div>

                    <div className={t.wrapper}>
                      <table className={t.table}>
                        <thead>
                          <tr>
                            <th>رقم الطلب</th>
                            <th>التاريخ</th>
                            <th>المنتجات</th>
                            <th>الإجمالي</th>
                            <th>الحالة</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selected.history.map((hist, i) => (
                            <tr key={i}>
                              <td style={{ fontWeight: 800 }}>#{hist.id} {hist.id === selected.id && <span style={{color:'var(--primary)'}}>(الحالي)</span>}</td>
                              <td style={{ fontSize: '0.85rem' }}>{new Date(hist.created_at).toLocaleDateString('ar-DZ')}</td>
                              <td>{hist.item_count} منتجات</td>
                              <td style={{ fontWeight: 700 }}>{fmt(Math.round(hist.total_price))} دج</td>
                              <td>
                                <span className={`${t.statusBadge} status--${hist.status}`} style={{ transform: 'scale(0.85)', transformOrigin: 'right', display: 'inline-block' }}>
                                  {STATUS_LABELS[hist.status] || hist.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </Modal>
    </div>
  );
};

export default Orders;
