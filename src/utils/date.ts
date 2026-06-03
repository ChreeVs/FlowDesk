const dateFormatter = new Intl.DateTimeFormat('it-IT', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const dateTimeFormatter = new Intl.DateTimeFormat('it-IT', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

const toDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(value)

export const formatDate = (value: string) => dateFormatter.format(toDate(value))

export const formatDateTime = (value: string) =>
  dateTimeFormatter.format(new Date(value))

export const toDatetimeLocalValue = (value: string) => {
  const date = new Date(value)
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60_000)

  return local.toISOString().slice(0, 16)
}

export const fromDatetimeLocalValue = (value: string) =>
  new Date(value).toISOString()

export const getDueBadge = (dueDate: string | null) => {
  if (!dueDate) {
    return null
  }

  const today = new Date()
  const due = new Date(`${dueDate}T00:00:00`)
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)

  const deltaDays = Math.round(
    (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  )

  if (deltaDays < 0) {
    return { tone: 'danger', label: 'Scaduto' }
  }

  if (deltaDays === 0) {
    return { tone: 'warning', label: 'Oggi' }
  }

  if (deltaDays <= 3) {
    return { tone: 'warning', label: `${deltaDays}g` }
  }

  return { tone: 'neutral', label: formatDate(dueDate) }
}
