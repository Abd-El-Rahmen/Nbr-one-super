import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Truck, MapPin, CheckCircle2, Home, Building2, ChevronDown, Download, Package, ClipboardList } from 'lucide-react';
import { useCart } from '../../../context/CartContext';
import { ordersAPI } from '../../../api';
import { WILAYAS, getCommunesByWilaya, getDeliveryPrice } from '../../../data/algeria';
import styles from './Checkout.module.css';

const fmt = n => new Intl.NumberFormat('ar-DZ').format(n);

const Checkout = () => {
  const { items, total, clearCart } = useCart();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    wilaya_code: '',
    commune: '',
    address_line: '',
    postal_code: '',
  });
  const [deliveryType, setDeliveryType] = useState('home'); // 'home' | 'desk'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const receiptRef = useRef(null);

  // Dynamic Pricing State
  const [pricingTiers, setPricingTiers] = useState({});

  useEffect(() => {
    // Fetch dynamic pricing
    import('../../../api').then(({ deliveryPricingAPI }) => {
      deliveryPricingAPI.getAll()
        .then(res => {
          const map = {};
          res.data.forEach(tier => {
            map[tier.tier_id] = { home: Number(tier.home_fee), desk: Number(tier.stop_desk_fee) };
          });
          setPricingTiers(map);
        })
        .catch(console.error);
    });
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
  }, [success]);

  // Derived delivery info
  const selectedWilaya  = WILAYAS.find(w => w.code === form.wilaya_code);
  const communes        = form.wilaya_code ? getCommunesByWilaya(form.wilaya_code) : [];
  
  let deliveryPrice = null;
  if (selectedWilaya && pricingTiers[selectedWilaya.code]) {
    deliveryPrice = deliveryType === 'home' 
      ? pricingTiers[selectedWilaya.code].home 
      : pricingTiers[selectedWilaya.code].desk;
  } else if (form.wilaya_code) {
    // Fallback to static if API failed
    deliveryPrice = getDeliveryPrice(form.wilaya_code, deliveryType);
  }

  const orderTotal      = total + (deliveryPrice ?? 0);

  const handleWilayaChange = (code) => {
    setForm(prev => ({ ...prev, wilaya_code: code, commune: '' }));
  };

  if (items.length === 0 && !success) {
    return (
      <div className={`container ${styles.checkoutContainer}`} style={{ textAlign: 'center' }}>
        <h2 className="reveal">السلة فارغة</h2>
        <p className="reveal" style={{ color: 'var(--text-muted)', margin: '16px 0 32px' }}>لا يمكنك إتمام الدفع بدون منتجات.</p>
        <Link to="/shop" className={`${styles.btnPrimary} reveal`}>العودة للتسوق</Link>
      </div>
    );
  }

  const handleSaveImage = () => {
    if (!receiptRef.current) return;
    const content = receiptRef.current.innerHTML;
    const printWin = window.open('', '_blank', 'width=640,height=900');
    printWin.document.write(`
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <title>\u0641\u0627\u062a\u0648\u0631\u0629 \u0637\u0644\u0628 #${orderId} - NumberOne</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;900&display=swap');
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Tajawal', Arial, sans-serif; background: #fff; padding: 24px; color: #1f2937; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 8px 10px; }
            @media print { body { padding: 0; } .no-print { display: none !important; } }
          </style>
        </head>
        <body>
          ${content}
          <div class="no-print" style="text-align:center;margin-top:24px">
            <button onclick="window.print()" style="background:#059669;color:#fff;border:none;padding:12px 32px;border-radius:10px;font-size:1rem;font-family:Tajawal,Arial,sans-serif;font-weight:700;cursor:pointer">
              \ud83d\udda8\ufe0f \u0637\u0628\u0627\u0639\u0629 / \u062d\u0641\u0638 \u0643\u0635\u0648\u0631\u0629 PDF
            </button>
          </div>
        </body>
      </html>
    `);
    printWin.document.close();
    printWin.focus();
  };


  if (success) {
    const subTotal = orderItems.reduce((s, i) => s + i.price * i.quantity, 0);
    const delivFee = deliveryPrice ?? 0;
    const grandTotal = subTotal + delivFee;
    const STATUS_LABELS = { pending: 'قيد الانتظار', confirmed: 'جاري التحضير', shipped: 'تم الشحن', delivered: 'تم التوصيل', rejected: 'ملغى' };

    return (
      <div className={`container ${styles.checkoutContainer}`}>
        {/* Animated success header */}
        <div className={`${styles.successContainer} reveal`} style={{ marginBottom: 32 }}>
          <CheckCircle2 size={80} className={styles.successIcon} />
          <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: 8 }}>تم استلام طلبك بنجاح! 🎉</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: 8 }}>
            سنتواصل معك قريباً عبر الهاتف لتأكيد التوصيل.
          </p>
          <p style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', fontWeight: 700, fontSize: '1.05rem', color: 'var(--primary)' }}>
            <ClipboardList size={18} /> رقم طلبك: <span style={{ fontSize: '1.4rem', fontWeight: 900 }}>#{orderId}</span>
          </p>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 32 }}>
          <button
            onClick={handleSaveImage}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'var(--primary)', color: '#fff',
              border: 'none', borderRadius: 12, padding: '12px 24px',
              fontWeight: 700, fontSize: '1rem', cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 4px 16px rgba(46,196,182,0.3)'
            }}
          >
            <Download size={18} /> حفظ / طباعة الفاتورة
          </button>
          <Link to="/my-orders" style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'transparent',
            color: 'var(--primary)',
            border: '2px solid var(--primary)',
            borderRadius: 12, padding: '12px 24px',
            fontWeight: 700, fontSize: '1rem', textDecoration: 'none',
            transition: 'all 0.2s'
          }}>
            <Package size={18} /> طلباتي
          </Link>
          <Link to="/" className={styles.btnPrimary} style={{ padding: '12px 24px' }}>العودة للرئيسية</Link>
        </div>

        {/* Printable Receipt (also used for save-as-image) */}
        <div ref={receiptRef} style={{
          background: '#fff',
          borderRadius: 16,
          padding: '32px',
          maxWidth: 560,
          margin: '0 auto',
          fontFamily: 'Tajawal, Arial, sans-serif',
          direction: 'rtl',
          border: '1px solid #e5e7eb',
          boxShadow: '0 4px 24px rgba(0,0,0,0.07)'
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 24, paddingBottom: 16, borderBottom: '2px dashed #e5e7eb' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#059669', letterSpacing: 1 }}>NUMBER ONE</div>
            <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: 4 }}>سوبرماركت رقم واحد</div>
            <div style={{ marginTop: 12, display: 'inline-block', background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 8, padding: '4px 16px' }}>
              <span style={{ fontWeight: 800, color: '#16a34a', fontSize: '1rem' }}>رقم الطلب: #{orderId}</span>
            </div>
          </div>

          {/* Customer + Delivery Info */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 180, background: '#f9fafb', borderRadius: 10, padding: '12px 16px' }}>
              <div style={{ fontWeight: 700, marginBottom: 6, color: '#374151', fontSize: '0.88rem' }}>👤 بيانات العميل</div>
              <div style={{ fontSize: '0.85rem', color: '#4b5563', lineHeight: 1.8 }}>
                <div><strong>الاسم:</strong> {form.full_name}</div>
                <div><strong>الهاتف:</strong> {form.phone}</div>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 180, background: '#f9fafb', borderRadius: 10, padding: '12px 16px' }}>
              <div style={{ fontWeight: 700, marginBottom: 6, color: '#374151', fontSize: '0.88rem' }}>📍 عنوان التوصيل</div>
              <div style={{ fontSize: '0.85rem', color: '#4b5563', lineHeight: 1.8 }}>
                <div><strong>الولاية:</strong> {selectedWilaya?.name}</div>
                <div><strong>البلدية:</strong> {form.commune}</div>
                {deliveryType === 'home' && form.address_line && <div><strong>العنوان:</strong> {form.address_line}</div>}
                <div><strong>النوع:</strong> {deliveryType === 'home' ? '🏠 توصيل للمنزل' : '🏢 مكتب توقف'}</div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 10, color: '#374151', fontSize: '0.88rem' }}>🛒 تفاصيل الطلب</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'right', borderRadius: '6px 0 0 6px', color: '#374151' }}>المنتج</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', color: '#374151' }}>الكمية</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', borderRadius: '0 6px 6px 0', color: '#374151' }}>السعر</th>
                </tr>
              </thead>
              <tbody>
                {orderItems.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '8px 10px', color: '#1f2937', fontWeight: 600 }}>
                      {item.name}{item.variant_name ? ` (${item.variant_name})` : ''}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', color: '#6b7280' }}>×{item.quantity}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: '#059669' }}>
                      {new Intl.NumberFormat('ar-DZ').format(Math.round(item.price * item.quantity))} دج
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.9rem', color: '#6b7280' }}>
              <span>المجموع الفرعي</span>
              <span>{new Intl.NumberFormat('ar-DZ').format(Math.round(subTotal))} دج</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: '0.9rem', color: '#6b7280' }}>
              <span>رسوم التوصيل</span>
              <span>{new Intl.NumberFormat('ar-DZ').format(delivFee)} دج</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '2px solid #e5e7eb', fontWeight: 900, fontSize: '1.05rem', color: '#059669' }}>
              <span>الإجمالي الكلي</span>
              <span>{new Intl.NumberFormat('ar-DZ').format(Math.round(grandTotal))} دج</span>
            </div>
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', marginTop: 20, paddingTop: 16, borderTop: '2px dashed #e5e7eb', color: '#9ca3af', fontSize: '0.78rem' }}>
            <div>{new Date().toLocaleString('ar-DZ')}</div>
            <div style={{ marginTop: 4 }}>شكراً لتسوقكم من NumberOne 💚</div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 16, color: '#6b7280', fontSize: '0.82rem' }}>
          💡 احفظ هذه الفاتورة كصورة للرجوع إليها لاحقاً، أو ابحث عن طلبك في صفحة "طلباتي"
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.wilaya_code) { setError('يرجى اختيار الولاية.'); return; }
    if (!form.commune)     { setError('يرجى اختيار البلدية.'); return; }
    if (form.phone.length !== 10) { setError('رقم الهاتف يجب أن يتكون من 10 أرقام.'); return; }
    if (deliveryType === 'home' && !form.address_line) { setError('يرجى إدخال العنوان الكامل لتوصيل المنزل.'); return; }
    
    setLoading(true);
    setError('');

    const payload = {
      customer: {
        full_name:    form.full_name,
        phone:        form.phone,
        address_line: form.address_line ? form.address_line : `${selectedWilaya?.name} - ${form.commune} (مكتب توقف)`,
        postal_code:  form.postal_code,
        wilaya_code:  form.wilaya_code,
        wilaya:       selectedWilaya?.name,
        commune:      form.commune,
      },
      delivery_type: deliveryType,
      delivery_fee: deliveryPrice,
      items: items.map(i => ({
        product_id: i.product_id,
        variant_id: i.variant_id,
        quantity:   i.quantity,
      })),
    };

    try {
      const res = await ordersAPI.create(payload);
      const newOrderId = res.data.id;
      setOrderId(newOrderId);
      setOrderItems(items); // snapshot items before clearing cart
      clearCart();

      // Save order to localStorage for "My Orders" page
      try {
        const savedOrders = JSON.parse(localStorage.getItem('my_orders') || '[]');
        const entry = {
          id: newOrderId,
          phone: form.phone,
          date: new Date().toISOString(),
          total: total + (deliveryPrice ?? 0),
          wilaya: selectedWilaya?.name || '',
          commune: form.commune,
          delivery_type: deliveryType,
          delivery_fee: deliveryPrice ?? 0,
        };
        // Avoid duplicates
        const updated = [entry, ...savedOrders.filter(o => o.id !== newOrderId)].slice(0, 20);
        localStorage.setItem('my_orders', JSON.stringify(updated));
      } catch (_) {/* ignore localStorage errors */}

      setSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.message || 'حدث خطأ غير متوقع. يرجى المحاولة لاحقاً.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`container ${styles.checkoutContainer}`}>
      <h1 className={`${styles.pageTitle} reveal`}>إتمام الطلب</h1>

      <div className={styles.layout}>
        {/* ── Form ── */}
        <div className={`${styles.main} reveal`} style={{ transitionDelay: '0s' }}>
          <form onSubmit={handleSubmit} className={styles.card}>

            {/* Personal Info */}
            <h2 className={styles.sectionTitle}><MapPin size={20}/> بيانات العميل</h2>
            {/* Beautiful Arabic Error Banner */}
            {error && (
              <div className={styles.error} key={error}>
                <span className={styles.errorIcon}>⚠️</span>
                <div className={styles.errorText}>
                  <div className={styles.errorTitle}>تنبيه — لم يتم تأكيد الطلب</div>
                  {error}
                </div>
                <button className={styles.errorClose} onClick={() => setError('')} aria-label="إغلاق">✕</button>
              </div>
            )}

            <div className={styles.grid}>
              <div className={styles.field}>
                <label className={styles.label}>الاسم الكامل *</label>
                <input required className={styles.input} value={form.full_name}
                  onChange={e => setForm({...form, full_name: e.target.value})} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>رقم الهاتف *</label>
                <input required type="tel" className={styles.input} placeholder="0550123456"
                  value={form.phone} onChange={e => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setForm({...form, phone: val});
                  }} />
              </div>
            </div>

            {/* Location Section */}
            <div className={styles.locationSection}>
              <h2 className={styles.sectionTitle} style={{ marginBottom: 20 }}>
                <Truck size={20}/> بيانات التوصيل
              </h2>

              {/* Wilaya Selector */}
              <div className={styles.field}>
                <label className={styles.label}>الولاية *</label>
                <div className={styles.selectWrapper}>
                  <select
                    required
                    className={styles.select}
                    value={form.wilaya_code}
                    onChange={e => handleWilayaChange(e.target.value)}
                  >
                    <option value="">— اختر الولاية —</option>
                    {WILAYAS.map(w => (
                      <option key={w.code} value={w.code}>
                        {w.code} - {w.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={18} className={styles.selectIcon} />
                </div>
              </div>

              {/* Commune Selector */}
              {form.wilaya_code && (
                <div className={styles.field}>
                  <label className={styles.label}>البلدية *</label>
                  <div className={styles.selectWrapper}>
                    <select
                      required
                      className={styles.select}
                      value={form.commune}
                      onChange={e => setForm({...form, commune: e.target.value})}
                    >
                      <option value="">— اختر البلدية —</option>
                      {communes.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <ChevronDown size={18} className={styles.selectIcon} />
                  </div>
                </div>
              )}

              {/* Address detail */}
              <div className={`${styles.field} ${styles.full}`}>
                <label className={styles.label}>العنوان التفصيلي (الشارع، الحي)</label>
                <input className={styles.input} placeholder="مثال: شارع الاستقلال، حي النصر"
                  value={form.address_line}
                  onChange={e => setForm({...form, address_line: e.target.value})} />
              </div>

              {/* Delivery Type Selector */}
              {form.wilaya_code && (
                <div className={styles.deliveryTypeSection}>
                  <label className={styles.label}>نوع التوصيل *</label>
                  <div className={styles.deliveryTypeRow}>
                    <button
                      type="button"
                      className={`${styles.deliveryTypeBtn} ${deliveryType === 'home' ? styles.deliveryTypeBtnActive : ''}`}
                      onClick={() => setDeliveryType('home')}
                    >
                      <Home size={22} />
                      <span className={styles.dtLabel}>توصيل للمنزل</span>
                      {deliveryType === 'home' && <span className={styles.dtPrice}>{deliveryPrice} دج</span>}
                    </button>
                    <button
                      type="button"
                      className={`${styles.deliveryTypeBtn} ${deliveryType === 'desk' ? styles.deliveryTypeBtnActive : ''}`}
                      onClick={() => setDeliveryType('desk')}
                    >
                      <Building2 size={22} />
                      <span className={styles.dtLabel}>استلام من النقطة</span>
                      {deliveryType === 'desk' && <span className={styles.dtPrice}>{deliveryPrice} دج</span>}
                    </button>
                  </div>

                  {/* Delivery Price Banner */}
                  <div className={styles.deliveryBanner}>
                    <Truck size={20} />
                    <div>
                      <strong>سعر التوصيل إلى {selectedWilaya?.name}:</strong>
                      <span className={styles.deliveryBannerPrice}> {fmt(deliveryPrice)} دج</span>
                    </div>
                    <span className={styles.deliveryTierBadge}>
                      {deliveryType === 'home' ? 'توصيل للمنزل' : 'نقطة استلام'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Payment */}
            <div className={styles.paymentSection}>
              <h2 className={styles.sectionTitle}><Truck size={20}/> طريقة الدفع</h2>
              <div className={styles.paymentBox}>
                <input type="radio" checked readOnly />
                <strong>الدفع عند الاستلام (Cash on Delivery)</strong>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 12 }}>
                * حالياً الدفع متوفر فقط عند الاستلام.
              </p>
            </div>

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? 'جاري التنفيذ...' : `تأكيد الطلب — ${fmt(orderTotal)} دج`}
            </button>
          </form>
        </div>

        {/* ── Summary Sidebar ── */}
        <aside className={`${styles.sidebar} reveal`} style={{ transitionDelay: '0.15s' }}>
          <div className={styles.summaryCard}>
            <h3 className={styles.summaryTitle}>ملخص الطلب</h3>
            <div className={styles.itemsScroll}>
              {items.map(item => (
                <div key={item.key} className={styles.sItem}>
                  <div className={styles.sItemInfo}>
                    <div className={styles.sItemName}>{item.name}</div>
                    {item.variant_name && <div className={styles.sItemVar}>{item.variant_name}</div>}
                    <div className={styles.sItemQty}>الكمية: {item.quantity}</div>
                  </div>
                  <div className={styles.sItemPrice}>{fmt(item.price * item.quantity)} دج</div>
                </div>
              ))}
            </div>

            <div className={styles.totals}>
              <div className={styles.row}>
                <span>المجموع الفرعي</span>
                <span>{fmt(total)} دج</span>
              </div>
              <div className={styles.row}>
                <span>التوصيل</span>
                <span>
                  {deliveryPrice !== null
                    ? <strong style={{ color: 'var(--primary)' }}>{fmt(deliveryPrice)} دج</strong>
                    : <em style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>اختر الولاية</em>
                  }
                </span>
              </div>
              {form.wilaya_code && (
                <div className={styles.row} style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <span>{selectedWilaya?.name} — {deliveryType === 'home' ? 'منزل' : 'نقطة'}</span>
                </div>
              )}
              <div className={`${styles.row} ${styles.finalTotal}`}>
                <span>الإجمالي</span>
                <span className={styles.finalTotalAmt}>{fmt(orderTotal)} دج</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Checkout;
