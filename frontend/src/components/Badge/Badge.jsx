import React from 'react';
import styles from './Badge.module.css';

const Badge = ({ children, variant = 'neutral', className = '' }) => {
  const variantClass = styles[variant] || styles.neutral;
  
  return (
    <span className={`${styles.badge} ${variantClass} ${className}`}>
      {children}
    </span>
  );
};

export default Badge;
