import React, { useEffect, useState, useMemo } from 'react';
import { Tag, PackageOpen, Layers, Plus, Trash2, X, ShoppingBag } from 'lucide-react';
import { productsAPI, categoriesAPI } from '../../../api';
import Spinner from '../../../components/Spinner/Spinner';
import Modal from '../../../components/Modal/Modal';
import s from './Offers.module.css';
import adminS from '../../../styles/admin.module.css';

const fmt = n => new Intl.NumberFormat('ar-DZ').format(Number(n) || 0);
const parseVO = (vo) => {
  if (!vo) return [];
  if (Array.isArray(vo)) return vo;
  try { return JSON.parse(vo); } catch { return []; }
};
const emptyVORow = () => ({ label: '', quantity: '', price: '' });

// ── Product Picker sub-component (used by Promo and Volume) ───────────────────
const ProductPicker = ({ products, categories, onSelect, excludeIds = [], actionLabel = 'اختيار' }) => {
  const [search, setSearch]   = useState('');
  const [catId,  setCatId]    = useState('');

  const filtered = useMemo(() =>
    products.filter(p =>
      !excludeIds.includes(p.id) &&
      p.name.toLowerCase().includes(search.toLowerCase()) &&
      (!catId || String(p.category_id) === String(catId))
    ), [products, search, catId, excludeIds]
  );

  return (
    <div className={s.searchPanel}>
      {/* Search input */}
      <input
        className={s.input}
        placeholder="🔍 ابحث عن منتج..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        autoFocus
      />

      {/* Category chips */}
      <div className={s.catChips}>
        <button
          className={`${s.catChip} ${catId === '' ? s.catChipActive : ''}`}
          onClick={() => setCatId('')}
        >
          الكل
        </button>
        {categories.map(c => (
          <button
            key={c.id}
            className={`${s.catChip} ${String(catId) === String(c.id) ? s.catChipActive : ''}`}
            onClick={() => setCatId(catId === String(c.id) ? '' : String(c.id))}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Product list */}
      <div className={s.productList}>
        {filtered.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            لا توجد منتجات مطابقة
          </div>
        ) : filtered.slice(0, 30).map(p => (
          <div key={p.id} className={s.productItem} onClick={() => onSelect(p)}>
            {p.image_url
              ? <img src={p.image_url} alt={p.name} className={s.productItemImg} />
              : <div className={s.productItemImgPlaceholder}><ShoppingBag size={18} /></div>
            }
            <div className={s.productItemInfo}>
              <div className={s.productItemName}>{p.name}</div>
              <div className={s.productItemMeta}>
                {p.category_name && <span>{p.category_name}</span>}
                {p.variants?.length > 0 && <span> · {p.variants.length} متغيرات</span>}
              </div>
            </div>
            <div>
              <div className={s.productItemPrice}>{fmt(p.base_price)} دج</div>
              <button className={`${s.btn} ${s.btnOutline} ${s.btnSm}`} style={{ marginTop: 4 }}>
                {actionLabel}
              </button>
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>
        {filtered.length} منتج متاح
      </div>
    </div>
  );
};

// ── Variant Picker — shows ALL variants flat (product + variant in one row) ──
const VariantPicker = ({ products, categories, onSelect, excludeKeys = [] }) => {
  const [search, setSearch] = useState('');
  const [catId,  setCatId]  = useState('');

  // Flatten all products × variants into one list
  const allVariants = useMemo(() => {
    const rows = [];
    products.forEach(p => {
      if (p.variants && p.variants.length > 0) {
        p.variants.forEach(v => {
          const key = `${p.id}-${v.id}`;
          if (!excludeKeys.includes(key)) {
            rows.push({
              key,
              product_id: p.id,
              variant_id: v.id,
              productName: p.name,
              variantName: v.name,
              category_name: p.category_name,
              category_id: p.category_id,
              image_url: p.image_url,
              price: parseFloat(v.price_override || p.base_price),
              stock: v.stock_quantity ?? 0,
            });
          }
        });
      } else {
        // Product with no variants
        const key = `${p.id}-null`;
        if (!excludeKeys.includes(key)) {
          rows.push({
            key,
            product_id: p.id,
            variant_id: null,
            productName: p.name,
            variantName: null,
            category_name: p.category_name,
            category_id: p.category_id,
            image_url: p.image_url,
            price: parseFloat(p.base_price),
            stock: 0,
          });
        }
      }
    });
    return rows;
  }, [products, excludeKeys]);

  const filtered = useMemo(() =>
    allVariants.filter(v =>
      (!catId || String(v.category_id) === String(catId)) &&
      (!search ||
        v.productName.toLowerCase().includes(search.toLowerCase()) ||
        (v.variantName || '').toLowerCase().includes(search.toLowerCase()))
    ), [allVariants, search, catId]
  );

  return (
    <div className={s.searchPanel}>
      <input
        className={s.input}
        placeholder="🔍 ابحث باسم المنتج أو المقاس..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        autoFocus
      />
      <div className={s.catChips}>
        <button className={`${s.catChip} ${catId === '' ? s.catChipActive : ''}`} onClick={() => setCatId('')}>الكل</button>
        {categories.map(c => (
          <button
            key={c.id}
            className={`${s.catChip} ${String(catId) === String(c.id) ? s.catChipActive : ''}`}
            onClick={() => setCatId(catId === String(c.id) ? '' : String(c.id))}
          >{c.name}</button>
        ))}
      </div>
      <div className={s.variantPickerList}>
        {filtered.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            لا توجد نتائج مطابقة
          </div>
        ) : filtered.map(v => {
          const stockColor = v.stock === 0 ? 'var(--danger)' : v.stock < 5 ? '#f59e0b' : '#10b981';
          return (
            <div key={v.key} className={s.variantPickerRow} onClick={() => onSelect(v)}>
              {v.image_url
                ? <img src={v.image_url} alt={v.productName} className={s.variantPickerImg} />
                : <div className={s.variantPickerImgPlaceholder}><ShoppingBag size={16} /></div>
              }
              <div className={s.variantPickerInfo}>
                <div className={s.variantPickerName}>{v.productName}</div>
                {v.variantName && <div className={s.variantPickerSub}>{v.variantName}</div>}
                <div className={s.variantPickerCategory}>{v.category_name}</div>
              </div>
              <div className={s.variantPickerRight}>
                <span className={s.variantPickerPrice}>{fmt(v.price)} دج</span>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: stockColor }}>
                  مخزون: {v.stock}
                </span>
              </div>
              <div className={s.variantPickerAddBtn}>+</div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', paddingTop: 6 }}>
        {filtered.length} متغير متاح
      </div>
    </div>
  );
};


// ── Selected product banner ───────────────────────────────────────────────────
const SelectedBanner = ({ product, onClear }) => (
  <div className={s.selectedBanner}>
    {product.image_url
      ? <img src={product.image_url} alt={product.name} className={s.selectedBannerImg} />
      : <div className={s.productItemImgPlaceholder}><ShoppingBag size={18} /></div>
    }
    <div className={s.selectedBannerInfo} style={{ marginLeft: 12, flex: 1 }}>
      <div className={s.selectedBannerName}>{product.name}</div>
      <div className={s.selectedBannerSub}>
        {product.category_name && <span>{product.category_name} · </span>}
        السعر الحالي: <strong>{fmt(product.base_price)} دج</strong>
      </div>
    </div>
    <button className={s.selectedBannerClose} onClick={onClear} title="تغيير المنتج">
      <X size={16} />
    </button>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const AdminOffers = () => {
  const [loading, setLoading]     = useState(true);
  const [offers, setOffers]       = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [categories, setCategories]   = useState([]);
  const [error, setError]         = useState(null);

  const [activeModal, setActiveModal] = useState(null);
  const [saving, setSaving]           = useState(false);

  // Promo state
  const [promoTarget, setPromoTarget] = useState(null);
  const [promoVariant, setPromoVariant] = useState(null);
  const [promoSalePrice, setPromoSalePrice] = useState(''); // the new discounted price

  // Volume state
  const [volTarget, setVolTarget] = useState(null);
  const [volVariant, setVolVariant] = useState(null);
  const [volRows, setVolRows]     = useState([emptyVORow()]);

  // Bundle state
  const [bundleName,  setBundleName]  = useState('');
  const [bundleDesc,  setBundleDesc]  = useState('');
  const [bundlePrice, setBundlePrice] = useState('');
  const [bundleItems, setBundleItems] = useState([]);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const refresh = async () => {
    try {
      setLoading(true);
      const [resOffers, resAll, resCats] = await Promise.all([
        productsAPI.getAll({ is_offer: true, is_active: true, limit: 200 }),
        productsAPI.getAll({ limit: 1000 }),
        categoriesAPI.getAll(),
      ]);
      setOffers(resOffers.data || []);
      setAllProducts((resAll.data || []).filter(p => !p.is_bundle));
      setCategories(resCats.data || []);
    } catch (err) {
      setError('فشل تحميل البيانات: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const openModal = (type) => {
    setActiveModal(type);
    setPromoTarget(null); setPromoVariant(null); setPromoSalePrice('');
    setVolTarget(null); setVolVariant(null); setVolRows([emptyVORow()]);
    setBundleName(''); setBundleDesc(''); setBundlePrice(''); setBundleItems([]);
  };

  // ── Save: Promo ───────────────────────────────────────────────────────────
  const savePromo = async () => {
    if (!promoTarget || !promoSalePrice) return;
    try {
      setSaving(true);
      if (promoVariant) {
        // Saving at variant level
        const currentOriginal = promoVariant.compare_at_price_override || promoVariant.price_override || promoTarget.compare_at_price || promoTarget.base_price;
        const data = {
          compare_at_price_override: currentOriginal,
          price_override: promoSalePrice
        };
        await productsAPI.updateVariant(promoVariant.id, data);
      } else {
        // Saving at product level
        const currentOriginal = promoTarget.compare_at_price || promoTarget.base_price;
        const fd = new FormData();
        fd.append('compare_at_price', currentOriginal);
        fd.append('base_price', promoSalePrice);
        await productsAPI.update(promoTarget.id, fd);
      }
      await refresh();
      setActiveModal(null);
    } catch (err) { alert('خطأ: ' + err.message); }
    finally { setSaving(false); }
  };

  // ── Save: Volume ──────────────────────────────────────────────────────────
  const saveVolume = async () => {
    if (!volTarget) return;
    const valid = volRows.filter(r => r.label && r.quantity && r.price);
    if (!valid.length) { alert('يرجى إدخال عرض كمية واحد على الأقل'); return; }
    
    const quantities = valid.map(r => parseInt(r.quantity));
    const uniqueQuantities = new Set(quantities);
    if (quantities.length !== uniqueQuantities.size) {
      alert('لا يمكن تكرار نفس الكمية في عروض الكمية (مثلاً إدخال "4 قطع" مرتين). يرجى التأكد من أن كل عرض يخص كمية مختلفة.');
      return;
    }
    try {
      setSaving(true);
      if (volVariant) {
        // Variant level
        await productsAPI.updateVariant(volVariant.id, { volume_offers: JSON.stringify(valid) });
      } else {
        // Product level
        const fd = new FormData();
        fd.append('volume_offers', JSON.stringify(valid));
        await productsAPI.update(volTarget.id, fd);
      }
      await refresh();
      setActiveModal(null);
    } catch (err) { alert('خطأ: ' + err.message); }
    finally { setSaving(false); }
  };

  // ── Save: Bundle ──────────────────────────────────────────────────────────
  const saveBundle = async () => {
    if (!bundleName || !bundlePrice || !bundleItems.length) {
      alert('يرجى إدخال اسم الباقة وسعرها وإضافة منتج واحد على الأقل');
      return;
    }
    try {
      setSaving(true);
      const fd = new FormData();
      fd.append('name', bundleName);
      if (bundleDesc) fd.append('description', bundleDesc);
      fd.append('base_price', bundlePrice);
      fd.append('is_bundle', 'true');
      fd.append('is_active', 'true');
      const res = await productsAPI.create(fd);
      const newId = res.data?.id;
      if (newId && bundleItems.length) {
        await productsAPI.setBundleItems(newId, bundleItems.map(i => ({
          product_id: i.product_id,
          variant_id: i.variant_id || null,
          quantity: i.quantity,
        })));
      }
      await refresh();
      setActiveModal(null);
    } catch (err) { alert('خطأ: ' + err.message); }
    finally { setSaving(false); }
  };

  // ── Remove helpers ────────────────────────────────────────────────────────
  const removePromo = async (obj) => {
    const isVar = obj.type === 'variant';
    const name = isVar ? `${obj.parent.name} (${obj.item.name})` : obj.item.name;
    if (!window.confirm(`إزالة التخفيض من "${name}"؟ سيعود المنتج إلى سعره الأصلي.`)) return;

    if (isVar) {
      // Restore original price_override from compare_at_price_override, then clear promo
      const originalPrice = obj.item.compare_at_price_override;
      await productsAPI.updateVariant(obj.item.id, {
        price_override: originalPrice,
        compare_at_price_override: '',
      });
    } else {
      // Restore base_price from compare_at_price, then clear promo
      const originalPrice = obj.item.compare_at_price;
      const fd = new FormData();
      fd.append('base_price', originalPrice);
      fd.append('compare_at_price', '');
      await productsAPI.update(obj.item.id, fd);
    }
    await refresh();
  };

  const removeVolume = async (obj) => {
    const isVar = obj.type === 'variant';
    const name = isVar ? `${obj.parent.name} (${obj.item.name})` : obj.item.name;
    if (!window.confirm(`إزالة عروض الكمية من "${name}"؟`)) return;

    if (isVar) {
      await productsAPI.updateVariant(obj.item.id, { volume_offers: JSON.stringify([]) });
    } else {
      const fd = new FormData();
      fd.append('volume_offers', JSON.stringify([]));
      await productsAPI.update(obj.item.id, fd);
    }
    await refresh();
  };

  const removeBundle = async (id, name) => {
    if (!window.confirm(`هل أنت متأكد من حذف الباقة "${name}" نهائياً؟`)) return;
    try {
      await productsAPI.delete(id);
      await refresh();
    } catch (err) {
      alert('حدث خطأ أثناء الحذف: ' + err.message);
    }
  };

  // ── Derived data ──────────────────────────────────────────────────────────
  if (loading && !offers.length) return (
    <div style={{ height: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spinner />
    </div>
  );
  if (error) return <div style={{ color: 'var(--danger)', padding: 20 }}>{error}</div>;

  const promos = [];
  const volList = [];
  const bundles = offers.filter(p => p.is_bundle);

  offers.filter(p => !p.is_bundle).forEach(p => {
    // Check product-level promo
    if (parseFloat(p.compare_at_price) > parseFloat(p.base_price)) {
      promos.push({ type: 'product', item: p, parent: null });
    }
    // Check product-level volume offer
    if (parseVO(p.volume_offers).length > 0) {
      volList.push({ type: 'product', item: p, parent: null });
    }

    // Check variant-level offers
    p.variants?.forEach(v => {
      if (parseFloat(v.compare_at_price_override) > parseFloat(v.price_override)) {
        promos.push({ type: 'variant', item: v, parent: p });
      }
      if (parseVO(v.volume_offers).length > 0) {
        volList.push({ type: 'variant', item: v, parent: p });
      }
    });
  });

  const bundleOriginal = bundleItems.reduce((acc, i) => acc + i.base_price * i.quantity, 0);
  const bundleSaving   = bundleOriginal - parseFloat(bundlePrice || 0);

  // Discount % based on: how much cheaper is the sale price vs. original
  const promoBase = promoVariant ? (promoVariant.price_override || promoTarget.base_price) : (promoTarget ? promoTarget.base_price : 0);
  const promoDiscount = promoTarget && promoSalePrice && parseFloat(promoSalePrice) < parseFloat(promoBase)
    ? Math.round(((parseFloat(promoBase) - parseFloat(promoSalePrice)) / parseFloat(promoBase)) * 100)
    : null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '28px 32px' }} className={s.page}>

      {/* ── Page Header ── */}
      <div className={adminS.pageHeader}>
        <div className={adminS.headerText}>
          <h1 className={adminS.pageTitle}>العروض والحزم الذكية ✨</h1>
          <p className={adminS.pageSubtitle}>أضف وأدر جميع التخفيضات وعروض الكمية والباقات من مكان واحد.</p>
        </div>
        <div className={adminS.headerActions}>
          <button className={`${adminS.btn} ${adminS.btnOutline}`} onClick={() => openModal('promo')}>
            <Tag size={15} /> إضافة تخفيض
          </button>
          <button className={`${adminS.btn} ${adminS.btnOutline}`} onClick={() => openModal('volume')}>
            <Layers size={15} /> عرض كمية
          </button>
          <button className={`${adminS.btn} ${adminS.btnPrimary}`} onClick={() => openModal('bundle')}>
            <PackageOpen size={15} /> إنشاء باقة
          </button>
        </div>
      </div>

      {/* ── Stats Strip ── */}
      <div className={s.statsStrip}>
        <div className={`${s.statCard} ${s.statCardPromo}`}>
          <div className={`${s.statIcon} ${s.statIconPromo}`}>🏷️</div>
          <div>
            <div className={s.statLabel}>التخفيضات</div>
            <div className={s.statValue}>{promos.length}</div>
          </div>
        </div>
        <div className={`${s.statCard} ${s.statCardVol}`}>
          <div className={`${s.statIcon} ${s.statIconVol}`}>📦</div>
          <div>
            <div className={s.statLabel}>عروض الكمية</div>
            <div className={s.statValue}>{volList.length}</div>
          </div>
        </div>
        <div className={`${s.statCard} ${s.statCardBundle}`}>
          <div className={`${s.statIcon} ${s.statIconBundle}`}>🎁</div>
          <div>
            <div className={s.statLabel}>الباقات</div>
            <div className={s.statValue}>{bundles.length}</div>
          </div>
        </div>
      </div>

      {/* ── Promos ── */}
      <section className={s.section}>
        <h2 className={s.sectionTitle}>
          <Tag size={18} color="#ef4444" /> التخفيضات النشطة
          <span className={s.sectionTitleBadge}>{promos.length} عرض</span>
          <button className={`${s.btn} ${s.btnSm}`} style={{ marginRight: 'auto', background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8 }} onClick={() => openModal('promo')}><Plus size={13} /> إضافة</button>
        </h2>
        {promos.length === 0 ? (
          <div className={s.emptyState}>
            <span className={s.emptyStateIcon}>🏷️</span>
            <span className={s.emptyStateText}>لا توجد تخفيضات نشطة بعد.</span>
            <button className={`${s.btn} ${s.btnSm}`} style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8 }} onClick={() => openModal('promo')}><Plus size={13} /> إضافة تخفيض</button>
          </div>
        ) : (
          <div className={s.grid}>
            {promos.map(obj => {
              const p = obj.type === 'product' ? obj.item : obj.parent;
              const v = obj.type === 'variant' ? obj.item : null;
              const old = parseFloat(v ? v.compare_at_price_override : p.compare_at_price);
              const cur = parseFloat(v ? v.price_override : p.base_price);
              const disc = Math.round(((old - cur) / old) * 100);
              const key = v ? `v-${v.id}` : `p-${p.id}`;
              return (
                <div key={key} className={s.card}>
                  {p.image_url ? <img src={p.image_url} alt={p.name} className={s.cardImage} /> : <div className={s.cardImage} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', background: 'var(--surface)' }}><ShoppingBag size={24} /></div>}
                  <div className={s.cardContent}>
                    <div className={s.cardTitle}>{p.name}</div>
                    {v && <div className={s.variantTag}>📌 {v.name}</div>}
                    <div className={s.priceRow}>
                      <span className={s.currentPrice}>{fmt(cur)} دج</span>
                      <span className={s.oldPrice}>{fmt(old)} دج</span>
                      <span className={s.discountBadge}>-{disc}%</span>
                    </div>
                    {p.category_name && <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: 4 }}>{p.category_name}</div>}
                  </div>
                  <button className={s.cardDeleteBtn} onClick={() => removePromo(obj)} title="إزالة التخفيض"><Trash2 size={15} /></button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Volume Offers ── */}
      <section className={s.section}>
        <h2 className={s.sectionTitle}>
          <Layers size={18} color="var(--primary)" /> عروض الكميات
          <span className={s.sectionTitleBadge}>{volList.length} عرض</span>
          <button className={`${s.btn} ${s.btnSm}`} style={{ marginRight: 'auto', background: 'rgba(26,107,60,0.08)', color: 'var(--primary)', border: '1px solid rgba(26,107,60,0.2)', borderRadius: 8 }} onClick={() => openModal('volume')}><Plus size={13} /> إضافة</button>
        </h2>
        {volList.length === 0 ? (
          <div className={s.emptyState}>
            <span className={s.emptyStateIcon}>📦</span>
            <span className={s.emptyStateText}>لا توجد عروض كمية بعد.</span>
            <button className={`${s.btn} ${s.btnSm}`} style={{ background: 'rgba(26,107,60,0.08)', color: 'var(--primary)', border: '1px solid rgba(26,107,60,0.2)', borderRadius: 8 }} onClick={() => openModal('volume')}><Plus size={13} /> إضافة عرض كمية</button>
          </div>
        ) : (
          <div className={s.grid}>
            {volList.map(obj => {
              const p = obj.type === 'product' ? obj.item : obj.parent;
              const v = obj.type === 'variant' ? obj.item : null;
              const vo = parseVO(v ? v.volume_offers : p.volume_offers);
              const base = v ? (v.price_override || p.base_price) : p.base_price;
              const key = v ? `v-${v.id}` : `p-${p.id}`;
              return (
                <div key={key} className={s.card}>
                  {p.image_url ? <img src={p.image_url} alt={p.name} className={s.cardImage} /> : <div className={s.cardImage} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', background: 'var(--surface)' }}><ShoppingBag size={24} /></div>}
                  <div className={s.cardContent}>
                    <div className={s.cardTitle}>{p.name}</div>
                    {v && <div className={s.variantTag}>📌 {v.name}</div>}
                    <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', margin: '3px 0 5px' }}>سعر القطعة الواحدة: <strong>{fmt(base)} دج</strong></div>
                    {vo.map((vol, i) => (
                      <div key={i} className={s.volumeItem}>
                        <span>🛒 {vol.label} — {vol.quantity} قطعة</span>
                        <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.85rem' }}>{fmt(vol.price)} دج</span>
                      </div>
                    ))}
                  </div>
                  <button className={s.cardDeleteBtn} onClick={() => removeVolume(obj)} title="إزالة عروض الكمية"><Trash2 size={15} /></button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Bundles ── */}
      <section className={s.section}>
        <h2 className={s.sectionTitle}>
          <PackageOpen size={18} color="#7c3aed" /> الباقات المجمعة
          <span className={s.sectionTitleBadge}>{bundles.length} باقة</span>
          <button className={`${s.btn} ${s.btnSm}`} style={{ marginRight: 'auto', background: 'rgba(124,58,237,0.08)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 8 }} onClick={() => openModal('bundle')}><Plus size={13} /> إنشاء</button>
        </h2>
        {bundles.length === 0 ? (
          <div className={s.emptyState}>
            <span className={s.emptyStateIcon}>🎁</span>
            <span className={s.emptyStateText}>لم تقم بإنشاء أي باقة بعد.</span>
            <button className={`${s.btn} ${s.btnSm}`} style={{ background: 'rgba(124,58,237,0.08)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 8 }} onClick={() => openModal('bundle')}><Plus size={13} /> إنشاء باقة</button>
          </div>
        ) : (
          <div className={s.grid}>
            {bundles.map(p => (
              <div key={p.id} className={s.card}>
                {p.image_url ? <img src={p.image_url} alt={p.name} className={s.cardImage} /> : <div className={s.cardImage} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed', background: 'rgba(124,58,237,0.06)' }}><PackageOpen size={28} /></div>}
                <div className={s.cardContent}>
                  <div className={s.cardTitle}>{p.name}</div>
                  <div className={s.priceRow} style={{ marginTop: 4 }}><span className={s.currentPrice}>{fmt(p.base_price)} دج</span></div>
                  <span className={s.bundleLabel}>📦 باقة مجمعة</span>
                </div>
                <button className={s.cardDeleteBtn} onClick={() => removeBundle(p.id, p.name)} title="حذف الباقة"><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
        )}
      </section>


      {/* ════════════════════════════════════════════════════════
           MODAL 1 — Promo (Add Discount)
      ════════════════════════════════════════════════════════ */}
      <Modal isOpen={activeModal === 'promo'} onClose={() => setActiveModal(null)} title="🏷️ إضافة تخفيض على منتج">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Steps */}
          <div className={s.steps}>
            <div className={`${s.step} ${promoTarget ? s.stepDone : s.stepActive}`}>1. اختيار المنتج</div>
            <div className={`${s.step} ${promoTarget ? s.stepActive : ''}`}>2. تحديد سعر العرض</div>
          </div>

          {!promoTarget ? (
            <ProductPicker
              products={allProducts}
              categories={categories}
              onSelect={p => setPromoTarget(p)}
              actionLabel="اختيار"
            />
          ) : (
            <>
              <SelectedBanner product={promoTarget} onClear={() => { setPromoTarget(null); setPromoVariant(null); }} />

              {/* Variant Picker */}
              {promoTarget.variants?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <label className={s.label}>تطبيق التخفيض على:</label>
                  <select 
                    className={s.input} 
                    value={promoVariant ? promoVariant.id : ''} 
                    onChange={e => {
                      if (!e.target.value) setPromoVariant(null);
                      else setPromoVariant(promoTarget.variants.find(v => v.id === parseInt(e.target.value)));
                    }}
                  >
                    <option value="">كل المتغيرات (مستوى المنتج)</option>
                    {promoTarget.variants.map(v => (
                      <option key={v.id} value={v.id}>{v.name} {v.sku ? `(${v.sku})` : ''}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Explanation box */}
              <div style={{ background: 'rgba(26,107,60,0.06)', border: '1px solid rgba(26,107,60,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                💡 <strong>كيف يعمل:</strong> أدخل سعر العرض الجديد (المخفض)، وسيقوم النظام تلقائياً بعرض السعر الأصلي <strong>{fmt(promoBase)} دج</strong> مشطوباً بجانبه في المتجر.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className={s.label}>السعر الأصلي (سيظهر مشطوباً ~~)</label>
                  <input className={s.input} value={`${fmt(promoBase)} دج`} disabled style={{ textDecoration: 'line-through', color: 'var(--text-muted)' }} />
                </div>
                <div>
                  <label className={s.label}>سعر العرض الجديد (دج) *</label>
                  <input
                    type="number"
                    className={s.input}
                    placeholder={`مثال: ${Math.round(parseFloat(promoBase) * 0.8)}`}
                    value={promoSalePrice}
                    onChange={e => setPromoSalePrice(e.target.value)}
                    autoFocus
                    style={{ borderColor: promoSalePrice && promoDiscount !== null ? 'var(--primary)' : undefined }}
                  />
                </div>
              </div>

              {/* Live preview */}
              {promoDiscount !== null && (
                <div className={s.discountPreview}>
                  <span>🎉 سيظهر خصم <strong style={{ fontSize: '1.1rem' }}>{promoDiscount}%</strong> على بطاقة المنتج!</span>
                  <span style={{ color: 'var(--danger)', fontWeight: 700 }}>
                    العميل يوفر {fmt(parseFloat(promoBase) - parseFloat(promoSalePrice))} دج
                  </span>
                </div>
              )}
              {promoSalePrice && promoDiscount === null && (
                <div style={{ color: 'var(--danger)', fontSize: '0.82rem', padding: '6px 0' }}>
                  ⚠️ سعر العرض يجب أن يكون أقل من السعر الأصلي ({fmt(promoBase)} دج)
                </div>
              )}

              <button
                className={`${s.btn} ${s.btnPrimary}`}
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={savePromo}
                disabled={saving || !promoSalePrice || promoDiscount === null}
              >
                {saving ? <Spinner size="sm" /> : '🏷️ تفعيل التخفيض وحفظه'}
              </button>
            </>
          )}
        </div>
      </Modal>


      {/* ════════════════════════════════════════════════════════
           MODAL 2 — Volume Offers
      ════════════════════════════════════════════════════════ */}
      <Modal isOpen={activeModal === 'volume'} onClose={() => setActiveModal(null)} title="📦 إضافة عروض الكمية">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          <div className={s.steps}>
            <div className={`${s.step} ${volTarget ? s.stepDone : s.stepActive}`}>1. اختيار المنتج</div>
            <div className={`${s.step} ${volTarget ? s.stepActive : ''}`}>2. تحديد عروض الكمية</div>
          </div>

          {!volTarget ? (
            <ProductPicker
              products={allProducts}
              categories={categories}
              onSelect={p => setVolTarget(p)}
              actionLabel="اختيار"
            />
          ) : (
            <>
              <SelectedBanner product={volTarget} onClear={() => { setVolTarget(null); setVolVariant(null); }} />

              {/* Variant Picker */}
              {volTarget.variants?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <label className={s.label}>تطبيق عروض الكمية على:</label>
                  <select 
                    className={s.input} 
                    value={volVariant ? volVariant.id : ''} 
                    onChange={e => {
                      if (!e.target.value) setVolVariant(null);
                      else setVolVariant(volTarget.variants.find(v => v.id === parseInt(e.target.value)));
                    }}
                  >
                    <option value="">كل المتغيرات (مستوى المنتج)</option>
                    {volTarget.variants.map(v => (
                      <option key={v.id} value={v.id}>{v.name} {v.sku ? `(${v.sku})` : ''}</option>
                    ))}
                  </select>
                </div>
              )}

              <hr className={s.divider} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className={s.label} style={{ margin: 0 }}>عروض الكمية</label>
                <button className={`${s.btn} ${s.btnOutline} ${s.btnSm}`} onClick={() => setVolRows([...volRows, emptyVORow()])}>
                  <Plus size={13} /> إضافة خيار
                </button>
              </div>

              {/* Header row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 130px 40px', gap: 8, padding: '0 2px' }}>
                <span className={s.label}>اسم العرض</span>
                <span className={s.label}>الكمية</span>
                <span className={s.label}>السعر الإجمالي (دج)</span>
                <span />
              </div>

              {volRows.map((row, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 130px 40px', gap: 8, alignItems: 'center' }}>
                  <input
                    className={s.input}
                    placeholder="مثال: باقة التوفير"
                    value={row.label}
                    onChange={e => { const n=[...volRows]; n[idx].label=e.target.value; setVolRows(n); }}
                  />
                  <input
                    type="number" min="2" className={s.input}
                    value={row.quantity}
                    onChange={e => { const n=[...volRows]; n[idx].quantity=e.target.value; setVolRows(n); }}
                  />
                  <input
                    type="number" className={s.input}
                    value={row.price}
                    onChange={e => { const n=[...volRows]; n[idx].price=e.target.value; setVolRows(n); }}
                  />
                  <button
                    className={`${s.btn} ${s.btnDanger} ${s.btnSm}`}
                    style={{ padding: 8 }}
                    onClick={() => setVolRows(volRows.filter((_, i) => i !== idx))}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}

              {/* Live saving preview */}
              {volRows.filter(r => r.quantity && r.price).map((r, i) => {
                const unitP = parseFloat(volTarget.base_price);
                const saving = unitP * parseInt(r.quantity||0) - parseFloat(r.price||0);
                if (saving <= 0) return null;
                return (
                  <div key={i}>
                    <span className={s.savingBadge}>
                      ✅ {r.label || `خيار ${i+1}`}: يوفر العميل {fmt(saving)} دج مقارنة بالسعر العادي!
                    </span>
                  </div>
                );
              })}

              <button
                className={`${s.btn} ${s.btnPrimary}`}
                style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
                onClick={saveVolume}
                disabled={saving}
              >
                {saving ? <Spinner size="sm" /> : '💾 حفظ عروض الكمية'}
              </button>
            </>
          )}
        </div>
      </Modal>


      {/* ════════════════════════════════════════════════════════
           MODAL 3 — Bundle Builder
      ════════════════════════════════════════════════════════ */}
      <Modal isOpen={activeModal === 'bundle'} onClose={() => setActiveModal(null)} title="🎁 إنشاء باقة مجمعة" size="xl">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Bundle info row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12 }}>
            <div>
              <label className={s.label}>اسم الباقة *</label>
              <input className={s.input} placeholder="مثال: باقة النظافة الشاملة" value={bundleName} onChange={e => setBundleName(e.target.value)} />
            </div>
            <div style={{ width: 150 }}>
              <label className={s.label}>سعر الباقة (دج) *</label>
              <input type="number" className={s.input} placeholder="السعر الكلي" value={bundlePrice} onChange={e => setBundlePrice(e.target.value)} />
            </div>
          </div>

          <div>
            <label className={s.label}>وصف الباقة (اختياري)</label>
            <input className={s.input} placeholder="وصف مختصر للباقة يظهر في المتجر" value={bundleDesc} onChange={e => setBundleDesc(e.target.value)} />
          </div>

          <hr className={s.divider} />

          {/* Two-column picker + selected */}
          <div className={s.bundleLayout}>

            {/* Left: variant search */}
            <div>
              <label className={s.label} style={{ marginBottom: 10 }}>اختر المنتج والمتغير مباشرة</label>
              <VariantPicker
                products={allProducts}
                categories={categories}
                excludeKeys={bundleItems.map(i => i.key)}
                onSelect={v => {
                  setBundleItems(prev => [...prev, {
                    key: v.key,
                    product_id: v.product_id,
                    variant_id: v.variant_id,
                    variantName: v.variantName,
                    name: v.productName,
                    quantity: 1,
                    base_price: v.price,
                    image_url: v.image_url,
                    stock: v.stock,
                  }]);
                }}
              />
            </div>

            {/* Right: selected items */}
            <div>
              <label className={s.label} style={{ marginBottom: 10 }}>محتويات الباقة ({bundleItems.length} منتج)</label>

              {bundleItems.length === 0 ? (
                <div className={s.emptyBundle}>
                  🛍️ لم يتم اختيار أي منتجات بعد.<br />
                  <span style={{ fontSize: '0.8rem' }}>اختر من القائمة على اليسار</span>
                </div>
              ) : (
                <div className={s.bundleSelected}>
                  {bundleItems.map((item, idx) => (
                    <div key={item.key} className={s.bundleSelectedItem}>
                      {item.image_url
                        ? <img src={item.image_url} alt={item.name} style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                        : <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--bg)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}><ShoppingBag size={16} /></div>
                      }
                      <div className={s.bundleSelectedItemName}>
                        <div style={{ fontWeight: 800, fontSize: '0.88rem' }}>{item.name}</div>
                        {item.variantName && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700 }}>{item.variantName}</div>
                        )}
                        {item.stock !== undefined && (
                          <div style={{ fontSize: '0.72rem', color: item.stock === 0 ? 'var(--danger)' : item.stock < 5 ? '#f59e0b' : 'var(--text-muted)' }}>
                            مخزون: {item.stock} {item.quantity > item.stock ? '⚠️ يتجاوز المخزون!' : ''}
                          </div>
                        )}
                      </div>
                      <input
                        type="number" min="1" max={item.stock || 9999}
                        className={s.bundleQtyInput}
                        value={item.quantity}
                        style={item.quantity > item.stock ? { borderColor: 'var(--danger)' } : {}}
                        onChange={e => {
                          const n = [...bundleItems];
                          n[idx].quantity = parseInt(e.target.value) || 1;
                          setBundleItems(n);
                        }}
                      />
                      <span className={s.bundleItemCost}>{fmt(item.base_price * item.quantity)} دج</span>
                      <button
                        className={`${s.btn} ${s.btnDanger} ${s.btnSm}`}
                        style={{ padding: '3px 6px' }}
                        onClick={() => setBundleItems(bundleItems.filter(i => i.key !== item.key))}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}

                  {/* Totals */}
                  <div className={s.totalRow}>
                    <span>القيمة الأصلية:</span>
                    <span>{fmt(bundleOriginal)} دج</span>
                  </div>
                  {bundlePrice && bundleSaving > 0 && (
                    <div className={s.savingRow}>
                      <span>توفير العميل:</span>
                      <span>-{fmt(bundleSaving)} دج ({Math.round((bundleSaving / bundleOriginal) * 100)}%)</span>
                    </div>
                  )}
                  {bundlePrice && bundleSaving <= 0 && (
                    <div style={{ color: 'var(--warning)', fontSize: '0.8rem', padding: '8px 0' }}>
                      ⚠️ سعر الباقة أعلى من القيمة الأصلية للمنتجات!
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <button
            className={`${s.btn} ${s.btnPrimary}`}
            style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
            onClick={saveBundle}
            disabled={saving || !bundleName || !bundlePrice || bundleItems.length === 0}
          >
            {saving ? <Spinner size="sm" /> : '📦 إنشاء الباقة وحفظها'}
          </button>
        </div>
      </Modal>

    </div>
  );
};

export default AdminOffers;
