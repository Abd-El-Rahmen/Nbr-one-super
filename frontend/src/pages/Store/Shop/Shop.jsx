import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, SlidersHorizontal, X, ChevronDown, ArrowUpDown } from 'lucide-react';
import { productsAPI, categoriesAPI } from '../../../api';
import ProductCard from '../../../components/ProductCard/ProductCard';
import Spinner from '../../../components/Spinner/Spinner';
import styles from './Shop.module.css';

const SORT_OPTIONS = [
  { value: 'newest',     label: 'الأحدث أولاً' },
  { value: 'price_asc',  label: 'السعر: من الأقل' },
  { value: 'price_desc', label: 'السعر: من الأعلى' },
  { value: 'name_asc',   label: 'الاسم: أ → ي' },
];

const Shop = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [allProducts, setAllProducts] = useState([]);  // full unfiltered list
  const [categories, setCategories]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Filter state
  const [activeCategory, setActiveCategory] = useState(searchParams.get('category') || '');
  const [sortBy,         setSortBy]         = useState('newest');
  const [minPrice,       setMinPrice]       = useState('');
  const [maxPrice,       setMaxPrice]       = useState('');
  const [inStockOnly,    setInStockOnly]    = useState(false);

  const searchQuery = searchParams.get('search') || '';

  // Load all active products once
  useEffect(() => {
    setLoading(true);
    Promise.all([
      productsAPI.getAll({ is_active: true, limit: 500 }),
      categoriesAPI.getAll(),
    ]).then(([pRes, cRes]) => {
      const prods = (Array.isArray(pRes.data) ? pRes.data : []).filter(p => p.is_active);
      setAllProducts(prods);
      setCategories(Array.isArray(cRes.data) ? cRes.data : []);
    }).catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Re-sync category from URL (e.g. when user clicks Home category links)
  useEffect(() => {
    setActiveCategory(searchParams.get('category') || '');
  }, [searchParams]);

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
  }, [loading, activeCategory, searchQuery]);

  // Derived / filtered products
  const filteredProducts = useMemo(() => {
    let list = [...allProducts];

    // search
    if (searchQuery) {
      list = list.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    // category
    if (activeCategory) {
      list = list.filter(p => String(p.category_id) === String(activeCategory));
    }
    // price range
    if (minPrice !== '') {
      list = list.filter(p => Number(p.base_price) >= Number(minPrice));
    }
    if (maxPrice !== '') {
      list = list.filter(p => Number(p.base_price) <= Number(maxPrice));
    }
    // in-stock (we treat any product with stock_quantity > 0 or no stock_quantity as in-stock)
    if (inStockOnly) {
      list = list.filter(p => !p.stock_quantity || p.stock_quantity > 0);
    }
    // sort
    switch (sortBy) {
      case 'price_asc':  list.sort((a, b) => a.base_price - b.base_price); break;
      case 'price_desc': list.sort((a, b) => b.base_price - a.base_price); break;
      case 'name_asc':   list.sort((a, b) => a.name.localeCompare(b.name, 'ar')); break;
      default:           list.sort((a, b) => b.id - a.id); break;
    }
    return list;
  }, [allProducts, searchQuery, activeCategory, minPrice, maxPrice, inStockOnly, sortBy]);

  const handleCategoryClick = (id) => {
    const val = id ? String(id) : '';
    setActiveCategory(val);
    if (id) {
      searchParams.set('category', id);
    } else {
      searchParams.delete('category');
    }
    setSearchParams(searchParams);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetFilters = () => {
    setActiveCategory('');
    setSortBy('newest');
    setMinPrice('');
    setMaxPrice('');
    setInStockOnly(false);
    setSearchParams({});
  };

  const hasActiveFilters = activeCategory || minPrice || maxPrice || inStockOnly || sortBy !== 'newest';

  return (
    <div>
      {/* Page Banner */}
      <div className={styles.banner}>
        <div className="container reveal">
          <h1 className={styles.bannerTitle}>
            {searchQuery ? `نتائج البحث عن "${searchQuery}"` : '🛍️ تصفح المنتجات'}
          </h1>
          <p className={styles.bannerSub}>
            {filteredProducts.length > 0
              ? `${filteredProducts.length} منتج متوفر`
              : 'لا توجد نتائج مطابقة'}
          </p>
        </div>
      </div>

      <div className={`container ${styles.shopContainer}`}>
        {/* Mobile Filter Toggle */}
        <button className={styles.mobileFilterBtn} onClick={() => setFiltersOpen(!filtersOpen)}>
          <SlidersHorizontal size={18} />
          {filtersOpen ? 'إخفاء الفلاتر' : 'الفلاتر والترتيب'}
          {hasActiveFilters && <span className={styles.filterDot} />}
        </button>

        <div className={styles.layout}>
          {/* ── Sidebar ── */}
          <aside className={`${styles.sidebar} ${filtersOpen ? styles.sidebarOpen : ''}`}>
            {/* Reset */}
            {hasActiveFilters && (
              <button className={styles.resetBtn} onClick={resetFilters}>
                <X size={14} /> مسح كل الفلاتر
              </button>
            )}

            {/* Categories */}
            <div className={styles.filterBlock}>
              <h3 className={styles.filterTitle}><Filter size={16} /> الأقسام</h3>
              <ul className={styles.catList}>
                <li>
                  <button
                    className={`${styles.catBtn} ${!activeCategory ? styles.active : ''}`}
                    onClick={() => handleCategoryClick('')}
                  >
                    الكل
                    <span className={styles.catCount}>{allProducts.length}</span>
                  </button>
                </li>
                {categories.map(c => {
                  const count = allProducts.filter(p => String(p.category_id) === String(c.id)).length;
                  return (
                    <li key={c.id}>
                      <button
                        className={`${styles.catBtn} ${activeCategory === String(c.id) ? styles.active : ''}`}
                        onClick={() => handleCategoryClick(c.id)}
                      >
                        {c.name}
                        <span className={styles.catCount}>{count}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Sort */}
            <div className={styles.filterBlock}>
              <h3 className={styles.filterTitle}><ArrowUpDown size={16} /> الترتيب</h3>
              <div className={styles.sortGroup}>
                {SORT_OPTIONS.map(o => (
                  <button
                    key={o.value}
                    className={`${styles.sortBtn} ${sortBy === o.value ? styles.sortActive : ''}`}
                    onClick={() => setSortBy(o.value)}
                  >
                    {sortBy === o.value && <span className={styles.sortCheck}>✓</span>}
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div className={styles.filterBlock}>
              <h3 className={styles.filterTitle}><ChevronDown size={16} /> نطاق السعر (دج)</h3>
              <div className={styles.priceRow}>
                <input
                  type="number"
                  placeholder="من"
                  className={styles.priceInput}
                  value={minPrice}
                  min={0}
                  onChange={e => setMinPrice(e.target.value)}
                />
                <span className={styles.priceSep}>—</span>
                <input
                  type="number"
                  placeholder="إلى"
                  className={styles.priceInput}
                  value={maxPrice}
                  min={0}
                  onChange={e => setMaxPrice(e.target.value)}
                />
              </div>
            </div>

            {/* Availability */}
            <div className={styles.filterBlock}>
              <h3 className={styles.filterTitle}>التوفر</h3>
              <label className={styles.toggleLabel}>
                <div
                  className={`${styles.toggle} ${inStockOnly ? styles.toggleOn : ''}`}
                  onClick={() => setInStockOnly(!inStockOnly)}
                >
                  <div className={styles.toggleThumb} />
                </div>
                المتوفر في المخزون فقط
              </label>
            </div>
          </aside>

          {/* ── Product Grid ── */}
          <div className={styles.main}>
            {/* Active Filter Tags */}
            {hasActiveFilters && (
              <div className={styles.filterTags}>
                {activeCategory && (
                  <span className={styles.tag}>
                    {categories.find(c => String(c.id) === String(activeCategory))?.name}
                    <button onClick={() => handleCategoryClick('')}><X size={12} /></button>
                  </span>
                )}
                {sortBy !== 'newest' && (
                  <span className={styles.tag}>
                    {SORT_OPTIONS.find(o => o.value === sortBy)?.label}
                    <button onClick={() => setSortBy('newest')}><X size={12} /></button>
                  </span>
                )}
                {(minPrice || maxPrice) && (
                  <span className={styles.tag}>
                    السعر: {minPrice || '0'} — {maxPrice || '∞'} دج
                    <button onClick={() => { setMinPrice(''); setMaxPrice(''); }}><X size={12} /></button>
                  </span>
                )}
                {inStockOnly && (
                  <span className={styles.tag}>
                    متوفر فقط
                    <button onClick={() => setInStockOnly(false)}><X size={12} /></button>
                  </span>
                )}
              </div>
            )}

            {loading ? (
              <div style={{ padding: '80px 0' }}><Spinner center size="lg" /></div>
            ) : error ? (
              <div className={styles.error}>{error}</div>
            ) : filteredProducts.length === 0 ? (
              <div className={styles.empty}>
                <h3>لا توجد منتجات مطابقة</h3>
                <p>جرّب تغيير الفلاتر أو <button onClick={resetFilters} className={styles.emptyReset}>مسح الكل</button></p>
              </div>
            ) : (
              <div className={styles.grid}>
                {filteredProducts.map((p, i) => (
                  <div key={p.id} className={styles.productWrapper} style={{ animationDelay: `${Math.min(i, 12) * 0.04}s` }}>
                    <ProductCard product={p} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Shop;
