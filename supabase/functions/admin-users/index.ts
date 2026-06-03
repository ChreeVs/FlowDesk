import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type Plan = 'free' | 'solo' | 'studio'
type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled'
type Role = 'user' | 'admin'

type RequestBody =
  | {
      action: 'listUsers'
      page?: number
      perPage?: number
    }
  | {
      action: 'updateSubscription'
      userId: string
      plan: Plan
      status: SubscriptionStatus
      currentPeriodEnd?: string | null
    }
  | {
      action: 'updateRole'
      userId: string
      role: Role
    }
  | {
      action: 'deleteUser'
      userId: string
    }

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const plans = new Set<Plan>(['free', 'solo', 'studio'])
const statuses = new Set<SubscriptionStatus>([
  'active',
  'trialing',
  'past_due',
  'canceled',
])
const roles = new Set<Role>(['user', 'admin'])

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'content-type': 'application/json',
    },
  })

const requireEnv = (name: string) => {
  const value = Deno.env.get(name)

  if (!value) {
    throw new Error(`Variabile server mancante: ${name}`)
  }

  return value
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return json({ error: 'Metodo non supportato' }, 405)
  }

  try {
    const supabaseUrl = requireEnv('SUPABASE_URL')
    const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
    const adminEmails = (Deno.env.get('FLOWDESK_ADMIN_EMAILS') ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)

    const authorization = request.headers.get('authorization')
    const token = authorization?.replace(/^Bearer\s+/i, '').trim()

    if (!token) {
      return json({ error: 'Login richiesto' }, 401)
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
    const {
      data: { user: caller },
      error: callerError,
    } = await adminClient.auth.getUser(token)

    if (callerError || !caller) {
      return json({ error: 'Sessione non valida' }, 401)
    }

    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .maybeSingle()

    const callerIsAdmin =
      callerProfile?.role === 'admin' ||
      (caller.email
        ? adminEmails.includes(caller.email.toLowerCase())
        : false)

    if (!callerIsAdmin) {
      return json({ error: 'Accesso admin negato' }, 403)
    }

    const body = (await request.json().catch(() => null)) as RequestBody | null

    if (!body?.action) {
      return json({ error: 'Azione admin mancante' }, 400)
    }

    if (body.action === 'listUsers') {
      const page = clamp(Number(body.page ?? 1), 1, 500)
      const perPage = clamp(Number(body.perPage ?? 100), 1, 200)
      const { data, error } = await adminClient.auth.admin.listUsers({
        page,
        perPage,
      })

      if (error) {
        throw error
      }

      const users = data.users
      const userIds = users.map((user) => user.id)
      const [profilesResponse, subscriptionsResponse, projectsResponse] =
        userIds.length > 0
          ? await Promise.all([
              adminClient
                .from('profiles')
                .select('id,display_name,role')
                .in('id', userIds),
              adminClient
                .from('subscriptions')
                .select('id,user_id,plan,status,current_period_end,updated_at')
                .in('user_id', userIds),
              adminClient.from('projects').select('user_id').in('user_id', userIds),
            ])
          : [
              { data: [], error: null },
              { data: [], error: null },
              { data: [], error: null },
            ]

      if (profilesResponse.error) {
        throw profilesResponse.error
      }

      if (subscriptionsResponse.error) {
        throw subscriptionsResponse.error
      }

      if (projectsResponse.error) {
        throw projectsResponse.error
      }

      const profilesById = new Map(
        (profilesResponse.data ?? []).map((profile) => [profile.id, profile]),
      )
      const subscriptionsByUserId = new Map(
        (subscriptionsResponse.data ?? []).map((subscription) => [
          subscription.user_id,
          subscription,
        ]),
      )
      const projectCounts = new Map<string, number>()

      for (const project of projectsResponse.data ?? []) {
        const userId = project.user_id
        projectCounts.set(userId, (projectCounts.get(userId) ?? 0) + 1)
      }

      return json({
        users: users.map((user) => {
          const profile = profilesById.get(user.id)
          const subscription = subscriptionsByUserId.get(user.id)

          return {
            id: user.id,
            email: user.email ?? 'senza-email',
            created_at: user.created_at,
            last_sign_in_at: user.last_sign_in_at ?? null,
            email_confirmed_at: user.email_confirmed_at ?? null,
            display_name: profile?.display_name ?? null,
            role: (profile?.role ?? 'user') as Role,
            project_count: projectCounts.get(user.id) ?? 0,
            subscription: {
              id: subscription?.id ?? null,
              plan: (subscription?.plan ?? 'free') as Plan,
              status: (subscription?.status ?? 'active') as SubscriptionStatus,
              current_period_end: subscription?.current_period_end ?? null,
              updated_at: subscription?.updated_at ?? null,
            },
          }
        }),
        page,
        perPage,
      })
    }

    if (body.action === 'updateSubscription') {
      if (!plans.has(body.plan) || !statuses.has(body.status)) {
        return json({ error: 'Piano o stato non valido' }, 400)
      }

      if (
        body.currentPeriodEnd &&
        Number.isNaN(new Date(body.currentPeriodEnd).getTime())
      ) {
        return json({ error: 'Data scadenza non valida' }, 400)
      }

      const { error } = await adminClient.from('subscriptions').upsert(
        {
          user_id: body.userId,
          plan: body.plan,
          status: body.status,
          current_period_end: body.currentPeriodEnd ?? null,
        },
        { onConflict: 'user_id' },
      )

      if (error) {
        throw error
      }

      return json({ ok: true })
    }

    if (body.action === 'updateRole') {
      if (!roles.has(body.role)) {
        return json({ error: 'Ruolo non valido' }, 400)
      }

      if (body.userId === caller.id && body.role !== 'admin') {
        return json({ error: 'Non puoi rimuovere il tuo ruolo admin' }, 400)
      }

      const { error } = await adminClient.from('profiles').upsert(
        {
          id: body.userId,
          role: body.role,
        },
        { onConflict: 'id' },
      )

      if (error) {
        throw error
      }

      return json({ ok: true })
    }

    if (body.action === 'deleteUser') {
      if (body.userId === caller.id) {
        return json({ error: 'Non puoi eliminare il tuo account admin' }, 400)
      }

      const { error } = await adminClient.auth.admin.deleteUser(body.userId)

      if (error) {
        throw error
      }

      return json({ ok: true })
    }

    return json({ error: 'Azione admin non supportata' }, 400)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Errore server admin'
    return json({ error: message }, 500)
  }
})
