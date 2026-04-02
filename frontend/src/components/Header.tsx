import React from 'react';
import styles from '../pages/Page.module.css';

interface HeaderProps {
  subtitle?: string;
  right?: React.ReactNode;
}

export default function Header({ subtitle, right }: HeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.headerTopBar} />
      <div className={styles.headerInner}>
        <div className={styles.headerBrand}>
          <img
            src="https://www.mmbbs.de/wp-content/uploads/2025/06/MMBbS-Favicon-Website.png"
            alt="MMBbS Logo"
            className={styles.headerLogo}
          />
          <div className={styles.headerTitle}>
            <h1>Pro MMBbS Förderverein e.V.</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
        </div>
        {right && <div>{right}</div>}
      </div>
    </header>
  );
}
