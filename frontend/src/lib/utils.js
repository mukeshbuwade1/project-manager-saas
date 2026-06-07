/**
 * Format a date string into a human-readable format.
 * Shows relative time for recent dates, absolute for older ones.
 */
export function formatDate(dateStr, relative = true) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''

  if (relative) {
    const now = new Date()
    const diffMs = now - date
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Format a due date: "Jun 7" for current year, "Jun 7, 2025" for other years.
 */
export function formatDueDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''

  const sameYear = date.getFullYear() === new Date().getFullYear()
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
}

/**
 * Format a date for an input[type="date"] value.
 */
export function toInputDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''
  return date.toISOString().split('T')[0]
}

/**
 * Truncate a string to a max length.
 */
export function truncate(str, max = 50) {
  if (!str) return ''
  return str.length > max ? str.slice(0, max) + '…' : str
}

/**
 * Get initials from a name.
 */
export function getInitials(name = '') {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Debounce a function.
 */
export function debounce(fn, delay = 300) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}
