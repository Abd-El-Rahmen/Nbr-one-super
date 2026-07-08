import React, { useEffect, useState, useCallback } from 'react';
import { Eye, RefreshCw } from 'lucide-react';
import { complaintsAPI } from '../../../api';
import Spinner from '../../../components/Spinner/Spinner';
import Modal from '../../../components/Modal/Modal';
import s from '../../../styles/admin.module.css';
import t from '../../../components/Table/Table.module.css';

const STATUS_LABELS = { open: 'مفتوحة', in_progress: 'قيد المعالجة', closed: 'مغلقة' };
const STATUS_OPTIONS = ['open', 'in_progress', 'closed'];

const Complaints = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (statusFilter) params.status = statusFilter;
    complaintsAPI.getAll(params)
      .then(res => setItems(Array.isArray(res.data) ? res.data : []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (id) => {
    try {
      const res = await complaintsAPI.getOne(id);
      setSelected(res.data);
      setNewStatus(res.data.status);
      setDetailOpen(true);
    } catch (err) { alert(err.message); }
  };

  const handleStatusUpdate = async () => {
    setSaving(true);
    try {
      await complaintsAPI.updateStatus(selected.id, newStatus);
      setDetailOpen(false);
      load();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const filtered = items.filter(c =>
    !search || c.customer_name?.includes(search) || c.message?.includes(search)
  );

  return (
    <div style={{ padding: '28px 32px' }} className={s.page}>
      <div className={s.pageHeader}>
        <div className={s.headerText}>
          <h1 className={s.pageTitle}>رسائل العملاء</h1>
          <p className={s.pageSubtitle}>إدارة رسائل واستفسارات العملاء وتحديث حالاتها</p>
        </div>
        <div className={s.headerActions}>
          <button className={`${s.btn} ${s.btnOutline}`} onClick={load}><RefreshCw size={16} /> تحديث</button>
        </div>
      </div>

      <div className={s.card}>
        <div className={s.toolbar}>
          <input className={s.toolbarSearch} placeholder="بحث بالاسم أو نص الرسالة..." value={search} onChange={e => setSearch(e.target.value)} />
          <select className={s.select} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">جميع الحالات</option>
            {STATUS_OPTIONS.map(st => <option key={st} value={st}>{STATUS_LABELS[st]}</option>)}
          </select>
        </div>

        {loading ? <Spinner center /> : error ? (
          <div className={`${s.alert} ${s.alertError}`} style={{ margin: 24 }}>{error}</div>
        ) : (
          <div className={t.wrapper}>
            <table className={t.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>اسم العميل</th>
                  <th>الهاتف</th>
                  <th>الرسالة</th>
                  <th>الحالة</th>
                  <th>التاريخ</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 800, color: 'var(--text-muted)' }}>{c.id}</td>
                    <td style={{ fontWeight: 700 }}>{c.customer_name || '—'}</td>
                    <td>{c.phone || '—'}</td>
                    <td style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.message}</td>
                    <td><span className={`${t.statusBadge} status--${c.status}`}>{STATUS_LABELS[c.status] || c.status}</span></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {c.created_at ? new Date(c.created_at).toLocaleDateString('ar-DZ') : '—'}
                    </td>
                    <td>
                      <div className={t.actions}>
                        <button className={t.actionBtn} onClick={() => openDetail(c.id)}><Eye size={17} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={7} className={t.empty}>لا توجد رسائل</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title={`رسالة #${selected?.id}`}>
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><strong>الاسم:</strong> {selected.customer_name || '—'}</div>
              <div><strong>الهاتف:</strong> {selected.phone || '—'}</div>
            </div>
            <div>
              <strong>نص الرسالة:</strong>
              <div style={{ marginTop: 8, padding: 14, background: 'var(--bg)', borderRadius: 'var(--radius-md)', lineHeight: 1.7 }}>{selected.message}</div>
            </div>
            <div>
              <strong style={{ display: 'block', marginBottom: 8 }}>تحديث الحالة:</strong>
              <div style={{ display: 'flex', gap: 12 }}>
                <select className={s.select} style={{ flex: 1 }} value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                  {STATUS_OPTIONS.map(st => <option key={st} value={st}>{STATUS_LABELS[st]}</option>)}
                </select>
                <button className={`${s.btn} ${s.btnPrimary}`} onClick={handleStatusUpdate} disabled={saving || newStatus === selected.status}>
                  {saving ? 'جارٍ الحفظ...' : 'حفظ'}
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Complaints;
