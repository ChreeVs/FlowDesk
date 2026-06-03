import {
  Bell,
  CalendarClock,
  Check,
  ChevronLeft,
  Circle,
  Clock3,
  ExternalLink,
  FileText,
  History,
  Link as LinkIcon,
  ListTodo,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { EditableText } from '../components/EditableText'
import { Section } from '../components/Section'
import { repository } from '../lib/repository'
import type {
  ProjectBundle,
  ProjectEvent,
  ProjectLink,
  Reminder,
  Task,
  TaskFilter,
} from '../types'
import {
  formatDateTime,
  fromDatetimeLocalValue,
  getDueBadge,
  toDatetimeLocalValue,
} from '../utils/date'
import { getErrorMessage } from '../utils/error'
import { normalizeUrl } from '../utils/url'

type ProjectPageProps = {
  projectId: string
  onBack: () => void
  showHints: boolean
}

const defaultReminderInput = () => {
  const date = new Date()
  date.setHours(date.getHours() + 1, 0, 0, 0)

  return toDatetimeLocalValue(date.toISOString())
}

const sortTasks = (tasks: Task[]) =>
  [...tasks].sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === 'todo' ? -1 : 1
    }

    const aDue = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER
    const bDue = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER

    if (aDue !== bDue) {
      return aDue - bDue
    }

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

const sortReminders = (reminders: Reminder[]) =>
  [...reminders].sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === 'pending' ? -1 : 1
    }

    return new Date(a.remind_at).getTime() - new Date(b.remind_at).getTime()
  })

const matches = (query: string, ...values: Array<string | null | undefined>) =>
  !query ||
  values.some((value) => value?.toLowerCase().includes(query.toLowerCase()))

export function ProjectPage({ projectId, onBack, showHints }: ProjectPageProps) {
  const [bundle, setBundle] = useState<ProjectBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('all')

  const [newEvent, setNewEvent] = useState('')
  const [newTask, setNewTask] = useState('')
  const [newTaskDue, setNewTaskDue] = useState('')
  const [newLinkLabel, setNewLinkLabel] = useState('')
  const [newLinkUrl, setNewLinkUrl] = useState('')
  const [newReminder, setNewReminder] = useState('')
  const [newReminderAt, setNewReminderAt] = useState(defaultReminderInput)
  const [newReminderTaskId, setNewReminderTaskId] = useState('')

  const [noteText, setNoteText] = useState('')
  const [noteState, setNoteState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const lastSavedNote = useRef('')

  const loadProject = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const loaded = await repository.getProjectBundle(projectId)
      const loadedNote = loaded.note?.text ?? ''
      lastSavedNote.current = loadedNote
      setNoteText(loadedNote)
      setNoteState('idle')
      setBundle(loaded)
    } catch (loadError) {
      setError(getErrorMessage(loadError))
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void loadProject()
  }, [loadProject])

  const activeProjectId = bundle?.project.id
  const activeNoteId = bundle?.note?.id

  useEffect(() => {
    if (!activeProjectId || noteText === lastSavedNote.current) {
      return
    }

    setNoteState('saving')

    const timer = window.setTimeout(async () => {
      try {
        const saved = await repository.saveNote(
          activeProjectId,
          noteText,
          activeNoteId,
        )
        lastSavedNote.current = saved.text
        setBundle((current) => (current ? { ...current, note: saved } : current))
        setNoteState('saved')
      } catch (saveError) {
        setError(getErrorMessage(saveError))
        setNoteState('idle')
      }
    }, 650)

    return () => window.clearTimeout(timer)
  }, [activeNoteId, activeProjectId, noteText])

  const taskTitleById = useMemo(() => {
    const map = new Map<string, string>()
    bundle?.tasks.forEach((task) => map.set(task.id, task.title))

    return map
  }, [bundle?.tasks])

  const query = search.trim().toLowerCase()

  const visibleEvents = useMemo(
    () =>
      (bundle?.events ?? []).filter((event) => matches(query, event.text)),
    [bundle?.events, query],
  )

  const visibleTasks = useMemo(
    () =>
      sortTasks(bundle?.tasks ?? []).filter((task) => {
        const statusMatch = taskFilter === 'all' || task.status === taskFilter

        return statusMatch && matches(query, task.title, task.due_date)
      }),
    [bundle?.tasks, query, taskFilter],
  )

  const visibleLinks = useMemo(
    () =>
      (bundle?.links ?? []).filter((link) =>
        matches(query, link.label, link.url),
      ),
    [bundle?.links, query],
  )

  const visibleReminders = useMemo(
    () =>
      sortReminders(bundle?.reminders ?? []).filter((reminder) =>
        matches(
          query,
          reminder.text,
          reminder.remind_at,
          taskTitleById.get(reminder.related_task_id ?? ''),
        ),
      ),
    [bundle?.reminders, query, taskTitleById],
  )

  const openTasks = (bundle?.tasks ?? []).filter((task) => task.status === 'todo')
  const pendingReminders = (bundle?.reminders ?? []).filter(
    (reminder) => reminder.status === 'pending',
  )

  const patchBundle = (patcher: (current: ProjectBundle) => ProjectBundle) => {
    setBundle((current) => (current ? patcher(current) : current))
  }

  const handleError = (actionError: unknown) => {
    setError(getErrorMessage(actionError))
  }

  const renameProject = async (name: string) => {
    if (!bundle) {
      return
    }

    try {
      const project = await repository.updateProject(bundle.project.id, { name })
      patchBundle((current) => ({ ...current, project }))
    } catch (renameError) {
      handleError(renameError)
    }
  }

  const addEvent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!bundle || !newEvent.trim()) {
      return
    }

    try {
      const created = await repository.createEvent(bundle.project.id, newEvent.trim())
      setNewEvent('')
      patchBundle((current) => ({
        ...current,
        events: [created, ...current.events],
      }))
    } catch (createError) {
      handleError(createError)
    }
  }

  const updateEvent = async (id: string, text: string) => {
    try {
      const updated = await repository.updateEvent(id, { text })
      patchBundle((current) => ({
        ...current,
        events: current.events.map((event) =>
          event.id === id ? updated : event,
        ),
      }))
    } catch (updateError) {
      handleError(updateError)
    }
  }

  const deleteEvent = async (id: string) => {
    try {
      await repository.deleteEvent(id)
      patchBundle((current) => ({
        ...current,
        events: current.events.filter((event) => event.id !== id),
      }))
    } catch (deleteError) {
      handleError(deleteError)
    }
  }

  const addTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!bundle || !newTask.trim()) {
      return
    }

    try {
      const created = await repository.createTask(
        bundle.project.id,
        newTask.trim(),
        newTaskDue || null,
      )
      setNewTask('')
      setNewTaskDue('')
      patchBundle((current) => ({
        ...current,
        tasks: [created, ...current.tasks],
      }))
    } catch (createError) {
      handleError(createError)
    }
  }

  const updateTask = async (id: string, patch: Partial<Task>) => {
    try {
      const updated = await repository.updateTask(id, patch)
      patchBundle((current) => ({
        ...current,
        tasks: current.tasks.map((task) => (task.id === id ? updated : task)),
      }))
    } catch (updateError) {
      handleError(updateError)
    }
  }

  const deleteTask = async (id: string) => {
    try {
      await repository.deleteTask(id)
      patchBundle((current) => ({
        ...current,
        tasks: current.tasks.filter((task) => task.id !== id),
        reminders: current.reminders.map((reminder) =>
          reminder.related_task_id === id
            ? { ...reminder, related_task_id: null }
            : reminder,
        ),
      }))
    } catch (deleteError) {
      handleError(deleteError)
    }
  }

  const clearNote = async () => {
    if (!bundle) {
      return
    }

    try {
      if (bundle.note) {
        await repository.deleteNote(bundle.note.id)
      }

      lastSavedNote.current = ''
      setNoteText('')
      setNoteState('idle')
      patchBundle((current) => ({ ...current, note: null }))
    } catch (deleteError) {
      handleError(deleteError)
    }
  }

  const addLink = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!bundle || !newLinkLabel.trim() || !newLinkUrl.trim()) {
      return
    }

    try {
      const created = await repository.createLink(
        bundle.project.id,
        newLinkLabel.trim(),
        normalizeUrl(newLinkUrl),
      )
      setNewLinkLabel('')
      setNewLinkUrl('')
      patchBundle((current) => ({
        ...current,
        links: [created, ...current.links],
      }))
    } catch (createError) {
      handleError(createError)
    }
  }

  const updateLink = async (id: string, patch: Partial<ProjectLink>) => {
    try {
      const nextPatch =
        patch.url && patch.url.trim()
          ? { ...patch, url: normalizeUrl(patch.url) }
          : patch
      const updated = await repository.updateLink(id, nextPatch)
      patchBundle((current) => ({
        ...current,
        links: current.links.map((link) => (link.id === id ? updated : link)),
      }))
    } catch (updateError) {
      handleError(updateError)
    }
  }

  const deleteLink = async (id: string) => {
    try {
      await repository.deleteLink(id)
      patchBundle((current) => ({
        ...current,
        links: current.links.filter((link) => link.id !== id),
      }))
    } catch (deleteError) {
      handleError(deleteError)
    }
  }

  const addReminder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!bundle || !newReminder.trim() || !newReminderAt) {
      return
    }

    try {
      const created = await repository.createReminder(
        bundle.project.id,
        newReminder.trim(),
        fromDatetimeLocalValue(newReminderAt),
        newReminderTaskId || null,
      )
      setNewReminder('')
      setNewReminderAt(defaultReminderInput())
      setNewReminderTaskId('')
      patchBundle((current) => ({
        ...current,
        reminders: [created, ...current.reminders],
      }))
    } catch (createError) {
      handleError(createError)
    }
  }

  const updateReminder = async (id: string, patch: Partial<Reminder>) => {
    try {
      const updated = await repository.updateReminder(id, patch)
      patchBundle((current) => ({
        ...current,
        reminders: current.reminders.map((reminder) =>
          reminder.id === id ? updated : reminder,
        ),
      }))
    } catch (updateError) {
      handleError(updateError)
    }
  }

  const deleteReminder = async (id: string) => {
    try {
      await repository.deleteReminder(id)
      patchBundle((current) => ({
        ...current,
        reminders: current.reminders.filter((reminder) => reminder.id !== id),
      }))
    } catch (deleteError) {
      handleError(deleteError)
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="notice">Caricamento...</div>
      </div>
    )
  }

  if (!bundle) {
    return (
      <div className="page">
        <button className="back-button" type="button" onClick={onBack}>
          <ChevronLeft size={17} />
          Dashboard
        </button>
        <div className="notice error">{error ?? 'Progetto non trovato'}</div>
      </div>
    )
  }

  return (
    <div className="page project-page">
      <div className="project-toolbar">
        <button className="back-button" type="button" onClick={onBack}>
          <ChevronLeft size={17} />
          Dashboard
        </button>

        <label className="search-box">
          <Search size={16} />
          <input
            value={search}
            placeholder="Cerca nel progetto"
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </div>

      <div className="page-header project-header">
        <div>
          <p className="eyebrow">Progetto</p>
          <EditableText
            className="project-title"
            value={bundle.project.name}
            onSave={renameProject}
          />
        </div>

        <div className="project-stats">
          <span>
            <ListTodo size={15} />
            {openTasks.length} aperti
          </span>
          <span>
            <Bell size={15} />
            {pendingReminders.length} pending
          </span>
        </div>
      </div>

      {showHints ? (
        <p className="page-hint">
          Usa questa pagina come memoria unica: prima registra cosa e successo,
          poi collega task, note, link e promemoria.
        </p>
      ) : null}

      {error ? <div className="notice error">{error}</div> : null}

      <div className="project-grid">
        <Section
          title="Event Timeline"
          icon={<History size={18} />}
          meta={visibleEvents.length}
          hint={
            showHints
              ? 'Registra decisioni, richieste, consegne e aggiornamenti in ordine cronologico.'
              : null
          }
        >
          <form className="quick-form" onSubmit={addEvent}>
            <input
              value={newEvent}
              placeholder="Aggiungi evento"
              onChange={(event) => setNewEvent(event.target.value)}
            />
            <button type="submit" disabled={!newEvent.trim()}>
              <Plus size={17} />
              Evento
            </button>
          </form>

          <div className="item-list timeline-list">
            {visibleEvents.map((event) => (
              <TimelineItem
                event={event}
                key={event.id}
                onDelete={deleteEvent}
                onUpdate={updateEvent}
              />
            ))}
          </div>
        </Section>

        <Section
          title="Tasks"
          icon={<ListTodo size={18} />}
          meta={visibleTasks.length}
          hint={
            showHints
              ? 'Tieni aperte solo le prossime azioni e usa la data quando serve una scadenza.'
              : null
          }
        >
          <form className="quick-form task-form" onSubmit={addTask}>
            <input
              value={newTask}
              placeholder="Aggiungi task"
              onChange={(event) => setNewTask(event.target.value)}
            />
            <input
              className="date-field"
              type="date"
              value={newTaskDue}
              onChange={(event) => setNewTaskDue(event.target.value)}
            />
            <button type="submit" disabled={!newTask.trim()}>
              <Plus size={17} />
              Task
            </button>
          </form>

          <div className="segmented">
            {(['all', 'todo', 'done'] as TaskFilter[]).map((filter) => (
              <button
                className={taskFilter === filter ? 'active' : ''}
                type="button"
                key={filter}
                onClick={() => setTaskFilter(filter)}
              >
                {filter === 'all' ? 'Tutti' : filter === 'todo' ? 'Aperti' : 'Fatti'}
              </button>
            ))}
          </div>

          <div className="item-list">
            {visibleTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onDelete={deleteTask}
                onUpdate={updateTask}
              />
            ))}
          </div>
        </Section>

        <Section
          title="Notes"
          icon={<FileText size={18} />}
          meta={noteState === 'saving' ? 'Salvataggio' : noteState === 'saved' ? 'Salvato' : null}
          hint={
            showHints
              ? 'Blocco note libero del progetto, salvato automaticamente mentre scrivi.'
              : null
          }
        >
          <textarea
            className="notes-area"
            value={noteText}
            placeholder="Note del progetto"
            onChange={(event) => setNoteText(event.target.value)}
          />
          <div className="notes-actions">
            <button
              className="text-button"
              type="button"
              disabled={!noteText.trim() && !bundle.note}
              onClick={() => void clearNote()}
            >
              <Trash2 size={15} />
              Svuota
            </button>
          </div>
        </Section>

        <Section
          title="Links"
          icon={<LinkIcon size={18} />}
          meta={visibleLinks.length}
          hint={
            showHints
              ? 'Aggiungi documenti, file, board e riferimenti esterni con una label leggibile.'
              : null
          }
        >
          <form className="quick-form links-form" onSubmit={addLink}>
            <input
              value={newLinkLabel}
              placeholder="Label"
              onChange={(event) => setNewLinkLabel(event.target.value)}
            />
            <input
              value={newLinkUrl}
              placeholder="URL"
              onChange={(event) => setNewLinkUrl(event.target.value)}
            />
            <button
              type="submit"
              disabled={!newLinkLabel.trim() || !newLinkUrl.trim()}
            >
              <Plus size={17} />
              Link
            </button>
          </form>

          <div className="item-list">
            {visibleLinks.map((link) => (
              <LinkItem
                key={link.id}
                link={link}
                onDelete={deleteLink}
                onUpdate={updateLink}
              />
            ))}
          </div>
        </Section>

        <Section
          title="Reminders"
          icon={<CalendarClock size={18} />}
          meta={visibleReminders.length}
          hint={
            showHints
              ? 'Imposta follow-up con data e ora, opzionalmente collegati a un task.'
              : null
          }
        >
          <form className="quick-form reminder-form" onSubmit={addReminder}>
            <input
              value={newReminder}
              placeholder="Aggiungi promemoria"
              onChange={(event) => setNewReminder(event.target.value)}
            />
            <input
              type="datetime-local"
              value={newReminderAt}
              onChange={(event) => setNewReminderAt(event.target.value)}
            />
            <select
              value={newReminderTaskId}
              onChange={(event) => setNewReminderTaskId(event.target.value)}
            >
              <option value="">Nessun task</option>
              {bundle.tasks.map((task) => (
                <option value={task.id} key={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={!newReminder.trim() || !newReminderAt}
            >
              <Plus size={17} />
              Reminder
            </button>
          </form>

          <div className="item-list">
            {visibleReminders.map((reminder) => (
              <ReminderItem
                key={reminder.id}
                reminder={reminder}
                tasks={bundle.tasks}
                onDelete={deleteReminder}
                onUpdate={updateReminder}
              />
            ))}
          </div>
        </Section>
      </div>
    </div>
  )
}

type TimelineItemProps = {
  event: ProjectEvent
  onUpdate: (id: string, text: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

function TimelineItem({ event, onUpdate, onDelete }: TimelineItemProps) {
  return (
    <article className="timeline-item">
      <span className="timeline-dot" />
      <div>
        <EditableText
          value={event.text}
          onSave={(text) => onUpdate(event.id, text)}
        />
        <time>{formatDateTime(event.created_at)}</time>
      </div>
      <button
        className="icon-button ghost"
        type="button"
        title="Elimina evento"
        onClick={() => void onDelete(event.id)}
      >
        <Trash2 size={16} />
      </button>
    </article>
  )
}

type TaskItemProps = {
  task: Task
  onUpdate: (id: string, patch: Partial<Task>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

function TaskItem({ task, onUpdate, onDelete }: TaskItemProps) {
  const badge = getDueBadge(task.due_date)

  return (
    <article className={`task-item ${task.status === 'done' ? 'done' : ''}`}>
      <button
        className="check-button"
        type="button"
        title={task.status === 'done' ? 'Riapri task' : 'Completa task'}
        onClick={() =>
          void onUpdate(task.id, {
            status: task.status === 'done' ? 'todo' : 'done',
          })
        }
      >
        {task.status === 'done' ? <Check size={15} /> : <Circle size={15} />}
      </button>

      <EditableText
        className="task-title"
        value={task.title}
        onSave={(title) => onUpdate(task.id, { title })}
      />

      <input
        className="compact-date"
        type="date"
        value={task.due_date ?? ''}
        onChange={(event) =>
          void onUpdate(task.id, { due_date: event.target.value || null })
        }
      />

      {badge ? <span className={`due-badge ${badge.tone}`}>{badge.label}</span> : null}

      <button
        className="icon-button ghost"
        type="button"
        title="Elimina task"
        onClick={() => void onDelete(task.id)}
      >
        <Trash2 size={16} />
      </button>
    </article>
  )
}

type LinkItemProps = {
  link: ProjectLink
  onUpdate: (id: string, patch: Partial<ProjectLink>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

function LinkItem({ link, onUpdate, onDelete }: LinkItemProps) {
  return (
    <article className="link-item">
      <div>
        <EditableText
          className="link-label"
          value={link.label}
          onSave={(label) => onUpdate(link.id, { label })}
        />
        <EditableText
          className="link-url"
          value={link.url}
          onSave={(url) => onUpdate(link.id, { url })}
        />
      </div>
      <a
        className="icon-button"
        href={link.url}
        target="_blank"
        rel="noreferrer"
        title="Apri link"
      >
        <ExternalLink size={16} />
      </a>
      <button
        className="icon-button ghost"
        type="button"
        title="Elimina link"
        onClick={() => void onDelete(link.id)}
      >
        <Trash2 size={16} />
      </button>
    </article>
  )
}

type ReminderItemProps = {
  reminder: Reminder
  tasks: Task[]
  onUpdate: (id: string, patch: Partial<Reminder>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

function ReminderItem({
  reminder,
  tasks,
  onUpdate,
  onDelete,
}: ReminderItemProps) {
  return (
    <article className={`reminder-item ${reminder.status === 'done' ? 'done' : ''}`}>
      <button
        className="check-button"
        type="button"
        title={
          reminder.status === 'done'
            ? 'Riapri promemoria'
            : 'Completa promemoria'
        }
        onClick={() =>
          void onUpdate(reminder.id, {
            status: reminder.status === 'done' ? 'pending' : 'done',
          })
        }
      >
        {reminder.status === 'done' ? <Check size={15} /> : <Clock3 size={15} />}
      </button>

      <div className="reminder-main">
        <EditableText
          value={reminder.text}
          onSave={(text) => onUpdate(reminder.id, { text })}
        />
        <div className="reminder-controls">
          <input
            type="datetime-local"
            value={toDatetimeLocalValue(reminder.remind_at)}
            onChange={(event) => {
              if (!event.target.value) {
                return
              }

              void onUpdate(reminder.id, {
                remind_at: fromDatetimeLocalValue(event.target.value),
              })
            }}
          />
          <select
            value={reminder.related_task_id ?? ''}
            onChange={(event) =>
              void onUpdate(reminder.id, {
                related_task_id: event.target.value || null,
              })
            }
          >
            <option value="">Nessun task</option>
            {tasks.map((task) => (
              <option value={task.id} key={task.id}>
                {task.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        className="icon-button ghost"
        type="button"
        title="Elimina promemoria"
        onClick={() => void onDelete(reminder.id)}
      >
        <Trash2 size={16} />
      </button>
    </article>
  )
}
