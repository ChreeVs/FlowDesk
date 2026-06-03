import {
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserRoundCog,
  UsersRound,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  adminApi,
  type AdminPlan,
  type AdminRole,
  type AdminSubscriptionStatus,
  type AdminUserSummary,
} from '../lib/admin'
import { getErrorMessage } from '../utils/error'

const planLabels: Record<AdminPlan, string> = {
  free: 'Free',
  solo: 'Solo',
  studio: 'Studio',
}

const statusLabels: Record<AdminSubscriptionStatus, string> = {
  active: 'Attivo',
  trialing: 'Trial',
  past_due: 'Pagamento richiesto',
  canceled: 'Cancellato',
}

const roleLabels: Record<AdminRole, string> = {
  user: 'Utente',
  admin: 'Admin',
}

const planOptions = Object.keys(planLabels) as AdminPlan[]
const statusOptions = Object.keys(statusLabels) as AdminSubscriptionStatus[]
const roleOptions = Object.keys(roleLabels) as AdminRole[]

const formatDateTime = (value: string | null) => {
  if (!value) {
    return 'Mai'
  }

  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

const toDateInput = (value: string | null) => (value ? value.slice(0, 10) : '')

export function AdminPage() {
  const [users, setUsers] = useState<AdminUserSummary[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await adminApi.listUsers()
      setUsers(response.users)
    } catch (loadError) {
      setError(getErrorMessage(loadError))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase()

    if (!normalized) {
      return users
    }

    return users.filter((user) =>
      [user.email, user.display_name, user.role, user.subscription.plan]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalized)),
    )
  }, [query, users])

  const paidUsers = users.filter(
    (user) => user.subscription.plan !== 'free',
  ).length
  const totalProjects = users.reduce((total, user) => total + user.project_count, 0)

  const updateSubscription = async (
    user: AdminUserSummary,
    patch: Partial<{
      plan: AdminPlan
      status: AdminSubscriptionStatus
      currentPeriodEnd: string | null
    }>,
  ) => {
    setSavingId(user.id)
    setError(null)

    try {
      await adminApi.updateSubscription(user.id, {
        plan: patch.plan ?? user.subscription.plan,
        status: patch.status ?? user.subscription.status,
        currentPeriodEnd:
          patch.currentPeriodEnd === undefined
            ? user.subscription.current_period_end
            : patch.currentPeriodEnd,
      })
      await loadUsers()
    } catch (updateError) {
      setError(getErrorMessage(updateError))
    } finally {
      setSavingId(null)
    }
  }

  const updateRole = async (user: AdminUserSummary, role: AdminRole) => {
    setSavingId(user.id)
    setError(null)

    try {
      await adminApi.updateRole(user.id, role)
      await loadUsers()
    } catch (updateError) {
      setError(getErrorMessage(updateError))
    } finally {
      setSavingId(null)
    }
  }

  const deleteUser = async (user: AdminUserSummary) => {
    if (
      !window.confirm(
        `Eliminare definitivamente ${user.email}? Verranno rimossi anche i suoi progetti.`,
      )
    ) {
      return
    }

    setSavingId(user.id)
    setError(null)

    try {
      await adminApi.deleteUser(user.id)
      await loadUsers()
    } catch (deleteError) {
      setError(getErrorMessage(deleteError))
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="page admin-page">
      <div className="page-header dashboard-header">
        <div>
          <p className="eyebrow">Controllo interno</p>
          <h1>Admin</h1>
        </div>

        <button
          className="text-button"
          type="button"
          disabled={loading}
          onClick={() => void loadUsers()}
        >
          <RefreshCw size={15} />
          Aggiorna
        </button>
      </div>

      <p className="page-hint">
        Gestisci utenti, ruoli e abbonamenti dal sito. Le modifiche passano da
        una Edge Function protetta, non dal client pubblico.
      </p>

      {error ? <div className="notice error">{error}</div> : null}
      {error?.includes('Funzione admin non raggiungibile') ? (
        <div className="admin-setup-hint">
          <strong>Setup richiesto</strong>
          <span>
            Pubblica la Edge Function <code>admin-users</code> e configura
            <code> FLOWDESK_ADMIN_EMAILS</code>. La service role key resta solo nei
            secret Supabase.
          </span>
        </div>
      ) : null}

      <div className="dashboard-metrics">
        <article>
          <span><UsersRound size={17} /></span>
          <small>Utenti totali</small>
          <strong>{users.length}</strong>
        </article>
        <article>
          <span><ShieldCheck size={17} /></span>
          <small>Abbonamenti paganti</small>
          <strong>{paidUsers}</strong>
        </article>
        <article>
          <span><UserRoundCog size={17} /></span>
          <small>Progetti creati</small>
          <strong>{totalProjects}</strong>
        </article>
      </div>

      <section className="dashboard-section admin-panel">
        <div className="section-heading">
          <div>
            <UsersRound size={18} />
            <h2>Utenti registrati</h2>
          </div>
          <span className="section-meta">{filteredUsers.length}</span>
        </div>

        <div className="admin-toolbar">
          <div className="search-box">
            <Search size={16} />
            <input
              value={query}
              placeholder="Cerca email, nome, piano"
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="notice">Caricamento utenti...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="empty-state">
            <UsersRound size={28} />
            <p>Nessun utente trovato</p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Utente</th>
                  <th>Ruolo</th>
                  <th>Piano</th>
                  <th>Stato</th>
                  <th>Scadenza</th>
                  <th>Progetti</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.email}</strong>
                      <small>
                        {user.display_name ?? 'Senza nome'} - registrato{' '}
                        {formatDateTime(user.created_at)}
                      </small>
                      <small>Ultimo accesso {formatDateTime(user.last_sign_in_at)}</small>
                    </td>
                    <td>
                      <select
                        value={user.role}
                        disabled={savingId === user.id}
                        onChange={(event) =>
                          void updateRole(user, event.target.value as AdminRole)
                        }
                      >
                        {roleOptions.map((role) => (
                          <option key={role} value={role}>
                            {roleLabels[role]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        value={user.subscription.plan}
                        disabled={savingId === user.id}
                        onChange={(event) =>
                          void updateSubscription(user, {
                            plan: event.target.value as AdminPlan,
                          })
                        }
                      >
                        {planOptions.map((plan) => (
                          <option key={plan} value={plan}>
                            {planLabels[plan]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        value={user.subscription.status}
                        disabled={savingId === user.id}
                        onChange={(event) =>
                          void updateSubscription(user, {
                            status: event.target.value as AdminSubscriptionStatus,
                          })
                        }
                      >
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>
                            {statusLabels[status]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="date"
                        value={toDateInput(user.subscription.current_period_end)}
                        disabled={savingId === user.id}
                        onChange={(event) =>
                          void updateSubscription(user, {
                            currentPeriodEnd: event.target.value
                              ? `${event.target.value}T23:59:59.000Z`
                              : null,
                          })
                        }
                      />
                    </td>
                    <td>
                      <span className="admin-count">{user.project_count}</span>
                    </td>
                    <td>
                      <button
                        className="icon-button ghost"
                        type="button"
                        title="Elimina utente"
                        disabled={savingId === user.id}
                        onClick={() => void deleteUser(user)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
