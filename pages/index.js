import Head from 'next/head'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import FriendsFeed from '../components/FriendsFeed'

export default function Home() {
  const [showAddRecipe, setShowAddRecipe] = useState(false);
  const router = useRouter();

  const handleAddRecipe = () => {
    router.push('/submit-recipe');
  };

  return (
    <div>
      <Head>
        <title>COCO - Cuisine & Saveurs</title>
        <meta name="description" content="Découvrez et partagez les meilleures recettes de cuisine" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Hero Section Mobile */}
      <section style={{
        background: 'var(--bg-gradient)',
        padding: 'var(--spacing-xl) var(--spacing-md)',
        textAlign: 'center',
        borderRadius: '0 0 var(--radius-xl) var(--radius-xl)',
        margin: '0 0 var(--spacing-lg) 0'
      }}>
        <div className="fade-in-up">
          <div style={{
            fontSize: '3.5rem',
            marginBottom: 'var(--spacing-md)',
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
          }}>🥥</div>
          
          <h1 style={{ 
            marginBottom: 'var(--spacing-md)',
            background: 'linear-gradient(135deg, var(--primary-coral) 0%, var(--secondary-mint-dark) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontSize: '2.2rem'
          }}>
            COCO
          </h1>
          
          <p style={{ 
            fontSize: '1rem', 
            marginBottom: 'var(--spacing-lg)',
            color: 'var(--text-secondary)',
            lineHeight: '1.5'
          }}>
            Partagez vos recettes favorites avec une communauté passionnée
          </p>
          
          {/* Stats Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 'var(--spacing-sm)',
            marginTop: 'var(--spacing-xl)'
          }}>
            <div className="card" style={{ padding: 'var(--spacing-md)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: 'var(--spacing-xs)' }}>🍽️</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--primary-coral)' }}>2.4k</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>Recettes</div>
            </div>
            <div className="card" style={{ padding: 'var(--spacing-md)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: 'var(--spacing-xs)' }}>👨‍🍳</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--secondary-mint)' }}>850</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>Chefs</div>
            </div>
            <div className="card" style={{ padding: 'var(--spacing-md)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: 'var(--spacing-xs)' }}>❤️</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--primary-coral)' }}>12k</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>Likes</div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section style={{ padding: '0 var(--spacing-md) var(--spacing-md)' }}>
        <h2 style={{ fontSize: '1.3rem', marginBottom: 'var(--spacing-md)' }}>Actions rapides</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--spacing-md)' }}>
          <button 
            onClick={handleAddRecipe}
            className="card" 
            style={{ 
              border: 'none', 
              cursor: 'pointer',
              background: 'linear-gradient(135deg, var(--primary-coral) 0%, var(--primary-coral-dark) 100%)',
              color: 'white',
              padding: 'var(--spacing-lg)'
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: 'var(--spacing-sm)' }}>➕</div>
            <div style={{ fontWeight: '600' }}>Ajouter recette</div>
          </button>
          
          <Link 
            href="/explorer"
            className="card" 
            style={{ 
              border: 'none', 
              cursor: 'pointer',
              background: 'linear-gradient(135deg, var(--secondary-mint) 0%, var(--secondary-mint-dark) 100%)',
              color: 'white',
              padding: 'var(--spacing-lg)',
              textDecoration: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: 'var(--spacing-sm)' }}>🔍</div>
            <div style={{ fontWeight: '600' }}>Explorer</div>
          </Link>
        </div>
      </section>

      {/* Friends Feed Section */}
      <section style={{ padding: '0 var(--spacing-md) var(--spacing-xl)' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: 'var(--spacing-lg)'
        }}>
          <h2 style={{ fontSize: '1.3rem', margin: 0 }}>👥 Mes amis cuisinent</h2>
          <Link href="/social" style={{ 
            background: 'none', 
            border: 'none', 
            color: 'var(--primary-coral)', 
            fontWeight: '600',
            cursor: 'pointer',
            textDecoration: 'none'
          }}>
            Voir tout
          </Link>
        </div>
        
        <FriendsFeed />
      </section>

      {/* Trending Recipes */}
      <section style={{ padding: '0 var(--spacing-md) var(--spacing-xl)' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: 'var(--spacing-lg)'
        }}>
          <h2 style={{ fontSize: '1.3rem', margin: 0 }}>Tendances</h2>
          <Link href="/explorer" style={{ 
            background: 'none', 
            border: 'none', 
            color: 'var(--primary-coral)', 
            fontWeight: '600',
            cursor: 'pointer',
            textDecoration: 'none'
          }}>
            Voir tout
          </Link>
        </div>
        
        <div style={{ display: 'flex', gap: 'var(--spacing-md)', overflowX: 'auto', paddingBottom: 'var(--spacing-sm)' }}>
          {/* Recipe Card 1 */}
          <div className="card" style={{ minWidth: '280px', padding: 0 }}>
            <div style={{
              width: '100%',
              height: '150px',
              background: 'linear-gradient(45deg, var(--primary-coral-light), var(--accent-yellow))',
              borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '3rem'
            }}>🍝</div>
            <div style={{ padding: 'var(--spacing-md)' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: 'var(--spacing-xs)' }}>Pâtes Carbonara</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-sm)' }}>
                Authentique et crémeuse
              </p>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                fontSize: '0.7rem'
              }}>
                <span style={{ 
                  background: 'var(--primary-coral-light)', 
                  padding: 'var(--spacing-xs) var(--spacing-sm)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--primary-coral)'
                }}>⏱️ 20 min</span>
                <span style={{ color: 'var(--text-light)' }}>⭐ 4.8</span>
              </div>
            </div>
          </div>

          {/* Recipe Card 2 */}
          <div className="card" style={{ minWidth: '280px', padding: 0 }}>
            <div style={{
              width: '100%',
              height: '150px',
              background: 'linear-gradient(45deg, var(--secondary-mint-light), var(--accent-purple))',
              borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '3rem'
            }}>🥗</div>
            <div style={{ padding: 'var(--spacing-md)' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: 'var(--spacing-xs)' }}>Salade César</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-sm)' }}>
                Fraîche et croquante
              </p>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                fontSize: '0.7rem'
              }}>
                <span style={{ 
                  background: 'var(--secondary-mint-light)', 
                  padding: 'var(--spacing-xs) var(--spacing-sm)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--secondary-mint)'
                }}>⏱️ 15 min</span>
                <span style={{ color: 'var(--text-light)' }}>⭐ 4.6</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section style={{ padding: '0 var(--spacing-md) var(--spacing-xl)' }}>
        <h2 style={{ fontSize: '1.3rem', marginBottom: 'var(--spacing-lg)' }}>Catégories</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--spacing-sm)' }}>
          {/*
            { emoji: '🍝', name: 'Pâtes' },
            { emoji: '🥗', name: 'Salades' },
            { emoji: '🍰', name: 'Desserts' },
            { emoji: '🍲', name: 'Soupes' }
          */}
          { [
            { emoji: '🍝', name: 'Pâtes' },
            { emoji: '🥗', name: 'Salades' },
            { emoji: '🍰', name: 'Desserts' },
            { emoji: '🍲', name: 'Soupes' }
          ].map((category, index) => (
            <button key={index} className="card" style={{ 
              border: 'none', 
              cursor: 'pointer',
              padding: 'var(--spacing-md)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: 'var(--spacing-xs)' }}>
                {category.emoji}
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: '500' }}>
                {category.name}
              </div>
            </button>
          )) }
        </div>
      </section>
    </div>
  );
}
