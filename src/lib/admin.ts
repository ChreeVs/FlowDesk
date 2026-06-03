import { supabase, supabaseAnonKey, supabaseUrl } from './supabase'

export type AdminPlan = 'free' | 'solo' | 'studio'
export type AdminSubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
export type AdminRole = 'user' | 'admin'

export type AdminSubscription = {
  id: string | null
  plan: AdminPlan
  status: AdminSubscriptionStatus
  current_period_end: string | null
  updated_at: string | null
}

export type AdminUserSummary = {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  email_confirmed_at: string | null
  display_name: string | null
  role: AdminRole
  project_count: number
  subscription: AdminSubscription
}

export type AdminUsersResponse = {
  users: AdminUserSummary[]
  page: number
  perPage: number
}

type AdminActionResponse = {
  ok: true
}

const invokeAdminFunction = async <T>(body: unknown): Promise<T> => {
  if (!supabase || !supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase non configurato')
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError) {
    throw sessionError
  }

  if (!session) {
    throw new Error('Login richiesto')
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/admin-users`, {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey,
      authorization: `Bearer ${session.access_token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  }).catch((error: unknown) => {
    if (error instanceof TypeError) {
      throw new Error(
        'Funzione admin non raggiungibile. Verifica di aver pubblicato la Edge Function admin-users e impostato FLOWDESK_ADMIN_EMAILS o il ruolo admin.',
      )
    }

    throw error
  })
  const payload = (await response.json().catch(() => null)) as
    | { error?: string }
    | T
    | null

  const errorMessage =
    payload &&
    typeof payload === 'object' &&
    'error' in payload &&
    typeof payload.error === 'string'
      ? payload.error
      : null

  if (!response.ok) {
    throw new Error(
      errorMessage ?? `Richiesta admin non riuscita (${response.status})`,
    )
  }

  if (!payload) {
    throw new Error('Risposta admin vuota')
  }

  return payload as T
}

export const adminApi = {
  listUsers() {
    return invokeAdminFunction<AdminUsersResponse>({
      action: 'listUsers',
      perPage: 100,
    })
  },

  updateSubscription(
    userId: string,
    patch: {
      plan: AdminPlan
      status: AdminSubscriptionStatus
      currentPeriodEnd?: string | null
    },
  ) {
    return invokeAdminFunction<AdminActionResponse>({
      action: 'updateSubscription',
      userId,
      ...patch,
    })
  },

  updateRole(userId: string, role: AdminRole) {
    return invokeAdminFunction<AdminActionResponse>({
      action: 'updateRole',
      userId,
      role,
    })
  },

  deleteUser(userId: string) {
    return invokeAdminFunction<AdminActionResponse>({
      action: 'deleteUser',
      userId,
    })
  },
}
