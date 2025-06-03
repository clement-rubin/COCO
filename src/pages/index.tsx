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
              <Link href="/recipes" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                🍽️ Explorer les recettes
              </Link>
              <Link href="/add-recipe" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
                ➕ Ajouter ma recette
              </Link>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
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

      {/* Features Section */}
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
            <div className="card text-center fade-in-up">
              <div style={{ 
                fontSize: '3rem', 
                marginBottom: 'var(--spacing-md)',
                color: 'var(--secondary-green)'
              }}>👥</div>
              <h3>Communauté</h3>
              <p>Partagez vos créations et découvrez les recettes de la communauté</p>
            </div>
            <div className="card text-center fade-in-up">
              <div style={{ 
                fontSize: '3rem', 
                marginBottom: 'var(--spacing-md)',
                color: 'var(--primary-orange)'
              }}>⭐</div>
              <h3>Favoris</h3>
              <p>Sauvegardez vos recettes préférées pour les retrouver facilement</p>
            </div>
            <div className="card text-center fade-in-up">
              <div style={{ 
                fontSize: '3rem', 
                marginBottom: 'var(--spacing-md)',
                color: 'var(--accent-purple)'
              }}>🔍</div>
              <h3>Découverte</h3>
              <p>Explorez de nouvelles saveurs avec notre système de recommandations intelligentes</p>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Recipes Preview */}
      <section style={{ 
        background: 'var(--background-secondary)', 
        padding: 'var(--spacing-2xl) 0' 
      }}>
        <div className="container">
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: 'var(--spacing-xl)',
            flexWrap: 'wrap',
            gap: 'var(--spacing-md)'
          }}>
            <h2 style={{ margin: 0 }}>Recettes populaires</h2>
            <Link href="/recipes" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
              Voir toutes
            </Link>
          </div>
          
          <div className="grid grid-2">
            {/* Recipe Card Example */}
            <div className="card fade-in-up">
              <div style={{
                width: '100%',
                height: '200px',
                background: 'linear-gradient(45deg, var(--primary-orange-light), var(--secondary-green-light))',
                borderRadius: 'var(--border-radius-medium)',
                marginBottom: 'var(--spacing-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '4rem'
              }}>🍝</div>
              <h3 style={{ marginBottom: 'var(--spacing-sm)' }}>Pâtes à la carbonara</h3>
              <p style={{ marginBottom: 'var(--spacing-md)' }}>Une recette authentique et crémeuse qui ravira toute la famille</p>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: 'var(--spacing-md)'
              }}>
                <span style={{ 
                  background: 'var(--warm-cream)', 
                  padding: 'var(--spacing-xs) var(--spacing-sm)',
                  borderRadius: 'var(--border-radius-small)',
                  fontSize: '0.9rem',
                  color: 'var(--primary-orange)',
                  fontWeight: '500'
                }}>⏱️ 20 min</span>
                <span style={{ 
                  color: 'var(--text-light)',
                  fontSize: '0.9rem'
                }}>⭐ 4.8 (24 avis)</span>
              </div>
              <button className="btn btn-primary" style={{ width: '100%' }}>
                Voir la recette
              </button>
            </div>

            <div className="card fade-in-up">
              <div style={{
                width: '100%',
                height: '200px',
                background: 'linear-gradient(45deg, var(--secondary-green-light), var(--primary-orange-light))',
                borderRadius: 'var(--border-radius-medium)',
                marginBottom: 'var(--spacing-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '4rem'
              }}>🥗</div>
              <h3 style={{ marginBottom: 'var(--spacing-sm)' }}>Salade César</h3>
              <p style={{ marginBottom: 'var(--spacing-md)' }}>Fraîche et croquante, parfaite pour un déjeuner léger</p>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: 'var(--spacing-md)'
              }}>
                <span style={{ 
                  background: 'var(--warm-cream)', 
                  padding: 'var(--spacing-xs) var(--spacing-sm)',
                  borderRadius: 'var(--border-radius-small)',
                  fontSize: '0.9rem',
                  color: 'var(--primary-orange)',
                  fontWeight: '500'
                }}>⏱️ 15 min</span>
                <span style={{ 
                  color: 'var(--text-light)',
                  fontSize: '0.9rem'
                }}>⭐ 4.6 (18 avis)</span>
              </div>
              <button className="btn btn-primary" style={{ width: '100%' }}>
                Voir la recette
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{ 
        background: 'linear-gradient(135deg, var(--primary-orange) 0%, var(--primary-orange-dark) 100%)',
        padding: 'var(--spacing-2xl) 0',
        color: 'white',
        textAlign: 'center'
      }}>
        <div className="container">
          <h2 style={{ color: 'white', marginBottom: 'var(--spacing-lg)' }}>
            Prêt à partager vos recettes ?
          </h2>
          <p style={{ 
            fontSize: '1.2rem', 
            marginBottom: 'var(--spacing-xl)',
            opacity: 0.9
          }}>
            Rejoignez notre communauté de chefs passionnés dès aujourd'hui
          </p>
          <Link 
            href="/add-recipe" 
            className="btn" 
            style={{ 
              background: 'white',
              color: 'var(--primary-orange)',
              textDecoration: 'none',
              fontWeight: '600'
            }}
          >
            🚀 Commencer maintenant
          </Link>
        </div>
      </section>

      {/* Floating Action Button */}
      <Link href="/add-recipe" className="fab" style={{ textDecoration: 'none' }}>
        ➕
      </Link>
    </div>
  );
}
