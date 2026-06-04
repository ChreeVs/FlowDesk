import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type MetaUser = {
  id: string
  name?: string
}

type MetaPage = {
  id: string
  name?: string
  access_token?: string
  instagram_business_account?: {
    id: string
    username?: string
    name?: string
  }
}

const defaultScopes = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
  'instagram_basic',
  'instagram_content_publish',
]

const requireEnv = (name: string) => {
  const value = Deno.env.get(name)

  if (!value) {
    throw new Error(`Variabile server mancante: ${name}`)
  }

  return value
}

const redirectWithStatus = (
  returnTo: string | null | undefined,
  status: 'connected' | 'error',
  message?: string,
) => {
  const fallback =
    Deno.env.get('FLOWDESK_APP_URL') ?? 'https://chreevs.github.io/FlowDesk/social'
  const url = new URL(returnTo || fallback)

  url.searchParams.set('meta', status)

  if (message) {
    url.searchParams.set('message', message)
  }

  return Response.redirect(url.toString(), 302)
}

const metaRequest = async <T>(url: URL) => {
  const response = await fetch(url)
  const payload = (await response.json().catch(() => null)) as
    | T
    | { error?: { message?: string } }
    | null
  const errorMessage =
    payload &&
    typeof payload === 'object' &&
    'error' in payload &&
    payload.error?.message

  if (!response.ok || errorMessage) {
    throw new Error(errorMessage || `Meta API non riuscita (${response.status})`)
  }

  return payload as T
}

const addAccessToken = (url: URL, accessToken: string) => {
  url.searchParams.set('access_token', accessToken)

  return url
}

Deno.serve(async (request) => {
  if (request.method !== 'GET') {
    return new Response('Metodo non supportato', { status: 405 })
  }

  const requestUrl = new URL(request.url)
  const state = requestUrl.searchParams.get('state')
  const code = requestUrl.searchParams.get('code')
  const metaError =
    requestUrl.searchParams.get('error_message') ||
    requestUrl.searchParams.get('error_description')

  let returnTo: string | null = null

  try {
    const supabaseUrl = requireEnv('SUPABASE_URL')
    const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
    const appId = requireEnv('META_SOCIAL_APP_ID')
    const appSecret = requireEnv('META_SOCIAL_APP_SECRET')
    const redirectUri = requireEnv('META_SOCIAL_REDIRECT_URI')
    const graphVersion = Deno.env.get('META_GRAPH_VERSION') ?? 'v25.0'

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    if (!state) {
      throw new Error('State OAuth mancante')
    }

    const { data: stateRow, error: stateError } = await adminClient
      .from('meta_oauth_states')
      .select('*')
      .eq('state', state)
      .eq('app_kind', 'social')
      .maybeSingle()

    if (stateError) {
      throw stateError
    }

    if (!stateRow) {
      throw new Error('State OAuth non valido')
    }

    returnTo = stateRow.return_to || null

    if (stateRow.used_at) {
      throw new Error('State OAuth gia usato')
    }

    if (new Date(stateRow.expires_at).getTime() < Date.now()) {
      throw new Error('State OAuth scaduto')
    }

    if (metaError) {
      throw new Error(metaError)
    }

    if (!code) {
      throw new Error('Codice OAuth mancante')
    }

    const shortTokenUrl = new URL(
      `https://graph.facebook.com/${graphVersion}/oauth/access_token`,
    )
    shortTokenUrl.searchParams.set('client_id', appId)
    shortTokenUrl.searchParams.set('client_secret', appSecret)
    shortTokenUrl.searchParams.set('redirect_uri', redirectUri)
    shortTokenUrl.searchParams.set('code', code)

    const shortToken = await metaRequest<{
      access_token: string
      expires_in?: number
    }>(shortTokenUrl)

    const longTokenUrl = new URL(
      `https://graph.facebook.com/${graphVersion}/oauth/access_token`,
    )
    longTokenUrl.searchParams.set('grant_type', 'fb_exchange_token')
    longTokenUrl.searchParams.set('client_id', appId)
    longTokenUrl.searchParams.set('client_secret', appSecret)
    longTokenUrl.searchParams.set('fb_exchange_token', shortToken.access_token)

    const longToken = await metaRequest<{
      access_token: string
      expires_in?: number
    }>(longTokenUrl)
    const accessToken = longToken.access_token
    const tokenExpiresAt = longToken.expires_in
      ? new Date(Date.now() + longToken.expires_in * 1000).toISOString()
      : null

    const meUrl = addAccessToken(
      new URL(`https://graph.facebook.com/${graphVersion}/me`),
      accessToken,
    )
    meUrl.searchParams.set('fields', 'id,name')
    const me = await metaRequest<MetaUser>(meUrl)

    const scopes = (Deno.env.get('META_SOCIAL_SCOPES') ?? defaultScopes.join(','))
      .split(',')
      .map((scope) => scope.trim())
      .filter(Boolean)
    const { data: connection, error: connectionError } = await adminClient
      .from('meta_connections')
      .upsert(
        {
          user_id: stateRow.user_id,
          app_kind: 'social',
          provider: 'facebook',
          meta_user_id: me.id,
          meta_user_name: me.name ?? '',
          access_token: accessToken,
          token_expires_at: tokenExpiresAt,
          scopes,
        },
        { onConflict: 'user_id,app_kind,provider' },
      )
      .select('id')
      .single()

    if (connectionError) {
      throw connectionError
    }

    const pagesUrl = addAccessToken(
      new URL(`https://graph.facebook.com/${graphVersion}/me/accounts`),
      accessToken,
    )
    pagesUrl.searchParams.set(
      'fields',
      'id,name,access_token,instagram_business_account{id,username,name}',
    )
    pagesUrl.searchParams.set('limit', '100')

    const pagesPayload = await metaRequest<{ data?: MetaPage[] }>(pagesUrl)
    const pages = pagesPayload.data ?? []
    const instagramAccounts = pages
      .map((page) => ({
        page,
        instagram: page.instagram_business_account,
      }))
      .filter((item) => item.instagram?.id)

    await adminClient
      .from('meta_pages')
      .delete()
      .eq('connection_id', connection.id)
    await adminClient
      .from('meta_instagram_accounts')
      .delete()
      .eq('connection_id', connection.id)

    if (pages.length > 0) {
      const { error: pagesError } = await adminClient.from('meta_pages').insert(
        pages.map((page) => ({
          connection_id: connection.id,
          user_id: stateRow.user_id,
          page_id: page.id,
          page_name: page.name ?? '',
          page_access_token: page.access_token ?? '',
          instagram_business_account_id:
            page.instagram_business_account?.id ?? '',
          instagram_username: page.instagram_business_account?.username ?? '',
          instagram_name: page.instagram_business_account?.name ?? '',
        })),
      )

      if (pagesError) {
        throw pagesError
      }
    }

    if (instagramAccounts.length > 0) {
      const { error: instagramError } = await adminClient
        .from('meta_instagram_accounts')
        .insert(
          instagramAccounts.map(({ page, instagram }) => ({
            connection_id: connection.id,
            user_id: stateRow.user_id,
            instagram_user_id: instagram?.id ?? '',
            username: instagram?.username ?? '',
            name: instagram?.name ?? '',
            page_id: page.id,
            page_name: page.name ?? '',
          })),
        )

      if (instagramError) {
        throw instagramError
      }
    }

    await adminClient
      .from('meta_oauth_states')
      .update({ used_at: new Date().toISOString() })
      .eq('state', state)

    return redirectWithStatus(returnTo, 'connected')
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Connessione Meta non riuscita'

    return redirectWithStatus(returnTo, 'error', message)
  }
})
