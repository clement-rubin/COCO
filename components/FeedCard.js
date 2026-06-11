import Image from 'next/image'

const RANK_BADGES = ['🥇', '🥈', '🥉']

export default function FeedCard({ post, rank, onLike, onView }) {
  const { recipe, user, timeAgo } = post
  const rankBadge =
    rank != null && rank <= 3
      ? RANK_BADGES[rank - 1]
      : rank != null
      ? `#${rank}`
      : null

  return (
    <article style={{
      background: '#fff',
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
      marginBottom: 20,
      border: '1px solid #f1f5f9'
    }}>
      {/* Image */}
      <div
        onClick={() => onView(recipe.id)}
        style={{ position: 'relative', width: '100%', paddingTop: '56.25%', cursor: 'pointer' }}
      >
        <Image
          src={recipe.image || '/placeholder-recipe.jpg'}
          alt={recipe.title}
          fill
          style={{ objectFit: 'cover' }}
          sizes="(max-width: 640px) 100vw, 600px"
          unoptimized={recipe.image?.startsWith('data:')}
          onError={(e) => { e.currentTarget.src = '/placeholder-recipe.jpg' }}
        />
        {rankBadge && (
          <span style={{
            position: 'absolute', top: 10, right: 10,
            background: 'rgba(0,0,0,0.55)', color: '#fff',
            fontSize: '0.8rem', fontWeight: 700,
            padding: '3px 8px', borderRadius: 8,
            backdropFilter: 'blur(4px)'
          }}>
            {rankBadge}
          </span>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '12px 16px 14px' }}>
        {/* Author row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{
            width: 28, height: 28, borderRadius: '50%',
            background: '#fff7ed', border: '1px solid #fed7aa',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.85rem', flexShrink: 0, overflow: 'hidden'
          }}>
            {user.avatar_url
              ? <img src={user.avatar_url} alt={user.name} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
              : (user.name?.charAt(0)?.toUpperCase() || '👤')}
          </span>
          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>{user.name}</span>
          <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#94a3b8' }}>{timeAgo}</span>
        </div>

        {/* Title */}
        <h3
          onClick={() => onView(recipe.id)}
          style={{ margin: '0 0 5px', fontSize: '1rem', fontWeight: 700, color: '#1e293b', lineHeight: 1.3, cursor: 'pointer' }}
        >
          {recipe.title}
        </h3>

        {/* Description 2 lines max */}
        <p style={{
          margin: '0 0 12px', fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
        }}>
          {recipe.description}
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={(e) => { e.stopPropagation(); onLike(post.id) }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: '0.85rem', fontWeight: 600,
              color: recipe.user_has_liked ? '#ef4444' : '#64748b', padding: '4px 0',
              transition: 'color 0.15s'
            }}
            aria-label={recipe.user_has_liked ? 'Retirer le like' : 'Liker cette recette'}
          >
            {recipe.user_has_liked ? '❤️' : '🤍'} {recipe.likes ?? 0}
          </button>

          <button
            onClick={() => onView(recipe.id)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: '0.85rem', fontWeight: 600, color: '#64748b', padding: '4px 0'
            }}
          >
            💬 {recipe.comments ?? 0}
          </button>

          <button
            onClick={() => onView(recipe.id)}
            style={{
              marginLeft: 'auto', background: 'none',
              border: '1px solid #e2e8f0', borderRadius: 8,
              padding: '4px 12px', fontSize: '0.78rem', fontWeight: 600,
              color: '#ff6b35', cursor: 'pointer'
            }}
          >
            Voir →
          </button>
        </div>
      </div>
    </article>
  )
}
