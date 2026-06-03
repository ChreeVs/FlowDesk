import { Eye, EyeOff, Moon, Sun } from 'lucide-react'
import type { ThemeMode, UserPreferences } from '../lib/preferences'

type SettingsPageProps = {
  preferences: UserPreferences
  onUpdatePreferences: (patch: Partial<UserPreferences>) => void
}

export function SettingsPage({
  preferences,
  onUpdatePreferences,
}: SettingsPageProps) {
  const setTheme = (theme: ThemeMode) => {
    onUpdatePreferences({ theme })
  }

  return (
    <div className="page settings-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Preferenze</p>
          <h1>Impostazioni</h1>
        </div>
      </div>

      <div className="settings-list">
        <section className="settings-row">
          <div>
            <h2>Tema</h2>
            <p>Scegli la visualizzazione dell'interfaccia.</p>
          </div>
          <div className="segmented">
            <button
              className={preferences.theme === 'light' ? 'active' : ''}
              type="button"
              onClick={() => setTheme('light')}
            >
              <Sun size={15} />
              Chiaro
            </button>
            <button
              className={preferences.theme === 'dark' ? 'active' : ''}
              type="button"
              onClick={() => setTheme('dark')}
            >
              <Moon size={15} />
              Scuro
            </button>
          </div>
        </section>

        <section className="settings-row">
          <div>
            <h2>Label esplicative</h2>
            <p>Mostra o nasconde i testi brevi di contesto nelle schermate operative.</p>
          </div>
          <button
            className="text-button"
            type="button"
            onClick={() =>
              onUpdatePreferences({ showHints: !preferences.showHints })
            }
          >
            {preferences.showHints ? <Eye size={15} /> : <EyeOff size={15} />}
            {preferences.showHints ? 'Visibili' : 'Nascoste'}
          </button>
        </section>
      </div>
    </div>
  )
}
