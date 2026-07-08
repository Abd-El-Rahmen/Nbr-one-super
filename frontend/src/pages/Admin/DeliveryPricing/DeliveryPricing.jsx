import React, { useEffect, useState } from 'react';
import { deliveryPricingAPI } from '../../../api';
import Spinner from '../../../components/Spinner/Spinner';
import s from '../../../styles/admin.module.css';
import t from '../../../components/Table/Table.module.css';

const DeliveryPricing = () => {
  const [pricing, setPricing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Edit State
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ home_fee: 0, stop_desk_fee: 0 });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    deliveryPricingAPI.getAll()
      .then(res => setPricing(res.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleEditClick = (p) => {
    setEditingId(p.tier_id);
    setEditForm({ home_fee: p.home_fee, stop_desk_fee: p.stop_desk_fee });
  };

  const handleSave = async (tier_id) => {
    setSaving(true);
    try {
      await deliveryPricingAPI.update(tier_id, editForm);
      setEditingId(null);
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading && pricing.length === 0) return <Spinner center size="lg" />;

  return (
    <div style={{ padding: '28px 32px' }} className={s.page}>
      <div className={s.pageHeader}>
        <div className={s.headerText}>
          <h1 className={s.pageTitle}>تسعيرة التوصيل</h1>
          <p className={s.pageSubtitle}>إدارة أسعار التوصيل للمنزل ولمكتب التوقف (Stop Desk) حسب المنطقة</p>
        </div>
      </div>

      {error && <div className={`${s.alert} ${s.alertError}`} style={{ marginBottom: 20 }}>{error}</div>}

      <div className={s.card}>
        <div className={t.wrapper}>
          <table className={t.table}>
            <thead>
              <tr>
                <th>معرف المنطقة</th>
                <th>اسم المنطقة</th>
                <th>توصيل للمنزل (دج)</th>
                <th>توصيل Stop Desk (دج)</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {pricing.map((p) => {
                const isEditing = editingId === p.tier_id;
                return (
                  <tr key={p.tier_id}>
                    <td style={{ color: 'var(--text-muted)' }}>{p.tier_id}</td>
                    <td style={{ fontWeight: 800 }}>{p.tier_name}</td>
                    
                    <td>
                      {isEditing ? (
                        <input 
                          type="number" 
                          className={s.input} 
                          value={editForm.home_fee} 
                          onChange={e => setEditForm({ ...editForm, home_fee: e.target.value })} 
                          style={{ width: 100 }}
                        />
                      ) : (
                        <span style={{ fontWeight: 700 }}>{new Intl.NumberFormat('ar-DZ').format(p.home_fee)} دج</span>
                      )}
                    </td>

                    <td>
                      {isEditing ? (
                        <input 
                          type="number" 
                          className={s.input} 
                          value={editForm.stop_desk_fee} 
                          onChange={e => setEditForm({ ...editForm, stop_desk_fee: e.target.value })} 
                          style={{ width: 100 }}
                        />
                      ) : (
                        <span style={{ fontWeight: 700 }}>{new Intl.NumberFormat('ar-DZ').format(p.stop_desk_fee)} دج</span>
                      )}
                    </td>

                    <td>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className={`${s.btn} ${s.btnPrimary}`} onClick={() => handleSave(p.tier_id)} disabled={saving}>حفظ</button>
                          <button className={`${s.btn} ${s.btnOutline}`} onClick={() => setEditingId(null)} disabled={saving}>إلغاء</button>
                        </div>
                      ) : (
                        <button className={`${s.btn} ${s.btnOutline}`} onClick={() => handleEditClick(p)}>تعديل</button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {pricing.length === 0 && !loading && (
                <tr><td colSpan={5} className={t.empty}>لا يوجد بيانات تسعير</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DeliveryPricing;
