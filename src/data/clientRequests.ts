import type { ClientRequestType } from '../types'

export const clientRequestTypes: Array<{
  value: ClientRequestType
  label: string
}> = [
  { value: 'modifica', label: 'Modifica' },
  { value: 'nuovo_lavoro', label: 'Nuovo lavoro' },
  { value: 'bug', label: 'Bug / problema tecnico' },
  { value: 'contenuto', label: 'Contenuto' },
  { value: 'grafica', label: 'Grafica / asset' },
  { value: 'altro', label: 'Altro' },
]

export const clientRequestTypeLabels = Object.fromEntries(
  clientRequestTypes.map((type) => [type.value, type.label]),
) as Record<ClientRequestType, string>
