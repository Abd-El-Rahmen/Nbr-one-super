import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Package } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { getImageUrl } from '../../api';
import styles from './ProductCard.module.css';

const fmt = n => new Intl.NumberFormat('ar-DZ').format(n);

const ProductCard = ({ product }) => {
  const { addItem } = useCart();

  const hasVariants = product.variants && product.variants.length > 0;
  const parseVO = (vo) => {
    if (!vo) return [];
    if (Array.isArray(vo)) return vo;
    try { return JSON.parse(vo); } catch { return []; }
  };

  // Determine effective promo (check product level first, then variants)
  let effectiveCompareAt = parseFloat(product.compare_at_price);
  let effectiveBasePrice = parseFloat(product.base_price);
  let hasPromo = !isNaN(effectiveCompareAt) && !isNaN(effectiveBasePrice) && effectiveCompareAt > effectiveBasePrice;
  let targetVid = null;
  
  if (!hasPromo && hasVariants) {
    // See if any variant has a promo
    const variantWithPromo = product.variants.find(v => {
      const cmp = parseFloat(v.compare_at_price_override);
      const prc = parseFloat(v.price_override);
      return !isNaN(cmp) && !isNaN(prc) && cmp > prc;
    });
    if (variantWithPromo) {
      effectiveCompareAt = parseFloat(variantWithPromo.compare_at_price_override);
      effectiveBasePrice = parseFloat(variantWithPromo.price_override);
      hasPromo = true;
      targetVid = variantWithPromo.id;
    }
  }

  const discountPct = hasPromo ? Math.round(((effectiveCompareAt - effectiveBasePrice) / effectiveCompareAt) * 100) : 0;

  // Determine effective volume offer
  const productVOList = parseVO(product.volume_offers);
  let activeVOList = [];
  let hasVolumeOffer = false;

  if (!product.is_bundle && productVOList.length > 0) {
    hasVolumeOffer = true;
    activeVOList = productVOList;
  }
  
  if (!hasVolumeOffer && hasVariants && !product.is_bundle) {
    const variantWithVO = product.variants.find(v => parseVO(v.volume_offers).length > 0);
    if (variantWithVO) {
      hasVolumeOffer = true;
      activeVOList = parseVO(variantWithVO.volume_offers);
      if (!targetVid) targetVid = variantWithVO.id;
    }
  }

  // Stock check
  const stockQty = hasVariants 
    ? (product.variants[0]?.stock_quantity ?? Infinity)
    : (product.stock_quantity ?? Infinity);
  const inStock = stockQty > 0;

  const bundleImages = [];
  if (product.is_bundle && product.bundle_items?.length > 0) {
    product.bundle_items.forEach(bi => {
      const url = getImageUrl(bi.product_image_url);
      if (url && !bundleImages.includes(url)) {
        bundleImages.push(url);
      }
    });
  }

  const handleQuickAdd = (e) => {
    e.preventDefault();
    if (hasVariants) {
      addItem(product, product.variants[0]);
    } else {
      addItem(product, null);
    }
  };

  let targetUrl = `/product/${product.id}`;
  const params = new URLSearchParams();
  if (targetVid) params.append('vid', targetVid);
  if (hasVolumeOffer) params.append('vo', '1');
  const qs = params.toString();
  if (qs) targetUrl += `?${qs}`;

  return (
    <Link to={targetUrl} className={styles.card}>
      <div className={styles.imageBox}>
        {product.image_url ? (
          <img src={getImageUrl(product.image_url)} alt={product.name} className={styles.image} />
        ) : bundleImages.length > 0 ? (
          <div className={`${styles.collageGrid} ${bundleImages.length === 1 ? styles.collage1 : bundleImages.length === 2 ? styles.collage2 : bundleImages.length === 3 ? styles.collage3 : styles.collage4}`}>
            {bundleImages.slice(0, 4).map((img, i) => (
              <img key={i} src={img} alt={`bundle item ${i}`} className={styles.collageImg} />
            ))}
          </div>
        ) : (
          <div className={styles.placeholder}><Package size={40} /></div>
        )}
        {!product.is_active && <span className={styles.badge}>غير متوفر</span>}
        {hasPromo ? (
          <div className={styles.ribbonPromo}>PROMO -{discountPct}%</div>
        ) : (hasVolumeOffer || product.is_bundle) ? (
          <div className={styles.ribbonPack}>PACK</div>
        ) : null}
      </div>
      <div className={styles.content}>
        <div className={styles.category}>{product.category_name || 'بدون قسم'}</div>
        <h3 className={styles.title}>{product.name}</h3>
        
        {product.is_bundle && product.bundle_items?.length > 0 && (
          <div className={styles.bundleItemsList}>
            {product.bundle_items.slice(0, 3).map((bi, idx) => (
              <div key={idx} className={styles.bundleItemRow}>
                <span className={styles.biQty}>{bi.quantity}x</span>
                <span className={styles.biName}>{bi.product_name} {bi.variant_name ? `(${bi.variant_name})` : ''}</span>
              </div>
            ))}
            {product.bundle_items.length > 3 && (
              <div className={styles.biMore}>+ {product.bundle_items.length - 3} عناصر أخرى</div>
            )}
          </div>
        )}

        <div className={styles.priceRow}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span className={styles.price}>{fmt(Math.round(effectiveBasePrice))} دج</span>
            {hasPromo && (
              <span className={styles.oldPrice}>{fmt(Math.round(effectiveCompareAt))} دج</span>
            )}
          </div>
          <button
            className={styles.addBtn}
            onClick={handleQuickAdd}
            disabled={!product.is_active || !inStock}
            title={inStock ? "أضف للسلة" : "نفدت الكمية"}
          >
            <ShoppingCart size={18} />
          </button>
        </div>

        {/* Volume Offer Details */}
        {hasVolumeOffer && activeVOList.length > 0 && (
          <div className={styles.voContainer}>
            <div className={styles.voTitle}>🔥 باقات التوفير</div>
            {activeVOList.slice(0, 2).map((vo, i) => {
              // Calculate saving if applicable
              const regularCost = effectiveBasePrice * parseFloat(vo.quantity);
              const saving = regularCost - parseFloat(vo.price);
              return (
                <div key={i} className={styles.voRow}>
                  <div className={styles.voQuantity}>{vo.quantity} قطع</div>
                  <div className={styles.voDetails}>
                    <div className={styles.voPrice}>{fmt(vo.price)} دج</div>
                    {saving > 0 && <div className={styles.voSaving}>وفر {fmt(saving)} دج</div>}
                  </div>
                </div>
              );
            })}
            {activeVOList.length > 2 && <div className={styles.voMore}>وعروض أخرى بالداخل...</div>}
          </div>
        )}
      </div>
    </Link>
  );
};

export default ProductCard;
