import { supabase } from '../lib/supabaseClient'

/**
 * Service pour gérer les classements mensuels
 */
export class MonthlyLeaderboardService {
  /**
   * Vérifier si c'est un nouveau mois et traiter la réinitialisation
   */
  static async checkAndHandleMonthlyReset(userId) {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7) // Format: YYYY-MM
      const lastCheckKey = `last_leaderboard_check_${userId}`
      const lastCheck = localStorage.getItem(lastCheckKey)
      
      if (lastCheck && lastCheck !== currentMonth) {
        // Nouveau mois détecté
        await this.archiveLeaderboard(lastCheck)
        await this.notifyMonthlyReset(lastCheck, currentMonth)
        localStorage.setItem(lastCheckKey, currentMonth)
        
        return {
          isNewMonth: true,
          previousMonth: lastCheck,
          currentMonth
        }
      } else if (!lastCheck) {
        // Premier accès
        localStorage.setItem(lastCheckKey, currentMonth)
      }
      
      return {
        isNewMonth: false,
        currentMonth
      }
    } catch (error) {
      console.error('Erreur lors de la vérification mensuelle:', error)
      return { isNewMonth: false, error }
    }
  }

  /**
   * Archiver le classement du mois précédent
   */
  static async archiveLeaderboard(monthToArchive) {
    try {
      // Calculer les dates du mois à archiver
      const monthDate = new Date(monthToArchive + '-01')
      const startOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
      const endOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
      
      // Vérifier si ce mois n'est pas déjà archivé
      const { data: existing } = await supabase
        .from('monthly_leaderboards')
        .select('id')
        .eq('month', monthToArchive)
        .single()
      
      if (existing) {
        console.log(`Le mois ${monthToArchive} est déjà archivé`)
        return existing
      }
      
      // Récupérer les données du classement
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id,display_name,avatar_url')
      
      const { data: recipesData } = await supabase
        .from('recipes')
        .select('user_id,created_at')
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString())
      
      // Calculer le classement final
      const recipesCountMap = {}
      ;(recipesData || []).forEach(r => {
        recipesCountMap[r.user_id] = (recipesCountMap[r.user_id] || 0) + 1
      })
      
      const leaderboardData = (profilesData || [])
        .map(profile => ({
          user_id: profile.user_id,
          display_name: profile.display_name || 'Utilisateur',
          avatar_url: profile.avatar_url || null,
          recipesCount: recipesCountMap[profile.user_id] || 0
        }))
        .filter(user => user.recipesCount > 0)
        .sort((a, b) => b.recipesCount - a.recipesCount)
      
      // Sauvegarder l'archive
      const { data, error } = await supabase
        .from('monthly_leaderboards')
        .insert({
          month: monthToArchive,
          leaderboard_data: leaderboardData,
          total_participants: leaderboardData.length,
          total_recipes: recipesData?.length || 0,
          created_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (error) {
        throw error
      }
      
      console.log(`Classement du mois ${monthToArchive} archivé avec succès:`, {
        participants: leaderboardData.length,
        totalRecipes: recipesData?.length || 0,
        winner: leaderboardData[0]?.display_name || 'Aucun'
      })
      
      return data
    } catch (error) {
      console.error('Erreur lors de l\'archivage du classement:', error)
      throw error
    }
  }

  /**
   * Notifier les utilisateurs de la réinitialisation mensuelle
   */
  static async notifyMonthlyReset(previousMonth, currentMonth) {
    try {
      // Créer une notification système pour tous les utilisateurs actifs
      const previousMonthLabel = this.getMonthLabel(previousMonth)
      const currentMonthLabel = this.getMonthLabel(currentMonth)
      
      // Envoyer une notification système (si le système de notifications existe)
      const notificationData = {
        type: 'monthly_reset',
        title: '🎊 Nouveau mois, nouveau classement !',
        message: `Le classement de ${previousMonthLabel} a été archivé. Place à ${currentMonthLabel} !`,
        data: {
          previousMonth,
          currentMonth,
          previousMonthLabel,
          currentMonthLabel
        },
        created_at: new Date().toISOString()
      }
      
      // Stocker la notification dans localStorage pour affichage
      const notifications = JSON.parse(localStorage.getItem('monthly_reset_notifications') || '[]')
      notifications.unshift(notificationData)
      localStorage.setItem('monthly_reset_notifications', JSON.stringify(notifications.slice(0, 5))) // Garder seulement les 5 dernières
      
      console.log('Notification de réinitialisation mensuelle créée:', notificationData)
      return notificationData
    } catch (error) {
      console.error('Erreur lors de la création de la notification:', error)
      throw error
    }
  }

  /**
   * Obtenir le classement du mois actuel
   */
  static async getCurrentMonthLeaderboard() {
    try {
      const now = new Date()
      const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      
      // Récupérer les profils
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id,display_name,avatar_url')
      
      if (profilesError) throw profilesError
      
      // Récupérer les recettes du mois actuel
      const { data: recipesData, error: recipesError } = await supabase
        .from('recipes')
        .select('user_id,created_at')
        .gte('created_at', startOfCurrentMonth.toISOString())
      
      if (recipesError) throw recipesError
      
      // Calculer le classement
      const recipesCountMap = {}
      ;(recipesData || []).forEach(r => {
        recipesCountMap[r.user_id] = (recipesCountMap[r.user_id] || 0) + 1
      })
      
      const leaderboard = (profilesData || [])
        .map(profile => ({
          user_id: profile.user_id,
          display_name: profile.display_name || 'Utilisateur',
          avatar_url: profile.avatar_url || null,
          recipesCount: recipesCountMap[profile.user_id] || 0
        }))
        .filter(user => user.recipesCount > 0)
        .sort((a, b) => b.recipesCount - a.recipesCount)
      
      return {
        success: true,
        data: leaderboard,
        month: now.toISOString().slice(0, 7),
        monthLabel: this.getMonthLabel(now.toISOString().slice(0, 7))
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du classement actuel:', error)
      return {
        success: false,
        error: error.message,
        data: []
      }
    }
  }

  /**
   * Obtenir l'historique des classements archivés
   */
  static async getLeaderboardHistory(limit = 12) {
    try {
      const { data, error } = await supabase
        .from('monthly_leaderboards')
        .select('*')
        .order('month', { ascending: false })
        .limit(limit)
      
      if (error) throw error
      
      return {
        success: true,
        data: data || []
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'historique:', error)
      return {
        success: false,
        error: error.message,
        data: []
      }
    }
  }

  /**
   * Obtenir le label d'un mois
   */
  static getMonthLabel(monthStr) {
    const [year, month] = monthStr.split('-')
    const monthNames = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ]
    return `${monthNames[parseInt(month) - 1]} ${year}`
  }

  /**
   * Obtenir l'emoji de saison
   */
  static getSeasonEmoji(monthStr) {
    const month = parseInt(monthStr.split('-')[1])
    if (month >= 3 && month <= 5) return '🌸' // Printemps
    if (month >= 6 && month <= 8) return '☀️' // Été
    if (month >= 9 && month <= 11) return '🍂' // Automne
    return '❄️' // Hiver
  }

  /**
   * Vérifier si un utilisateur était dans le top 3 le mois précédent
   */
  static async getUserPreviousMonthRank(userId) {
    try {
      const previousMonth = new Date()
      previousMonth.setMonth(previousMonth.getMonth() - 1)
      const monthStr = previousMonth.toISOString().slice(0, 7)
      
      const { data, error } = await supabase
        .from('monthly_leaderboards')
        .select('leaderboard_data')
        .eq('month', monthStr)
        .single()
      
      if (error || !data) return null
      
      const userRank = data.leaderboard_data.findIndex(user => user.user_id === userId)
      return userRank >= 0 ? userRank + 1 : null
    } catch (error) {
      console.error('Erreur lors de la récupération du rang précédent:', error)
      return null
    }
  }
}

export default MonthlyLeaderboardService
