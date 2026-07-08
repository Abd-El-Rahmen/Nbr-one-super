import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Shield, ShieldCheck, RefreshCw, User } from 'lucide-react';
import { usersAPI } from '../../../api';
import { useAuth } from '../../../context/AuthContext';
import Spinner from '../../../components/Spinner/Spinner';
import Modal from '../../../components/Modal/Modal';
import s from '../../../styles/admin.module.css';
import t from '../../../components/Table/Table.module.css';

const ROLE_LABELS = { admin: 'مشرف', super_admin: 'مشرف رئيسي' };

const emptyForm = { name: '', email: '', password: '', role: 'admin' };

const Users = () => {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete confirm
  const [deletingId, setDeletingId] = useState(null);
  const [deleteModal, setDeleteModal] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    usersAPI.getAll()
      .then(res => setUsers(Array.isArray(res.data) ? res.data : []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Open create modal
  const openCreate = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setFormError('');
    setModalOpen(true);
  };

  // ── Open edit modal
  const openEdit = (u) => {
    setEditingUser(u);
    setForm({ name: u.name, email: u.email, password: '', role: u.role });
    setFormError('');
    setModalOpen(true);
  };

  // ── Submit create/edit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);

    try {
      if (editingUser) {
        // Don't send empty password on edit
        const payload = { name: form.name, email: form.email, role: form.role };
        if (form.password.trim()) payload.password = form.password;
        await usersAPI.update(editingUser.id, payload);
      } else {
        if (!form.password.trim()) {
          setFormError('كلمة المرور مطلوبة عند إنشاء مستخدم جديد.');
          setSaving(false);
          return;
        }
        await usersAPI.create(form);
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Confirm delete
  const openDelete = (u) => {
    setDeletingId(u.id);
    setDeleteModal(true);
  };

  const handleDelete = async () => {
    try {
      await usersAPI.delete(deletingId);
      setDeleteModal(false);
      setDeletingId(null);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const filtered = users.filter(u =>
    !search ||
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const deletingUser = users.find(u => u.id === deletingId);

  return (
    <div className={`${s.page} ${s.pageWrapper}`}>
      {/* Page Header */}
      <div className={s.pageHeader}>
        <div className={s.headerText}>
          <h1 className={s.pageTitle}>إدارة المستخدمين</h1>
          <p className={s.pageSubtitle}>إدارة حسابات المشرفين والصلاحيات — متاح للمشرف الرئيسي فقط</p>
        </div>
        <div className={s.headerActions}>
          <button className={`${s.btn} ${s.btnOutline}`} onClick={load}>
            <RefreshCw size={15} /> تحديث
          </button>
          <button className={`${s.btn} ${s.btnPrimary}`} onClick={openCreate}>
            <Plus size={16} /> إضافة مشرف
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className={s.kpiRow}>
        <div className={s.kpiCard}>
          <div>
            <div className={s.kpiLabel}>إجمالي المستخدمين</div>
            <div className={s.kpiValue}>{users.length}</div>
            <div className={s.kpiSub}>في النظام</div>
          </div>
          <div className={s.kpiIcon}><User size={20} /></div>
        </div>
        <div className={`${s.kpiCard} ${s.info}`}>
          <div>
            <div className={s.kpiLabel}>المشرفون</div>
            <div className={s.kpiValue}>{users.filter(u => u.role === 'admin').length}</div>
            <div className={s.kpiSub}>صلاحيات محدودة</div>
          </div>
          <div className={`${s.kpiIcon} ${s.info}`}><Shield size={20} /></div>
        </div>
        <div className={`${s.kpiCard} ${s.warn}`}>
          <div>
            <div className={s.kpiLabel}>المشرفون الرئيسيون</div>
            <div className={s.kpiValue}>{users.filter(u => u.role === 'super_admin').length}</div>
            <div className={s.kpiSub}>صلاحيات كاملة</div>
          </div>
          <div className={`${s.kpiIcon} ${s.warn}`}><ShieldCheck size={20} /></div>
        </div>
      </div>

      {/* Table Card */}
      <div className={s.card}>
        <div className={s.toolbar}>
          <input
            className={s.toolbarSearch}
            placeholder="بحث بالاسم أو البريد الإلكتروني..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            {filtered.length} مستخدم
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
                  <th>الاسم</th>
                  <th>البريد الإلكتروني</th>
                  <th>الدور</th>
                  <th>تاريخ الإنشاء</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 800, color: 'var(--text-muted)' }}>{u.id}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%',
                          background: u.role === 'super_admin' ? 'var(--warning-bg)' : 'var(--primary-light)',
                          color: u.role === 'super_admin' ? 'var(--warning)' : 'var(--primary)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 900, fontSize: '0.95rem', flexShrink: 0
                        }}>
                          {u.name?.[0]?.toUpperCase() ?? 'A'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700 }}>
                            {u.name}
                            {u.id === currentUser?.id && (
                              <span style={{
                                marginRight: 8, fontSize: '0.75rem', background: 'var(--success-bg)',
                                color: 'var(--success)', padding: '2px 8px', borderRadius: 'var(--radius-pill)', fontWeight: 700
                              }}>أنت</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{u.email}</td>
                    <td>
                      <span className={t.statusBadge} style={{
                        background: u.role === 'super_admin' ? 'var(--warning-bg)' : 'var(--info-bg)',
                        color: u.role === 'super_admin' ? 'var(--warning)' : 'var(--info)',
                        display: 'inline-flex', alignItems: 'center', gap: 5
                      }}>
                        {u.role === 'super_admin' ? <ShieldCheck size={13} /> : <Shield size={13} />}
                        {ROLE_LABELS[u.role] || u.role}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('ar-DZ') : '—'}
                    </td>
                    <td>
                      <div className={t.actions}>
                        <button className={t.actionBtn} onClick={() => openEdit(u)} title="تعديل">
                          <Pencil size={16} />
                        </button>
                        {/* Prevent deleting yourself */}
                        {u.id !== currentUser?.id && (
                          <button
                            className={`${t.actionBtn} ${t.danger}`}
                            onClick={() => openDelete(u)}
                            title="حذف"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className={t.empty}>لا يوجد مستخدمون</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create / Edit Modal ── */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingUser ? `تعديل: ${editingUser.name}` : 'إضافة مشرف جديد'}
        size="md"
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {formError && (
            <div className={`${s.alert} ${s.alertError}`}>{formError}</div>
          )}

          <div className={s.formGrid}>
            <div className={`${s.formGroup} ${s.formFull}`}>
              <label className={s.label}>الاسم الكامل *</label>
              <input
                className={s.input}
                required
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="مثال: أحمد بن علي"
              />
            </div>

            <div className={`${s.formGroup} ${s.formFull}`}>
              <label className={s.label}>البريد الإلكتروني *</label>
              <input
                type="email"
                className={s.input}
                required
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="admin@example.com"
                dir="ltr"
              />
            </div>

            <div className={s.formGroup}>
              <label className={s.label}>
                كلمة المرور {editingUser ? '(اتركها فارغة للإبقاء على الحالية)' : '*'}
              </label>
              <input
                type="password"
                className={s.input}
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder={editingUser ? '••••••••' : 'كلمة مرور قوية'}
                minLength={editingUser ? 0 : 6}
                required={!editingUser}
                dir="ltr"
              />
            </div>

            <div className={s.formGroup}>
              <label className={s.label}>الدور *</label>
              <select
                className={s.input}
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              >
                <option value="admin">مشرف — صلاحيات محدودة</option>
                <option value="super_admin">مشرف رئيسي — صلاحيات كاملة</option>
              </select>
            </div>
          </div>

          {/* Role explanation */}
          <div style={{
            background: 'var(--bg)', borderRadius: 'var(--radius-md)', padding: '14px 16px',
            fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.7
          }}>
            <strong style={{ color: 'var(--text)', display: 'block', marginBottom: 6 }}>ملاحظة حول الأدوار:</strong>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span>🛡️ <strong>مشرف:</strong> يمكنه إدارة الطلبات، المنتجات، الأقسام، المخزون، والشكاوى.</span>
              <span>👑 <strong>مشرف رئيسي:</strong> صلاحيات كاملة بما فيها إدارة المستخدمين.</span>
            </div>
          </div>

          <div className={s.formActions}>
            <button type="button" className={`${s.btn} ${s.btnOutline}`} onClick={() => setModalOpen(false)}>
              إلغاء
            </button>
            <button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={saving}>
              {saving ? 'جارٍ الحفظ...' : editingUser ? 'حفظ التعديلات' : 'إنشاء الحساب'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Delete Confirm Modal ── */}
      <Modal
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        title="تأكيد الحذف"
        size="sm"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{
            background: 'var(--danger-bg)', borderRadius: 'var(--radius-md)',
            padding: '16px', textAlign: 'center'
          }}>
            <Trash2 size={32} color="var(--danger)" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontWeight: 700, color: 'var(--danger)', marginBottom: 6 }}>
              هل أنت متأكد من حذف هذا المشرف؟
            </p>
            <p style={{ fontWeight: 800, fontSize: '1rem' }}>{deletingUser?.name}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: 4 }}>
              {deletingUser?.email}
            </p>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', textAlign: 'center' }}>
            لا يمكن التراجع عن هذا الإجراء.
          </p>
          <div className={s.formActions}>
            <button className={`${s.btn} ${s.btnOutline}`} onClick={() => setDeleteModal(false)}>
              إلغاء
            </button>
            <button className={`${s.btn} ${s.btnDanger}`} onClick={handleDelete}>
              <Trash2 size={15} /> حذف نهائياً
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Users;
