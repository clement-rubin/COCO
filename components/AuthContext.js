import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { logInfo, logError, logUserInteraction } from '../utils/logger'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          logError('Erreur lors de la récupération de la session', error)
        } else {
          setUser(session?.user ?? null)
          logInfo('Session utilisateur récupérée', { 
            hasUser: !!session?.user,
            userId: session?.user?.id 
          })
        }
      } catch (error) {
        logError('Erreur critique lors de la récupération de la session', error)
      } finally {
        setLoading(false)
      }
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        logInfo('Changement d\'état d\'authentification', { 
          event,
          hasUser: !!session?.user,
          userId: session?.user?.id 
        })
        
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    try {
      logUserInteraction('SIGN_IN_ATTEMPT', 'auth-signin', { email })
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        logError('Erreur lors de la connexion', error)
        throw error
      }

      logInfo('Connexion réussie', { 
        userId: data.user?.id,
        email: data.user?.email 
      })

      return { data, error: null }
    } catch (error) {
      logError('Erreur lors de la connexion', error)
      return { data: null, error }
    }
  }

  const signOut = async () => {
    try {
      logUserInteraction('SIGN_OUT_ATTEMPT', 'auth-signout', { 
        userId: user?.id 
      })
      
      const { error } = await supabase.auth.signOut()

      if (error) {
        logError('Erreur lors de la déconnexion', error)
        throw error
      }

      logInfo('Déconnexion réussie')
      return { error: null }
    } catch (error) {
      logError('Erreur lors de la déconnexion', error)
      return { error }
    }
  }

  const resetPassword = async (email) => {
    try {
      logUserInteraction('RESET_PASSWORD_ATTEMPT', 'auth-reset', { email })
      
      const redirectTo = typeof window !== 'undefined' 
        ? `${window.location.origin}/auth/reset-password`
        : '/auth/reset-password';
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo
      })

      if (error) {
        logError('Erreur lors de la réinitialisation du mot de passe', error)
        throw error
      }

      logInfo('Email de réinitialisation envoyé', { email })
      return { error: null }
    } catch (error) {
      logError('Erreur lors de la réinitialisation du mot de passe', error)
      return { error }
    }
  }

  const resendConfirmation = async (email) => {
    try {
      logUserInteraction('RESEND_CONFIRMATION_ATTEMPT', 'auth-resend', { email })
      
      const redirectTo = typeof window !== 'undefined' 
        ? `${window.location.origin}/auth/confirm`
        : '/auth/confirm';
      
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: redirectTo
        }
      })

      if (error) {
        logError('Erreur lors du renvoi de l\'email de confirmation', error)
        throw error
      }

      logInfo('Email de confirmation renvoyé', { email })
      return { error: null }
    } catch (error) {
      logError('Erreur lors du renvoi de l\'email de confirmation', error)
      return { error }
    }
  }

  const checkAndCreateProfile = async (userId, userData) => {
    try {
      if (!userId) return false
      
      // Check if profile exists
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single()
      
      if (profileError && profileError.code !== 'PGRST116') {
        // Log error but continue
        logError('Erreur lors de la vérification du profil', profileError)
      }
      
      // If profile doesn't exist, create one
      if (!profile) {
        logInfo('Création manuelle du profil utilisateur', { userId })
        
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            user_id: userId,
            display_name: userData.displayName || userData.email?.split('@')[0] || 'Utilisateur',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        
        if (insertError) {
          logError('Erreur lors de la création du profil utilisateur', insertError)
          return false
        }
        
        logInfo('Profil utilisateur créé avec succès', { userId })
        return true
      }
      
      return true
    } catch (error) {
      logError('Erreur lors de la vérification/création du profil', error)
      return false
    }
  }

  const signUp = async (email, password, displayName) => {
    try {
      logUserInteraction('SIGN_UP_ATTEMPT', 'auth-signup', { email })
      
      // Valider les entrées 
      if (!email || !password || !displayName) {
        throw new Error('Tous les champs sont requis')
      }
      
      if (password.length < 6) {
        throw new Error('Le mot de passe doit contenir au moins 6 caractères')
      }
      
      if (displayName.length < 2 || displayName.length > 30) {
        throw new Error('Le nom d\'utilisateur doit contenir entre 2 et 30 caractères')
      }

      // Enregistrer l'utilisateur
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
          },
          emailRedirectTo: typeof window !== 'undefined' 
            ? `${window.location.origin}/auth/confirm`
            : '/auth/confirm'
        }
      })

      if (error) {
        logError('Erreur lors de la création du compte', error)
        throw error
      }

      logInfo('Compte créé avec succès', { 
        userId: data.user?.id,
        email: data.user?.email 
      })

      // Vérifier/créer le profil manuellement après l'inscription
      if (data.user?.id) {
        await checkAndCreateProfile(data.user.id, {
          email: data.user.email,
          displayName: displayName
        })
      }

      return { data, error: null }
    } catch (error) {
      logError('Erreur lors de la création du compte', error)
      return { data: null, error }
    }
  }

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    resendConfirmation,
    checkAndCreateProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
