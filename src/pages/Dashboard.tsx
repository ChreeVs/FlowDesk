import {
  ArrowRight,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  Plus,
  Trash2,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { repository } from '../lib/repository'
import type { ProjectSummary } from '../types'
import { formatDate } from '../utils/date'
import { getErrorMessage } from '../utils/error'

type DashboardProps = {
  onOpenProject: (id: string) => void
  showHints: boolean
}

export function Dashboard({ onOpenProject, showHints }: DashboardProps) {
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [projectName, setProjectName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const openTasks = projects.reduce(
    (total, project) => total + project.open_tasks,
    0,
  )

  const loadProjects = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      setProjects(await repository.listProjects())
    } catch (loadError) {
      setError(getErrorMessage(loadError))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadProjects()
  }, [loadProjects])

  const createProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const name = projectName.trim()

    if (!name) {
      return
    }

    setSaving(true)
    setError(null)

    try {
      const created = await repository.createProject(name)
      setProjectName('')
      setProjects((current) => [{ ...created, open_tasks: 0 }, ...current])
      onOpenProject(created.id)
    } catch (createError) {
      setError(getErrorMessage(createError))
    } finally {
      setSaving(false)
    }
  }

  const deleteProject = async (id: string, name: string) => {
    if (!window.confirm(`Eliminare "${name}"?`)) {
      return
    }

    setError(null)

    try {
      await repository.deleteProject(id)
      setProjects((current) => current.filter((project) => project.id !== id))
    } catch (deleteError) {
      setError(getErrorMessage(deleteError))
    }
  }

  return (
    <div className="page dashboard-page">
      <div className="page-header dashboard-header">
        <div>
          <p className="eyebrow">Scrivania operativa</p>
          <h1>Dashboard</h1>
        </div>

        <form className="quick-form project-create" onSubmit={createProject}>
          <label className="sr-only" htmlFor="project-name">
            Nome progetto
          </label>
          <input
            id="project-name"
            value={projectName}
            placeholder="Nuovo progetto"
            onChange={(event) => setProjectName(event.target.value)}
          />
          <button type="submit" disabled={saving || !projectName.trim()}>
            <Plus size={17} />
            Crea
          </button>
        </form>
      </div>

      {showHints ? (
        <p className="page-hint">
          Crea un progetto e usa la sua pagina come memoria operativa:
          timeline, task, note, link e promemoria nello stesso posto.
        </p>
      ) : null}

      {error ? <div className="notice error">{error}</div> : null}

      {loading ? (
        <div className="notice">Caricamento...</div>
      ) : projects.length === 0 ? (
        <div className="empty-state">
          <FolderKanban size={28} />
          <p>Nessun progetto</p>
        </div>
      ) : (
        <>
          <div className="dashboard-metrics">
            <article>
              <span><LayoutDashboard size={17} /></span>
              <small>Progetti totali</small>
              <strong>{projects.length}</strong>
            </article>
            <article>
              <span><ListTodo size={17} /></span>
              <small>Task aperti</small>
              <strong>{openTasks}</strong>
            </article>
            <article>
              <span><FolderKanban size={17} /></span>
              <small>Ultimo progetto</small>
              <strong>{projects[0]?.name}</strong>
            </article>
          </div>

          <section className="dashboard-section">
            <div className="section-heading">
              <div>
                <FolderKanban size={18} />
                <h2>Progetti</h2>
              </div>
              <span className="section-meta">{projects.length}</span>
            </div>

            <div className="project-list">
              {projects.map((project) => (
                <article className="project-card" key={project.id}>
                  <button
                    className="project-open"
                    type="button"
                    onClick={() => onOpenProject(project.id)}
                  >
                    <span className="project-icon">
                      <FolderKanban size={18} />
                    </span>
                    <span>
                      <strong>{project.name}</strong>
                      <small>Creato {formatDate(project.created_at)}</small>
                    </span>
                  </button>

                  <span className="task-count" title="Task aperti">
                    <ListTodo size={15} />
                    {project.open_tasks}
                  </span>

                  <button
                    className="icon-button ghost"
                    type="button"
                    title="Elimina progetto"
                    onClick={() => void deleteProject(project.id, project.name)}
                  >
                    <Trash2 size={16} />
                  </button>

                  <button
                    className="icon-button"
                    type="button"
                    title="Apri progetto"
                    onClick={() => onOpenProject(project.id)}
                  >
                    <ArrowRight size={16} />
                  </button>
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
