export const normalizeUrl = (value: string) => {
  const trimmed = value.trim()

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }

  return `https://${trimmed}`
}
