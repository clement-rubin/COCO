// ...existing imports...

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
            <Link href="/user-recipes" className="nav-link">
              🍽️ Recettes
            </Link>
            <Link href="/submit-recipe" className="btn btn-primary" style={{ textDecoration: 'none' }}>
              ➕ Partager
            </Link>
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
              <Link href="/user-recipes" className="mobile-nav-link">
                🍽️ Découvrir les recettes
              </Link>
              <Link href="/submit-recipe" className="mobile-nav-link">
                ➕ Partager ma recette
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ...existing styles... */}
    </nav>
  );
};

export default Navbar;
