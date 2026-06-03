type EditorialEvent = {
  month: number
  day: number
  label: string
}

const fixedEvents: EditorialEvent[] = [
  { month: 1, day: 1, label: "Capodanno" },
  { month: 1, day: 4, label: "Giornata mondiale del braille" },
  { month: 1, day: 6, label: "Epifania" },
  { month: 1, day: 7, label: "Festa del Tricolore" },
  { month: 1, day: 11, label: "Giornata mondiale del grazie" },
  { month: 1, day: 17, label: "Giornata mondiale della pizza" },
  { month: 1, day: 24, label: "Giornata internazionale dell'educazione" },
  { month: 1, day: 27, label: "Giorno della memoria" },
  { month: 2, day: 2, label: "Giornata mondiale delle zone umide" },
  { month: 2, day: 4, label: "Giornata mondiale contro il cancro" },
  { month: 2, day: 7, label: "Giornata contro bullismo e cyberbullismo" },
  { month: 2, day: 11, label: "Giornata donne e ragazze nella scienza" },
  { month: 2, day: 14, label: "San Valentino" },
  { month: 2, day: 17, label: "Giornata nazionale del gatto" },
  { month: 2, day: 20, label: "Giornata mondiale della giustizia sociale" },
  { month: 3, day: 3, label: "Giornata mondiale della natura" },
  { month: 3, day: 8, label: "Giornata internazionale della donna" },
  { month: 3, day: 15, label: "Giornata mondiale dei consumatori" },
  { month: 3, day: 19, label: "Festa del papa" },
  { month: 3, day: 20, label: "Giornata internazionale della felicita" },
  { month: 3, day: 21, label: "Primo giorno di primavera" },
  { month: 3, day: 21, label: "Giornata mondiale della poesia" },
  { month: 3, day: 22, label: "Giornata mondiale dell'acqua" },
  { month: 3, day: 27, label: "Giornata mondiale del teatro" },
  { month: 4, day: 2, label: "Giornata mondiale autismo" },
  { month: 4, day: 7, label: "Giornata mondiale della salute" },
  { month: 4, day: 11, label: "Giornata nazionale del mare" },
  { month: 4, day: 22, label: "Giornata della Terra" },
  { month: 4, day: 23, label: "Giornata mondiale del libro" },
  { month: 4, day: 25, label: "Festa della Liberazione" },
  { month: 4, day: 29, label: "Giornata internazionale della danza" },
  { month: 5, day: 1, label: "Festa dei lavoratori" },
  { month: 5, day: 3, label: "Giornata mondiale della liberta di stampa" },
  { month: 5, day: 4, label: "Star Wars Day" },
  { month: 5, day: 8, label: "Giornata mondiale della Croce Rossa" },
  { month: 5, day: 9, label: "Festa dell'Europa" },
  { month: 5, day: 15, label: "Giornata internazionale della famiglia" },
  { month: 5, day: 17, label: "Giornata mondiale delle telecomunicazioni" },
  { month: 5, day: 18, label: "Giornata internazionale dei musei" },
  { month: 5, day: 20, label: "Giornata mondiale delle api" },
  { month: 5, day: 21, label: "Giornata mondiale della diversita culturale" },
  { month: 5, day: 22, label: "Giornata mondiale biodiversita" },
  { month: 5, day: 31, label: "Giornata mondiale senza tabacco" },
  { month: 6, day: 1, label: "Giornata mondiale dei genitori" },
  { month: 6, day: 1, label: "Giornata mondiale del latte" },
  { month: 6, day: 2, label: "Festa della Repubblica" },
  { month: 6, day: 3, label: "Giornata mondiale della bicicletta" },
  { month: 6, day: 5, label: "Giornata mondiale dell'ambiente" },
  { month: 6, day: 8, label: "Giornata mondiale degli oceani" },
  { month: 6, day: 12, label: "Giornata mondiale contro il lavoro minorile" },
  { month: 6, day: 14, label: "Giornata mondiale dei donatori di sangue" },
  { month: 6, day: 18, label: "Giornata della gastronomia sostenibile" },
  { month: 6, day: 20, label: "Giornata mondiale del rifugiato" },
  { month: 6, day: 21, label: "Giornata internazionale dello yoga" },
  { month: 6, day: 21, label: "Giornata mondiale della musica" },
  { month: 6, day: 21, label: "Solstizio d'estate" },
  { month: 6, day: 26, label: "Giornata contro abuso e traffico di droga" },
  { month: 6, day: 27, label: "Giornata delle micro, piccole e medie imprese" },
  { month: 6, day: 28, label: "Giornata dell'orgoglio LGBTQ+" },
  { month: 6, day: 30, label: "Giornata mondiale dei social media" },
  { month: 7, day: 1, label: "Inizio saldi estivi" },
  { month: 7, day: 2, label: "Giornata mondiale degli UFO" },
  { month: 7, day: 6, label: "Giornata mondiale del bacio" },
  { month: 7, day: 7, label: "Giornata mondiale del cioccolato" },
  { month: 7, day: 11, label: "Giornata mondiale della popolazione" },
  { month: 7, day: 17, label: "Giornata mondiale delle emoji" },
  { month: 7, day: 18, label: "Mandela Day" },
  { month: 7, day: 30, label: "Giornata internazionale dell'amicizia" },
  { month: 8, day: 8, label: "Giornata internazionale del gatto" },
  { month: 8, day: 9, label: "Giornata internazionale dei popoli indigeni" },
  { month: 8, day: 12, label: "Giornata internazionale della gioventu" },
  { month: 8, day: 13, label: "Giornata internazionale dei mancini" },
  { month: 8, day: 15, label: "Ferragosto" },
  { month: 8, day: 19, label: "Giornata mondiale della fotografia" },
  { month: 8, day: 26, label: "Giornata mondiale del cane" },
  { month: 9, day: 5, label: "Giornata internazionale della beneficenza" },
  { month: 9, day: 8, label: "Giornata internazionale dell'alfabetizzazione" },
  { month: 9, day: 13, label: "Positive Thinking Day" },
  { month: 9, day: 15, label: "Giornata internazionale della democrazia" },
  { month: 9, day: 21, label: "Giornata internazionale della pace" },
  { month: 9, day: 22, label: "Inizio autunno" },
  { month: 9, day: 27, label: "Giornata mondiale del turismo" },
  { month: 9, day: 29, label: "Giornata mondiale del cuore" },
  { month: 10, day: 1, label: "Giornata internazionale del caffe" },
  { month: 10, day: 1, label: "Mese della prevenzione tumore al seno" },
  { month: 10, day: 2, label: "Festa dei nonni" },
  { month: 10, day: 4, label: "Giornata mondiale degli animali" },
  { month: 10, day: 5, label: "Giornata mondiale degli insegnanti" },
  { month: 10, day: 10, label: "Giornata mondiale della salute mentale" },
  { month: 10, day: 16, label: "Giornata mondiale dell'alimentazione" },
  { month: 10, day: 25, label: "Giornata mondiale della pasta" },
  { month: 10, day: 31, label: "Halloween" },
  { month: 11, day: 1, label: "Ognissanti" },
  { month: 11, day: 2, label: "Giorno dei morti" },
  { month: 11, day: 13, label: "Giornata mondiale della gentilezza" },
  { month: 11, day: 19, label: "Giornata internazionale dell'uomo" },
  { month: 11, day: 20, label: "Giornata mondiale dell'infanzia" },
  { month: 11, day: 21, label: "Giornata mondiale della televisione" },
  { month: 11, day: 25, label: "Giornata contro la violenza sulle donne" },
  { month: 11, day: 30, label: "Cyber Monday" },
  { month: 12, day: 1, label: "Giornata mondiale contro l'AIDS" },
  { month: 12, day: 3, label: "Giornata internazionale delle persone con disabilita" },
  { month: 12, day: 8, label: "Immacolata Concezione" },
  { month: 12, day: 10, label: "Giornata dei diritti umani" },
  { month: 12, day: 21, label: "Solstizio d'inverno" },
  { month: 12, day: 24, label: "Vigilia di Natale" },
  { month: 12, day: 25, label: "Natale" },
  { month: 12, day: 26, label: "Santo Stefano" },
  { month: 12, day: 31, label: "Capodanno in arrivo" },
]

const easterDate = (year: number) => {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1
  const day = ((h + l - 7 * m + 114) % 31) + 1

  return new Date(year, month, day)
}

const addDays = (date: Date, days: number) => {
  const next = new Date(date)
  next.setDate(date.getDate() + days)

  return next
}

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

const contentPrompts = (date: Date) => {
  const day = date.getDate()
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  const labels: string[] = []

  if (day === 1) {
    labels.push("Inizio mese")
    labels.push("Piano contenuti")
  }

  if (day === 15) {
    labels.push("Controllo metriche")
  }

  if (lastDay - day < 3) {
    labels.push("Piano prossimo mese")
  }

  if (date.getDay() === 1) {
    labels.push("Focus della settimana")
  }

  if (date.getDay() === 5) {
    labels.push("Recap settimana")
  }

  return labels
}

const variableEvents = (date: Date) => {
  const month = date.getMonth() + 1
  const day = date.getDate()
  const weekday = date.getDay()
  const occurrence = Math.ceil(day / 7)
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  const daysToEnd = lastDay - day
  const labels: string[] = []
  const easter = easterDate(date.getFullYear())

  if (isSameDay(date, addDays(easter, -47))) {
    labels.push("Martedi grasso")
  }

  if (isSameDay(date, addDays(easter, -2))) {
    labels.push("Venerdi Santo")
  }

  if (isSameDay(date, easter)) {
    labels.push("Pasqua")
  }

  if (isSameDay(date, addDays(easter, 1))) {
    labels.push("Pasquetta")
  }

  if (month === 5 && weekday === 0 && occurrence === 2) {
    labels.push("Festa della mamma")
  }

  if (month === 11 && weekday === 5 && daysToEnd < 7) {
    labels.push("Black Friday")
  }

  if (month === 11 && weekday === 1 && day >= 24 && day <= 30) {
    labels.push("Cyber Monday")
  }

  if (month === 12 && day >= 1 && day <= 24) {
    labels.push("Calendario dell'Avvento")
  }

  return labels
}

export const getEditorialIdeas = (date: Date) => [
  ...fixedEvents
    .filter(
      (event) =>
        event.month === date.getMonth() + 1 && event.day === date.getDate(),
    )
    .map((event) => event.label),
  ...variableEvents(date),
  ...contentPrompts(date),
]
