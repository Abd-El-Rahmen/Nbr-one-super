import React, { useEffect, useState, useCallback } from 'react';
import { Plus, RefreshCw, Package, ClipboardList, AlertTriangle } from 'lucide-react';
import { inventoryAPI, productsAPI, categoriesAPI } from '../../../api';
import Spinner from '../../../components/Spinner/Spinner';
import Modal from '../../../components/Modal/Modal';
import s from '../../../styles/admin.module.css';
import t from '../../../components/Table/Table.module.css';

/* ── Stock level helpers ─────────────────────────────────── */
const stockLevel = (qty) => {
  if (qty === 0)  return { label: 'نافد',      color: '#e63946', bg: '#fde8ea' };
  if (qty < 5)   return { label: 'حرج',       color: '#e63946', bg: '#fde8ea' };
  if (qty < 20)  return { label: 'متوسط',     color: '#f4a261', bg: '#fef3e2' };
  return           { label: 'كافٍ',       color: '#2dc653', bg: '#e6f9ec' };
};

const Inventory = () => {
  const [activeTab, setActiveTab]       = useState('stock'); // 'stock' | 'logs'

  /* ── Stock view state ────────────────────────────────────── */
  const [allVariants, setAllVariants]   = useState([]);
  const [stockLoading, setStockLoading] = useState(true);
  const [stockSearch, setStockSearch]   = useState('');
  const [stockFilter, setStockFilter]   = useState('all'); // 'all' | 'low' | 'critical'
  const [stockCategory, setStockCategory] = useState('all');
  const [categories, setCategories]     = useState([]);

  /* ── Logs view state ─────────────────────────────────────── */
  const [logs, setLogs]                 = useState([]);
  const [logsLoading, setLogsLoading]   = useState(false);
  const [logsError, setLogsError]       = useState('');

  /* ── Restock modal state ─────────────────────────────────── */
  const [restockOpen, setRestockOpen]   = useState(false);
  const [searchModal, setSearchModal]   = useState('');
  const [modalVariants, setModalVariants] = useState([]);
  const [items, setItems]               = useState([]);
  const [stagedItem, setStagedItem]     = useState({ variant_id: '', quantity: '', note: '' });
  const [saving, setSaving]             = useState(false);
  const [successMsg, setSuccessMsg]     = useState('');
  const [modalCategory, setModalCategory] = useState('all');
  const [showSuggestions, setShowSuggestions] = useState(false);

  /* ── Quick Restock state ─────────────────────────────────── */
  const [quickRestockOpen, setQuickRestockOpen] = useState(false);
  const [quickRestockVariant, setQuickRestockVariant] = useState(null);
  const [quickRestockQty, setQuickRestockQty] = useState('');
  const [quickRestockNote, setQuickRestockNote] = useState('');

  /* ── Fetch all products + variants for stock view ────────── */
  const loadStock = useCallback(() => {
    setStockLoading(true);
    productsAPI.getAll({ limit: 200 })
      .then(res => {
        const prods = res.data || [];
        const flat = prods.flatMap(p =>
          (p.variants || []).map(v => ({
            id:          v.id,
            productName: p.name,
            variantName: v.name,
            sku:         v.sku || '—',
            price:       v.price_override ?? p.base_price,
            qty:         v.stock_quantity ?? 0,
            image:       p.image_url,
            categoryId:  p.category_id,
          }))
        );
        setAllVariants(flat);
      })
      .catch(() => setAllVariants([]))
      .finally(() => setStockLoading(false));
  }, []);

  const loadLogs = useCallback(() => {
    setLogsLoading(true);
    inventoryAPI.getLogs()
      .then(res => setLogs(Array.isArray(res.data) ? res.data : []))
      .catch(err => setLogsError(err.message))
      .finally(() => setLogsLoading(false));
  }, []);

  const loadCategories = useCallback(() => {
    categoriesAPI.getAll()
      .then(res => setCategories(res.data || []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => { loadStock(); loadCategories(); }, [loadStock, loadCategories]);
  useEffect(() => { if (activeTab === 'logs') loadLogs(); }, [activeTab, loadLogs]);

  /* ── Modal search ────────────────────────────────────────── */
  useEffect(() => {
    if (!restockOpen) return;
    const timer = setTimeout(() => {
      productsAPI.getAll({ search: searchModal, category_id: modalCategory === 'all' ? undefined : modalCategory, limit: 30 })
        .then(res => {
          const prods = res.data || [];
          setModalVariants(prods.flatMap(p =>
            (p.variants || []).map(v => ({
              id:    v.id,
              label: `${p.name} — ${v.name}`,
              stock: v.stock_quantity,
            }))
          ));
        }).catch(() => setModalVariants([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchModal, modalCategory, restockOpen]);

  const openRestock = () => {
    setItems([]); setSearchModal('');
    setModalCategory('all');
    setShowSuggestions(false);
    setStagedItem({ variant_id: '', quantity: '', note: '' });
    setRestockOpen(true);
  };

  const handleAddStaged = () => {
    if (!stagedItem.variant_id || !stagedItem.quantity) return;
    const v = modalVariants.find(x => String(x.id) === String(stagedItem.variant_id));
    setItems(prev => [...prev, { ...stagedItem, label: v?.label || searchModal, _key: Math.random() }]);
    setStagedItem({ variant_id: '', quantity: '', note: '' });
    setSearchModal('');
    setShowSuggestions(false);
  };

  const handleRestock = async () => {
    if (items.length === 0) return alert('أضف منتجاً واحداً على الأقل');
    setSaving(true);
    try {
      await inventoryAPI.bulkRestock(
        items.map(i => ({ variant_id: Number(i.variant_id), quantity: Number(i.quantity), note: i.note }))
      );
      setSuccessMsg('✅ تم إعادة التخزين بنجاح');
      setRestockOpen(false);
      loadStock();
      setTimeout(() => setSuccessMsg(''), 3500);
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handleQuickRestock = async () => {
    if (!quickRestockQty) return;
    setSaving(true);
    try {
      await inventoryAPI.bulkRestock([
        { variant_id: Number(quickRestockVariant.id), quantity: Number(quickRestockQty), note: quickRestockNote }
      ]);
      setSuccessMsg('✅ تم التخزين بنجاح');
      setQuickRestockOpen(false);
      loadStock();
      setTimeout(() => setSuccessMsg(''), 3500);
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  /* ── Filtered stock list ─────────────────────────────────── */
  const filteredVariants = allVariants.filter(v => {
    const matchSearch = !stockSearch ||
      v.productName.toLowerCase().includes(stockSearch.toLowerCase()) ||
      v.variantName.toLowerCase().includes(stockSearch.toLowerCase()) ||
      v.sku.toLowerCase().includes(stockSearch.toLowerCase());
    const matchFilter =
      stockFilter === 'all'      ? true :
      stockFilter === 'ended'    ? v.qty === 0 :
      stockFilter === 'critical' ? (v.qty > 0 && v.qty < 5) :
      stockFilter === 'low'      ? (v.qty >= 5 && v.qty < 20) : true;
    const matchCat = stockCategory === 'all' || String(v.categoryId) === String(stockCategory);
    return matchSearch && matchFilter && matchCat;
  });

  const endedCount    = allVariants.filter(v => v.qty === 0).length;
  const criticalCount = allVariants.filter(v => v.qty > 0 && v.qty < 5).length;
  const lowCount      = allVariants.filter(v => v.qty >= 5 && v.qty < 20).length;

  /* ── Tab button style ────────────────────────────────────── */
  const tabStyle = (id) => ({
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 20px', borderRadius: 10, border: 'none',
    background: activeTab === id ? 'var(--primary)' : 'transparent',
    color: activeTab === id ? '#fff' : 'var(--text-muted)',
    fontWeight: activeTab === id ? 800 : 600,
    cursor: 'pointer', transition: 'all 0.18s',
    fontSize: '0.9rem',
  });

  return (
    <div style={{ padding: '28px 32px' }} className={s.page}>
      {/* ── Header ── */}
      <div className={s.pageHeader}>
        <div className={s.headerText}>
          <h1 className={s.pageTitle}>المخزون</h1>
          <p className={s.pageSubtitle}>إدارة مخزون المنتجات وتتبع الحركات</p>
        </div>
        <div className={s.headerActions}>
          <button className={`${s.btn} ${s.btnOutline}`} onClick={() => activeTab === 'stock' ? loadStock() : loadLogs()}>
            <RefreshCw size={16} />
          </button>
          <button className={`${s.btn} ${s.btnPrimary}`} onClick={openRestock}>
            <Plus size={16} /> إعادة تخزين
          </button>
        </div>
      </div>

      {/* ── Low-stock / Out-of-stock Alert Banner ── */}
      {!stockLoading && (endedCount > 0 || criticalCount > 0) && (() => {
        // Group ended variants by product
        const endedByProduct = {};
        const lowByProduct   = {};
        allVariants.forEach(v => {
          if (v.qty === 0) {
            if (!endedByProduct[v.productName]) endedByProduct[v.productName] = [];
            endedByProduct[v.productName].push(v);
          } else if (v.qty > 0 && v.qty < 5) {
            if (!lowByProduct[v.productName]) lowByProduct[v.productName] = [];
            lowByProduct[v.productName].push(v);
          }
        });
        const endedProds = Object.entries(endedByProduct);
        const lowProds   = Object.entries(lowByProduct);
        return (
          <div style={{ marginBottom: 20, borderRadius: 14, overflow: 'hidden', border: '1.5px solid #ffc107', background: 'linear-gradient(135deg,#fffbeb 0%,#fff3cd 100%)' }}>
            <div style={{ background: '#f59e0b', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '1.2rem' }}>⚠️</span>
              <strong style={{ color: '#fff', fontSize: '0.95rem' }}>
                تنبيه: يوجد {endedProds.length + lowProds.length} منتج يحتاج إلى إعادة تخزين
              </strong>
            </div>
            <div style={{ padding: '16px 20px', display: 'flex', gap: 40, flexWrap: 'wrap' }}>
              {endedProds.length > 0 && (
                <div>
                  <div style={{ fontWeight: 800, color: '#e63946', marginBottom: 8, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#e63946', display: 'inline-block', flexShrink: 0 }} />
                    🔴 نفد المخزون بالكامل — {endedProds.length} منتج
                  </div>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {endedProds.map(([productName, variants]) => (
                      <li key={productName} style={{ fontSize: '0.85rem', color: '#5c3800', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                        <strong style={{ whiteSpace: 'nowrap' }}>• {productName}</strong>
                        <span style={{ color: '#e63946', fontWeight: 700 }}>
                          ({variants.map(v => v.variantName || 'الافتراضي').join(', ')} = 0 وحدة)
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {lowProds.length > 0 && (
                <div>
                  <div style={{ fontWeight: 800, color: '#d97706', marginBottom: 8, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b', display: 'inline-block', flexShrink: 0 }} />
                    🟡 مخزون منخفض — {lowProds.length} منتج (أقل من 5 وحدات)
                  </div>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {lowProds.map(([productName, variants]) => (
                      <li key={productName} style={{ fontSize: '0.85rem', color: '#5c3800', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                        <strong style={{ whiteSpace: 'nowrap' }}>• {productName}</strong>
                        <span style={{ color: '#d97706', fontWeight: 700 }}>
                          ({variants.map(v => `${v.variantName || 'الافتراضي'}: ${v.qty}`).join(', ')})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {successMsg && <div className={`${s.alert} ${s.alertSuccess}`}>{successMsg}</div>}

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, background: 'var(--surface)', padding: 6, borderRadius: 12, width: 'fit-content' }}>
        <button style={tabStyle('stock')} onClick={() => setActiveTab('stock')}>
          <Package size={17} /> المخزون الحالي
          {endedCount > 0 && (
            <span style={{ background: '#000', color: '#fff', borderRadius: 20, padding: '1px 7px', fontSize: '0.75rem', fontWeight: 900 }}>
              {endedCount}
            </span>
          )}
          {criticalCount > 0 && (
            <span style={{ background: '#e63946', color: '#fff', borderRadius: 20, padding: '1px 7px', fontSize: '0.75rem', fontWeight: 900, marginLeft: endedCount > 0 ? '4px' : '0' }}>
              {criticalCount}
            </span>
          )}
        </button>
        <button style={tabStyle('logs')} onClick={() => setActiveTab('logs')}>
          <ClipboardList size={17} /> سجل الحركات
        </button>
      </div>

      {/* ════════════════════════════════════════════
          TAB 1 — CURRENT STOCK
      ════════════════════════════════════════════ */}
      {activeTab === 'stock' && (
        <div className={s.card}>
          {/* ── Filters ── */}
          <div className={s.toolbar} style={{ flexWrap: 'wrap', gap: 10 }}>
            <input
              className={s.toolbarSearch}
              placeholder="بحث بالمنتج أو الـ SKU..."
              value={stockSearch}
              onChange={e => setStockSearch(e.target.value)}
            />
            
            <select 
              className={s.input} 
              style={{ width: '200px', height: '42px' }}
              value={stockCategory} 
              onChange={e => setStockCategory(e.target.value)}
            >
              <option value="all">جميع الأقسام</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              <option value="null">بدون قسم</option>
            </select>

            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { id: 'all',      label: `الكل (${allVariants.length})` },
                { id: 'ended',    label: `⚫ نفد (${endedCount})` },
                { id: 'critical', label: `🔴 حرج (${criticalCount})` },
                { id: 'low',      label: `🟡 متوسط (${lowCount})` },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setStockFilter(f.id)}
                  style={{
                    padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)',
                    background: stockFilter === f.id ? 'var(--primary-light)' : 'var(--bg)',
                    color: stockFilter === f.id ? 'var(--primary)' : 'var(--text-muted)',
                    fontWeight: stockFilter === f.id ? 800 : 600, cursor: 'pointer',
                    fontSize: '0.85rem', transition: 'all 0.15s'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {stockLoading ? <Spinner center /> : (
            <div className={t.wrapper}>
              <table className={t.table}>
                <thead>
                  <tr>
                    <th>المنتج</th>
                    <th>المتغير</th>
                    <th>SKU</th>
                    <th>السعر</th>
                    <th>الكمية</th>
                    <th>الحالة</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVariants.map(v => {
                    const level = stockLevel(v.qty);
                    return (
                      <tr key={v.id} style={{ background: v.qty === 0 ? 'rgba(230,57,70,0.04)' : 'transparent' }}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {v.image ? (
                              <img src={v.image} alt={v.productName} style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                            ) : (
                              <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Package size={16} color="var(--text-muted)" />
                              </div>
                            )}
                            <span style={{ fontWeight: 700 }}>{v.productName}</span>
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-muted)' }}>{v.variantName}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--text-muted)' }}>{v.sku}</td>
                        <td style={{ fontWeight: 700 }}>{Number(v.price).toLocaleString('ar-DZ')} دج</td>
                        <td>
                          <span style={{
                            fontWeight: 900, fontSize: '1rem',
                            color: v.qty < 5 ? '#e63946' : v.qty < 20 ? '#f4a261' : 'var(--text)'
                          }}>
                            {v.qty}
                          </span>
                        </td>
                        <td>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            background: level.bg, color: level.color,
                            padding: '4px 12px', borderRadius: 20,
                            fontSize: '0.8rem', fontWeight: 800
                          }}>
                            {v.qty < 5 && <AlertTriangle size={13} />}
                            {level.label}
                          </span>
                        </td>
                        <td>
                          <button 
                            className={`${s.btn} ${s.btnPrimary}`} 
                            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                            onClick={() => {
                              setQuickRestockVariant(v);
                              setQuickRestockQty('');
                              setQuickRestockNote('');
                              setQuickRestockOpen(true);
                            }}
                          >
                            <Plus size={14} /> إضافة كمية
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredVariants.length === 0 && (
                    <tr><td colSpan={6} className={t.empty}>لا توجد نتائج</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════
          TAB 2 — MOVEMENT LOGS
      ════════════════════════════════════════════ */}
      {activeTab === 'logs' && (
        <div className={s.card}>
          {logsLoading ? <Spinner center /> : logsError ? (
            <div className={`${s.alert} ${s.alertError}`} style={{ margin: 24 }}>{logsError}</div>
          ) : (
            <div className={t.wrapper}>
              <table className={t.table}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>المنتج / المتغير</th>
                    <th>نوع الحركة</th>
                    <th>الكمية</th>
                    <th>ملاحظة</th>
                    <th>التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id}>
                      <td style={{ fontWeight: 800, color: 'var(--text-muted)' }}>{log.id}</td>
                      <td style={{ fontWeight: 700 }}>
                        {log.product_name ? `${log.product_name} — ${log.variant_name || ''}` : `متغير #${log.variant_id}`}
                      </td>
                      <td>
                        <span className={t.statusBadge} style={{
                          background: log.type === 'restock' ? 'var(--success-bg)' : 'var(--danger-bg)',
                          color: log.type === 'restock' ? 'var(--success)' : 'var(--danger)'
                        }}>
                          {log.type === 'restock' ? '📦 إضافة مخزون' : '🛒 مبيعات'}
                        </span>
                      </td>
                      <td style={{
                        fontWeight: 800,
                        color: log.quantity > 0 ? 'var(--success)' : 'var(--danger)'
                      }}>
                        {log.quantity > 0 ? `+${log.quantity}` : log.quantity}
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{log.note || '—'}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {log.created_at ? new Date(log.created_at).toLocaleString('ar-DZ') : '—'}
                      </td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr><td colSpan={6} className={t.empty}>لا توجد سجلات مخزون</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Restock Modal ── */}
      <Modal isOpen={restockOpen} onClose={() => setRestockOpen(false)} title="إعادة تخزين متعددة" size="lg">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ background: 'var(--bg)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
            <h4 style={{ marginBottom: 12, fontWeight: 700 }}>إضافة منتج للقائمة</h4>
            <div className={s.formGrid} style={{ gridTemplateColumns: '1fr' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
                <div className={s.formGroup}>
                  <label className={s.label}>القسم (لتسهيل البحث)</label>
                  <select className={s.input} value={modalCategory} onChange={e => { setModalCategory(e.target.value); setShowSuggestions(true); }}>
                    <option value="all">جميع الأقسام</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div className={s.formGroup} style={{ position: 'relative' }}>
                  <label className={s.label}>بحث واختيار المنتج</label>
                  <input 
                    type="text" 
                    className={s.input} 
                    placeholder="اكتب اسم المنتج..." 
                    value={searchModal} 
                    onChange={e => {
                      setSearchModal(e.target.value);
                      setShowSuggestions(true);
                      setStagedItem(f => ({ ...f, variant_id: '' }));
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  />
                  
                  {showSuggestions && modalVariants.length > 0 && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, 
                      background: 'var(--surface)', border: '1px solid var(--border)', 
                      borderRadius: 'var(--radius-md)', zIndex: 10, maxHeight: 200, overflowY: 'auto',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                    }}>
                      {modalVariants.map(v => (
                        <div 
                          key={v.id} 
                          style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                          onClick={() => {
                            setStagedItem(f => ({ ...f, variant_id: String(v.id) }));
                            setSearchModal(v.label);
                            setShowSuggestions(false);
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{v.label}</span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'var(--bg)', padding: '2px 8px', borderRadius: 12 }}>المخزون: {v.stock}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className={s.formGroup}>
                  <label className={s.label}>الكمية</label>
                  <input type="number" min="1" className={s.input} value={stagedItem.quantity} onChange={e => setStagedItem(f => ({ ...f, quantity: e.target.value }))} placeholder="الكمية" />
                </div>
                <div className={s.formGroup}>
                  <label className={s.label}>ملاحظة</label>
                  <input type="text" className={s.input} value={stagedItem.note} onChange={e => setStagedItem(f => ({ ...f, note: e.target.value }))} placeholder="اختياري" />
                </div>
              </div>
              <button type="button" className={`${s.btn} ${s.btnOutline}`} onClick={handleAddStaged}
                style={{ marginTop: 8 }} disabled={!stagedItem.variant_id || !stagedItem.quantity}>
                <Plus size={16} /> إضافة للقائمة
              </button>
            </div>
          </div>

          {items.length > 0 && (
            <div>
              <h4 style={{ marginBottom: 12, fontWeight: 700 }}>المنتجات المضافة ({items.length})</h4>
              <div className={t.wrapper}>
                <table className={t.table}>
                  <thead><tr><th>المنتج / المتغير</th><th>الكمية</th><th>ملاحظة</th><th></th></tr></thead>
                  <tbody>
                    {items.map(item => (
                      <tr key={item._key}>
                        <td style={{ fontWeight: 700 }}>{item.label}</td>
                        <td style={{ fontWeight: 800, color: 'var(--primary)' }}>+{item.quantity}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{item.note || '—'}</td>
                        <td style={{ textAlign: 'left' }}>
                          <button type="button" className={t.actionBtn} style={{ color: 'var(--danger)' }}
                            onClick={() => setItems(items.filter(i => i._key !== item._key))}>
                            إزالة
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className={s.formActions} style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <button type="button" className={`${s.btn} ${s.btnOutline}`} onClick={() => setRestockOpen(false)}>إلغاء</button>
            <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={handleRestock} disabled={saving || items.length === 0}>
              {saving ? 'جارٍ الحفظ...' : `تأكيد التخزين (${items.length})`}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Quick Restock Modal ── */}
      <Modal isOpen={quickRestockOpen} onClose={() => setQuickRestockOpen(false)} title="إضافة مخزون للمنتج">
        {quickRestockVariant && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ background: 'var(--bg)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: 4 }}>{quickRestockVariant.productName}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>المتغير: {quickRestockVariant.variantName || 'الافتراضي'}</div>
              <div style={{ marginTop: 8, fontWeight: 700, color: 'var(--primary)' }}>المخزون الحالي: {quickRestockVariant.qty}</div>
            </div>

            <div className={s.formGrid} style={{ gridTemplateColumns: '1fr' }}>
              <div className={s.formGroup}>
                <label className={s.label}>الكمية المُضافة *</label>
                <input type="number" min="1" className={s.input} value={quickRestockQty} onChange={e => setQuickRestockQty(e.target.value)} placeholder="مثال: 50" />
              </div>
              <div className={s.formGroup}>
                <label className={s.label}>ملاحظة (اختياري)</label>
                <input type="text" className={s.input} value={quickRestockNote} onChange={e => setQuickRestockNote(e.target.value)} placeholder="مثال: دفعة جديدة" />
              </div>
            </div>

            <div className={s.formActions} style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <button type="button" className={`${s.btn} ${s.btnOutline}`} onClick={() => setQuickRestockOpen(false)}>إلغاء</button>
              <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={handleQuickRestock} disabled={saving || !quickRestockQty}>
                {saving ? 'جارٍ الحفظ...' : 'تأكيد الإضافة'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Inventory;
