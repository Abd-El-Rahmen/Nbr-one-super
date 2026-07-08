import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '../../../context/CartContext';
import { getImageUrl } from '../../../api';
import styles from './Cart.module.css';

const fmt = n => new Intl.NumberFormat('ar-DZ').format(n);

const Cart = () => {
  const { items, updateQuantity, removeItem, total, count } = useCart();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="container" style={{ padding: '80px 24px', textAlign: 'center' }}>
        <div className={styles.emptyIcon}><ShoppingBag size={64} /></div>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: 12 }}>سلة المشتريات فارغة</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>يبدو أنك لم تقم بإضافة أي منتجات إلى السلة بعد.</p>
        <Link to="/shop" className={styles.primaryBtn}>تصفح المنتجات</Link>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '40px 24px' }}>
      <h1 className={styles.title}>سلة المشتريات <span className={styles.countBadge}>({count} منتج)</span></h1>

      <div className={styles.layout}>
        <div className={styles.itemsList}>
          {items.map((item, index) => {
            const isPromo = !item.is_volume_offer && !item.is_bundle && item.compare_at_price && item.compare_at_price > item.price;
            const discountPct = isPromo ? Math.round(((item.compare_at_price - item.price) / item.compare_at_price) * 100) : 0;

            return (
            <div key={item.key} className={styles.itemCard} style={{ animationDelay: `${index * 0.1}s` }}>
              <div className={styles.itemImage} style={item.is_bundle ? { background: 'rgba(124,58,237,0.07)', border: '1.5px solid rgba(124,58,237,0.18)' } : {}}>
                {item.image_url ? (
                  <img src={getImageUrl(item.image_url)} alt={item.name} />
                ) : (
                  <ShoppingBag size={32} color={item.is_bundle ? '#7c3aed' : 'var(--text-muted)'} />
                )}
              </div>
              <div className={styles.itemInfo}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                  <h3 className={styles.itemName} style={{ margin: 0 }}>{item.name}</h3>
                  {item.is_bundle && (
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, background: 'rgba(124,58,237,0.12)', color: '#7c3aed', borderRadius: 20, padding: '2px 8px', border: '1px solid rgba(124,58,237,0.25)', whiteSpace: 'nowrap' }}>📦 باقة مجمعة</span>
                  )}
                  {item.is_volume_offer && (
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, background: 'rgba(16,185,129,0.1)', color: '#059669', borderRadius: 20, padding: '2px 8px', border: '1px solid rgba(16,185,129,0.3)', whiteSpace: 'nowrap' }}>🎉 عرض كمية</span>
                  )}
                  {isPromo && (
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, background: 'rgba(239,68,68,0.1)', color: '#dc2626', borderRadius: 20, padding: '2px 8px', border: '1px solid rgba(239,68,68,0.25)', whiteSpace: 'nowrap' }}>🏷️ خصم {discountPct}%</span>
                  )}
                </div>
                {item.variant_name && <div className={styles.itemVariant}>{item.variant_name}</div>}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <div className={styles.itemPrice}>{fmt(item.price)} دج</div>
                  {isPromo && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textDecoration: 'line-through' }}>{fmt(item.compare_at_price)} دج</div>
                  )}
                  {item.is_volume_offer && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>/ وحدة</div>
                  )}
                </div>

                {/* Bundle items breakdown */}
                {item.is_bundle && item.bundle_items && item.bundle_items.length > 0 && (
                  <div style={{
                    marginTop: 8,
                    background: 'rgba(124,58,237,0.05)',
                    border: '1px solid rgba(124,58,237,0.18)',
                    borderRadius: 8,
                    padding: '6px 10px',
                  }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#7c3aed', marginBottom: 4 }}>
                      📦 محتوى الباقة:
                    </div>
                    {item.bundle_items.map((bi, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', padding: '2px 0', borderBottom: i < item.bundle_items.length - 1 ? '1px solid rgba(124,58,237,0.1)' : 'none' }}>
                        <span>
                          {bi.product_name}
                          {bi.variant_name && <span style={{ color: '#7c3aed', marginRight: 4 }}> ({bi.variant_name})</span>}
                        </span>
                        <span style={{ fontWeight: 800, color: 'var(--text)', marginRight: 8, whiteSpace: 'nowrap' }}>
                          ×{bi.quantity}
                          {bi.price_override && (
                            <span style={{ color: '#7c3aed', marginRight: 4, fontWeight: 700 }}> · {fmt(bi.price_override * bi.quantity)} دج</span>
                          )}
                        </span>
                      </div>
                    ))}
                    <div style={{ marginTop: 5, fontSize: '0.73rem', fontWeight: 800, color: '#7c3aed', textAlign: 'left' }}>
                      سعر الباقة: {fmt(item.price)} دج
                    </div>
                  </div>
                )}

                {/* Volume offer extra info */}
                {item.is_volume_offer && item.vo_pack_size && (
                  <div style={{
                    marginTop: 8,
                    background: 'rgba(16,185,129,0.05)',
                    border: '1px solid rgba(16,185,129,0.2)',
                    borderRadius: 8,
                    padding: '5px 10px',
                    fontSize: '0.74rem',
                    color: '#059669',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}>
                    🎉 عرض الكمية: {item.vo_pack_size} قطعة بـ {fmt(item.price * item.vo_pack_size)} دج
                    <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                      (بدلاً من {fmt(item.original_price * item.vo_pack_size)} دج)
                    </span>
                  </div>
                )}
              </div>
              
              <div>
                {item.is_volume_offer && item.vo_pack_size ? (() => {
                  const ps = item.vo_pack_size;
                  const packs = Math.round(item.quantity / ps);
                  const maxPacks = item.stock_quantity !== undefined && item.stock_quantity !== null
                    ? Math.floor(item.stock_quantity / ps)
                    : Infinity;
                  const atMax = packs >= maxPacks;
                  return (
                    <>
                      <div className={styles.qtyBox}>
                        <button className={styles.qtyBtn}
                          onClick={() => updateQuantity(item.key, Math.max(ps, item.quantity - ps))}
                          disabled={packs <= 1}
                          style={packs <= 1 ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
                        >-</button>
                        <input className={styles.qtyInput} value={packs} readOnly />
                        <button className={styles.qtyBtn}
                          onClick={() => updateQuantity(item.key, item.quantity + ps)}
                          disabled={atMax}
                          style={atMax ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
                        >+</button>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: 2 }}>
                        {packs} باقة × {ps} قطع
                      </div>
                      {atMax && maxPacks !== Infinity && (
                        <div style={{ fontSize: '0.72rem', color: '#856404', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 6, padding: '4px 8px', marginTop: 4, fontWeight: 600 }}>
                          ⚠️ الحد الأقصى: {maxPacks} باقة
                        </div>
                      )}
                    </>
                  );
                })() : (
                  <>
                    <div className={styles.qtyBox}>
                      <button className={styles.qtyBtn} onClick={() => updateQuantity(item.key, item.quantity - 1)}>-</button>
                      <input className={styles.qtyInput} value={item.quantity} readOnly />
                      <button
                        className={styles.qtyBtn}
                        onClick={() => updateQuantity(item.key, item.quantity + 1)}
                        disabled={item.stock_quantity !== undefined && item.stock_quantity !== null && item.quantity >= item.stock_quantity}
                        style={item.stock_quantity !== undefined && item.quantity >= item.stock_quantity ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
                      >+</button>
                    </div>
                    {item.stock_quantity !== undefined && item.quantity >= item.stock_quantity && (
                      <div style={{ fontSize: '0.72rem', color: '#856404', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 6, padding: '4px 8px', marginTop: 4, fontWeight: 600 }}>
                        ⚠️ الكمية القصوى المتاحة: {item.stock_quantity}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className={styles.itemTotal}>
                <div>{fmt(item.price * item.quantity)} دج</div>
                {isPromo && (
                  <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700, marginTop: 2 }}>
                    وفرت {fmt((item.compare_at_price - item.price) * item.quantity)} دج
                  </div>
                )}
              </div>

              <button className={styles.removeBtn} onClick={() => removeItem(item.key)}>
                <Trash2 size={18} />
              </button>
            </div>
            );
          })}
        </div>

        <div className={styles.summary}>
          <h3 className={styles.summaryTitle}>ملخص الطلب</h3>
          <div className={styles.summaryRow}>
            <span>المجموع الفرعي</span>
            <span>{fmt(total)} دج</span>
          </div>
          {(() => {
            const totalSavings = items.reduce((acc, item) => {
              const isPromo = !item.is_volume_offer && !item.is_bundle && item.compare_at_price && item.compare_at_price > item.price;
              if (isPromo) return acc + (item.compare_at_price - item.price) * item.quantity;
              return acc;
            }, 0);
            const hasOffers = items.some(i => i.is_volume_offer || i.is_bundle || (!i.is_volume_offer && !i.is_bundle && i.compare_at_price && i.compare_at_price > i.price));
            return hasOffers ? (
              <div className={styles.summaryRow} style={{ color: '#059669', fontWeight: 800, fontSize: '0.95rem', background: 'rgba(16,185,129,0.07)', borderRadius: 8, padding: '6px 10px', margin: '-4px 0' }}>
                <span>🎉 إجمالي التوفير</span>
                <span>- {fmt(totalSavings)} دج</span>
              </div>
            ) : null;
          })()}
          <div className={styles.summaryRow}>
            <span>التوصيل</span>
            <span style={{color: 'var(--text-muted)', fontSize: '0.85rem'}}>يُحسب في الخطوة التالية</span>
          </div>
          <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
            <span>الإجمالي المقدر</span>
            <span>{fmt(total)} دج</span>
          </div>
          
          <button className={styles.checkoutBtn} onClick={() => navigate('/checkout')}>
            متابعة الدفع <ArrowRight size={20} />
          </button>
          <Link to="/shop" className={styles.continueLink}>متابعة التسوق</Link>
        </div>
      </div>
    </div>
  );
};

export default Cart;
