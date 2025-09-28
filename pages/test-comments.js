import { useState } from 'react'
import Comments from '../components/Comments'
import styles from '../styles/TestComments.module.css'

export default function TestCommentsPage() {
  const [selectedTheme, setSelectedTheme] = useState('default')
  const [selectedTargetId, setSelectedTargetId] = useState('recipe-123')

  return (
    <div className={styles.testPage}>
      <div className={styles.header}>
        <h1>🧪 Test de la Composante Commentaires</h1>
        <p>Testez toutes les fonctionnalités du système de commentaires</p>
      </div>

      <div className={styles.controls}>
        <div className={styles.control}>
          <label>Thème :</label>
          <select 
            value={selectedTheme} 
            onChange={(e) => setSelectedTheme(e.target.value)}
            className={styles.select}
          >
            <option value="default">Default</option>
            <option value="recipe">Recipe</option>
            <option value="social">Social</option>
          </select>
        </div>

        <div className={styles.control}>
          <label>Target ID :</label>
          <select 
            value={selectedTargetId} 
            onChange={(e) => setSelectedTargetId(e.target.value)}
            className={styles.select}
          >
            <option value="recipe-123">recipe-123</option>
            <option value="recipe-456">recipe-456</option>
            <option value="post-789">post-789</option>
          </select>
        </div>
      </div>

      <div className={styles.features}>
        <h2>✨ Fonctionnalités disponibles :</h2>
        <ul>
          <li>💬 Ajout de commentaires avec compteur de caractères</li>
          <li>❤️ Système de likes avec animations</li>
          <li>🔄 Réponses aux commentaires</li>
          <li>👤 Gestion des utilisateurs connectés/non connectés</li>
          <li>⏰ Affichage du temps relatif</li>
          <li>🎨 Thèmes personnalisables</li>
          <li>📱 Interface responsive</li>
          <li>✨ Animations et feedback visuels</li>
        </ul>
      </div>

      <div className={styles.commentsSection}>
        <Comments 
          targetId={selectedTargetId}
          targetType="recipe"
          theme={selectedTheme}
          className={styles.testComments}
        />
      </div>

      <div className={styles.instructions}>
        <h2>🔧 Instructions de test :</h2>
        <ol>
          <li>Connectez-vous pour pouvoir commenter et aimer</li>
          <li>Testez l'ajout de commentaires (max 500 caractères)</li>
          <li>Cliquez sur les cœurs pour tester les likes</li>
          <li>Changez les thèmes pour voir les différents styles</li>
          <li>Testez avec différents Target IDs</li>
          <li>Observez les animations et les notifications</li>
        </ol>
      </div>
    </div>
  )
}
