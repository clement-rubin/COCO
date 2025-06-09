import React from 'react';

export const Header = () => {
  return (
    <header className="mobile-header">
      <div className="header-content">
        <div className="app-logo">
          <span className="logo-emoji">🥥</span>
          <span className="logo-text">COCO</span>
        </div>
        <div className="status-bar">
          <div className="notification-dot notification-active"></div>
        </div>
      </div>
    </header>
  );
};
