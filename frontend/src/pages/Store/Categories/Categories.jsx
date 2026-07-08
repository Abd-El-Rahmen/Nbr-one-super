import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Package, ChevronLeft, LayoutGrid } from 'lucide-react';
import { categoriesAPI, productsAPI } from '../../../api';
import ProductCard from '../../../components/ProductCard/ProductCard';
import Spinner from '../../../components/Spinner/Spinner';
import styles from './Categories.module.css';

const CATEGORY_META = {
  'pantry':        { emoji: '🛒', color: '#e8f5e9', accent: '#2e7d32', desc: 'كل ما تحتاجه من مستلزمات المطبخ والمواد الغذائية الأساسية.' },
  'dairy':         { emoji: '🥛', color: '#e3f2fd', accent: '#1565c0', desc: 'منتجات الألبان الطازجة يومياً — حليب، جبن، زبدة، وأكثر.' },
  'beverages':     { emoji: '🧃', color: '#fff8e1', accent: '#f57f17', desc: 'عصائر، مشروبات غازية، ماء معدني وكل ما يروي عطشك.' },
  'snacks-sweets': { emoji: '🍫', color: '#fce4ec', accent: '#c62828', desc: 'حلويات، مقرمشات وسناكات لكل المناسبات.' },
  'cleaning':      { emoji: '🧴', color: '#e0f7fa', accent: '#00695c', desc: 'منظفات ومواد تنظيف للحفاظ على بيتك نظيفاً ولامعاً.' },
  'personal-care': { emoji: '🧼', color: '#ede7f6', accent: '#4527a0', desc: 'منتجات العناية الشخصية والنظافة اليومية.' },
  'fruits-veg':    { emoji: '🥦', color: '#f1f8e9', accent: '#558b2f', desc: 'خضراوات وفواكه طازجة مباشرة إلى منزلك.' },
};

const DEFAULT_META = { emoji: '📦', color: '#f5f5f5', accent: '#555', desc: 'تصفح منتجات هذا القسم.' };

const Categories = () => {
  const [categories,   setCategories]   = useState([]);
  const [allProducts,  setAllProducts]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [activeCat,    setActiveCat]    = useState(null); // for hero quick-jump tabs

  useEffect(() => {
    Promise.all([
      categoriesAPI.getAll(),
      productsAPI.getAll({ is_active: true, limit: 500 }),
    ]).then(([cRes, pRes]) => {
      const cats  = Array.isArray(cRes.data) ? cRes.data : [];
      const prods = (Array.isArray(pRes.data) ? pRes.data : []).filter(p => p.is_active);
      setCategories(cats);
      setAllProducts(prods);
      if (cats.length > 0) setActiveCat(cats[0].id);
    }).catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Intersection Observer for smooth scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animateIn');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    setTimeout(() => {
      const elements = document.querySelectorAll('.reveal');
      elements.forEach((el) => observer.observe(el));
    }, 100);

    return () => observer.disconnect();
  }, [loading]);

  const getProductsForCategory = (catId) =>
    allProducts.filter(p => String(p.category_id) === String(catId)).slice(0, 4);

  const scrollToCategory = (id) => {
    setActiveCat(id);
    const el = document.getElementById(`cat-${id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (loading) {
    return (
      <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container" style={{ padding: '60px 24px', textAlign: 'center' }}>
        <p style={{ color: 'var(--danger)', fontWeight: 700 }}>{error}</p>
      </div>
    );
  }

  return (
    <div>
      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className="container">
          <div className={styles.heroBreadcrumb}>
            <Link to="/">الرئيسية</Link>
            <ChevronLeft size={14} />
            <span>الأقسام</span>
          </div>
          <div className={styles.heroInner}>
            <div>
              <h1 className={styles.heroTitle}>
                <LayoutGrid size={36} style={{ verticalAlign: 'middle', marginLeft: 14 }} />
                استكشف أقسام المتجر
              </h1>
              <p className={styles.heroSub}>
                {categories.length} قسم، أكثر من {allProducts.length} منتج — كل شيء في مكان واحد
              </p>
            </div>
          </div>
        </div>
      </section>
      {/* ── Per-category sections ── */}
      <div className="container" style={{ padding: '48px 24px' }}>
        <div className={styles.sectionsCol}>
          {categories.map((cat, catIdx) => {
            const meta     = CATEGORY_META[cat.slug] || DEFAULT_META;
            const products = getProductsForCategory(cat.id);
            const total    = allProducts.filter(p => String(p.category_id) === String(cat.id)).length;

            return (
              <section
                key={cat.id}
                id={`cat-${cat.id}`}
                className={`${styles.catSection} reveal`}
                style={{ transitionDelay: `${catIdx * 0.08}s` }}
              >
                {/* Section Banner */}
                <div className={styles.catBanner} style={{ background: meta.color }}>
                  <div className={styles.catBannerLeft}>
                    {cat.image_url ? (
                      <img 
                        src={cat.image_url} 
                        alt={cat.name} 
                        style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: '12px', border: `2px solid ${meta.accent}` }}
                      />
                    ) : (
                      <div className={styles.catEmojiBox} style={{ background: meta.accent }}>
                        <span className={styles.catEmoji}>{meta.emoji}</span>
                      </div>
                    )}
                    <div>
                      <h2 className={styles.catName} style={{ color: meta.accent }}>{cat.name}</h2>
                      <p className={styles.catDesc}>{meta.desc}</p>
                      <span className={styles.catProductCount}>{total} منتج متوفر</span>
                    </div>
                  </div>
                  <Link
                    to={`/shop?category=${cat.id}`}
                    className={styles.viewAllBtn}
                    style={{ background: meta.accent }}
                  >
                    عرض الكل <ArrowLeft size={16} />
                  </Link>
                </div>

                {/* Product Cards Row */}
                {products.length === 0 ? (
                  <div className={styles.emptyCat}>
                    <Package size={36} />
                    <p>لا توجد منتجات متاحة في هذا القسم حالياً.</p>
                  </div>
                ) : (
                  <div className={styles.productRow}>
                    {products.map((product, i) => (
                      <div key={product.id} className={styles.productCell} style={{ animationDelay: `${catIdx * 0.08 + i * 0.05}s` }}>
                        <ProductCard product={product} />
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Categories;
