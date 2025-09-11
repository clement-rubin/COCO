// Missions disponibles dans l'application
export const MISSIONS = [
  // === MISSIONS RECETTES ===
  {
    id: 'first_recipe',
    title: 'Première recette',
    description: 'Publiez votre première recette',
    icon: '📝',
    type: 'recipe_count',
    target: 1,
    reward: { coins: 50, xp: 25 },
    difficulty: 'facile',
    category: 'creation'
  },
  {
    id: 'recipe_apprentice',
    title: 'Apprenti cuisinier',
    description: 'Publiez 3 recettes',
    icon: '👨‍🍳',
    type: 'recipe_count',
    target: 3,
    reward: { coins: 120, xp: 60 },
    difficulty: 'facile',
    category: 'creation'
  },
  {
    id: 'recipe_master_5',
    title: 'Chef en herbe',
    description: 'Publiez 5 recettes',
    icon: '🍳',
    type: 'recipe_count',
    target: 5,
    reward: { coins: 200, xp: 100 },
    difficulty: 'moyen',
    category: 'creation'
  },
  {
    id: 'recipe_master_10',
    title: 'Maître cuisinier',
    description: 'Publiez 10 recettes',
    icon: '⭐',
    type: 'recipe_count',
    target: 10,
    reward: { coins: 400, xp: 200, item: 'hat_crown' },
    difficulty: 'difficile',
    category: 'creation'
  },
  {
    id: 'recipe_master_25',
    title: 'Chef étoilé',
    description: 'Publiez 25 recettes',
    icon: '🌟',
    type: 'recipe_count',
    target: 25,
    reward: { coins: 800, xp: 400, item: 'fx_fire' },
    difficulty: 'difficile',
    category: 'creation'
  },
  {
    id: 'recipe_legend',
    title: 'Légende culinaire',
    description: 'Publiez 50 recettes',
    icon: '👑',
    type: 'recipe_count',
    target: 50,
    reward: { coins: 1500, xp: 750, item: 'badge_early' },
    difficulty: 'légendaire',
    category: 'creation'
  },
  
  // === MISSIONS ENGAGEMENT SOCIAL ===
  {
    id: 'first_like',
    title: 'Premier admirateur',
    description: 'Recevez votre premier like',
    icon: '❤️',
    type: 'likes_received',
    target: 1,
    reward: { coins: 30, xp: 15 },
    difficulty: 'facile',
    category: 'social'
  },
  {
    id: 'liked_chef',
    title: 'Chef apprécié',
    description: 'Recevez 10 likes au total',
    icon: '💕',
    type: 'likes_received',
    target: 10,
    reward: { coins: 100, xp: 50 },
    difficulty: 'facile',
    category: 'social'
  },
  {
    id: 'popular_chef',
    title: 'Chef populaire',
    description: 'Recevez 50 likes au total',
    icon: '🌟',
    type: 'likes_received',
    target: 50,
    reward: { coins: 300, xp: 150, item: 'glasses_star' },
    difficulty: 'moyen',
    category: 'social'
  },
  {
    id: 'viral_recipe',
    title: 'Recette virale',
    description: 'Recevez 100 likes au total',
    icon: '🚀',
    type: 'likes_received',
    target: 100,
    reward: { coins: 600, xp: 300, item: 'fx_sparkle' },
    difficulty: 'difficile',
    category: 'social'
  },
  {
    id: 'influencer_chef',
    title: 'Chef influenceur',
    description: 'Recevez 250 likes au total',
    icon: '💫',
    type: 'likes_received',
    target: 250,
    reward: { coins: 1200, xp: 600, item: 'mascot_cat' },
    difficulty: 'difficile',
    category: 'social'
  },
  
  // === MISSIONS AMITIÉ ===
  {
    id: 'first_friend',
    title: 'Premier ami',
    description: 'Ajoutez votre premier ami',
    icon: '🤝',
    type: 'friends_count',
    target: 1,
    reward: { coins: 40, xp: 20 },
    difficulty: 'facile',
    category: 'social'
  },
  {
    id: 'social_butterfly',
    title: 'Papillon social',
    description: 'Ajoutez 5 amis',
    icon: '👥',
    type: 'friends_count',
    target: 5,
    reward: { coins: 150, xp: 75 },
    difficulty: 'moyen',
    category: 'social'
  },
  {
    id: 'community_builder',
    title: 'Créateur de communauté',
    description: 'Ajoutez 10 amis',
    icon: '🌐',
    type: 'friends_count',
    target: 10,
    reward: { coins: 300, xp: 150 },
    difficulty: 'difficile',
    category: 'social'
  },
  {
    id: 'network_master',
    title: 'Maître du réseau',
    description: 'Ajoutez 20 amis',
    icon: '🔗',
    type: 'friends_count',
    target: 20,
    reward: { coins: 500, xp: 250, item: 'apron_gold' },
    difficulty: 'difficile',
    category: 'social'
  },
  
  // === MISSIONS QUIZ & APPRENTISSAGE ===
  {
    id: 'first_quiz',
    title: 'Premier quiz',
    description: 'Réussissez votre premier quiz',
    icon: '🧠',
    type: 'quiz_success_count',
    target: 1,
    reward: { coins: 60, xp: 30 },
    difficulty: 'facile',
    category: 'knowledge'
  },
  {
    id: 'quiz_student',
    title: 'Étudiant assidu',
    description: 'Réussissez 5 quiz',
    icon: '📚',
    type: 'quiz_success_count',
    target: 5,
    reward: { coins: 200, xp: 100 },
    difficulty: 'moyen',
    category: 'knowledge'
  },
  {
    id: 'daily_quiz_streak_3',
    title: 'Expert quiz',
    description: 'Réussissez 3 quiz consécutifs',
    icon: '🎯',
    type: 'quiz_streak',
    target: 3,
    reward: { coins: 250, xp: 125, item: 'glasses_cool' },
    difficulty: 'moyen',
    category: 'knowledge'
  },
  {
    id: 'quiz_master',
    title: 'Maître des quiz',
    description: 'Réussissez 7 quiz consécutifs',
    icon: '🎓',
    type: 'quiz_streak',
    target: 7,
    reward: { coins: 500, xp: 250, item: 'hat_sombrero' },
    difficulty: 'difficile',
    category: 'knowledge'
  },
  {
    id: 'quiz_perfectionist',
    title: 'Quiz perfectionniste',
    description: 'Réussissez 15 quiz au total',
    icon: '💯',
    type: 'quiz_success_count',
    target: 15,
    reward: { coins: 600, xp: 300, item: 'fx_sparkle' },
    difficulty: 'difficile',
    category: 'knowledge'
  },
  
  // === MISSIONS ASSIDUITÉ ===
  {
    id: 'login_streak_3',
    title: 'Régulier',
    description: 'Connectez-vous 3 jours consécutifs',
    icon: '🔥',
    type: 'login_streak',
    target: 3,
    reward: { coins: 100, xp: 50 },
    difficulty: 'facile',
    category: 'engagement'
  },
  {
    id: 'login_streak_7',
    title: 'Assidu',
    description: 'Connectez-vous 7 jours consécutifs',
    icon: '🔥',
    type: 'login_streak',
    target: 7,
    reward: { coins: 300, xp: 150, item: 'apron_red' },
    difficulty: 'moyen',
    category: 'engagement'
  },
  {
    id: 'login_streak_14',
    title: 'Dévoué',
    description: 'Connectez-vous 14 jours consécutifs',
    icon: '💪',
    type: 'login_streak',
    target: 14,
    reward: { coins: 600, xp: 300, item: 'spoon_gold' },
    difficulty: 'difficile',
    category: 'engagement'
  },
  {
    id: 'login_streak_30',
    title: 'Fidèle compagnon',
    description: 'Connectez-vous 30 jours consécutifs',
    icon: '💎',
    type: 'login_streak',
    target: 30,
    reward: { coins: 1500, xp: 750, item: 'fx_fire' },
    difficulty: 'légendaire',
    category: 'engagement'
  },
  
  // === MISSIONS INTERACTION ===
  {
    id: 'first_comment_given',
    title: 'Premier commentaire',
    description: 'Laissez votre premier commentaire',
    icon: '💬',
    type: 'comments_given',
    target: 1,
    reward: { coins: 25, xp: 15 },
    difficulty: 'facile',
    category: 'interaction'
  },
  {
    id: 'active_commenter',
    title: 'Commentateur actif',
    description: 'Laissez 10 commentaires',
    icon: '📝',
    type: 'comments_given',
    target: 10,
    reward: { coins: 150, xp: 75 },
    difficulty: 'moyen',
    category: 'interaction'
  },
  {
    id: 'discussion_starter',
    title: 'Lanceur de discussions',
    description: 'Laissez 25 commentaires',
    icon: '🗣️',
    type: 'comments_given',
    target: 25,
    reward: { coins: 300, xp: 150, item: 'mustache' },
    difficulty: 'difficile',
    category: 'interaction'
  },
  
  // === MISSIONS SPÉCIALES & PROFIL ===
  {
    id: 'complete_profile',
    title: 'Profil complet',
    description: 'Ajoutez photo et nom d\'affichage',
    icon: '�',
    type: 'profile_complete',
    target: 1,
    reward: { coins: 100, xp: 50 },
    difficulty: 'facile',
    category: 'profile'
  },
  {
    id: 'avatar_customizer',
    title: 'Personnalisateur d\'avatar',
    description: 'Équipez 3 objets cosmétiques',
    icon: '🎭',
    type: 'equipped_items',
    target: 3,
    reward: { coins: 200, xp: 100 },
    difficulty: 'moyen',
    category: 'customization'
  },
  {
    id: 'collector',
    title: 'Collectionneur',
    description: 'Possédez 10 objets cosmétiques',
    icon: '🏆',
    type: 'owned_items',
    target: 10,
    reward: { coins: 400, xp: 200, item: 'bg_kitchen' },
    difficulty: 'difficile',
    category: 'customization'
  },
  {
    id: 'shopaholic',
    title: 'Accro du shopping',
    description: 'Achetez 15 objets dans la boutique',
    icon: '�️',
    type: 'purchased_items',
    target: 15,
    reward: { coins: 600, xp: 300, item: 'mascot_chick' },
    difficulty: 'difficile',
    category: 'customization'
  },
  {
    id: 'early_adopter',
    title: 'Utilisateur précoce',
    description: 'Rejoingnez COCO avant 2025',
    icon: '🚀',
    type: 'special_early',
    target: 1,
    reward: { coins: 500, xp: 250, item: 'badge_early' },
    difficulty: 'spécial',
    category: 'special'
  },
  {
    id: 'recipe_diversity',
    title: 'Chef polyvalent',
    description: 'Publiez des recettes de 5 catégories différentes',
    icon: '🌈',
    type: 'recipe_categories',
    target: 5,
    reward: { coins: 400, xp: 200, item: 'bg_jungle' },
    difficulty: 'difficile',
    category: 'creation'
  },
  {
    id: 'weekend_warrior',
    title: 'Guerrier du week-end',
    description: 'Publiez 3 recettes le week-end',
    icon: '🎉',
    type: 'weekend_recipes',
    target: 3,
    reward: { coins: 200, xp: 100 },
    difficulty: 'moyen',
    category: 'special'
  },
  {
    id: 'night_chef',
    title: 'Chef de nuit',
    description: 'Publiez une recette après 22h',
    icon: '🌙',
    type: 'night_recipe',
    target: 1,
    reward: { coins: 150, xp: 75 },
    difficulty: 'moyen',
    category: 'special'
  },
  {
    id: 'rapid_fire',
    title: 'Mitraillette culinaire',
    description: 'Publiez 3 recettes en une journée',
    icon: '⚡',
    type: 'daily_recipes',
    target: 3,
    reward: { coins: 300, xp: 150, item: 'pepper' },
    difficulty: 'difficile',
    category: 'special'
  },
  
  // === MISSIONS SAISONNIÈRES ===
  {
    id: 'january_resolutions',
    title: 'Résolutions de janvier',
    description: 'Publiez 5 recettes saines en janvier',
    icon: '🥗',
    type: 'monthly_healthy_recipes',
    target: 5,
    reward: { coins: 400, xp: 200, item: 'bg_jungle' },
    difficulty: 'moyen',
    category: 'seasonal',
    active_months: [1] // Janvier uniquement
  },
  {
    id: 'valentines_special',
    title: 'Chef romantique',
    description: 'Publiez une recette pour la Saint-Valentin',
    icon: '💖',
    type: 'valentine_recipe',
    target: 1,
    reward: { coins: 200, xp: 100, item: 'fx_sparkle' },
    difficulty: 'facile',
    category: 'seasonal',
    active_months: [2] // Février uniquement
  },
  {
    id: 'summer_bbq',
    title: 'Roi du barbecue',
    description: 'Partagez 3 recettes de grillades en été',
    icon: '🔥',
    type: 'summer_bbq_recipes',
    target: 3,
    reward: { coins: 350, xp: 175, item: 'apron_red' },
    difficulty: 'moyen',
    category: 'seasonal',
    active_months: [6, 7, 8] // Été
  },
  {
    id: 'christmas_baker',
    title: 'Pâtissier de Noël',
    description: 'Publiez 2 recettes de desserts en décembre',
    icon: '🎄',
    type: 'christmas_desserts',
    target: 2,
    reward: { coins: 500, xp: 250, item: 'hat_crown' },
    difficulty: 'moyen',
    category: 'seasonal',
    active_months: [12] // Décembre uniquement
  },
  
  // === MISSIONS DÉFI COMMUNAUTÉ ===
  {
    id: 'community_challenge_100',
    title: 'Défi communauté',
    description: 'Participez au défi des 100 recettes',
    icon: '🏆',
    type: 'community_recipes_goal',
    target: 1,
    reward: { coins: 1000, xp: 500, item: 'badge_early' },
    difficulty: 'spécial',
    category: 'community'
  },
  {
    id: 'helping_hand',
    title: 'Main secourable',
    description: 'Aidez 5 nouveaux utilisateurs avec des commentaires',
    icon: '🤲',
    type: 'help_new_users',
    target: 5,
    reward: { coins: 300, xp: 150, item: 'bg_kitchen' },
    difficulty: 'moyen',
    category: 'community'
  },
  {
    id: 'recipe_reviewer',
    title: 'Critique culinaire',
    description: 'Laissez des commentaires constructifs sur 20 recettes',
    icon: '📋',
    type: 'constructive_comments',
    target: 20,
    reward: { coins: 400, xp: 200, item: 'glasses_star' },
    difficulty: 'difficile',
    category: 'community'
  },
  
  // === MISSIONS EXPLORATION ===
  {
    id: 'world_explorer',
    title: 'Explorateur culinaire',
    description: 'Publiez des recettes de 8 cuisines du monde',
    icon: '🌍',
    type: 'world_cuisines',
    target: 8,
    reward: { coins: 800, xp: 400, item: 'mascot_chick' },
    difficulty: 'difficile',
    category: 'exploration'
  },
  {
    id: 'ingredient_master',
    title: 'Maître des ingrédients',
    description: 'Utilisez 50 ingrédients différents',
    icon: '🥕',
    type: 'unique_ingredients',
    target: 50,
    reward: { coins: 600, xp: 300, item: 'spoon_gold' },
    difficulty: 'difficile',
    category: 'exploration'
  },
  {
    id: 'technique_virtuoso',
    title: 'Virtuose des techniques',
    description: 'Maîtrisez 10 techniques de cuisine différentes',
    icon: '🎭',
    type: 'cooking_techniques',
    target: 10,
    reward: { coins: 700, xp: 350, item: 'fork_silver' },
    difficulty: 'difficile',
    category: 'exploration'
  },
  
  // === MISSIONS CRÉATIVITÉ ===
  {
    id: 'fusion_chef',
    title: 'Chef fusion',
    description: 'Créez 3 recettes fusion originales',
    icon: '🌈',
    type: 'fusion_recipes',
    target: 3,
    reward: { coins: 400, xp: 200, item: 'mustache' },
    difficulty: 'difficile',
    category: 'creativity'
  },
  {
    id: 'leftover_master',
    title: 'Roi des restes',
    description: 'Publiez 5 recettes anti-gaspi',
    icon: '♻️',
    type: 'leftover_recipes',
    target: 5,
    reward: { coins: 300, xp: 150, item: 'beard' },
    difficulty: 'moyen',
    category: 'creativity'
  },
  {
    id: 'speed_demon',
    title: 'Démon de la vitesse',
    description: 'Partagez 5 recettes rapides (moins de 15 min)',
    icon: '💨',
    type: 'quick_recipes',
    target: 5,
    reward: { coins: 250, xp: 125 },
    difficulty: 'moyen',
    category: 'creativity'
  }
];

// Fonction pour calculer le progrès d'une mission avec vraies données
export const getCurrentProgress = async (mission, stats, user, supabase) => {
  if (!stats || !user) return 0;
  
  try {
    switch (mission.type) {
      // === MISSIONS RECETTES ===
      case 'recipe_count':
        return stats.recipesCount || 0;
        
      case 'recipe_categories':
        if (!supabase) return 0;
        const { data: recipes } = await supabase
          .from('recipes')
          .select('category')
          .eq('user_id', user.id);
        const uniqueCategories = [...new Set(recipes?.map(r => r.category) || [])];
        return uniqueCategories.length;
        
      case 'weekend_recipes':
        if (!supabase) return 0;
        const { data: weekendRecipes } = await supabase
          .from('recipes')
          .select('created_at')
          .eq('user_id', user.id);
        const weekendCount = weekendRecipes?.filter(r => {
          const day = new Date(r.created_at).getDay();
          return day === 0 || day === 6; // Dimanche ou Samedi
        }).length || 0;
        return weekendCount;
        
      case 'night_recipe':
        if (!supabase) return 0;
        const { data: nightRecipes } = await supabase
          .from('recipes')
          .select('created_at')
          .eq('user_id', user.id);
        const nightCount = nightRecipes?.filter(r => {
          const hour = new Date(r.created_at).getHours();
          return hour >= 22 || hour <= 6;
        }).length || 0;
        return nightCount > 0 ? 1 : 0;
        
      case 'daily_recipes':
        if (!supabase) return 0;
        const today = new Date().toISOString().split('T')[0];
        const { data: todayRecipes } = await supabase
          .from('recipes')
          .select('id')
          .eq('user_id', user.id)
          .gte('created_at', today + 'T00:00:00')
          .lt('created_at', today + 'T23:59:59');
        return todayRecipes?.length || 0;
      
      // === MISSIONS SOCIALES ===
      case 'likes_received':
        return stats.likesReceived || 0;
        
      case 'friends_count':
        return stats.friendsCount || 0;
        
      // === MISSIONS QUIZ ===
      case 'quiz_success_count':
        try {
          const quizHistory = JSON.parse(localStorage.getItem('coco_quiz_history') || '[]');
          return quizHistory.filter(q => q.success).length;
        } catch {
          return 0;
        }
        
      case 'quiz_streak':
        try {
          const quizHistory = JSON.parse(localStorage.getItem('coco_quiz_history') || '[]');
          let currentStreak = 0;
          for (let i = quizHistory.length - 1; i >= 0; i--) {
            if (quizHistory[i].success) {
              currentStreak++;
            } else {
              break;
            }
          }
          return currentStreak;
        } catch {
          return 0;
        }
      
      // === MISSIONS ASSIDUITÉ ===
      case 'login_streak':
        return stats.streak || 0;
        
      // === MISSIONS INTERACTION ===
      case 'comments_given':
        if (!supabase) return 0;
        const { data: comments } = await supabase
          .from('comments')
          .select('id')
          .eq('user_id', user.id);
        return comments?.length || 0;
        
      // === MISSIONS PROFIL & CUSTOMISATION ===
      case 'profile_complete':
        const hasDisplayName = user?.user_metadata?.display_name;
        const hasAvatar = user?.user_metadata?.avatar_url;
        return (hasDisplayName && hasAvatar) ? 1 : 0;
        
      case 'equipped_items':
        try {
          if (!supabase) return 0;
          const { data: userPass } = await supabase
            .from('user_pass')
            .select('equipped')
            .eq('user_id', user.id)
            .single();
          const equipped = userPass?.equipped || {};
          return Object.values(equipped).filter(item => item !== null).length;
        } catch {
          return 0;
        }
        
      case 'owned_items':
        try {
          if (!supabase) return 0;
          const { data: userPass } = await supabase
            .from('user_pass')
            .select('owned_items')
            .eq('user_id', user.id)
            .single();
          return userPass?.owned_items?.length || 0;
        } catch {
          return 0;
        }
        
      case 'purchased_items':
        try {
          const purchaseHistory = JSON.parse(localStorage.getItem('coco_purchase_history') || '[]');
          return purchaseHistory.length;
        } catch {
          return 0;
        }
        
      // === MISSIONS SPÉCIALES ===
      case 'special_early':
        const joinDate = new Date(user?.created_at || Date.now());
        const cutoffDate = new Date('2025-01-01');
        return joinDate < cutoffDate ? 1 : 0;
        
      // === MISSIONS SAISONNIÈRES ===
      case 'monthly_healthy_recipes':
        if (!supabase) return 0;
        const currentMonth = new Date().getMonth() + 1;
        if (currentMonth !== 1) return 0; // Janvier seulement
        const { data: healthyRecipes } = await supabase
          .from('recipes')
          .select('category, created_at')
          .eq('user_id', user.id)
          .eq('category', 'healthy')
          .gte('created_at', new Date(new Date().getFullYear(), 0, 1).toISOString());
        return healthyRecipes?.length || 0;
        
      case 'valentine_recipe':
        if (!supabase) return 0;
        const currentMonth2 = new Date().getMonth() + 1;
        if (currentMonth2 !== 2) return 0; // Février seulement
        const { data: valentineRecipes } = await supabase
          .from('recipes')
          .select('tags')
          .eq('user_id', user.id)
          .contains('tags', ['valentine', 'romantic', 'love']);
        return valentineRecipes?.length || 0;
        
      // === MISSIONS COMMUNAUTÉ ===
      case 'community_recipes_goal':
        // Mission spéciale - toujours à 1 si l'utilisateur a participé
        return 1;
        
      case 'help_new_users':
        if (!supabase) return 0;
        // Compter les commentaires sur des recettes d'utilisateurs récents
        const { data: helpComments } = await supabase
          .from('comments')
          .select(`
            id,
            recipes!inner(user_id, profiles!inner(created_at))
          `)
          .eq('user_id', user.id);
        
        const recentUserComments = helpComments?.filter(comment => {
          const userCreatedAt = new Date(comment.recipes.profiles.created_at);
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          return userCreatedAt > thirtyDaysAgo;
        }) || [];
        
        return Math.min(recentUserComments.length, mission.target);
        
      case 'constructive_comments':
        if (!supabase) return 0;
        const { data: allComments } = await supabase
          .from('comments')
          .select('content')
          .eq('user_id', user.id);
        
        // Filtrer les commentaires "constructifs" (plus de 20 caractères)
        const constructiveComments = allComments?.filter(c => 
          c.content && c.content.length > 20
        ) || [];
        
        return constructiveComments.length;
        
      // === MISSIONS EXPLORATION ===
      case 'world_cuisines':
        if (!supabase) return 0;
        const { data: cuisineRecipes } = await supabase
          .from('recipes')
          .select('cuisine_type')
          .eq('user_id', user.id);
        const uniqueCuisines = [...new Set(cuisineRecipes?.map(r => r.cuisine_type).filter(Boolean) || [])];
        return uniqueCuisines.length;
        
      case 'unique_ingredients':
        if (!supabase) return 0;
        const { data: ingredientRecipes } = await supabase
          .from('recipes')
          .select('ingredients')
          .eq('user_id', user.id);
        const allIngredients = new Set();
        ingredientRecipes?.forEach(recipe => {
          if (recipe.ingredients) {
            // Parser les ingrédients (supposons un format JSON ou texte)
            try {
              const ingredients = typeof recipe.ingredients === 'string' 
                ? JSON.parse(recipe.ingredients) 
                : recipe.ingredients;
              ingredients.forEach(ing => allIngredients.add(ing.toLowerCase()));
            } catch {
              // Si ce n'est pas du JSON, traiter comme du texte
              const ingredients = recipe.ingredients.split(/[,\n]/).map(i => i.trim().toLowerCase());
              ingredients.forEach(ing => allIngredients.add(ing));
            }
          }
        });
        return allIngredients.size;
        
      // === MISSIONS CRÉATIVITÉ ===
      case 'fusion_recipes':
        if (!supabase) return 0;
        const { data: fusionRecipes } = await supabase
          .from('recipes')
          .select('tags')
          .eq('user_id', user.id)
          .contains('tags', ['fusion']);
        return fusionRecipes?.length || 0;
        
      case 'leftover_recipes':
        if (!supabase) return 0;
        const { data: leftoverRecipes } = await supabase
          .from('recipes')
          .select('tags')
          .eq('user_id', user.id)
          .or('tags.cs.{leftover,anti-gaspi,reste}');
        return leftoverRecipes?.length || 0;
        
      case 'quick_recipes':
        if (!supabase) return 0;
        const { data: quickRecipes } = await supabase
          .from('recipes')
          .select('prep_time, cook_time')
          .eq('user_id', user.id);
        const fastRecipes = quickRecipes?.filter(r => {
          const totalTime = (r.prep_time || 0) + (r.cook_time || 0);
          return totalTime <= 15;
        }) || [];
        return fastRecipes.length;
        
      default:
        return 0;
    }
  } catch (error) {
    console.error(`Erreur lors du calcul du progrès pour la mission ${mission.id}:`, error);
    return 0;
  }
};

// Fonction pour filtrer les missions selon la saison
export const getSeasonallyAvailableMissions = () => {
  const currentMonth = new Date().getMonth() + 1; // 1-12
  
  return MISSIONS.filter(mission => {
    // Si la mission n'a pas de restriction saisonnière, elle est toujours disponible
    if (!mission.active_months) return true;
    
    // Vérifier si le mois actuel est dans la liste des mois actifs
    return mission.active_months.includes(currentMonth);
  });
};

// Fonction pour obtenir les missions actives
export const getActiveMissions = () => {
  try {
    const saved = JSON.parse(localStorage.getItem('coco_missions') || '[]');
    if (saved.length > 0) {
      // Filtrer les missions qui ne sont plus saisonnièrement disponibles
      const availableMissions = getSeasonallyAvailableMissions();
      const validSaved = saved.filter(mission => 
        availableMissions.some(available => available.id === mission.id)
      );
      
      // Si certaines missions ne sont plus disponibles, remplacer
      if (validSaved.length < saved.length) {
        const remainingSlots = 6 - validSaved.length;
        const newMissions = availableMissions
          .filter(m => !validSaved.some(v => v.id === m.id))
          .slice(0, remainingSlots);
        
        const updatedMissions = [...validSaved, ...newMissions];
        localStorage.setItem('coco_missions', JSON.stringify(updatedMissions));
        return updatedMissions;
      }
      
      return validSaved;
    }
    
    // Première fois : sélectionner des missions incluant les saisonnières
    const availableMissions = getSeasonallyAvailableMissions();
    const initialMissions = availableMissions.slice(0, 6);
    localStorage.setItem('coco_missions', JSON.stringify(initialMissions));
    return initialMissions;
  } catch {
    const availableMissions = getSeasonallyAvailableMissions();
    return availableMissions.slice(0, 6);
  }
};

// Fonction pour obtenir les missions complétées
export const getCompletedMissions = () => {
  try {
    return JSON.parse(localStorage.getItem('coco_completed_missions') || '[]');
  } catch {
    return [];
  }
};

// Fonction pour marquer une mission comme complétée
export const completeMission = (missionId) => {
  const completed = getCompletedMissions();
  if (!completed.includes(missionId)) {
    const newCompleted = [...completed, missionId];
    localStorage.setItem('coco_completed_missions', JSON.stringify(newCompleted));
    return true;
  }
  return false;
};

// Fonction pour obtenir une nouvelle mission aléatoire
export const getRandomMission = (excludeIds = []) => {
  const completed = getCompletedMissions();
  const active = getActiveMissions();
  
  const available = MISSIONS.filter(mission => 
    !completed.includes(mission.id) && 
    !active.find(active => active.id === mission.id) &&
    !excludeIds.includes(mission.id)
  );
  
  if (available.length === 0) return null;
  
  return available[Math.floor(Math.random() * available.length)];
};

// Fonction pour sauvegarder les missions actives
export const saveActiveMissions = (missions) => {
  localStorage.setItem('coco_missions', JSON.stringify(missions));
};

// Fonction pour vérifier si une mission peut être complétée
export const canCompleteMission = async (mission, stats, user, supabase) => {
  const progress = await getCurrentProgress(mission, stats, user, supabase);
  const completed = getCompletedMissions();
  
  return progress >= mission.target && !completed.includes(mission.id);
};

// Fonction pour obtenir le pourcentage de progression d'une mission
export const getMissionProgress = async (mission, stats, user, supabase) => {
  const progress = await getCurrentProgress(mission, stats, user, supabase);
  return Math.min(100, (progress / mission.target) * 100);
};

// Fonction pour obtenir les missions par catégorie
export const getMissionsByCategory = (category = null) => {
  if (!category) return MISSIONS;
  return MISSIONS.filter(mission => mission.category === category);
};

// Fonction pour obtenir les difficultés de missions
export const MISSION_DIFFICULTIES = {
  'facile': { color: '#10b981', label: 'Facile', multiplier: 1 },
  'moyen': { color: '#f59e0b', label: 'Moyen', multiplier: 1.5 },
  'difficile': { color: '#ef4444', label: 'Difficile', multiplier: 2 },
  'légendaire': { color: '#8b5cf6', label: 'Légendaire', multiplier: 3 },
  'spécial': { color: '#06b6d4', label: 'Spécial', multiplier: 1 }
};

// Fonction pour synchroniser les missions avec les données utilisateur
export const syncMissionsWithUserData = async (user, supabase) => {
  if (!user || !supabase) return [];

  const activeMissions = getActiveMissions();
  const completedMissions = getCompletedMissions();
  
  // Obtenir les stats utilisateur
  const stats = await getUserStatsComplete(user.id);
  
  // Vérifier chaque mission active
  const updatedMissions = [];
  const newlyCompleted = [];
  
  for (const mission of activeMissions) {
    const progress = await getCurrentProgress(mission, stats, user, supabase);
    
    if (progress >= mission.target && !completedMissions.includes(mission.id)) {
      newlyCompleted.push(mission);
    } else {
      updatedMissions.push(mission);
    }
  }
  
  // Marquer les nouvelles missions complétées
  if (newlyCompleted.length > 0) {
    const allCompleted = [...completedMissions, ...newlyCompleted.map(m => m.id)];
    localStorage.setItem('coco_completed_missions', JSON.stringify(allCompleted));
  }
  
  // Ajouter de nouvelles missions pour remplacer celles complétées
  const availableMissions = MISSIONS.filter(m => 
    !completedMissions.includes(m.id) && 
    !newlyCompleted.some(nm => nm.id === m.id) &&
    !updatedMissions.some(um => um.id === m.id)
  );
  
  // Ajouter jusqu'à 6 missions actives
  while (updatedMissions.length < 6 && availableMissions.length > 0) {
    const randomIndex = Math.floor(Math.random() * availableMissions.length);
    const selectedMission = availableMissions.splice(randomIndex, 1)[0];
    updatedMissions.push(selectedMission);
  }
  
  // Sauvegarder les missions actives
  saveActiveMissions(updatedMissions);
  
  return {
    activeMissions: updatedMissions,
    newlyCompleted: newlyCompleted,
    totalCompleted: completedMissions.length + newlyCompleted.length
  };
};

// Import des fonctions utilisateur si disponibles
let getUserStatsComplete;
try {
  getUserStatsComplete = require('../utils/profileUtils').getUserStatsComplete;
} catch {
  getUserStatsComplete = async () => ({ recipesCount: 0, friendsCount: 0, likesReceived: 0, streak: 0 });
}