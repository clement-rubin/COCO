import Head from 'next/head'
import { useState } from 'react'

export default function Home() {
  const [showAddRecipe, setShowAddRecipe] = useState(false);

  const handleAddRecipe = () => {
    alert('Fonctionnalité d\'ajout de recette - À venir prochainement !');
  };

  return (
    <div>
      <Head>
        <title>COCO - Cuisine & Saveurs</title>
        <meta name="description" content="Découvrez et partagez les meilleures recettes de cuisine" />
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
              <button 
                onClick={handleAddRecipe}
                className="btn btn-primary" 
                style={{ border: 'none', fontSize: '1.1rem' }}
              >
                ➕ Partager ma recette
              </button>
              <button 
                className="btn btn-secondary" 
                style={{ border: 'none', fontSize: '1.1rem' }}
                onClick={() => document.getElementById('recipes-section').scrollIntoView({ behavior: 'smooth' })}
              >
                🍽️ Découvrir les recettes
              </button>
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

      {/* Section recettes d'exemple */}
      <section id="recipes-section" style={{ 
        background: 'var(--background-secondary)', 
        padding: 'var(--spacing-2xl) 0' 
      }}>
        <div className="container">
          <h2 className="text-center mb-xl">Exemples de recettes</h2>
          
          <div className="grid grid-2">
            {/* Recipe Card Example 1 */}
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
              <button 
                className="btn btn-primary" 
                style={{ width: '100%', border: 'none' }}
                onClick={() => alert('Fonctionnalité à venir !')}
              >
                Voir la recette
              </button>
            </div>

            {/* Recipe Card Example 2 */}
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
              <button 
                className="btn btn-primary" 
                style={{ width: '100%', border: 'none' }}
                onClick={() => alert('Fonctionnalité à venir !')}
              >
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
          <button 
            onClick={handleAddRecipe}
            className="btn" 
            style={{ 
              background: 'white',
              color: 'var(--primary-orange)',
              fontWeight: '600',
              fontSize: '1.1rem',
              padding: 'var(--spacing-lg) var(--spacing-2xl)',
              border: 'none'
            }}
          >
            ➕ Ajouter ma première recette
          </button>
        </div>
      </section>

      {/* Floating Action Button */}
      <button 
        onClick={handleAddRecipe}
        className="fab" 
        style={{ border: 'none' }}
      >
        ➕
      </button>
    </div>
  );
}
