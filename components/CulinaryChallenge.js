import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Image from 'next/image'
import { useAuth } from './AuthContext'
import { logInfo, logUserInteraction } from '../utils/logger'
import styles from '../styles/CulinaryChallenge.module.css'

// Données des défis culinaires
const CULINARY_CHALLENGES = [
  {
    id: 'knife-skills',
    title: 'Maîtrise du Couteau 🔪',
    category: 'Technique',
    difficulty: 'Débutant',
    description: 'Apprenez les techniques de découpe essentielles',
    icon: '🔪',
    color: '#3b82f6',
    gradient: 'linear-gradient(135deg, #3b82f6, #1e40af)',
    type: 'tip', // tip ou recipe
    content: {
      tip: "Pour une découpe parfaite, tenez votre couteau en pince et guidez avec vos jointures. Gardez la lame toujours en contact avec la planche.",
      techniques: [
        "Julienne: bâtonnets fins 2-3mm",
        "Brunoise: petits dés réguliers",
        "Chiffonnade: lanières de feuilles"
      ]
    },
    xp: 50,
    badge: '🏅 Apprenti Chef'
  },
  {
    id: 'pasta-perfecta',
    title: 'Pâtes Parfaites 🍝',
    category: 'Recette',
    difficulty: 'Intermédiaire',
    description: 'La recette ultime des pâtes à l\'italienne',
    icon: '🍝',
    color: '#10b981',
    gradient: 'linear-gradient(135deg, #10b981, #059669)',
    type: 'recipe',
    content: {
      recipe: {
        title: "Spaghetti Carbonara Authentique",
        servings: 4,
        prepTime: "15 min",
        ingredients: [
          "400g spaghetti",
          "200g guanciale ou pancetta",
          "4 œufs entiers + 2 jaunes",
          "100g Pecorino Romano râpé",
          "Poivre noir fraîchement moulu"
        ],
        instructions: [
          "Faire cuire les pâtes dans l'eau salée al dente",
          "Faire revenir le guanciale jusqu'à ce qu'il soit croustillant",
          "Mélanger œufs et fromage dans un bol",
          "Égoutter les pâtes en gardant un verre d'eau de cuisson",
          "Mélanger rapidement hors du feu pour créer la crème"
        ]
      }
    },
    xp: 100,
    badge: '👨‍🍳 Maître Pasteur'
  },
  {
    id: 'sauce-mastery',
    title: 'Maîtrise des Sauces 🥄',
    category: 'Technique',
    difficulty: 'Avancé',
    description: 'Les 5 sauces mères de la cuisine française',
    icon: '🥄',
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
    type: 'tip',
    content: {
      tip: "Maîtrisez les 5 sauces mères : Béchamel, Velouté, Espagnole, Hollandaise et Tomate. Elles sont la base de centaines de sauces dérivées.",
      sauces: [
        "Béchamel: roux blanc + lait",
        "Velouté: roux blanc + bouillon",
        "Espagnole: roux brun + bouillon brun",
        "Hollandaise: jaunes d'œufs + beurre + citron",
        "Tomate: tomates + aromates"
      ]
    },
    xp: 150,
    badge: '🎖️ Saucier Expert'
  },
  {
    id: 'bread-magic',
    title: 'Magie du Pain 🍞',
    category: 'Recette',
    difficulty: 'Expert',
    description: 'Pain artisanal fait maison',
    icon: '🍞',
    color: '#dc2626',
    gradient: 'linear-gradient(135deg, #dc2626, #991b1b)',
    type: 'recipe',
    content: {
      recipe: {
        title: "Pain de Campagne Artisanal",
        servings: 1,
        prepTime: "4h + 12h levée",
        ingredients: [
          "500g farine T65",
          "350ml eau tiède",
          "10g sel",
          "5g levure fraîche",
          "Levain naturel (optionnel)"
        ],
        instructions: [
          "Autolyse: mélanger farine et eau, reposer 30min",
          "Ajouter sel et levure, pétrir 10min",
          "Première fermentation: 2h à température ambiante",
          "Façonnage et seconde fermentation: 12h au frais",
          "Cuisson: 250°C puis 220°C pendant 45min"
        ]
      }
    },
    xp: 200,
    badge: '🏆 Maître Boulanger'
  }
]

export default function CulinaryChallenge() {
  const { user } = useAuth()
  const router = useRouter()
  const [challenges, setChallenges] = useState(CULINARY_CHALLENGES)
  const [selectedChallenge, setSelectedChallenge] = useState(null)
  const [completedChallenges, setCompletedChallenges] = useState(new Set())
  const [userXP, setUserXP] = useState(0)
  const [activeCategory, setActiveCategory] = useState('all')

  // Charger les défis complétés depuis localStorage - VERSION SÉCURISÉE
  useEffect(() => {
    if (user && typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem(`culinary_challenges_${user.id}`)
        if (saved) {
          const data = JSON.parse(saved)
          setCompletedChallenges(new Set(data.completed || []))
          setUserXP(data.xp || 0)
        }
      } catch (error) {
        console.error('Erreur chargement défis:', error)
      }
    }
  }, [user])

  const categories = ['all', 'Technique', 'Recette']

  const filteredChallenges = challenges.filter(challenge => 
    activeCategory === 'all' || challenge.category === activeCategory
  )

  const completeChallenge = (challengeId) => {
    if (!user) {
      alert('Connectez-vous pour valider ce défi !')
      return
    }

    const challenge = challenges.find(c => c.id === challengeId)
    if (!challenge || completedChallenges.has(challengeId)) return

    const newCompleted = new Set([...completedChallenges, challengeId])
    const newXP = userXP + challenge.xp

    setCompletedChallenges(newCompleted)
    setUserXP(newXP)

    // Sauvegarder
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(`culinary_challenges_${user.id}`, JSON.stringify({
          completed: [...newCompleted],
          xp: newXP
        }))
      } catch (error) {
        console.error('Erreur sauvegarde:', error)
      }
    }

    // Animation de succès
    showSuccessAnimation(challenge)

    logUserInteraction('COMPLETE_CHALLENGE', 'culinary-challenge', {
      challengeId,
      xpGained: challenge.xp,
      totalXP: newXP
    })
  }

  const showSuccessAnimation = (challenge) => {
    const notification = document.createElement('div')
    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="font-size: 2rem;">${challenge.icon}</span>
        <div>
          <div style="font-weight: 700; font-size: 1.1rem;">Défi Complété !</div>
          <div style="color: #10b981; font-weight: 600;">+${challenge.xp} XP • ${challenge.badge}</div>
        </div>
      </div>
    `
    notification.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, #ffffff, #f8fafc);
      border: 2px solid #10b981;
      border-radius: 16px;
      padding: 20px;
      z-index: 10000;
      box-shadow: 0 20px 40px rgba(16, 185, 129, 0.3);
      animation: challengeSuccess 0.6s ease-out;
    `
    document.body.appendChild(notification)
    setTimeout(() => notification.remove(), 3000)
  }

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Débutant': return '#10b981'
      case 'Intermédiaire': return '#f59e0b'
      case 'Avancé': return '#f97316'
      case 'Expert': return '#dc2626'
      default: return '#6b7280'
    }
  }

  return (
    <div className={styles.challengeContainer}>
      {/* Header avec stats utilisateur */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1>🏆 Défis Culinaires</h1>
          <p>Relevez des défis, apprenez de nouvelles techniques et débloquez des badges !</p>
        </div>
        
        {user && (
          <div className={styles.userStats}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{userXP}</div>
              <div className={styles.statLabel}>XP Total</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{completedChallenges.size}</div>
              <div className={styles.statLabel}>Défis Réalisés</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>
                {Math.floor(completedChallenges.size / challenges.length * 100)}%
              </div>
              <div className={styles.statLabel}>Progression</div>
            </div>
          </div>
        )}
      </div>

      {/* Filtres par catégorie */}
      <div className={styles.filters}>
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`${styles.filterBtn} ${activeCategory === category ? styles.active : ''}`}
          >
            {category === 'all' ? '🌟 Tous' : 
             category === 'Technique' ? '🔧 Techniques' : 
             '📖 Recettes'}
          </button>
        ))}
      </div>

      {/* Grille des défis */}
      <div className={styles.challengesGrid}>
        {filteredChallenges.map(challenge => {
          const isCompleted = completedChallenges.has(challenge.id)
          
          return (
            <div
              key={challenge.id}
              className={`${styles.challengeCard} ${isCompleted ? styles.completed : ''}`}
              style={{ '--card-gradient': challenge.gradient }}
              onClick={() => setSelectedChallenge(challenge)}
            >
              {/* Badge de réussite */}
              {isCompleted && (
                <div className={styles.completedBadge}>
                  ✅ Complété
                </div>
              )}

              {/* Header de carte */}
              <div className={styles.cardHeader}>
                <div className={styles.challengeIcon} style={{ background: challenge.gradient }}>
                  {challenge.icon}
                </div>
                <div className={styles.challengeType}>
                  {challenge.type === 'tip' ? '💡 Astuce' : '📖 Recette'}
                </div>
              </div>

              {/* Contenu principal */}
              <div className={styles.cardContent}>
                <h3 className={styles.challengeTitle}>{challenge.title}</h3>
                <p className={styles.challengeDescription}>{challenge.description}</p>

                {/* Métadonnées */}
                <div className={styles.challengeMeta}>
                  <span 
                    className={styles.difficulty}
                    style={{ backgroundColor: getDifficultyColor(challenge.difficulty) }}
                  >
                    {challenge.difficulty}
                  </span>
                  <span className={styles.category}>{challenge.category}</span>
                </div>

                {/* Récompense */}
                <div className={styles.reward}>
                  <span className={styles.xp}>+{challenge.xp} XP</span>
                  <span className={styles.badge}>{challenge.badge}</span>
                </div>
              </div>

              {/* Action button */}
              <div className={styles.cardActions}>
                {isCompleted ? (
                  <button className={styles.viewBtn}>
                    👁️ Revoir
                  </button>
                ) : (
                  <button className={styles.startBtn}>
                    🚀 Commencer
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal de détail */}
      {selectedChallenge && (
        <div className={styles.modal} onClick={() => setSelectedChallenge(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalIcon} style={{ background: selectedChallenge.gradient }}>
                {selectedChallenge.icon}
              </div>
              <div>
                <h2>{selectedChallenge.title}</h2>
                <div className={styles.modalMeta}>
                  <span style={{ color: getDifficultyColor(selectedChallenge.difficulty) }}>
                    {selectedChallenge.difficulty}
                  </span>
                  <span>•</span>
                  <span>{selectedChallenge.category}</span>
                  <span>•</span>
                  <span>+{selectedChallenge.xp} XP</span>
                </div>
              </div>
              <button onClick={() => setSelectedChallenge(null)} className={styles.closeBtn}>
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              {selectedChallenge.type === 'tip' ? (
                <div className={styles.tipContent}>
                  <h3>💡 Astuce Culinaire</h3>
                  <p className={styles.tipText}>{selectedChallenge.content.tip}</p>
                  
                  {selectedChallenge.content.techniques && (
                    <div className={styles.techniquesList}>
                      <h4>Techniques à maîtriser :</h4>
                      <ul>
                        {selectedChallenge.content.techniques.map((technique, index) => (
                          <li key={index}>{technique}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedChallenge.content.sauces && (
                    <div className={styles.saucesList}>
                      <h4>Les 5 sauces mères :</h4>
                      <ul>
                        {selectedChallenge.content.sauces.map((sauce, index) => (
                          <li key={index}>{sauce}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className={styles.recipeContent}>
                  <h3>📖 Recette Complète</h3>
                  <div className={styles.recipeHeader}>
                    <h4>{selectedChallenge.content.recipe.title}</h4>
                    <div className={styles.recipeInfo}>
                      <span>👥 {selectedChallenge.content.recipe.servings} portions</span>
                      <span>⏱️ {selectedChallenge.content.recipe.prepTime}</span>
                    </div>
                  </div>

                  <div className={styles.ingredients}>
                    <h5>Ingrédients :</h5>
                    <ul>
                      {selectedChallenge.content.recipe.ingredients.map((ingredient, index) => (
                        <li key={index}>{ingredient}</li>
                      ))}
                    </ul>
                  </div>

                  <div className={styles.instructions}>
                    <h5>Instructions :</h5>
                    <ol>
                      {selectedChallenge.content.recipe.instructions.map((instruction, index) => (
                        <li key={index}>{instruction}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.modalActions}>
              {!completedChallenges.has(selectedChallenge.id) ? (
                <button
                  onClick={() => completeChallenge(selectedChallenge.id)}
                  className={styles.completeBtn}
                  disabled={!user}
                >
                  {user ? `✅ Marquer comme complété (+${selectedChallenge.xp} XP)` : '🔐 Connectez-vous pour valider'}
                </button>
              ) : (
                <div className={styles.completedInfo}>
                  <span>🎉 Défi complété ! Badge obtenu : {selectedChallenge.badge}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes challengeSuccess {
          0% {
            transform: translate(-50%, -50%) scale(0.8);
            opacity: 0;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.1);
          }
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
