import { AlertCircle, CheckCircle2, Paperclip, Send } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { clientRequestTypes } from '../data/clientRequests'
import { repository } from '../lib/repository'
import type { ClientRequestType, PublicRequestForm } from '../types'
import { getErrorMessage } from '../utils/error'

type ClientRequestPageProps = {
  token: string
  onBackHome: () => void
}

export function ClientRequestPage({
  token,
  onBackHome,
}: ClientRequestPageProps) {
  const [formInfo, setFormInfo] = useState<PublicRequestForm | null>(null)
  const [title, setTitle] = useState('')
  const [requestType, setRequestType] = useState<ClientRequestType>('modifica')
  const [urgency, setUrgency] = useState(2)
  const [description, setDescription] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadForm = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      setFormInfo(await repository.getPublicRequestForm(token))
    } catch (loadError) {
      setError(getErrorMessage(loadError))
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void loadForm()
  }, [loadForm])

  const submitRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!title.trim()) {
      return
    }

    setSaving(true)
    setError(null)

    try {
      const request = await repository.submitPublicClientRequest(token, {
        title,
        request_type: requestType,
        urgency,
        description,
      })

      for (const file of files) {
        await repository.uploadClientRequestFile(token, request.id, file)
      }

      setSent(true)
      setTitle('')
      setDescription('')
      setFiles([])
    } catch (submitError) {
      setError(getErrorMessage(submitError))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="public-request-shell">
      <header className="public-request-header">
        <button className="sidebar-brand" type="button" onClick={onBackHome}>
          <span className="brand-mark">F</span>
          <span>FlowDesk</span>
        </button>
      </header>

      <main className="public-request-page">
        <section className="public-request-card">
          {loading ? (
            <div className="notice">Caricamento modulo...</div>
          ) : error && !formInfo ? (
            <>
              <AlertCircle size={28} />
              <h1>Link non disponibile</h1>
              <p>{error}</p>
            </>
          ) : sent ? (
            <>
              <CheckCircle2 size={32} />
              <h1>Richiesta inviata</h1>
              <p>
                La tua richiesta e stata registrata. Il team ricevera una
                notifica interna in FlowDesk.
              </p>
              <button type="button" onClick={() => setSent(false)}>
                Invia un'altra richiesta
              </button>
            </>
          ) : (
            <>
              <p className="eyebrow">Richiesta cliente</p>
              <h1>{formInfo?.project_name ?? 'Progetto'}</h1>
              <p>
                Compila il modulo con le informazioni essenziali. Puoi allegare
                file fino a 10 MB ciascuno.
              </p>

              {error ? <div className="notice error">{error}</div> : null}

              <form className="public-request-form" onSubmit={submitRequest}>
                <label>
                  Nome richiesta
                  <input
                    value={title}
                    placeholder="Es. Modifica hero homepage"
                    onChange={(event) => setTitle(event.target.value)}
                  />
                </label>

                <label>
                  Tipo richiesta
                  <select
                    value={requestType}
                    onChange={(event) =>
                      setRequestType(event.target.value as ClientRequestType)
                    }
                  >
                    {clientRequestTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Urgenza: {urgency}/5
                  <input
                    max={5}
                    min={0}
                    type="range"
                    value={urgency}
                    onChange={(event) => setUrgency(Number(event.target.value))}
                  />
                </label>

                <label>
                  Dettagli
                  <textarea
                    value={description}
                    placeholder="Descrivi cosa serve, dove intervenire e ogni riferimento utile."
                    onChange={(event) => setDescription(event.target.value)}
                  />
                </label>

                <label className="request-file-control">
                  <span>
                    <Paperclip size={16} />
                    Allegati
                  </span>
                  <small>
                    PNG, JPG, WebP, PDF, ZIP, TXT, DOC/DOCX o XLS/XLSX. Max 10
                    MB per file.
                  </small>
                  <input
                    multiple
                    type="file"
                    onChange={(event) =>
                      setFiles(Array.from(event.currentTarget.files ?? []))
                    }
                  />
                </label>

                {files.length > 0 ? (
                  <div className="request-file-list">
                    {files.map((file) => (
                      <span key={`${file.name}-${file.size}`}>{file.name}</span>
                    ))}
                  </div>
                ) : null}

                <button type="submit" disabled={saving || !title.trim()}>
                  <Send size={16} />
                  {saving ? 'Invio...' : 'Invia richiesta'}
                </button>
              </form>
            </>
          )}
        </section>
      </main>
    </div>
  )
}
