import { useEffect, useMemo, useState } from 'react'
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import RatingStars from './rating.jsx'

const APP_NAME = 'LumenRate'
const APP_TAGLINE = 'Seven-page rating studio'

const CATEGORY_TEMPLATES = {
  cars: ['Toyota', 'Honda', 'Ford', 'BMW'],
  televisions: ['Samsung', 'LG', 'Sony', 'TCL'],
  computers: ['Apple', 'Dell', 'HP', 'Lenovo'],
  services: ['Internet Provider', 'Banking Service', 'Airline Service', 'Food Delivery'],
}

const RESPONSE_ANALYSIS_CATEGORIES = [
  {
    key: 'quality',
    label: 'Quality',
    weight: 3,
    positiveWords: ['quality', 'premium', 'durable', 'stable', 'solid', 'excellent'],
    negativeWords: ['poor', 'cheap', 'fragile', 'unstable', 'faulty', 'broken'],
  },
  {
    key: 'support',
    label: 'Support',
    weight: 2,
    positiveWords: ['support', 'helpful', 'responsive', 'friendly', 'resolved', 'clear'],
    negativeWords: ['ignored', 'unhelpful', 'rude', 'unresolved', 'confusing', 'no response'],
  },
  {
    key: 'speed',
    label: 'Speed',
    weight: 2,
    positiveWords: ['fast', 'quick', 'smooth', 'instant', 'efficient', 'snappy'],
    negativeWords: ['slow', 'delay', 'lag', 'sluggish', 'waiting', 'timeout'],
  },
  {
    key: 'pricing',
    label: 'Pricing',
    weight: 1,
    positiveWords: ['affordable', 'value', 'worth', 'fair price', 'budget'],
    negativeWords: ['expensive', 'overpriced', 'costly', 'pricey'],
  },
]

function parseGroupItems(rawInput) {
  const values = rawInput
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)

  const uniqueValues = []

  values.forEach((item) => {
    if (!uniqueValues.includes(item)) {
      uniqueValues.push(item)
    }
  })

  return uniqueValues.slice(0, 12)
}

function slugify(value) {
  return String(value || 'ratings')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function escapeCsv(value) {
  const text = String(value ?? '')
  const escaped = text.replace(/"/g, '""')
  return `"${escaped}"`
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildResponseHighlightParts(text, scoreBreakdown) {
  const sourceText = String(text || '')

  if (!sourceText.trim()) {
    return []
  }

  const termMetaLookup = {}
  const terms = []

  scoreBreakdown.forEach((category) => {
    category.positiveWords.forEach((word) => {
      const key = word.toLowerCase()
      if (!termMetaLookup[key]) {
        termMetaLookup[key] = {
          type: 'positive',
          categories: [category.label],
        }
        terms.push(word)
        return
      }

      if (!termMetaLookup[key].categories.includes(category.label)) {
        termMetaLookup[key].categories.push(category.label)
      }
    })

    category.negativeWords.forEach((word) => {
      const key = word.toLowerCase()
      if (!termMetaLookup[key]) {
        termMetaLookup[key] = {
          type: 'negative',
          categories: [category.label],
        }
        terms.push(word)
        return
      }

      if (termMetaLookup[key].type !== 'negative') {
        termMetaLookup[key].type = 'mixed'
      }

      if (!termMetaLookup[key].categories.includes(category.label)) {
        termMetaLookup[key].categories.push(category.label)
      }
    })
  })

  if (terms.length === 0) {
    return [{ text: sourceText, type: 'plain' }]
  }

  const sortedTerms = [...terms].sort((left, right) => right.length - left.length)
  const pattern = new RegExp(`(${sortedTerms.map(escapeRegExp).join('|')})`, 'gi')

  return sourceText.split(pattern).map((part) => {
    const metadata = termMetaLookup[part.toLowerCase()]

    if (!metadata) {
      return { text: part, type: 'plain', categories: [] }
    }

    return {
      text: part,
      type: metadata.type,
      categories: metadata.categories,
    }
  })
}

function analyzeUserResponse(rawText) {
  const text = String(rawText || '').toLowerCase()
  const scoreBreakdown = RESPONSE_ANALYSIS_CATEGORIES.map((category) => {
    const positiveHits = category.positiveWords.filter((word) => text.includes(word)).length
    const negativeHits = category.negativeWords.filter((word) => text.includes(word)).length
    const rawScore = positiveHits - negativeHits
    const clampedScore = Math.max(-3, Math.min(3, rawScore))

    return {
      ...category,
      positiveHits,
      negativeHits,
      score: clampedScore,
    }
  })

  const weightedScore = scoreBreakdown.reduce((total, category) => {
    return total + category.score * category.weight
  }, 0)

  const maxPossibleScore = RESPONSE_ANALYSIS_CATEGORIES.reduce((total, category) => {
    return total + 3 * category.weight
  }, 0)

  const normalizedScore = maxPossibleScore > 0 ? weightedScore / maxPossibleScore : 0

  const weakestCategory = [...scoreBreakdown].sort((left, right) => left.score - right.score)[0]
  const strongestCategory = [...scoreBreakdown].sort((left, right) => right.score - left.score)[0]

  if (text.trim().length === 0) {
    return {
      sentiment: 'No result yet',
      resultMessage: 'Type feedback and click Analyze Response to see a result.',
      suggestion: 'Try describing quality, speed, support, and overall satisfaction.',
      score: 0,
      scoreBreakdown,
    }
  }

  if (normalizedScore >= 0.2) {
    return {
      sentiment: 'Positive',
      resultMessage: 'Your response shows a strong positive experience.',
      suggestion: `Promote ${strongestCategory.label.toLowerCase()} as a key strength in your summary report.`,
      score: weightedScore,
      scoreBreakdown,
    }
  }

  if (normalizedScore <= -0.15) {
    return {
      sentiment: 'Needs attention',
      resultMessage: 'Your response indicates pain points that should be addressed.',
      suggestion: `Focus on improving ${weakestCategory.label.toLowerCase()} and request a follow-up rating after fixes.`,
      score: weightedScore,
      scoreBreakdown,
    }
  }

  return {
    sentiment: 'Neutral',
    resultMessage: 'Your response is mixed or neutral.',
    suggestion: `Ask one clarifying question about ${weakestCategory.label.toLowerCase()} to improve the next rating.`,
    score: weightedScore,
    scoreBreakdown,
  }
}

function analyzeContentRelevance(contentText, topicText) {
  const normalizedContent = String(contentText || '').toLowerCase()
  const normalizedTopic = String(topicText || '').toLowerCase().trim()

  if (!normalizedContent.trim() || !normalizedTopic) {
    return {
      relevancePercent: 0,
      verdict: 'No result yet',
      matchedTerms: [],
      summary: 'Enter a topic and some content, then click Evaluate Relevance.',
    }
  }

  const topicTerms = normalizedTopic
    .split(/\s+/)
    .map((term) => term.replace(/[^a-z0-9]/g, ''))
    .filter(Boolean)

  const uniqueTerms = Array.from(new Set(topicTerms)).slice(0, 12)

  if (uniqueTerms.length === 0) {
    return {
      relevancePercent: 0,
      verdict: 'No result yet',
      matchedTerms: [],
      summary: 'Add at least one valid topic keyword.',
    }
  }

  const matchedTerms = uniqueTerms.filter((term) => normalizedContent.includes(term))
  const relevancePercent = Math.round((matchedTerms.length / uniqueTerms.length) * 100)

  const verdict = relevancePercent >= 70
    ? 'Highly Relevant'
    : relevancePercent >= 40
      ? 'Moderately Relevant'
      : 'Low Relevance'

  const summary = relevancePercent >= 70
    ? 'The content aligns strongly with your topic keywords.'
    : relevancePercent >= 40
      ? 'The content partially covers your topic. Add more focused points to improve alignment.'
      : 'The content has weak alignment with your topic. Consider rewriting key sections around the target terms.'

  return {
    relevancePercent,
    verdict,
    matchedTerms,
    summary,
  }
}

function analyzeEmojiQuickResponse(rawText) {
  const text = String(rawText || '').toLowerCase()
  const positiveWords = ['great', 'good', 'happy', 'love', 'easy', 'smooth', 'excellent', 'fast']
  const negativeWords = ['bad', 'sad', 'hate', 'slow', 'hard', 'issue', 'bug', 'angry']

  const positiveHits = positiveWords.filter((word) => text.includes(word)).length
  const negativeHits = negativeWords.filter((word) => text.includes(word)).length
  const score = positiveHits - negativeHits

  if (!text.trim()) {
    return {
      emoji: '😐',
      mood: 'No result yet',
      output: 'Enter quick feedback and click Generate Emoji Result.',
      quickRating: 0,
    }
  }

  if (score >= 1) {
    return {
      emoji: '😄',
      mood: 'Positive',
      output: 'Feedback indicates a positive experience.',
      quickRating: 3,
    }
  }

  if (score <= -1) {
    return {
      emoji: '😕',
      mood: 'Needs attention',
      output: 'Feedback indicates friction points to address.',
      quickRating: 1,
    }
  }

  return {
    emoji: '🙂',
    mood: 'Neutral',
    output: 'Feedback appears neutral or mixed.',
    quickRating: 2,
  }
}

function analyzeServiceExperience(rawText, serviceType) {
  const text = String(rawText || '').toLowerCase()
  const selectedType = String(serviceType || 'general')

  const serviceKeywords = {
    general: {
      positive: ['excellent', 'great', 'helpful', 'smooth', 'fast', 'reliable', 'friendly'],
      negative: ['bad', 'slow', 'poor', 'confusing', 'rude', 'broken', 'issue'],
    },
    support: {
      positive: ['resolved', 'helpful', 'responsive', 'friendly', 'clear', 'understood'],
      negative: ['ignored', 'waited', 'confusing', 'unhelpful', 'rude', 'escalation'],
    },
    delivery: {
      positive: ['on time', 'fast', 'quick', 'smooth', 'easy', 'arrived'],
      negative: ['late', 'delay', 'missing', 'damaged', 'slow', 'cancelled'],
    },
    banking: {
      positive: ['secure', 'easy', 'fast', 'clear', 'reliable', 'convenient'],
      negative: ['fees', 'slow', 'blocked', 'error', 'confusing', 'overcharged'],
    },
  }

  const keywords = serviceKeywords[selectedType] || serviceKeywords.general
  const positiveHits = keywords.positive.filter((word) => text.includes(word)).length
  const negativeHits = keywords.negative.filter((word) => text.includes(word)).length
  const score = Math.max(0, Math.min(10, 5 + positiveHits * 2 - negativeHits * 2))

  if (!text.trim()) {
    return {
      score: 0,
      verdict: 'No result yet',
      summary: 'Enter a service review and click Analyze Service to see the result.',
      suggestion: 'Try mentioning speed, support, reliability, and value.',
    }
  }

  if (score >= 8) {
    return {
      score,
      verdict: 'Excellent Service',
      summary: 'Your response shows a highly positive service experience.',
      suggestion: 'Keep the current approach and use this as a model for other teams.',
    }
  }

  if (score >= 5) {
    return {
      score,
      verdict: 'Good Service',
      summary: 'Your response is generally positive with room for improvement.',
      suggestion: 'Focus on the most mentioned negative point and improve that area first.',
    }
  }

  return {
    score,
    verdict: 'Needs Improvement',
    summary: 'Your response suggests the service experience needs attention.',
    suggestion: 'Review the support or delivery flow and request another rating after fixes.',
  }
}

function getServiceScoreClass(score) {
  if (score >= 8) {
    return 'is-positive'
  }

  if (score >= 5) {
    return 'is-neutral'
  }

  return 'is-negative'
}

const PAGE_CONFIG = [
  {
    path: '/home',
    title: 'Home Overview',
    description: 'Landing page with a standard 5-star product quality rating.',
    tone: 'home',
    totalStars: 5,
    initialRatings: 3,
    label: 'Product Quality',
    readOnly: false,
    highlights: ['Great for first impressions', 'Balanced five-point scale', 'Ideal for product cards'],
    metricLabel: 'Target response rate',
    metricValue: '68%',
    checklist: ['Collect rating after checkout', 'Save response in localStorage', 'Display quick thank-you state'],
  },
  {
    path: '/service',
    title: 'Service Experience',
    description: 'Detailed 10-star scale for granular service feedback.',
    tone: 'service',
    totalStars: 10,
    initialRatings: 8,
    label: 'Service Experience',
    readOnly: false,
    highlights: ['Supports nuanced judgments', 'Useful for support interactions', 'Works for team benchmarking'],
    metricLabel: 'Average support score',
    metricValue: '8.3/10',
    checklist: ['Track trend weekly', 'Tag ratings by channel', 'Escalate below 6/10 feedback'],
  },
  {
    path: '/emoji',
    title: 'Emoji Quick Rating',
    description: 'Fast 3-star rating for short interactions and quick polls.',
    tone: 'emoji',
    totalStars: 3,
    initialRatings: 1,
    label: 'Emoji Rating',
    readOnly: false,
    highlights: ['Low friction interaction', 'High completion on mobile', 'Perfect for micro-surveys'],
    metricLabel: 'Median completion time',
    metricValue: '3 sec',
    checklist: ['Keep copy under 8 words', 'Place near action success', 'Use follow-up prompt optionally'],
  },
  {
    path: '/content',
    title: 'Content Relevance',
    description: 'A custom 7-star model to capture mid-range precision.',
    tone: 'content',
    totalStars: 7,
    initialRatings: 4,
    label: 'Content Relevance',
    readOnly: false,
    highlights: ['Fits editorial review workflows', 'Better than binary likes', 'Good for recommendation systems'],
    metricLabel: 'Relevance benchmark',
    metricValue: '5.6/7',
    checklist: ['Gather context of each rating', 'Compare against reading time', 'Prioritize low-score topics'],
  },
  {
    path: '/survey',
    title: 'Category Builder',
    description: 'Build your own rating set for cars, televisions, computers, services, or a custom group.',
    tone: 'survey',
    totalStars: 5,
    initialRatings: 0,
    label: 'Feedback Survey',
    readOnly: false,
    highlights: ['Removes initial-value bias', 'Good for first-touch experiences', 'Simple post-event questionnaire'],
    metricLabel: 'First-time participation',
    metricValue: '72%',
    checklist: ['Default to no selection', 'Validate before submit', 'Prompt optional comments'],
  },
  {
    path: '/archived',
    title: 'Archived Snapshot',
    description: 'Read-only page to review historical ratings without editing.',
    tone: 'archived',
    totalStars: 5,
    initialRatings: 4,
    label: 'Archived Feedback',
    readOnly: true,
    highlights: ['Prevents accidental changes', 'Reliable audit snapshot', 'Clear separation from live forms'],
    metricLabel: 'Archive confidence',
    metricValue: '99.9%',
    checklist: ['Lock interaction controls', 'Show source and timestamp', 'Support export for reports'],
    archiveRecords: [
      {
        id: 'AR-1042',
        category: 'Cars',
        item: 'Toyota Corolla',
        rating: '4/5',
        reviewer: 'Alex M.',
        date: '2026-03-18',
        status: 'Verified',
      },
      {
        id: 'AR-1043',
        category: 'Televisions',
        item: 'LG OLED C3',
        rating: '5/5',
        reviewer: 'J. Patel',
        date: '2026-03-22',
        status: 'Verified',
      },
      {
        id: 'AR-1044',
        category: 'Computers',
        item: 'Dell XPS 15',
        rating: '4/5',
        reviewer: 'R. Chen',
        date: '2026-03-25',
        status: 'Pending QA',
      },
      {
        id: 'AR-1045',
        category: 'Consumer Services',
        item: 'CityNet Fiber',
        rating: '3/5',
        reviewer: 'M. Rivera',
        date: '2026-04-01',
        status: 'Verified',
      },
      {
        id: 'AR-1046',
        category: 'Consumer Services',
        item: 'Skyline Bank App',
        rating: '2/5',
        reviewer: 'N. Brooks',
        date: '2026-04-07',
        status: 'Flagged',
      },
    ],
  },
  {
    path: '/satisfaction',
    title: 'Overall Satisfaction',
    description: 'Final 10-star scale for overall satisfaction scoring.',
    tone: 'satisfaction',
    totalStars: 10,
    initialRatings: 7,
    label: 'Overall Satisfaction',
    readOnly: false,
    highlights: ['High-fidelity sentiment capture', 'Strong for enterprise surveys', 'Supports weighted scoring models'],
    metricLabel: 'Satisfaction index',
    metricValue: '74/100',
    checklist: ['Normalize to 100-point scale', 'Watch score drift monthly', 'Correlate with retention'],
  },
]

function RatingPage({ config, onPageRatingChange }) {
  const badge = config.readOnly ? 'Read-only page' : 'Interactive page'
  const isOverallSatisfaction = config.path === '/satisfaction'
  const archiveRecords = Array.isArray(config.archiveRecords) ? config.archiveRecords : []

  const [archiveStatusFilter, setArchiveStatusFilter] = useState('all')
  const [archiveCategoryFilter, setArchiveCategoryFilter] = useState('all')
  const [archiveDateQuery, setArchiveDateQuery] = useState('')
  const [archiveSortBy, setArchiveSortBy] = useState('date')
  const [archiveSortDirection, setArchiveSortDirection] = useState('desc')
  const [satisfactionComment, setSatisfactionComment] = useState('')
  const [satisfactionRating, setSatisfactionRating] = useState(Number(config.initialRatings) || 0)

  const normalizedSatisfactionRating = Math.max(0, Math.min(10, Number(satisfactionRating) || 0))
  const satisfactionPercentage = Math.round((normalizedSatisfactionRating / 10) * 100)

  const archiveStatusOptions = useMemo(() => {
    return Array.from(new Set(archiveRecords.map((record) => record.status)))
  }, [archiveRecords])

  const archiveCategoryOptions = useMemo(() => {
    return Array.from(new Set(archiveRecords.map((record) => record.category)))
  }, [archiveRecords])

  const filteredArchiveRecords = useMemo(() => {
    return archiveRecords.filter((record) => {
      const matchesStatus = archiveStatusFilter === 'all' || record.status === archiveStatusFilter
      const matchesCategory = archiveCategoryFilter === 'all' || record.category === archiveCategoryFilter
      const normalizedDateQuery = archiveDateQuery.trim()
      const matchesDate = normalizedDateQuery.length === 0 || String(record.date).includes(normalizedDateQuery)

      return matchesStatus && matchesCategory && matchesDate
    })
  }, [archiveRecords, archiveStatusFilter, archiveCategoryFilter, archiveDateQuery])

  const sortedArchiveRecords = useMemo(() => {
    const parseRatingValue = (ratingText) => {
      const value = Number(String(ratingText || '').split('/')[0])
      return Number.isFinite(value) ? value : 0
    }

    const sorted = [...filteredArchiveRecords].sort((left, right) => {
      let comparison = 0

      if (archiveSortBy === 'date') {
        comparison = String(left.date).localeCompare(String(right.date))
      } else if (archiveSortBy === 'rating') {
        comparison = parseRatingValue(left.rating) - parseRatingValue(right.rating)
      } else if (archiveSortBy === 'status') {
        comparison = String(left.status).localeCompare(String(right.status))
      } else if (archiveSortBy === 'category') {
        comparison = String(left.category).localeCompare(String(right.category))
      } else if (archiveSortBy === 'item') {
        comparison = String(left.item).localeCompare(String(right.item))
      } else if (archiveSortBy === 'reviewer') {
        comparison = String(left.reviewer).localeCompare(String(right.reviewer))
      } else {
        comparison = String(left.id).localeCompare(String(right.id))
      }

      return archiveSortDirection === 'asc' ? comparison : -comparison
    })

    return sorted
  }, [filteredArchiveRecords, archiveSortBy, archiveSortDirection])

  const handleArchiveHeaderSort = (sortKey) => {
    if (archiveSortBy === sortKey) {
      setArchiveSortDirection((previousDirection) =>
        previousDirection === 'asc' ? 'desc' : 'asc',
      )
      return
    }

    setArchiveSortBy(sortKey)
    setArchiveSortDirection('asc')
  }

  const getArchiveSortIndicator = (sortKey) => {
    if (archiveSortBy !== sortKey) {
      return ''
    }

    return archiveSortDirection === 'asc' ? ' ↑' : ' ↓'
  }

  return (
    <main className={`page-shell page-shell--${config.tone}`}>
      <section className="hero-panel">
        <p className="hero-panel__eyebrow">{APP_NAME}</p>
        <h1>{config.title}</h1>
        <p className="hero-panel__copy">{config.description}</p>
        <p className="hero-panel__copy">{badge}</p>
      </section>

      <section className="rating-grid">
        <div className="demo-section">
          <div className="demo-header">
            <h3>{config.title}</h3>
            <p className="demo-description">
              Route: {config.path}. This page demonstrates stars={config.totalStars}, initial={String(config.initialRatings)}, readOnly={String(config.readOnly)}.
            </p>
          </div>
          <RatingStars
            totalStars={config.totalStars}
            initialRatings={config.initialRatings}
            readOnly={config.readOnly}
            label={config.label}
            onRatingChange={(value) => {
              if (isOverallSatisfaction) {
                setSatisfactionRating(value)
              }

              if (typeof onPageRatingChange === 'function') {
                onPageRatingChange(config.title, value)
              }
            }}
          />

          {isOverallSatisfaction && (
            <div className="satisfaction-comment-block" aria-label="Overall satisfaction comment">
              <p className="insight-card__label">Satisfaction result</p>
              <p className="builder-copy">
                Rating: {normalizedSatisfactionRating}/10 ({satisfactionPercentage}%)
              </p>
              <label htmlFor="satisfaction-comment" className="builder-label">Short comment</label>
              <textarea
                id="satisfaction-comment"
                className="builder-input builder-input--textarea satisfaction-comment-block__input"
                value={satisfactionComment}
                onChange={(event) => setSatisfactionComment(event.target.value)}
                placeholder="Example: I am mostly satisfied, but response time can be improved."
              />
            </div>
          )}
        </div>

        <aside className="insight-section" aria-label={`${config.title} insights`}>
          <article className="insight-card">
            <h3>Why This Page Exists</h3>
            <ul className="insight-list">
              {config.highlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="insight-card insight-card--metric">
            <p className="insight-card__label">{config.metricLabel}</p>
            <p className="insight-card__value">{config.metricValue}</p>
          </article>

          <article className="insight-card">
            <h3>Implementation Checklist</h3>
            <ol className="insight-list insight-list--numbered">
              {config.checklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </article>

          {archiveRecords.length > 0 && (
            <article className="insight-card archive-panel">
              <h3>Archived Dataset Preview</h3>
              <p className="demo-description">Sample historical entries available in read-only mode.</p>

              <div className="archive-filters" aria-label="Archive filters">
                <label className="archive-filter">
                  <span>Status</span>
                  <select
                    value={archiveStatusFilter}
                    onChange={(event) => setArchiveStatusFilter(event.target.value)}
                    className="archive-filter__input"
                  >
                    <option value="all">All statuses</option>
                    {archiveStatusOptions.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </label>

                <label className="archive-filter">
                  <span>Category</span>
                  <select
                    value={archiveCategoryFilter}
                    onChange={(event) => setArchiveCategoryFilter(event.target.value)}
                    className="archive-filter__input"
                  >
                    <option value="all">All categories</option>
                    {archiveCategoryOptions.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </label>

                <label className="archive-filter">
                  <span>Date contains</span>
                  <input
                    type="text"
                    value={archiveDateQuery}
                    onChange={(event) => setArchiveDateQuery(event.target.value)}
                    placeholder="YYYY-MM"
                    className="archive-filter__input"
                  />
                </label>
              </div>

              <div className="archive-table-wrap">
                <table className="archive-table">
                  <thead>
                    <tr>
                      <th>
                        <button type="button" className="archive-table__sort-btn" onClick={() => handleArchiveHeaderSort('id')}>
                          ID{getArchiveSortIndicator('id')}
                        </button>
                      </th>
                      <th>
                        <button type="button" className="archive-table__sort-btn" onClick={() => handleArchiveHeaderSort('category')}>
                          Category{getArchiveSortIndicator('category')}
                        </button>
                      </th>
                      <th>
                        <button type="button" className="archive-table__sort-btn" onClick={() => handleArchiveHeaderSort('item')}>
                          Item{getArchiveSortIndicator('item')}
                        </button>
                      </th>
                      <th>
                        <button type="button" className="archive-table__sort-btn" onClick={() => handleArchiveHeaderSort('rating')}>
                          Rating{getArchiveSortIndicator('rating')}
                        </button>
                      </th>
                      <th>
                        <button type="button" className="archive-table__sort-btn" onClick={() => handleArchiveHeaderSort('reviewer')}>
                          Reviewer{getArchiveSortIndicator('reviewer')}
                        </button>
                      </th>
                      <th>
                        <button type="button" className="archive-table__sort-btn" onClick={() => handleArchiveHeaderSort('date')}>
                          Date{getArchiveSortIndicator('date')}
                        </button>
                      </th>
                      <th>
                        <button type="button" className="archive-table__sort-btn" onClick={() => handleArchiveHeaderSort('status')}>
                          Status{getArchiveSortIndicator('status')}
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedArchiveRecords.map((record) => (
                      <tr key={record.id}>
                        <td>{record.id}</td>
                        <td>{record.category}</td>
                        <td>{record.item}</td>
                        <td>{record.rating}</td>
                        <td>{record.reviewer}</td>
                        <td>{record.date}</td>
                        <td>{record.status}</td>
                      </tr>
                    ))}
                    {sortedArchiveRecords.length === 0 && (
                      <tr>
                        <td colSpan={7} className="archive-table__empty">
                          No archived entries match the selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>
          )}
        </aside>
      </section>
    </main>
  )
}

function HomeOverviewPage({ onPageRatingChange }) {
  const [responseText, setResponseText] = useState('')
  const [analysisResult, setAnalysisResult] = useState(() => analyzeUserResponse(''))
  const [analyzedText, setAnalyzedText] = useState('')
  const [selectedBreakdownCategory, setSelectedBreakdownCategory] = useState('')
  const [breakdownAnimationKey, setBreakdownAnimationKey] = useState(0)

  const handleAnalyzeResponse = () => {
    const nextResult = analyzeUserResponse(responseText)
    setAnalysisResult(nextResult)
    setAnalyzedText(responseText)
    setSelectedBreakdownCategory('')

    if (typeof onPageRatingChange === 'function') {
      onPageRatingChange('Home Overview Response Score', nextResult.score)
    }
  }

  const highlightParts = useMemo(() => {
    return buildResponseHighlightParts(analyzedText, analysisResult.scoreBreakdown || [])
  }, [analyzedText, analysisResult.scoreBreakdown])

  const displayedBreakdown = useMemo(() => {
    const source = analysisResult.scoreBreakdown || []

    if (!selectedBreakdownCategory) {
      return source
    }

    return source.filter((category) => category.label === selectedBreakdownCategory)
  }, [analysisResult.scoreBreakdown, selectedBreakdownCategory])

  useEffect(() => {
    setBreakdownAnimationKey((previousValue) => previousValue + 1)
  }, [selectedBreakdownCategory, analysisResult.scoreBreakdown])

  const handleCategoryTagClick = (categoryLabel) => {
    setSelectedBreakdownCategory((previousValue) =>
      previousValue === categoryLabel ? '' : categoryLabel,
    )
  }

  return (
    <main className="page-shell page-shell--home">
      <section className="hero-panel">
        <p className="hero-panel__eyebrow">{APP_NAME}</p>
        <h1>Home Overview</h1>
        <p className="hero-panel__copy">
          Enter a user response and get an instant result summary. This makes the home page interactive and useful for quick feedback screening.
        </p>
      </section>

      <section className="home-response-grid">
        <article className="home-response-card">
          <h3>User Response Input</h3>
          <p className="builder-copy">Type feedback about a product or service experience.</p>
          <label htmlFor="home-response" className="builder-label">Response</label>
          <textarea
            id="home-response"
            className="builder-input builder-input--textarea"
            value={responseText}
            onChange={(event) => setResponseText(event.target.value)}
            placeholder="Example: The service was fast and the support team was helpful, but setup was confusing at first."
          />
          <button type="button" className="builder-action" onClick={handleAnalyzeResponse}>
            Analyze Response
          </button>
        </article>

        <article className="home-response-card home-response-card--result">
          <h3>Result</h3>
          <p className="home-result-badge">Sentiment: {analysisResult.sentiment}</p>
          <p className="builder-copy">{analysisResult.resultMessage}</p>
          <p className="builder-copy">Suggestion: {analysisResult.suggestion}</p>
          <div className="home-score-row">
            <span>Score</span>
            <strong>{analysisResult.score}</strong>
          </div>

          <div className="home-breakdown">
            <h4>Category Breakdown</h4>
            {selectedBreakdownCategory && (
              <div className="home-breakdown__active-filter">
                <span>Filtered to: {selectedBreakdownCategory}</span>
                <button
                  type="button"
                  className="home-breakdown__clear-btn"
                  onClick={() => setSelectedBreakdownCategory('')}
                >
                  Clear
                </button>
              </div>
            )}
            {displayedBreakdown.map((category) => {
              const meterValue = ((category.score + 3) / 6) * 100
              const scoreClass = category.score > 0
                ? 'is-positive'
                : category.score < 0
                  ? 'is-negative'
                  : 'is-neutral'

              return (
                <div
                  key={`${category.key}-${breakdownAnimationKey}`}
                  className="home-breakdown__row is-animated"
                >
                  <div className="home-breakdown__meta">
                    <span>{category.label}</span>
                    <span className={`home-breakdown__score ${scoreClass}`}>
                      {category.score}
                    </span>
                  </div>
                  <div className="home-breakdown__bar-track" role="presentation">
                    <div
                      className={`home-breakdown__bar ${scoreClass} is-animated`}
                      style={{ width: `${meterValue}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="home-highlight">
            <h4>Keyword Highlight Preview</h4>
            {highlightParts.length > 0 ? (
              <p className="home-highlight__text">
                {highlightParts.map((part, index) => (
                  <span
                    key={`${part.text}-${index}`}
                    className={
                      part.type === 'positive'
                        ? 'home-highlight__token is-positive'
                        : part.type === 'negative'
                          ? 'home-highlight__token is-negative'
                          : part.type === 'mixed'
                            ? 'home-highlight__token is-mixed'
                          : 'home-highlight__token'
                    }
                  >
                    {part.text}
                    {part.type !== 'plain' && part.categories.length > 0 && (
                      part.categories.map((categoryName) => (
                        <button
                          key={`${part.text}-${categoryName}`}
                          type="button"
                          className={`home-highlight__token-category${selectedBreakdownCategory === categoryName ? ' is-active' : ''}`}
                          onClick={() => handleCategoryTagClick(categoryName)}
                        >
                          {categoryName}
                        </button>
                      ))
                    )}
                  </span>
                ))}
              </p>
            ) : (
              <p className="builder-copy">Analyze a response to view highlighted keywords.</p>
            )}
            <div className="home-highlight__legend">
              <span className="home-highlight__legend-item is-positive">Positive keywords</span>
              <span className="home-highlight__legend-item is-negative">Negative keywords</span>
              <span className="home-highlight__legend-item is-mixed">Mixed signal keywords</span>
            </div>
          </div>
        </article>
      </section>
    </main>
  )
}

function ContentRelevancePage({ onPageRatingChange }) {
  const [topicText, setTopicText] = useState('React hooks performance')
  const [contentText, setContentText] = useState('')
  const [result, setResult] = useState(() => analyzeContentRelevance('', ''))

  const handleEvaluate = () => {
    const nextResult = analyzeContentRelevance(contentText, topicText)
    setResult(nextResult)

    if (typeof onPageRatingChange === 'function') {
      onPageRatingChange('Content Relevance Score', nextResult.relevancePercent)
    }
  }

  return (
    <main className="page-shell page-shell--content">
      <section className="hero-panel">
        <p className="hero-panel__eyebrow">{APP_NAME}</p>
        <h1>Content Relevance</h1>
        <p className="hero-panel__copy">
          Enter a topic and content text. The app will evaluate how relevant the content is to your topic and return a result instantly.
        </p>
      </section>

      <section className="home-response-grid">
        <article className="home-response-card">
          <h3>Enter Content Data</h3>
          <p className="builder-copy">Provide a topic keyword set and the content you want to evaluate.</p>

          <label htmlFor="content-topic" className="builder-label">Target Topic</label>
          <input
            id="content-topic"
            className="builder-input"
            type="text"
            value={topicText}
            onChange={(event) => setTopicText(event.target.value)}
            placeholder="Example: electric vehicles battery efficiency"
          />

          <label htmlFor="content-input" className="builder-label">Content Text</label>
          <textarea
            id="content-input"
            className="builder-input builder-input--textarea"
            value={contentText}
            onChange={(event) => setContentText(event.target.value)}
            placeholder="Paste or type content to test relevance against your topic"
          />

          <button type="button" className="builder-action" onClick={handleEvaluate}>
            Evaluate Relevance
          </button>
        </article>

        <article className="home-response-card home-response-card--result">
          <h3>Relevance Output</h3>
          <p className="home-result-badge">Verdict: {result.verdict}</p>
          <p className="builder-copy">{result.summary}</p>

          <div className="home-score-row">
            <span>Relevance</span>
            <strong>{result.relevancePercent}%</strong>
          </div>

          <div className="home-highlight">
            <h4>Matched Topic Terms</h4>
            {result.matchedTerms.length > 0 ? (
              <div className="home-highlight__legend">
                {result.matchedTerms.map((term) => (
                  <span key={term} className="home-highlight__legend-item is-positive">{term}</span>
                ))}
              </div>
            ) : (
              <p className="builder-copy">No topic keywords matched yet.</p>
            )}
          </div>
        </article>
      </section>
    </main>
  )
}

function EmojiQuickRatingPage({ onPageRatingChange }) {
  const [emojiInput, setEmojiInput] = useState('')
  const [emojiResult, setEmojiResult] = useState(() => analyzeEmojiQuickResponse(''))

  const handleGenerateEmojiResult = () => {
    const nextResult = analyzeEmojiQuickResponse(emojiInput)
    setEmojiResult(nextResult)

    if (typeof onPageRatingChange === 'function') {
      onPageRatingChange('Emoji Quick Rating', nextResult.quickRating)
    }
  }

  return (
    <main className="page-shell page-shell--emoji">
      <section className="hero-panel">
        <p className="hero-panel__eyebrow">{APP_NAME}</p>
        <h1>Emoji Quick Rating</h1>
        <p className="hero-panel__copy">
          Enter a short user response and get an instant emoji output with a quick rating.
        </p>
      </section>

      <section className="home-response-grid">
        <article className="home-response-card">
          <h3>Enter Quick Feedback</h3>
          <p className="builder-copy">Type a short response from a user, customer, or reviewer.</p>

          <label htmlFor="emoji-feedback" className="builder-label">User Input</label>
          <textarea
            id="emoji-feedback"
            className="builder-input builder-input--textarea"
            value={emojiInput}
            onChange={(event) => setEmojiInput(event.target.value)}
            placeholder="Example: Great support and smooth setup"
          />

          <button type="button" className="builder-action" onClick={handleGenerateEmojiResult}>
            Generate Emoji Result
          </button>
        </article>

        <article className="home-response-card home-response-card--result">
          <h3>Output</h3>
          <p className="emoji-output-emoji" aria-label={`Emoji result ${emojiResult.mood}`}>
            {emojiResult.emoji}
          </p>
          <p className="home-result-badge">Mood: {emojiResult.mood}</p>
          <p className="builder-copy">{emojiResult.output}</p>
          <div className="home-score-row">
            <span>Quick Rating</span>
            <strong>{emojiResult.quickRating}/3</strong>
          </div>
        </article>
      </section>
    </main>
  )
}

function ServiceExperiencePage({ onPageRatingChange }) {
  const [serviceType, setServiceType] = useState('general')
  const [serviceInput, setServiceInput] = useState('')
  const [serviceResult, setServiceResult] = useState(() => analyzeServiceExperience('', 'general'))

  const serviceTypeLabels = {
    general: 'General Service',
    support: 'Customer Support',
    delivery: 'Delivery Service',
    banking: 'Banking Service',
  }

  const serviceTypeLabel = serviceTypeLabels[serviceType] || 'General Service'

  const syncServiceResult = (nextInput = serviceInput, nextType = serviceType) => {
    const nextResult = analyzeServiceExperience(nextInput, nextType)
    setServiceResult(nextResult)

    if (typeof onPageRatingChange === 'function') {
      onPageRatingChange('Service Experience Score', nextResult.score)
    }
  }

  useEffect(() => {
    syncServiceResult()
  }, [serviceInput, serviceType])

  const handleAnalyzeService = () => {
    const nextResult = analyzeServiceExperience(serviceInput, serviceType)
    setServiceResult(nextResult)

    if (typeof onPageRatingChange === 'function') {
      onPageRatingChange('Service Experience Score', nextResult.score)
    }
  }

  const serviceScoreClass = getServiceScoreClass(serviceResult.score)

  return (
    <main className="page-shell page-shell--service">
      <section className="hero-panel">
        <p className="hero-panel__eyebrow">{APP_NAME}</p>
        <h1>Service Experience</h1>
        <p className="hero-panel__copy">
          Enter service feedback and get an instant score, verdict, and suggestion based on what was typed.
        </p>
        <div className="hero-panel__status">
          <span className="hero-panel__status-label">Live analysis</span>
          <strong>{serviceTypeLabel}</strong>
          <span>Results update as you type, so you can compare service quality immediately.</span>
        </div>
      </section>

      <section className="home-response-grid">
        <article className="home-response-card">
          <h3>Service Input</h3>
          <p className="builder-copy">Type a review about support, delivery, or banking service quality. The score updates automatically and the button can be used to refresh it manually.</p>

          <label htmlFor="service-type" className="builder-label">Service Type</label>
          <select
            id="service-type"
            className="builder-input"
            value={serviceType}
            onChange={(event) => setServiceType(event.target.value)}
          >
            <option value="general">General Service</option>
            <option value="support">Customer Support</option>
            <option value="delivery">Delivery Service</option>
            <option value="banking">Banking Service</option>
          </select>

          <label htmlFor="service-input" className="builder-label">User Input</label>
          <textarea
            id="service-input"
            className="builder-input builder-input--textarea"
            value={serviceInput}
            onChange={(event) => setServiceInput(event.target.value)}
            placeholder="Example: The support team was helpful and the response was fast, but the wait time was a little long."
          />

          <button type="button" className="builder-action" onClick={handleAnalyzeService}>
            Refresh Analysis
          </button>
        </article>

        <article className="home-response-card home-response-card--result">
          <h3>Service Output</h3>
          <p className={`home-result-badge ${serviceScoreClass}`}>Verdict: {serviceResult.verdict}</p>
          <p className="builder-copy">Selected type: {serviceTypeLabel}</p>
          <p className="builder-copy">{serviceResult.summary}</p>
          <p className="builder-copy">Suggestion: {serviceResult.suggestion}</p>

          <div className="home-score-row">
            <span>Service Score</span>
            <strong>{serviceResult.score}/10</strong>
          </div>

          <div className="home-breakdown">
            <h4>Score Meter</h4>
            <div className="home-breakdown__row is-animated">
              <div className="home-breakdown__meta">
                <span>Overall service quality</span>
                <span className={`home-breakdown__score ${serviceScoreClass}`}>{serviceResult.score}</span>
              </div>
              <div className="home-breakdown__bar-track" role="presentation">
                <div
                  className={`home-breakdown__bar ${serviceScoreClass} is-animated`}
                  style={{ width: `${(serviceResult.score / 10) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </article>
      </section>
    </main>
  )
}

function SuggestionSetupPage({ onPageRatingChange }) {
  const [categoryType, setCategoryType] = useState('cars')
  const [categoryName, setCategoryName] = useState('Cars')
  const [itemsInput, setItemsInput] = useState(CATEGORY_TEMPLATES.cars.join('\n'))
  const [groupItems, setGroupItems] = useState(CATEGORY_TEMPLATES.cars)
  const [groupRatings, setGroupRatings] = useState(
    CATEGORY_TEMPLATES.cars.reduce((accumulator, item) => {
      accumulator[item] = 0
      return accumulator
    }, {}),
  )

  const handleCategoryTypeChange = (event) => {
    const selectedType = event.target.value
    setCategoryType(selectedType)

    if (selectedType === 'custom') {
      setCategoryName('Custom Group')
      setItemsInput('')
      return
    }

    const templateItems = CATEGORY_TEMPLATES[selectedType] || []
    const formattedName = selectedType.charAt(0).toUpperCase() + selectedType.slice(1)

    setCategoryName(formattedName)
    setItemsInput(templateItems.join('\n'))
  }

  const handleGenerate = () => {
    const parsedItems = parseGroupItems(itemsInput)

    if (parsedItems.length === 0) {
      return
    }

    setGroupItems(parsedItems)
    setGroupRatings((previousRatings) => {
      const nextRatings = {}

      parsedItems.forEach((item) => {
        nextRatings[item] = Number(previousRatings[item] || 0)
      })

      return nextRatings
    })
  }

  const activeCategoryName = (categoryName || '').trim() || 'Custom Group'

  const ratedCount = groupItems.filter((item) => Number(groupRatings[item] || 0) > 0).length

  const handleExportJson = () => {
    const payload = {
      appName: APP_NAME,
      categoryType,
      categoryName: activeCategoryName,
      exportedAt: new Date().toISOString(),
      items: groupItems.map((item) => ({
        item,
        rating: Number(groupRatings[item] || 0),
        maxStars: 5,
      })),
    }

    const filename = `${slugify(activeCategoryName)}-ratings.json`
    downloadFile(filename, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8')
  }

  const handleExportCsv = () => {
    const headers = ['categoryType', 'categoryName', 'item', 'rating', 'maxStars']
    const rows = groupItems.map((item) => ([
      categoryType,
      activeCategoryName,
      item,
      String(Number(groupRatings[item] || 0)),
      '5',
    ]))

    const csvContent = [
      headers.map(escapeCsv).join(','),
      ...rows.map((row) => row.map(escapeCsv).join(',')),
    ].join('\n')

    const filename = `${slugify(activeCategoryName)}-ratings.csv`
    downloadFile(filename, csvContent, 'text/csv;charset=utf-8')
  }

  return (
    <main className="page-shell page-shell--survey">
      <section className="hero-panel">
        <p className="hero-panel__eyebrow">{APP_NAME}</p>
        <h1>Rate Any Group You Want</h1>
        <p className="hero-panel__copy">
          Select a category like cars, televisions, computers, or consumer services. Then enter your own list of brands/services and rate each one.
        </p>
      </section>

      <section className="builder-section">
        <article className="builder-card">
          <h3>Suggestion Setup</h3>
          <p className="builder-copy">Choose a category template or create your own custom rating group.</p>

          <label htmlFor="category-type" className="builder-label">Category Type</label>
          <select
            id="category-type"
            className="builder-input"
            value={categoryType}
            onChange={handleCategoryTypeChange}
          >
            <option value="cars">Cars</option>
            <option value="televisions">Televisions</option>
            <option value="computers">Computers</option>
            <option value="services">Consumer Services</option>
            <option value="custom">Custom</option>
          </select>

          <label htmlFor="category-name" className="builder-label">Group Name</label>
          <input
            id="category-name"
            className="builder-input"
            type="text"
            value={categoryName}
            onChange={(event) => setCategoryName(event.target.value)}
            placeholder="Example: Sedan Brands"
          />

          <label htmlFor="category-items" className="builder-label">Items to Rate</label>
          <textarea
            id="category-items"
            className="builder-input builder-input--textarea"
            value={itemsInput}
            onChange={(event) => setItemsInput(event.target.value)}
            placeholder="Enter one item per line or comma-separated"
          />

          <button type="button" className="builder-action" onClick={handleGenerate}>
            Generate Rating Group
          </button>
        </article>

        <article className="builder-card">
          <h3>{activeCategoryName} Ratings</h3>
          <p className="builder-copy">Rate each item in your current group. Rated {ratedCount} of {groupItems.length}.</p>

          <div className="builder-actions">
            <button type="button" className="builder-action" onClick={handleExportJson}>
              Export JSON
            </button>
            <button type="button" className="builder-action builder-action--secondary" onClick={handleExportCsv}>
              Export CSV
            </button>
          </div>

          <div className="group-ratings">
            {groupItems.map((item) => (
              <div key={item} className="group-rating-card">
                <h4>{item}</h4>
                <RatingStars
                  totalStars={5}
                  initialRatings={groupRatings[item] || 0}
                  readOnly={false}
                  label={`${activeCategoryName}: ${item}`}
                  onRatingChange={(value) => {
                    setGroupRatings((previousRatings) => ({
                      ...previousRatings,
                      [item]: value,
                    }))

                    if (typeof onPageRatingChange === 'function') {
                      onPageRatingChange(`${activeCategoryName} - ${item}`, value)
                    }
                  }}
                />
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  )
}

function App() {
  const [lastChange, setLastChange] = useState('No rating selected yet.')

  const pages = useMemo(() => PAGE_CONFIG, [])

  const handlePageRatingChange = (title, value) => {
    setLastChange(`${title}: set to ${value} star(s)`)
  }

  return (
    <div className="app-layout">
      <header className="top-nav-wrap">
        <div className="top-nav">
          <h2>{APP_NAME}</h2>
          <p className="top-nav__tagline">{APP_TAGLINE}</p>
          <nav aria-label="Primary">
            <ul className="top-nav__list">
              {pages.map((page) => (
                <li key={page.path}>
                  <NavLink
                    to={page.path}
                    className={({ isActive }) =>
                      `top-nav__link${isActive ? ' is-active' : ''}`
                    }
                  >
                    {page.title}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="hero-panel__status">
            <span className="hero-panel__status-label">Latest interaction</span>
            <strong>{lastChange}</strong>
          </div>
        </div>
      </header>

      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        {pages.map((page) => (
          <Route
            key={page.path}
            path={page.path}
            element={
              page.path === '/home'
                ? <HomeOverviewPage onPageRatingChange={handlePageRatingChange} />
                : page.path === '/service'
                  ? <ServiceExperiencePage onPageRatingChange={handlePageRatingChange} />
                : page.path === '/emoji'
                  ? <EmojiQuickRatingPage onPageRatingChange={handlePageRatingChange} />
                : page.path === '/content'
                  ? <ContentRelevancePage onPageRatingChange={handlePageRatingChange} />
                : page.path === '/survey'
                  ? <SuggestionSetupPage onPageRatingChange={handlePageRatingChange} />
                  : <RatingPage config={page} onPageRatingChange={handlePageRatingChange} />
            }
          />
        ))}
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </div>
  )
}

export default App

