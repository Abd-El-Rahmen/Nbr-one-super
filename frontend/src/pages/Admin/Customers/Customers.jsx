import React, { useEffect, useState, useCallback } from 'react';
import { Users, Eye } from 'lucide-react';
import { customersAPI, ordersAPI } from '../../../api';
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

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [orders, setOrders] = useState([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    customersAPI.getAll()
      .then(res => setCustomers(res.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (customer) => {
    setSelected(customer);
    setDetailOpen(true);
    setOrdersLoading(true);
    try {
      const res = await customersAPI.getOne(customer.id);
      setOrders(res.data?.orders || []);
    } catch {
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  const filtered = customers.filter(c =>
    !search || c.full_name?.includes(search) || c.phone?.includes(search)
  );

  return (
    <div style={{ padding: '28px 32px' }} className={s.page}>
      <div className={s.pageHeader}>
        <div className={s.headerText}>
          <h1 className={s.pageTitle}>العملاء</h1>
          <p className={s.pageSubtitle}>قائمة بجميع العملاء الذين قدّموا طلبات</p>
        </div>
      </div>

      <div className={s.card}>
        <div className={s.toolbar}>
          <input
            className={s.toolbarSearch}
            placeholder="بحث بالاسم أو رقم الهاتف..."
            value={search} onChange={e => setSearch(e.target.value)}
          />
          <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            {filtered.length} عميل
          </span>
        </div>

        {loading ? <Spinner center /> : error ? (
          <div className={`${s.alert} ${s.alertError}`} style={{ margin: 24 }}>{error}</div>
        ) : (
          <div className={t.wrapper}>
            <table className={t.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>الاسم الكامل</th>
                  <th>الهاتف</th>
                  <th>العنوان</th>
                  <th>الرمز البريدي</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 800, color: 'var(--text-muted)' }}>{c.id}</td>
                    <td style={{ fontWeight: 700 }}>
                      {(() => {
                        if (!c.full_name) return '—';
                        const names = c.full_name.split(' • ');
                        if (names.length > 1) {
                          return (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span>{names[0]}</span>
                              <span 
                                title={names.join(' • ')}
                                style={{
                                  background: 'var(--primary-light)',
                                  color: 'var(--primary-dark)',
                                  padding: '2px 6px',
                                  borderRadius: 12,
                                  fontSize: '0.75rem',
                                  fontWeight: 800,
                                  cursor: 'help'
                                }}
                              >
                                +{names.length - 1}
                              </span>
                            </div>
                          );
                        }
                        return names[0];
                      })()}
                    </td>
                    <td>{c.phone}</td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.address_line?.replace(/ • /g, '، ')}>
                      {c.address_line?.split(' • ')[0] || '—'}
                      {c.address_line && c.address_line.split(' • ').length > 1 && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginRight: 4 }}>...</span>}
                    </td>
                    <td>{c.postal_code?.split(' • ')[0] || '—'}</td>
                    <td>
                      <div className={t.actions}>
                        <button className={t.actionBtn} onClick={() => openDetail(c)}><Eye size={17} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={6} className={t.empty}>لا يوجد عملاء</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title={`بيانات العميل — ${selected?.full_name?.split(' • ')[0]}`} size="lg">
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ gridColumn: '1 / -1' }}><strong>الأسماء المستخدمة:</strong> {selected.full_name?.replace(/ • /g, '، ')}</div>
              <div><strong>الهاتف:</strong> {selected.phone}</div>
              <div><strong>الرمز البريدي:</strong> {selected.postal_code?.split(' • ')[0] || '—'}</div>
              <div style={{ gridColumn: '1 / -1' }}><strong>العناوين المسجلة:</strong> {selected.address_line?.replace(/ • /g, '، ') || '—'}</div>
            </div>
            <div>
              <h4 style={{ marginBottom: 12, fontWeight: 800 }}>طلبات هذا العميل</h4>
              {ordersLoading ? <Spinner center /> : orders.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>لا توجد طلبات مسجلة</p>
              ) : (
                <table className={t.table}>
                  <thead><tr><th>#</th><th>الإجمالي</th><th>الحالة</th><th>التاريخ</th></tr></thead>
                  <tbody>
                    {orders.map(o => (
                      <tr key={o.id}>
                        <td style={{ fontWeight: 800 }}>#{o.id}</td>
                        <td>{Math.round(o.total_price)} دج</td>
                        <td><span className={`${t.statusBadge} status--${o.status}`}>{STATUS_LABELS[o.status] || o.status}</span></td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{o.created_at ? new Date(o.created_at).toLocaleDateString('ar-DZ') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Customers;
