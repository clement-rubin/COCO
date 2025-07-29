import Head from 'next/head'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../components/AuthContext'
import { useRouter } from 'next/router'
import { logUserInteraction, logComponentEvent, logInfo } from '../utils/logger'
import AddictiveFeed from '../components/AddictiveFeed'
import RecipeOfWeek from '../components/RecipeOfWeek'
import NotificationCenter from '../components/NotificationCenter'
import styles from '../styles/Layout.module.css'

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isScrolled, setIsScrolled] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)
  const [feedType, setFeedType] = useState('all')
  const [feedStats, setFeedStats] = useState({
    totalRecipes: 0,
    totalLikes: 0,
    totalComments: 0,
    activeChefs: 0
  })
  const heroRef = useRef(null)

  // Détection du scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY
      setIsScrolled(scrollPosition > 50)
      
      // Masquer le message de bienvenue en scrollant
      if (scrollPosition > 100) {
        setShowWelcome(false)
      }
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Auto-masquer le message de bienvenue après 5 secondes
  useEffect(() => {
    if (user && showWelcome) {
      const timer = setTimeout(() => setShowWelcome(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [user, showWelcome])

  // Check for welcome message
  useEffect(() => {
    if (user && !showWelcome && typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const hasSeenWelcome = localStorage.getItem(`welcome_${user.id}`)
      if (!hasSeenWelcome) {
        setShowWelcome(true)
        localStorage.setItem(`welcome_${user.id}`, 'true')
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
          setShowWelcome(false)
        }, 5000)
      }
    }
  }, [user, showWelcome])

  // Rediriger vers la page de présentation si non connecté
  useEffect(() => {
    if (!loading && !user) {
      // Montrer un aperçu pendant 3 secondes avant de rediriger
      const timer = setTimeout(() => {
        router.push('/presentation')
      }, 3000) // Augmenter à 3 secondes pour mieux voir l'aperçu

      return () => clearTimeout(timer)
    }
  }, [user, loading, router])

  // Récupérer les statistiques du feed
  useEffect(() => {
    const fetchFeedStats = async () => {
      try {
        const timestamp = Date.now()
        const response = await fetch(`/api/recipes?limit=20&_t=${timestamp}`)
        
        if (response.ok) {
          const recipesData = await response.json()
          
          if (recipesData && recipesData.length > 0) {
            const { getMultipleRecipesEngagementStats } = await import('../utils/likesUtils')
            const recipeIds = recipesData.map(r => r.id)
            const engagementStats = await getMultipleRecipesEngagementStats(recipeIds)
            
            const totalLikes = Object.values(engagementStats.data || {}).reduce((sum, stats) => sum + (stats?.likes_count || 0), 0)
            const totalComments = Object.values(engagementStats.data || {}).reduce((sum, stats) => sum + (stats?.comments_count || 0), 0)
            const activeChefs = new Set(recipesData.map(r => r.user_id)).size
            
            setFeedStats({
              totalRecipes: recipesData.length,
              totalLikes,
              totalComments,
              activeChefs
            })
          }
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error)
      }
    }

    if (user) {
      fetchFeedStats()
    }
  }, [user])

  // Accès discret aux logs (seulement pour les développeurs/admins)
  const [secretClickCount, setSecretClickCount] = useState(0)
  const [showSecretMenu, setShowSecretMenu] = useState(false)

  const handleLogoClick = () => {
    setSecretClickCount(prev => prev + 1)
    
    // Accès après 7 clics sur le logo
    if (secretClickCount >= 6) {
      setShowSecretMenu(true)
      setTimeout(() => setShowSecretMenu(false), 5000)
      setSecretClickCount(0)
    }
  }

  const hasAdminAccess = user && (
    user.email === 'admin@coco.com' || 
    user.user_metadata?.role === 'admin' ||
    user.user_metadata?.role === 'developer' ||
    user.email?.includes('clement.rubin')
  )

  // Afficher un écran de chargement pendant la vérification
  if (loading) {
    return (
      <div className={styles.container}>
        <main className={styles.main}>
          <div className={styles.loading}>
            {/* Animation de chargement sophistiquée AMÉLIORÉE */}
            <div style={{
              position: 'relative',
              width: '120px',
              height: '120px',
              marginBottom: '30px'
            }}>
              {/* Cercles animés concentriques avec effets améliorés */}
              <div style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                border: '4px solid transparent',
                borderTop: '4px solid #ff6b35',
                borderRight: '4px solid rgba(255, 107, 53, 0.3)',
                borderRadius: '50%',
                animation: 'sophisticatedSpin 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite',
                boxShadow: '0 0 30px rgba(255, 107, 53, 0.3)'
              }} />
              <div style={{
                position: 'absolute',
                width: '75%',
                height: '75%',
                top: '12.5%',
                left: '12.5%',
                border: '3px solid transparent',
                borderRight: '3px solid #f7931e',
                borderBottom: '3px solid rgba(247, 147, 30, 0.3)',
                borderRadius: '50%',
                animation: 'sophisticatedSpin 2s cubic-bezier(0.4, 0, 0.2, 1) infinite reverse',
                boxShadow: '0 0 20px rgba(247, 147, 30, 0.2)'
              }} />
              <div style={{
                position: 'absolute',
                width: '50%',
                height: '50%',
                top: '25%',
                left: '25%',
                border: '2px solid transparent',
                borderBottom: '2px solid #4caf50',
                borderLeft: '2px solid rgba(76, 175, 80, 0.3)',
                borderRadius: '50%',
                animation: 'sophisticatedSpin 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite',
                boxShadow: '0 0 15px rgba(76, 175, 80, 0.2)'
              }} />
              
              {/* Centre avec icône animée AMÉLIORÉE */}
              <div style={{
                position: 'absolute',
                width: '35%',
                height: '35%',
                top: '32.5%',
                left: '32.5%',
                background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'pulseGlow 2.5s ease-in-out infinite',
                boxShadow: '0 0 25px rgba(255, 107, 53, 0.5)',
                border: '2px solid rgba(255, 255, 255, 0.3)'
              }}>
                {/* Logo COCO miniature */}
                <div style={{
                  width: '16px',
                  height: '16px',
                  background: 'white',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  animation: 'innerPulse 1.5s ease-in-out infinite alternate',
                  fontSize: '8px'
                }}>
                  🥥
                </div>
              </div>

              {/* Particules flottantes autour du loader */}
              {[...Array(6)].map((_, i) => (
                <div key={i} style={{
                  position: 'absolute',
                  width: '6px',
                  height: '6px',
                  background: `hsl(${25 + i * 30}, 80%, 60%)`,
                  borderRadius: '50%',
                  top: `${15 + Math.sin(i * Math.PI / 3) * 40}%`,
                  left: `${15 + Math.cos(i * Math.PI / 3) * 40}%`,
                  animation: `floatingParticle 3s ease-in-out infinite`,
                  animationDelay: `${i * 0.5}s`,
                  opacity: 0.7,
                  boxShadow: '0 2px 8px rgba(255, 107, 53, 0.3)'
                }} />
              ))}
            </div>
            
            {/* Texte avec animation de points AMÉLIORÉE */}
            <div style={{ textAlign: 'center' }}>
              <p style={{ 
                color: '#374151', 
                fontSize: '1.2rem', 
                fontWeight: '700',
                margin: '0 0 12px 0',
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
              }}>
                Initialisation de COCO
                <span style={{ 
                  display: 'inline-block',
                  width: '30px',
                  textAlign: 'left',
                  animation: 'loadingDots 2s infinite',
                  color: '#ff6b35'
                }}>...</span>
              </p>
              
              {/* Messages rotatifs */}
              <div style={{
                height: '20px',
                overflow: 'hidden',
                marginBottom: '16px'
              }}>
                {[
                  '🔗 Connexion à la communauté culinaire',
                  '📊 Synchronisation des données en temps réel',
                  '🍽️ Préparation de votre feed personnalisé',
                  '👥 Vérification des nouvelles recettes d\'amis'
                ].map((message, i) => (
                  <p key={i} style={{
                    color: '#6b7280',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    margin: 0,
                    animation: `messageRotate 8s infinite`,
                    animationDelay: `${i * 2}s`,
                    opacity: 0,
                    lineHeight: '20px'
                  }}>
                    {message}
                  </p>
                ))}
              </div>
              
              {/* Barre de progression élégante */}
              <div style={{
                width: '200px',
                height: '4px',
                background: 'rgba(255, 107, 53, 0.2)',
                borderRadius: '10px',
                margin: '0 auto 16px',
                overflow: 'hidden',
                position: 'relative'
              }}>
                <div style={{
                  width: '40%',
                  height: '100%',
                  background: 'linear-gradient(90deg, #ff6b35, #f7931e, #ff6b35)',
                  backgroundSize: '200% 100%',
                  borderRadius: '10px',
                  animation: 'progressSlide 2s ease-in-out infinite',
                  boxShadow: '0 0 10px rgba(255, 107, 53, 0.5)'
                }} />
              </div>
              
              {/* Indicateurs de statut */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '12px'
              }}>
                {[0, 1, 2, 3].map(i => (
                  <div key={i} style={{
                    width: '8px',
                    height: '8px',
                    background: '#ff6b35',
                    borderRadius: '50%',
                    animation: `waveDots 2s ease-in-out infinite`,
                    animationDelay: `${i * 0.3}s`,
                    boxShadow: '0 2px 4px rgba(255, 107, 53, 0.3)'
                  }} />
                ))}
              </div>
            </div>
          </div>
        </main>
        
        <style jsx>{`
          @keyframes floatingParticle {
            0%, 100% { 
              transform: translateY(0px) scale(1);
              opacity: 0.7;
            }
            50% { 
              transform: translateY(-15px) scale(1.2);
              opacity: 1;
            }
          }

          @keyframes messageRotate {
            0%, 20% { 
              opacity: 1; 
              transform: translateY(0);
            }
            25%, 100% { 
              opacity: 0; 
              transform: translateY(-20px);
            }
          }

          @keyframes progressSlide {
            0% { 
              transform: translateX(-100%);
              background-position: 0% 50%;
            }
            50% { 
              transform: translateX(150%);
              background-position: 100% 50%;
            }
            100% { 
              transform: translateX(300%);
              background-position: 200% 50%;
            }
          }

          @keyframes heroLogo {
            0%, 100% { 
              transform: translateY(0px) rotate(0deg) scale(1);
            }
            50% { 
              transform: translateY(-8px) rotate(2deg) scale(1.05);
            }
          }
          
          @keyframes shine {
            0%, 100% { 
              opacity: 0.4;
              transform: scale(1) rotate(0deg);
            }
            50% { 
              opacity: 0.7;
              transform: scale(1.1) rotate(90deg);
            }
          }
          
          @keyframes expandLine {
            0%, 100% { 
              transform: scaleX(0);
              opacity: 0;
            }
            50% { 
              transform: scaleX(1);
              opacity: 1;
            }
          }
          
          @keyframes bounceDown {
            0%, 20%, 50%, 80%, 100% {
              transform: translateY(0);
            }
            40% {
              transform: translateY(-8px);
            }
            60% {
              transform: translateY(-4px);
            }
          }
          
          @keyframes float {
            0%, 100% { 
              transform: translateY(0px) rotate(0deg) scale(1);
            }
            33% { 
              transform: translateY(-20px) rotate(120deg) scale(1.1);
            }
            66% { 
              transform: translateY(-10px) rotate(240deg) scale(0.9);
            }
          }
          
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          @keyframes bounce {
            0%, 20%, 50%, 80%, 100% {
              transform: translateY(0);
            }
            40% {
              transform: translateY(-6px);
            }
            60% {
              transform: translateY(-3px);
            }
          }
          
          @keyframes pulse {
            0%, 100% { 
              transform: scale(1);
              opacity: 1;
            }
            50% { 
              transform: scale(1.1);
              opacity: 0.8;
            }
          }
          
          /* Animations pour les notifications intégrées */
          @keyframes notificationSlide {
            from {
              opacity: 0;
              transform: translateY(-20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          /* Effet de survol pour les éléments interactifs */
          .notification-trigger:hover {
            transform: scale(1.05);
            filter: brightness(1.1);
          }
          
          @keyframes welcomeSlide {
            from {
              opacity: 0;
              transform: translate(-50%, -20px);
            }
            to {
              opacity: 1;
              transform: translate(-50%, 0);
            }
          }
          
          @keyframes sophisticatedSpin {
            0% { 
              transform: rotate(0deg) scale(1);
              opacity: 1;
            }
            50% { 
              transform: rotate(180deg) scale(1.1);
              opacity: 0.8;
            }
            100% { 
              transform: rotate(360deg) scale(1);
              opacity: 1;
            }
          }
          
          @keyframes pulseGlow {
            0%, 100% { 
              transform: scale(1);
              box-shadow: 0 0 20px rgba(255, 107, 53, 0.4);
            }
            50% { 
              transform: scale(1.1);
              box-shadow: 0 0 30px rgba(255, 107, 53, 0.6), 0 0 40px rgba(255, 107, 53, 0.3);
            }
          }
          
          @keyframes innerPulse {
            0% { 
              transform: scale(1);
              opacity: 1;
            }
            100% { 
              transform: scale(1.3);
              opacity: 0.7;
            }
          }
          
          @keyframes loadingDots {
            0% { content: ''; }
            25% { content: '.'; }
            50% { content: '..'; }
            75% { content: '...'; }
            100% { content: ''; }
          }
          
          @keyframes waveDots {
            0%, 40%, 100% { 
              transform: translateY(0) scale(1);
              opacity: 0.5;
            }
            20% { 
              transform: translateY(-8px) scale(1.2);
              opacity: 1;
            }
          }
          
          @keyframes logoRotate {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          @keyframes checkmark {
            0%, 50% { opacity: 0; transform: scale(0.5); }
            60% { opacity: 1; transform: scale(1.1); }
            100% { opacity: 1; transform: scale(1); }
          }
          
          @keyframes floatingParticles {
            0%, 100% { 
              transform: translateY(0px) translateX(0px) scale(1);
              opacity: 0.8;
            }
            33% { 
              transform: translateY(-15px) translateX(10px) scale(1.2);
              opacity: 1;
            }
            66% { 
              transform: translateY(-8px) translateX(-5px) scale(0.8);
              opacity: 0.6;
            }
          }
          
          @keyframes advancedShine {
            0%, 100% { 
              opacity: 0.6;
              transform: rotate(0deg) scale(1);
            }
            50% { 
              opacity: 1;
              transform: rotate(180deg) scale(1.3);
            }
          }
          
          @keyframes cameraShutter {
            0%, 90%, 100% { transform: scale(1); }
            5%, 15% { transform: scale(0.95); }
            10% { transform: scale(0.9); }
          }
          
          @keyframes lensFocus {
            0%, 100% { transform: translate(-50%, -50%) scale(1); }
            50% { transform: translate(-50%, -50%) scale(1.2); }
          }
          
          @keyframes bookOpen {
            0%, 100% { transform: scaleX(1); }
            50% { transform: scaleX(1.1); }
          }
          
          @keyframes recipeIcon {
            0%, 100% { transform: rotate(0deg) scale(1); }
            50% { transform: rotate(180deg) scale(1.1); }
          }
          
          @keyframes chefIcon {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-3px); }
          }
          
          @keyframes collectionIcon {
            0%, 100% { transform: rotateY(0deg); }
            50% { transform: rotateY(15deg); }
          }

          @keyframes heartBeat {
            0%, 100% { 
              transform: scale(1);
            }
            50% { 
              transform: scale(1.15);
            }
          }
          
          @keyframes commentBubble {
            0%, 100% { 
              transform: translateY(0) rotate(0deg);
            }
            25% { 
              transform: translateY(-3px) rotate(2deg);
            }
            75% { 
              transform: translateY(-1px) rotate(-1deg);
            }
          }
          
          /* Effet de survol pour les cartes de statistiques */
          .stat-card-bg:hover {
            opacity: 1 !important;
          }
          
          /* Responsive pour les nouvelles statistiques */
          @media (max-width: 768px) {
            div[style*="gap: '20px'"] {
              gap: 12px !important;
            }
            
            div[style*="minWidth: '140px'"] {
              min-width: 120px !important;
              padding: 12px 16px !important;
            }
          }
          
          @media (max-width: 480px) {
            div[style*="minWidth: '140px'"] {
              min-width: 100px !important;
              padding: 10px 12px !important;
            }
            
            div[style*="fontSize: '1.6rem'"] {
              font-size: 1.4rem !important;
            }
            
            div[style*="fontSize: '2rem'"] {
              font-size: 1.8rem !important;
            }
          }
          
          /* États de focus pour l'accessibilité */
          button:focus {
            outline: 2px solid rgba(59, 130, 246, 0.5);
            outline-offset: 2px;
          }
          
          /* Responsive amélioré pour header sans espaces */
          @media (max-width: 400px) {
            h1 {
              fontSize: 2.4rem !important;
            }
            h2 {
              fontSize: 1.1rem !important;
            }
            div[style*="maxWidth: 400"] {
              padding: 20px 16px 0 !important; /* Ajuster pour mobile */
            }
          }
          
          @media (max-width: 360px) {
            h1 {
              fontSize: 2.2rem !important;
            }
            div[style*="width: 80px"] {
              width: 70px !important;
              height: 70px !important;
              fontSize: 2.2rem !important;
            }
          }
          
          /* Suppression des espacements sur très petits écrans */
          @media (max-width: 320px) {
            div[style*="padding: 24px 20px 0"] {
              padding: 16px 12px 0 !important; /* Ajuster le padding responsive */
            }
          }
        `}</style>
      </div>
    )
  }

  // Afficher un aperçu pour les utilisateurs non connectés
  if (!user) {
    return (
      <div className={styles.container}>
        <Head>
          <title>COCO - Aperçu de la communauté culinaire</title>
          <meta name="description" content="Découvrez COCO, la communauté pour partager et découvrir des recettes" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <main className={styles.main}>
          <div className={styles.content} style={{ maxWidth: 400, margin: '0 auto', textAlign: 'center' }}>
            {/* Logo et titre */}
            <div style={{
              background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
              width: '80px',
              height: '80px',
              borderRadius: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.5rem',
              margin: '0 auto 24px',
              boxShadow: '0 12px 30px rgba(255, 107, 53, 0.3)',
              animation: 'gentleBounce 3s ease-in-out infinite'
            }}>
              🥥
            </div>

            <h1 style={{
              fontSize: '2.5rem',
              fontWeight: '800',
              margin: '0 0 16px 0',
              background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              COCO
            </h1>

            <p style={{
              fontSize: '1.2rem',
              color: '#6b7280',
              margin: '0 0 32px 0',
              lineHeight: '1.5'
            }}>
              La communauté culinaire qui vous inspire
            </p>

            {/* Aperçu des fonctionnalités */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '16px',
              marginBottom: '32px'
            }}>
              {[
                { icon: '📸', text: 'Partagez vos recettes' },
                { icon: '🔍', text: 'Découvrez de nouvelles saveurs' },
                { icon: '👥', text: 'Connectez-vous avec des passionnés' },
                { icon: '🏆', text: 'Participez à des défis' }
              ].map((feature, index) => (
                <div
                  key={index}
                  style={{
                    background: 'rgba(255, 255, 255, 0.8)',
                    padding: '20px 16px',
                    borderRadius: '16px',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 107, 53, 0.1)',
                    transition: 'all 0.3s ease',
                    animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`
                  }}
                >
                  <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>
                    {feature.icon}
                  </div>
                  <p style={{
                    fontSize: '0.9rem',
                    color: '#374151',
                    margin: 0,
                    fontWeight: '500'
                  }}>
                    {feature.text}
                  </p>
                </div>
              ))}
            </div>

            {/* Message de redirection */}
            <div style={{
              background: 'rgba(255, 107, 53, 0.1)',
              border: '1px solid rgba(255, 107, 53, 0.2)',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '24px'
            }}>
              <p style={{
                margin: '0 0 12px 0',
                color: '#ff6b35',
                fontWeight: '600',
                fontSize: '1rem'
              }}>
                ✨ Découvrez tout ce que COCO peut vous offrir
              </p>
              <p style={{
                margin: 0,
                color: '#9ca3af',
                fontSize: '0.9rem'
              }}>
                Redirection en cours vers la présentation complète...
              </p>
            </div>

            {/* Actions rapides */}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={() => router.push('/presentation')}
                style={{
                  background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 15px rgba(255, 107, 53, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)'
                  e.target.style.boxShadow = '0 6px 20px rgba(255, 107, 53, 0.4)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)'
                  e.target.style.boxShadow = '0 4px 15px rgba(255, 107, 53, 0.3)'
                }}
              >
                En savoir plus
              </button>
              <button
                onClick={() => router.push('/signup')}
                style={{
                  background: 'transparent',
                  color: '#ff6b35',
                  border: '2px solid #ff6b35',
                  padding: '12px 24px',
                  borderRadius: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#ff6b35'
                  e.target.style.color = 'white'
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent'
                  e.target.style.color = '#ff6b35'
                }}
              >
                Rejoindre
              </button>
            </div>
          </div>
        </main>
        <style jsx>{`
          @keyframes gentleBounce {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-8px); }
          }
          
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>COCO - Cuisine, Découverte, Partage</title>
        <meta name="description" content="Découvrez des recettes inspirantes et partagez vos créations culinaires" />
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>
      
      {/* Centre de notifications - Positionné de manière fixe */}
      {user && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 1000,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderRadius: '50px',
          padding: '8px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <NotificationCenter />
        </div>
      )}
      
      <main className={styles.main}>
        {/* Message de bienvenue */}
        {user && showWelcome && (
          <div style={{
            position: 'fixed',
            top: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, #4caf50, #45a049)',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '12px',
            fontSize: '0.9rem',
            fontWeight: '600',
            zIndex: 999,
            maxWidth: '350px',
            textAlign: 'center',
            boxShadow: '0 8px 25px rgba(76, 175, 80, 0.3)',
            animation: 'welcomeSlide 0.5s ease',
            cursor: 'pointer'
          }}
          onClick={() => setShowWelcome(false)}
          >
            <span style={{ marginRight: '8px' }}>🎉</span>
            Bon retour {user.user_metadata?.display_name?.split(' ')[0] || 'Chef'} !
            <span style={{ marginLeft: '8px', fontSize: '0.7rem', opacity: 0.8 }}>
              (Cliquez pour masquer)
            </span>
          </div>
        )}

        {/* Section Hero intégrée - VERSION OPTIMISÉE */}
        <div style={{
          background: 'linear-gradient(135deg, #fef3e2 0%, #fff5e6 50%, #fef7ed 100%)',
          position: 'relative',
          overflow: 'hidden',
          paddingTop: '64px',
          paddingBottom: '40px',
          marginBottom: '0',
          marginTop: '-64px',
          minHeight: '60vh' // Réduction de la hauteur
        }}>
          {/* Éléments décoratifs de fond - VERSION ALLÉGÉE */}
          <div style={{
            position: 'absolute',
            top: '-30px',
            right: '-30px',
            width: '120px', // Réduction de la taille
            height: '120px',
            background: 'linear-gradient(45deg, #ff6b35, #f7931e)',
            borderRadius: '50%',
            opacity: 0.06,
            animation: 'float 6s ease-in-out infinite'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '-40px',
            right: '10%',
            width: '80px', // Réduction de la taille
            height: '80px',
            background: 'linear-gradient(45deg, #ff6b35, #f7931e)',
            borderRadius: '50%',
            opacity: 0.04,
            animation: 'float 10s ease-in-out infinite'
          }} />

          <div className={styles.content} style={{ 
            maxWidth: 380, // Réduction de la largeur max
            margin: '0 auto', 
            textAlign: 'center',
            position: 'relative',
            zIndex: 1,
            padding: '20px 20px 0' // Réduction du padding
          }}>
            {/* Logo animé - VERSION COMPACTE */}
            <div style={{
              width: '70px', // Réduction de la taille
              height: '70px', 
              background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
              borderRadius: '20px', // Réduction du border-radius
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.2rem', // Réduction de la taille de police
              margin: '0 auto 16px', // Réduction de la marge
              boxShadow: '0 8px 25px rgba(255, 107, 53, 0.25)', // Réduction de l'ombre
              animation: 'heroLogo 3s ease-in-out infinite',
              border: '2px solid rgba(255, 255, 255, 0.9)', // Réduction de l'épaisseur
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Icône SVG personnalisée remplaçant l'emoji */}
              <div style={{
                width: '35px', // Réduction proportionnelle
                height: '35px',
                background: 'white',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'logoRotate 4s linear infinite'
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" 
                    fill="#ff6b35" 
                    style={{ animation: 'checkmark 2s ease-in-out infinite' }} />
                </svg>
              </div>
              
              {/* Particules flottantes réduites */}
              {[...Array(2)].map((_, i) => (
                <div key={i} style={{
                  position: 'absolute',
                  width: '3px', // Réduction
                  height: '3px',
                  background: 'rgba(255, 255, 255, 0.8)',
                  borderRadius: '50%',
                  animation: `floatingParticles 3s ease-in-out infinite`,
                  animationDelay: `${i * 0.7}s`,
                  top: `${25 + i * 25}%`,
                  left: `${20 + i * 30}%`
                }} />
              ))}
              
              {/* Effet de brillance réduit */}
              <div style={{
                position: 'absolute',
                top: '15%',
                left: '20%',
                width: '30%', // Réduction
                height: '30%',
                background: 'linear-gradient(45deg, rgba(255, 255, 255, 0.5) 0%, transparent 50%)',
                borderRadius: '50%',
                filter: 'blur(4px)', // Réduction du blur
                animation: 'advancedShine 3s ease-in-out infinite'
              }} />
            </div>

            {/* Titre principal - VERSION COMPACTE */}
            <h1 style={{
              fontSize: '2.4rem', // Réduction
              fontWeight: '900',
              margin: '0 0 10px 0', // Réduction des marges
              background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 50%, #ff8a50 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-0.03em',
              lineHeight: '1',
              textShadow: '0 2px 10px rgba(255, 107, 53, 0.1)'
            }}>
              COCO
            </h1>

            {/* Sous-titre - VERSION COMPACTE */}
            <div style={{
              marginBottom: '20px' // Réduction
            }}>
              <h2 style={{
                fontSize: '1.1rem', // Réduction
                fontWeight: '700',
                margin: '0 0 6px 0', // Réduction
                color: '#1f2937',
                lineHeight: '1.2'
              }}>
                Découvrez. Créez.{' '}
                <span style={{
                  background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  position: 'relative'
                }}>
                  Partagez.
                  <div style={{
                    position: 'absolute',
                    bottom: '-2px',
                    left: '0',
                    right: '0',
                    height: '2px',
                    background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
                    borderRadius: '1px',
                    animation: 'expandLine 2s ease-in-out infinite'
                  }} />
                </span>
              </h2>
              <p style={{
                fontSize: '0.9rem', // Réduction
                color: '#6b7280',
                margin: 0,
                lineHeight: '1.4',
                fontWeight: '500'
              }}>
                L'univers culinaire qui vous ressemble
              </p>
            </div>

            {/* Actions rapides - VERSION COMPACTE */}
            <div style={{
              display: 'flex',
              gap: '10px', // Réduction
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginBottom: '20px' // Réduction
            }}>
              <button
                onClick={() => router.push('/share-photo')}
                style={{
                  background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px', // Réduction
                  borderRadius: '14px', // Réduction
                  fontWeight: '700',
                  fontSize: '0.9rem', // Réduction
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 15px rgba(255, 107, 53, 0.25)', // Réduction
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px', // Réduction
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)'
                  e.target.style.boxShadow = '0 6px 18px rgba(255, 107, 53, 0.35)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)'
                  e.target.style.boxShadow = '0 4px 15px rgba(255, 107, 53, 0.25)'
                }}
              >
                {/* Icône caméra réduite */}
                <div style={{
                  width: '14px', // Réduction
                  height: '14px',
                  background: 'white',
                  borderRadius: '3px',
                  position: 'relative',
                  animation: 'cameraShutter 2s ease-in-out infinite'
                }}>
                  <div style={{
                    width: '6px', // Réduction
                    height: '6px',
                    background: '#ff6b35',
                    borderRadius: '50%',
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    animation: 'lensFocus 2s ease-in-out infinite'
                  }} />
                </div>
                Partager
              </button>
              <button
                onClick={() => router.push('/progression')}
                style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  color: '#ff6b35',
                  border: '2px solid #ff6b35',
                  padding: '10px 20px', // Réduction
                  borderRadius: '14px', // Réduction
                  fontWeight: '700',
                  fontSize: '0.9rem', // Réduction
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  backdropFilter: 'blur(10px)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px' // Réduction
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#ff6b35'
                  e.target.style.color = 'white'
                  e.target.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.95)'
                  e.target.style.color = '#ff6b35'
                  e.target.style.transform = 'translateY(0)'
                }}
              >
                {/* Icône trophée */}
                <div style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '3px',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  🏆
                </div>
                Progression
              </button>
            </div>

            {/* Statistiques RÉDUITES ET OPTIMISÉES */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '12px', // Réduction
              marginBottom: '16px', // Réduction
              flexWrap: 'wrap'
            }}>
              {user && [
                { 
                  number: feedStats.totalRecipes, 
                  label: 'Recettes', 
                  color: '#ff6b35', 
                  animation: 'recipeIcon',
                  icon: '🍽️'
                },
                { 
                  number: feedStats.totalLikes, 
                  label: 'Likes', 
                  color: '#e91e63', 
                  animation: 'heartBeat',
                  icon: '❤️'
                },
                { 
                  number: feedStats.activeChefs, 
                  label: 'Chefs', 
                  color: '#4caf50', 
                  animation: 'chefIcon',
                  icon: '👨‍🍳'
                }
              ].map((stat, index) => (
                <div key={index} style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(15px)',
                  padding: '12px 16px', // Réduction
                  borderRadius: '16px', // Réduction
                  border: `2px solid ${stat.color}20`,
                  minWidth: '90px', // Réduction importante
                  animation: `fadeInUp 0.6s ease-out ${index * 0.15}s both`,
                  boxShadow: `0 4px 15px ${stat.color}15`, // Réduction
                  textAlign: 'center',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {/* Icône principale réduite */}
                  <div style={{ 
                    fontSize: '1.4rem', // Réduction importante
                    marginBottom: '4px', // Réduction
                    animation: `${stat.animation} 2s ease-in-out infinite`,
                    transformOrigin: 'center',
                    position: 'relative',
                    zIndex: 2
                  }}>
                    {stat.icon}
                  </div>
                  
                  {/* Nombre principal réduit */}
                  <div style={{
                    fontSize: '1.2rem', // Réduction
                    fontWeight: '900',
                    color: stat.color,
                    marginBottom: '2px', // Réduction
                    position: 'relative',
                    zIndex: 2
                  }}>
                    {stat.number}
                  </div>
                  
                  {/* Label réduit */}
                  <div style={{
                    fontSize: '0.75rem', // Réduction
                    color: '#6b7280',
                    fontWeight: '700',
                    position: 'relative',
                    zIndex: 2
                  }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Indicateur de scroll - VERSION COMPACTE */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px', // Réduction
              opacity: 0.5 // Réduction de l'opacité
            }}>
              <span style={{
                fontSize: '0.75rem', // Réduction
                color: '#9ca3af',
                fontWeight: '600'
              }}>
                Découvrez les recettes
              </span>
              <div style={{
                width: '16px', // Réduction
                height: '16px',
                border: '2px solid #ff6b35',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'bounceDown 2s infinite',
                background: 'rgba(255, 107, 53, 0.1)'
              }}>
                <span style={{ fontSize: '0.6rem', color: '#ff6b35' }}>↓</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section AddictiveFeed directement sans header communautaire */}
        <div style={{
          maxWidth: '400px',
          margin: '-20px auto 0', // Réduction de l'espacement négatif
          background: 'white',
          borderRadius: '24px 24px 0 0', // Réduction du border-radius
          boxShadow: '0 -8px 30px rgba(0,0,0,0.08)', // Réduction de l'ombre
          overflow: 'hidden',
          position: 'relative',
          zIndex: 2
        }}>
          {/* En-tête simplifié du feed */}
          <div style={{
            padding: '16px 20px 10px', // Réduction du padding
            textAlign: 'center',
            borderBottom: '1px solid #f3f4f6'
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px', // Réduction
              background: '#f0f9ff',
              padding: '6px 12px', // Réduction
              borderRadius: '16px', // Réduction
              fontSize: '0.8rem', // Réduction
              fontWeight: '600',
              color: '#0369a1',
              border: '1px solid #e0f2fe'
            }}>
              👥 Recettes de mes amis
              <span style={{
                width: '5px', // Réduction
                height: '5px',
                background: '#10b981',
                borderRadius: '50%',
                animation: 'pulse 2s infinite'
              }} />
            </div>
            
            {/* Options de navigation simplifiées */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '8px', // Réduction
              marginTop: '8px' // Réduction
            }}>
              <button
                onClick={() => router.push('/amis')}
                style={{
                  background: 'transparent',
                  border: '1px solid #e5e7eb',
                  color: '#6b7280',
                  padding: '4px 10px', // Réduction
                  borderRadius: '12px', // Réduction
                  fontSize: '0.7rem', // Réduction
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#f3f4f6'
                  e.target.style.color = '#374151'
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent'
                  e.target.style.color = '#6b7280'
                }}
              >
                ➕ Ajouter amis
              </button>
            </div>
          </div>

          {/* Contenu du feed */}
          <div style={{
            minHeight: '50vh', // Réduction
            padding: '0 8px 16px' // Réduction
          }}>
            <div style={{
              maxWidth: '100%',
              overflow: 'hidden'
            }}>
              <div style={{
                '--max-image-height': '220px', // Réduction
                '--max-image-width': '100%'
              }}>
                <AddictiveFeed />
              </div>
            </div>
          </div>

          {/* Message d'encouragement - VERSION COMPACTE */}
          {user && (
            <div style={{
              textAlign: 'center',
              padding: '16px', // Réduction
              background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
              margin: '16px', // Réduction
              borderRadius: '14px', // Réduction
              border: '1px solid #f59e0b'
            }}>
              <div style={{ fontSize: '1.2rem', marginBottom: '6px' }}>🍳</div>
              <p style={{
                margin: '0 0 8px 0', // Réduction
                fontSize: '0.85rem', // Réduction
                fontWeight: '600',
                color: '#92400e'
              }}>
                Invitez vos amis à rejoindre COCO !
              </p>
              <p style={{
                margin: '0 0 12px 0', // Réduction
                fontSize: '0.75rem', // Réduction
                color: '#b45309',
                lineHeight: '1.4'
              }}>
                Plus vous avez d'amis, plus vous découvrirez de recettes
              </p>
              <button
                onClick={() => router.push('/amis')}
                style={{
                  background: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  padding: '6px 14px', // Réduction
                  borderRadius: '8px',
                  fontSize: '0.75rem', // Réduction
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#d97706'
                  e.target.style.transform = 'translateY(-1px)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#f59e0b'
                  e.target.style.transform = 'translateY(0)'
                }}
              >
                👥 Gérer mes amis
              </button>
            </div>
          )}
        </div>
      </main>
      
      {/* Logo cliquable pour accès secret */}
      <div onClick={handleLogoClick} style={{ cursor: 'pointer' }}>
        {/* Votre logo existant */}
      </div>

      {/* Menu secret pour les logs */}
      {showSecretMenu && hasAdminAccess && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: 'rgba(0, 0, 0, 0.9)',
          color: 'white',
          padding: '16px',
          borderRadius: '12px',
          zIndex: 9999,
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          animation: 'fadeIn 0.3s ease'
        }}>
          <div style={{ fontSize: '0.8rem', marginBottom: '8px', opacity: 0.7 }}>
            🔒 Menu Développeur
          </div>
          <button
            onClick={() => router.push('/social-logs')}
            style={{
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '600',
              width: '100%'
            }}
          >
            🔍 Logs Sociaux
          </button>
        </div>
      )}

      <style jsx>{`
        @keyframes heroLogo {
          0%, 100% { 
            transform: translateY(0px) rotate(0deg) scale(1);
          }
          50% { 
            transform: translateY(-8px) rotate(2deg) scale(1.05);
          }
        }
        
        @keyframes shine {
          0%, 100% { 
            opacity: 0.4;
            transform: scale(1) rotate(0deg);
          }
          50% { 
            opacity: 0.7;
            transform: scale(1.1) rotate(90deg);
          }
        }
        
        @keyframes expandLine {
          0%, 100% { 
            transform: scaleX(0);
            opacity: 0;
          }
          50% { 
            transform: scaleX(1);
            opacity: 1;
          }
        }
        
        @keyframes bounceDown {
          0%, 20%, 50%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-8px);
          }
          60% {
            transform: translateY(-4px);
          }
        }
        
        @keyframes float {
          0%, 100% { 
            transform: translateY(0px) rotate(0deg) scale(1);
          }
          33% { 
            transform: translateY(-20px) rotate(120deg) scale(1.1);
          }
          66% { 
            transform: translateY(-10px) rotate(240deg) scale(0.9);
          }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-6px);
          }
          60% {
            transform: translateY(-3px);
          }
        }
        
        @keyframes pulse {
          0%, 100% { 
            transform: scale(1);
            opacity: 1;
          }
          50% { 
            transform: scale(1.1);
            opacity: 0.8;
          }
        }
        
        /* Animations pour les notifications intégrées */
        @keyframes notificationSlide {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        /* Effet de survol pour les éléments interactifs */
        .notification-trigger:hover {
          transform: scale(1.05);
          filter: brightness(1.1);
        }
        
        @keyframes welcomeSlide {
          from {
            opacity: 0;
            transform: translate(-50%, -20px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
        
        @keyframes sophisticatedSpin {
          0% { 
            transform: rotate(0deg) scale(1);
            opacity: 1;
          }
          50% { 
            transform: rotate(180deg) scale(1.1);
            opacity: 0.8;
          }
          100% { 
            transform: rotate(360deg) scale(1);
            opacity: 1;
          }
        }
        
        @keyframes pulseGlow {
          0%, 100% { 
            transform: scale(1);
            box-shadow: 0 0 20px rgba(255, 107, 53, 0.4);
          }
          50% { 
            transform: scale(1.1);
            box-shadow: 0 0 30px rgba(255, 107, 53, 0.6), 0 0 40px rgba(255, 107, 53, 0.3);
          }
        }
        
        @keyframes innerPulse {
          0% { 
            transform: scale(1);
            opacity: 1;
          }
          100% { 
            transform: scale(1.3);
            opacity: 0.7;
          }
        }
        
        @keyframes loadingDots {
          0% { content: ''; }
          25% { content: '.'; }
          50% { content: '..'; }
          75% { content: '...'; }
          100% { content: ''; }
        }
        
        @keyframes waveDots {
          0%, 40%, 100% { 
            transform: translateY(0) scale(1);
            opacity: 0.5;
          }
          20% { 
            transform: translateY(-8px) scale(1.2);
            opacity: 1;
          }
        }
        
        @keyframes logoRotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes checkmark {
          0%, 50% { opacity: 0; transform: scale(0.5); }
          60% { opacity: 1; transform: scale(1.1); }
          100% { opacity: 1; transform: scale(1); }
        }
        
        @keyframes floatingParticles {
          0%, 100% { 
            transform: translateY(0px) translateX(0px) scale(1);
            opacity: 0.8;
          }
          33% { 
            transform: translateY(-15px) translateX(10px) scale(1.2);
            opacity: 1;
          }
          66% { 
            transform: translateY(-8px) translateX(-5px) scale(0.8);
            opacity: 0.6;
          }
        }
        
        @keyframes advancedShine {
          0%, 100% { 
            opacity: 0.6;
            transform: rotate(0deg) scale(1);
          }
          50% { 
            opacity: 1;
            transform: rotate(180deg) scale(1.3);
          }
        }
        
        @keyframes cameraShutter {
          0%, 90%, 100% { transform: scale(1); }
          5%, 15% { transform: scale(0.95); }
          10% { transform: scale(0.9); }
        }
        
        @keyframes lensFocus {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.2); }
        }
        
        @keyframes bookOpen {
          0%, 100% { transform: scaleX(1); }
          50% { transform: scaleX(1.1); }
        }
        
        @keyframes recipeIcon {
          0%, 100% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(1.1); }
        }
        
        @keyframes chefIcon {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
        }
        
        @keyframes collectionIcon {
          0%, 100% { transform: rotateY(0deg); }
          50% { transform: rotateY(15deg); }
        }

        @keyframes heartBeat {
          0%, 100% { 
            transform: scale(1);
          }
          50% { 
            transform: scale(1.15);
          }
        }
        
        @keyframes commentBubble {
          0%, 100% { 
            transform: translateY(0) rotate(0deg);
          }
          25% { 
            transform: translateY(-3px) rotate(2deg);
          }
          75% { 
            transform: translateY(-1px) rotate(-1deg);
          }
        }
        
        /* Effet de survol pour les cartes de statistiques */
        .stat-card-bg:hover {
          opacity: 1 !important;
        }
        
        /* Responsive pour les nouvelles statistiques */
        @media (max-width: 768px) {
          div[style*="gap: '20px'"] {
            gap: 12px !important;
          }
          
          div[style*="minWidth: '140px'"] {
            min-width: 120px !important;
            padding: 12px 16px !important;
          }
        }
        
        @media (max-width: 480px) {
          div[style*="minWidth: '140px'"] {
            min-width: 100px !important;
            padding: 10px 12px !important;
          }
          
          div[style*="fontSize: '1.6rem'"] {
            font-size: 1.4rem !important;
          }
          
          div[style*="fontSize: '2rem'"] {
            font-size: 1.8rem !important;
          }
        }
        
        /* États de focus pour l'accessibilité */
        button:focus {
          outline: 2px solid rgba(59, 130, 246, 0.5);
          outline-offset: 2px;
        }
        
        /* Responsive amélioré pour header sans espaces */
        @media (max-width: 400px) {
          h1 {
            fontSize: 2.4rem !important;
          }
          h2 {
            fontSize: 1.1rem !important;
          }
          div[style*="maxWidth: 400"] {
            padding: 20px 16px 0 !important; /* Ajuster pour mobile */
          }
        }
        
        @media (max-width: 360px) {
          h1 {
            fontSize: 2.2rem !important;
          }
          div[style*="width: 80px"] {
            width: 70px !important;
            height: 70px !important;
            fontSize: 2.2rem !important;
          }
        }
        
        /* Suppression des espacements sur très petits écrans */
        @media (max-width: 320px) {
          div[style*="padding: 24px 20px 0"] {
            padding: 16px 12px 0 !important; /* Ajuster le padding responsive */
          }
        }
      `}</style>
    </div>
  )
}
