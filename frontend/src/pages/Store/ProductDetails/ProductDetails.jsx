import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ShoppingCart, Package, ArrowRight, CheckCircle2, ShieldCheck, Truck, RotateCcw, ShoppingBag } from 'lucide-react';
import { productsAPI, getImageUrl } from '../../../api';
import { useCart } from '../../../context/CartContext';
import Spinner from '../../../components/Spinner/Spinner';
import ProductCard from '../../../components/ProductCard/ProductCard';
import styles from './ProductDetails.module.css';

const fmt = n => new Intl.NumberFormat('ar-DZ').format(n);

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const vid = searchParams.get('vid');
  const voParam = searchParams.get('vo');
  const { addItem } = useCart();
  
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedVolumeOffer, setSelectedVolumeOffer] = useState(null);
  const [added, setAdded] = useState(false);
  const [mainImageIndex, setMainImageIndex] = useState(0);

  useEffect(() => {
    setLoading(true);
    setQuantity(1);
    setSelectedVariant(null);
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

          // Auto select volume offer if requested
          if (voParam === '1') {
             const vVO = parseStrVO(activeV.volume_offers);
             if (vVO.length > 0) {
               setSelectedVolumeOffer(vVO[0]);
               setQuantity(parseInt(vVO[0].quantity));
             }
             else if (parsedVO.length > 0) {
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
        
        // Fetch related products (same category)
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

  const handleAddToCart = () => {
    if (!product.is_active) return;
    
    if (selectedVolumeOffer) {
      // quantity is in individual units (multiples of pack size)
      // price per unit = pack price / pack size
      const packSize = parseInt(selectedVolumeOffer.quantity);
      const unitPrice = parseFloat(selectedVolumeOffer.price) / packSize;
      addItem(product, selectedVariant, quantity, unitPrice, packSize);
    } else {
      addItem(product, selectedVariant, quantity);
    }
    
    setAdded(true);
    setTimeout(() => setAdded(false), 6000);
  };

  if (loading) return <div className="container" style={{padding: '80px 0'}}><Spinner center size="lg" /></div>;
  if (error) return <div className="container" style={{padding: '80px 0'}}><div className={styles.error}>{error}</div></div>;
  if (!product) return null;

  const parseVO = (vo) => {
    if (!vo) return [];
    if (typeof vo === 'string') { try { return JSON.parse(vo); } catch { return []; } }
    if (Array.isArray(vo)) return vo;
    return [];
  };

  const effectiveCompareAt = selectedVariant?.compare_at_price_override ? parseFloat(selectedVariant.compare_at_price_override) : parseFloat(product.compare_at_price);
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
    // If there's an offer, show what they would have paid without it as the old price
    oldPrice = currentPrice * quantity;
  }

  const stockQty = selectedVariant ? (selectedVariant.stock_quantity ?? Infinity) : (product.stock_quantity ?? Infinity);

  // ── Bundle stock: minimum available sets how many bundles can be ordered ──
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
  // For volume offers: limit is floor(stock / packSize) * packSize total units
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
      if (url && !galleryImages.includes(url)) {
        galleryImages.push(url);
      }
    });
  }
  const activeImage = galleryImages.length > 0 ? galleryImages[mainImageIndex] : null;

  return (
    <div className="container" style={{ padding: '24px 20px' }}>
      <button className={styles.backBtn} onClick={() => navigate(-1)}>
        <ArrowRight size={18} /> عودة
      </button>

      {/* ── Cart Toast Notification ── */}
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
        {/* Image Gallery */}
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

        {/* Details */}
        <div className={styles.details}>
          <div className={styles.category}>{product.category_name || 'بدون قسم'}</div>
          <h1 className={styles.title}>
            {product.name}
            {product.is_bundle && <span style={{ marginLeft: 8, fontSize: '0.8rem', background: 'var(--primary-light)', color: 'var(--primary)', padding: '2px 8px', borderRadius: 12 }}>📦 باقة</span>}
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
                <strong style={{ fontSize: '0.9rem', display: 'block', marginBottom: 8 }}>📦 هذه الباقة تحتوي على:</strong>
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

          {/* Volume Offers (عروض الكمية) */}
          {effectiveVolumeOffers && effectiveVolumeOffers.length > 0 && (
            <div className={styles.variants}>
              <h3 className={styles.sectionTitle}>🎉 عروض التوفير:</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Regular Option */}
                <button
                  className={`${styles.variantBtn} ${!selectedVolumeOffer ? styles.variantActive : ''}`}
                  style={{ justifyContent: 'space-between', padding: '12px 16px' }}
                  onClick={() => { setSelectedVolumeOffer(null); setQuantity(1); }}
                >
                  <span style={{ fontWeight: 700 }}>1 قطعة</span>
                  <span className={styles.vPrice}>{fmt(currentPrice)} دج</span>
                </button>
                {/* Volume Options */}
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
              <span className={styles.inStock}>
                ● متوفر في المخزون
              </span>
            ) : (
              <span className={styles.outOfStock}>نفدت الكمية</span>
            )}
          </div>

          <div className={styles.actions}>
          {/* Quantity selector */}
            <div>
              <div className={styles.qtyBox}>
                <button
                  className={styles.qtyBtn}
                  onClick={() => {
                    if (selectedVolumeOffer) {
                      setQuantity(q => Math.max(voPackSize, q - voPackSize));
                    } else {
                      setQuantity(q => Math.max(1, q - 1));
                    }
                  }}
                  disabled={selectedVolumeOffer ? quantity <= voPackSize : quantity <= 1}
                >-</button>
                <input type="number" className={styles.qtyInput} value={selectedVolumeOffer ? quantity / voPackSize : quantity} readOnly />
                <button
                  className={styles.qtyBtn}
                  onClick={() => {
                    if (selectedVolumeOffer) {
                      setQuantity(q => Math.min(maxAllowedQty, q + voPackSize));
                    } else {
                      setQuantity(q => Math.min(effectiveStock, q + 1));
                    }
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
                  marginTop: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#fff3cd',
                  border: '1px solid #ffc107',
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontSize: '0.82rem',
                  color: '#856404',
                  fontWeight: 600
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
        </div>
      </div>

      {/* Related Products */}
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
