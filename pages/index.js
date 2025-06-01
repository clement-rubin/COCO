import Head from 'next/head'
import Link from 'next/link'
import styles from '../styles/Home.module.css'

export default function Home() {
  return (
    <div>
      <Head>
        <title>COCO - Cuisine & Saveurs</title>
        <meta name="description" content="Découvrez les meilleures recettes de cuisine" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Hero Section */}
      <section style={{
        background: 'linear-gradient(135deg, var(--warm-cream) 0%, var(--warm-beige) 100%)',
        padding: 'var(--spacing-2xl) 0',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center'
      }}>
        <div className="container">
          <div className="fade-in-up">
            <div style={{
              fontSize: '4rem',
              marginBottom: 'var(--spacing-lg)',
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
            }}>🍴</div>
            
            <h1 style={{ 
              marginBottom: 'var(--spacing-lg)',
              background: 'linear-gradient(135deg, var(--primary-orange) 0%, var(--primary-orange-dark) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              COCO - Partagez vos recettes
            </h1>
            
            <p style={{ 
              fontSize: '1.3rem', 
              marginBottom: 'var(--spacing-xl)',
              maxWidth: '700px',
              margin: '0 auto var(--spacing-xl) auto',
              color: 'var(--text-medium)',
              lineHeight: '1.6'
            }}>
              Rejoignez notre communauté de passionnés de cuisine et partagez vos créations culinaires avec le monde entier.
            </p>
            
            <div style={{ 
              display: 'flex', 
              gap: 'var(--spacing-lg)', 
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginBottom: 'var(--spacing-xl)'
            }}>
              <Link href="/submit-recipe" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                ➕ Partager ma recette
              </Link>
              <Link href="/user-recipes" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
                🍽️ Découvrir les recettes
              </Link>
            </div>
            
            {/* Stats de la communauté */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: 'var(--spacing-lg)',
              maxWidth: '600px',
              margin: '0 auto',
              marginTop: 'var(--spacing-2xl)'
            }}>
              <div style={{
                background: 'rgba(255,255,255,0.8)',
                padding: 'var(--spacing-lg)',
                borderRadius: 'var(--border-radius-large)',
                backdropFilter: 'blur(10px)'
              }}>
                <div style={{ fontSize: '2rem', color: 'var(--primary-orange)' }}>🍽️</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-dark)' }}>Recettes</div>
                <div style={{ color: 'var(--text-medium)' }}>Partagées</div>
              </div>
              <div style={{
                background: 'rgba(255,255,255,0.8)',
                padding: 'var(--spacing-lg)',
                borderRadius: 'var(--border-radius-large)',
                backdropFilter: 'blur(10px)'
              }}>
                <div style={{ fontSize: '2rem', color: 'var(--secondary-green)' }}>👨‍🍳</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-dark)' }}>Chefs</div>
                <div style={{ color: 'var(--text-medium)' }}>Passionnés</div>
              </div>
              <div style={{
                background: 'rgba(255,255,255,0.8)',
                padding: 'var(--spacing-lg)',
                borderRadius: 'var(--border-radius-large)',
                backdropFilter: 'blur(10px)'
              }}>
                <div style={{ fontSize: '2rem', color: 'var(--primary-orange)' }}>❤️</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-dark)' }}>Saveurs</div>
                <div style={{ color: 'var(--text-medium)' }}>Authentiques</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div style={{
          position: 'absolute',
          top: '15%',
          right: '5%',
          fontSize: '3rem',
          opacity: 0.1,
          transform: 'rotate(15deg)',
          display: 'none'
        }} className="hidden-mobile">🥘</div>
        <div style={{
          position: 'absolute',
          bottom: '15%',
          left: '5%',
          fontSize: '2.5rem',
          opacity: 0.1,
          transform: 'rotate(-15deg)',
          display: 'none'
        }} className="hidden-mobile">🍳</div>
      </section>

      {/* Comment ça marche */}
      <section style={{ padding: 'var(--spacing-2xl) 0' }}>
        <div className="container">
          <h2 className="text-center mb-xl">Comment ça marche ?</h2>
          <div className="grid grid-3">
            <div className="card text-center fade-in-up">
              <div style={{ 
                fontSize: '4rem', 
                marginBottom: 'var(--spacing-lg)',
                color: 'var(--primary-orange)'
              }}>📝</div>
              <h3>1. Créez</h3>
              <p>Ajoutez votre recette avec des photos, ingrédients et instructions détaillées</p>
            </div>
            <div className="card text-center fade-in-up">
              <div style={{ 
                fontSize: '4rem', 
                marginBottom: 'var(--spacing-lg)',
                color: 'var(--secondary-green)'
              }}>🌍</div>
              <h3>2. Partagez</h3>
              <p>Votre recette devient immédiatement visible par toute la communauté</p>
            </div>
            <div className="card text-center fade-in-up">
              <div style={{ 
                fontSize: '4rem', 
                marginBottom: 'var(--spacing-lg)',
                color: 'var(--primary-orange)'
              }}>👨‍🍳</div>
              <h3>3. Inspirez</h3>
              <p>Aidez d'autres passionnés à découvrir de nouvelles saveurs</p>
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
          <div style={{ fontSize: '3rem', marginBottom: 'var(--spacing-lg)' }}>🚀</div>
          <h2 style={{ color: 'white', marginBottom: 'var(--spacing-lg)' }}>
            Prêt à partager votre passion ?
          </h2>
          <p style={{ 
            fontSize: '1.2rem', 
            marginBottom: 'var(--spacing-xl)',
            opacity: 0.9,
            maxWidth: '600px',
            margin: '0 auto var(--spacing-xl) auto'
          }}>
            Rejoignez des milliers de passionnés de cuisine qui partagent déjà leurs recettes favorites
          </p>
          <Link 
            href="/submit-recipe" 
            className="btn" 
            style={{ 
              background: 'white',
              color: 'var(--primary-orange)',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '1.1rem',
              padding: 'var(--spacing-lg) var(--spacing-2xl)'
            }}
          >
            ➕ Ajouter ma première recette
          </Link>
        </div>
      </section>

      {/* Floating Action Button */}
      <Link href="/submit-recipe" className="fab" style={{ textDecoration: 'none' }}>
        ➕
      </Link>
    </div>
  );
}
