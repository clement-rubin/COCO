import PropTypes from 'prop-types'
import styles from '../../styles/AddictiveFeed.module.css'

const CreatorShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  avatar: PropTypes.string,
  emoji: PropTypes.string,
  recipesCount: PropTypes.number.isRequired,
  likes: PropTypes.number
})

function SpotlightItem({ creator, index, onOpenProfile, formatCount }) {
  const canOpenProfile = creator.id && !creator.id.startsWith('anon-') && !creator.id.startsWith('author_')
  const statsSegments = [`${formatCount(creator.recipesCount)} recette${creator.recipesCount > 1 ? 's' : ''}`]

  if (creator.likes !== undefined && creator.likes !== null) {
    statsSegments.push(`${formatCount(creator.likes)} like${creator.likes > 1 ? 's' : ''}`)
  }

  return (
    <li className={styles.spotlightItem}>
      <button
        type="button"
        className={styles.spotlightButton}
        onClick={canOpenProfile ? () => onOpenProfile(creator.id) : undefined}
        disabled={!canOpenProfile}
        aria-disabled={!canOpenProfile}
      >
        <span className={styles.spotlightRank}>#{index + 1}</span>
        <span className={styles.spotlightAvatar}>
          {creator.avatar ? (
            <img src={creator.avatar} alt={creator.name} />
          ) : (
            creator.emoji || creator.name.charAt(0)
          )}
        </span>
        <span className={styles.spotlightInfos}>
          <span className={styles.spotlightName}>{creator.name}</span>
          <span className={styles.spotlightStats}>{statsSegments.join(' · ')}</span>
        </span>
      </button>
    </li>
  )
}

SpotlightItem.propTypes = {
  creator: CreatorShape.isRequired,
  index: PropTypes.number.isRequired,
  onOpenProfile: PropTypes.func.isRequired,
  formatCount: PropTypes.func.isRequired
}

export default function CommunitySpotlight({ creators, onOpenProfile, formatCount }) {
  if (!creators || creators.length === 0) {
    return null
  }

  return (
    <section className={styles.communitySpotlight} aria-label="Chefs à suivre">
      <div className={styles.spotlightHeader}>
        <span className={styles.spotlightTitle}>Chefs à suivre</span>
        <p className={styles.spotlightSubtitle}>
          Des cuisiniers qui font vibrer la communauté avec leurs partages.
        </p>
      </div>
      <ul className={styles.spotlightList}>
        {creators.map((creator, index) => (
          <SpotlightItem
            key={creator.id}
            creator={creator}
            index={index}
            onOpenProfile={onOpenProfile}
            formatCount={formatCount}
          />
        ))}
      </ul>
    </section>
  )
}

CommunitySpotlight.propTypes = {
  creators: PropTypes.arrayOf(CreatorShape).isRequired,
  onOpenProfile: PropTypes.func.isRequired,
  formatCount: PropTypes.func.isRequired
}
