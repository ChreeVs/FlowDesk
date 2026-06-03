import { LogIn, UserPlus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { getErrorMessage } from '../utils/error'

type AuthMode = 'login' | 'register'

type AuthModalProps = {
  onClose: () => void
  onAuthenticated?: () => void
}

export function AuthModal({ onClose, onAuthenticated }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [currentEmail, setCurrentEmail] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!supabase) {
      return
    }

    void supabase.auth.getSession().then(({ data }) => {
      setCurrentEmail(data.session?.user.email ?? null)
    })
  }, [])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!supabase || !email.trim() || !password) {
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const authResult =
        mode === 'login'
          ? await supabase.auth.signInWithPassword({
              email: email.trim(),
              password,
            })
          : await supabase.auth.signUp({
              email: email.trim(),
              password,
            })

      if (authResult.error) {
        throw authResult.error
      }

      setCurrentEmail(authResult.data.user?.email ?? email.trim())
      setMessage(
        mode === 'login'
          ? 'Accesso effettuato.'
          : 'Registrazione inviata. Controlla la tua email se Supabase richiede conferma.',
      )

      if (authResult.data.session) {
        onAuthenticated?.()
      }
    } catch (authError) {
      setMessage(getErrorMessage(authError))
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    if (!supabase) {
      return
    }

    setLoading(true)
    await supabase.auth.signOut()
    setCurrentEmail(null)
    setLoading(false)
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">Account</p>
            <h2 id="auth-title">Login e registrazione</h2>
          </div>
          <button
            className="icon-button ghost"
            type="button"
            title="Chiudi"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        {!isSupabaseConfigured ? (
          <div className="notice compact">
            Modalita demo locale attiva. Configura Supabase per usare login e registrazione.
          </div>
        ) : currentEmail ? (
          <div className="auth-session">
            <p>{currentEmail}</p>
            <button className="text-button" type="button" onClick={() => void logout()}>
              Esci
            </button>
          </div>
        ) : (
          <>
            <div className="segmented full">
              <button
                className={mode === 'login' ? 'active' : ''}
                type="button"
                onClick={() => setMode('login')}
              >
                Login
              </button>
              <button
                className={mode === 'register' ? 'active' : ''}
                type="button"
                onClick={() => setMode('register')}
              >
                Registrazione
              </button>
            </div>

            <form className="auth-form" onSubmit={submit}>
              <label>
                Email
                <input
                  type="email"
                  value={email}
                  autoComplete="email"
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={password}
                  autoComplete={
                    mode === 'login' ? 'current-password' : 'new-password'
                  }
                  minLength={6}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
              <button
                type="submit"
                disabled={loading || !email.trim() || password.length < 6}
              >
                {mode === 'login' ? <LogIn size={17} /> : <UserPlus size={17} />}
                {mode === 'login' ? 'Entra' : 'Crea account'}
              </button>
            </form>
          </>
        )}

        {message ? <div className="auth-message">{message}</div> : null}
      </section>
    </div>
  )
}
