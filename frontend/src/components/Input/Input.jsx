import React from 'react';
import styles from './Input.module.css';

const Input = ({ label, icon: Icon, error, className = '', ...props }) => {
  return (
    <div className={`${styles.inputWrapper} ${className}`}>
      {label && <label className={styles.label}>{label}</label>}
      <div className={styles.inputContainer}>
        {Icon && <Icon size={20} className={styles.icon} />}
        <input className={styles.input} {...props} />
      </div>
      {error && <span className={styles.errorText}>{error}</span>}
    </div>
  );
};

export default Input;
