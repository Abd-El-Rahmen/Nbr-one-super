import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { messagesAPI } from '../../../api';
import Spinner from '../../../components/Spinner/Spinner';
import s from '../../../styles/admin.module.css';
import t from '../../../components/Table/Table.module.css';

const Messages = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    messagesAPI.getAll()
      .then(res => setMessages(Array.isArray(res.data) ? res.data : []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = messages.filter(m =>
    !search || m.message?.includes(search) || String(m.order_id || '').includes(search)
  );

  return (
    <div style={{ padding: '28px 32px' }} className={s.page}>
      <div className={s.pageHeader}>
        <div className={s.headerText}>
          <h1 className={s.pageTitle}>الرسائل</h1>
          <p className={s.pageSubtitle}>رسائل العملاء المرسلة من المتجر</p>
        </div>
        <div className={s.headerActions}>
          <button className={`${s.btn} ${s.btnOutline}`} onClick={load}><RefreshCw size={16} /> تحديث</button>
        </div>
      </div>

      <div className={s.card}>
        <div className={s.toolbar}>
          <input className={s.toolbarSearch} placeholder="بحث في الرسائل..." value={search} onChange={e => setSearch(e.target.value)} />
          <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>{filtered.length} رسالة</span>
        </div>

        {loading ? <Spinner center /> : error ? (
          <div className={`${s.alert} ${s.alertError}`} style={{ margin: 24 }}>{error}</div>
        ) : (
          <div className={t.wrapper}>
            <table className={t.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>رقم الطلب</th>
                  <th>نوع المرسل</th>
                  <th>الرسالة</th>
                  <th>التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(msg => (
                  <tr key={msg.id}>
                    <td style={{ fontWeight: 800, color: 'var(--text-muted)' }}>{msg.id}</td>
                    <td style={{ fontWeight: 700 }}>{msg.order_id ? `#${msg.order_id}` : '—'}</td>
                    <td>
                      <span className={`${t.statusBadge}`} style={{ background: msg.sender_type === 'customer' ? 'var(--info-bg)' : 'var(--primary-light)', color: msg.sender_type === 'customer' ? 'var(--info)' : 'var(--primary)' }}>
                        {msg.sender_type === 'customer' ? 'عميل' : 'إدارة'}
                      </span>
                    </td>
                    <td style={{ maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.message}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {msg.created_at ? new Date(msg.created_at).toLocaleString('ar-DZ') : '—'}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={5} className={t.empty}>لا توجد رسائل</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;
