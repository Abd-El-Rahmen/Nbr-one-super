import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  ShoppingCart, Package, ArrowRight, CheckCircle2, ShieldCheck,
  Truck, RotateCcw, ShoppingBag, ChevronDown, Home, Building2,
  MapPin, Download, ClipboardList, Zap, X,
} from 'lucide-react';
import { productsAPI, ordersAPI, deliveryPricingAPI, getImageUrl } from '../../../api';
import { useCart } from '../../../context/CartContext';
import Spinner from '../../../components/Spinner/Spinner';
import ProductCard from '../../../components/ProductCard/ProductCard';
import { WILAYAS, getCommunesByWilaya, getDeliveryPrice } from '../../../data/algeria';
import styles from './ProductDetails.module.css';

const fmt = n => new Intl.NumberFormat('ar-DZ').format(n);

const EMPTY_ORDER_FORM = {
  full_name: '',
  phone: '',
  wilaya_code: '',
  commune: '',
  address_line: '',
  postal_code: '',
};

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const vid = searchParams.get('vid');
  const voParam = searchParams.get('vo');
  const { addItem } = useCart();

  /* ── Product state ── */
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedVolumeOffer, setSelectedVolumeOffer] = useState(null);
  const [added, setAdded] = useState(false);
  const [mainImageIndex, setMainImageIndex] = useState(0);

  /* ── Inline order form state ── */
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [orderForm, setOrderForm] = useState(EMPTY_ORDER_FORM);
  const [orderDeliveryType, setOrderDeliveryType] = useState('home');
  const [pricingTiers, setPricingTiers] = useState({});
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [orderReceiptItems, setOrderReceiptItems] = useState([]);
  const orderFormRef = useRef(null);
  const receiptRef = useRef(null);

  /* ── Load product ── */
  useEffect(() => {
    setLoading(true);
    setQuantity(1);
    setSelectedVariant(null);
    setShowOrderForm(false);
    setOrderSuccess(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    productsAPI.getOne(id)
      .then(res => {
        const p = res.data;
        setProduct(p);
        let parsedVO = [];
        if (p.volume_offers) {
          let vo = p.volume_offers;
          if (typeof vo === 'string') { try { vo = JSON.parse(vo); } catch { vo = []; } }
          parsedVO = Array.isArray(vo) ? vo : [];
          p.volume_offers_parsed = parsedVO;
        } else {
          p.volume_offers_parsed = [];
        }

        const parseStrVO = (voStr) => {
          if (!voStr) return [];
          if (typeof voStr === 'string') { try { return JSON.parse(voStr); } catch { return []; } }
          if (Array.isArray(voStr)) return voStr;
          return [];
        };

        if (p.variants && p.variants.length > 0) {
          let activeV = p.variants[0];
          if (vid) {
            const foundVariant = p.variants.find(v => v.id.toString() === vid);
            if (foundVariant) activeV = foundVariant;
          }
          setSelectedVariant(activeV);

          if (voParam === '1') {
            const vVO = parseStrVO(activeV.volume_offers);
            if (vVO.length > 0) {
              setSelectedVolumeOffer(vVO[0]);
              setQuantity(parseInt(vVO[0].quantity));
            } else if (parsedVO.length > 0) {
              setSelectedVolumeOffer(parsedVO[0]);
              setQuantity(parseInt(parsedVO[0].quantity));
            }
          }
        } else {
          if (voParam === '1' && parsedVO.length > 0) {
            setSelectedVolumeOffer(parsedVO[0]);
            setQuantity(parseInt(parsedVO[0].quantity));
          }
        }

        if (p.category_id) {
          productsAPI.getAll({ is_active: true, category_id: p.category_id, limit: 5 })
            .then(relRes => {
              const rel = (Array.isArray(relRes.data) ? relRes.data : [])
                .filter(item => item.id !== p.id && item.is_active)
                .slice(0, 4);
              setRelatedProducts(rel);
            })
            .catch(err => console.error('Failed to fetch related products:', err));
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  /* ── Load delivery pricing once ── */
  useEffect(() => {
    deliveryPricingAPI.getAll()
      .then(res => {
        const map = {};
        res.data.forEach(tier => {
          map[tier.tier_id] = { home: Number(tier.home_fee), desk: Number(tier.stop_desk_fee) };
        });
        setPricingTiers(map);
      })
      .catch(() => { /* fallback to static */ });
  }, []);

  /* ── Scroll to form when opened ── */
  useEffect(() => {
    if (showOrderForm && orderFormRef.current) {
      setTimeout(() => {
        orderFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [showOrderForm]);

  /* ── Delivery price computation for inline form ── */
  const selectedOrderWilaya = WILAYAS.find(w => w.code === orderForm.wilaya_code);
  const orderCommunes = orderForm.wilaya_code ? getCommunesByWilaya(orderForm.wilaya_code) : [];

  let orderDeliveryPrice = null;
  if (selectedOrderWilaya && pricingTiers[selectedOrderWilaya.code]) {
    orderDeliveryPrice = orderDeliveryType === 'home'
      ? pricingTiers[selectedOrderWilaya.code].home
      : pricingTiers[selectedOrderWilaya.code].desk;
  } else if (orderForm.wilaya_code) {
    orderDeliveryPrice = getDeliveryPrice(orderForm.wilaya_code, orderDeliveryType);
  }

  /* ── Add to cart ── */
  const handleAddToCart = () => {
    if (!product.is_active) return;
    if (selectedVolumeOffer) {
      const packSize = parseInt(selectedVolumeOffer.quantity);
      const unitPrice = parseFloat(selectedVolumeOffer.price) / packSize;
      addItem(product, selectedVariant, quantity, unitPrice, packSize);
    } else {
      addItem(product, selectedVariant, quantity);
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 6000);
  };

  /* ── Save receipt as printable page ── */
  const handleSaveReceipt = () => {
    if (!receiptRef.current) return;
    const content = receiptRef.current.innerHTML;
    const printWin = window.open('', '_blank', 'width=640,height=900');
    printWin.document.write(`
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <title>فاتورة طلب #${orderId} - NumberOne</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;900&display=swap');
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Tajawal', Arial, sans-serif; background: #fff; padding: 24px; color: #1f2937; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 8px 10px; }
            @media print { body { padding: 0; } .no-print { display: none !important; } }
          </style>
        </head>
        <body>
          ${content}
          <div class="no-print" style="text-align:center;margin-top:24px">
            <button onclick="window.print()" style="background:#059669;color:#fff;border:none;padding:12px 32px;border-radius:10px;font-size:1rem;font-family:Tajawal,Arial,sans-serif;font-weight:700;cursor:pointer">
              🖨️ طباعة / حفظ كصورة PDF
            </button>
          </div>
        </body>
      </html>
    `);
    printWin.document.close();
    printWin.focus();
  };

  /* ── Direct order submit ── */
  const handleDirectOrder = async (e) => {
    e.preventDefault();
    if (!orderForm.wilaya_code) { setOrderError('يرجى اختيار الولاية.'); return; }
    if (!orderForm.commune) { setOrderError('يرجى اختيار البلدية.'); return; }
    if (orderForm.phone.length !== 10) { setOrderError('رقم الهاتف يجب أن يتكون من 10 أرقام.'); return; }
    if (orderDeliveryType === 'home' && !orderForm.address_line) {
      setOrderError('يرجى إدخال العنوان الكامل لتوصيل المنزل.');
      return;
    }

    setOrderLoading(true);
    setOrderError('');

    const unitPrice = selectedVolumeOffer
      ? parseFloat(selectedVolumeOffer.price) / parseInt(selectedVolumeOffer.quantity)
      : currentPrice;

    const payload = {
      customer: {
        full_name:    orderForm.full_name,
        phone:        orderForm.phone,
        address_line: orderForm.address_line
          ? orderForm.address_line
          : `${selectedOrderWilaya?.name} - ${orderForm.commune} (مكتب توقف)`,
        postal_code:  orderForm.postal_code,
        wilaya_code:  orderForm.wilaya_code,
        wilaya:       selectedOrderWilaya?.name,
        commune:      orderForm.commune,
      },
      delivery_type: orderDeliveryType,
      delivery_fee: orderDeliveryPrice,
      items: [{
        product_id: product.id,
        variant_id: selectedVariant?.id || null,
        quantity,
      }],
    };

    try {
      const res = await ordersAPI.create(payload);
      const newOrderId = res.data.id;
      setOrderId(newOrderId);

      // snapshot receipt items
      const itemName = product.name + (selectedVariant?.name ? ` (${selectedVariant.name})` : '');
      setOrderReceiptItems([{ name: itemName, quantity, price: unitPrice }]);

      // persist to localStorage so "طلباتي" page can find it
      try {
        const savedOrders = JSON.parse(localStorage.getItem('my_orders') || '[]');
        const entry = {
          id: newOrderId,
          phone: orderForm.phone,
          date: new Date().toISOString(),
          total: totalDisplayPrice + (orderDeliveryPrice ?? 0),
          wilaya: selectedOrderWilaya?.name || '',
          commune: orderForm.commune,
          postal_code: orderForm.postal_code,
          delivery_type: orderDeliveryType,
          delivery_fee: orderDeliveryPrice ?? 0,
        };
        const updated = [entry, ...savedOrders.filter(o => o.id !== newOrderId)].slice(0, 20);
        localStorage.setItem('my_orders', JSON.stringify(updated));
      } catch (_) { /* ignore */ }

      setOrderSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setOrderError(err.message || 'حدث خطأ غير متوقع. يرجى المحاولة لاحقاً.');
    } finally {
      setOrderLoading(false);
    }
  };

  /* ── Guards ── */
  if (loading) return <div className="container" style={{padding: '80px 0'}}><Spinner center size="lg" /></div>;
  if (error) return <div className="container" style={{padding: '80px 0'}}><div className={styles.error}>{error}</div></div>;
  if (!product) return null;

  /* ── Derived pricing ── */
  const parseVO = (vo) => {
    if (!vo) return [];
    if (typeof vo === 'string') { try { return JSON.parse(vo); } catch { return []; } }
    if (Array.isArray(vo)) return vo;
    return [];
  };

  const effectiveCompareAt = selectedVariant?.compare_at_price_override
    ? parseFloat(selectedVariant.compare_at_price_override)
    : parseFloat(product.compare_at_price);
  const effectiveBasePrice = selectedVariant?.price_override ?? parseFloat(product.base_price);
  const hasPromo = effectiveCompareAt && effectiveCompareAt > effectiveBasePrice;

  let currentPrice = effectiveBasePrice;
  let oldPrice = hasPromo ? effectiveCompareAt : null;
  let totalDisplayPrice = currentPrice * quantity;

  const variantVO = selectedVariant ? parseVO(selectedVariant.volume_offers) : [];
  const effectiveVolumeOffers = variantVO.length > 0 ? variantVO : product.volume_offers_parsed;

  if (selectedVolumeOffer) {
    const numPacks = quantity / parseInt(selectedVolumeOffer.quantity);
    totalDisplayPrice = parseFloat(selectedVolumeOffer.price) * numPacks;
    oldPrice = currentPrice * quantity;
  }

  const stockQty = selectedVariant
    ? (selectedVariant.stock_quantity ?? Infinity)
    : (product.stock_quantity ?? Infinity);

  const bundleMinStock = product.is_bundle && product.bundle_items?.length > 0
    ? Math.floor(
        Math.min(
          ...product.bundle_items.map(bi => {
            const varStock = bi.stock_quantity ?? Infinity;
            const biQty = bi.quantity || 1;
            return Math.floor(varStock / biQty);
          })
        )
      )
    : null;

  const effectiveStock = bundleMinStock !== null ? bundleMinStock : stockQty;
  const inStock = effectiveStock > 0;
  const voPackSize = selectedVolumeOffer ? parseInt(selectedVolumeOffer.quantity) : 1;
  const maxAllowedQty = selectedVolumeOffer
    ? Math.floor(effectiveStock / voPackSize) * voPackSize
    : effectiveStock;
  const atStockLimit = quantity >= maxAllowedQty;

  const galleryImages = [];
  if (product.image_url) galleryImages.push(getImageUrl(product.image_url));
  if (product.is_bundle && product.bundle_items?.length > 0) {
    product.bundle_items.forEach(bi => {
      const url = getImageUrl(bi.product_image_url);
      if (url && !galleryImages.includes(url)) galleryImages.push(url);
    });
  }
  const activeImage = galleryImages.length > 0 ? galleryImages[mainImageIndex] : null;

  /* ── Receipt totals ── */
  const receiptSubTotal = orderReceiptItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const receiptDelivFee = orderDeliveryPrice ?? 0;
  const receiptGrandTotal = receiptSubTotal + receiptDelivFee;

  return (
    <div className="container" style={{ padding: '24px 20px' }}>
      <button className={styles.backBtn} onClick={() => navigate(-1)}>
        <ArrowRight size={18} /> عودة
      </button>

      {/* ── Cart Toast ── */}
      {added && (
        <div className={styles.cartToast}>
          <div className={styles.cartToastInner}>
            <CheckCircle2 size={22} className={styles.cartToastCheck} />
            <div className={styles.cartToastText}>
              <span className={styles.cartToastTitle}>تمت الإضافة إلى السلة</span>
              <span className={styles.cartToastSub}>{product?.name}</span>
            </div>
            <Link to="/cart" className={styles.cartToastBtn}>
              <ShoppingBag size={16} />
              عرض السلة
            </Link>
          </div>
        </div>
      )}

      <div className={styles.layout}>
        {/* ── Image Gallery ── */}
        <div className={styles.imageCol}>
          <div className={styles.imageBox}>
            {activeImage ? (
              <img src={activeImage} alt={product.name} className={styles.image} />
            ) : (
              <div className={styles.placeholder}><Package size={80} /></div>
            )}
            {!product.is_active && <span className={styles.badge}>غير متوفر</span>}
          </div>

          {galleryImages.length > 1 && (
            <div className={styles.thumbnailGallery}>
              {galleryImages.map((imgUrl, idx) => (
                <div
                  key={idx}
                  className={`${styles.thumbnail} ${mainImageIndex === idx ? styles.thumbnailActive : ''}`}
                  onClick={() => setMainImageIndex(idx)}
                >
                  <img src={imgUrl} alt={`Thumbnail ${idx}`} />
                </div>
              ))}
            </div>
          )}

          {/* Trust Badges */}
          <div className={styles.trustBadges}>
            <div className={styles.trustBadge}>
              <ShieldCheck size={24} className={styles.trustIcon} />
              <div>
                <strong>جودة مضمونة</strong>
                <span>منتجات أصلية 100%</span>
              </div>
            </div>
            <div className={styles.trustBadge}>
              <Truck size={24} className={styles.trustIcon} />
              <div>
                <strong>توصيل سريع</strong>
                <span>لجميع الولايات</span>
              </div>
            </div>
            <div className={styles.trustBadge}>
              <RotateCcw size={24} className={styles.trustIcon} />
              <div>
                <strong>استبدال سهل</strong>
                <span>خلال 3 أيام</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Details ── */}
        <div className={styles.details}>
          <div className={styles.category}>{product.category_name || 'بدون قسم'}</div>
          <h1 className={styles.title}>
            {product.name}
            {Number(product.is_bundle) === 1 && (
              <span style={{
                marginLeft: 8, fontSize: '0.8rem',
                background: 'var(--primary-light)', color: 'var(--primary)',
                padding: '2px 8px', borderRadius: 12,
              }}>
                📦 باقة
              </span>
            )}
          </h1>

          <div className={styles.priceContainer}>
            <div className={styles.price}>{fmt(totalDisplayPrice)} دج</div>
            {oldPrice && oldPrice > totalDisplayPrice && (
              <div className={styles.oldPrice}>{fmt(oldPrice)} دج</div>
            )}
            {oldPrice && oldPrice > totalDisplayPrice && (
              <div className={styles.discountBadge}>
                خصم {Math.round(((oldPrice - totalDisplayPrice) / oldPrice) * 100)}%
              </div>
            )}
          </div>

          <div className={styles.descBox}>
            <h3 className={styles.sectionTitle}>وصف المنتج</h3>
            <p className={styles.desc}>{product.description || 'لا يوجد وصف متاح لهذا المنتج.'}</p>

            {product.is_bundle && product.bundle_items?.length > 0 && (
              <div style={{ marginTop: 16, padding: 12, background: 'var(--bg)', borderRadius: 8 }}>
                <strong style={{ fontSize: '0.9rem', display: 'block', marginBottom: 8 }}>
                  📦 هذه الباقة تحتوي على:
                </strong>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.85rem' }}>
                  {product.bundle_items.map(bi => (
                    <li key={bi.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                      <span>{bi.product_name} {bi.variant_name ? `(${bi.variant_name})` : ''}</span>
                      <span style={{ fontWeight: 700 }}>x{bi.quantity}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Variants */}
          {product.variants && product.variants.length > 0 && (
            <div className={styles.variants}>
              <h3 className={styles.sectionTitle}>اختر الحجم / المتغير:</h3>
              <div className={styles.variantGrid}>
                {product.variants.map(v => (
                  <button
                    key={v.id}
                    className={`${styles.variantBtn} ${selectedVariant?.id === v.id ? styles.variantActive : ''}`}
                    onClick={() => {
                      setSelectedVariant(v);
                      setSelectedVolumeOffer(null);
                      setQuantity(1);
                    }}
                  >
                    <span>{v.name}</span>
                    <span className={styles.vPrice}>
                      {v.price_override ? `${fmt(v.price_override)} دج` : `${fmt(product.base_price)} دج`}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Volume Offers */}
          {effectiveVolumeOffers && effectiveVolumeOffers.length > 0 && (
            <div className={styles.variants}>
              <h3 className={styles.sectionTitle}>🎉 عروض التوفير:</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  className={`${styles.variantBtn} ${!selectedVolumeOffer ? styles.variantActive : ''}`}
                  style={{ justifyContent: 'space-between', padding: '12px 16px' }}
                  onClick={() => { setSelectedVolumeOffer(null); setQuantity(1); }}
                >
                  <span style={{ fontWeight: 700 }}>1 قطعة</span>
                  <span className={styles.vPrice}>{fmt(currentPrice)} دج</span>
                </button>
                {effectiveVolumeOffers.map((vo, idx) => {
                  const voQty = parseInt(vo.quantity);
                  const voAvailable = stockQty >= voQty;
                  return (
                    <button
                      key={idx}
                      className={`${styles.variantBtn} ${selectedVolumeOffer?.quantity === vo.quantity ? styles.variantActive : ''}`}
                      style={{ justifyContent: 'space-between', padding: '12px 16px', opacity: voAvailable ? 1 : 0.5, cursor: voAvailable ? 'pointer' : 'not-allowed' }}
                      onClick={() => { if (voAvailable) { setSelectedVolumeOffer(vo); setQuantity(voQty); } }}
                      disabled={!voAvailable}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <span className={styles.voTitle}>{vo.label} ({vo.quantity} قطع)</span>
                        {voAvailable
                          ? <span className={styles.voSaving}>وفر {fmt((currentPrice * vo.quantity) - parseFloat(vo.price))} دج!</span>
                          : <span style={{ fontSize: '0.78rem', color: '#e63946', fontWeight: 700 }}>⚫ نفدت الكمية ({stockQty} متبقٍ)</span>
                        }
                      </div>
                      <span className={styles.vPrice} style={{ fontSize: '1.1rem' }}>{fmt(parseFloat(vo.price))} دج</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className={styles.stockStatus}>
            {inStock ? (
              <span className={styles.inStock}>● متوفر في المخزون</span>
            ) : (
              <span className={styles.outOfStock}>نفدت الكمية</span>
            )}
          </div>

          {/* ── Actions: Quantity + Add to Cart + Order Now ── */}
          <div className={styles.actions}>
            {/* Quantity selector */}
            <div>
              <div className={styles.qtyBox}>
                <button
                  className={styles.qtyBtn}
                  onClick={() => {
                    if (selectedVolumeOffer) setQuantity(q => Math.max(voPackSize, q - voPackSize));
                    else setQuantity(q => Math.max(1, q - 1));
                  }}
                  disabled={selectedVolumeOffer ? quantity <= voPackSize : quantity <= 1}
                >-</button>
                <input type="number" className={styles.qtyInput} value={selectedVolumeOffer ? quantity / voPackSize : quantity} readOnly />
                <button
                  className={styles.qtyBtn}
                  onClick={() => {
                    if (selectedVolumeOffer) setQuantity(q => Math.min(maxAllowedQty, q + voPackSize));
                    else setQuantity(q => Math.min(effectiveStock, q + 1));
                  }}
                  disabled={atStockLimit}
                  style={atStockLimit ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
                >+</button>
              </div>
              {selectedVolumeOffer && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4, textAlign: 'center' }}>
                  {quantity / voPackSize} باقة × {fmt(parseFloat(selectedVolumeOffer.price))} دج
                </div>
              )}
              {atStockLimit && maxAllowedQty !== Infinity && (
                <div style={{
                  marginTop: 8, display: 'flex', alignItems: 'center', gap: 6,
                  background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 8,
                  padding: '8px 12px', fontSize: '0.82rem', color: '#856404', fontWeight: 600,
                }}>
                  ⚠️ {product.is_bundle
                    ? `لا يمكن طلب أكثر من ${effectiveStock} باقة — الكمية المتاحة حالياً.`
                    : selectedVolumeOffer
                    ? `لا يمكن طلب أكثر من ${Math.floor(effectiveStock / voPackSize)} باقة — الكمية المتاحة في المخزون.`
                    : `لا يمكن إضافة أكثر من ${effectiveStock} قطع — هذه الكمية المتاحة حالياً في المخزون.`
                  }
                </div>
              )}
            </div>

            {/* Add to Cart */}
            <button
              className={`${styles.addBtn} ${added ? styles.addSuccess : ''}`}
              onClick={handleAddToCart}
              disabled={!product.is_active || !inStock}
            >
              {added ? (
                <><CheckCircle2 size={20} /> تمت الإضافة</>
              ) : (
                <><ShoppingCart size={20} /> أضف إلى السلة</>
              )}
            </button>
          </div>

          {/* ── Order Now button ── */}
          {product.is_active && inStock && !orderSuccess && (
            <button
              className={styles.orderNowBtn}
              onClick={() => setShowOrderForm(v => !v)}
            >
              {showOrderForm ? (
                <><X size={20} /> إغلاق نموذج الطلب</>
              ) : (
                <><Zap size={20} /> اطلب الآن — بدون سلة</>
              )}
            </button>
          )}

          {/* ── Inline Order Form ── */}
          {showOrderForm && !orderSuccess && (
            <div className={styles.orderFormSection} ref={orderFormRef}>
              <div className={styles.orderFormCard}>
                <h2 className={styles.orderSectionTitle}>
                  <Zap size={20} /> تأكيد الطلب المباشر
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: 20, marginTop: -8 }}>
                  أدخل بياناتك أدناه وسيتم تأكيد طلبك فوراً.
                </p>

                {/* Order summary strip */}
                <div className={styles.orderSummaryStrip}>
                  <span>🛒 {product.name}{selectedVariant?.name ? ` (${selectedVariant.name})` : ''}</span>
                  <span className={styles.orderSummaryPrice}>{fmt(totalDisplayPrice)} دج × {selectedVolumeOffer ? quantity / voPackSize : quantity}</span>
                </div>

                {/* Error banner */}
                {orderError && (
                  <div className={styles.orderErrorBanner}>
                    <span>⚠️</span>
                    <span>{orderError}</span>
                    <button onClick={() => setOrderError('')} className={styles.orderErrorClose}>✕</button>
                  </div>
                )}

                <form onSubmit={handleDirectOrder}>
                  {/* Personal info */}
                  <div className={styles.orderGrid}>
                    <div className={styles.orderField}>
                      <label className={styles.orderLabel}>الاسم الكامل *</label>
                      <input
                        required
                        className={styles.orderInput}
                        value={orderForm.full_name}
                        onChange={e => setOrderForm({ ...orderForm, full_name: e.target.value })}
                        placeholder="محمد أحمد"
                      />
                    </div>
                    <div className={styles.orderField}>
                      <label className={styles.orderLabel}>رقم الهاتف *</label>
                      <input
                        required
                        type="tel"
                        className={styles.orderInput}
                        placeholder="0550123456"
                        value={orderForm.phone}
                        onChange={e => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setOrderForm({ ...orderForm, phone: val });
                        }}
                      />
                    </div>
                  </div>

                  {/* Wilaya */}
                  <div className={styles.orderField}>
                    <label className={styles.orderLabel}>الولاية *</label>
                    <div className={styles.orderSelectWrapper}>
                      <select
                        required
                        className={styles.orderSelect}
                        value={orderForm.wilaya_code}
                        onChange={e => setOrderForm({ ...orderForm, wilaya_code: e.target.value, commune: '' })}
                      >
                        <option value="">— اختر الولاية —</option>
                        {WILAYAS.map(w => (
                          <option key={w.code} value={w.code}>{w.code} - {w.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={16} className={styles.orderSelectIcon} />
                    </div>
                  </div>

                  {/* Commune */}
                  {orderForm.wilaya_code && (
                    <div className={styles.orderField}>
                      <label className={styles.orderLabel}>البلدية *</label>
                      <div className={styles.orderSelectWrapper}>
                        <select
                          required
                          className={styles.orderSelect}
                          value={orderForm.commune}
                          onChange={e => setOrderForm({ ...orderForm, commune: e.target.value })}
                        >
                          <option value="">— اختر البلدية —</option>
                          {orderCommunes.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <ChevronDown size={16} className={styles.orderSelectIcon} />
                      </div>
                    </div>
                  )}

                  <div className={styles.orderGrid}>
                    {/* Address */}
                    <div className={styles.orderField}>
                      <label className={styles.orderLabel}>العنوان التفصيلي</label>
                      <input
                        className={styles.orderInput}
                        placeholder="شارع الاستقلال، حي النصر"
                        value={orderForm.address_line}
                        onChange={e => setOrderForm({ ...orderForm, address_line: e.target.value })}
                      />
                    </div>
                    {/* Postal code */}
                    <div className={styles.orderField}>
                      <label className={styles.orderLabel}>الرمز البريدي</label>
                      <input
                        className={styles.orderInput}
                        inputMode="numeric"
                        maxLength={5}
                        placeholder="16000"
                        value={orderForm.postal_code}
                        onChange={e => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 5);
                          setOrderForm({ ...orderForm, postal_code: val });
                        }}
                      />
                    </div>
                  </div>

                  {/* Delivery type */}
                  {orderForm.wilaya_code && (
                    <div className={styles.orderDeliveryTypeSection}>
                      <label className={styles.orderLabel}>نوع التوصيل *</label>
                      <div className={styles.orderDeliveryTypeRow}>
                        <button
                          type="button"
                          className={`${styles.orderDeliveryTypeBtn} ${orderDeliveryType === 'home' ? styles.orderDeliveryTypeBtnActive : ''}`}
                          onClick={() => setOrderDeliveryType('home')}
                        >
                          <Home size={20} />
                          <span>توصيل للمنزل</span>
                          {orderDeliveryType === 'home' && orderDeliveryPrice !== null && (
                            <span className={styles.orderDtPrice}>{fmt(orderDeliveryPrice)} دج</span>
                          )}
                        </button>
                        <button
                          type="button"
                          className={`${styles.orderDeliveryTypeBtn} ${orderDeliveryType === 'desk' ? styles.orderDeliveryTypeBtnActive : ''}`}
                          onClick={() => setOrderDeliveryType('desk')}
                        >
                          <Building2 size={20} />
                          <span>نقطة استلام</span>
                          {orderDeliveryType === 'desk' && orderDeliveryPrice !== null && (
                            <span className={styles.orderDtPrice}>{fmt(orderDeliveryPrice)} دج</span>
                          )}
                        </button>
                      </div>
                      {orderDeliveryPrice !== null && (
                        <div className={styles.orderDeliveryBanner}>
                          <Truck size={18} />
                          <span>
                            سعر التوصيل إلى <strong>{selectedOrderWilaya?.name}</strong>:
                            <strong className={styles.orderDeliveryBannerPrice}> {fmt(orderDeliveryPrice)} دج</strong>
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Payment method */}
                  <div className={styles.orderPaymentBox}>
                    <input type="radio" checked readOnly /> <strong>الدفع عند الاستلام (Cash on Delivery)</strong>
                  </div>

                  {/* Total line */}
                  <div className={styles.orderTotalLine}>
                    <span>المجموع الكلي:</span>
                    <span className={styles.orderTotalAmt}>
                      {fmt(totalDisplayPrice + (orderDeliveryPrice ?? 0))} دج
                      {orderDeliveryPrice === null && (
                        <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)', marginRight: 6 }}>
                          (اختر الولاية لحساب التوصيل)
                        </span>
                      )}
                    </span>
                  </div>

                  <button type="submit" className={styles.orderSubmitBtn} disabled={orderLoading}>
                    {orderLoading
                      ? 'جاري التنفيذ...'
                      : `✅ تأكيد الطلب — ${fmt(totalDisplayPrice + (orderDeliveryPrice ?? 0))} دج`
                    }
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ── Order Success Receipt ── */}
          {orderSuccess && (
            <div className={styles.orderSuccessSection}>
              <div className={styles.orderSuccessHeader}>
                <CheckCircle2 size={56} className={styles.orderSuccessIcon} />
                <h2>تم استلام طلبك بنجاح! 🎉</h2>
                <p>سنتواصل معك قريباً عبر الهاتف لتأكيد التوصيل.</p>
                <div className={styles.orderIdBadge}>
                  <ClipboardList size={16} /> رقم طلبك: <span>#{orderId}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
                <button onClick={handleSaveReceipt} className={styles.orderReceiptBtn}>
                  <Download size={16} /> حفظ / طباعة الفاتورة
                </button>
                <Link to="/my-orders" className={styles.orderMyOrdersBtn}>
                  <Package size={16} /> طلباتي
                </Link>
              </div>

              {/* Printable receipt */}
              <div ref={receiptRef} className={styles.receiptBox}>
                <div className={styles.receiptHeader}>
                  <div className={styles.receiptBrand}>NUMBER ONE</div>
                  <div className={styles.receiptBrandSub}>سوبرماركت رقم واحد</div>
                  <div className={styles.receiptOrderId}>رقم الطلب: #{orderId}</div>
                </div>

                <div className={styles.receiptInfoRow}>
                  <div className={styles.receiptInfoBox}>
                    <div className={styles.receiptInfoTitle}>👤 بيانات العميل</div>
                    <div><strong>الاسم:</strong> {orderForm.full_name}</div>
                    <div><strong>الهاتف:</strong> {orderForm.phone}</div>
                  </div>
                  <div className={styles.receiptInfoBox}>
                    <div className={styles.receiptInfoTitle}>📍 عنوان التوصيل</div>
                    <div><strong>الولاية:</strong> {selectedOrderWilaya?.name}</div>
                    <div><strong>البلدية:</strong> {orderForm.commune}</div>
                    {orderForm.postal_code && <div><strong>الرمز البريدي:</strong> {orderForm.postal_code}</div>}
                    {orderDeliveryType === 'home' && orderForm.address_line && (
                      <div><strong>العنوان:</strong> {orderForm.address_line}</div>
                    )}
                    <div><strong>النوع:</strong> {orderDeliveryType === 'home' ? '🏠 توصيل للمنزل' : '🏢 مكتب توقف'}</div>
                  </div>
                </div>

                <div className={styles.receiptItemsTitle}>🛒 تفاصيل الطلب</div>
                <table className={styles.receiptTable}>
                  <thead>
                    <tr>
                      <th>المنتج</th>
                      <th>الكمية</th>
                      <th>السعر</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderReceiptItems.map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.name}</td>
                        <td style={{ textAlign: 'center' }}>×{item.quantity}</td>
                        <td style={{ textAlign: 'left', fontWeight: 700, color: '#059669' }}>
                          {fmt(Math.round(item.price * item.quantity))} دج
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className={styles.receiptTotals}>
                  <div className={styles.receiptTotalRow}>
                    <span>المجموع الفرعي</span>
                    <span>{fmt(Math.round(receiptSubTotal))} دج</span>
                  </div>
                  <div className={styles.receiptTotalRow}>
                    <span>رسوم التوصيل</span>
                    <span>{fmt(receiptDelivFee)} دج</span>
                  </div>
                  <div className={`${styles.receiptTotalRow} ${styles.receiptGrandTotal}`}>
                    <span>الإجمالي الكلي</span>
                    <span>{fmt(Math.round(receiptGrandTotal))} دج</span>
                  </div>
                </div>

                <div className={styles.receiptFooter}>
                  <div>{new Date().toLocaleString('ar-DZ')}</div>
                  <div>شكراً لتسوقكم من NumberOne 💚</div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Related Products ── */}
      {relatedProducts.length > 0 && (
        <section className={styles.relatedSection}>
          <div className={styles.relatedHeader}>
            <h2 className={styles.relatedTitle}>منتجات ذات صلة</h2>
            <Link to={`/shop?category=${product.category_id}`} className={styles.viewMoreLink}>
              عرض المزيد <ArrowRight size={16} />
            </Link>
          </div>
          <div className={styles.relatedGrid}>
            {relatedProducts.map((p, index) => (
              <div key={p.id} className={styles.relatedItem} style={{ animationDelay: `${index * 0.1}s` }}>
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default ProductDetails;
