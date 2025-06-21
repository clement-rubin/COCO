import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';

/**
 * SwipeNavigation - Composant permettant la navigation par gestes de swipe sur mobile
 * @param {Object} props - Propriétés du composant
 * @param {Array} props.routes - Routes disponibles pour la navigation, format: [{path: '/route', label: 'Label'}]
 * @param {String} props.currentPath - Chemin actuel
 */
export default function SwipeNavigation({ routes = [], currentPath }) {
  const router = useRouter();
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);
  const minSwipeDistance = 80; // Distance minimum pour considérer un swipe
  
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState(null); // 'left' ou 'right'
  
  // Trouver l'index de la route actuelle
  const currentIndex = routes.findIndex(route => route.path === currentPath);

  // Gérer le début du toucher
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  // Gérer le déplacement du toucher
  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  // Gérer la fin du toucher
  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;

    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    // Si nous sommes déjà en train d'animer, ne rien faire
    if (isAnimating) return;

    // Vérifier si un swipe valide a été détecté
    if (isLeftSwipe || isRightSwipe) {
      if (isLeftSwipe) {
        navigateToNextRoute(1); // 1 pour avancer
      } else {
        navigateToNextRoute(-1); // -1 pour reculer
      }
    }

    // Réinitialiser
    touchStartX.current = null;
    touchEndX.current = null;
  };

  // Naviguer vers la route suivante ou précédente
  const navigateToNextRoute = (step) => {
    // Si l'index actuel est invalide, ne rien faire
    if (currentIndex === -1) return;

    // Calculer le nouvel index
    const newIndex = currentIndex + step;
    
    // Vérifier que le nouvel index est valide
    if (newIndex >= 0 && newIndex < routes.length) {
      setIsAnimating(true);
      setDirection(step > 0 ? 'left' : 'right');
      
      // Retour haptique si disponible
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
      
      // Redirection avec délai pour l'animation
      setTimeout(() => {
        router.push(routes[newIndex].path);
        setTimeout(() => {
          setIsAnimating(false);
          setDirection(null);
        }, 500);
      }, 200);
    }
  };

  // Ajouter les écouteurs d'événements
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.addEventListener('touchstart', handleTouchStart, { passive: true });
      document.addEventListener('touchmove', handleTouchMove, { passive: true });
      document.addEventListener('touchend', handleTouchEnd);

      return () => {
        document.removeEventListener('touchstart', handleTouchStart);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [currentIndex, isAnimating]);

  // Aucun rendu visible, juste la logique de navigation
  return null;
}