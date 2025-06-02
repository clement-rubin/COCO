import Link from 'next/link';

const Footer = () => {
  return (
    <footer style={{
      background: 'var(--background-card)',
      borderTop: '1px solid rgba(255, 107, 53, 0.1)',
      padding: 'var(--spacing-2xl) 0',
      marginTop: 'var(--spacing-2xl)'
    }}>
      <div className="container">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: 'var(--spacing-xl)',
          marginBottom: 'var(--spacing-xl)'
        }}>
          {/* Logo et description */}
          <div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 'var(--spacing-sm)',
              marginBottom: 'var(--spacing-md)'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                background: 'linear-gradient(135deg, var(--primary-orange) 0%, var(--primary-orange-dark) 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '1rem'
              }}>
                🍴
              </div>
              <h3 style={{ 
                margin: 0, 
                color: 'var(--primary-orange)',
                fontFamily: 'Playfair Display, serif'
              }}>
                COCO
              </h3>
            </div>
            <p style={{ 
              color: 'var(--text-medium)', 
              margin: 0,
              lineHeight: '1.6'
            }}>
              Partagez vos recettes favorites avec notre communauté de passionnés de cuisine.
            </p>
          </div>

          {/* Contact simplifié */}
          <div>
            <h4 style={{ 
              color: 'var(--text-dark)', 
              marginBottom: 'var(--spacing-md)',
              fontSize: '1.1rem'
            }}>
              Contact
            </h4>
            <div style={{ color: 'var(--text-medium)' }}>
              <p style={{ margin: '0 0 var(--spacing-sm) 0' }}>
                📧 contact@coco-cuisine.fr
              </p>
              <p style={{ margin: '0 0 var(--spacing-sm) 0' }}>
                📱 Suivez-nous sur les réseaux
              </p>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div style={{
          borderTop: '1px solid rgba(255, 107, 53, 0.1)',
          paddingTop: 'var(--spacing-lg)',
          textAlign: 'center',
          color: 'var(--text-light)',
          fontSize: '0.9rem'
        }}>
          <p style={{ margin: 0 }}>
            © 2023 COCO - Cuisine & Saveurs. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
