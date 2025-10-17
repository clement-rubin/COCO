import PropTypes from 'prop-types'
import Image from 'next/image'

import { logDebug, logError } from '../../utils/logger'
import styles from '../../styles/AddictiveFeed.module.css'

export default function RecipeCard({
  post,
  index,
  onOpenRecipe,
  onOpenProfile,
  onProfileKeyDown,
  onToggleLike
}) {
  const canOpenProfile = post.user?.id && !post.user.id.startsWith('author_')

  return (
    <article
      className={styles.recipeCard}
      style={{ '--animation-delay': `${index * 0.1}s` }}
      aria-label={`Recette ${post.recipe.title}`}
    >
      {post.isFriend && (
        <div className={styles.friendBadge}>
          <span className={styles.friendIcon} aria-hidden="true">🤝</span>
          <span className={styles.friendLabel}>Votre ami</span>
        </div>
      )}

      <button
        type="button"
        className={styles.recipeImageContainer}
        onClick={() => onOpenRecipe(post.recipe.id)}
        aria-label={`Ouvrir la recette ${post.recipe.title}`}
      >
        <Image
          src={post.recipe.image}
          alt={post.recipe.title}
          fill
          className={styles.recipeImage}
          sizes="(max-width: 768px) 100vw, 500px"
          unoptimized={post.recipe.image.startsWith('data:')}
          priority={index < 2}
          onLoad={() => {
            logDebug('AddictiveFeed: Image loaded successfully', {
              recipeId: post.recipe.id,
              imageUrl: `${post.recipe.image?.substring(0, 50)}...`
            })
          }}
          onError={(event) => {
            logError('AddictiveFeed: Image load error', new Error('Image failed to load'), {
              recipeId: post.recipe.id,
              imageUrl: `${post.recipe.image?.substring(0, 50)}...`
            })

            if (event?.target && 'src' in event.target) {
              event.target.src = '/placeholder-recipe.jpg'
            }
          }}
        />
        <div className={styles.imageOverlay}>
          <span className={styles.categoryBadge}>{post.recipe.category}</span>
          {post.isQuickShare && (
            <span className={styles.quickShareBadge}>📸 Express</span>
          )}
        </div>
      </button>

      <div className={styles.recipeContent}>
        <div
          className={styles.userInfo}
          role={canOpenProfile ? 'button' : undefined}
          tabIndex={canOpenProfile ? 0 : undefined}
          onClick={canOpenProfile ? () => onOpenProfile(post.user.id) : undefined}
          onKeyDown={canOpenProfile ? (event) => onProfileKeyDown(event, post.user.id) : undefined}
          aria-label={canOpenProfile ? `Voir le profil de ${post.user.name}` : undefined}
        >
          <span className={styles.userAvatar}>
            {post.user.avatar_url ? (
              <img
                src={post.user.avatar_url}
                alt={post.user.name}
                className={styles.userAvatarImage}
              />
            ) : (
              post.user.emoji || post.user.name?.charAt(0)?.toUpperCase() || '👤'
            )}
          </span>
          <span className={styles.userDetails}>
            <span className={styles.userName}>
              {post.user.name}
              {post.user.verified && <span className={styles.verified}>✅</span>}
              {post.isFriend && (
                <span className={styles.friendIndicator} title="Votre ami">🤝</span>
              )}
            </span>
            <span className={styles.timeAgo}>{post.timeAgo}</span>
          </span>
        </div>

        <h3 className={styles.recipeTitle}>
          <button type="button" onClick={() => onOpenRecipe(post.recipe.id)}>
            {post.recipe.title}
          </button>
        </h3>

        <p className={styles.recipeDescription}>{post.recipe.description}</p>

        <div className={styles.recipeMeta}>
          <span className={styles.metaItem}>📂 {post.recipe.category}</span>
          {post.isQuickShare && (
            <span className={styles.metaItem}>📸 Partage express</span>
          )}
          <span className={styles.metaItem}>⏱️ {post.timeAgo}</span>
        </div>

        <div className={styles.recipeActions}>
          <button
            type="button"
            onClick={() => onToggleLike(post.id)}
            className={`${styles.actionBtn} ${post.recipe.user_has_liked ? styles.liked : ''}`}
            aria-pressed={post.recipe.user_has_liked}
            aria-label={post.recipe.user_has_liked ? 'Retirer le like' : 'Aimer cette recette'}
          >
            {post.recipe.user_has_liked ? '❤️' : '🤍'} {post.recipe.likes}
          </button>

          <button
            type="button"
            className={styles.actionBtn}
            onClick={() => onOpenRecipe(post.recipe.id)}
            aria-label="Voir les commentaires de la recette"
          >
            💬 {post.recipe.comments}
          </button>

          <button
            type="button"
            onClick={() => onOpenRecipe(post.recipe.id)}
            className={styles.viewRecipeBtn}
          >
            Voir la recette →
          </button>
        </div>
      </div>
    </article>
  )
}

RecipeCard.propTypes = {
  post: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    isFriend: PropTypes.bool,
    isQuickShare: PropTypes.bool,
    timeAgo: PropTypes.string.isRequired,
    user: PropTypes.shape({
      id: PropTypes.string,
      name: PropTypes.string.isRequired,
      avatar_url: PropTypes.string,
      emoji: PropTypes.string,
      verified: PropTypes.bool
    }).isRequired,
    recipe: PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      title: PropTypes.string.isRequired,
      description: PropTypes.string.isRequired,
      image: PropTypes.string.isRequired,
      category: PropTypes.string.isRequired,
      likes: PropTypes.number.isRequired,
      comments: PropTypes.number.isRequired,
      user_has_liked: PropTypes.bool
    }).isRequired
  }).isRequired,
  index: PropTypes.number.isRequired,
  onOpenRecipe: PropTypes.func.isRequired,
  onOpenProfile: PropTypes.func.isRequired,
  onProfileKeyDown: PropTypes.func.isRequired,
  onToggleLike: PropTypes.func.isRequired
}
