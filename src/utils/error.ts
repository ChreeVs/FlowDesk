export const getErrorMessage = (error: unknown) => {
  const normalize = (message: string) => {
    if (message.includes('Failed to fetch')) {
      return 'Backend non raggiungibile. Verifica il project URL Supabase, la anon key e che le Edge Function necessarie siano pubblicate.'
    }

    if (
      message.toLowerCase().includes('bucket not found') ||
      message.toLowerCase().includes('bucket not_found')
    ) {
      return 'Bucket Storage non trovato. Esegui di nuovo supabase/schema.sql nel SQL Editor o crea i bucket project-assets e request-files da Supabase Storage.'
    }

    if (
      message.includes('schema cache') ||
      message.includes("Could not find the 'title' column") ||
      message.includes("Could not find the 'label' column") ||
      message.includes("Could not find the 'color' column") ||
      message.includes("Could not find the 'user_id' column") ||
      message.includes('client_requests_status_check') ||
      message.includes('relation "public.client_requests" does not exist') ||
      message.includes('relation "public.client_request_updates" does not exist') ||
      message.includes('relation "public.sponsor_ad_batches" does not exist') ||
      message.includes('relation "public.sponsor_ad_posts" does not exist') ||
      message.includes('relation "public.request_links" does not exist') ||
      message.includes('relation "public.notifications" does not exist')
    ) {
      return 'Schema Supabase non aggiornato. Esegui di nuovo supabase/schema.sql nel SQL Editor e poi riprova.'
    }

    return message
  }

  if (error instanceof Error) {
    return normalize(error.message)
  }

  if (typeof error === 'object' && error && 'message' in error) {
    return normalize(String(error.message))
  }

  return 'Errore inatteso'
}
