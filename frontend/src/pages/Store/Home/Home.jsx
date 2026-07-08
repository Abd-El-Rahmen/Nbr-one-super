import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Package, Truck, ShieldCheck, Clock, Star, ShoppingCart, Gift } from 'lucide-react';
import { categoriesAPI, productsAPI } from '../../../api';
import ProductCard from '../../../components/ProductCard/ProductCard';
import ProductOrbit3D from '../../../components/ProductOrbit3D/ProductOrbit3D';
import CategoryCarousel3D from '../../../components/CategoryCarousel3D/CategoryCarousel3D';
import Spinner from '../../../components/Spinner/Spinner';
import styles from './Home.module.css';



const Home = () => {
  const [categories, setCategories] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
const CATEGORY_IMAGES = Object.fromEntries(
  categories.map(category => [
    category.slug,
    `${category.image_url}`
  ])
);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const catRes = await categoriesAPI.getAll();
        setCategories(catRes.data ? catRes.data.slice(0, 7) : []);

        const prodRes = await productsAPI.getAll({ is_active: true, limit: 20, sort: 'createdAt', order: 'desc' });
        setFeaturedProducts(prodRes.data || []);
      } catch (err) {
        console.error('Failed to load home data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
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

    // Give it a tiny delay to ensure DOM elements are rendered
    setTimeout(() => {
      const elements = document.querySelectorAll('.reveal');
      elements.forEach((el) => observer.observe(el));
    }, 100);

    return () => observer.disconnect();
  }, [loading]);

  if (loading) {
    return <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner size="lg" /></div>;
  }

  return (
    <div className={styles.homeWrapper}>
      {/* Dynamic Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroPattern}></div>
        <div className={`container ${styles.heroContainer}`}>
          <div className={styles.heroContent}>
            <div className={styles.badge} style={{ animationDelay: '0.1s' }}>
              <Star size={14} fill="currentColor" /> #1 ديما نمبر وان
            </div>
            <h1 className={styles.heroTitle} style={{ animationDelay: '0.2s' }}>
              عند نمبر وان.. <br/> 
              <span className={styles.highlightText}>ديما جديد  ديما لافير!</span>
            </h1>
            <p className={styles.heroSub} style={{ animationDelay: '0.3s' }}>
              NumberOne  يجيبلك قاع واش تسحق لدارك، سلع جديدة وبأحسن الأسعار. 
              كوموندي دوكا ويوصلك القضيان حتى للباب.
            </p>
            <div className={styles.heroActions} style={{ animationDelay: '0.4s' }}>
              <Link to="/shop" className={styles.btnPrimary}>
                ابدأ التسوق <ArrowLeft size={18} />
              </Link>
              <Link to="/categories" className={styles.btnSecondary}>
                تصفح الأقسام
              </Link>
            </div>
          </div>
          
          <div className={styles.heroImageWrapper} style={{ animationDelay: '0.5s' }}>
            {/* 3D Logo Concept Graphic */}
            <div className={styles.heroGraphic3D}>
              {/* Text Elements */}
              <div className={styles.textNumber}>NUMBER</div>
              <div className={styles.textSupermarket}>WELCOME</div>

              {/* Speed Lines */}
              <div className={styles.speedLine1}></div>
              <div className={styles.speedLine2}></div>
              <div className={styles.speedLine3}></div>
              <div className={styles.speedLine4}></div>
              <div className={styles.speedLine5}></div>
              
              {/* Orbiting Rings */}
              <div className={styles.orbitRingOrange}></div>
              <div className={styles.orbitRingGreen}></div>
              <div className={styles.orbitRingInner}></div>

              {/* Glowing Particles */}
              <div className={styles.particle1}></div>
              <div className={styles.particle2}></div>
              <div className={styles.particle3}></div>

              {/* Central 'ONE' */}
              <div className={styles.centralOne}>
                <span className={styles.colorGreen}>O</span>
                <span className={styles.colorOrange}>N</span>
                <span className={styles.colorGreen}>E</span>
              </div>
              
              {/* Custom Shopping Cart Logo */}
              <div className={styles.cartWrapper}>
                <svg width="65" height="65" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Speed lines */}
                  <path d="M10 40 L30 40" stroke="var(--accent)" strokeWidth="6" strokeLinecap="round" />
                  <path d="M0 55 L35 55" stroke="var(--accent)" strokeWidth="6" strokeLinecap="round" />
                  <path d="M15 70 L40 70" stroke="var(--accent)" strokeWidth="6" strokeLinecap="round" />
                  
                  {/* Cart Basket */}
                  <path d="M 25 30 L 35 30 L 42 70 L 90 70 L 98 35 Z" fill="var(--accent)" stroke="var(--accent)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                  
                  {/* Wheels */}
                  <circle cx="50" cy="85" r="7" fill="var(--accent)" />
                  <circle cx="80" cy="85" r="7" fill="var(--accent)" />
                  
                  {/* Number 1 (Tilted) */}
                  <path 
                    d="M 55 30 L 65 20 L 75 20 L 75 55 L 85 55 L 85 65 L 50 65 L 50 55 L 60 55 L 60 35 Z" 
                    fill="var(--primary)" 
                    transform="rotate(-10 65 45)" 
                  />
                </svg>
              </div>

              {/* Grounding Shadow */}
              <div className={styles.floorShadow}></div>
            </div>
          </div>
        </div>
      </section>

      {/* Offers CTA Banner */}
      <section className="container reveal" style={{ padding: '0 24px', position: 'relative', zIndex: 10, marginTop: '20px' }}>
        <div className={styles.ctaBanner}>
          {/* Animated 3D/Floating Elements */}
          <div className={styles.cta3DShopper}>
            <img src="/assets/3d_shopper.png" alt="3D Shopper" className={styles.ctaShopperImage} />
          </div>

          {/* Decorative background elements */}
          <div className={styles.ctaBgCircle1}></div>
          <div className={styles.ctaBgCircle2}></div>
          
          <span className={styles.ctaBadge}>
            🔥 لفترة محدودة فقط
          </span>
          <h2 className={styles.ctaTitle}>
            اكتشف أقوى التخفيضات وباقات التوفير!
          </h2>
          <p className={styles.ctaSubtitle}>
            وفّر أكثر مع عروضنا الحصرية. تخفيضات كبرى، عروض كميات، وباقات مجمعة بأسعار لا تُنافس. لا تفوت الفرصة قبل نفاذ الكمية.
          </p>
          <Link to="/offers" className={styles.ctaBtn}>
            تصفح جميع العروض الآن <ArrowLeft size={20} />
          </Link>
        </div>
      </section>

      {/* Categories */}
      <section className={`${styles.section} ${styles.categoriesSection}`}>
        {/* Decorative ambient glows */}
        <div className={styles.ambientGlow1}></div>
        <div className={styles.ambientGlow2}></div>

        <div className="container">
          <div className={styles.categoryHeaderPremium}>
            <div className={`${styles.categoryHeaderLeft} reveal`}>
              <span className={styles.sectionSubtitle}>استكشف منتجاتنا</span>
              <h2 className={styles.sectionTitlePremium}>تسوق حسب القسم</h2>
              <p className={styles.categoryIntroText}>
                نوفر لك تشكيلة واسعة من المنتجات الطازجة، المعلبات، وأدوات التنظيف بأعلى معايير الجودة. 
                اختر القسم الذي يناسبك واستمتع بتجربة تسوق سريعة، سهلة، ومليئة بالعروض الحصرية المخصصة لك.
              </p>
            </div>
            <Link to="/categories" className={`${styles.linkAllPremium} reveal`}>
              عرض جميع الأقسام <ArrowLeft size={18} />
            </Link>
          </div>
        </div>
        
        {/* 3D Category Carousel */}
        <div className="reveal" style={{ marginTop: '20px' }}>
          {categories.length > 0 && (
            <CategoryCarousel3D categories={categories} categoryImages={CATEGORY_IMAGES} />
          )}
        </div>
      </section>
      {/* Why Choose Us Section */}
      <section className={styles.featuresSection}>
        <div className="container">
          {/* Section Header */}
          <div className={`${styles.whyHeader} reveal`}>
            <span className={styles.whySubtitle}>لماذا نحن؟</span>
            <h2 className={styles.whyTitle}>Number One — الخيار الأول دائماً</h2>
            <p className={styles.whyDesc}>
              منذ افتتاحنا، كان هدفنا الوحيد هو تقديم تجربة تسوق استثنائية تجمع بين الجودة العالية،
              الأسعار التنافسية، والخدمة السريعة مباشرة إلى باب منزلك.
            </p>
          </div>

          {/* Stats Bar */}
          <div className={`${styles.statsBar} reveal`}>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>+500</span>
              <span className={styles.statLabel}>منتج متاح</span>
            </div>
            <div className={styles.statDivider}></div>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>+2000</span>
              <span className={styles.statLabel}>عميل راضٍ</span>
            </div>
            <div className={styles.statDivider}></div>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>24/7</span>
              <span className={styles.statLabel}>خدمة مستمرة</span>
            </div>
            <div className={styles.statDivider}></div>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>100%</span>
              <span className={styles.statLabel}>جودة مضمونة</span>
            </div>
          </div>

          {/* Feature Cards */}
          <div className={`${styles.featuresGrid} reveal`}>
            <div className={styles.featureCard} style={{ transitionDelay: '0s' }}>
              <div className={styles.featureIcon}><Truck size={32} /></div>
              <h3 className={styles.featureTitle}>توصيل سريع للمنزل</h3>
              <p className={styles.featureDesc}>نوصل طلباتك مباشرة لباب بيتك في أقل وقت ممكن، بعناية تامة وبدون أي تأخير.</p>
            </div>
            <div className={styles.featureCard} style={{ transitionDelay: '0.12s' }}>
              <div className={styles.featureIcon}><ShieldCheck size={32} /></div>
              <h3 className={styles.featureTitle}>جودة مضمونة 100%</h3>
              <p className={styles.featureDesc}>كل منتج يمر بمراقبة دقيقة قبل وصوله إليك — طازج، سليم، ومطابق للمعايير.</p>
            </div>
            <div className={styles.featureCard} style={{ transitionDelay: '0.24s' }}>
              <div className={styles.featureIcon}><Clock size={32} /></div>
              <h3 className={styles.featureTitle}>خدمة 24/7</h3>
              <p className={styles.featureDesc}>نحن متاحون لك على مدار الساعة طوال أيام الأسبوع، ليس هناك وقت غير مناسب للتسوق.</p>
            </div>
            <div className={styles.featureCard} style={{ transitionDelay: '0.36s' }}>
              <div className={styles.featureIcon}><Package size={32} /></div>
              <h3 className={styles.featureTitle}>تشكيلة واسعة</h3>
              <p className={styles.featureDesc}>أكثر من 500 منتج في مختلف الفئات — من المواد الغذائية إلى منتجات التنظيف والعناية الشخصية.</p>
            </div>
            <div className={styles.featureCard} style={{ transitionDelay: '0.48s' }}>
              <div className={styles.featureIcon}><Star size={32} /></div>
              <h3 className={styles.featureTitle}>أسعار تنافسية</h3>
              <p className={styles.featureDesc}>نضمن لك أفضل الأسعار في السوق مع عروض وتخفيضات حصرية بشكل دوري لعملائنا الكرام.</p>
            </div>
            <div className={styles.featureCard} style={{ transitionDelay: '0.6s' }}>
              <div className={styles.featureIcon}><ShieldCheck size={32} /></div>
              <h3 className={styles.featureTitle}>دفع آمن ومرن</h3>
              <p className={styles.featureDesc}>ادفع عند الاستلام براحة تامة، بدون أي مخاطر أو قلق على أمان معاملاتك المالية.</p>
            </div>
          </div>
        </div>
      </section>


      {/* Featured Products — True 3D Orbit */}
      <ProductOrbit3D products={featuredProducts} />
      
      
    </div>
  );
};

export default Home;
