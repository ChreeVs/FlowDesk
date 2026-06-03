import { CalendarDays, FolderKanban, Plus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { repository } from '../lib/repository'
import type { CalendarNoteSummary, ProjectSummary } from '../types'
import {
  formatDateTime,
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from '../utils/date'
import { getErrorMessage } from '../utils/error'

const defaultDateInput = () => {
  const date = new Date()
  date.setHours(date.getHours() + 2, 0, 0, 0)

  return toDatetimeLocalValue(date.toISOString())
}

export function CalendarPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [notes, setNotes] = useState<CalendarNoteSummary[]>([])
  const [projectId, setProjectId] = useState('')
  const [text, setText] = useState('')
  const [scheduledAt, setScheduledAt] = useState(defaultDateInput)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadCalendar = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [loadedProjects, loadedNotes] = await Promise.all([
        repository.listProjects(),
        repository.listCalendarNotes(),
      ])
      setProjects(loadedProjects)
      setNotes(loadedNotes)
      setProjectId((current) => current || loadedProjects[0]?.id || '')
    } catch (loadError) {
      setError(getErrorMessage(loadError))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCalendar()
  }, [loadCalendar])

  const addNote = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!projectId || !text.trim() || !scheduledAt) {
      return
    }

    setSaving(true)
    setError(null)

    try {
      const created = await repository.createCalendarNote({
        project_id: projectId,
        text: text.trim(),
        scheduled_at: fromDatetimeLocalValue(scheduledAt),
      })
      setText('')
      setScheduledAt(defaultDateInput())
      setNotes((current) =>
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

  const deleteNote = async (noteId: string) => {
    setError(null)

    try {
      await repository.deleteCalendarNote(noteId)
      setNotes((current) => current.filter((note) => note.id !== noteId))
    } catch (deleteError) {
      setError(getErrorMessage(deleteError))
    }
  }

  return (
    <div className="page calendar-page">
      <div className="page-header dashboard-header">
        <div>
          <p className="eyebrow">Pianificazione</p>
          <h1>Calendario</h1>
        </div>
      </div>

      {error ? <div className="notice error">{error}</div> : null}

      <section className="dashboard-section calendar-panel">
        <div className="section-heading">
          <div>
            <CalendarDays size={18} />
            <h2>Nuova nota calendario</h2>
          </div>
        </div>

        <form className="calendar-form" onSubmit={addNote}>
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
          <input
            value={text}
            placeholder="Nota"
            onChange={(event) => setText(event.target.value)}
          />
          <button
            type="submit"
            disabled={saving || !projectId || !text.trim() || !scheduledAt}
          >
            <Plus size={17} />
            Aggiungi
          </button>
        </form>
      </section>

      {loading ? (
        <div className="notice">Caricamento calendario...</div>
      ) : notes.length === 0 ? (
        <div className="empty-state">
          <CalendarDays size={28} />
          <p>Nessuna nota calendario</p>
        </div>
      ) : (
        <section className="dashboard-section">
          <div className="section-heading">
            <div>
              <CalendarDays size={18} />
              <h2>Note programmate</h2>
            </div>
            <span className="section-meta">{notes.length}</span>
          </div>

          <div className="calendar-list">
            {notes.map((note) => (
              <article className="calendar-item" key={note.id}>
                <span
                  className="project-color-dot"
                  style={{ backgroundColor: note.project_color }}
                />
                <div>
                  <strong>{note.text}</strong>
                  <small>
                    <FolderKanban size={13} />
                    {note.project_name}
                  </small>
                </div>
                <time>{formatDateTime(note.scheduled_at)}</time>
                <button
                  className="icon-button ghost"
                  type="button"
                  title="Elimina nota"
                  onClick={() => void deleteNote(note.id)}
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
