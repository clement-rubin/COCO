import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Footer from '../components/Footer';
import QuickCommentModal from '../components/QuickCommentModal';
import NotificationCenter from '../components/NotificationCenter';
import { useAuth } from '../components/AuthContext';

const HomePage = () => {
  const { user } = useAuth();
  const [showQuickComment, setShowQuickComment] = useState(false);
  const [featuredRecipe, setFeaturedRecipe] = useState(null);
  const [showFloatingButton, setShowFloatingButton] = useState(false);

  // Show floating button after user scrolls
  useEffect(() => {
    const handleScroll = () => {
      setShowFloatingButton(window.scrollY > 200);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Mock featured recipe - replace with real data
  useEffect(() => {
    setFeaturedRecipe({
      id: 'featured-recipe-1',
      title: 'Délicieux Couscous aux Légumes',
      image: '/placeholder-recipe.jpg',
      user_id: 'chef-123'
    });
  }, []);

  const handleQuickCommentAdded = (comment) => {
    console.log('Nouveau commentaire ajouté:', comment);
    // Here you could update the UI, show a notification, etc.
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header avec centre de notifications */}
      <header style={{
        position: 'sticky',
        top: 0,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(226, 232, 240, 0.6)',
        padding: '12px 0',
        zIndex: 100
      }}>
        <div className="container" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 20px'
        }}>
          {/* Logo */}
          <Link href="/" style={{
            fontSize: '1.8rem',
            fontWeight: '800',
            color: '#ff6b35',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            🍴 COCO
          </Link>

          {/* Navigation et centre de notifications */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px'
          }}>
            {/* Navigation rapide */}
            <nav style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center'
            }}>
              <Link href="/collections" style={{
                padding: '8px 16px',
                borderRadius: '20px',
                background: 'rgba(59, 130, 246, 0.1)',
                color: '#3b82f6',
                textDecoration: 'none',
                fontSize: '0.9rem',
                fontWeight: '600',
                transition: 'all 0.2s ease'
              }}>
                📚 Collections
              </Link>
              
              {user && (
                <Link href="/submit-recipe" style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  background: 'rgba(251, 146, 60, 0.1)',
                  color: '#fb923c',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  transition: 'all 0.2s ease'
                }}>
                  ➕ Créer
                </Link>
              )}
            </nav>

            {/* Section utilisateur avec notifications */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              {/* Centre de notifications (seulement si connecté) */}
              {user && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <NotificationCenter />
                </div>
              )}

              {/* Bouton connexion/profil */}
              {user ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 12px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  borderRadius: '20px',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  color: '#10b981'
                }}>
                  <span>👤</span>
                  <span>{user.user_metadata?.display_name || 'Mon Profil'}</span>
                </div>
              ) : (
                <Link href="/login" style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  color: 'white',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                }}>
                  🔐 Connexion
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>
      
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
            
            {/* Quick Comment CTA - Version améliorée avec intégration notifications */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.9)',
              borderRadius: '20px',
              padding: '24px',
              margin: '32px auto',
              maxWidth: '500px',
              border: '2px solid rgba(251, 146, 60, 0.2)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
            }}>
              <h3 style={{
                color: '#1e293b',
                marginBottom: '12px',
                fontSize: '1.3rem',
                fontWeight: '700'
              }}>
                💬 Envie de partager votre avis ?
              </h3>
              <p style={{
                color: '#64748b',
                marginBottom: '20px',
                lineHeight: '1.6'
              }}>
                Rejoignez notre communauté et soyez notifié des réactions !
              </p>
              
              {/* Aperçu des notifications pour non-connectés */}
              {!user && (
                <div style={{
                  background: 'rgba(59, 130, 246, 0.1)',
                  borderRadius: '12px',
                  padding: '12px',
                  marginBottom: '16px',
                  fontSize: '0.9rem',
                  color: '#3b82f6'
                }}>
                  🔔 Recevez des notifications pour vos likes et commentaires !
                </div>
              )}
              
              <button
                onClick={() => setShowQuickComment(true)}
                style={{
                  background: 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '16px',
                  padding: '16px 32px',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(251, 146, 60, 0.3)',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  margin: '0 auto'
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 24px rgba(251, 146, 60, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 16px rgba(251, 146, 60, 0.3)';
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>✨</span>
                {user ? 'Commenter rapidement' : 'Se connecter et commenter'}
              </button>
            </div>
            
            {/* ...existing content... */}
            
          </div>
        </section>

        {/* ...existing sections... */}

      </main>

      {/* Floating Quick Comment Button - Version avec intégration notifications */}
      {showFloatingButton && (
        <div style={{ 
          position: 'fixed', 
          bottom: '32px', 
          right: '32px', 
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '12px'
        }}>
          {/* Mini centre de notifications flottant pour mobile */}
          {user && (
            <div style={{
              display: window.innerWidth <= 768 ? 'block' : 'none'
            }}>
              <NotificationCenter />
            </div>
          )}
          
          {/* Bouton principal */}
          <button
            onClick={() => setShowQuickComment(true)}
            style={{
              width: '64px',
              height: '64px',
              background: 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)',
              border: 'none',
              borderRadius: '50%',
              color: 'white',
              fontSize: '1.5rem',
              cursor: 'pointer',
              boxShadow: '0 8px 32px rgba(251, 146, 60, 0.4)',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'pulse 2s infinite'
            }}
            onMouseOver={(e) => {
              e.target.style.transform = 'scale(1.1)';
              e.target.style.boxShadow = '0 12px 40px rgba(251, 146, 60, 0.5)';
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'scale(1)';
              e.target.style.boxShadow = '0 8px 32px rgba(251, 146, 60, 0.4)';
            }}
            title="Commentaire rapide"
            aria-label="Ouvrir le commentaire rapide"
          >
            💬
          </button>
        </div>
      )}

      {/* Quick Comment Modal */}
      <QuickCommentModal
        isOpen={showQuickComment}
        onClose={() => setShowQuickComment(false)}
        recipe={featuredRecipe}
        onCommentAdded={handleQuickCommentAdded}
      />
      
      <Footer />

      <style jsx>{`
        @keyframes pulse {
          0% {
            box-shadow: 0 8px 32px rgba(251, 146, 60, 0.4), 0 0 0 0 rgba(251, 146, 60, 0.7);
          }
          70% {
            box-shadow: 0 8px 32px rgba(251, 146, 60, 0.4), 0 0 0 10px rgba(251, 146, 60, 0);
          }
          100% {
            box-shadow: 0 8px 32px rgba(251, 146, 60, 0.4), 0 0 0 0 rgba(251, 146, 60, 0);
          }
        }

        @media (max-width: 768px) {
          header div {
            padding: 0 16px !important;
          }
          
          nav {
            display: none !important;
          }
          
          button[title="Commentaire rapide"] {
            bottom: 80px !important;
            right: 20px !important;
            width: 56px !important;
            height: 56px !important;
            font-size: 1.3rem !important;
          }
        }
      `}</style>
    </div>
  );
};

export default HomePage;
