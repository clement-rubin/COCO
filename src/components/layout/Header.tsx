import React from 'react';
import styles from '../../styles/Home.module.css';

export const Header: React.FC = () => {
  return (
    <header className={styles.header}>
      <div className={styles.headerContent}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>🥥</span>
          <span className={styles.logoText}>
            <h1>COCO</h1>
          </span>
        </div>
        <div className={styles.subtitle}>
          La communauté des passionnés de cuisine
        </div>
        <div className={styles.headerActions}>
          <a href="/login" className={styles.loginButton}>Connexion</a>
          <a href="/submit-recipe" className={styles.actionButton}>Partager une recette</a>
        </div>
      </div>
    </header>
  );
};
