import { supabase } from '../../lib/supabase'
import { logInfo, logError, logWarning } from '../../utils/logger'

export default async function handler(req, res) {
  // En-têtes CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  const requestId = `profile-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`

  try {
    if (req.method === 'GET') {
      const { user_id, search } = req.query

      // Si c'est une recherche d'utilisateurs
      if (search && search.trim().length >= 2) {
        logInfo('Searching users by display name', { requestId, query: search })
        
        const { data: users, error: searchError } = await supabase
          .rpc('search_profiles', { 
            search_term: search.trim(),
            current_user_id: user_id || null
          })

        if (searchError) {
          logError('Error searching profiles', searchError, { requestId, search })
          return res.status(500).json({ 
            error: 'Erreur lors de la recherche',
            message: searchError.message
          })
        }

        logInfo('Profile search completed', { 
          requestId, 
          query: search, 
          resultsCount: users?.length || 0 
        })

        return res.status(200).json(users || [])
      }

      // Recherche d'un profil spécifique
      if (!user_id) {
        return res.status(400).json({ 
          error: 'user_id ou search est requis',
          message: 'Veuillez fournir un user_id valide ou un terme de recherche'
        })
      }

      logInfo('Getting user profile', { requestId, user_id: user_id.substring(0, 8) + '...' })

      // Récupérer le profil utilisateur sans les jointures complexes pour éviter les erreurs
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user_id)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        logError('Error fetching profile', error, { requestId, user_id })
        return res.status(500).json({ 
          error: 'Erreur lors de la récupération du profil',
          message: error.message
        })
      }

      // Si aucun profil n'existe, créer un profil par défaut
      if (!profile) {
        logInfo('No profile found, creating default profile', { requestId, user_id })
        
        // Récupérer les infos de base de l'utilisateur depuis auth.users
        let defaultDisplayName = 'Utilisateur'
        try {
          const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(user_id)
          if (!authError && authUser?.user?.email) {
            defaultDisplayName = authUser.user.email.split('@')[0]
          }
        } catch (authErr) {
          logWarning('Could not fetch auth user for default profile', authErr)
        }
        
        const defaultProfile = {
          user_id,
          display_name: defaultDisplayName,
          bio: null,
          avatar_url: null,
          location: null,
          website: null,
          date_of_birth: null,
          phone: null,
          is_private: false
        }

        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert([defaultProfile])
          .select()
          .single()

        if (createError) {
          logError('Error creating default profile', createError, { requestId, user_id })
          return res.status(500).json({ 
            error: 'Erreur lors de la création du profil',
            message: createError.message
          })
        }

        logInfo('Default profile created', { requestId, user_id, display_name: newProfile.display_name })
        return res.status(200).json(newProfile)
      }

      logInfo('Profile retrieved successfully', { requestId, user_id, display_name: profile.display_name })
      return res.status(200).json(profile)
    }

    if (req.method === 'PUT') {
      const data = req.body

      if (!data || !data.user_id) {
        return res.status(400).json({ 
          error: 'Données invalides',
          message: 'user_id est requis dans le corps de la requête'
        })
      }

      logInfo('Updating user profile', { 
        requestId, 
        user_id: data.user_id.substring(0, 8) + '...',
        hasDisplayName: !!data.display_name,
        hasBio: !!data.bio
      })

      // Validation du nom d'affichage
      if (data.display_name) {
        const displayName = data.display_name.trim()
        if (displayName.length < 2 || displayName.length > 30) {
          return res.status(400).json({
            error: 'Nom d\'utilisateur invalide',
            message: 'Le nom doit contenir entre 2 et 30 caractères'
          })
        }
        
        if (!/^[a-zA-ZÀ-ÿ0-9_\-\s]+$/.test(displayName)) {
          return res.status(400).json({
            error: 'Nom d\'utilisateur invalide',
            message: 'Le nom ne peut contenir que des lettres, chiffres, espaces, tirets et underscores'
          })
        }

        // Vérifier l'unicité du nom d'affichage
        const { data: existingProfile, error: checkError } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('display_name', displayName)
          .neq('user_id', data.user_id)
          .single()

        if (!checkError && existingProfile) {
          return res.status(409).json({
            error: 'Nom d\'utilisateur déjà pris',
            message: 'Ce nom d\'utilisateur est déjà utilisé par un autre compte'
          })
        }
      }

      // Préparer les données de mise à jour (seulement les champs autorisés)
      const updateData = {
        display_name: data.display_name?.trim() || null,
        bio: data.bio?.trim() || null,
        avatar_url: data.avatar_url || null,
        location: data.location?.trim() || null,
        website: data.website?.trim() || null,
        date_of_birth: data.date_of_birth || null,
        phone: data.phone?.trim() || null,
        is_private: data.is_private !== undefined ? data.is_private : false,
        updated_at: new Date().toISOString()
      }

      // Supprimer les valeurs null pour éviter d'écraser les données existantes
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === null && key !== 'bio' && key !== 'avatar_url' && key !== 'location' && key !== 'website' && key !== 'date_of_birth' && key !== 'phone') {
          delete updateData[key]
        }
      })

      const { data: updatedProfile, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', data.user_id)
        .select()
        .single()

      if (error) {
        logError('Error updating profile', error, { requestId, user_id: data.user_id })
        return res.status(500).json({ 
          error: 'Erreur lors de la mise à jour du profil',
          message: error.message
        })
      }

      logInfo('Profile updated successfully', { 
        requestId, 
        user_id: data.user_id,
        display_name: updatedProfile.display_name 
      })
      return res.status(200).json(updatedProfile)
    }

    if (req.method === 'POST') {
      const data = req.body

      if (!data || !data.user_id) {
        return res.status(400).json({ 
          error: 'Données invalides',
          message: 'user_id est requis dans le corps de la requête'
        })
      }

      logInfo('Creating new user profile', { 
        requestId, 
        user_id: data.user_id.substring(0, 8) + '...',
        display_name: data.display_name
      })

      const newProfile = {
        user_id: data.user_id,
        display_name: data.display_name || 'Utilisateur',
        bio: data.bio || null,
        avatar_url: data.avatar_url || null,
        location: data.location || null,
        website: data.website || null,
        date_of_birth: data.date_of_birth || null,
        phone: data.phone || null,
        is_private: data.is_private !== undefined ? data.is_private : false
      }

      const { data: createdProfile, error } = await supabase
        .from('profiles')
        .insert([newProfile])
        .select()
        .single()

      if (error) {
        logError('Error creating profile', error, { requestId, user_id: data.user_id })
        return res.status(500).json({ 
          error: 'Erreur lors de la création du profil',
          message: error.message
        })
      }

      logInfo('Profile created successfully', { 
        requestId, 
        user_id: data.user_id,
        display_name: createdProfile.display_name 
      })
      return res.status(201).json(createdProfile)
    }

    return res.status(405).json({ 
      error: 'Méthode non autorisée',
      message: `La méthode ${req.method} n'est pas supportée`
    })

  } catch (error) {
    logError('Unexpected error in profile API', error, { requestId, method: req.method })
    return res.status(500).json({ 
      error: 'Erreur serveur interne',
      message: 'Une erreur inattendue s\'est produite'
    })
  }
}
