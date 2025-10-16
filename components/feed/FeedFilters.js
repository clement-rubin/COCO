import PropTypes from 'prop-types'
import styles from '../../styles/AddictiveFeed.module.css'

function getFilterContextMessage({ activeFilterConfig, filteredCount, formatCount }) {
  if (!activeFilterConfig || activeFilterConfig.id === 'all') {
    return null
  }

  if (filteredCount > 0) {
    if (filteredCount === 1) {
      return 'Une seule pépite correspond à ce filtre.'
    }

    return `${formatCount(filteredCount)} recettes correspondent à ce filtre.`
  }

  return 'Aucune recette pour ce filtre pour le moment. Essaie une autre catégorie !'
}

export default function FeedFilters({
  filters,
  activeFilter,
  onFilterChange,
  filteredCount,
  formatCount
}) {
  const activeFilterConfig = filters.find(filter => filter.id === activeFilter)
  const contextMessage = getFilterContextMessage({ activeFilterConfig, filteredCount, formatCount })

  return (
    <div className={styles.filtersWrapper}>
      <div className={styles.filterBar} role="tablist" aria-label="Filtres du flux communautaire">
        {filters.map(filter => {
          const isActive = filter.id === activeFilter
          return (
            <button
              key={filter.id}
              type="button"
              className={`${styles.filterButton} ${isActive ? styles.filterButtonActive : ''}`}
              onClick={() => onFilterChange(filter.id)}
              aria-pressed={isActive}
              role="tab"
              aria-selected={isActive}
            >
              <span className={styles.filterLabel}>{filter.label}</span>
              <span className={styles.filterDescription}>{filter.description}</span>
            </button>
          )
        })}
      </div>

      {contextMessage && (
        <div className={styles.filterContext} role="status">
          <span>{contextMessage}</span>
        </div>
      )}
    </div>
  )
}

FeedFilters.propTypes = {
  filters: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      description: PropTypes.string.isRequired
    })
  ).isRequired,
  activeFilter: PropTypes.string.isRequired,
  onFilterChange: PropTypes.func.isRequired,
  filteredCount: PropTypes.number.isRequired,
  formatCount: PropTypes.func.isRequired
}
