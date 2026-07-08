import React from 'react';
import { Link } from 'react-router-dom';
import { Star, ShoppingBag, ArrowLeft } from 'lucide-react';
import styles from './ProductOrbit3D.module.css';

const fmt = n => new Intl.NumberFormat('ar-DZ').format(n);

/* ── Product card ── */
const Card = ({ product }) => {
  const bundleImages = [];
  if (product.is_bundle && product.bundle_items?.length > 0) {
    product.bundle_items.forEach(bi => {
      if (bi.product_image_url && !bundleImages.includes(bi.product_image_url)) {
        bundleImages.push(bi.product_image_url);
      }
    });
  }

  return (
    <Link to={`/product/${product.id}`} className={styles.card}>
      <div className={styles.cardImg}>
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} loading="lazy" />
        ) : bundleImages.length > 0 ? (
          <div className={`${styles.miniCollage} ${styles['miniCollage' + Math.min(bundleImages.length, 4)]}`}>
            {bundleImages.slice(0, 4).map((img, i) => (
              <img key={i} src={img} alt={`bundle item ${i}`} />
            ))}
          </div>
        ) : (
          <div className={styles.cardImgPlaceholder}><ShoppingBag size={16} /></div>
        )}
      </div>
      <div className={styles.cardBody}>
        <h4 className={styles.cardName}>{product.name}</h4>
        <div className={styles.cardRow}>
          <span className={styles.cardPrice}>{fmt(Math.round(product.base_price))} دج</span>
          <span className={styles.cardRating}>
            <Star size={8} fill="#f59e0b" color="#f59e0b" strokeWidth={0} />{' '}4.9
          </span>
        </div>
      </div>
    </Link>
  );
};

/* ════════════════════════════════════════
   Main component
════════════════════════════════════════ */
const ProductOrbit3D = ({ products }) => {
  if (!products || products.length === 0) return null;

  // Render a limited set of scattered products to fill the view without overcrowding
  const displayProducts = products.slice(0, 14);

  return (
    <section className={styles.section}>

      {/* ══ LEFT (visually RIGHT in RTL) — Text Panel ══ */}
      <div className={styles.leftPanel}>
        <div className={styles.textWrap}>
          <span className={styles.badge}>✨ أحدث الوافدين</span>
          <h2 className={styles.title}>وصل حديثاً</h2>
          <p className={styles.sub}>
            اكتشف أحدث المنتجات المضافة إلى متجرنا —<br />
            جودة عالية وأسعار لا تُقاوم، تُوصَّل إلى بابك.
          </p>
          <Link to="/shop" className={styles.btn}>
            تصفح المنتجات <ArrowLeft size={16} />
          </Link>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statNum}>+500</span>
              <span className={styles.statLabel}>منتج</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statNum}>يومي</span>
              <span className={styles.statLabel}>تحديث</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statNum}>✓</span>
              <span className={styles.statLabel}>جودة مضمونة</span>
            </div>
          </div>
        </div>
      </div>

      {/* ══ MIDDLE — Green Separator ══ */}
      <div className={styles.separator}>
        <div className={styles.sepLine} />
        <div className={styles.sepOrb}>
          <ShoppingBag size={24} className={styles.sepIcon} strokeWidth={2} />
        </div>
        <div className={styles.sepDotTop} />
        <div className={styles.sepDotBot} />
        <svg className={styles.sepWaveLeft} viewBox="0 0 40 400" preserveAspectRatio="none">
          <path d="M40,0 Q0,100 40,200 Q0,300 40,400 L40,400 L40,0 Z" fill="var(--primary)"/>
        </svg>
        <svg className={styles.sepWaveRight} viewBox="0 0 40 400" preserveAspectRatio="none">
          <path d="M0,0 Q40,100 0,200 Q40,300 0,400 L0,400 L0,0 Z" fill="var(--primary)"/>
        </svg>
      </div>

      {/* ══ RIGHT (visually LEFT in RTL) — Floating Cards ══ */}
      <div className={styles.rightPanel}>
        <div className={styles.floatingGrid}>
          {displayProducts.map((p, i) => (
            <div key={p.id} className={styles.floatCard} style={{ animationDelay: `-${i * 0.7}s` }}>
              <Card product={p} />
            </div>
          ))}
        </div>
      </div>

    </section>
  );
};

export default ProductOrbit3D;
