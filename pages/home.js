import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Footer from '../components/Footer';
import QuickCommentModal from '../components/QuickCommentModal';

const HomePage = () => {
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
            
            {/* Quick Comment CTA */}
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
                Rejoignez notre communauté de passionnés de cuisine !
              </p>
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
                Commenter rapidement
              </button>
            </div>
            
            {/* ...existing content... */}
            
          </div>
        </section>

        {/* ...existing sections... */}

      </main>

      {/* Floating Quick Comment Button */}
      {showFloatingButton && (
        <button
          onClick={() => setShowQuickComment(true)}
          style={{
            position: 'fixed',
            bottom: '32px',
            right: '32px',
            width: '64px',
            height: '64px',
            background: 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)',
            border: 'none',
            borderRadius: '50%',
            color: 'white',
            fontSize: '1.5rem',
            cursor: 'pointer',
            boxShadow: '0 8px 32px rgba(251, 146, 60, 0.4)',
            zIndex: 1000,
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

        @media (max-width: 640px) {
          button[title="Commentaire rapide"] {
            bottom: 20px !important;
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
