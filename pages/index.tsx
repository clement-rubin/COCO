import React from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const HomePage = () => {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      
      <main style={{ flex: 1 }}>
        {/* Hero Section */}
        <section style={{
          background: 'linear-gradient(135deg, var(--warm-cream) 0%, var(--primary-peach) 100%)',
          padding: 'var(--spacing-2xl) 0',
          textAlign: 'center'
        }}>
          <div className="container">
            <h1 style={{
              fontSize: 'clamp(2.5rem, 5vw, 4rem)',
              fontFamily: "'Playfair Display', serif",
              color: 'var(--primary-orange)',
              marginBottom: 'var(--spacing-lg)',
              fontWeight: '700'
            }}>
              🍴 Bienvenue chez COCO
            </h1>
            
            <p style={{
              fontSize: '1.25rem',
              color: 'var(--text-medium)',
              marginBottom: 'var(--spacing-xl)',
              maxWidth: '600px',
              margin: '0 auto var(--spacing-xl) auto',
              lineHeight: '1.6'
            }}>
              Découvrez, partagez et savourez les meilleures recettes de notre communauté passionnée de cuisine.
            </p>
            
            <div style={{
              display: 'flex',
              gap: 'var(--spacing-md)',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <Link href="/recipes" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                🍽️ Explorer les recettes
              </Link>
              <Link href="/add-recipe" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
                ➕ Partager ma recette
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section style={{
          padding: 'var(--spacing-2xl) 0',
          background: 'var(--background-light)'
        }}>
          <div className="container">
            <h2 style={{
              textAlign: 'center',
              color: 'var(--primary-orange)',
              marginBottom: 'var(--spacing-xl)',
              fontFamily: "'Playfair Display', serif"
            }}>
              Pourquoi choisir COCO ?
            </h2>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: 'var(--spacing-xl)',
              marginTop: 'var(--spacing-xl)'
            }}>
              <div className="feature-card">
                <div className="feature-icon">🔍</div>
                <h3>Recherche intelligente</h3>
                <p>Trouvez la recette parfaite selon vos ingrédients, vos goûts et votre temps disponible.</p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">👥</div>
                <h3>Communauté bienveillante</h3>
                <p>Partagez vos créations et découvrez les secrets culinaires de nos chefs amateurs.</p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">📱</div>
                <h3>Interface moderne</h3>
                <p>Une expérience fluide et intuitive, parfaitement adaptée à tous vos appareils.</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section style={{
          padding: 'var(--spacing-2xl) 0',
          background: 'var(--primary-orange)',
          color: 'white',
          textAlign: 'center'
        }}>
          <div className="container">
            <h2 style={{
              marginBottom: 'var(--spacing-lg)',
              fontFamily: "'Playfair Display', serif"
            }}>
              Prêt à rejoindre l'aventure culinaire ?
            </h2>
            <Link 
              href="/signup" 
              className="btn"
              style={{ 
                background: 'white',
                color: 'var(--primary-orange)',
                textDecoration: 'none',
                fontWeight: '600'
              }}
            >
              Créer mon compte gratuitement
            </Link>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default HomePage;