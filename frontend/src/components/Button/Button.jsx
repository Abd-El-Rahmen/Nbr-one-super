import React from 'react';
import styles from './Button.module.css';

const Button = ({ children, variant = 'primary', size = 'medium', isIcon = false, className = '', ...props }) => {
  const baseClass = styles.button;
  const variantClass = styles[variant] || styles.primary;
  const iconClass = isIcon ? styles.icon : '';
  
  return (
    <button 
      className={`${baseClass} ${variantClass} ${iconClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
