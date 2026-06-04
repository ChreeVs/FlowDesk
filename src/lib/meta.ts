import { supabase, supabaseAnonKey, supabaseUrl } from './supabase'

export type MetaSocialPage = {
  page_id: string
  page_name: string
  instagram_business_account_id: string
  instagram_username: string
  instagram_name: string
  updated_at: string
}

export type MetaSocialInstagramAccount = {
  instagram_user_id: string
  username: string
  name: string
  page_id: string
  page_name: string
  updated_at: string
}

export type MetaSocialStatus =
  | {
      connected: false
      pages: []
      instagram_accounts: []
    }
  | {
      connected: true
      meta_user_id: string
      meta_user_name: string
      token_expires_at: string | null
      connected_at: string
      updated_at: string
      pages: MetaSocialPage[]
      instagram_accounts: MetaSocialInstagramAccount[]
    }

type OAuthStartResponse = {
  url: string
}

type DisconnectResponse = {
  ok: true
}

const getSessionToken = async () => {
  if (!supabase || !supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase non configurato')
  }

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error) {
    throw error
  }

  if (!session) {
    throw new Error('Login richiesto')
  }

  return session.access_token
}

const invokeMetaFunction = async <T>(
  functionName: string,
  body: unknown,
): Promise<T> => {
  const token = await getSessionToken()
  const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey,
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  }).catch((error: unknown) => {
    if (error instanceof TypeError) {
      throw new Error(
        'Funzione Meta non raggiungibile. Verifica di aver pubblicato le Edge Function Meta Social.',
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
      errorMessage ?? `Richiesta Meta non riuscita (${response.status})`,
    )
  }

  if (!payload) {
    throw new Error('Risposta Meta vuota')
  }

  return payload as T
}

const socialReturnTo = () =>
  `${window.location.origin}${import.meta.env.BASE_URL}social`

export const metaApi = {
  startSocialOAuth() {
    return invokeMetaFunction<OAuthStartResponse>('meta-oauth-start', {
      returnTo: socialReturnTo(),
    })
  },

  getSocialStatus() {
    return invokeMetaFunction<MetaSocialStatus>('meta-social', {
      action: 'status',
    })
  },

  disconnectSocial() {
    return invokeMetaFunction<DisconnectResponse>('meta-social', {
      action: 'disconnect',
    })
  },
}
