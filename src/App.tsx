import {
  BookOpen,
  CalendarDays,
  Database,
  FolderKanban,
  LaptopMinimal,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Settings,
  Share2,
  UserRoundCog,
  X,
} from 'lucide-react'
import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { AuthGate } from './components/AuthGate'
import { AuthModal } from './components/AuthModal'
import { dataMode, repository } from './lib/repository'
import {
  readPreferences,
  savePreferences,
  type UserPreferences,
} from './lib/preferences'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { AdminPage } from './pages/AdminPage'
import { CalendarPage } from './pages/CalendarPage'
import { Dashboard } from './pages/Dashboard'
import { GuidePage } from './pages/InfoPages'
import { LandingPage } from './pages/LandingPage'
import { PricingPage } from './pages/PricingPage'
import { ProjectPage } from './pages/ProjectPage'
import { SettingsPage } from './pages/SettingsPage'
import { SocialPlannerPage } from './pages/SocialPlannerPage'
import type { ProjectSummary } from './types'

type Route =
  | {
      name: 'landing'
    }
  | {
      name: 'dashboard'
    }
  | {
      name: 'pricing'
    }
  | {
      name: 'admin'
    }
  | {
      name: 'calendar'
    }
  | {
      name: 'social'
    }
  | {
      name: 'project'
      id: string
    }
  | {
      name: 'guide'
    }
  | {
      name: 'settings'
    }

type StaticRouteName = Exclude<Route['name'], 'project'>

const routePaths: Record<StaticRouteName, string> = {
  landing: '/',
  dashboard: '/dashboard',
  pricing: '/pricing',
  admin: '/admin',
  calendar: '/calendario',
  social: '/social',
  guide: '/guida',
  settings: '/impostazioni',
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

const normalizePathname = (pathname: string) =>
  pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname

const withBasePath = (path: string) =>
  basePath ? `${basePath}${path}` : path

const readRoute = (): Route => {
  const pathname = normalizePathname(stripBasePath(window.location.pathname))
  const match = pathname.match(/^\/projects\/([^/]+)$/)

  if (match?.[1]) {
    return { name: 'project', id: decodeURIComponent(match[1]) }
  }

  if (pathname === routePaths.dashboard || pathname === '/progetti') {
    return { name: 'dashboard' }
  }

  if (pathname === routePaths.pricing || pathname === '/prezzi') {
    return { name: 'pricing' }
  }

  if (pathname === routePaths.admin || pathname === '/utenti') {
    return { name: 'admin' }
  }

  if (pathname === routePaths.calendar || pathname === '/calendar') {
    return { name: 'calendar' }
  }

  if (pathname === routePaths.social || pathname === '/programmazione-social') {
    return { name: 'social' }
  }

  if (
    pathname === routePaths.guide ||
    pathname === '/come-funziona' ||
    pathname === '/casi-utilizzo'
  ) {
    return { name: 'guide' }
  }

  if (pathname === routePaths.settings) {
    return { name: 'settings' }
  }

  return { name: 'landing' }
}

const getAccountName = (session: Session | null) => {
  const email = session?.user.email

  if (!email) {
    return 'Account'
  }

  return email.split('@')[0]
}

function App() {
  const [route, setRoute] = useState<Route>(readRoute)
  const [preferences, setPreferences] = useState<UserPreferences>(readPreferences)
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured)
  const [authOpen, setAuthOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarProjects, setSidebarProjects] = useState<ProjectSummary[]>([])

  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme
    savePreferences(preferences)
  }, [preferences])

  useEffect(() => {
    if (!supabase) {
      return
    }

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthReady(true)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setAuthReady(true)
    })

    return () => subscription.unsubscribe()
  }, [])

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
    setSidebarOpen(false)
  }

  useEffect(() => {
    if (session && route.name === 'pricing') {
      navigate({ name: 'dashboard' })
    }
  }, [route.name, session])

  useEffect(() => {
    const isPublicRoute = route.name === 'landing' || route.name === 'pricing'

    if (isPublicRoute || (isSupabaseConfigured && !session)) {
      setSidebarProjects([])
      return
    }

    let ignore = false

    void repository
      .listProjects()
      .then((projects) => {
        if (!ignore) {
          setSidebarProjects(projects)
        }
      })
      .catch(() => {
        if (!ignore) {
          setSidebarProjects([])
        }
      })

    return () => {
      ignore = true
    }
  }, [route, session])

  const updatePreferences = (patch: Partial<UserPreferences>) => {
    setPreferences((current) => ({ ...current, ...patch }))
  }

  const logout = async () => {
    if (!supabase) {
      return
    }

    await supabase.auth.signOut()
    navigate({ name: 'landing' })
  }

  const modeIcon =
    dataMode === 'Supabase' ? <Database size={15} /> : <LaptopMinimal size={15} />

  const renderPrivatePage = () => {
    if (route.name === 'project') {
      return (
        <ProjectPage
          projectId={route.id}
          showHints={preferences.showHints}
          onBack={() => navigate({ name: 'dashboard' })}
        />
      )
    }

    if (route.name === 'guide') {
      return <GuidePage />
    }

    if (route.name === 'settings') {
      return (
        <SettingsPage
          preferences={preferences}
          onUpdatePreferences={updatePreferences}
        />
      )
    }

    if (route.name === 'admin') {
      return <AdminPage />
    }

    if (route.name === 'calendar') {
      return <CalendarPage />
    }

    if (route.name === 'social') {
      return <SocialPlannerPage />
    }

    return (
      <Dashboard
        showHints={preferences.showHints}
        onOpenProject={(id) => navigate({ name: 'project', id })}
      />
    )
  }

  const privateRoute =
    route.name === 'landing' ? ({ name: 'dashboard' } as const) : route
  const activeProject =
    route.name === 'project'
      ? sidebarProjects.find((project) => project.id === route.id)
      : null

  return (
    <>
      {route.name === 'landing' || (route.name === 'pricing' && !session) ? (
        route.name === 'pricing' ? (
          <PricingPage
            isAuthenticated={Boolean(session)}
            onBackHome={() => navigate({ name: 'landing' })}
            onLogin={() => setAuthOpen(true)}
            onOpenApp={() => navigate({ name: 'dashboard' })}
          />
        ) : (
          <LandingPage
            isAuthenticated={Boolean(session)}
            onLogin={() => setAuthOpen(true)}
            onOpenApp={() => navigate({ name: 'dashboard' })}
            onOpenPricing={() => navigate({ name: 'pricing' })}
          />
        )
      ) : (
        <div className="workspace-shell">
          <button
            className="mobile-sidebar-toggle"
            type="button"
            title="Menu"
            onClick={() => setSidebarOpen((open) => !open)}
          >
            {sidebarOpen ? <X size={17} /> : <Menu size={17} />}
          </button>

          <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
            <div>
              <button
                className="sidebar-brand"
                type="button"
                onClick={() => navigate({ name: 'landing' })}
              >
                <span className="brand-mark">F</span>
                <span>FlowDesk</span>
              </button>

              <div className="active-workspace">
                <span>
                  <FolderKanban size={16} />
                </span>
                <div>
                  <small>Workspace</small>
                  {sidebarProjects.length > 1 ? (
                    <select
                      value={route.name === 'project' ? route.id : ''}
                      onChange={(event) => {
                        if (event.target.value) {
                          navigate({ name: 'project', id: event.target.value })
                          return
                        }

                        navigate({ name: 'dashboard' })
                      }}
                    >
                      <option value="">Progetti</option>
                      {sidebarProjects.map((project) => (
                        <option value={project.id} key={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <strong>{activeProject?.name ?? 'Progetti'}</strong>
                  )}
                </div>
              </div>

              <nav className="sidebar-menu" aria-label="Menu principale">
                <button
                  className={
                    privateRoute.name === 'dashboard' ||
                    privateRoute.name === 'project'
                      ? 'active'
                      : ''
                  }
                  type="button"
                  onClick={() => navigate({ name: 'dashboard' })}
                >
                  <LayoutDashboard size={16} />
                  Dashboard
                </button>
                <button
                  className={privateRoute.name === 'calendar' ? 'active' : ''}
                  type="button"
                  onClick={() => navigate({ name: 'calendar' })}
                >
                  <CalendarDays size={16} />
                  Calendario
                </button>
                <button
                  className={privateRoute.name === 'social' ? 'active' : ''}
                  type="button"
                  onClick={() => navigate({ name: 'social' })}
                >
                  <Share2 size={16} />
                  Social
                </button>
                <button
                  type="button"
                  onClick={() => navigate({ name: 'dashboard' })}
                >
                  <FolderKanban size={16} />
                  Progetti
                </button>
                <button
                  className={privateRoute.name === 'guide' ? 'active' : ''}
                  type="button"
                  onClick={() => navigate({ name: 'guide' })}
                >
                  <BookOpen size={16} />
                  Guida
                </button>
                <button
                  className={privateRoute.name === 'admin' ? 'active' : ''}
                  type="button"
                  onClick={() => navigate({ name: 'admin' })}
                >
                  <UserRoundCog size={16} />
                  Admin
                </button>
                <button
                  className={privateRoute.name === 'settings' ? 'active' : ''}
                  type="button"
                  onClick={() => navigate({ name: 'settings' })}
                >
                  <Settings size={16} />
                  Impostazioni
                </button>
              </nav>
            </div>

            <div className="sidebar-footer">
              <span className="mode-pill sidebar-mode">
                {modeIcon}
                {dataMode}
              </span>
              {session ? (
                <div className="sidebar-account">
                  <span>{getAccountName(session).slice(0, 2).toUpperCase()}</span>
                  <div>
                    <strong>{getAccountName(session)}</strong>
                    <small>{session.user.email}</small>
                  </div>
                  <button
                    className="icon-button ghost"
                    type="button"
                    title="Esci"
                    onClick={() => void logout()}
                  >
                    <LogOut size={15} />
                  </button>
                </div>
              ) : (
                <button
                  className="auth-button sidebar-login"
                  type="button"
                  onClick={() => setAuthOpen(true)}
                >
                  <LogIn size={16} />
                  Login / Registrazione
                </button>
              )}
            </div>
          </aside>

          <main className="workspace-main">
            <AuthGate
              loading={!authReady}
              locked={isSupabaseConfigured && !session}
              onLogin={() => setAuthOpen(true)}
            >
              {renderPrivatePage()}
            </AuthGate>
          </main>
        </div>
      )}

      {authOpen ? (
        <AuthModal
          onClose={() => setAuthOpen(false)}
          onAuthenticated={() => {
            setAuthOpen(false)
            if (route.name === 'landing' || route.name === 'pricing') {
              navigate({ name: 'dashboard' })
            }
          }}
        />
      ) : null}
    </>
  )
}

export default App
