import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import styles from './CategoryCarousel3D.module.css';

const CategoryCarousel3D = ({ categories, categoryImages }) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const autoRef = useRef(null);
  const total = categories.length;

  const go = useCallback((dir) => {
    setActiveIdx(prev => (prev + dir + total) % total);
  }, [total]);

  useEffect(() => {
    autoRef.current = setInterval(() => go(1), 3500);
    return () => clearInterval(autoRef.current);
  }, [go]);

  const pauseAuto = () => clearInterval(autoRef.current);
  const resumeAuto = () => {
    clearInterval(autoRef.current);
    autoRef.current = setInterval(() => go(1), 3500);
  };

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

  const getOffset = (idx) => {
    let offset = idx - activeIdx;
    if (offset > total / 2) offset -= total;
    if (offset < -total / 2) offset += total;
    return offset;
  };

  return (
    <div
      className={styles.wrapper}
      onMouseEnter={pauseAuto}
      onMouseLeave={resumeAuto}
      onMouseDown={onDragStart}
      onMouseUp={onDragEnd}
      onTouchStart={onDragStart}
      onTouchEnd={onDragEnd}
    >
      {/* Ambient radial glow */}
      <div className={styles.ambientGlow} />

      {/* 3D Stage */}
      <div className={styles.stage}>
        {categories.map((cat, idx) => {
          const offset = getOffset(idx);
          const abs = Math.abs(offset);
          if (abs > 2) return null;

          const isActive = offset === 0;
          const rotateY = offset * 35;
          const translateX = offset * 70;
          const translateZ = isActive ? 120 : abs === 1 ? -20 : -160;
          const scale = isActive ? 1 : abs === 1 ? 0.85 : 0.7;
          const opacity = abs > 1 ? 0.45 : abs === 1 ? 0.9 : 1;
          const zIndex = 10 - abs;
          const imgSrc = cat.image_url || categoryImages[cat.slug] || categoryImages['pantry'];

          return (
            <div
              key={cat.id}
              style={{
                position: 'absolute',
                transform: `translateX(calc(${translateX * 1.35}%)) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                opacity,
                zIndex,
                pointerEvents: isActive ? 'auto' : abs === 1 ? 'auto' : 'none',
                transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.5s ease',
                transformStyle: 'preserve-3d',
              }}
            >
              <Link
                to={`/shop?category=${cat.id}`}
                className={`${styles.card} ${isActive ? styles.cardActive : ''}`}
                onClick={(e) => {
                  if (!isActive) {
                    e.preventDefault();
                    setActiveIdx(idx);
                    pauseAuto();
                    setTimeout(resumeAuto, 4000);
                  }
                }}
              >
                {/* Glare */}
                <div className={styles.glare} />

                {/* Background photo */}
                <div className={styles.imageWrapper}>
                  <img src={imgSrc} alt={cat.name} className={styles.image} />
                  <div className={styles.overlay} />
                </div>

                {/* Active ring */}
                {isActive && <div className={styles.activeRing} />}
              </Link>
            </div>
          );
        })}
      </div>

      {/* Nav buttons */}
      <button
        className={`${styles.navBtn} ${styles.navPrev}`}
        onClick={() => { go(-1); pauseAuto(); setTimeout(resumeAuto, 4000); }}
        aria-label="السابق"
      >
        <ChevronRight size={20} />
      </button>
      <button
        className={`${styles.navBtn} ${styles.navNext}`}
        onClick={() => { go(1); pauseAuto(); setTimeout(resumeAuto, 4000); }}
        aria-label="التالي"
      >
        <ChevronLeft size={20} />
      </button>

      {/* Dots */}
      <div className={styles.dots}>
        {categories.map((_, i) => (
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

export default CategoryCarousel3D;
