import React, { useEffect, useState } from 'react';
import { Tag, Sparkles } from 'lucide-react';
import { productsAPI } from '../../../api';
import ProductCard from '../../../components/ProductCard/ProductCard';
import Spinner from '../../../components/Spinner/Spinner';
import s from './Offers.module.css';

const Offers = () => {
  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const fetchOffers = async () => {
      try {
        setLoading(true);
        // Fetch products flagged as offers
        const res = await productsAPI.getAll({ is_offer: true, is_active: true, limit: 100 });
        setOffers(res.data || []);
      } catch (err) {
        setError('فشل في تحميل العروض. يرجى المحاولة لاحقاً.');
      } finally {
        setLoading(false);
      }
    };
    fetchOffers();
  }, []);

  if (loading) {
    return (
      <div className={s.pageWrapper} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={s.pageWrapper}>
        <div className="container" style={{ color: 'var(--danger)', textAlign: 'center', padding: '40px 0' }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className={s.pageWrapper}>
      <div className="container">
        
        {/* Animated Header */}
        <div className={s.header}>
          <div className={s.headerContent}>
            <div className={s.badge}>
              <Sparkles size={16} /> خصومات مذهلة لفترة محدودة!
            </div>
            <h1 className={s.title}>العروض والباقات الخاصة 🔥</h1>
            <p className={s.subtitle}>
              تسوق الآن ووفر أكثر مع أفضل عروض التخفيضات وباقات التوفير الحصرية من متجرنا. 
              كميات محدودة، اغتنم الفرصة قبل نفاد المخزون!
            </p>
          </div>
        </div>

        {/* Offers Grid */}
        {offers.length === 0 ? (
          <div className={s.emptyState}>
            <Tag size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
            <p>لا توجد عروض حالية. يرجى التحقق مرة أخرى قريباً!</p>
          </div>
        ) : (
          <div className={s.grid}>
            {offers.map((product, index) => (
              <div key={product.id} className={s.item} style={{ animationDelay: `${index * 0.1}s` }}>
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default Offers;
