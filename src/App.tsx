import {
  Database,
  FolderKanban,
  HelpCircle,
  LaptopMinimal,
  LogIn,
  Menu,
  Settings,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { AuthModal } from './components/AuthModal'
import { dataMode } from './lib/repository'
import {
  readPreferences,
  savePreferences,
  type UserPreferences,
} from './lib/preferences'
import { Dashboard } from './pages/Dashboard'
import { HowItWorksPage, UseCasesPage } from './pages/InfoPages'
import { ProjectPage } from './pages/ProjectPage'
import { SettingsPage } from './pages/SettingsPage'

type Route =
  | {
      name: 'projects'
    }
  | {
      name: 'project'
      id: string
    }
  | {
      name: 'settings'
    }
  | {
      name: 'how'
    }
  | {
      name: 'use-cases'
    }

type StaticRouteName = Exclude<Route['name'], 'project'>

const routePaths: Record<StaticRouteName, string> = {
  projects: '/',
  settings: '/impostazioni',
  how: '/come-funziona',
  'use-cases': '/casi-utilizzo',
}

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '')

const stripBasePath = (pathname: string) => {
  if (!basePath) {
    return pathname
  }

  if (pathname === basePath) {
    return '/'
  }

  if (pathname.startsWith(`${basePath}/`)) {
    return pathname.slice(basePath.length)
  }

  return pathname
}

const withBasePath = (path: string) =>
  basePath ? `${basePath}${path}` : path

const readRoute = (): Route => {
  const pathname = stripBasePath(window.location.pathname)
  const match = pathname.match(/^\/projects\/([^/]+)$/)

  if (match?.[1]) {
    return { name: 'project', id: decodeURIComponent(match[1]) }
  }

  if (pathname === routePaths.settings) {
    return { name: 'settings' }
  }

  if (pathname === routePaths.how) {
    return { name: 'how' }
  }

  if (pathname === routePaths['use-cases']) {
    return { name: 'use-cases' }
  }

  return { name: 'projects' }
}

function App() {
  const [route, setRoute] = useState<Route>(readRoute)
  const [preferences, setPreferences] = useState<UserPreferences>(readPreferences)
  const [authOpen, setAuthOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme
    savePreferences(preferences)
  }, [preferences])

  useEffect(() => {
    const handlePopState = () => setRoute(readRoute())
    window.addEventListener('popstate', handlePopState)

    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigate = (next: Route) => {
    const routePath =
      next.name === 'project'
        ? `/projects/${encodeURIComponent(next.id)}`
        : routePaths[next.name]
    window.history.pushState(null, '', withBasePath(routePath))
    setRoute(next)
    setMenuOpen(false)
  }

  const updatePreferences = (patch: Partial<UserPreferences>) => {
    setPreferences((current) => ({ ...current, ...patch }))
  }

  const modeIcon =
    dataMode === 'Supabase' ? <Database size={15} /> : <LaptopMinimal size={15} />

  const renderPage = () => {
    if (route.name === 'projects') {
      return (
        <Dashboard
          showHints={preferences.showHints}
          onOpenProject={(id) => navigate({ name: 'project', id })}
        />
      )
    }

    if (route.name === 'project') {
      return (
        <ProjectPage
          projectId={route.id}
          showHints={preferences.showHints}
          onBack={() => navigate({ name: 'projects' })}
        />
      )
    }

    if (route.name === 'settings') {
      return (
        <SettingsPage
          preferences={preferences}
          onUpdatePreferences={updatePreferences}
        />
      )
    }

    if (route.name === 'how') {
      return <HowItWorksPage />
    }

    return <UseCasesPage />
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="header-left">
          <button
            className="brand"
            type="button"
            onClick={() => navigate({ name: 'projects' })}
          >
            <span className="brand-mark">F</span>
            <span>FlowDesk</span>
          </button>

          <button
            className="nav-toggle"
            type="button"
            title="Menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={17} /> : <Menu size={17} />}
          </button>
        </div>

        <nav className={`nav-menu ${menuOpen ? 'open' : ''}`} aria-label="Menu">
          <button
            className={`nav-tab ${route.name === 'projects' || route.name === 'project' ? 'active' : ''}`}
            type="button"
            onClick={() => navigate({ name: 'projects' })}
          >
            <FolderKanban size={16} />
            Progetti
          </button>
          <button
            className={`nav-tab ${route.name === 'how' ? 'active' : ''}`}
            type="button"
            onClick={() => navigate({ name: 'how' })}
          >
            <HelpCircle size={16} />
            Come funziona
          </button>
          <button
            className={`nav-tab ${route.name === 'use-cases' ? 'active' : ''}`}
            type="button"
            onClick={() => navigate({ name: 'use-cases' })}
          >
            <HelpCircle size={16} />
            Casi d'Utilizzo
          </button>
          <button
            className={`nav-tab ${route.name === 'settings' ? 'active' : ''}`}
            type="button"
            onClick={() => navigate({ name: 'settings' })}
          >
            <Settings size={16} />
            Impostazioni
          </button>
        </nav>

        <div className="header-actions">
          <span className="mode-pill">
            {modeIcon}
            {dataMode}
          </span>
          <button
            className="auth-button"
            type="button"
            onClick={() => setAuthOpen(true)}
          >
            <LogIn size={16} />
            Login / Registrazione
          </button>
        </div>
      </header>

      <main>{renderPage()}</main>

      <footer className="app-footer">
        <span>FlowDesk</span>
        <span>Memoria operativa veloce per progetti, task e follow-up.</span>
      </footer>

      {authOpen ? <AuthModal onClose={() => setAuthOpen(false)} /> : null}
    </div>
  )
}

export default App
