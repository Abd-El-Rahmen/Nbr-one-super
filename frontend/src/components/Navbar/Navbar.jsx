import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ShoppingCart, Search, Menu, X, Package } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { productsAPI } from '../../api';
import styles from './Navbar.module.css';

const Navbar = () => {
  const { count } = useCart();
  const [menuOpen, setMenuOpen]       = useState(false);
  const [query, setQuery]             = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showDrop, setShowDrop]       = useState(false);
  const [loading, setLoading]         = useState(false);
  const [activeIdx, setActiveIdx]     = useState(-1);
  const [scrolled, setScrolled]       = useState(true);

  const navigate    = useNavigate();
  const wrapperRef  = useRef(null);
  const debounceRef = useRef(null);

  // ── Navbar always appears in dark/scrolled style ────────────────────────

  // ── Close dropdown on outside click ──────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDrop(false);
        setActiveIdx(-1);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Debounced search ──────────────────────────────────────────────────────
  const fetchSuggestions = useCallback(async (q) => {
    if (!q || q.trim().length < 2) {
      setSuggestions([]);
      setShowDrop(false);
      return;
    }
    setLoading(true);
    try {
      const res = await productsAPI.getAll({ search: q.trim(), limit: 6 });
      const list = Array.isArray(res.data) ? res.data.filter(p => p.is_active) : [];
      setSuggestions(list);
      setShowDrop(list.length > 0);
    } catch {
      setSuggestions([]);
      setShowDrop(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setActiveIdx(-1);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
  };

  // ── Keyboard navigation ───────────────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (!showDrop) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, -1));
    } else if (e.key === 'Escape') {
      setShowDrop(false);
      setActiveIdx(-1);
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      goToProduct(suggestions[activeIdx]);
    }
  };

  const goToProduct = (product) => {
    setShowDrop(false);
    setQuery('');
    setSuggestions([]);
    navigate(`/product/${product.id}`);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      setShowDrop(false);
      navigate(`/shop?search=${encodeURIComponent(query.trim())}`);
    }
  };

  const getImageUrl = (product) => {
    if (product.images && product.images.length > 0) {
      const img = product.images[0];
      return img.startsWith('http') ? img : `http://localhost:5000${img}`;
    }
    return null;
  };

  const getPrice = (product) => {
    if (product.variants && product.variants.length > 0) {
      const prices = product.variants.map(v => parseFloat(v.price)).filter(Boolean);
      if (prices.length) return Math.min(...prices).toLocaleString('fr-DZ') + ' دج';
    }
    return product.price ? parseFloat(product.price).toLocaleString('fr-DZ') + ' دج' : '';
  };

  return (
    <header className={`${styles.header} ${scrolled ? styles.headerScrolled : ''}`}>
      <div className="container">
        <div className={styles.nav}>
          {/* Logo */}
          <Link to="/" className={styles.logoWrapper} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img src="/logo.png" alt="Number One Supermarket" className={styles.logoImg} />
          </Link>

          {/* Links - desktop */}
          <nav className={styles.links}>
            <NavLink to="/" end className={({isActive}) => isActive ? `${styles.link} ${styles.active}` : styles.link}>الرئيسية</NavLink>
            <NavLink to="/offers" className={({isActive}) => isActive ? `${styles.link} ${styles.active}` : styles.link} style={{ color: 'var(--danger)', fontWeight: 800 }}>العروض 🔥</NavLink>
            <NavLink to="/shop" className={({isActive}) => isActive ? `${styles.link} ${styles.active}` : styles.link}>المنتجات</NavLink>
            <NavLink to="/categories" className={({isActive}) => isActive ? `${styles.link} ${styles.active}` : styles.link}>الأقسام</NavLink>
            <NavLink to="/my-orders" className={({isActive}) => isActive ? `${styles.link} ${styles.active}` : styles.link} style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Package size={15} /> طلباتي</NavLink>
            <NavLink to="/contact" className={({isActive}) => isActive ? `${styles.link} ${styles.active}` : styles.link}>اتصل بنا</NavLink>
          </nav>

          {/* Actions */}
          <div className={styles.actions}>
            {/* Search with autocomplete */}
            <div className={styles.searchWrapper} ref={wrapperRef}>
              <form onSubmit={handleSearch} className={styles.searchForm}>
                <input
                  value={query}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  onFocus={() => suggestions.length > 0 && setShowDrop(true)}
                  placeholder="ابحث..."
                  className={styles.searchInput}
                  autoComplete="off"
                />
                <button type="submit" className={styles.searchBtn}>
                  <Search size={18} />
                </button>
              </form>

              {/* Suggestions Dropdown */}
              {showDrop && (
                <div className={styles.suggestions}>
                  {loading && (
                    <div className={styles.suggestLoading}>جاري البحث...</div>
                  )}
                  {!loading && suggestions.map((product, idx) => {
                    const imgUrl = getImageUrl(product);
                    return (
                      <div
                        key={product.id}
                        className={`${styles.suggestItem} ${idx === activeIdx ? styles.suggestActive : ''}`}
                        onMouseDown={() => goToProduct(product)}
                        onMouseEnter={() => setActiveIdx(idx)}
                      >
                        <div className={styles.suggestImg}>
                          {imgUrl
                            ? <img src={imgUrl} alt={product.name} />
                            : <Package size={20} color="var(--text-muted)" />
                          }
                        </div>
                        <div className={styles.suggestInfo}>
                          <span className={styles.suggestName}>{product.name}</span>
                          {getPrice(product) && (
                            <span className={styles.suggestPrice}>{getPrice(product)}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {!loading && suggestions.length > 0 && (
                    <button
                      className={styles.suggestAll}
                      onMouseDown={handleSearch}
                    >
                      عرض كل النتائج لـ "{query}"
                    </button>
                  )}
                </div>
              )}
            </div>

            <Link to="/cart" className={styles.cartBtn}>
              <ShoppingCart size={22} />
              {count > 0 && <span className={styles.cartBadge}>{count}</span>}
            </Link>

            <button className={styles.menuToggle} onClick={() => setMenuOpen(v => !v)}>
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <nav className={styles.mobileMenu}>
            <Link to="/" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>الرئيسية</Link>
            <Link to="/offers" className={styles.mobileLink} style={{ color: 'var(--danger)', fontWeight: 800 }} onClick={() => setMenuOpen(false)}>العروض 🔥</Link>
            <Link to="/shop" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>المنتجات</Link>
            <Link to="/categories" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>الأقسام</Link>
            <Link to="/my-orders" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>📦 طلباتي</Link>
            <Link to="/contact" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>اتصل بنا</Link>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Navbar;
