import {
  Bell,
  BriefcaseBusiness,
  CalendarCheck,
  FileStack,
  History,
  Link as LinkIcon,
  ListChecks,
  PencilLine,
  Users,
} from 'lucide-react'
import type { ReactNode } from 'react'

export function HowItWorksPage() {
  return (
    <div className="page info-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Metodo</p>
          <h1>Come funziona</h1>
        </div>
      </div>

      <div className="info-grid">
        <InfoItem
          icon={<FileStack size={19} />}
          title="Un progetto, una memoria"
          text="Ogni progetto raccoglie cronologia, task, note, link e promemoria nella stessa pagina."
        />
        <InfoItem
          icon={<History size={19} />}
          title="Timeline prima di tutto"
          text="Le decisioni e gli aggiornamenti restano ordinati dal piu recente al meno recente."
        />
        <InfoItem
          icon={<PencilLine size={19} />}
          title="Scrittura rapida"
          text="Gli input principali sono sempre visibili per registrare cio che succede senza navigazione pesante."
        />
        <InfoItem
          icon={<ListChecks size={19} />}
          title="Operativita leggera"
          text="Task, scadenze, reminder e link servono a non perdere contesto, non a creare gestione complessa."
        />
      </div>
    </div>
  )
}

export function UseCasesPage() {
  return (
    <div className="page info-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Scenari</p>
          <h1>Casi d'Utilizzo</h1>
        </div>
      </div>

      <div className="info-grid">
        <InfoItem
          icon={<BriefcaseBusiness size={19} />}
          title="Freelance"
          text="Tieni traccia di approvazioni, richieste cliente, consegne e prossime azioni."
        />
        <InfoItem
          icon={<Users size={19} />}
          title="Piccole agenzie"
          text="Conserva un diario operativo per ogni cliente senza introdurre un CRM completo."
        />
        <InfoItem
          icon={<CalendarCheck size={19} />}
          title="Produzione contenuti"
          text="Segna revisioni, asset, link ai file e promemoria per pubblicazioni o follow-up."
        />
        <InfoItem
          icon={<Bell size={19} />}
          title="Follow-up commerciali"
          text="Registra cosa e stato concordato e associa promemoria ai task aperti."
        />
        <InfoItem
          icon={<LinkIcon size={19} />}
          title="Asset e documenti"
          text="Raccogli Figma, Drive, brief, preventivi e documenti cliente nel contesto del progetto."
        />
      </div>
    </div>
  )
}

type InfoItemProps = {
  icon: ReactNode
  title: string
  text: string
}

function InfoItem({ icon, title, text }: InfoItemProps) {
  return (
    <article className="info-item">
      <span>{icon}</span>
      <div>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
    </article>
  )
}
