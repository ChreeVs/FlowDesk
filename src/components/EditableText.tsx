import { Check, Pencil, X } from 'lucide-react'
import { useState } from 'react'

type EditableTextProps = {
  value: string
  placeholder?: string
  multiline?: boolean
  className?: string
  onSave: (value: string) => Promise<void> | void
}

export function EditableText({
  value,
  placeholder = '',
  multiline = false,
  className = '',
  onSave,
}: EditableTextProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    const next = draft.trim()

    if (!next || next === value) {
      setEditing(false)
      setDraft(value)
      return
    }

    setSaving(true)

    try {
      await onSave(next)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    const field = multiline ? (
      <textarea
        className="inline-input"
        value={draft}
        autoFocus
        rows={3}
        onChange={(event) => setDraft(event.target.value)}
      />
    ) : (
      <input
        className="inline-input"
        value={draft}
        autoFocus
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            void save()
          }
        }}
      />
    )

    return (
      <div className={`editable editing ${className}`}>
        {field}
        <button
          className="icon-button"
          type="button"
          title="Salva"
          disabled={saving}
          onClick={() => void save()}
        >
          <Check size={16} />
        </button>
        <button
          className="icon-button ghost"
          type="button"
          title="Annulla"
          onClick={() => {
            setDraft(value)
            setEditing(false)
          }}
        >
          <X size={16} />
        </button>
      </div>
    )
  }

  return (
    <div className={`editable ${className}`}>
      <span>{value || placeholder}</span>
      <button
        className="icon-button ghost"
        type="button"
        title="Modifica"
        onClick={() => {
          setDraft(value)
          setEditing(true)
        }}
      >
        <Pencil size={15} />
      </button>
    </div>
  )
}
