import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Package, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import styles from './ProductCarousel3D.module.css';

const fmt = n => new Intl.NumberFormat('ar-DZ').format(n);

const ProductCarousel3D = ({ products }) => {
  const { addItem } = useCart();
  const [activeIdx, setActiveIdx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [addedId, setAddedId] = useState(null);
  const autoRef = useRef(null);

  const total = products.length;

  const go = useCallback((dir) => {
    setActiveIdx(prev => (prev + dir + total) % total);
  }, [total]);

  // Auto-advance every 3s
  useEffect(() => {
    autoRef.current = setInterval(() => go(1), 3200);
    return () => clearInterval(autoRef.current);
  }, [go]);

  const pauseAuto = () => clearInterval(autoRef.current);
  const resumeAuto = () => {
    clearInterval(autoRef.current);
    autoRef.current = setInterval(() => go(1), 3200);
  };

  // Drag / swipe
  const onDragStart = (e) => {
    setIsDragging(true);
    setDragStart(e.type === 'touchstart' ? e.touches[0].clientX : e.clientX);
    pauseAuto();
  };
  const onDragEnd = (e) => {
    if (!isDragging) return;
    const end = e.type === 'touchend' ? e.changedTouches[0].clientX : e.clientX;
    const diff = dragStart - end;
    if (Math.abs(diff) > 40) go(diff > 0 ? 1 : -1);
    setIsDragging(false);
    resumeAuto();
  };

  const handleQuickAdd = (e, product) => {
    e.preventDefault();
    e.stopPropagation();
    const hasVariants = product.variants && product.variants.length > 0;
    addItem(product, hasVariants ? product.variants[0] : null);
    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 1200);
  };

  // Compute position offset from center (clamped to ±2)
  const getOffset = (idx) => {
    let offset = idx - activeIdx;
    if (offset > total / 2) offset -= total;
    if (offset < -total / 2) offset += total;
    return offset;
  };

  return (
    <div className={styles.wrapper}
      onMouseEnter={pauseAuto}
      onMouseLeave={resumeAuto}
      onMouseDown={onDragStart}
      onMouseUp={onDragEnd}
      onTouchStart={onDragStart}
      onTouchEnd={onDragEnd}
    >
      {/* Ambient glow behind carousel */}
      <div className={styles.ambientGlow} />

      {/* 3D Stage */}
      <div className={styles.stage}>
        {products.map((product, idx) => {
          const offset = getOffset(idx);
          const abs = Math.abs(offset);
          if (abs > 2) return null; // only render ±2 from center

          const isActive = offset === 0;
          const rotateY = offset * 38;
          const translateX = offset * 52; // % units handled in style
          const translateZ = isActive ? 60 : abs === 1 ? 0 : -80;
          const scale = isActive ? 1 : abs === 1 ? 0.82 : 0.65;
          const opacity = abs > 1 ? 0.45 : 1;
          const zIndex = 10 - abs;

          return (
            <Link
              key={product.id}
              to={`/product/${product.id}`}
              className={`${styles.card} ${isActive ? styles.cardActive : ''}`}
              style={{
                transform: `translateX(calc(${translateX * 1.4}%)) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                opacity,
                zIndex,
                pointerEvents: isActive ? 'auto' : abs === 1 ? 'auto' : 'none',
              }}
              onClick={(e) => { if (!isActive) { e.preventDefault(); setActiveIdx(idx); } }}
            >
              {/* Glare overlay */}
              <div className={styles.glare} />

              {/* Image */}
              <div className={styles.imageBox}>
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className={styles.image} />
                ) : (
                  <div className={styles.placeholder}><Package size={36} /></div>
                )}
                {isActive && (
                  <div className={styles.newBadge}>
                    <Sparkles size={11} /> جديد
                  </div>
                )}
              </div>

              {/* Info */}
              <div className={styles.info}>
                <div className={styles.catLabel}>{product.category_name || ''}</div>
                <h3 className={styles.name}>{product.name}</h3>
                <div className={styles.priceRow}>
                  <span className={styles.price}>{fmt(Math.round(product.base_price))} دج</span>
                  {isActive && (
                    <button
                      className={`${styles.addBtn} ${addedId === product.id ? styles.addedBtn : ''}`}
                      onClick={(e) => handleQuickAdd(e, product)}
                      disabled={!product.is_active}
                      title="أضف للسلة"
                    >
                      {addedId === product.id ? '✓' : <ShoppingCart size={16} />}
                    </button>
                  )}
                </div>
              </div>

              {/* Reflection */}
              <div className={styles.reflection} />
            </Link>
          );
        })}
      </div>

      {/* Prev / Next */}
      <button className={`${styles.navBtn} ${styles.navPrev}`} onClick={() => { go(-1); pauseAuto(); setTimeout(resumeAuto, 4000); }}>
        <ChevronRight size={22} />
      </button>
      <button className={`${styles.navBtn} ${styles.navNext}`} onClick={() => { go(1); pauseAuto(); setTimeout(resumeAuto, 4000); }}>
        <ChevronLeft size={22} />
      </button>

      {/* Dots */}
      <div className={styles.dots}>
        {products.map((_, i) => (
          <button
            key={i}
            className={`${styles.dot} ${i === activeIdx ? styles.dotActive : ''}`}
            onClick={() => { setActiveIdx(i); pauseAuto(); setTimeout(resumeAuto, 4000); }}
          />
        ))}
      </div>
    </div>
  );
};

export default ProductCarousel3D;
