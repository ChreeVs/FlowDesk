export type ThemeMode = 'light' | 'dark'

export type UserPreferences = {
  theme: ThemeMode
  showHints: boolean
}

const PREFERENCES_KEY = 'flowdesk-preferences-v1'

export const defaultPreferences: UserPreferences = {
  theme: 'light',
  showHints: true,
}

export const readPreferences = (): UserPreferences => {
  const raw = localStorage.getItem(PREFERENCES_KEY)

  if (!raw) {
    return defaultPreferences
  }

  try {
    return { ...defaultPreferences, ...JSON.parse(raw) }
  } catch {
    return defaultPreferences
  }
}

export const savePreferences = (preferences: UserPreferences) => {
  localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences))
}
