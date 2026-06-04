import {
  Bell,
  BookOpen,
  CalendarDays,
  ChevronDown,
  Database,
  FolderKanban,
  Inbox,
  LaptopMinimal,
  LayoutDashboard,
  LogIn,
  LogOut,
  Megaphone,
  Menu,
  MessageCircle,
  Settings,
  Share2,
  UserRoundCog,
  X,
} from 'lucide-react'
import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useState } from 'react'
import { AuthGate } from './components/AuthGate'
import { AuthModal } from './components/AuthModal'
import { GuidedTour, type TourStep } from './components/GuidedTour'
import { dataMode, repository } from './lib/repository'
import {
  readPreferences,
  savePreferences,
  type UserPreferences,
} from './lib/preferences'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { AdminPage } from './pages/AdminPage'
import { CalendarPage } from './pages/CalendarPage'
import { ClientRequestPage } from './pages/ClientRequestPage'
import { Dashboard } from './pages/Dashboard'
import { GuidePage } from './pages/InfoPages'
import { LandingPage } from './pages/LandingPage'
import { PricingPage } from './pages/PricingPage'
import { ProjectPage } from './pages/ProjectPage'
import { ProjectSettingsPage } from './pages/ProjectSettingsPage'
import { RequestsPage } from './pages/RequestsPage'
import { SettingsPage } from './pages/SettingsPage'
import { SponsorAdsPage } from './pages/SponsorAdsPage'
import { SocialPlannerPage } from './pages/SocialPlannerPage'
import type { AppNotification, ProjectSummary } from './types'

const TOUR_STORAGE_KEY = 'flowdesk-guided-tour-completed-v1'

const tourSteps: TourStep[] = [
  {
    selector: '[data-tour="workspace"]',
    title: 'Workspace progetti',
    description:
      'Qui trovi il progetto attivo. Quando hai piu progetti, questo menu ti permette di passare rapidamente da uno all altro.',
  },
  {
    selector: '[data-tour="dashboard"]',
    title: 'Dashboard',
    description:
      'La dashboard raccoglie i progetti e ti permette di crearne uno nuovo in pochi secondi.',
  },
  {
    selector: '[data-tour="calendar"]',
    title: 'Calendario editoriale',
    description:
      'Usa il calendario per pianificare note operative e contenuti collegati a un progetto.',
  },
  {
    selector: '[data-tour="requests"]',
    title: 'Richieste clienti',
    description:
      'Qui gestisci le richieste arrivate dai link cliente: stato, note interne e file di lavoro.',
  },
  {
    selector: '[data-tour="social"]',
    title: 'Social planner',
    description:
      'Prepara post Facebook e Instagram, collegandoli al progetto corretto prima della pubblicazione.',
  },
  {
    selector: '[data-tour="sponsorads"]',
    title: 'SponsorAds',
    description:
      'Prepara batch di sponsorizzazioni da post pubblicati e salva gli export operativi per Meta Ads.',
  },
  {
    selector: '[data-tour="notifications"]',
    title: 'Notifiche',
    description:
      'Da qui controllerai promemoria, scadenze e aggiornamenti importanti del workspace.',
  },
  {
    selector: '[data-tour="support"]',
    title: 'Assistenza',
    description:
      'Il pulsante assistenza raccoglie aiuto, riferimenti e supporto operativo quando serve.',
  },
]

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
      name: 'requests'
    }
  | {
      name: 'social'
    }
  | {
      name: 'sponsorads'
    }
  | {
      name: 'project'
      id: string
    }
  | {
      name: 'projectSettings'
      id: string
    }
  | {
      name: 'clientRequest'
      token: string
    }
  | {
      name: 'guide'
    }
  | {
      name: 'settings'
    }

type StaticRouteName = Exclude<
  Route['name'],
  'project' | 'projectSettings' | 'clientRequest'
>

const routePaths: Record<StaticRouteName, string> = {
  landing: '/',
  dashboard: '/dashboard',
  pricing: '/pricing',
  admin: '/admin',
  calendar: '/calendario',
  requests: '/richieste',
  social: '/social',
  sponsorads: '/sponsorads',
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
  const requestMatch = pathname.match(/^\/richiesta\/([^/]+)$/)
  const settingsMatch = pathname.match(/^\/projects\/([^/]+)\/settings$/)
  const match = pathname.match(/^\/projects\/([^/]+)$/)

  if (requestMatch?.[1]) {
    return { name: 'clientRequest', token: decodeURIComponent(requestMatch[1]) }
  }

  if (settingsMatch?.[1]) {
    return { name: 'projectSettings', id: decodeURIComponent(settingsMatch[1]) }
  }

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

  if (pathname === routePaths.requests || pathname === '/requests') {
    return { name: 'requests' }
  }

  if (pathname === routePaths.social || pathname === '/programmazione-social') {
    return { name: 'social' }
  }

  if (pathname === routePaths.sponsorads || pathname === '/ads') {
    return { name: 'sponsorads' }
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
  const [projectSwitcherOpen, setProjectSwitcherOpen] = useState(false)
  const [sidebarProjects, setSidebarProjects] = useState<ProjectSummary[]>([])
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [tourOpen, setTourOpen] = useState(false)
  const [tourDismissed, setTourDismissed] = useState(false)

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
        : next.name === 'projectSettings'
          ? `/projects/${encodeURIComponent(next.id)}/settings`
        : next.name === 'clientRequest'
          ? `/richiesta/${encodeURIComponent(next.token)}`
        : routePaths[next.name]
    window.history.pushState(null, '', withBasePath(routePath))
    setRoute(next)
    setSidebarOpen(false)
    setProjectSwitcherOpen(false)
    setNotificationsOpen(false)
  }

  useEffect(() => {
    if (session && route.name === 'pricing') {
      navigate({ name: 'dashboard' })
    }
  }, [route.name, session])

  useEffect(() => {
    const privateRouteOpen =
      route.name !== 'landing' &&
      route.name !== 'pricing' &&
      route.name !== 'clientRequest'
    const completed = localStorage.getItem(TOUR_STORAGE_KEY) === 'true'

    if (authReady && privateRouteOpen && !completed && !tourDismissed) {
      const timer = window.setTimeout(() => setTourOpen(true), 450)

      return () => window.clearTimeout(timer)
    }
  }, [authReady, route.name, tourDismissed])

  useEffect(() => {
    const isPublicRoute =
      route.name === 'landing' ||
      route.name === 'pricing' ||
      route.name === 'clientRequest'

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

  const loadNotifications = useCallback(async () => {
    if (route.name === 'landing' || route.name === 'pricing' || route.name === 'clientRequest') {
      setNotifications([])
      return
    }

    if (isSupabaseConfigured && !session) {
      setNotifications([])
      return
    }

    try {
      setNotifications(await repository.listNotifications())
    } catch {
      setNotifications([])
    }
  }, [route.name, session])

  useEffect(() => {
    void loadNotifications()
  }, [loadNotifications])

  const markNotificationsRead = async () => {
    const unread = notifications.filter(
      (notification) => notification.status === 'unread',
    )

    await Promise.all(
      unread.map((notification) => repository.markNotificationRead(notification.id)),
    )
    setNotifications((current) =>
      current.map((notification) => ({ ...notification, status: 'read' })),
    )
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
          onOpenSettings={() =>
            navigate({ name: 'projectSettings', id: route.id })
          }
        />
      )
    }

    if (route.name === 'projectSettings') {
      return (
        <ProjectSettingsPage
          projectId={route.id}
          onBack={() => navigate({ name: 'project', id: route.id })}
        />
      )
    }

    if (route.name === 'guide') {
      return (
        <GuidePage
          onStartDemo={() => {
            setTourDismissed(false)
            setTourOpen(true)
          }}
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

    if (route.name === 'admin') {
      return <AdminPage />
    }

    if (route.name === 'calendar') {
      return <CalendarPage />
    }

    if (route.name === 'requests') {
      return <RequestsPage />
    }

    if (route.name === 'social') {
      return <SocialPlannerPage />
    }

    if (route.name === 'sponsorads') {
      return <SponsorAdsPage />
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
    route.name === 'project' || route.name === 'projectSettings'
      ? sidebarProjects.find((project) => project.id === route.id)
      : null
  const unreadNotifications = notifications.filter(
    (notification) => notification.status === 'unread',
  ).length

  return (
    <>
      {route.name === 'clientRequest' ? (
        <ClientRequestPage
          token={route.token}
          onBackHome={() => navigate({ name: 'landing' })}
        />
      ) : route.name === 'landing' || (route.name === 'pricing' && !session) ? (
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
                data-tour="brand"
                onClick={() => navigate({ name: 'landing' })}
              >
                <span className="brand-mark">F</span>
                <span>FlowDesk</span>
              </button>

              <div className="active-workspace" data-tour="workspace">
                <span>
                  <FolderKanban size={16} />
                </span>
                <div>
                  <small>Workspace</small>
                  {sidebarProjects.length > 1 ? (
                    <div className="project-switcher">
                      <button
                        className="project-switcher-trigger"
                        type="button"
                        onClick={() => setProjectSwitcherOpen((open) => !open)}
                      >
                        <span>{activeProject?.name ?? 'Progetti'}</span>
                        <ChevronDown size={13} />
                      </button>
                      {projectSwitcherOpen ? (
                        <div className="project-switcher-menu">
                          <button
                            type="button"
                            onClick={() => navigate({ name: 'dashboard' })}
                          >
                            Tutti i progetti
                          </button>
                          {sidebarProjects.map((project) => (
                            <button
                              className={
                                activeProject?.id === project.id ? 'active' : ''
                              }
                              type="button"
                              key={project.id}
                              onClick={() =>
                                navigate({ name: 'project', id: project.id })
                              }
                            >
                              <span
                                className="project-switcher-dot"
                                aria-hidden="true"
                              />
                              {project.name}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <strong>{activeProject?.name ?? 'Progetti'}</strong>
                  )}
                </div>
              </div>

              <nav className="sidebar-menu" aria-label="Menu principale">
                <button
                  className={
                    privateRoute.name === 'dashboard' ||
                    privateRoute.name === 'project' ||
                    privateRoute.name === 'projectSettings'
                      ? 'active'
                      : ''
                  }
                  type="button"
                  data-tour="dashboard"
                  onClick={() => navigate({ name: 'dashboard' })}
                >
                  <LayoutDashboard size={16} />
                  Dashboard
                </button>
                <button
                  className={privateRoute.name === 'calendar' ? 'active' : ''}
                  type="button"
                  data-tour="calendar"
                  onClick={() => navigate({ name: 'calendar' })}
                >
                  <CalendarDays size={16} />
                  Calendario
                </button>
                <button
                  className={privateRoute.name === 'requests' ? 'active' : ''}
                  type="button"
                  data-tour="requests"
                  onClick={() => navigate({ name: 'requests' })}
                >
                  <Inbox size={16} />
                  Richieste
                </button>
                <button
                  className={privateRoute.name === 'social' ? 'active' : ''}
                  type="button"
                  data-tour="social"
                  onClick={() => navigate({ name: 'social' })}
                >
                  <Share2 size={16} />
                  Social
                </button>
                <button
                  className={privateRoute.name === 'sponsorads' ? 'active' : ''}
                  type="button"
                  data-tour="sponsorads"
                  onClick={() => navigate({ name: 'sponsorads' })}
                >
                  <Megaphone size={16} />
                  SponsorAds
                </button>
                <button
                  type="button"
                  data-tour="projects"
                  onClick={() => navigate({ name: 'dashboard' })}
                >
                  <FolderKanban size={16} />
                  Progetti
                </button>
                <button
                  className={privateRoute.name === 'guide' ? 'active' : ''}
                  type="button"
                  data-tour="guide"
                  onClick={() => navigate({ name: 'guide' })}
                >
                  <BookOpen size={16} />
                  Guida
                </button>
                <button
                  className={privateRoute.name === 'admin' ? 'active' : ''}
                  type="button"
                  data-tour="admin"
                  onClick={() => navigate({ name: 'admin' })}
                >
                  <UserRoundCog size={16} />
                  Admin
                </button>
                <button
                  className={privateRoute.name === 'settings' ? 'active' : ''}
                  type="button"
                  data-tour="settings"
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
            <div className="workspace-topbar">
              <div />
              <div className="workspace-actions">
                <button
                  className="topbar-icon"
                  type="button"
                  title="Assistenza"
                  data-tour="support"
                >
                  <MessageCircle size={19} />
                </button>
                <button
                  className="topbar-icon"
                  type="button"
                  title="Notifiche"
                  data-tour="notifications"
                  onClick={() => {
                    void loadNotifications()
                    setNotificationsOpen((open) => !open)
                  }}
                >
                  <Bell size={19} />
                  {unreadNotifications > 0 ? (
                    <span>{unreadNotifications}</span>
                  ) : null}
                </button>
                {notificationsOpen ? (
                  <div className="notifications-panel">
                    <div>
                      <strong>Notifiche</strong>
                      {unreadNotifications > 0 ? (
                        <button
                          type="button"
                          onClick={() => void markNotificationsRead()}
                        >
                          Segna lette
                        </button>
                      ) : null}
                    </div>
                    {notifications.length === 0 ? (
                      <p>Nessuna notifica</p>
                    ) : (
                      notifications.map((notification) => (
                        <article
                          className={
                            notification.status === 'unread' ? 'unread' : ''
                          }
                          key={notification.id}
                        >
                          <strong>{notification.title}</strong>
                          <span>{notification.text}</span>
                        </article>
                      ))
                    )}
                  </div>
                ) : null}
              </div>
            </div>
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

      {tourOpen ? (
        <GuidedTour
          steps={tourSteps}
          onClose={(completed) => {
            if (completed) {
              localStorage.setItem(TOUR_STORAGE_KEY, 'true')
            } else {
              setTourDismissed(true)
            }
            setTourOpen(false)
          }}
        />
      ) : null}
    </>
  )
}

export default App
