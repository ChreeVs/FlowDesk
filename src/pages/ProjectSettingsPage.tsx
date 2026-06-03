import {
  ChevronLeft,
  Globe2,
  Image,
  Link as LinkIcon,
  Palette,
  Save,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { repository } from '../lib/repository'
import type { Project, ProjectSettings } from '../types'
import { getErrorMessage } from '../utils/error'
import { normalizeUrl } from '../utils/url'

type ProjectSettingsPageProps = {
  projectId: string
  onBack: () => void
}

type SettingsDraft = Omit<ProjectSettings, 'project_id' | 'updated_at'>

const emptySettingsDraft = (): SettingsDraft => ({
  logo_url: null,
  color: '#6b58d6',
  description: '',
  website_url: '',
  facebook_url: '',
  instagram_url: '',
  linkedin_url: '',
  x_url: '',
  youtube_url: '',
  drive_url: '',
})

const toSettingsDraft = (settings: ProjectSettings | null): SettingsDraft => {
  const defaults = emptySettingsDraft()

  if (!settings) {
    return defaults
  }

  return {
    logo_url: settings.logo_url,
    color: settings.color,
    description: settings.description,
    website_url: settings.website_url,
    facebook_url: settings.facebook_url,
    instagram_url: settings.instagram_url,
    linkedin_url: settings.linkedin_url,
    x_url: settings.x_url,
    youtube_url: settings.youtube_url,
    drive_url: settings.drive_url,
  }
}

const optionalUrl = (value: string) =>
  value.trim() ? normalizeUrl(value.trim()) : ''

export function ProjectSettingsPage({
  projectId,
  onBack,
}: ProjectSettingsPageProps) {
  const [project, setProject] = useState<Project | null>(null)
  const [draft, setDraft] = useState<SettingsDraft>(emptySettingsDraft)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadSettings = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const bundle = await repository.getProjectBundle(projectId)
      setProject(bundle.project)
      setDraft(toSettingsDraft(bundle.settings))
    } catch (loadError) {
      setError(getErrorMessage(loadError))
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void loadSettings()
  }, [loadSettings])

  const saveSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setSaved(false)
    setError(null)

    try {
      const savedSettings = await repository.saveProjectSettings(projectId, {
        ...draft,
        logo_url: draft.logo_url?.trim() ? optionalUrl(draft.logo_url) : null,
        website_url: optionalUrl(draft.website_url),
        facebook_url: optionalUrl(draft.facebook_url),
        instagram_url: optionalUrl(draft.instagram_url),
        linkedin_url: optionalUrl(draft.linkedin_url),
        x_url: optionalUrl(draft.x_url),
        youtube_url: optionalUrl(draft.youtube_url),
        drive_url: optionalUrl(draft.drive_url),
      })
      setDraft(toSettingsDraft(savedSettings))
      setSaved(true)
    } catch (saveError) {
      setError(getErrorMessage(saveError))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="notice">Caricamento impostazioni...</div>
      </div>
    )
  }

  return (
    <div className="page project-settings-page">
      <div className="project-toolbar">
        <button className="back-button" type="button" onClick={onBack}>
          <ChevronLeft size={17} />
          Progetto
        </button>
      </div>

      <div className="page-header dashboard-header">
        <div>
          <p className="eyebrow">Personalizzazione progetto</p>
          <h1>{project?.name ?? 'Impostazioni progetto'}</h1>
        </div>
        {saved ? <span className="section-meta">Salvato</span> : null}
      </div>

      {error ? <div className="notice error">{error}</div> : null}

      <section className="project-settings-panel">
        <div className="section-heading">
          <div>
            <Palette size={18} />
            <h2>Identita e riferimenti</h2>
          </div>
        </div>

        <form className="project-settings-form" onSubmit={saveSettings}>
          <div className="settings-preview">
            <span
              className="project-logo large"
              style={{ backgroundColor: draft.color }}
            >
              {draft.logo_url ? (
                <img src={draft.logo_url} alt="" />
              ) : (
                <Image size={20} />
              )}
            </span>
            <label>
              <span>Colore progetto</span>
              <input
                type="color"
                value={draft.color}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    color: event.target.value,
                  }))
                }
              />
            </label>
          </div>

          <input
            value={draft.logo_url ?? ''}
            placeholder="URL logo"
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                logo_url: event.target.value,
              }))
            }
          />
          <textarea
            value={draft.description}
            placeholder="Note, tono di voce, riferimenti visuali o dettagli utili"
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
          />

          <div className="form-row two">
            <label>
              <Globe2 size={14} />
              <input
                value={draft.website_url}
                placeholder="Sito web"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    website_url: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              <LinkIcon size={14} />
              <input
                value={draft.drive_url}
                placeholder="Drive / cartella asset"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    drive_url: event.target.value,
                  }))
                }
              />
            </label>
          </div>

          <div className="form-row two">
            <input
              value={draft.instagram_url}
              placeholder="Instagram"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  instagram_url: event.target.value,
                }))
              }
            />
            <input
              value={draft.facebook_url}
              placeholder="Facebook"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  facebook_url: event.target.value,
                }))
              }
            />
            <input
              value={draft.linkedin_url}
              placeholder="LinkedIn"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  linkedin_url: event.target.value,
                }))
              }
            />
            <input
              value={draft.x_url}
              placeholder="X / Twitter"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  x_url: event.target.value,
                }))
              }
            />
            <input
              value={draft.youtube_url}
              placeholder="YouTube"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  youtube_url: event.target.value,
                }))
              }
            />
          </div>

          <button type="submit" disabled={saving}>
            <Save size={16} />
            {saving ? 'Salvataggio...' : 'Salva impostazioni'}
          </button>
        </form>
      </section>
    </div>
  )
}
