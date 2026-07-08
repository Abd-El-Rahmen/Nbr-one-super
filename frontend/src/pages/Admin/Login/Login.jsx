import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Store, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import styles from './Login.module.css';

const Login = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (user) return <Navigate to="/admin/dashboard" replace />;

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.message || 'بيانات الدخول غير صحيحة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.iconBox}>
          <Store size={28} />
        </div>
        <h1 className={styles.title}>تسجيل دخول المشرف</h1>
        <p className={styles.sub}>أدخل بياناتك للوصول إلى لوحة التحكم</p>

        {error && <div className={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>البريد الإلكتروني</label>
            <div className={styles.inputBox}>
              <Mail size={17} className={styles.inputIcon} />
              <input
                type="email" name="email" required
                placeholder="admin@example.com"
                value={form.email} onChange={handleChange}
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>كلمة المرور</label>
            <div className={styles.inputBox}>
              <Lock size={17} className={styles.inputIcon} />
              <input
                type={showPw ? 'text' : 'password'} name="password" required
                placeholder="••••••••"
                value={form.password} onChange={handleChange}
                className={styles.input}
              />
              <button type="button" className={styles.eyeBtn} onClick={() => setShowPw(v => !v)}>
                {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          <button type="submit" className={styles.submit} disabled={loading}>
            {loading ? 'جارٍ الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
