import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Plus, Pencil, Trash2, Image as ImageIcon } from 'lucide-react';
import { categoriesAPI } from '../../../api';
import Spinner from '../../../components/Spinner/Spinner';
import Modal from '../../../components/Modal/Modal';
import s from '../../../styles/admin.module.css';
import t from '../../../components/Table/Table.module.css';

const emptyForm = { name: '', description: '' };

const Categories = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [image, setImage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  
  const fileInputRef = useRef(null);

  const load = useCallback(() => {
    setLoading(true);
    categoriesAPI.getAll()
      .then(res => setItems(Array.isArray(res.data) ? res.data : []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { 
    setEditing(null); 
    setForm(emptyForm); 
    setImage(null);
    setModalOpen(true); 
  };
  
  const openEdit = (cat) => { 
    setEditing(cat); 
    setForm({ name: cat.name, description: cat.description || '' }); 
    setImage(null);
    setModalOpen(true); 
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (image) fd.append('image', image);

      if (editing) await categoriesAPI.update(editing.id, fd);
      else await categoriesAPI.create(fd);
      setModalOpen(false);
      load();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا القسم؟')) return;
    setDeleting(id);
    try { await categoriesAPI.delete(id); load(); }
    catch (err) { alert(err.message); }
    finally { setDeleting(null); }
  };

  return (
    <div className={`${s.page} ${s.pageWrapper}`}>
      <div className={s.pageHeader}>
        <div className={s.headerText}>
          <h1 className={s.pageTitle}>الأقسام</h1>
          <p className={s.pageSubtitle}>إدارة أقسام المنتجات</p>
        </div>
        <div className={s.headerActions}>
          <button className={`${s.btn} ${s.btnPrimary}`} onClick={openCreate}><Plus size={16} /> إضافة قسم</button>
        </div>
      </div>

      <div className={s.card}>
        {loading ? <Spinner center /> : error ? (
          <div className={`${s.alert} ${s.alertError}`} style={{ margin: 24 }}>{error}</div>
        ) : (
          <div className={t.wrapper}>
            <table className={t.table}>
              <thead>
                <tr><th>#</th><th>صورة</th><th>اسم القسم</th><th>الوصف</th><th>عدد المنتجات</th><th>إجراءات</th></tr>
              </thead>
              <tbody>
                {items.map(cat => (
                  <tr key={cat.id}>
                    <td style={{ fontWeight: 800, color: 'var(--text-muted)' }}>{cat.id}</td>
                    <td>
                      {cat.image_url ? (
                        <img src={cat.image_url} alt={cat.name} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} />
                      ) : (
                        <div style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)', borderRadius: 6, color: 'var(--text-muted)' }}>
                          <ImageIcon size={18} />
                        </div>
                      )}
                    </td>
                    <td style={{ fontWeight: 700 }}>{cat.name}</td>
                    <td style={{ color: 'var(--text-muted)', maxWidth: 300 }}>{cat.description || '—'}</td>
                    <td>{cat.product_count ?? '—'}</td>
                    <td>
                      <div className={t.actions}>
                        <button className={t.actionBtn} onClick={() => openEdit(cat)}><Pencil size={16} /></button>
                        <button className={`${t.actionBtn} ${t.danger}`} onClick={() => handleDelete(cat.id)} disabled={deleting === cat.id}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && <tr><td colSpan={6} className={t.empty}>لا توجد أقسام</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'تعديل القسم' : 'إضافة قسم جديد'}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          <div className={s.formGroup}>
            <label className={s.label}>صورة القسم</label>
            {editing?.image_url && !image && (
              <img 
                src={editing.image_url} 
                alt={editing.name} 
                style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, marginBottom: 8, border: '1px solid var(--border)' }} 
              />
            )}
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef}
              onChange={handleImageChange}
              style={{ display: 'block' }}
            />
          </div>

          <div className={s.formGroup}>
            <label className={s.label}>اسم القسم *</label>
            <input className={s.input} required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="مثال: مواد غذائية" />
          </div>
          <div className={s.formGroup}>
            <label className={s.label}>الوصف</label>
            <textarea className={s.textarea} rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="وصف مختصر للقسم..." />
          </div>
          <div className={s.formActions}>
            <button type="button" className={`${s.btn} ${s.btnOutline}`} onClick={() => setModalOpen(false)}>إلغاء</button>
            <button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={saving}>{saving ? 'جارٍ الحفظ...' : editing ? 'حفظ التعديلات' : 'إضافة القسم'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Categories;
