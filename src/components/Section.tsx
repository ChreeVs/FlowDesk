import type { ReactNode } from 'react'

type SectionProps = {
  title: string
  icon: ReactNode
  meta?: ReactNode
  hint?: ReactNode
  children: ReactNode
}

export function Section({ title, icon, meta, hint, children }: SectionProps) {
  return (
    <section className="desk-section">
      <div className="section-heading">
        <div>
          {icon}
          <h2>{title}</h2>
        </div>
        {meta ? <span className="section-meta">{meta}</span> : null}
      </div>
      {hint ? <p className="section-hint">{hint}</p> : null}
      {children}
    </section>
  )
}
