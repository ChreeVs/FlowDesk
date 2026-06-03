import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  FolderKanban,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { getEditorialIdeas } from '../data/editorialCalendar'
import { repository } from '../lib/repository'
import type { CalendarNoteSummary, ProjectSummary } from '../types'
import {
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from '../utils/date'
import { getErrorMessage } from '../utils/error'

type CalendarView = 'month' | 'week'

const weekdayLabels = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom']
const monthFormatter = new Intl.DateTimeFormat('it-IT', {
  month: 'long',
  year: 'numeric',
})
const timeFormatter = new Intl.DateTimeFormat('it-IT', {
  hour: '2-digit',
  minute: '2-digit',
})

const normalizeDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate())

const dayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`

const sameDay = (a: Date, b: Date) => dayKey(a) === dayKey(b)

const getMonday = (date: Date) => {
  const current = normalizeDay(date)
  const day = current.getDay()
  const diff = day === 0 ? -6 : 1 - day
  current.setDate(current.getDate() + diff)

  return current
}

const getWeekNumber = (date: Date) => {
  const current = normalizeDay(date)
  current.setDate(current.getDate() + 3 - ((current.getDay() + 6) % 7))
  const weekOne = new Date(current.getFullYear(), 0, 4)

  return (
    1 +
    Math.round(
      ((current.getTime() - weekOne.getTime()) / 86400000 -
        3 +
        ((weekOne.getDay() + 6) % 7)) /
        7,
    )
  )
}

const getCalendarDays = (anchor: Date, view: CalendarView) => {
  if (view === 'week') {
    const start = getMonday(anchor)

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start)
      date.setDate(start.getDate() + index)

      return date
    })
  }

  const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const start = getMonday(firstOfMonth)

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)

    return date
  })
}

const defaultDateInput = (date: Date) => {
  const next = new Date(date)
  next.setHours(10, 0, 0, 0)

  return toDatetimeLocalValue(next.toISOString())
}

const noteLabels = ['FEED', 'STORY', 'REEL', 'POST', 'NOTE']
const noteColors = ['#2f8f56', '#2d7c9f', '#7c5ce0', '#e07b39', '#d14d72']

export function CalendarPage() {
  const today = useMemo(() => normalizeDay(new Date()), [])
  const [anchorDate, setAnchorDate] = useState(today)
  const [view, setView] = useState<CalendarView>('month')
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [notes, setNotes] = useState<CalendarNoteSummary[]>([])
  const [modalDate, setModalDate] = useState<Date | null>(null)
  const [projectId, setProjectId] = useState('')
  const [text, setText] = useState('')
  const [label, setLabel] = useState(noteLabels[0])
  const [noteColor, setNoteColor] = useState(noteColors[0])
  const [scheduledAt, setScheduledAt] = useState(defaultDateInput(today))
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

  const days = useMemo(() => getCalendarDays(anchorDate, view), [anchorDate, view])
  const notesByDay = useMemo(() => {
    const map = new Map<string, CalendarNoteSummary[]>()

    notes.forEach((note) => {
      const key = dayKey(new Date(note.scheduled_at))
      map.set(key, [...(map.get(key) ?? []), note])
    })

    return map
  }, [notes])

  const openModal = (date: Date, initialText = '') => {
    setModalDate(date)
    setScheduledAt(defaultDateInput(date))
    setText(initialText)
    setLabel(noteLabels[0])
    setNoteColor(noteColors[0])
  }

  const move = (direction: -1 | 1) => {
    setAnchorDate((current) => {
      const next = new Date(current)
      if (view === 'week') {
        next.setDate(current.getDate() + direction * 7)
      } else {
        next.setMonth(current.getMonth() + direction)
      }

      return normalizeDay(next)
    })
  }

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
        label: label.trim().toUpperCase() || 'NOTE',
        color: noteColor,
        scheduled_at: fromDatetimeLocalValue(scheduledAt),
      })
      setNotes((current) =>
        [...current, created].sort(
          (a, b) =>
            new Date(a.scheduled_at).getTime() -
            new Date(b.scheduled_at).getTime(),
        ),
      )
      setModalDate(null)
      setText('')
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
    <div className="page calendar-page editorial-calendar">
      <div className="calendar-title-row">
        <h1>Calendario editoriale</h1>
        <div className="calendar-view-toggle">
          <button
            className={view === 'month' ? 'active' : ''}
            type="button"
            onClick={() => setView('month')}
          >
            Mese
          </button>
          <button
            className={view === 'week' ? 'active' : ''}
            type="button"
            onClick={() => setView('week')}
          >
            Settimana
          </button>
        </div>
      </div>

      <div className="calendar-controls">
        <div>
          <button type="button" onClick={() => move(-1)}>
            <ChevronLeft size={20} />
          </button>
          <button type="button" onClick={() => move(1)}>
            <ChevronRight size={20} />
          </button>
          <button
            type="button"
            disabled={sameDay(anchorDate, today)}
            onClick={() => setAnchorDate(today)}
          >
            Oggi
          </button>
        </div>
        <strong>{monthFormatter.format(anchorDate)}</strong>
      </div>

      {error ? <div className="notice error">{error}</div> : null}

      <div className={`calendar-board ${view}`}>
        <div className="calendar-weekdays">
          {weekdayLabels.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>

        <div className="calendar-grid-board">
          {days.map((date) => {
            const key = dayKey(date)
            const dayNotes = notesByDay.get(key) ?? []
            const outside = date.getMonth() !== anchorDate.getMonth()
            const weekStart = date.getDay() === 1

            return (
              <article
                className={`calendar-day ${outside ? 'outside' : ''} ${
                  sameDay(date, today) ? 'today' : ''
                }`}
                key={key}
              >
                <div className="calendar-day-top">
                  {weekStart ? <span>Sm{getWeekNumber(date)}</span> : <span />}
                  <button
                    type="button"
                    title="Aggiungi nota"
                    onClick={() => openModal(date)}
                  >
                    <Plus size={14} />
                  </button>
                  <time>{date.getDate()}</time>
                </div>

                <div className="calendar-day-content">
                  {dayNotes.map((note) => (
                    <div
                      className="calendar-chip"
                      key={note.id}
                      style={{ borderColor: note.color }}
                    >
                      <span style={{ backgroundColor: note.color }}>
                        <Clock3 size={11} />
                        {timeFormatter.format(new Date(note.scheduled_at))}
                      </span>
                      <strong style={{ color: note.color }}>{note.label}</strong>
                      <small>{note.text}</small>
                      <button
                        type="button"
                        title="Elimina nota"
                        onClick={() => void deleteNote(note.id)}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}

                  {getEditorialIdeas(date).map((idea) => (
                    <button
                      className="calendar-idea"
                      key={idea}
                      type="button"
                      onClick={() => openModal(date, idea)}
                    >
                      {idea}
                    </button>
                  ))}
                </div>
              </article>
            )
          })}
        </div>
      </div>

      {loading ? <div className="notice">Caricamento calendario...</div> : null}

      {modalDate ? (
        <div className="modal-backdrop">
          <div className="calendar-note-modal">
            <div className="modal-heading">
              <div>
                <p className="eyebrow">Nuova nota</p>
                <h2>{modalDate.toLocaleDateString('it-IT')}</h2>
              </div>
              <button
                className="icon-button ghost"
                type="button"
                title="Chiudi"
                onClick={() => setModalDate(null)}
              >
                <X size={17} />
              </button>
            </div>

            <form className="calendar-modal-form" onSubmit={addNote}>
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
                Data e ora
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(event) => setScheduledAt(event.target.value)}
                />
              </label>
              <div className="calendar-note-options">
                <label>
                  Etichetta
                  <select
                    value={label}
                    onChange={(event) => setLabel(event.target.value)}
                  >
                    {noteLabels.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Colore
                  <input
                    type="color"
                    value={noteColor}
                    onChange={(event) => setNoteColor(event.target.value)}
                  />
                </label>
              </div>
              <div className="calendar-color-presets">
                {noteColors.map((color) => (
                  <button
                    aria-label={`Usa colore ${color}`}
                    className={color === noteColor ? 'active' : ''}
                    key={color}
                    type="button"
                    style={{ backgroundColor: color }}
                    onClick={() => setNoteColor(color)}
                  />
                ))}
              </div>
              <label>
                Nota
                <textarea
                  value={text}
                  placeholder="Cosa va ricordato o pubblicato?"
                  onChange={(event) => setText(event.target.value)}
                />
              </label>
              <button
                type="submit"
                disabled={saving || !projectId || !text.trim() || !scheduledAt}
              >
                <FolderKanban size={16} />
                {saving ? 'Salvataggio...' : 'Aggiungi nota'}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
