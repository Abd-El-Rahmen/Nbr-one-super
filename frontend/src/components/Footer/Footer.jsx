import React from 'react';
import { Link } from 'react-router-dom';
import { Store, Phone, Mail, MapPin } from 'lucide-react';
import styles from './Footer.module.css';

const Footer = () => (
  <footer className={styles.footer}>
    <div className="container">
      <div className={styles.grid}>
        <div>
          <div className={styles.brand}>
            <Store size={22} />
            <span>Number One Supermarket</span>
          </div>
          <p className={styles.desc}>
            نوفر لكم أجود المنتجات الغذائية وغير الغذائية بأسعار تنافسية في جميع أنحاء الجزائر.
          </p>
        </div>
        <div>
          <h4 className={styles.colTitle}>روابط سريعة</h4>
          <ul className={styles.list}>
            <li><Link to="/" className={styles.flink}>الرئيسية</Link></li>
            <li><Link to="/shop" className={styles.flink}>المنتجات</Link></li>
            <li><Link to="/categories" className={styles.flink}>الأقسام</Link></li>
            <li><Link to="/contact" className={styles.flink}>تقديم شكوى</Link></li>
          </ul>
        </div>
        <div>
          <h4 className={styles.colTitle}>تواصل معنا</h4>
          <div className={styles.contact}>
            <div className={styles.citem}><Phone size={16}/> 0550 123 456</div>
            <div className={styles.citem}><Mail size={16}/> info@numberone.dz</div>
            <div className={styles.citem}><MapPin size={16}/> الجزائر العاصمة</div>
          </div>
        </div>
      </div>
      <div className={styles.bottom}>
        <p>© {new Date().getFullYear()} Number One Supermarket — جميع الحقوق محفوظة</p>
      </div>
    </div>
  </footer>
);

export default Footer;
