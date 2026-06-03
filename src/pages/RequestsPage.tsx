import {
  CheckCircle2,
  Clock3,
  FileUp,
  FolderKanban,
  Inbox,
  Paperclip,
  RefreshCw,
  Send,
  XCircle,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { clientRequestTypeLabels } from '../data/clientRequests'
import { repository } from '../lib/repository'
import type {
  ClientRequestStatus,
  ClientRequestSummary,
  ClientRequestUpdate,
} from '../types'
import { formatDateTime } from '../utils/date'
import { getErrorMessage } from '../utils/error'

const statusLabels: Record<ClientRequestStatus, string> = {
  new: 'Nuova',
  pending: 'In attesa',
  completed: 'Completata',
  rejected: 'Rifiutata',
  reviewed: 'In attesa',
  done: 'Completata',
  archived: 'Archiviata',
}

const statusClass = (status: ClientRequestStatus) => {
  if (status === 'completed' || status === 'done') {
    return 'completed'
  }

  if (status === 'rejected' || status === 'archived') {
    return 'rejected'
  }

  if (status === 'pending' || status === 'reviewed') {
    return 'pending'
  }

  return 'new'
}

const statusActions: Array<{
  status: ClientRequestStatus
  label: string
  icon: typeof Clock3
}> = [
  { status: 'pending', label: 'In attesa', icon: Clock3 },
  { status: 'completed', label: 'Completata', icon: CheckCircle2 },
  { status: 'rejected', label: 'Rifiutata', icon: XCircle },
]

const urgencyLabel = (value: number) => `Urgenza ${value}/5`

const sortUpdates = (updates: ClientRequestUpdate[]) =>
  [...updates].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )

export function RequestsPage() {
  const [requests, setRequests] = useState<ClientRequestSummary[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [updateText, setUpdateText] = useState('')
  const [updateFile, setUpdateFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedRequest = useMemo(
    () => requests.find((request) => request.id === selectedId) ?? requests[0],
    [requests, selectedId],
  )

  const loadRequests = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const loaded = await repository.listClientRequests()
      setRequests(loaded)
      setSelectedId((current) =>
        current && loaded.some((request) => request.id === current)
          ? current
          : loaded[0]?.id ?? null,
      )
    } catch (loadError) {
      setError(getErrorMessage(loadError))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadRequests()
  }, [loadRequests])

  const updateStatus = async (
    requestId: string,
    status: ClientRequestStatus,
  ) => {
    setSaving(true)
    setError(null)

    try {
      const updated = await repository.updateClientRequestStatus(requestId, status)
      setRequests((current) =>
        current.map((request) =>
          request.id === requestId
            ? { ...request, status: updated.status }
            : request,
        ),
      )
    } catch (updateError) {
      setError(getErrorMessage(updateError))
    } finally {
      setSaving(false)
    }
  }

  const addUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedRequest || (!updateText.trim() && !updateFile)) {
      return
    }

    setSaving(true)
    setError(null)

    try {
      const created = await repository.createClientRequestUpdate(
        selectedRequest.id,
        {
          text: updateText,
          file: updateFile,
        },
      )
      setRequests((current) =>
        current.map((request) =>
          request.id === selectedRequest.id
            ? {
                ...request,
                updates: sortUpdates([...request.updates, created]),
              }
            : request,
        ),
      )
      setUpdateText('')
      setUpdateFile(null)
    } catch (createError) {
      setError(getErrorMessage(createError))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page requests-page">
      <div className="page-header dashboard-header">
        <div>
          <p className="eyebrow">Lavori clienti</p>
          <h1>Richieste</h1>
          <p>
            Raccogli le richieste arrivate dai link cliente, aggiorna lo stato e
            salva materiale operativo.
          </p>
        </div>
        <button
          className="secondary-action"
          type="button"
          disabled={loading}
          onClick={() => void loadRequests()}
        >
          <RefreshCw size={16} />
          Aggiorna
        </button>
      </div>

      {error ? <div className="notice error">{error}</div> : null}

      {loading ? (
        <div className="notice">Caricamento richieste...</div>
      ) : requests.length === 0 ? (
        <div className="empty-state">
          <Inbox size={28} />
          <p>Nessuna richiesta in arrivo</p>
        </div>
      ) : (
        <div className="requests-layout">
          <section className="requests-list-panel">
            <div className="section-heading">
              <div>
                <Inbox size={18} />
                <h2>In arrivo</h2>
              </div>
              <span className="section-meta">{requests.length}</span>
            </div>

            <div className="requests-list">
              {requests.map((request) => (
                <button
                  className={`request-row ${
                    selectedRequest?.id === request.id ? 'active' : ''
                  }`}
                  type="button"
                  key={request.id}
                  onClick={() => {
                    setSelectedId(request.id)
                    setUpdateText('')
                    setUpdateFile(null)
                  }}
                >
                  <span className={`request-status-dot ${statusClass(request.status)}`} />
                  <span>
                    <strong>{request.title}</strong>
                    <small>
                      <FolderKanban size={13} />
                      {request.project_name}
                    </small>
                  </span>
                  <span className={`status-pill ${statusClass(request.status)}`}>
                    {statusLabels[request.status]}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {selectedRequest ? (
            <section className="request-detail-panel">
              <div className="request-detail-heading">
                <div>
                  <p className="eyebrow">
                    {clientRequestTypeLabels[selectedRequest.request_type]}
                  </p>
                  <h2>{selectedRequest.title}</h2>
                  <span>
                    {selectedRequest.project_name} -{' '}
                    {formatDateTime(selectedRequest.created_at)}
                  </span>
                </div>
                <span className={`status-pill ${statusClass(selectedRequest.status)}`}>
                  {statusLabels[selectedRequest.status]}
                </span>
              </div>

              <div className="request-meta-row">
                <span>{urgencyLabel(selectedRequest.urgency)}</span>
                <span>{clientRequestTypeLabels[selectedRequest.request_type]}</span>
                <span>{selectedRequest.files.length} allegati cliente</span>
              </div>

              <div className="request-description">
                <h3>Dettagli richiesta</h3>
                <p>
                  {selectedRequest.description.trim() ||
                    'Il cliente non ha inserito dettagli aggiuntivi.'}
                </p>
              </div>

              {selectedRequest.files.length > 0 ? (
                <div className="request-files-block">
                  <h3>Allegati ricevuti</h3>
                  <div className="client-request-files">
                    {selectedRequest.files.map((file) => (
                      <a
                        href={file.file_url}
                        target="_blank"
                        rel="noreferrer"
                        key={file.id}
                      >
                        <Paperclip size={13} />
                        {file.file_name}
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="request-status-actions">
                {statusActions.map(({ status, label, icon: Icon }) => (
                  <button
                    className={statusClass(status)}
                    type="button"
                    key={status}
                    disabled={saving || selectedRequest.status === status}
                    onClick={() => void updateStatus(selectedRequest.id, status)}
                  >
                    <Icon size={16} />
                    {label}
                  </button>
                ))}
              </div>

              <form className="request-update-form" onSubmit={addUpdate}>
                <div className="section-heading">
                  <div>
                    <FileUp size={18} />
                    <h2>Gestione interna</h2>
                  </div>
                </div>

                <textarea
                  value={updateText}
                  placeholder="Scrivi cosa e stato fatto, cosa manca o cosa vuoi allegare..."
                  onChange={(event) => setUpdateText(event.target.value)}
                />

                <label className="file-input-row">
                  <Paperclip size={16} />
                  <span>{updateFile ? updateFile.name : 'Aggiungi file opzionale'}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,application/pdf,application/zip,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={(event) =>
                      setUpdateFile(event.target.files?.[0] ?? null)
                    }
                  />
                </label>

                <button
                  type="submit"
                  disabled={saving || (!updateText.trim() && !updateFile)}
                >
                  <Send size={16} />
                  Salva gestione
                </button>
              </form>

              <div className="request-updates">
                <h3>Storico gestione</h3>
                {selectedRequest.updates.length === 0 ? (
                  <p>Nessun aggiornamento interno.</p>
                ) : (
                  selectedRequest.updates.map((update) => (
                    <article className="request-update" key={update.id}>
                      <time>{formatDateTime(update.created_at)}</time>
                      {update.text ? <p>{update.text}</p> : null}
                      {update.file_url && update.file_name ? (
                        <a href={update.file_url} target="_blank" rel="noreferrer">
                          <Paperclip size={13} />
                          {update.file_name}
                        </a>
                      ) : null}
                    </article>
                  ))
                )}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  )
}
