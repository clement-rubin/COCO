import { supabase } from '../../../lib/supabase'
import { logInfo, logError, logWarning } from '../../../utils/logger'

export default async function handler(req, res) {
  // Seulement POST autorisé
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' })
  }

  try {
    logInfo('Starting recipe authors update')

    // 1. Récupérer toutes les recettes avec leur user_id
    const { data: recipes, error: recipesError } = await supabase
      .from('recipes')
      .select('id, title, author, user_id')
      .order('created_at', { ascending: false })

    if (recipesError) {
      throw recipesError
    }

    logInfo(`Found ${recipes.length} recipes to process`)

    // 2. Récupérer tous les profils pour faire le mapping
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, display_name, email')

    if (profilesError) {
      throw profilesError
    }

    logInfo(`Found ${profiles.length} profiles for mapping`)

    // 3. Créer un map pour accès rapide aux profils
    const profileMap = new Map()
    profiles.forEach(profile => {
      if (profile.user_id) {
        profileMap.set(profile.user_id, profile)
      }
    })

    // 4. Traiter chaque recette
    let updatedCount = 0
    let errors = []

    for (const recipe of recipes) {
      try {
        let newAuthor = recipe.author
        let shouldUpdate = false

        // Si la recette a un user_id et qu'on peut trouver le profil
        if (recipe.user_id && profileMap.has(recipe.user_id)) {
          const profile = profileMap.get(recipe.user_id)
          const profileName = profile.display_name || profile.email?.split('@')[0] || 'Chef Anonyme'
          
          // Mettre à jour si l'auteur actuel est générique ou vide
          if (!recipe.author || 
              recipe.author === 'Chef Anonyme' || 
              recipe.author === 'Utilisateur' || 
              recipe.author === '' ||
              recipe.author.includes('@')) { // Si c'est un email
            newAuthor = profileName
            shouldUpdate = true
          }
        }
        // Si pas de user_id, utiliser un nom générique
        else if (!recipe.user_id && (!recipe.author || recipe.author === 'Chef Anonyme' || recipe.author === '')) {
          newAuthor = 'Chef Communauté'
          shouldUpdate = true
        }

        // Effectuer la mise à jour si nécessaire
        if (shouldUpdate && newAuthor !== recipe.author) {
          const { error: updateError } = await supabase
            .from('recipes')
            .update({ author: newAuthor })
            .eq('id', recipe.id)

          if (updateError) {
            errors.push({
              recipeId: recipe.id,
              recipeTitle: recipe.title,
              error: updateError.message
            })
          } else {
            updatedCount++
            logInfo(`Updated recipe "${recipe.title}" author from "${recipe.author}" to "${newAuthor}"`)
          }
        }
      } catch (error) {
        errors.push({
          recipeId: recipe.id,
          recipeTitle: recipe.title,
          error: error.message
        })
      }
    }

    // 5. Récupérer les statistiques finales
    const { data: stats, error: statsError } = await supabase
      .from('recipes')
      .select('author, user_id')

    let finalStats = {
      totalRecipes: recipes.length,
      updatedRecipes: updatedCount,
      errors: errors.length
    }

    if (!statsError && stats) {
      const authorsCount = {
        withRealNames: stats.filter(r => r.author && r.author !== 'Chef Anonyme' && r.author !== 'Chef Communauté').length,
        anonymous: stats.filter(r => r.author === 'Chef Anonyme').length,
        community: stats.filter(r => r.author === 'Chef Communauté').length,
        withUserId: stats.filter(r => r.user_id).length
      }
      finalStats = { ...finalStats, ...authorsCount }
    }

    logInfo('Recipe authors update completed', finalStats)

    res.status(200).json({
      success: true,
      message: `Mise à jour terminée. ${updatedCount} recettes mises à jour.`,
      stats: finalStats,
      errors: errors.length > 0 ? errors.slice(0, 10) : [] // Max 10 erreurs dans la réponse
    })

  } catch (error) {
    logError('Error updating recipe authors', error)
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour des auteurs',
      message: error.message
    })
  }
}
