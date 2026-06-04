import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const defaultScopes = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
  'instagram_basic',
  'instagram_content_publish',
]

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

const randomState = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(24))

  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

const safeReturnTo = (value: unknown) => {
  const fallback =
    Deno.env.get('FLOWDESK_APP_URL') ?? 'https://chreevs.github.io/FlowDesk/social'

  if (typeof value !== 'string' || !value.trim()) {
    return fallback
  }

  try {
    const url = new URL(value)
    const allowedHosts = new Set(['chreevs.github.io', 'localhost', '127.0.0.1'])

    if (allowedHosts.has(url.hostname)) {
      return url.toString()
    }
  } catch {
    return fallback
  }

  return fallback
}

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
    const appId = requireEnv('META_SOCIAL_APP_ID')
    const redirectUri = requireEnv('META_SOCIAL_REDIRECT_URI')
    const graphVersion = Deno.env.get('META_GRAPH_VERSION') ?? 'v25.0'
    const scopes = (Deno.env.get('META_SOCIAL_SCOPES') ?? defaultScopes.join(','))
      .split(',')
      .map((scope) => scope.trim())
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
      data: { user },
      error: userError,
    } = await adminClient.auth.getUser(token)

    if (userError || !user) {
      return json({ error: 'Sessione non valida' }, 401)
    }

    const body = (await request.json().catch(() => ({}))) as {
      returnTo?: string
    }
    const state = randomState()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()
    const { error: stateError } = await adminClient.from('meta_oauth_states').insert({
      state,
      user_id: user.id,
      app_kind: 'social',
      return_to: safeReturnTo(body.returnTo),
      expires_at: expiresAt,
    })

    if (stateError) {
      throw stateError
    }

    const url = new URL(`https://www.facebook.com/${graphVersion}/dialog/oauth`)
    url.searchParams.set('client_id', appId)
    url.searchParams.set('redirect_uri', redirectUri)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('state', state)
    url.searchParams.set('scope', scopes.join(','))

    return json({ url: url.toString() })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Errore avvio connessione Meta'
    return json({ error: message }, 500)
  }
})
