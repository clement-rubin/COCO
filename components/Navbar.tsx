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

          {/* Desktop Navigation */}
          <div className="hidden-mobile" style={{ 
            display: 'flex', 
            gap: 'var(--spacing-lg)', 
            alignItems: 'center' 
          }}>
            <Link href="/" className="nav-link">
              Accueil
            </Link>
            <Link href="/favoris" className="nav-link">
              Amis
            </Link>
            <button className="btn btn-primary" style={{ border: 'none' }}>
              ➕ Ajouter une recette
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="visible-mobile"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: 'var(--spacing-sm)',
              borderRadius: 'var(--border-radius-small)',
              color: 'var(--primary-orange)'
            }}
          >
            {isMenuOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="visible-mobile" style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'var(--background-card)',
            boxShadow: 'var(--shadow-medium)',
            borderRadius: '0 0 var(--border-radius-large) var(--border-radius-large)',
            padding: 'var(--spacing-lg)',
            zIndex: 999
          }}>
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 'var(--spacing-md)' 
            }}>
              <Link href="/" className="mobile-nav-link">
                🏠 Accueil
              </Link>
              <Link href="/favoris" className="mobile-nav-link">
                👥 Mes amis
              </Link>
              <button className="mobile-nav-link" style={{ 
                border: 'none', 
                background: 'none', 
                textAlign: 'left',
                cursor: 'pointer'
              }}>
                ➕ Ajouter une recette
              </button>
            </div>
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
          font-family: 'Poppins', sans-serif;
        }

        .mobile-nav-link:hover {
          background: var(--warm-cream);
          color: var(--primary-orange);
        }
      `}</style>
    </nav>
  );
};

export default Navbar;
