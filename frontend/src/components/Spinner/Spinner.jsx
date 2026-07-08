import React from 'react';
import styles from './Spinner.module.css';

const Spinner = ({ size = 'md', center = false }) => (
  <div className={center ? styles.center : ''}>
    <div className={`${styles.spinner} ${styles[size]}`}></div>
  </div>
);

export default Spinner;
