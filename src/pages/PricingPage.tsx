import { ArrowRight, Check, ShieldCheck } from 'lucide-react'

type PricingPageProps = {
  isAuthenticated: boolean
  onBackHome: () => void
  onLogin: () => void
  onOpenApp: () => void
}

const plans = [
  {
    name: 'Free',
    price: '0',
    description: 'Per provare FlowDesk e gestire pochi progetti personali.',
    features: [
      '3 progetti attivi',
      'Timeline eventi',
      'Task, note e link',
      'Promemoria base',
    ],
    cta: 'Inizia gratis',
  },
  {
    name: 'Solo',
    price: '4',
    description: 'Per freelance che vogliono una memoria operativa leggera.',
    features: [
      '25 progetti attivi',
      'Task con scadenze',
      'Reminder collegati ai task',
      'Ricerca interna progetto',
    ],
    cta: 'Scegli Solo',
    featured: true,
  },
  {
    name: 'Studio',
    price: '9',
    description: 'Per piccoli team e agenzie che seguono piu clienti.',
    features: [
      '100 progetti attivi',
      'Tutte le funzioni operative',
      'Archivio link e note per progetto',
      'Priorita sulle prossime funzioni',
    ],
    cta: 'Scegli Studio',
  },
]

export function PricingPage({
  isAuthenticated,
  onBackHome,
  onLogin,
  onOpenApp,
}: PricingPageProps) {
  const handlePlanClick = () => {
    if (isAuthenticated) {
      onOpenApp()
      return
    }

    onLogin()
  }

  return (
    <div className="landing-shell pricing-shell">
      <header className="landing-header">
        <button className="sidebar-brand" type="button" onClick={onBackHome}>
          <span className="brand-mark">F</span>
          <span>FlowDesk</span>
        </button>
        <nav>
          <button type="button" onClick={onBackHome}>
            Home
          </button>
          <button className="auth-button" type="button" onClick={onLogin}>
            Login / Registrazione
          </button>
        </nav>
      </header>

      <main className="pricing-page">
        <section className="pricing-hero">
          <p className="eyebrow">Pricing</p>
          <h1>Piani semplici, pensati per partire basso.</h1>
          <p>
            FlowDesk non e un CRM enterprise: i prezzi restano leggeri per
            freelance, agenzie piccole e team che vogliono solo una memoria
            operativa veloce.
          </p>
        </section>

        <section className="pricing-grid" aria-label="Piani FlowDesk">
          {plans.map((plan) => (
            <article
              className={`pricing-card ${plan.featured ? 'featured' : ''}`}
              key={plan.name}
            >
              {plan.featured ? <span className="plan-badge">Consigliato</span> : null}
              <h2>{plan.name}</h2>
              <p>{plan.description}</p>
              <div className="plan-price">
                <span>EUR</span>
                <strong>{plan.price}</strong>
                <small>/mese</small>
              </div>
              <button type="button" onClick={handlePlanClick}>
                {plan.cta}
                <ArrowRight size={16} />
              </button>
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <Check size={15} />
                    {feature}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <section className="pricing-note">
          <ShieldCheck size={19} />
          <p>
            I limiti piano sono pensati come struttura commerciale iniziale.
            Per incassi reali conviene collegare Stripe e salvare il piano
            utente in una tabella `subscriptions`.
          </p>
        </section>
      </main>

      <footer className="landing-footer">
        <span>FlowDesk</span>
        <span>Pricing leggero per una scrivania operativa essenziale.</span>
      </footer>
    </div>
  )
}
