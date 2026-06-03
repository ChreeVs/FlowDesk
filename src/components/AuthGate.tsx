import { LockKeyhole } from 'lucide-react'
import type { ReactNode } from 'react'

type AuthGateProps = {
  loading: boolean
  locked: boolean
  onLogin: () => void
  children: ReactNode
}

export function AuthGate({ loading, locked, onLogin, children }: AuthGateProps) {
  if (loading) {
    return (
      <div className="page">
        <div className="notice">Controllo sessione...</div>
      </div>
    )
  }

  if (locked) {
    return (
      <div className="page private-page">
        <section className="private-panel">
          <span>
            <LockKeyhole size={24} />
          </span>
          <div>
            <p className="eyebrow">Accesso richiesto</p>
            <h1>FlowDesk e privata</h1>
            <p>
              Accedi o registra un account per vedere progetti, timeline, task,
              note, link e promemoria.
            </p>
          </div>
          <button className="auth-button large" type="button" onClick={onLogin}>
            Login / Registrazione
          </button>
        </section>
      </div>
    )
  }

  return children
}
