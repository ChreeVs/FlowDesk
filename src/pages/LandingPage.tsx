import {
  ArrowRight,
  Bell,
  CheckCircle2,
  Clock3,
  FileText,
  History,
  Link as LinkIcon,
  ListTodo,
  LockKeyhole,
} from 'lucide-react'
import type { ReactNode } from 'react'

type LandingPageProps = {
  isAuthenticated: boolean
  onLogin: () => void
  onOpenApp: () => void
  onOpenPricing: () => void
}

export function LandingPage({
  isAuthenticated,
  onLogin,
  onOpenApp,
  onOpenPricing,
}: LandingPageProps) {
  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  return (
    <div className="landing-shell">
      <header className="landing-header">
        <button className="sidebar-brand" type="button">
          <span className="brand-mark">F</span>
          <span>FlowDesk</span>
        </button>
        <nav>
          <button type="button" onClick={() => scrollToSection('funzioni')}>
            Funzioni
          </button>
          <button type="button" onClick={() => scrollToSection('uso')}>
            Uso
          </button>
          {!isAuthenticated ? (
            <button type="button" onClick={onOpenPricing}>
              Pricing
            </button>
          ) : null}
          <button className="auth-button" type="button" onClick={onLogin}>
            Login / Registrazione
          </button>
        </nav>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-copy">
            <p className="eyebrow">Scrivania operativa dei progetti</p>
            <h1>Una memoria veloce per ogni progetto.</h1>
            <p>
              FlowDesk raccoglie timeline, task, note, link e promemoria in
              una singola dashboard privata. Meno gestione, piu contesto
              operativo.
            </p>
            <div className="landing-actions">
              <button type="button" onClick={isAuthenticated ? onOpenApp : onLogin}>
                {isAuthenticated ? 'Apri dashboard' : 'Inizia'}
                <ArrowRight size={17} />
              </button>
              <button
                className="secondary"
                type="button"
                onClick={() => scrollToSection('demo')}
              >
                Vai alla Demo
              </button>
            </div>
          </div>

          <ProductPreview />
        </section>

        <section className="landing-band" id="funzioni">
          <div>
            <p className="eyebrow">Funzioni</p>
            <h2>Tutto cio che serve per non perdere il filo.</h2>
          </div>
          <div className="feature-grid">
            <Feature icon={<History size={18} />} title="Timeline">
              Registra decisioni, richieste e consegne in ordine cronologico.
            </Feature>
            <Feature icon={<ListTodo size={18} />} title="Task">
              Tieni in evidenza le prossime azioni e le scadenze.
            </Feature>
            <Feature icon={<FileText size={18} />} title="Note">
              Usa un blocco note per il contesto libero del progetto.
            </Feature>
            <Feature icon={<LinkIcon size={18} />} title="Link">
              Salva Figma, Drive, documenti cliente e asset importanti.
            </Feature>
            <Feature icon={<Bell size={18} />} title="Promemoria">
              Crea follow-up con data, ora e collegamento opzionale ai task.
            </Feature>
            <Feature icon={<LockKeyhole size={18} />} title="Privata">
            Ogni account vede solo i propri progetti tramite policy Supabase.
            </Feature>
          </div>
        </section>

        <section className="landing-band demo-band" id="demo">
          <div>
            <p className="eyebrow">Demo guidata</p>
            <h2>Segui il flusso operativo di FlowDesk.</h2>
          </div>
          <div className="demo-steps">
            <DemoStep
              step="01"
              title="Crea il progetto"
              text="Apri la dashboard, inserisci il nome del progetto e accedi alla sua scrivania operativa."
            />
            <DemoStep
              step="02"
              title="Registra gli eventi"
              text="Usa la timeline per annotare approvazioni, richieste, consegne e decisioni importanti."
            />
            <DemoStep
              step="03"
              title="Trasforma il contesto in azioni"
              text="Aggiungi task con scadenza, collega promemoria e tieni separati gli elementi completati."
            />
            <DemoStep
              step="04"
              title="Raccogli materiali e note"
              text="Salva link, file esterni e note libere per avere tutto il contesto del progetto in un unico posto."
            />
            <button className="demo-cta" type="button" onClick={onOpenApp}>
              Apri la dashboard privata
              <ArrowRight size={17} />
            </button>
          </div>
        </section>

        <section className="landing-band compact" id="uso">
          <div>
            <p className="eyebrow">Per chi</p>
            <h2>Freelance, agenzie e piccoli team.</h2>
          </div>
          <p>
            FlowDesk e pensata per chi deve ricordare cosa e successo,
            cosa resta da fare e dove sono i riferimenti di un progetto, senza
            introdurre un CRM o un sistema enterprise.
          </p>
        </section>
      </main>

      <footer className="landing-footer">
        <span>FlowDesk</span>
        <span>Memoria operativa privata per progetti.</span>
      </footer>
    </div>
  )
}

type DemoStepProps = {
  step: string
  title: string
  text: string
}

function DemoStep({ step, title, text }: DemoStepProps) {
  return (
    <article className="demo-step">
      <span>{step}</span>
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    </article>
  )
}

type FeatureProps = {
  icon: ReactNode
  title: string
  children: string
}

function Feature({ icon, title, children }: FeatureProps) {
  return (
    <article className="feature-item">
      <span>{icon}</span>
      <div>
        <h3>{title}</h3>
        <p>{children}</p>
      </div>
    </article>
  )
}

function ProductPreview() {
  return (
    <div className="product-preview" aria-hidden="true">
      <div className="preview-sidebar">
        <div className="preview-logo" />
        <span />
        <span className="active" />
        <span />
        <span />
      </div>
      <div className="preview-main">
        <div className="preview-top">
          <div>
            <small>Dashboard</small>
            <strong>Progetti</strong>
          </div>
          <div className="preview-search" />
        </div>
        <div className="preview-cards">
          <span />
          <span />
          <span />
        </div>
        <div className="preview-content">
          <div className="preview-timeline">
            <strong>Event Timeline</strong>
            <p><CheckCircle2 size={14} /> Cliente ha approvato logo</p>
            <p><Clock3 size={14} /> Richiesta modifica homepage</p>
            <p><CheckCircle2 size={14} /> Consegnato primo mockup</p>
          </div>
          <div className="preview-panel">
            <strong>Tasks</strong>
            <span />
            <span />
            <span className="short" />
          </div>
        </div>
      </div>
    </div>
  )
}
