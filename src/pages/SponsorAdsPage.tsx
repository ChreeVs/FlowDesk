import {
  CheckCircle2,
  Copy,
  Download,
  FolderKanban,
  Link,
  Megaphone,
  Plus,
  Trash2,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { repository } from '../lib/repository'
import type {
  AdsPlatform,
  ProjectSummary,
  SponsorAdBatchStatus,
  SponsorAdBatchSummary,
  SponsorAdPost,
} from '../types'
import { formatDateTime } from '../utils/date'
import { getErrorMessage } from '../utils/error'

type QueuePost = Pick<
  SponsorAdPost,
  | 'platform'
  | 'source_post_id'
  | 'source_label'
  | 'source_account_id'
  | 'source_page_id'
  | 'instagram_account_id'
  | 'post_text'
  | 'permalink_url'
  | 'thumbnail_url'
  | 'published_at'
  | 'ad_name'
>

const defaultPattern = 'ADV - {platform} - {post}'

const statusLabels: Record<SponsorAdBatchStatus, string> = {
  draft: 'Bozza',
  ready: 'Pronto',
  exported: 'Esportato',
  launched: 'Lanciato',
}

const platformLabels: Record<AdsPlatform, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
}

const trimAdName = (value: string) =>
  value
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180)

const buildAdName = (
  pattern: string,
  platform: AdsPlatform,
  postText: string,
  sourceLabel: string,
) =>
  trimAdName(
    (pattern || defaultPattern)
      .replaceAll('{platform}', platformLabels[platform])
      .replaceAll('{post}', postText || 'Post')
      .replaceAll('{source}', sourceLabel || 'Fonte'),
  )

const toPublishedIso = (value: string) =>
  value ? new Date(`${value}T12:00:00`).toISOString() : null

const exportPayload = (batch: SponsorAdBatchSummary) => ({
  batch_name: batch.name,
  project_name: batch.project_name,
  source: 'meta_published_posts',
  create_active: batch.create_active,
  ad_account_name: batch.ad_account_name || null,
  ad_account_id: batch.ad_account_id || null,
  source_name: batch.source_name || null,
  source_id: batch.source_id || null,
  campaign_name: batch.campaign_name || null,
  campaign_id: batch.campaign_id || null,
  adset_name: batch.adset_name || null,
  adset_id: batch.adset_id || null,
  rule_name: batch.rule_name || null,
  rule_id: batch.rule_id || null,
  ad_name_pattern: batch.ad_name_pattern,
  ads_to_create: batch.posts.map((post) => ({
    platform: post.platform,
    ad_name: post.ad_name,
    source_post_id: post.source_post_id,
    object_story_id:
      post.platform === 'facebook' ? post.source_post_id : null,
    page_id:
      post.platform === 'facebook'
        ? post.source_account_id || batch.source_id || null
        : post.source_page_id || null,
    instagram_media_id:
      post.platform === 'instagram' ? post.source_post_id : null,
    instagram_account_id:
      post.platform === 'instagram'
        ? post.instagram_account_id || post.source_account_id || batch.source_id || null
        : null,
    source_label: post.source_label || null,
    permalink_url: post.permalink_url || null,
    post_text: post.post_text,
  })),
})

export function SponsorAdsPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [batches, setBatches] = useState<SponsorAdBatchSummary[]>([])
  const [projectId, setProjectId] = useState('')
  const [batchName, setBatchName] = useState('')
  const [adAccountName, setAdAccountName] = useState('')
  const [adAccountId, setAdAccountId] = useState('')
  const [sourceName, setSourceName] = useState('')
  const [sourceId, setSourceId] = useState('')
  const [sourcePageId, setSourcePageId] = useState('')
  const [campaignName, setCampaignName] = useState('')
  const [campaignId, setCampaignId] = useState('')
  const [adsetName, setAdsetName] = useState('')
  const [adsetId, setAdsetId] = useState('')
  const [ruleName, setRuleName] = useState('')
  const [ruleId, setRuleId] = useState('')
  const [adNamePattern, setAdNamePattern] = useState(defaultPattern)
  const [createActive, setCreateActive] = useState(false)
  const [postPlatform, setPostPlatform] = useState<AdsPlatform>('facebook')
  const [postId, setPostId] = useState('')
  const [postText, setPostText] = useState('')
  const [postUrl, setPostUrl] = useState('')
  const [postThumb, setPostThumb] = useState('')
  const [postPublishedAt, setPostPublishedAt] = useState('')
  const [queue, setQueue] = useState<QueuePost[]>([])
  const [exportText, setExportText] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === projectId),
    [projects, projectId],
  )

  const loadAds = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [loadedProjects, loadedBatches] = await Promise.all([
        repository.listProjects(),
        repository.listSponsorAdBatches(),
      ])
      setProjects(loadedProjects)
      setBatches(loadedBatches)
      setProjectId((current) => current || loadedProjects[0]?.id || '')
    } catch (loadError) {
      setError(getErrorMessage(loadError))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadAds()
  }, [loadAds])

  useEffect(() => {
    if (!batchName && selectedProject) {
      setBatchName(`Sponsor ${selectedProject.name}`)
    }
  }, [batchName, selectedProject])

  const addPost = () => {
    const cleanedPostId = postId.trim()
    const cleanedSourceId = sourceId.trim()
    const cleanedPageId = sourcePageId.trim()

    if (!cleanedPostId) {
      setError("Inserisci l'ID del post pubblicato su Meta.")
      return
    }

    if (postPlatform === 'instagram' && (!cleanedSourceId || !cleanedPageId)) {
      setError(
        'Per Instagram servono ID account Instagram e ID pagina Facebook collegata.',
      )
      return
    }

    const sourceLabel = sourceName.trim() || selectedProject?.name || ''
    const text = postText.trim() || cleanedPostId
    setError(null)
    setQueue((current) => [
      ...current,
      {
        platform: postPlatform,
        source_post_id: cleanedPostId,
        source_label: sourceLabel,
        source_account_id: cleanedSourceId,
        source_page_id: postPlatform === 'instagram' ? cleanedPageId : '',
        instagram_account_id: postPlatform === 'instagram' ? cleanedSourceId : '',
        post_text: text,
        permalink_url: postUrl.trim(),
        thumbnail_url: postThumb.trim(),
        published_at: toPublishedIso(postPublishedAt),
        ad_name: buildAdName(adNamePattern, postPlatform, text, sourceLabel),
      },
    ])
    setPostId('')
    setPostText('')
    setPostUrl('')
    setPostThumb('')
    setPostPublishedAt('')
  }

  const updateQueueName = (index: number, adName: string) => {
    setQueue((current) =>
      current.map((post, itemIndex) =>
        itemIndex === index ? { ...post, ad_name: trimAdName(adName) } : post,
      ),
    )
  }

  const removeQueuedPost = (index: number) => {
    setQueue((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  const refreshQueueNames = () => {
    setQueue((current) =>
      current.map((post) => ({
        ...post,
        ad_name: buildAdName(
          adNamePattern,
          post.platform,
          post.post_text,
          post.source_label,
        ),
      })),
    )
  }

  const createBatch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!projectId || queue.length === 0) {
      return
    }

    setSaving(true)
    setError(null)
    setMessage(null)

    try {
      const created = await repository.createSponsorAdBatch(
        {
          project_id: projectId,
          name: batchName.trim(),
          ad_account_id: adAccountId.trim(),
          ad_account_name: adAccountName.trim(),
          source_id: sourceId.trim(),
          source_name: sourceName.trim(),
          campaign_id: campaignId.trim(),
          campaign_name: campaignName.trim(),
          adset_id: adsetId.trim(),
          adset_name: adsetName.trim(),
          rule_id: ruleId.trim(),
          rule_name: ruleName.trim(),
          ad_name_pattern: adNamePattern.trim() || defaultPattern,
          create_active: createActive,
        },
        queue,
      )
      setBatches((current) => [created, ...current])
      setQueue([])
      setMessage('Batch Ads salvato.')
    } catch (createError) {
      setError(getErrorMessage(createError))
    } finally {
      setSaving(false)
    }
  }

  const copyExport = async (batch: SponsorAdBatchSummary) => {
    const payload = JSON.stringify(exportPayload(batch), null, 2)
    setExportText(payload)
    setError(null)
    setMessage(null)

    try {
      await navigator.clipboard.writeText(payload)
      const updated = await repository.updateSponsorAdBatchStatus(
        batch.id,
        'exported',
      )
      setBatches((current) =>
        current.map((item) =>
          item.id === batch.id ? { ...item, status: updated.status } : item,
        ),
      )
      setMessage('Export copiato negli appunti.')
    } catch (copyError) {
      setError(getErrorMessage(copyError))
    }
  }

  const downloadExport = (batch: SponsorAdBatchSummary) => {
    const payload = JSON.stringify(exportPayload(batch), null, 2)
    const blob = new Blob([payload], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${batch.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-ads.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const deleteBatch = async (batchId: string) => {
    setError(null)

    try {
      await repository.deleteSponsorAdBatch(batchId)
      setBatches((current) => current.filter((batch) => batch.id !== batchId))
    } catch (deleteError) {
      setError(getErrorMessage(deleteError))
    }
  }

  return (
    <div className="page sponsor-page">
      <div className="page-header dashboard-header">
        <div>
          <p className="eyebrow">Meta ads workflow</p>
          <h1>SponsorAds</h1>
          <p>
            Inserisci post gia pubblicati dalle pagine Facebook e Instagram
            collegate al tuo account Meta dentro campagne e gruppi inserzioni.
          </p>
        </div>
      </div>

      <section className="dashboard-section sponsor-meta-panel">
        <span>
          <Megaphone size={20} />
        </span>
        <div>
          <h2>Connessione Meta</h2>
          <p>
            SponsorAds non usa i post creati in FlowDesk. Il flusso corretto
            legge post esistenti da pagine Facebook e account Instagram
            collegati, poi crea inserzioni nella campagna scelta. In questa
            versione FlowDesk salva il batch e l'export; l'import automatico e
            la pubblicazione reale passano da Edge Function Supabase e Meta API.
          </p>
        </div>
      </section>

      {error ? <div className="notice error">{error}</div> : null}
      {message ? <div className="notice">{message}</div> : null}

      <form className="sponsor-workflow" onSubmit={createBatch}>
        <section className="dashboard-section sponsor-card">
          <div className="section-heading">
            <div>
              <FolderKanban size={18} />
              <h2>1. Setup batch</h2>
            </div>
          </div>

          <div className="form-row two">
            <label>
              Progetto
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
            </label>
            <label>
              Nome batch
              <input
                value={batchName}
                placeholder="Es. Promo giugno"
                onChange={(event) => setBatchName(event.target.value)}
              />
            </label>
          </div>

          <div className="form-row two">
            <label>
              Account pubblicitario
              <input
                value={adAccountName}
                placeholder="Nome account"
                onChange={(event) => setAdAccountName(event.target.value)}
              />
            </label>
            <label>
              ID account
              <input
                value={adAccountId}
                placeholder="act_..."
                onChange={(event) => setAdAccountId(event.target.value)}
              />
            </label>
          </div>

          <div className="form-row two">
            <label>
              Fonte Meta collegata
              <input
                value={sourceName}
                placeholder="Pagina Facebook o account Instagram"
                onChange={(event) => setSourceName(event.target.value)}
              />
            </label>
            <label>
              ID fonte Meta
              <input
                value={sourceId}
                placeholder="Page ID o Instagram User ID"
                onChange={(event) => setSourceId(event.target.value)}
              />
            </label>
          </div>

          <label>
            Pagina Facebook collegata (solo Instagram)
            <input
              value={sourcePageId}
              placeholder="Page ID collegata all'account Instagram"
              onChange={(event) => setSourcePageId(event.target.value)}
            />
          </label>
        </section>

        <section className="dashboard-section sponsor-card">
          <div className="section-heading">
            <div>
              <Link size={18} />
              <h2>2. Destinazione Meta</h2>
            </div>
          </div>

          <div className="form-row two">
            <label>
              Campagna
              <input
                value={campaignName}
                placeholder="Nome campagna"
                onChange={(event) => setCampaignName(event.target.value)}
              />
            </label>
            <label>
              ID campagna
              <input
                value={campaignId}
                placeholder="Opzionale"
                onChange={(event) => setCampaignId(event.target.value)}
              />
            </label>
          </div>

          <div className="form-row two">
            <label>
              Gruppo inserzioni
              <input
                value={adsetName}
                placeholder="Nome gruppo"
                onChange={(event) => setAdsetName(event.target.value)}
              />
            </label>
            <label>
              ID gruppo
              <input
                value={adsetId}
                placeholder="Opzionale"
                onChange={(event) => setAdsetId(event.target.value)}
              />
            </label>
          </div>

          <div className="form-row two">
            <label>
              Regola automatica
              <input
                value={ruleName}
                placeholder="Opzionale"
                onChange={(event) => setRuleName(event.target.value)}
              />
            </label>
            <label>
              ID regola
              <input
                value={ruleId}
                placeholder="Opzionale"
                onChange={(event) => setRuleId(event.target.value)}
              />
            </label>
          </div>

          <label>
            Pattern nome inserzione
            <input
              value={adNamePattern}
              onChange={(event) => setAdNamePattern(event.target.value)}
            />
          </label>

          <label className="toggle-row sponsor-toggle">
            <input
              type="checkbox"
              checked={createActive}
              onChange={(event) => setCreateActive(event.target.checked)}
            />
            <span>Creare inserzioni attive invece che in pausa</span>
          </label>
        </section>

        <section className="dashboard-section sponsor-card">
          <div className="section-heading">
            <div>
              <Plus size={18} />
              <h2>3. Lista post</h2>
            </div>
            <span className="section-meta">{queue.length} in lista</span>
          </div>

          <div className="sponsor-import-note">
            <strong>Libreria post Meta</strong>
            <p>
              Qui vanno selezionati o incollati solo post gia pubblicati sulle
              pagine Facebook/Instagram collegate. Quando OAuth Meta sara
              attivo, questa sezione mostrera la libreria reale dei post.
            </p>
          </div>

          <div className="sponsor-post-form">
            <div className="form-row two">
              <label>
                Piattaforma
                <select
                  value={postPlatform}
                  onChange={(event) =>
                    setPostPlatform(event.target.value as AdsPlatform)
                  }
                >
                  <option value="facebook">Facebook</option>
                  <option value="instagram">Instagram</option>
                </select>
              </label>
              <label>
                {postPlatform === 'facebook'
                  ? 'Object story ID / ID post Facebook'
                  : 'Instagram media ID'}
                <input
                  value={postId}
                  placeholder={
                    postPlatform === 'facebook'
                      ? 'Es. pageid_postid'
                      : 'Es. 179...'
                  }
                  onChange={(event) => setPostId(event.target.value)}
                />
              </label>
            </div>
            <textarea
              value={postText}
              placeholder="Caption/testo del post pubblicato"
              onChange={(event) => setPostText(event.target.value)}
            />
            <div className="form-row two">
              <input
                value={postUrl}
                placeholder="Link post"
                onChange={(event) => setPostUrl(event.target.value)}
              />
              <input
                type="date"
                value={postPublishedAt}
                onChange={(event) => setPostPublishedAt(event.target.value)}
              />
            </div>
            <input
              value={postThumb}
              placeholder="URL anteprima immagine, opzionale"
              onChange={(event) => setPostThumb(event.target.value)}
            />
            <button type="button" onClick={addPost}>
              <Plus size={16} />
              Aggiungi post pubblicato
            </button>
          </div>

          {queue.length === 0 ? (
            <div className="empty-state compact-empty">
              <Megaphone size={24} />
              <p>Aggiungi alla lista i post Meta gia pubblicati.</p>
            </div>
          ) : (
            <div className="sponsor-queue">
              {queue.map((post, index) => (
                <article className="sponsor-queue-row" key={`${post.source_post_id}-${index}`}>
                  <span>{platformLabels[post.platform]}</span>
                  <div>
                    <strong>{post.post_text}</strong>
                    <small>
                      Meta post: {post.source_post_id}
                      {post.platform === 'instagram'
                        ? ` | IG: ${post.instagram_account_id} | Pagina: ${post.source_page_id}`
                        : post.source_account_id
                          ? ` | Pagina: ${post.source_account_id}`
                          : ''}
                    </small>
                    <input
                      value={post.ad_name}
                      aria-label="Nome inserzione"
                      onChange={(event) =>
                        updateQueueName(index, event.target.value)
                      }
                    />
                  </div>
                  <button
                    className="icon-button ghost"
                    type="button"
                    title="Rimuovi"
                    onClick={() => removeQueuedPost(index)}
                  >
                    <Trash2 size={16} />
                  </button>
                </article>
              ))}
            </div>
          )}

          <div className="sponsor-actions">
            <button type="button" onClick={refreshQueueNames}>
              Aggiorna nomi lista
            </button>
            <button
              type="submit"
              disabled={
                saving ||
                !projectId ||
                queue.length === 0 ||
                (!campaignName.trim() && !campaignId.trim()) ||
                (!adsetName.trim() && !adsetId.trim())
              }
            >
              <CheckCircle2 size={16} />
              Salva batch Meta
            </button>
          </div>
        </section>
      </form>

      <section className="dashboard-section sponsor-history">
        <div className="section-heading">
          <div>
            <Megaphone size={18} />
            <h2>Batch salvati</h2>
          </div>
          <span className="section-meta">{batches.length}</span>
        </div>

        {loading ? (
          <div className="notice">Caricamento SponsorAds...</div>
        ) : batches.length === 0 ? (
          <div className="empty-state compact-empty">
            <Megaphone size={24} />
            <p>Nessun batch Ads salvato.</p>
          </div>
        ) : (
          <div className="sponsor-batch-list">
            {batches.map((batch) => (
              <article className="sponsor-batch" key={batch.id}>
                <span
                  className="project-color-dot"
                  style={{ backgroundColor: batch.project_color }}
                />
                <div>
                  <strong>{batch.name}</strong>
                  <small>
                    {batch.project_name} - {formatDateTime(batch.created_at)}
                  </small>
                  <div className="social-tags">
                    <span>{statusLabels[batch.status]}</span>
                    <span>{batch.posts.length} post Meta</span>
                    <span>{batch.create_active ? 'Attive' : 'In pausa'}</span>
                  </div>
                </div>
                <div className="sponsor-batch-actions">
                  <button type="button" onClick={() => void copyExport(batch)}>
                    <Copy size={15} />
                    Copia JSON
                  </button>
                  <button type="button" onClick={() => downloadExport(batch)}>
                    <Download size={15} />
                    Scarica
                  </button>
                  <button
                    className="icon-button ghost"
                    type="button"
                    title="Elimina batch"
                    onClick={() => void deleteBatch(batch.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {exportText ? (
        <section className="dashboard-section sponsor-export">
          <div className="section-heading">
            <div>
              <Download size={18} />
              <h2>Ultimo export</h2>
            </div>
          </div>
          <textarea value={exportText} readOnly />
        </section>
      ) : null}
    </div>
  )
}
