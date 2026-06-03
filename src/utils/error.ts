export const getErrorMessage = (error: unknown) => {
  const normalize = (message: string) => {
    if (message.includes('Failed to fetch')) {
      return 'Backend non raggiungibile. Verifica il project URL Supabase, la anon key e che le Edge Function necessarie siano pubblicate.'
    }

    if (
      message.includes('schema cache') ||
      message.includes("Could not find the 'label' column") ||
      message.includes("Could not find the 'color' column") ||
      message.includes("Could not find the 'user_id' column")
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
