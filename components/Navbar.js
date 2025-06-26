import Link from 'next/link'
import { useState } from 'react'

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  return (
    <nav style={{
      background: 'rgba(255,255,255,0.96)',
      borderBottom: '1.5px solid #f1f5f9',
      boxShadow: '0 2px 12px rgba(255,107,53,0.05), 0 1.5px 6px rgba(0,0,0,0.04)',
      position: 'sticky',
      top: 0,
      zIndex: 1200, // z-index augmenté pour être au-dessus de tout
      width: '100%',
      backdropFilter: 'blur(18px) saturate(160%)',
      backdropFilter: 'blur(18px) saturate(160%)'
    }}>
      <div style={{
        maxWidth: 430,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 18px',
        height: 64,
        position: 'relative'
      }}>
        {/* Logo */}
        <Link href="/" style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          textDecoration: 'none'
        }}>
          <div style={{
            width: 40,
            height: 40,
            background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)',
            borderRadius: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 700,
            fontSize: '1.3rem',
            boxShadow: '0 2px 8px #ff6b3533'
          }}>
            🍴
          </div>
          <h2 style={{
            margin: 0,
            color: '#ff6b35',
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontWeight: 800,
            fontSize: '1.25rem',
            letterSpacing: '-0.02em'
          }}>
            COCO
          </h2>
        </Link>

        {/* Desktop Navigation */}
        <div className="desktop-nav" style={{
          display: 'flex',
          gap: 18,
          alignItems: 'center'
        }}>
          <Link href="/" style={navLinkStyle}>Accueil</Link>
          <Link href="/competitions" style={navLinkStyle}>Compétitions</Link>
          <Link href="/amis" style={navLinkStyle}>Amis</Link>
          <Link href="/share-photo" style={addBtnStyle}>➕ Partager</Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Menu"
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            fontSize: 26,
            color: '#ff6b35',
            borderRadius: 12,
            padding: 8,
            cursor: 'pointer'
          }}
          className="mobile-menu-btn"
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div style={{
          background: 'rgba(255,255,255,0.98)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
          borderRadius: '0 0 18px 18px',
          padding: 18,
          position: 'absolute',
          top: 64,
          left: 0,
          right: 0,
          zIndex: 999
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}>
            <Link href="/" style={mobileNavLinkStyle}>🏠 Accueil</Link>
            <Link href="/competitions" style={mobileNavLinkStyle}>🏆 Compétitions</Link>
            <Link href="/amis" style={mobileNavLinkStyle}>👥 Amis</Link>
            <Link href="/share-photo" style={mobileNavLinkStyle}>➕ Partager une photo</Link>
          </div>
        </div>
      )}

      <style jsx>{`
        @media (max-width: 600px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: block !important; }
        }
        @media (min-width: 601px) {
          .mobile-menu-btn { display: none !important; }
        }
      `}</style>
    </nav>
  )
}

// Styles objets pour éviter la répétition
const navLinkStyle = {
  textDecoration: 'none',
  color: '#475569',
  fontWeight: 600,
  padding: '8px 14px',
  borderRadius: 10,
  fontSize: '1rem',
  transition: 'all 0.2s',
  background: 'none'
}
const addBtnStyle = {
  ...navLinkStyle,
  background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
  color: 'white',
  fontWeight: 700,
  boxShadow: '0 2px 8px #ff6b3533',
  border: 'none'
}
const mobileNavLinkStyle = {
  textDecoration: 'none',
  color: '#374151',
  fontWeight: 600,
  padding: '12px 0',
  borderRadius: 10,
  fontSize: '1.05rem',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  transition: 'background 0.2s, color 0.2s'
}
