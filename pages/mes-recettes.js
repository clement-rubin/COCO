import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../components/AuthContext'
import { logUserInteraction } from '../utils/logger'

export default function MesRecettes() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !user) {
      logUserInteraction('REDIRECT_TO_LOGIN', 'mes-recettes', {
        reason: 'user_not_authenticated',
        targetPage: '/mes-recettes'
      })
      router.push('/login?redirect=' + encodeURIComponent('/mes-recettes'))
      return
    }

    if (user) {
      logUserInteraction('REDIRECT_TO_USER_RECIPES', 'mes-recettes', {
        userId: user.id?.substring(0, 8) + '...',
        userEmail: user.email
      })
      // Rediriger vers user-recipes.js avec le paramètre user_id
      router.push(`/user-recipes?user_id=${user.id}`)
    }
  }, [user, authLoading, router])

  // Affichage de chargement pendant la redirection
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <div style={{ textAlign: 'center', color: 'white' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🍳</div>
        <p>Redirection vers vos recettes...</p>
      </div>
    </div>
  )
}
