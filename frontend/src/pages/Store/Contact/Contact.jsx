import React, { useState, useEffect } from 'react';
import { MessageSquare, AlertCircle, CheckCircle2 } from 'lucide-react';
import { complaintsAPI, messagesAPI } from '../../../api';
import styles from './Contact.module.css';

const Contact = () => {
  const [form, setForm] = useState({ name: '', phone: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await complaintsAPI.create({
        customer_name: form.name,
        phone: form.phone,
        message: form.message
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className={`container ${styles.contactContainer}`}>
        <div className={`${styles.successContainer} reveal`}>
          <CheckCircle2 size={90} className={styles.successIcon} />
          <h2 style={{ fontSize: '2.2rem', fontWeight: 900, marginBottom: 16 }}>تم الإرسال بنجاح!</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: 1.6 }}>فريق خدمة العملاء لدينا سيقوم بمراجعة رسالتك والرد عليك في أقرب وقت ممكن.</p>
          <button className={styles.btnPrimary} onClick={() => { setSuccess(false); setForm({ name: '', phone: '', message: '' }); }}>
            إرسال رسالة أخرى
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`container ${styles.contactContainer}`}>
      <div className={`${styles.wrapper} reveal`}>
        <div className={styles.header}>
          <h1 className={styles.title}>اتصل بنا</h1>
          <p className={styles.subtitle}>نحن هنا لمساعدتك والإجابة على أي استفسارات أو استقبال شكاويك.</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.grid}>
            <div className={styles.field}>
              <label className={styles.label}>الاسم الكامل</label>
              <input className={styles.input} required value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>رقم الهاتف</label>
              <input className={styles.input} type="tel" required value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>الرسالة *</label>
            <textarea className={styles.textarea} required rows={5} value={form.message} onChange={e => setForm({...form, message: e.target.value})} />
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'جاري الإرسال...' : 'إرسال الرسالة'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Contact;
