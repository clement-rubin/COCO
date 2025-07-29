import React, { useState } from 'react';
import Link from 'next/link';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="nav">
      <div className="container">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: 'var(--spacing-md) 0',
          minHeight: '64px'
        }}>
          {/* Logo */}
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 'var(--spacing-sm)' 
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: 'linear-gradient(135deg, var(--primary-orange) 0%, var(--primary-orange-dark) 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '1.2rem'
              }}>
                🍴
              </div>
              <h2 style={{ 
                margin: 0, 
                color: 'var(--primary-orange)',
                fontSize: '1.5rem',
                fontFamily: 'Playfair Display, serif'
              }}>
                COCO
              </h2>
            </div>
          </Link>

          {/* ...existing navigation sections... */}

        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="visible-mobile" style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            left: 'auto',
            width: 260,
            background: 'rgba(255,255,255,0.98)',
            boxShadow: '0 8px 32px rgba(245,158,11,0.18), 0 2px 8px rgba(0,0,0,0.08)',
            borderRadius: '24px',
            padding: '28px 20px 18px 20px',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            alignItems: 'stretch',
            animation: 'mobileMenuPop 0.25s'
          }}>
            <button
              onClick={() => setIsMenuOpen(false)}
              style={{
                position: 'absolute',
                top: 10,
                right: 14,
                background: 'none',
                border: 'none',
                fontSize: 22,
                color: '#f59e0b',
                cursor: 'pointer',
                fontWeight: 700
              }}
              aria-label="Fermer le menu"
            >✕</button>
            <Link href="/recipes" className="mobile-nav-link" style={{
              background: 'linear-gradient(90deg,#fef3c7,#fffbe6)',
              color: '#ff6b35',
              fontWeight: 700,
              border: 'none',
              borderRadius: 14,
              padding: '14px 0',
              textAlign: 'center',
              fontSize: '1.1rem',
              marginBottom: 2,
              boxShadow: '0 2px 8px #f59e0b11'
            }}>
              🍽️ Recettes
            </Link>
            <Link href="/add-recipe" className="mobile-nav-link" style={{
              background: 'linear-gradient(90deg,#fbbf24,#f59e0b)',
              color: 'white',
              fontWeight: 700,
              border: 'none',
              borderRadius: 14,
              padding: '14px 0',
              textAlign: 'center',
              fontSize: '1.1rem',
              marginBottom: 2,
              boxShadow: '0 2px 8px #f59e0b22'
            }}>
              ➕ Ajouter une recette
            </Link>
            <Link href="/amis" className="mobile-nav-link" style={{
              background: 'linear-gradient(90deg,#ecfdf5,#d1fae5)',
              color: '#10b981',
              fontWeight: 700,
              border: 'none',
              borderRadius: 14,
              padding: '14px 0',
              textAlign: 'center',
              fontSize: '1.1rem',
              marginBottom: 2,
              boxShadow: '0 2px 8px #10b98111'
            }}>
              👥 Mes amis
            </Link>
            <Link href="/profile" className="mobile-nav-link" style={{
              background: 'linear-gradient(90deg,#f3e8ff,#ede9fe)',
              color: '#8b5cf6',
              fontWeight: 700,
              border: 'none',
              borderRadius: 14,
              padding: '14px 0',
              textAlign: 'center',
              fontSize: '1.1rem',
              marginBottom: 2,
              boxShadow: '0 2px 8px #8b5cf611'
            }}>
              👤 Mon profil
            </Link>
          </div>
        )}
      </div>

      <style jsx>{`
        .nav-link {
          text-decoration: none;
          color: var(--text-medium);
          font-weight: 500;
          padding: var(--spacing-sm) var(--spacing-md);
          border-radius: var(--border-radius-small);
          transition: all 0.3s ease;
        }

        .nav-link:hover {
          color: var(--primary-orange);
          background: rgba(255, 107, 53, 0.1);
        }

        .mobile-nav-link {
          text-decoration: none;
          color: var(--text-dark);
          font-weight: 500;
          padding: var(--spacing-md);
          border-radius: var(--border-radius-medium);
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          font-size: 1.1rem;
        }

        .mobile-nav-link:hover {
          background: var(--warm-cream);
          color: var(--primary-orange);
        }

        @keyframes mobileMenuPop {
          0% { opacity: 0; transform: scale(0.95) translateY(30px);}
          100% { opacity: 1; transform: scale(1) translateY(0);}
        }
      `}</style>
    </nav>
  );
};

export default Navbar;
