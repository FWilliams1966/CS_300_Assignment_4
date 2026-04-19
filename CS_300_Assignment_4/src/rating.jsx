import { useEffect, useMemo, useState } from 'react'

const STORAGE_PREFIX = 'cs300-rating'
const INTERACTION_LOG = 'cs300-interactions'

function clampRating(value, totalStars) {
  const parsedValue = Number(value)

  if (!Number.isFinite(parsedValue)) {
    return 0
  }

  return Math.min(totalStars, Math.max(0, Math.round(parsedValue)))
}

function normalizeTotalStars(totalStars) {
  const parsed = Number(totalStars)

  if (!Number.isFinite(parsed)) {
    return 5
  }

  return Math.max(1, Math.round(parsed))
}

function resolveInitialRating(initialRatings, totalStars) {
  const candidate = Array.isArray(initialRatings)
    ? initialRatings[0]
    : initialRatings

  return clampRating(candidate ?? 0, totalStars)
}

function getStorageKey(label) {
  return `${STORAGE_PREFIX}:${encodeURIComponent(label || 'rating')}`
}

function RatingStars({
  totalStars = 5,
  initialRatings = 0,
  onRatingChange,
  readOnly = false,
  label = 'Rating',
}) {
  const safeTotalStars = useMemo(() => normalizeTotalStars(totalStars), [totalStars])
  const storageKey = useMemo(() => getStorageKey(label), [label])
  const initialRating = useMemo(
    () => resolveInitialRating(initialRatings, safeTotalStars),
    [initialRatings, safeTotalStars],
  )

  const [rating, setRating] = useState(initialRating)
  const [isVisible, setIsVisible] = useState(true)
  const [customLabel, setCustomLabel] = useState(label)

  useEffect(() => {
    const storedValue = window.localStorage.getItem(storageKey)

    if (storedValue !== null) {
      setRating(clampRating(storedValue, safeTotalStars))
      return
    }

    setRating(initialRating)
  }, [initialRating, storageKey, safeTotalStars])

  useEffect(() => {
    window.localStorage.setItem(storageKey, String(rating))
  }, [rating, storageKey])

  const logInteraction = (action, value) => {
    const timestamp = new Date().toISOString()
    const interaction = {
      label: customLabel,
      action,
      value,
      timestamp,
    }
    console.log(`[RatingStars] User interaction: ${action} = "${value}" on "${customLabel}"`, interaction)

    try {
      const rawValue = window.localStorage.getItem(INTERACTION_LOG)
      const parsed = JSON.parse(rawValue || '[]')
      const existing = Array.isArray(parsed) ? parsed : []
      const updated = [...existing, interaction]
      window.localStorage.setItem(INTERACTION_LOG, JSON.stringify(updated))
    } catch (error) {
      console.warn('Failed to log interaction to localStorage', error)
    }
  }

  // Keyboard event handler for Escape key - toggles visibility.
  // Empty dependency array prevents re-attaching listeners on every render.
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === 'Escape') {
        setIsVisible((prev) => {
          const nextVisible = !prev
          const nextStateLabel = nextVisible ? 'visible' : 'hidden'
          logInteraction('escape-key', nextStateLabel)
          return nextVisible
        })
      }
    }

    window.addEventListener('keydown', handleKeyPress)

    // Cleanup: Remove event listener on unmount
    return () => {
      window.removeEventListener('keydown', handleKeyPress)
      console.log(`[RatingStars] Event listener cleaned up for "${customLabel}"`)
    }
  }, [])

  const handleRatingChange = (nextRating) => {
    if (readOnly) {
      return
    }

    setRating(nextRating)
    logInteraction('star-click', nextRating)

    if (typeof onRatingChange === 'function') {
      onRatingChange(nextRating)
    }
  }

  const handleLabelChange = (event) => {
    const newLabel = event.target.value
    setCustomLabel(newLabel)
    logInteraction('label-changed', newLabel)
  }

  if (!isVisible) {
    return (
      <section className="rating-card rating-card--hidden">
        <button
          type="button"
          onClick={() => {
            setIsVisible(true)
            logInteraction('reopen', 'Card toggled visible')
          }}
          className="rating-card__reopen"
        >
          ▶ Show "{customLabel}"
        </button>
      </section>
    )
  }

  return (
    <section className={`rating-card${readOnly ? ' rating-card--readonly' : ''}`}>
      <div className="rating-card__header">
        <p className="rating-card__eyebrow">
          {readOnly ? 'Read only' : 'Interactive'} • Press Esc to toggle
        </p>
        <input
          type="text"
          value={customLabel}
          onChange={handleLabelChange}
          className="rating-card__label-input"
          placeholder="Enter label"
          aria-label="Custom label for this rating"
        />
        <p className="rating-card__description">
          Click stars to rate. Type to rename. Press Escape to hide. All actions are tracked.
        </p>
      </div>

      <div className="rating-card__stars" role="radiogroup" aria-label={label}>
        {Array.from({ length: safeTotalStars }, (_, index) => {
          const starValue = index + 1
          const isFilled = starValue <= rating

          return (
            <button
              key={starValue}
              type="button"
              className={`rating-card__star${isFilled ? ' is-filled' : ''}`}
              onClick={() => {
                handleRatingChange(starValue)
                logInteraction('star-rating', `${starValue}/${safeTotalStars}`)
              }}
              onMouseEnter={() => {
                if (!readOnly) {
                  logInteraction('hover', `Star ${starValue} of ${safeTotalStars}`)
                }
              }}
              disabled={readOnly}
              aria-label={`${starValue} of ${safeTotalStars} stars`}
              aria-pressed={isFilled}
            >
              ★
            </button>
          )
        })}
      </div>

      <div className="rating-card__summary">
        <span className="rating-card__value">{rating}</span>
        <span className="rating-card__divider">/</span>
        <span className="rating-card__total">{safeTotalStars}</span>
      </div>

      <p className="rating-card__caption">
        Current rating value for {label}: {rating || 'No rating selected yet'}
      </p>
    </section>
  )
}

export default RatingStars
