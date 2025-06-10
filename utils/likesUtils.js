/**
 * Utility functions for managing realistic like patterns and behavior
 */

import { logInfo, logError } from './logger'

/**
 * Generate realistic like counts based on content quality and time
 * @param {Object} content - Content object with metadata
 * @returns {number} Realistic like count
 */
export function generateRealisticLikes(content) {
  const {
    createdAt,
    difficulty = 'Moyen',
    category = 'Autre',
    ingredientsCount = 5,
    instructionsCount = 5,
    authorReputation = 1
  } = content

  // Base like count based on content complexity
  let baseLikes = 10 + (ingredientsCount * 2) + (instructionsCount * 3)

  // Difficulty multiplier
  const difficultyMultipliers = {
    'Facile': 1.5,
    'Moyen': 1.2,
    'Difficile': 0.9
  }
  baseLikes *= difficultyMultipliers[difficulty] || 1

  // Category popularity multiplier
  const categoryMultipliers = {
    'Dessert': 1.8,
    'Italien': 1.6,
    'Végétarien': 1.4,
    'BBQ': 1.3,
    'Asiatique': 1.2,
    'Healthy': 1.1,
    'Autre': 1.0
  }
  baseLikes *= categoryMultipliers[category] || 1

  // Time decay factor (newer content gets more engagement)
  if (createdAt) {
    const daysSinceCreated = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
    const timeFactor = Math.max(0.3, 1 - (daysSinceCreated / 30)) // Decay over 30 days
    baseLikes *= timeFactor
  }

  // Author reputation factor
  baseLikes *= authorReputation

  // Add some randomness for realism
  const randomFactor = 0.7 + (Math.random() * 0.6) // Between 0.7 and 1.3
  baseLikes *= randomFactor

  return Math.round(Math.max(1, baseLikes))
}

/**
 * Simulate realistic like growth over time
 * @param {number} initialLikes - Starting like count
 * @param {number} hoursElapsed - Hours since content creation
 * @returns {number} Updated like count
 */
export function simulateLikeGrowth(initialLikes, hoursElapsed) {
  // Viral growth pattern: fast initial growth, then slower
  const growthRate = Math.max(0.1, 2 - (hoursElapsed / 24)) // Decreases over days
  const randomGrowth = Math.random() * growthRate
  const newLikes = Math.round(initialLikes * (1 + randomGrowth * 0.1))
  
  return Math.max(initialLikes, newLikes)
}

/**
 * Get like analytics for content
 * @param {Array} likes - Array of like objects with timestamps
 * @returns {Object} Analytics data
 */
export function getLikeAnalytics(likes) {
  if (!Array.isArray(likes) || likes.length === 0) {
    return {
      total: 0,
      today: 0,
      thisWeek: 0,
      thisMonth: 0,
      trend: 'stable',
      peakHour: null,
      engagementRate: 0
    }
  }

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

  const todayLikes = likes.filter(like => new Date(like.timestamp) >= today).length
  const weekLikes = likes.filter(like => new Date(like.timestamp) >= weekAgo).length
  const monthLikes = likes.filter(like => new Date(like.timestamp) >= monthAgo).length

  // Calculate trend
  const lastWeekLikes = likes.filter(like => {
    const likeDate = new Date(like.timestamp)
    return likeDate >= new Date(weekAgo.getTime() - 7 * 24 * 60 * 60 * 1000) && likeDate < weekAgo
  }).length

  let trend = 'stable'
  if (weekLikes > lastWeekLikes * 1.2) trend = 'rising'
  else if (weekLikes < lastWeekLikes * 0.8) trend = 'falling'

  // Find peak hour
  const hourCounts = {}
  likes.forEach(like => {
    const hour = new Date(like.timestamp).getHours()
    hourCounts[hour] = (hourCounts[hour] || 0) + 1
  })
  const peakHour = Object.keys(hourCounts).reduce((a, b) => 
    hourCounts[a] > hourCounts[b] ? a : b, null
  )

  return {
    total: likes.length,
    today: todayLikes,
    thisWeek: weekLikes,
    thisMonth: monthLikes,
    trend,
    peakHour: peakHour ? parseInt(peakHour) : null,
    engagementRate: Math.round((weekLikes / Math.max(1, likes.length)) * 100)
  }
}

/**
 * Predict optimal posting time based on historical like patterns
 * @param {Array} historicalLikes - Historical like data
 * @returns {Object} Optimal posting recommendations
 */
export function getOptimalPostingTime(historicalLikes) {
  if (!Array.isArray(historicalLikes) || historicalLikes.length < 10) {
    return {
      recommendedHour: 19, // Default to 7 PM
      recommendedDay: 'Sunday',
      confidence: 'low',
      reason: 'Insufficient data'
    }
  }

  // Analyze by hour
  const hourEngagement = {}
  const dayEngagement = {}

  historicalLikes.forEach(like => {
    const date = new Date(like.timestamp)
    const hour = date.getHours()
    const day = date.toLocaleDateString('fr-FR', { weekday: 'long' })

    hourEngagement[hour] = (hourEngagement[hour] || 0) + 1
    dayEngagement[day] = (dayEngagement[day] || 0) + 1
  })

  const bestHour = Object.keys(hourEngagement).reduce((a, b) => 
    hourEngagement[a] > hourEngagement[b] ? a : b
  )

  const bestDay = Object.keys(dayEngagement).reduce((a, b) => 
    dayEngagement[a] > dayEngagement[b] ? a : b
  )

  const confidence = historicalLikes.length > 100 ? 'high' : 
                    historicalLikes.length > 50 ? 'medium' : 'low'

  return {
    recommendedHour: parseInt(bestHour),
    recommendedDay: bestDay,
    confidence,
    reason: `Based on ${historicalLikes.length} data points`
  }
}

/**
 * Create realistic like distribution for content
 * @param {number} totalLikes - Total number of likes to distribute
 * @param {number} daysOld - How many days old the content is
 * @returns {Array} Array of like timestamps
 */
export function createRealisticLikeDistribution(totalLikes, daysOld = 1) {
  const likes = []
  const now = Date.now()
  const contentAge = daysOld * 24 * 60 * 60 * 1000

  for (let i = 0; i < totalLikes; i++) {
    // Most likes happen in the first few hours, then taper off
    const randomFactor = Math.random()
    let timeOffset

    if (randomFactor < 0.4) {
      // 40% of likes in first 6 hours
      timeOffset = Math.random() * 6 * 60 * 60 * 1000
    } else if (randomFactor < 0.7) {
      // 30% of likes in first day
      timeOffset = (6 * 60 * 60 * 1000) + (Math.random() * 18 * 60 * 60 * 1000)
    } else {
      // 30% of likes spread over remaining time
      timeOffset = (24 * 60 * 60 * 1000) + (Math.random() * (contentAge - 24 * 60 * 60 * 1000))
    }

    likes.push({
      id: `like_${i}`,
      timestamp: new Date(now - contentAge + timeOffset).toISOString(),
      userId: `user_${Math.floor(Math.random() * 1000)}`
    })
  }

  return likes.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
}

/**
 * Calculate like velocity (likes per hour)
 * @param {Array} likes - Array of like objects
 * @param {number} hours - Time window in hours
 * @returns {number} Likes per hour
 */
export function calculateLikeVelocity(likes, hours = 24) {
  if (!Array.isArray(likes) || likes.length === 0) return 0

  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000)
  const recentLikes = likes.filter(like => new Date(like.timestamp) >= cutoff)
  
  return Math.round((recentLikes.length / hours) * 10) / 10 // Round to 1 decimal
}

/**
 * Detect suspicious like patterns (for spam prevention)
 * @param {Array} likes - Array of like objects
 * @returns {Object} Spam detection results
 */
export function detectSuspiciousLikePatterns(likes) {
  if (!Array.isArray(likes) || likes.length === 0) {
    return { suspicious: false, reasons: [] }
  }

  const reasons = []
  const userCounts = {}
  let suspicious = false

  // Count likes per user
  likes.forEach(like => {
    userCounts[like.userId] = (userCounts[like.userId] || 0) + 1
  })

  // Check for repeated likes from same user
  const maxLikesPerUser = Math.max(...Object.values(userCounts))
  if (maxLikesPerUser > 3) {
    suspicious = true
    reasons.push('Multiple likes from same user')
  }

  // Check for burst patterns (too many likes in short time)
  const recentLikes = likes.filter(like => 
    new Date(like.timestamp) > new Date(Date.now() - 60 * 60 * 1000) // Last hour
  )
  
  if (recentLikes.length > likes.length * 0.8) {
    suspicious = true
    reasons.push('Unusual burst of likes')
  }

  // Check for bot-like timing patterns
  const timeDiffs = likes.slice(1).map((like, i) => 
    new Date(like.timestamp) - new Date(likes[i].timestamp)
  )
  
  const avgTimeDiff = timeDiffs.reduce((sum, diff) => sum + diff, 0) / timeDiffs.length
  const suspiciouslyRegular = timeDiffs.every(diff => Math.abs(diff - avgTimeDiff) < 1000) // Within 1 second

  if (suspiciouslyRegular && timeDiffs.length > 5) {
    suspicious = true
    reasons.push('Suspiciously regular timing')
  }

  return { suspicious, reasons, confidence: suspicious ? 'high' : 'low' }
}

/**
 * Format like count for display with appropriate abbreviations
 * @param {number} count - Number of likes
 * @returns {string} Formatted like count
 */
export function formatLikeCount(count) {
  if (count < 1000) return count.toString()
  if (count < 1000000) return `${(count / 1000).toFixed(1)}k`
  return `${(count / 1000000).toFixed(1)}M`
}

/**
 * Get like insights for content creators
 * @param {Object} content - Content with like data
 * @returns {Object} Actionable insights
 */
export function getLikeInsights(content) {
  const { likes = [], views = 0, shares = 0 } = content
  
  const analytics = getLikeAnalytics(likes)
  const velocity = calculateLikeVelocity(likes)
  const engagementRate = views > 0 ? (likes.length / views) * 100 : 0
  
  const insights = []
  
  if (analytics.trend === 'rising') {
    insights.push({
      type: 'positive',
      message: 'Votre contenu gagne en popularité ! 📈',
      suggestion: 'Continuez sur cette lancée en publiant du contenu similaire.'
    })
  }
  
  if (velocity > 5) {
    insights.push({
      type: 'positive',
      message: 'Excellent taux d\'engagement ! 🔥',
      suggestion: 'Votre contenu est viral. Profitez-en pour interagir avec votre audience.'
    })
  }
  
  if (engagementRate < 2) {
    insights.push({
      type: 'improvement',
      message: 'Le taux d\'engagement pourrait être amélioré 🎯',
      suggestion: 'Essayez des titres plus accrocheurs ou publiez à des heures différentes.'
    })
  }
  
  if (analytics.peakHour !== null) {
    insights.push({
      type: 'info',
      message: `Votre audience est plus active à ${analytics.peakHour}h ⏰`,
      suggestion: 'Planifiez vos publications à cette heure pour plus d\'impact.'
    })
  }
  
  return {
    analytics,
    velocity,
    engagementRate: Math.round(engagementRate * 10) / 10,
    insights
  }
}
