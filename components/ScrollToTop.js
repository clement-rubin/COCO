import { useState, useEffect } from 'react';

/**
 * ScrollToTop - Bouton permettant à l'utilisateur de revenir en haut de la page
 * Apparaît uniquement après un défilement vers le bas
 */
export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  // Vérifier la position de défilement et afficher le bouton si nécessaire
  useEffect(() => {
    const checkScrollPosition = () => {
      // Afficher le bouton après avoir défilé de 300px
      if (!isVisible && window.scrollY > 300) {
        setIsVisible(true);
      } else if (isVisible && window.scrollY <= 300) {
        setIsVisible(false);
      }
    }

    // Ajouter l'écouteur d'événements
    window.addEventListener('scroll', checkScrollPosition);

    // Nettoyer l'écouteur
    return () => {
      window.removeEventListener('scroll', checkScrollPosition);
    };
  }, [isVisible]);

  // Fonction pour remonter en haut de page avec animation
  const scrollToTop = () => {
    // Ajout d'effet de retour haptique sur mobile si disponible
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
    
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  if (!isVisible) {
    return null;
  }

  return (
    <button
      onClick={scrollToTop}
      style={{
        position: 'fixed',
        bottom: '80px', // Au-dessus de la navigation mobile
        right: '20px',
        width: '45px',
        height: '45px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        boxShadow: '0 4px 15px rgba(255, 107, 53, 0.3)',
        cursor: 'pointer',
        opacity: 0.9,
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        zIndex: 99,
        fontSize: '1.2rem'
      }}
      aria-label="Remonter en haut de page"
      title="Remonter en haut de page"
      onMouseEnter={(e) => {
        e.target.style.transform = 'translateY(-5px)';
        e.target.style.boxShadow = '0 8px 25px rgba(255, 107, 53, 0.4)';
        e.target.style.opacity = 1;
      }}
      onMouseLeave={(e) => {
        e.target.style.transform = 'translateY(0)';
        e.target.style.boxShadow = '0 4px 15px rgba(255, 107, 53, 0.3)';
        e.target.style.opacity = 0.9;
      }}
    >
      ↑
    </button>
  );
}