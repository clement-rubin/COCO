import Link from 'next/link';

export default function Home() {
  return (
    <div>
      {/* Hero Section */}
      <section style={{
        background: 'linear-gradient(135deg, var(--warm-cream) 0%, var(--warm-beige) 100%)',
        padding: 'var(--spacing-2xl) 0',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div className="container">
          <div className="fade-in-up">
            <h1 style={{ 
              marginBottom: 'var(--spacing-lg)',
              background: 'linear-gradient(135deg, var(--primary-orange) 0%, var(--primary-orange-dark) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Partagez vos recettes favorites
            </h1>
            <p style={{ 
              fontSize: '1.2rem', 
              marginBottom: 'var(--spacing-xl)',
              maxWidth: '600px',
              margin: '0 auto var(--spacing-xl) auto',
              color: 'var(--text-medium)'
            }}>
              Découvrez, partagez et savourez des recettes délicieuses avec notre communauté de passionnés de cuisine.
            </p>
            <div style={{ 
              display: 'flex', 
              gap: 'var(--spacing-md)', 
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <Link href="/progression" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                🏆 Voir ma progression
              </Link>
              <Link href="/add-recipe" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
                ➕ Ajouter ma recette
              </Link>
            </div>
          </div>
        </div>
        
        {/* ...existing decorative elements... */}
        <div style={{
          position: 'absolute',
          top: '20%',
          right: '10%',
          fontSize: '4rem',
          opacity: 0.1,
          transform: 'rotate(15deg)'
        }}>🥘</div>
        <div style={{
          position: 'absolute',
          bottom: '20%',
          left: '5%',
          fontSize: '3rem',
          opacity: 0.1,
          transform: 'rotate(-15deg)'
        }}>🍳</div>
      </section>

      {/* ...existing sections... */}
      <section style={{ padding: 'var(--spacing-2xl) 0' }}>
        <div className="container">
          <h2 className="text-center mb-xl">Pourquoi choisir COCO ?</h2>
          <div className="grid grid-3">
            <div className="card text-center fade-in-up">
              <div style={{ 
                fontSize: '3rem', 
                marginBottom: 'var(--spacing-md)',
                color: 'var(--primary-orange)'
              }}>📱</div>
              <h3>Mobile-First</h3>
              <p>Interface optimisée pour mobile, cuisinez avec votre téléphone en main</p>
            </div>
            {/* ...existing cards... */}
          </div>
        </div>
      </section>

      {/* ...existing sections... */}

      {/* Floating Action Button */}
      <Link href="/add-recipe" className="fab" style={{ textDecoration: 'none' }}>
        ➕
      </Link>
    </div>
  );
}
