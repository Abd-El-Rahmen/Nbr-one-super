import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, Package, X, RefreshCw, Minus } from 'lucide-react';
import { productsAPI, categoriesAPI, dashboardAPI } from '../../../api';
import Spinner from '../../../components/Spinner/Spinner';
import Modal from '../../../components/Modal/Modal';
import s from '../../../styles/admin.module.css';
import t from '../../../components/Table/Table.module.css';

const emptyProduct = { name: '', description: '', category_id: '', base_price: '', is_active: true };
const emptyVariant = { name: '', sku: '', price_override: '', stock_quantity: 0 };
const newVariantRow = () => ({ ...emptyVariant, _key: Math.random().toString(36).slice(2) });

/**
 * Build a clean SKU string from product name + variant name.
 * e.g. "حليب نيدو" + "1 لتر"  →  "NLBN-1L"
 * Falls back to random suffix if both are empty.
 */
const generateSKU = (productName = '', variantName = '') => {
  const clean = (str) =>
    str
      .toUpperCase()
      .replace(/[\u0600-\u06FF\s]+/g, '')  // strip Arabic & spaces
      .replace(/[^A-Z0-9]/g, '')            // keep alphanumeric
      .slice(0, 6);
  const p = clean(productName)  || 'PROD';
  const v = clean(variantName)  || Math.random().toString(36).slice(2, 5).toUpperCase();
  return `${p}-${v}`;
};

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const debounceTimer = useRef(null);

  // Stock alert data (loaded independently from pagination)
  const [stockAlerts, setStockAlerts] = useState({ outOfStock: [], lowStock: [] });

  const loadStockAlerts = useCallback(() => {
    dashboardAPI.getStats()
      .then(res => {
        const d = res.data || {};
        const lowStockVariants = d.low_stock || [];
        // Group by product
        const outMap = {};
        const lowMap = {};
        // low_stock from stats has stock_quantity < 5 and > 0
        lowStockVariants.forEach(v => {
          if (v.stock_quantity === 0) {
            if (!outMap[v.product_name]) outMap[v.product_name] = [];
            outMap[v.product_name].push(v);
          } else {
            if (!lowMap[v.product_name]) lowMap[v.product_name] = [];
            lowMap[v.product_name].push(v);
          }
        });
        // Also fetch out-of-stock separately
        productsAPI.getAll({ limit: 200 }).then(pRes => {
          const prods = Array.isArray(pRes.data) ? pRes.data : [];
          const outProds = [];
          prods.forEach(p => {
            const zeroVars = (p.variants || []).filter(v => (v.stock_quantity ?? 0) === 0);
            if (zeroVars.length > 0) {
              outProds.push({ name: p.name, variants: zeroVars });
            }
          });
          const lowProds = Object.entries(lowMap).map(([name, variants]) => ({ name, variants }));
          setStockAlerts({ outOfStock: outProds, lowStock: lowProds });
        }).catch(() => {
          const lowProds = Object.entries(lowMap).map(([name, variants]) => ({ name, variants }));
          setStockAlerts({ outOfStock: [], lowStock: lowProds });
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => { loadStockAlerts(); }, [loadStockAlerts]);

  // Product modal
  const [prodModal, setProdModal] = useState(false);
  const [editingProd, setEditingProd] = useState(null);
  const [prodForm, setProdForm] = useState(emptyProduct);
  const [prodImage, setProdImage] = useState(null);
  const [savingProd, setSavingProd] = useState(false);
  // Inline variants (only used when creating a new product)
  const [inlineVariants, setInlineVariants] = useState([newVariantRow()]);

  // Variant edit modal (for existing products)
  const [varModal, setVarModal] = useState(false);
  const [varProdId, setVarProdId] = useState(null);
  const [editingVar, setEditingVar] = useState(null);
  const [varForm, setVarForm] = useState(emptyVariant);
  const [savingVar, setSavingVar] = useState(false);

  // Debounce search
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1); // Reset to page 1 on new search
    }, 350);
  };

  const handleCatFilterChange = (e) => {
    setCatFilter(e.target.value);
    setPage(1); // Reset to page 1 on new filter
  };

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    const params = { page, limit: 20, exclude_bundles: true };
    if (catFilter && catFilter !== 'all') params.category_id = catFilter;
    if (debouncedSearch) params.search = debouncedSearch;

    Promise.all([
      productsAPI.getAll(params),
      categoriesAPI.getAll(),
    ]).then(([pRes, cRes]) => {
      setProducts(Array.isArray(pRes.data) ? pRes.data : []);
      setPagination(pRes.pagination || null);
      setCategories(Array.isArray(cRes.data) ? cRes.data : []);
    }).catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [catFilter, debouncedSearch, page]);

  useEffect(() => { load(); }, [load]);

  // ─── Inline variant helpers ──────────────────────────────────────────────────
  const addInlineVariant = () =>
    setInlineVariants(v => [...v, newVariantRow()]);

  const removeInlineVariant = (key) =>
    setInlineVariants(v => v.filter(r => r._key !== key));

  const updateInlineVariant = (key, field, value) =>
    setInlineVariants(v => v.map(r => r._key === key ? { ...r, [field]: value } : r));

  // ─── Product CRUD ────────────────────────────────────────────────────────────
  const openCreateProd = () => {
    setEditingProd(null);
    setProdForm(emptyProduct);
    setProdImage(null);
    setInlineVariants([newVariantRow()]);
    setProdModal(true);
  };

  const openEditProd = (p) => {
    setEditingProd(p);
    setProdForm({ name: p.name, description: p.description || '', category_id: p.category_id || '', base_price: p.base_price, is_active: p.is_active });
    setProdImage(null);
    setInlineVariants([]);
    setProdModal(true);
  };

  // Derived: does the inline variants list have at least one named entry?
  const hasAtLeastOneVariant = inlineVariants.some(v => v.name.trim() !== '');

  const handleProdSubmit = async (e) => {
    e.preventDefault();

    // When creating a new product, require at least one variant with a name
    if (!editingProd && !hasAtLeastOneVariant) {
      alert('يجب إضافة متغير واحد على الأقل قبل حفظ المنتج. أدخل اسماً للمتغير الأول.');
      return;
    }

    setSavingProd(true);
    try {
      const fd = new FormData();
      // Append standard fields
      Object.entries(prodForm).forEach(([k, v]) => {
        fd.append(k, v);
      });
      if (prodImage) fd.append('image', prodImage);

      if (editingProd) {
        await productsAPI.update(editingProd.id, fd);
      } else {
        const created = await productsAPI.create(fd);
        const newId = created?.data?.id;
        if (newId) {
          const variantsToSave = inlineVariants.filter(v => v.name.trim() !== '');
          for (const v of variantsToSave) {
            const payload = {
              name: v.name.trim(),
              sku: v.sku.trim() || undefined,
              price_override: v.price_override !== '' ? Number(v.price_override) : null,
              stock_quantity: Number(v.stock_quantity) || 0,
            };
            await productsAPI.createVariant(newId, payload);
          }
        }
      }
      setProdModal(false);
      load();
    } catch (err) { alert(err.message); }
    finally { setSavingProd(false); }
  };

  const handleDeleteProd = async (id) => {
    if (!window.confirm('حذف هذا المنتج؟')) return;
    try { await productsAPI.delete(id); load(); }
    catch (err) { alert(err.message); }
  };

  // ─── Standalone variant modal (add/edit on existing product) ─────────────────
  const openCreateVar = (productId) => {
    setVarProdId(productId);
    setEditingVar(null);
    setVarForm(emptyVariant);
    setVarModal(true);
  };

  const openEditVar = (productId, v) => {
    setVarProdId(productId);
    setEditingVar(v);
    setVarForm({ name: v.name, sku: v.sku || '', price_override: v.price_override || '', stock_quantity: v.stock_quantity });
    setVarModal(true);
  };

  const handleVarSubmit = async (e) => {
    e.preventDefault();
    setSavingVar(true);
    const payload = {
      ...varForm,
      price_override: varForm.price_override === '' ? null : Number(varForm.price_override),
      stock_quantity: Number(varForm.stock_quantity),
    };
    try {
      if (editingVar) await productsAPI.updateVariant(editingVar.id, payload);
      else await productsAPI.createVariant(varProdId, payload);
      setVarModal(false);
      load();
    } catch (err) { alert(err.message); }
    finally { setSavingVar(false); }
  };

  const handleDeleteVar = async (variantId) => {
    if (!window.confirm('حذف هذا المتغير؟')) return;
    try { await productsAPI.deleteVariant(variantId); load(); }
    catch (err) { alert(err.message); }
  };

  const fmt = n => new Intl.NumberFormat('ar-DZ').format(n);

  return (
    <div className={`${s.page} ${s.pageWrapper}`}>
      <div className={s.pageHeader}>
        <div className={s.headerText}>
          <h1 className={s.pageTitle}>المنتجات</h1>
          <p className={s.pageSubtitle}>إدارة المنتجات ومتغيراتها ومخزونها</p>
        </div>
        <div className={s.headerActions}>
          <button className={`${s.btn} ${s.btnPrimary}`} onClick={openCreateProd}><Plus size={16} /> إضافة منتج</button>
        </div>
      </div>



      <div className={s.card}>
        <div className={s.toolbar}>
          <input
            className={s.toolbarSearch}
            placeholder="بحث عن منتج..."
            value={search}
            onChange={handleSearchChange}
          />
          <select className={s.select} value={catFilter} onChange={handleCatFilterChange}>
            <option value="">جميع الأقسام</option>
            <option value="no_category">بدون قسم</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            {pagination ? `إجمالي المنتجات: ${pagination.total}` : `${products.length} منتج`}
          </span>
        </div>

        {loading ? <Spinner center /> : error ? (
          <div className={`${s.alert} ${s.alertError}`} style={{ margin: 24 }}>{error}</div>
        ) : (
          <div className={t.wrapper}>
            <table className={t.table}>
              <thead>
                <tr><th>المنتج</th><th>القسم</th><th>السعر الأساسي</th><th>المتغيرات</th><th>الحالة</th><th>إجراءات</th></tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <React.Fragment key={p.id}>
                    <tr style={{
                      borderRight: (p.variants || []).some(v => (v.stock_quantity ?? 0) === 0)
                        ? '4px solid #e63946'
                        : (p.variants || []).some(v => (v.stock_quantity ?? 0) > 0 && (v.stock_quantity ?? 0) < 5)
                        ? '4px solid #f59e0b'
                        : 'none',
                      background: (p.variants || []).some(v => (v.stock_quantity ?? 0) === 0)
                        ? 'rgba(230,57,70,0.04)'
                        : (p.variants || []).some(v => (v.stock_quantity ?? 0) > 0 && (v.stock_quantity ?? 0) < 5)
                        ? 'rgba(245,158,11,0.04)'
                        : undefined,
                    }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {p.image_url
                            ? <img src={p.image_url} alt={p.name} style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', objectFit: 'cover' }} />
                            : <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}><Package size={18} /></div>
                          }
                          <span style={{ fontWeight: 700 }}>{p.name}</span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{p.category_name || '—'}</td>
                      <td style={{ fontWeight: 800 }}>{fmt(p.base_price)} دج</td>
                      <td>
                        <button
                          style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--primary)', fontWeight: 700, fontSize: '0.85rem' }}
                          onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                        >
                          {(p.variants || []).length} متغير
                          {expanded === p.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </button>
                      </td>
                      <td>
                        <span className={t.statusBadge} style={{ background: p.is_active ? 'var(--success-bg)' : 'var(--danger-bg)', color: p.is_active ? 'var(--success)' : 'var(--danger)' }}>
                          {p.is_active ? 'نشط' : 'مخفي'}
                        </span>
                      </td>
                      <td>
                        <div className={t.actions}>
                          <button className={t.actionBtn} onClick={() => openEditProd(p)}><Pencil size={16} /></button>
                          <button className={`${t.actionBtn} ${t.danger}`} onClick={() => handleDeleteProd(p.id)}><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>

                    {expanded === p.id && (
                      <tr>
                        <td colSpan={6} className={s.variantsRow}>
                          <div className={s.variantsInner}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                              <strong style={{ fontSize: '0.9rem' }}>المتغيرات</strong>
                              <button className={`${s.btn} ${s.btnPrimary} ${s.btnSm}`} onClick={() => openCreateVar(p.id)}><Plus size={14} /> إضافة متغير</button>
                            </div>
                            {(p.variants || []).length === 0 ? (
                              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>لا توجد متغيرات — أضف متغيراً لتحديد السعر والمخزون</p>
                            ) : (
                              <table className={t.table} style={{ fontSize: '0.88rem' }}>
                                <thead><tr><th>الاسم</th><th>SKU</th><th>السعر</th><th>المخزون</th><th>إجراءات</th></tr></thead>
                                <tbody>
                                  {(p.variants || []).map(v => (
                                    <tr key={v.id}>
                                      <td style={{ fontWeight: 700 }}>{v.name}</td>
                                      <td style={{ color: 'var(--text-muted)' }}>{v.sku || '—'}</td>
                                      <td>{v.price_override ? `${fmt(v.price_override)} دج` : `${fmt(p.base_price)} دج (أساسي)`}</td>
                                      <td>
                                        <span style={{ fontWeight: 800, color: v.stock_quantity < 5 ? 'var(--danger)' : 'var(--success)' }}>
                                          {v.stock_quantity === 0 ? 'نفد' : v.stock_quantity}
                                        </span>
                                      </td>
                                      <td>
                                        <div className={t.actions}>
                                          <button className={t.actionBtn} onClick={() => openEditVar(p.id, v)}><Pencil size={14} /></button>
                                          <button className={`${t.actionBtn} ${t.danger}`} onClick={() => handleDeleteVar(v.id)}><Trash2 size={14} /></button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
                {products.length === 0 && <tr><td colSpan={6} className={t.empty}>لا توجد منتجات</td></tr>}
              </tbody>
            </table>

            {pagination && pagination.totalPages > 1 && (
              <div className={s.pagination}>
                <span>
                  صفحة {pagination.page} من {pagination.totalPages}
                </span>
                <div className={s.paginationBtns}>
                  <button
                    className={s.pageBtn}
                    disabled={!pagination.hasPrev}
                    onClick={() => setPage(p => p - 1)}
                  >
                    السابق
                  </button>
                  <button
                    className={s.pageBtn}
                    disabled={!pagination.hasNext}
                    onClick={() => setPage(p => p + 1)}
                  >
                    التالي
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          Product Modal — CREATE (has inline variants) / EDIT (no variants)
      ════════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={prodModal}
        onClose={() => setProdModal(false)}
        title={editingProd ? 'تعديل المنتج' : 'إضافة منتج جديد'}
        size="lg"
      >
        <form onSubmit={handleProdSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ── Basic product info ─────────────────────────────────────── */}
          <div className={s.formGrid}>
            <div className={`${s.formGroup} ${s.formFull}`}>
              <label className={s.label}>اسم المنتج *</label>
              <input className={s.input} required value={prodForm.name}
                onChange={e => setProdForm(f => ({ ...f, name: e.target.value }))}
                placeholder="مثال: حليب نيدو" />
            </div>
            <div className={s.formGroup}>
              <label className={s.label}>السعر الأساسي (دج) *</label>
              <input type="number" step="0.01" min="0" className={s.input} required
                value={prodForm.base_price}
                onChange={e => setProdForm(f => ({ ...f, base_price: e.target.value }))}
                placeholder="250.00" />
            </div>

            <div className={s.formGroup}>
              <label className={s.label}>القسم</label>
              <select className={s.input} value={prodForm.category_id}
                onChange={e => setProdForm(f => ({ ...f, category_id: e.target.value }))}>
                <option value="">بدون قسم</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className={s.formGroup}>
              <label className={s.label}>صورة المنتج (اختياري)</label>
              <input type="file" accept="image/*" className={s.input}
                onChange={e => setProdImage(e.target.files[0])} />
            </div>
            <div className={`${s.formGroup} ${s.formFull}`}>
              <label className={s.label}>الوصف</label>
              <textarea className={s.textarea} rows={3} value={prodForm.description}
                onChange={e => setProdForm(f => ({ ...f, description: e.target.value }))}
                placeholder="وصف مختصر للمنتج..." />
            </div>
            <div className={s.formGroup} style={{ justifyContent: 'flex-end' }}>
              <label className={s.label}>الحالة</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700 }}>
                <label className={s.toggle}>
                  <input type="checkbox" checked={prodForm.is_active}
                    onChange={e => setProdForm(f => ({ ...f, is_active: e.target.checked }))} />
                  <span className={s.toggleSlider}></span>
                </label>
                {prodForm.is_active ? 'نشط' : 'مخفي'}
              </label>
            </div>
          </div>

          {/* ── Inline variants section (create mode only) ────────────── */}
          {!editingProd && (
            <div style={{
              borderTop: '2px dashed var(--border)',
              paddingTop: 20,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <h3 style={{ fontWeight: 800, fontSize: '0.95rem', marginBottom: 2 }}>
                    المتغيرات والمخزون
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    أضف متغيرات المنتج (حجم، وزن، لون…) وكمياتها في المخزون
                  </p>
                </div>
                <button
                  type="button"
                  className={`${s.btn} ${s.btnOutline} ${s.btnSm}`}
                  onClick={addInlineVariant}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
                >
                  <Plus size={14} /> إضافة متغير
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {inlineVariants.map((v, idx) => (
                  <div
                    key={v._key}
                    style={{
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                    }}
                  >
                    {/* Row badge */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{
                        fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.04em',
                        color: 'var(--primary)', background: 'var(--primary-light)',
                        padding: '2px 10px', borderRadius: 'var(--radius-pill)',
                      }}>
                        متغير #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeInlineVariant(v._key)}
                        disabled={inlineVariants.length === 1}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          width: 28, height: 28, borderRadius: 'var(--radius-sm)',
                          background: inlineVariants.length === 1 ? 'transparent' : 'var(--danger-bg)',
                          color: inlineVariants.length === 1 ? 'var(--text-muted)' : 'var(--danger)',
                          border: 'none', cursor: inlineVariants.length === 1 ? 'default' : 'pointer',
                          transition: 'all 0.2s',
                        }}
                        title="حذف هذا المتغير"
                      >
                        <X size={13} />
                      </button>
                    </div>

                    {/* Top row: Variant Name + SKU auto-gen */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

                      {/* Variant name */}
                      <div className={s.formGroup}>
                        <label className={s.label}>اسم المتغير *</label>
                        <input
                          className={s.input}
                          placeholder="مثال: 1 لتر، 500 غرام، كبير"
                          value={v.name}
                          onChange={e => updateInlineVariant(v._key, 'name', e.target.value)}
                          style={{ margin: 0 }}
                        />
                      </div>

                      {/* SKU — auto-generate from product name + variant name */}
                      <div className={s.formGroup}>
                        <label className={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>SKU <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(اختياري)</span></span>
                          <button
                            type="button"
                            title="توليد SKU تلقائياً"
                            onClick={() => updateInlineVariant(v._key, 'sku', generateSKU(prodForm.name, v.name))}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 4,
                              fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)',
                              background: 'var(--primary-light)', border: 'none', cursor: 'pointer',
                              padding: '2px 8px', borderRadius: 'var(--radius-pill)',
                              transition: 'all 0.15s',
                            }}
                          >
                            <RefreshCw size={11} /> توليد تلقائي
                          </button>
                        </label>
                        <input
                          className={s.input}
                          placeholder="مثال: PROD-1L"
                          value={v.sku}
                          onChange={e => updateInlineVariant(v._key, 'sku', e.target.value)}
                          style={{ margin: 0, fontFamily: 'monospace', letterSpacing: '0.05em', fontSize: '0.88rem' }}
                        />
                      </div>
                    </div>

                    {/* Bottom row: Price + Quantity stepper */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'end' }}>

                      {/* Price override */}
                      <div className={s.formGroup}>
                        <label className={s.label}>
                          سعر مختلف (دج)
                          <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginRight: 6 }}>— اتركه فارغاً لاستخدام السعر الأساسي</span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className={s.input}
                          placeholder="اختياري"
                          value={v.price_override}
                          onChange={e => updateInlineVariant(v._key, 'price_override', e.target.value)}
                          style={{ margin: 0 }}
                        />
                      </div>

                      {/* Quantity stepper */}
                      <div className={s.formGroup}>
                        <label className={s.label} style={{ textAlign: 'center' }}>الكمية في المخزون</label>
                        <div style={{
                          display: 'flex', alignItems: 'center',
                          border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                          overflow: 'hidden', background: 'var(--surface)',
                          height: 42,
                        }}>
                          <button
                            type="button"
                            onClick={() => updateInlineVariant(v._key, 'stock_quantity', Math.max(0, Number(v.stock_quantity) - 1))}
                            style={{
                              width: 40, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: 'var(--bg)', border: 'none', borderLeft: '1px solid var(--border)',
                              cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0,
                              transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--danger-bg)'; e.currentTarget.style.color = 'var(--danger)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                          >
                            <Minus size={14} />
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={v.stock_quantity}
                            onChange={e => updateInlineVariant(v._key, 'stock_quantity', Math.max(0, Number(e.target.value)))}
                            style={{
                              width: 64, textAlign: 'center', border: 'none',
                              fontWeight: 800, fontSize: '1rem', background: 'transparent',
                              fontFamily: 'inherit', outline: 'none', color: 'var(--text)',
                              padding: '0 4px',
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => updateInlineVariant(v._key, 'stock_quantity', Number(v.stock_quantity) + 1)}
                            style={{
                              width: 40, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: 'var(--bg)', border: 'none', borderRight: '1px solid var(--border)',
                              cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0,
                              transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--success-bg)'; e.currentTarget.style.color = 'var(--success)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                ))}
              </div>

              <p style={{ fontSize: '0.78rem', marginTop: 8, color: hasAtLeastOneVariant ? 'var(--text-muted)' : 'var(--danger)', fontWeight: hasAtLeastOneVariant ? 400 : 600 }}>
                {hasAtLeastOneVariant
                  ? '💡 سيتم حفظ المتغيرات التي تحتوي على اسم فقط — المتغيرات ذات الاسم الفارغ سيتم تجاهلها'
                  : '⚠️ مطلوب: أدخل اسماً للمتغير الأول على الأقل لتتمكن من حفظ المنتج'}
              </p>
            </div>
          )}

          {/* ── Form actions ───────────────────────────────────────────── */}
          <div className={s.formActions}>
            <button type="button" className={`${s.btn} ${s.btnOutline}`} onClick={() => setProdModal(false)}>
              إلغاء
            </button>
            <button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={savingProd || (!editingProd && !hasAtLeastOneVariant)}>
              {savingProd
                ? 'جارٍ الحفظ...'
                : editingProd ? 'حفظ التعديلات' : 'إضافة المنتج'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════
          Standalone variant modal — add/edit on an existing product
      ════════════════════════════════════════════════════════════════ */}
      <Modal isOpen={varModal} onClose={() => setVarModal(false)} title={editingVar ? 'تعديل المتغير' : 'إضافة متغير'}>
        <form onSubmit={handleVarSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className={s.formGroup}>
            <label className={s.label}>اسم المتغير * (مثال: 1 لتر، 500 غرام)</label>
            <input className={s.input} required value={varForm.name}
              onChange={e => setVarForm(f => ({ ...f, name: e.target.value }))} placeholder="1 لتر" />
          </div>
          <div className={s.formGrid}>
            <div className={s.formGroup}>
              <label className={s.label}>SKU (اختياري)</label>
              <input className={s.input} value={varForm.sku}
                onChange={e => setVarForm(f => ({ ...f, sku: e.target.value }))} placeholder="PROD-001-L" />
            </div>
            <div className={s.formGroup}>
              <label className={s.label}>سعر مختلف (دج) — اتركه فارغاً للسعر الأساسي</label>
              <input type="number" step="0.01" min="0" className={s.input} value={varForm.price_override}
                onChange={e => setVarForm(f => ({ ...f, price_override: e.target.value }))} placeholder="اختياري" />
            </div>
            <div className={s.formGroup}>
              <label className={s.label}>الكمية في المخزون</label>
              <input type="number" min="0" className={s.input} required value={varForm.stock_quantity}
                onChange={e => setVarForm(f => ({ ...f, stock_quantity: e.target.value }))} />
            </div>
          </div>
          <div className={s.formActions}>
            <button type="button" className={`${s.btn} ${s.btnOutline}`} onClick={() => setVarModal(false)}>إلغاء</button>
            <button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={savingVar}>
              {savingVar ? 'جارٍ الحفظ...' : editingVar ? 'حفظ' : 'إضافة'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Products;