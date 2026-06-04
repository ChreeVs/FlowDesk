import {
  CalendarClock,
  FolderKanban,
  Plus,
  RefreshCw,
  Share2,
  Trash2,
  Unlink,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { metaApi } from '../lib/meta'
import type { MetaSocialStatus } from '../lib/meta'
import { repository } from '../lib/repository'
import type {
  ProjectSummary,
  SocialPlatform,
  SocialPostStatus,
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

const statusLabels: Record<SocialPostStatus, string> = {
  draft: 'Bozza',
  scheduled: 'Programmato',
  published: 'Pubblicato',
  failed: 'Errore',
}

const togglePlatform = (
  platforms: SocialPlatform[],
  platform: SocialPlatform,
) =>
  platforms.includes(platform)
    ? platforms.filter((item) => item !== platform)
    : [...platforms, platform]

export function SocialPlannerPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [posts, setPosts] = useState<SocialPostSummary[]>([])
  const [projectId, setProjectId] = useState('')
  const [text, setText] = useState('')
  const [mediaUrl, setMediaUrl] = useState('')
  const [platforms, setPlatforms] = useState<SocialPlatform[]>([
    'facebook',
    'instagram',
  ])
  const [metaStatus, setMetaStatus] = useState<MetaSocialStatus>({
    connected: false,
    pages: [],
    instagram_accounts: [],
  })
  const [scheduledAt, setScheduledAt] = useState(defaultScheduleInput)
  const [loading, setLoading] = useState(true)
  const [metaLoading, setMetaLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const connectedPlatforms = useMemo<SocialPlatform[]>(() => {
    const next: SocialPlatform[] = []

    if (metaStatus.connected && metaStatus.pages.length > 0) {
      next.push('facebook')
    }

    if (metaStatus.connected && metaStatus.instagram_accounts.length > 0) {
      next.push('instagram')
    }

    return next
  }, [metaStatus])
  const selectedConnectedPlatforms = platforms.filter((platform) =>
    connectedPlatforms.includes(platform),
  )

  const loadMetaStatus = useCallback(async () => {
    setMetaLoading(true)

    try {
      setMetaStatus(await metaApi.getSocialStatus())
    } catch (statusError) {
      setError(getErrorMessage(statusError))
      setMetaStatus({
        connected: false,
        pages: [],
        instagram_accounts: [],
      })
    } finally {
      setMetaLoading(false)
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
  }, [loadPosts])

  useEffect(() => {
    void loadMetaStatus()
  }, [loadMetaStatus])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const meta = params.get('meta')
    const metaMessage = params.get('message')

    if (meta === 'connected') {
      setMessage('Meta Social collegato.')
      void loadMetaStatus()
    }

    if (meta === 'error') {
      setError(metaMessage || 'Connessione Meta non riuscita.')
    }
  }, [loadMetaStatus])

  const createPost = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (
      connectedPlatforms.length === 0 ||
      !projectId ||
      !text.trim() ||
      selectedConnectedPlatforms.length === 0 ||
      !scheduledAt
    ) {
      return
    }

    setSaving(true)
    setError(null)

    try {
      const created = await repository.createSocialPost({
        project_id: projectId,
        text: text.trim(),
        media_url: mediaUrl.trim() ? normalizeUrl(mediaUrl) : '',
        platforms: selectedConnectedPlatforms,
        status: 'scheduled',
        scheduled_at: fromDatetimeLocalValue(scheduledAt),
      })
      setText('')
      setMediaUrl('')
      setScheduledAt(defaultScheduleInput())
      setPosts((current) =>
        [...current, created].sort(
          (a, b) =>
            new Date(a.scheduled_at).getTime() -
            new Date(b.scheduled_at).getTime(),
        ),
      )
    } catch (createError) {
      setError(getErrorMessage(createError))
    } finally {
      setSaving(false)
    }
  }

  const connectMeta = async () => {
    setConnecting(true)
    setError(null)
    setMessage(null)

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
    setMessage(null)

    try {
      await metaApi.disconnectSocial()
      setMetaStatus({
        connected: false,
        pages: [],
        instagram_accounts: [],
      })
      setMessage('Connessione Meta rimossa.')
    } catch (disconnectError) {
      setError(getErrorMessage(disconnectError))
    } finally {
      setConnecting(false)
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

  return (
    <div className="page social-page">
      <div className="page-header dashboard-header">
        <div>
          <p className="eyebrow">Canali social</p>
          <h1>Programmazione post</h1>
        </div>
      </div>

      {error ? <div className="notice error">{error}</div> : null}
      {message ? <div className="notice">{message}</div> : null}

      <section className="dashboard-section social-panel">
        {metaLoading ? (
          <div className="notice">Controllo connessione Meta...</div>
        ) : !metaStatus.connected ? (
          <div className="social-connect">
            <span>
              <Share2 size={20} />
            </span>
            <div>
              <h2>Collega Meta Social per iniziare</h2>
              <p>
                FlowDesk usera Facebook Login per leggere le pagine collegate e
                gli account Instagram professionali disponibili sul tuo account.
                Il token resta nel backend Supabase, non nel browser.
              </p>
              <div>
                <button
                  type="button"
                  disabled={connecting}
                  onClick={() => void connectMeta()}
                >
                  <Share2 size={16} />
                  {connecting ? 'Collegamento...' : 'Collega Facebook / Instagram'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="section-heading">
              <div>
                <Share2 size={18} />
                <h2>Meta Social collegato</h2>
              </div>
              <span className="section-meta">
                {metaStatus.meta_user_name || 'Account Meta'}
              </span>
            </div>

            <div className="meta-source-grid">
              <div>
                <strong>Pagine Facebook</strong>
                {metaStatus.pages.length === 0 ? (
                  <p>Nessuna pagina leggibile con questi permessi.</p>
                ) : (
                  <ul>
                    {metaStatus.pages.map((page) => (
                      <li key={page.page_id}>
                        <span>{page.page_name || page.page_id}</span>
                        {page.instagram_username ? (
                          <small>IG collegato: @{page.instagram_username}</small>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <strong>Account Instagram</strong>
                {metaStatus.instagram_accounts.length === 0 ? (
                  <p>Nessun account Instagram professionale collegato.</p>
                ) : (
                  <ul>
                    {metaStatus.instagram_accounts.map((account) => (
                      <li key={account.instagram_user_id}>
                        <span>
                          @{account.username || account.instagram_user_id}
                        </span>
                        <small>{account.page_name || 'Pagina collegata'}</small>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="social-connection-actions">
              <button
                type="button"
                disabled={connecting}
                onClick={() => void loadMetaStatus()}
              >
                <RefreshCw size={15} />
                Aggiorna
              </button>
              <button
                type="button"
                disabled={connecting}
                onClick={() => void disconnectMeta()}
              >
                <Unlink size={15} />
                Disconnetti
              </button>
            </div>

            {connectedPlatforms.length === 0 ? (
              <div className="notice">
                Meta risulta collegato, ma non sono state trovate pagine
                Facebook o account Instagram pubblicabili. Controlla permessi,
                ruolo sulla pagina e collegamento Instagram professionale.
              </div>
            ) : (
              <>
                <div className="section-heading social-compose-heading">
                  <div>
                    <Plus size={18} />
                    <h2>Nuovo contenuto</h2>
                  </div>
                  <span className="section-meta">
                    {connectedPlatforms.join(' + ')}
                  </span>
                </div>

                <form className="social-form" onSubmit={createPost}>
          <div className="form-row two">
            <select
              value={projectId}
              disabled={projects.length === 0}
              onChange={(event) => setProjectId(event.target.value)}
            >
              {projects.length === 0 ? (
                <option value="">Nessun progetto</option>
              ) : (
                projects.map((project) => (
                  <option value={project.id} key={project.id}>
                    {project.name}
                  </option>
                ))
              )}
            </select>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(event) => setScheduledAt(event.target.value)}
            />
          </div>

          <textarea
            value={text}
            placeholder="Testo del post"
            onChange={(event) => setText(event.target.value)}
          />

          <input
            value={mediaUrl}
            placeholder="URL immagine o video"
            onChange={(event) => setMediaUrl(event.target.value)}
          />

          <div className="segmented social-platforms">
            {(['facebook', 'instagram'] as SocialPlatform[]).map((platform) => (
              <button
                className={platforms.includes(platform) ? 'active' : ''}
                type="button"
                key={platform}
                disabled={!connectedPlatforms.includes(platform)}
                onClick={() => setPlatforms((current) => togglePlatform(current, platform))}
              >
                {platform === 'facebook' ? 'Facebook' : 'Instagram'}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={
              saving ||
              !projectId ||
              !text.trim() ||
              selectedConnectedPlatforms.length === 0 ||
              connectedPlatforms.length === 0 ||
              !scheduledAt
            }
          >
            <Plus size={17} />
            Programma
          </button>
                </form>
              </>
            )}
          </>
        )}
      </section>

      {loading ? (
        <div className="notice">Caricamento post...</div>
      ) : posts.length === 0 ? (
        <div className="empty-state">
          <Share2 size={28} />
          <p>Nessun post programmato</p>
        </div>
      ) : (
        <section className="dashboard-section">
          <div className="section-heading">
            <div>
              <CalendarClock size={18} />
              <h2>Post in calendario</h2>
            </div>
            <span className="section-meta">{posts.length}</span>
          </div>

          <div className="social-list">
            {posts.map((post) => (
              <article className="social-item" key={post.id}>
                <span
                  className="project-color-dot"
                  style={{ backgroundColor: post.project_color }}
                />
                <div>
                  <strong>{post.text}</strong>
                  <small>
                    <FolderKanban size={13} />
                    {post.project_name}
                  </small>
                  <div className="social-tags">
                    {post.platforms.map((platform) => (
                      <span key={platform}>{platform}</span>
                    ))}
                    <span>{statusLabels[post.status]}</span>
                  </div>
                </div>
                <time>{formatDateTime(post.scheduled_at)}</time>
                <button
                  className="icon-button ghost"
                  type="button"
                  title="Elimina post"
                  onClick={() => void deletePost(post.id)}
                >
                  <Trash2 size={16} />
                </button>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
