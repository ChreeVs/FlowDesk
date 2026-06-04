import {
  CalendarDays,
  List,
  Plus,
  Share2,
  Trash2,
  Sparkles,
  Bot,
  Compass,
  Clock,
  X,
  FolderKanban,
  FileText,
  Check
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { metaApi } from '../lib/meta'
import type { MetaSocialStatus } from '../lib/meta'
import { repository } from '../lib/repository'
import type {
  ProjectSummary,
  SocialPlatform,
  SocialPostSummary,
} from '../types'
import {
  formatDateTime,
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from '../utils/date'
import { getErrorMessage } from '../utils/error'
import { normalizeUrl } from '../utils/url'

const defaultScheduleInput = () => {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  date.setHours(9, 0, 0, 0)
  return toDatetimeLocalValue(date.toISOString())
}


interface ConnectedAccount {
  id: string
  platform: SocialPlatform
  name: string
  handle: string
  avatarUrl: string
  connected: boolean
  isRealMeta?: boolean
}

const DEFAULT_ACCOUNTS: ConnectedAccount[] = [
  {
    id: 'facebook',
    platform: 'facebook',
    name: 'FlowDesk Facebook Page',
    handle: 'flowdesk.workspace',
    avatarUrl: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=100&auto=format&fit=crop',
    connected: true,
    isRealMeta: true
  },
  {
    id: 'instagram',
    platform: 'instagram',
    name: 'FlowDesk IG Business',
    handle: 'flowdesk_app',
    avatarUrl: 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=100&auto=format&fit=crop',
    connected: true,
    isRealMeta: true
  },
  {
    id: 'linkedin',
    platform: 'linkedin',
    name: 'Christian Valese',
    handle: 'christian-valese',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop',
    connected: false
  },
  {
    id: 'twitter',
    platform: 'twitter',
    name: 'FlowDesk Workspace',
    handle: 'flowdesk_app',
    avatarUrl: 'https://images.unsplash.com/photo-1611605698335-8b15d27e03f9?w=100&auto=format&fit=crop',
    connected: false
  },
  {
    id: 'tiktok',
    platform: 'tiktok',
    name: 'FlowDesk Studio',
    handle: 'flowdesk_tiktok',
    avatarUrl: 'https://images.unsplash.com/photo-1599305090598-615254b233a8?w=100&auto=format&fit=crop',
    connected: false
  },
  {
    id: 'pinterest',
    platform: 'pinterest',
    name: 'FlowDesk Boards',
    handle: 'flowdesk_pins',
    avatarUrl: 'https://images.unsplash.com/photo-1611162618071-b39a2ec055fb?w=100&auto=format&fit=crop',
    connected: false
  },
  {
    id: 'youtube',
    platform: 'youtube',
    name: 'FlowDesk Channel',
    handle: 'flowdesk_studio',
    avatarUrl: 'https://images.unsplash.com/photo-1611162618828-bc409f855c8c?w=100&auto=format&fit=crop',
    connected: false
  }
]

const getBrandColor = (platform: SocialPlatform) => {
  switch (platform) {
    case 'facebook': return '#1877f2'
    case 'instagram': return '#e1306c'
    case 'linkedin': return '#0a66c2'
    case 'twitter': return '#1da1f2'
    case 'tiktok': return '#000000'
    case 'pinterest': return '#bd081c'
    case 'youtube': return '#ff0000'
    default: return '#6b58d6'
  }
}

const getPlatformCharLimit = (platform: string) => {
  switch (platform) {
    case 'twitter': return 280
    case 'instagram': return 2200
    case 'tiktok': return 2200
    case 'pinterest': return 500
    case 'linkedin': return 3000
    case 'youtube': return 5000
    default: return 63206
  }
}

interface PlatformTexts {
  general: string
  facebook?: string
  instagram?: string
  linkedin?: string
  twitter?: string
  tiktok?: string
  pinterest?: string
  youtube?: string
  [key: string]: string | undefined
}

export function SocialPlannerPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [posts, setPosts] = useState<SocialPostSummary[]>([])
  const [projectId, setProjectId] = useState('')
  const [mediaUrl, setMediaUrl] = useState('')
  const [scheduledAt, setScheduledAt] = useState(defaultScheduleInput)
  
  // Custom multi-platform texts
  const [texts, setTexts] = useState<PlatformTexts>({ general: '' })
  const [activeTab, setActiveTab] = useState<string>('general')

  // Channels state
  const [connectedChannels, setConnectedChannels] = useState<ConnectedAccount[]>([])
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['facebook', 'instagram'])

  // Actual Meta oauth status
  const [metaStatus, setMetaStatus] = useState<MetaSocialStatus>({
    connected: false,
    pages: [],
    instagram_accounts: [],
  })

  // Simulated AI Writer
  const [aiDropdownOpen, setAiDropdownOpen] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiStatusMessage, setAiStatusMessage] = useState('')

  // Connection modal
  const [connectModalPlatform, setConnectModalPlatform] = useState<ConnectedAccount | null>(null)
  const [connectProfileName, setConnectProfileName] = useState('')
  const [connectProfileHandle, setConnectProfileHandle] = useState('')

  // UI filters & view mode
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [filterPlatform, setFilterPlatform] = useState<string>('all')
  const [filterProject, setFilterProject] = useState<string>('all')
  const [previewPlatform, setPreviewPlatform] = useState<string>('facebook')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  // Load channels configuration
  useEffect(() => {
    const stored = localStorage.getItem('flowdesk-connected-channels')
    if (stored) {
      try {
        setConnectedChannels(JSON.parse(stored))
      } catch {
        setConnectedChannels(DEFAULT_ACCOUNTS)
      }
    } else {
      setConnectedChannels(DEFAULT_ACCOUNTS)
      localStorage.setItem('flowdesk-connected-channels', JSON.stringify(DEFAULT_ACCOUNTS))
    }
  }, [])

  // Sync actual Meta status with accounts connection state
  const loadMetaStatus = useCallback(async () => {
    try {
      const status = await metaApi.getSocialStatus()
      setMetaStatus(status)
      setConnectedChannels((current) => {
        const next = current.map((ch) => {
          if (ch.platform === 'facebook') {
            return {
              ...ch,
              connected: status.connected && status.pages.length > 0,
              name: (status.connected && status.meta_user_name) || 'Facebook Page',
            }
          }
          if (ch.platform === 'instagram') {
            return {
              ...ch,
              connected: status.connected && status.instagram_accounts.length > 0,
              name: (status.connected && status.instagram_accounts[0]?.name) || 'Instagram Business',
              handle: (status.connected && status.instagram_accounts[0]?.username) || 'instagram_business',
            }
          }
          return ch
        })
        localStorage.setItem('flowdesk-connected-channels', JSON.stringify(next))
        return next
      })
    } catch {
      setMetaStatus({
        connected: false,
        pages: [],
        instagram_accounts: [],
      })
    }
  }, [])

  const loadPosts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [loadedProjects, loadedPosts] = await Promise.all([
        repository.listProjects(),
        repository.listSocialPosts(),
      ])
      setProjects(loadedProjects)
      setPosts(loadedPosts)
      setProjectId((current) => current || loadedProjects[0]?.id || '')
    } catch (loadError) {
      setError(getErrorMessage(loadError))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadPosts()
    void loadMetaStatus()
  }, [loadPosts, loadMetaStatus])

  // Get active text helper
  const getActiveText = () => {
    if (activeTab === 'general') {
      return texts.general
    }
    return texts[activeTab] !== undefined ? (texts[activeTab] ?? '') : texts.general
  }

  // Update text for tab helper
  const handleTextChange = (val: string) => {
    setTexts((current) => ({
      ...current,
      [activeTab]: val,
    }))
  }

  // AI Assist simulator
  const runAiAssist = (actionType: 'expand' | 'emojis' | 'hashtags' | 'professional' | 'friendly') => {
    setAiDropdownOpen(false)
    setAiLoading(true)
    const originalText = getActiveText()

    const progressMsgs = ['L\'AI sta leggendo il post...', 'Scrittura in corso...', 'Rifinitura dettagli...']
    let currentMsgIdx = 0
    setAiStatusMessage(progressMsgs[0])

    const msgInterval = setInterval(() => {
      currentMsgIdx++
      if (currentMsgIdx < progressMsgs.length) {
        setAiStatusMessage(progressMsgs[currentMsgIdx])
      }
    }, 400)

    setTimeout(() => {
      clearInterval(msgInterval)
      let newText = originalText

      if (actionType === 'expand') {
        newText = `📢 NOVITÀ IN ARRIVO! \n\n${originalText || 'Iniziamo un nuovo capitolo oggi.'}\n\nSiamo felici di portare il nostro lavoro al livello successivo e non vediamo l'ora di condividere tutti i dettagli con voi nelle prossime settimane! Restate sintonizzati per aggiornamenti esclusivi. 🚀✨\n\n💡 Lascia un commento con la tua opinione o visita il link in bio per saperne di più! 👇`
      } else if (actionType === 'emojis') {
        newText = `✨ ${originalText || 'Nuovo post operativo!'} 🚀 🔥 Let's go! 🎯`
      } else if (actionType === 'hashtags') {
        const platformTags = activeTab === 'linkedin' ? ' #networking #management' : activeTab === 'instagram' ? ' #instadaily #marketingtips' : ''
        newText = `${originalText}\n\n#socialmedia #productivity #flowdesk #workspace #workflow${platformTags}`
      } else if (actionType === 'professional') {
        newText = `Siamo lieti di comunicare il seguente aggiornamento operativo: "${originalText || 'Aggiornamento di FlowDesk'}". Rimaniamo a completa disposizione per supportare le vostre attività commerciali e ottimizzare la gestione dei vostri flussi operativi di business.`
      } else if (actionType === 'friendly') {
        newText = `Ciao a tutti! 👋 Volevamo condividere al volo questa novità: "${originalText || 'Qualcosa di bello bolle in pentola!'}". Che ne pensate? Scrivetelo nei commenti! 😊👇`
      }

      setTexts((current) => ({
        ...current,
        [activeTab]: newText,
      }))
      setAiLoading(false)
    }, 1300)
  }

  // Channel toggling
  const toggleChannelSelection = (channelId: string) => {
    const channel = connectedChannels.find((c) => c.id === channelId)
    if (!channel?.connected) {
      // Trigger Connection modal
      setConnectModalPlatform(channel ?? null)
      setConnectProfileName(channel?.name ?? '')
      setConnectProfileHandle(channel?.handle ?? '')
      return
    }

    setSelectedChannels((current) => {
      const next = current.includes(channelId)
        ? current.filter((id) => id !== channelId)
        : [...current, channelId]
      
      // Update preview platform to match one of selected
      if (next.length > 0 && !next.includes(previewPlatform)) {
        setPreviewPlatform(next[0])
      }
      return next
    })
  }

  // Simulated Connection flow
  const handleConnectSimulated = () => {
    if (!connectModalPlatform) return
    const platformId = connectModalPlatform.id

    setConnecting(true)
    setTimeout(() => {
      setConnectedChannels((current) => {
        const next = current.map((ch) => {
          if (ch.id === platformId) {
            return {
              ...ch,
              connected: true,
              name: connectProfileName.trim() || ch.name,
              handle: connectProfileHandle.trim() || ch.handle,
            }
          }
          return ch
        })
        localStorage.setItem('flowdesk-connected-channels', JSON.stringify(next))
        return next
      })
      setSelectedChannels((current) => Array.from(new Set([...current, platformId])))
      setPreviewPlatform(platformId)
      setConnecting(false)
      setConnectModalPlatform(null)
      setMessage(`Canale ${connectModalPlatform.platform} collegato con successo.`)
      setTimeout(() => setMessage(null), 3000)
    }, 900)
  }

  const handleDisconnectSimulated = (platformId: string) => {
    if (platformId === 'facebook' || platformId === 'instagram') {
      void disconnectMeta()
      return
    }

    setConnectedChannels((current) => {
      const next = current.map((ch) => {
        if (ch.id === platformId) {
          return { ...ch, connected: false }
        }
        return ch
      })
      localStorage.setItem('flowdesk-connected-channels', JSON.stringify(next))
      return next
    })
    setSelectedChannels((current) => current.filter((id) => id !== platformId))
    setMessage('Canale rimosso.')
    setTimeout(() => setMessage(null), 3000)
  }

  const connectMeta = async () => {
    setConnecting(true)
    setError(null)
    try {
      const { url } = await metaApi.startSocialOAuth()
      window.location.href = url
    } catch (connectError) {
      setError(getErrorMessage(connectError))
      setConnecting(false)
    }
  }

  const disconnectMeta = async () => {
    setConnecting(true)
    setError(null)
    try {
      await metaApi.disconnectSocial()
      await loadMetaStatus()
      setMessage('Connessione Meta rimossa.')
      setTimeout(() => setMessage(null), 3000)
    } catch (disconnectError) {
      setError(getErrorMessage(disconnectError))
    } finally {
      setConnecting(false)
    }
  }

  // Create post
  const handlePublishPost = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (
      !projectId ||
      !texts.general.trim() ||
      selectedChannels.length === 0 ||
      !scheduledAt
    ) {
      setError('Compila tutti i campi e seleziona almeno un canale social.')
      return
    }

    setSaving(true)
    setError(null)

    // Build the final serialized text if there are overrides, otherwise save plain general text
    let finalPayloadText = texts.general.trim()
    const platformsWithOverride = selectedChannels.filter((p) => texts[p] !== undefined && texts[p]?.trim() !== '')
    if (platformsWithOverride.length > 0) {
      const serializedObj: PlatformTexts = { general: texts.general.trim() }
      platformsWithOverride.forEach((p) => {
        serializedObj[p] = texts[p]?.trim()
      })
      finalPayloadText = JSON.stringify(serializedObj)
    }

    try {
      const created = await repository.createSocialPost({
        project_id: projectId,
        text: finalPayloadText,
        media_url: mediaUrl.trim() ? normalizeUrl(mediaUrl) : '',
        platforms: selectedChannels as SocialPlatform[],
        status: 'scheduled',
        scheduled_at: fromDatetimeLocalValue(scheduledAt),
      })

      // Reset editor
      setTexts({ general: '' })
      setMediaUrl('')
      setScheduledAt(defaultScheduleInput())
      setActiveTab('general')

      setPosts((current) =>
        [...current, created].sort(
          (a, b) =>
            new Date(a.scheduled_at).getTime() -
            new Date(b.scheduled_at).getTime(),
        ),
      )
      setMessage('Post programmato con successo!')
      setTimeout(() => setMessage(null), 3000)
    } catch (createError) {
      setError(getErrorMessage(createError))
    } finally {
      setSaving(false)
    }
  }

  const deletePost = async (postId: string) => {
    setError(null)
    try {
      await repository.deleteSocialPost(postId)
      setPosts((current) => current.filter((post) => post.id !== postId))
    } catch (deleteError) {
      setError(getErrorMessage(deleteError))
    }
  }

  // Text parser helper for rendering
  const parsePostText = (rawText: string, platform: string): string => {
    if (!rawText.startsWith('{')) {
      return rawText
    }
    try {
      const parsed = JSON.parse(rawText) as PlatformTexts
      return parsed[platform] || parsed.general
    } catch {
      return rawText
    }
  }

  const getPostPreviewText = (rawText: string): string => {
    if (!rawText.startsWith('{')) {
      return rawText
    }
    try {
      const parsed = JSON.parse(rawText) as PlatformTexts
      return parsed.general
    } catch {
      return rawText
    }
  }

  // Filters calculation
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchPlatform = filterPlatform === 'all' || post.platforms.includes(filterPlatform as SocialPlatform)
      const matchProject = filterProject === 'all' || post.project_id === filterProject
      return matchPlatform && matchProject
    })
  }, [posts, filterPlatform, filterProject])

  // Calendar View helper
  const calendarDays = useMemo(() => {
    const startOfWeek = new Date()
    const currentDay = startOfWeek.getDay() // 0 = Sun, 1 = Mon, etc
    const diffToMonday = startOfWeek.getDate() - currentDay + (currentDay === 0 ? -6 : 1) // Adjust for Mon start
    startOfWeek.setDate(diffToMonday)
    startOfWeek.setHours(0, 0, 0, 0)

    const days = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek)
      d.setDate(startOfWeek.getDate() + i)
      days.push(d)
    }
    return days
  }, [])

  const getPostsForDay = (day: Date) => {
    return filteredPosts.filter((post) => {
      const postDate = new Date(post.scheduled_at)
      return (
        postDate.getDate() === day.getDate() &&
        postDate.getMonth() === day.getMonth() &&
        postDate.getFullYear() === day.getFullYear()
      )
    })
  }

  // Preview elements calculation
  const previewText = parsePostText(
    texts.general.trim() || 'Scrivi qualcosa per vedere l\'anteprima in tempo reale...',
    previewPlatform
  )

  const activeConnectedAccount = connectedChannels.find((ch) => ch.platform === previewPlatform)
  const currentPreviewAvatar = activeConnectedAccount?.connected 
    ? activeConnectedAccount.avatarUrl 
    : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop'
  
  const currentPreviewName = activeConnectedAccount?.connected 
    ? activeConnectedAccount.name 
    : 'FlowDesk Workspace'
  
  const currentPreviewHandle = activeConnectedAccount?.connected 
    ? `@${activeConnectedAccount.handle}` 
    : '@flowdesk_app'

  return (
    <div className="page social-page">
      <div className="page-header dashboard-header">
        <div>
          <p className="eyebrow">Social Planner</p>
          <h1>Gestione & Programmazione Social</h1>
        </div>
        <div className="segmented">
          <button
            className={viewMode === 'list' ? 'active' : ''}
            type="button"
            onClick={() => setViewMode('list')}
          >
            <List size={15} /> Lista
          </button>
          <button
            className={viewMode === 'calendar' ? 'active' : ''}
            type="button"
            onClick={() => setViewMode('calendar')}
          >
            <CalendarDays size={15} /> Calendario
          </button>
        </div>
      </div>

      {error ? <div className="notice error">{error}</div> : null}
      {message ? <div className="notice">{message}</div> : null}

      <div className="social-planner-layout">
        
        {/* Left Column: Composer & accounts */}
        <div>
          {/* Connected accounts manager bar */}
          <div className="channels-bar-card">
            <div className="section-heading">
              <div>
                <Share2 size={16} />
                <h2>Canali Social Connessi</h2>
              </div>
              <span className="section-meta">Seleziona per pubblicare</span>
            </div>
            <p className="page-hint" style={{ marginTop: '-4px', marginBottom: '8px' }}>
              Clicca per attivare/selezionare. Clicca sui disattivati per simulare la connessione o usa Facebook Login per account reali.
            </p>
            <div className="channels-list-horizontal">
              {connectedChannels.map((account) => {
                const isSelected = selectedChannels.includes(account.id)
                const isConnected = account.connected
                const platformColor = getBrandColor(account.platform)

                return (
                  <div key={account.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <button
                      type="button"
                      className={`channel-avatar-wrapper ${isSelected ? 'active' : ''} ${isConnected ? '' : 'disconnected'}`}
                      onClick={() => toggleChannelSelection(account.id)}
                      title={`${account.name} (${account.platform})`}
                    >
                      <img src={account.avatarUrl} alt={account.name} />
                      
                      <span className="channel-platform-badge" style={{ backgroundColor: platformColor }}>
                        {account.platform.slice(0, 2).toUpperCase()}
                      </span>

                      {isSelected && isConnected ? (
                        <span className="channel-check-badge">
                          <Check size={8} strokeWidth={4} />
                        </span>
                      ) : null}
                    </button>
                    {isConnected ? (
                      <button 
                        type="button"
                        className="text-button" 
                        style={{ fontSize: '10px', padding: '0', minHeight: 'auto', border: 'none', color: 'var(--muted)' }}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDisconnectSimulated(account.id)
                        }}
                      >
                        Scollega
                      </button>
                    ) : (
                      <span style={{ fontSize: '10px', color: 'var(--faint)' }}>Off</span>
                    )}
                  </div>
                )
              })}

              {/* Real Supabase Meta OAuth button if status is disconnected */}
              {!metaStatus.connected && (
                <button
                  type="button"
                  className="auth-button"
                  style={{ minHeight: '52px', borderRadius: '26px', padding: '0 16px', fontSize: '12px' }}
                  disabled={connecting}
                  onClick={() => void connectMeta()}
                >
                  <Share2 size={14} /> {connecting ? 'Connessione...' : 'Accedi a Meta'}
                </button>
              )}
            </div>
          </div>

          {/* Post composer */}
          <div className="composer-card">
            <div className="section-heading">
              <div>
                <Plus size={16} />
                <h2>Componi il tuo Post</h2>
              </div>
              {selectedChannels.length > 0 ? (
                <span className="section-meta">Dettagli per {selectedChannels.length} canali</span>
              ) : (
                <span className="section-meta error" style={{ color: 'var(--danger)' }}>Nessun canale selezionato</span>
              )}
            </div>

            {/* Custom platform editor tabs */}
            <div className="editor-tabs-bar">
              <button
                className={`editor-tab-button ${activeTab === 'general' ? 'active' : ''}`}
                type="button"
                onClick={() => setActiveTab('general')}
              >
                🌍 Generale (Predefinito)
              </button>
              {selectedChannels.map((chId) => {
                const isOverridden = texts[chId] !== undefined && texts[chId]?.trim() !== ''
                return (
                  <button
                    key={chId}
                    className={`editor-tab-button ${activeTab === chId ? 'active' : ''} ${isOverridden ? 'override' : ''}`}
                    type="button"
                    onClick={() => setActiveTab(chId)}
                  >
                    {chId.toUpperCase()} {isOverridden ? '✏️' : ''}
                  </button>
                )
              })}
            </div>

            <form onSubmit={handlePublishPost} className="social-form">
              <div className="editor-input-wrapper">
                <textarea
                  className="editor-textarea"
                  value={getActiveText()}
                  placeholder={
                    activeTab === 'general'
                      ? "Scrivi il testo principale del tuo post... (Questo verrà usato per tutti i canali se non sovrascritto)"
                      : `Scrivi didascalia su misura per ${activeTab.toUpperCase()}...`
                  }
                  onChange={(e) => handleTextChange(e.target.value)}
                />

                <div className="composer-toolbar">
                  <span>
                    Limite caratteri {activeTab.toUpperCase()}: {getActiveText().length} / {getPlatformCharLimit(activeTab)}
                  </span>
                  
                  {/* AI assist triggers */}
                  <div className="ai-assist-dropdown-wrapper">
                    <button
                      type="button"
                      className="ai-assist-trigger-btn"
                      onClick={() => setAiDropdownOpen(!aiDropdownOpen)}
                    >
                      <Sparkles size={13} /> Assistente Scrittura AI
                    </button>

                    {aiDropdownOpen && (
                      <div className="ai-assist-dropdown-menu">
                        <button type="button" className="ai-assist-menu-item" onClick={() => runAiAssist('expand')}>
                          ✍️ Espandi la bozza
                        </button>
                        <button type="button" className="ai-assist-menu-item" onClick={() => runAiAssist('emojis')}>
                          ⚡ Aggiungi Emoji
                        </button>
                        <button type="button" className="ai-assist-menu-item" onClick={() => runAiAssist('hashtags')}>
                          🏷️ Genera Hashtag
                        </button>
                        <button type="button" className="ai-assist-menu-item" onClick={() => runAiAssist('professional')}>
                          💼 Rendi Professionale
                        </button>
                        <button type="button" className="ai-assist-menu-item" onClick={() => runAiAssist('friendly')}>
                          🤝 Rendi Amichevole
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {aiLoading && (
                  <div className="ai-loader-overlay">
                    <Bot size={16} className="animate-spin" />
                    <span>{aiStatusMessage}</span>
                  </div>
                )}
              </div>

              <div className="form-row two">
                <label>
                  <FolderKanban size={14} style={{ left: '10px', position: 'absolute' }} />
                  <select
                    style={{ paddingLeft: '32px' }}
                    value={projectId}
                    disabled={projects.length === 0}
                    onChange={(event) => setProjectId(event.target.value)}
                  >
                    {projects.map((project) => (
                      <option value={project.id} key={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <Clock size={14} style={{ left: '10px', position: 'absolute' }} />
                  <input
                    style={{ paddingLeft: '32px' }}
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(event) => setScheduledAt(event.target.value)}
                  />
                </label>
              </div>

              <label>
                <input
                  value={mediaUrl}
                  placeholder="URL immagine o video (es. https://example.com/photo.jpg)"
                  onChange={(event) => setMediaUrl(event.target.value)}
                />
              </label>

              <button
                type="submit"
                disabled={
                  saving ||
                  !projectId ||
                  !texts.general.trim() ||
                  selectedChannels.length === 0 ||
                  !scheduledAt
                }
              >
                <Plus size={17} /> Programma Post su {selectedChannels.length} canali
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Sticky live preview feed */}
        <div className="preview-sticky-container">
          <div className="preview-simulator-card">
            <div className="section-heading" style={{ padding: '12px 16px 0 16px', marginBottom: '8px' }}>
              <div>
                <Compass size={16} />
                <h2>Anteprima in Tempo Reale</h2>
              </div>
            </div>
            
            {/* Toggle Preview Platform */}
            <div className="preview-header-tabs">
              {selectedChannels.map((ch) => (
                <button
                  key={ch}
                  type="button"
                  className={`preview-platform-tab ${previewPlatform === ch ? 'active' : ''}`}
                  onClick={() => setPreviewPlatform(ch)}
                >
                  {ch.toUpperCase()}
                </button>
              ))}
              {selectedChannels.length === 0 && (
                <span style={{ fontSize: '11px', color: 'var(--muted)', padding: '6px' }}>Seleziona canali per l'anteprima</span>
              )}
            </div>

            {/* Post feed preview container */}
            <div className="preview-scroll-area">
              {/* FACEBOOK POST PREVIEW */}
              {previewPlatform === 'facebook' && (
                <article className="mock-post-card">
                  <div className="mock-post-header">
                    <img className="mock-post-avatar" src={currentPreviewAvatar} alt="" />
                    <div className="mock-post-author-info">
                      <span className="mock-post-author-name">{currentPreviewName}</span>
                      <span className="mock-post-meta">Adesso · 🌍</span>
                    </div>
                  </div>
                  <div className="mock-post-body">{previewText}</div>
                  
                  {mediaUrl.trim() ? (
                    <div className="mock-post-media-container">
                      <img src={mediaUrl.trim()} alt="Post Media" onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }} />
                    </div>
                  ) : (
                    <div className="mock-post-media-placeholder">
                      <FileText size={24} /> Nessuna immagine caricata
                    </div>
                  )}

                  <div className="mock-li-actions">
                    <button type="button" className="mock-li-action-btn">👍 Mi piace</button>
                    <button type="button" className="mock-li-action-btn">💬 Commenta</button>
                    <button type="button" className="mock-li-action-btn">↪️ Condividi</button>
                  </div>
                </article>
              )}

              {/* INSTAGRAM PREVIEW */}
              {previewPlatform === 'instagram' && (
                <article className="mock-post-card instagram-style">
                  <div className="mock-post-header" style={{ padding: '8px 12px' }}>
                    <img className="mock-post-avatar" style={{ width: '30px', height: '30px' }} src={currentPreviewAvatar} alt="" />
                    <div className="mock-post-author-info">
                      <span className="mock-post-author-name" style={{ fontSize: '12.5px' }}>{currentPreviewHandle.replace('@', '')}</span>
                      <span className="mock-post-meta" style={{ fontSize: '10px' }}>Milano, Italia</span>
                    </div>
                  </div>
                  
                  {mediaUrl.trim() ? (
                    <div className="mock-post-media-container" style={{ maxHeight: '300px' }}>
                      <img src={mediaUrl.trim()} alt="Insta Post" />
                    </div>
                  ) : (
                    <div className="mock-post-media-container" style={{ height: '300px' }}>
                      <div className="mock-post-media-placeholder">
                        <FileText size={24} /> Nessuna immagine
                      </div>
                    </div>
                  )}

                  <div className="mock-ig-actions">
                    <span>❤️</span> <span>💬</span> <span>✈️</span>
                  </div>
                  <div className="mock-ig-likes">Piace a 1 persona</div>
                  <div className="mock-ig-caption">
                    <strong>{currentPreviewHandle.replace('@', '')} </strong>{previewText}
                  </div>
                </article>
              )}

              {/* LINKEDIN PREVIEW */}
              {previewPlatform === 'linkedin' && (
                <article className="mock-post-card linkedin-style">
                  <div className="mock-post-header">
                    <img className="mock-post-avatar" src={currentPreviewAvatar} alt="" />
                    <div className="mock-post-author-info">
                      <span className="mock-post-author-name">{currentPreviewName}</span>
                      <span className="mock-li-headline">Founder & CEO di FlowDesk</span>
                      <span className="mock-post-meta">Adesso · 🌐</span>
                    </div>
                  </div>
                  <div className="mock-post-body">{previewText}</div>
                  
                  {mediaUrl.trim() ? (
                    <div className="mock-post-media-container">
                      <img src={mediaUrl.trim()} alt="LinkedIn post" />
                    </div>
                  ) : null}

                  <div className="mock-li-actions">
                    <button type="button" className="mock-li-action-btn">👍 Consiglia</button>
                    <button type="button" className="mock-li-action-btn">💬 Commenta</button>
                    <button type="button" className="mock-li-action-btn">🔁 Diffondi</button>
                    <button type="button" className="mock-li-action-btn">✉️ Invia</button>
                  </div>
                </article>
              )}

              {/* TWITTER PREVIEW */}
              {previewPlatform === 'twitter' && (
                <article className="mock-post-card twitter-style">
                  <div className="mock-post-header" style={{ padding: '0 0 10px 0' }}>
                    <img className="mock-post-avatar" src={currentPreviewAvatar} alt="" />
                    <div className="mock-post-author-info">
                      <span className="mock-post-author-name">{currentPreviewName}</span>
                      <span className="mock-tw-handle">{currentPreviewHandle}</span>
                    </div>
                  </div>
                  <div className="mock-post-body" style={{ padding: 0 }}>{previewText}</div>
                  
                  {mediaUrl.trim() ? (
                    <div className="mock-post-media-container" style={{ borderRadius: '12px', marginTop: '10px' }}>
                      <img src={mediaUrl.trim()} alt="Tweet media" />
                    </div>
                  ) : null}

                  <div className="mock-tw-actions">
                    <span>💬 0</span> <span>🔁 0</span> <span>❤️ 1</span> <span>📊 1</span>
                  </div>
                </article>
              )}

              {/* TIKTOK PREVIEW */}
              {previewPlatform === 'tiktok' && (
                <article className="mock-post-card tiktok-style">
                  <div className="mock-tt-video-area">
                    {mediaUrl.trim() ? (
                      <img src={mediaUrl.trim()} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} alt="TikTok Video" />
                    ) : (
                      <div style={{ color: '#aaa', fontSize: '11px', textAlign: 'center', padding: '20px' }}>
                        Inserisci un URL media per simulare il video TikTok
                      </div>
                    )}
                  </div>
                  
                  <div className="mock-tt-right-actions">
                    <div className="mock-tt-action-icon">
                      <img src={currentPreviewAvatar} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid white' }} alt="" />
                      <span style={{ background: '#ff0050', borderRadius: '50%', width: '12px', height: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '-8px', fontSize: '8px' }}>+</span>
                    </div>
                    <div className="mock-tt-action-icon"><span>❤️</span><strong>10</strong></div>
                    <div className="mock-tt-action-icon"><span>💬</span><strong>2</strong></div>
                    <div className="mock-tt-action-icon"><span>⭐</span><strong>0</strong></div>
                    <div className="mock-tt-action-icon"><span>↪️</span><strong>1</strong></div>
                  </div>

                  <div className="mock-tt-info-area">
                    <div className="mock-tt-username">{currentPreviewHandle}</div>
                    <div className="mock-tt-desc">{previewText}</div>
                    <div style={{ marginTop: '8px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span>🎵</span> Suono originale - FlowDesk Studio
                    </div>
                  </div>
                </article>
              )}

              {/* PINTEREST PREVIEW */}
              {previewPlatform === 'pinterest' && (
                <article className="mock-post-card" style={{ borderRadius: '16px', maxWidth: '280px' }}>
                  {mediaUrl.trim() ? (
                    <div className="mock-post-media-container" style={{ maxHeight: '380px', border: 'none' }}>
                      <img src={mediaUrl.trim()} alt="Pin" />
                    </div>
                  ) : (
                    <div className="mock-post-media-container" style={{ height: '220px', border: 'none' }}>
                      <div className="mock-post-media-placeholder">Nessun file immagine</div>
                    </div>
                  )}
                  <div style={{ padding: '12px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 6px 0' }}>Post di FlowDesk</h3>
                    <p style={{ fontSize: '12.5px', color: '#555', margin: 0 }}>{previewText}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                      <img src={currentPreviewAvatar} style={{ width: '24px', height: '24px', borderRadius: '50%' }} alt="" />
                      <span style={{ fontSize: '12px', fontWeight: '600' }}>{currentPreviewName}</span>
                    </div>
                  </div>
                </article>
              )}

              {/* YOUTUBE PREVIEW */}
              {previewPlatform === 'youtube' && (
                <article className="mock-post-card" style={{ maxWidth: '340px' }}>
                  {mediaUrl.trim() ? (
                    <div className="mock-post-media-container" style={{ height: '190px' }}>
                      <img src={mediaUrl.trim()} alt="YouTube video" />
                      <span style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'black', color: 'white', padding: '2px 4px', borderRadius: '4px', fontSize: '10px' }}>3:45</span>
                    </div>
                  ) : (
                    <div className="mock-post-media-container" style={{ height: '190px' }}>
                      <div className="mock-post-media-placeholder">Inserisci URL miniatura video</div>
                    </div>
                  )}
                  <div style={{ padding: '12px', display: 'flex', gap: '10px' }}>
                    <img src={currentPreviewAvatar} style={{ width: '32px', height: '32px', borderRadius: '50%' }} alt="" />
                    <div style={{ display: 'grid', gap: '4px' }}>
                      <strong style={{ fontSize: '13px', lineHeight: '1.2' }}>FlowDesk Tutorial - Come organizzare la scrivania social</strong>
                      <span style={{ fontSize: '11px', color: '#606060' }}>{currentPreviewName} · 1 visualizzazione · Adesso</span>
                    </div>
                  </div>
                  <div style={{ padding: '0 12px 12px 42px', fontSize: '12px', color: '#606060' }}>
                    {previewText}
                  </div>
                </article>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Posts schedule render Section */}
      <div style={{ marginTop: '24px' }}>
        <div className="post-filter-toolbar">
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--muted)' }}>
            Canale:
            <select value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value)}>
              <option value="all">Tutti i canali</option>
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
              <option value="linkedin">LinkedIn</option>
              <option value="twitter">Twitter / X</option>
              <option value="tiktok">TikTok</option>
              <option value="pinterest">Pinterest</option>
              <option value="youtube">YouTube</option>
            </select>
          </label>

          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--muted)' }}>
            Progetto:
            <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
              <option value="all">Tutti i progetti</option>
              {projects.map((p) => (
                <option value={p.id} key={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
        </div>

        {/* LIST VIEW */}
        {viewMode === 'list' && (
          loading ? (
            <div className="notice">Caricamento post in corso...</div>
          ) : filteredPosts.length === 0 ? (
            <div className="empty-state">
              <Share2 size={28} />
              <p>Nessun post programmato con i filtri attivi</p>
            </div>
          ) : (
            <section className="dashboard-section">
              <div className="section-heading">
                <div>
                  <Clock size={16} />
                  <h2>Post in Calendario ({filteredPosts.length})</h2>
                </div>
              </div>

              <div className="post-card-container">
                {filteredPosts.map((post) => (
                  <article className="scheduled-post-item-card" key={post.id}>
                    <div>
                      <div className="card-top">
                        <span className="mode-pill" style={{ background: post.project_color + '22', color: post.project_color, border: `1px solid ${post.project_color}33`, display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: post.project_color, display: 'inline-block' }} />
                          {post.project_name}
                        </span>
                        
                        <button
                          className="icon-button ghost"
                          type="button"
                          title="Elimina post"
                          style={{ padding: '4px', minHeight: 'auto', border: 'none' }}
                          onClick={() => void deletePost(post.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <p className="card-body-text">{getPostPreviewText(post.text)}</p>
                      
                      {post.media_url && (
                        <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>🖼️</span> <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '200px' }}>{post.media_url}</span>
                        </div>
                      )}
                    </div>

                    <div className="card-footer">
                      <time>{formatDateTime(post.scheduled_at)}</time>
                      <div className="platform-badge-list">
                        {post.platforms.map((platform) => (
                          <span
                            className="mini-platform-badge"
                            key={platform}
                            style={{ backgroundColor: getBrandColor(platform) }}
                          >
                            {platform.slice(0, 2)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )
        )}

        {/* CALENDAR VIEW */}
        {viewMode === 'calendar' && (
          <div className="weekly-calendar-board">
            <div className="calendar-header-row">
              {calendarDays.map((day, idx) => {
                const isToday = new Date().toDateString() === day.toDateString()
                return (
                  <div key={idx} className={`calendar-day-header ${isToday ? 'today' : ''}`}>
                    {day.toLocaleDateString('it-IT', { weekday: 'short' })} {day.getDate()}
                  </div>
                )
              })}
            </div>
            
            <div className="calendar-body-row">
              {calendarDays.map((day, dayIdx) => {
                const dayPosts = getPostsForDay(day)
                return (
                  <div key={dayIdx} className="calendar-day-cell">
                    {dayPosts.map((post) => {
                      const postTime = new Date(post.scheduled_at).toLocaleTimeString('it-IT', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })

                      return (
                        <div
                          key={post.id}
                          className="calendar-post-block"
                          style={{ borderLeftColor: post.project_color }}
                          title={`${post.project_name} - ${post.text}`}
                        >
                          <span className="time-badge">{postTime}</span>
                          <div style={{ fontWeight: 'bold', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {getPostPreviewText(post.text)}
                          </div>
                          <div style={{ display: 'flex', gap: '2px', marginTop: '4px' }}>
                            {post.platforms.map((p) => (
                              <span key={p} style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: getBrandColor(p) }} />
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Connect Mock Channel Modal */}
      {connectModalPlatform && (
        <div className="connector-modal-overlay">
          <div className="connector-modal-card">
            <div className="connector-modal-header">
              <h3>Collega Canale {connectModalPlatform.platform.toUpperCase()}</h3>
              <button
                type="button"
                className="icon-button ghost"
                style={{ padding: '4px', minHeight: 'auto', border: 'none' }}
                onClick={() => setConnectModalPlatform(null)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="connector-modal-body">
              <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>
                Inserisci i dati fittizi del profilo per completare la simulazione del collegamento.
              </p>
              
              <label style={{ display: 'grid', gap: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                Nome visualizzato:
                <input
                  value={connectProfileName}
                  placeholder="es. Christian Valese"
                  onChange={(e) => setConnectProfileName(e.target.value)}
                />
              </label>

              <label style={{ display: 'grid', gap: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                Handle / Username:
                <input
                  value={connectProfileHandle}
                  placeholder="es. christian-valese"
                  onChange={(e) => setConnectProfileHandle(e.target.value)}
                />
              </label>
            </div>
            <div className="connector-modal-footer">
              <button
                type="button"
                className="secondary"
                onClick={() => setConnectModalPlatform(null)}
              >
                Annulla
              </button>
              <button
                type="button"
                className="primary"
                disabled={connecting}
                onClick={handleConnectSimulated}
              >
                {connecting ? 'Collegamento...' : 'Connetti'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
