import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type RequestBody =
  | {
      action: 'status'
    }
  | {
      action: 'disconnect'
    }

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

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

    const body = (await request.json().catch(() => null)) as RequestBody | null

    if (!body?.action) {
      return json({ error: 'Azione Meta mancante' }, 400)
    }

    const { data: connection, error: connectionError } = await adminClient
      .from('meta_connections')
      .select(
        'id,meta_user_id,meta_user_name,token_expires_at,connected_at,updated_at',
      )
      .eq('user_id', user.id)
      .eq('app_kind', 'social')
      .eq('provider', 'facebook')
      .maybeSingle()

    if (connectionError) {
      throw connectionError
    }

    if (body.action === 'disconnect') {
      if (connection?.id) {
        const { error } = await adminClient
          .from('meta_connections')
          .delete()
          .eq('id', connection.id)
          .eq('user_id', user.id)

        if (error) {
          throw error
        }
      }

      return json({ ok: true })
    }

    if (!connection) {
      return json({
        connected: false,
        pages: [],
        instagram_accounts: [],
      })
    }

    const [pagesResponse, instagramResponse] = await Promise.all([
      adminClient
        .from('meta_pages')
        .select(
          'page_id,page_name,instagram_business_account_id,instagram_username,instagram_name,updated_at',
        )
        .eq('connection_id', connection.id)
        .order('page_name'),
      adminClient
        .from('meta_instagram_accounts')
        .select('instagram_user_id,username,name,page_id,page_name,updated_at')
        .eq('connection_id', connection.id)
        .order('username'),
    ])

    if (pagesResponse.error) {
      throw pagesResponse.error
    }

    if (instagramResponse.error) {
      throw instagramResponse.error
    }

    return json({
      connected: true,
      meta_user_id: connection.meta_user_id,
      meta_user_name: connection.meta_user_name,
      token_expires_at: connection.token_expires_at,
      connected_at: connection.connected_at,
      updated_at: connection.updated_at,
      pages: pagesResponse.data ?? [],
      instagram_accounts: instagramResponse.data ?? [],
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Errore connessione Meta'
    return json({ error: message }, 500)
  }
})
