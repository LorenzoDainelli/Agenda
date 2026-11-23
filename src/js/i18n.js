/* Agenda — lingua.
 *
 * Due lingue, italiano e inglese. Di serie l'app segue la lingua del telefono;
 * dalle impostazioni si può forzare.
 *
 * Ogni testo visibile passa da qui. Una stringa scritta a mano dentro l'HTML o
 * dentro un altro `.js` è un errore, perché esiste in una lingua sola
 * (CLAUDE.md, "Lingua").
 *
 * Le chiavi sono raggruppate per schermata e ordinate come si incontrano
 * usando l'app, non in ordine alfabetico: così si trova quella che serve
 * ripercorrendo i gesti, che è come la si cerca.
 */

const DICT = {
  it: {
    /* generale */
    "common.cancel": "Annulla",
    "common.save": "Salva",
    "common.delete": "Elimina",
    "common.close": "Chiudi",
    "common.add": "Aggiungi",
    "common.keep": "Lascia stare",
    "common.back": "Indietro",

    /* teoria e laboratorio */
    "mode.theory": "Teoria",
    "mode.lab": "Laboratorio",
    "mode.lab.short": "Lab",

    /* promemoria della copia */
    "backup.title": "Scarica una copia dei tuoi dati",
    "backup.note.last": "L'ultima copia \u00e8 del {date}.",
    "backup.note.never": "Non ne hai ancora fatta una: se perdi il telefono, orario e voti non si recuperano.",
    "backup.save": "Scarica",
    "backup.later": "Pi\u00f9 tardi",

    /* impostazioni */
    "settings.title": "Impostazioni",
    "grades.title": "Voti",
    "grades.term1": "1° quadr.",
    "grades.term2": "2° quadr.",
    "grades.year": "Anno",
    "grades.overall": "Media generale",
    "grades.count.one": "{n} voto",
    "grades.count.many": "{n} voti",
    "grades.none": "Ancora nessun voto in questo periodo.",
    "grades.add": "Aggiungi voto",
    "grades.edit": "Modifica voto",
    "grades.subjects": "Materie",
    "grades.subject": "Materia",
    "grades.value": "Voto",
    "grades.date": "Giorno",
    "grades.theory": "Teoria",
    "grades.lab": "Laboratorio",
    "grades.all": "Complessiva",
    "grades.empty.subject": "Nessun voto in questo periodo.",
    "grades.saved": "Voto salvato",
    "grades.deleted": "Voto eliminato",
    "grades.delete.confirm": "Eliminare il {value} di {subject} del {date}?",
    "settings.look": "Aspetto",
    "settings.look.note": "«Automatico» segue il tema del telefono, «Automatica» la sua lingua.",
    "settings.timetable.state.none": "nessuno",
    "settings.timetable.state.draft": "provvisorio",
    "settings.timetable.state.final": "definitivo",
    "settings.timetable.none.note": "Non hai ancora un orario: lo crei dal pulsante con la tabella, in alto nella schermata Da fare.",
    "settings.timetable.draft.note": "L'orario è provvisorio: si modifica dal pulsante con la tabella, in alto nella schermata Da fare. Quando è quello giusto, lo rendi definitivo da lì.",
    "settings.timetable.final.note": "L'orario è definitivo: si guarda e basta. Se a scuola cambia di nuovo, rendilo modificabile da qui.",
    "settings.timetable.unlock": "Rendilo di nuovo modificabile",
    "settings.timetable.unlocked": "L'orario si può di nuovo modificare",
    "settings.data.age.never": "nessuna copia",
    "settings.data.age.today": "copia di oggi",
    "settings.data.age.yesterday": "copia di ieri",
    "settings.data.age.days": "copia di {n} giorni fa",
    "settings.data.last.never": "Non hai ancora scaricato una copia da questo telefono.",
    "settings.data.last.today": "Ultima copia: oggi.",
    "settings.data.last.yesterday": "Ultima copia: ieri.",
    "settings.data.last.days": "Ultima copia: {n} giorni fa.",
    "timetable.final.make": "È l'orario definitivo",
    "timetable.final.confirm": "Da qui in poi l'orario si potrà solo guardare. Se a scuola cambia di nuovo, lo rendi modificabile da Impostazioni › Orario.",
    "timetable.final.yes": "È definitivo",
    "timetable.final.note": "Orario definitivo. Per cambiarlo: Impostazioni › Orario.",
    "settings.subjects": "Materie",
    "settings.subjects.add": "Aggiungi una materia",
    "settings.subjects.name": "Nome",
    "settings.subjects.short": "Sigla",
    "settings.subjects.color": "Colore",
    "settings.subjects.color.cell": "Riga {row}, colonna {col}",
    "settings.subjects.color.note": "Tocca un colore, o appoggia il dito e scorri: il colore sotto il dito si vede qui sopra.",
    "settings.subjects.lab.no": "Solo teoria",
    "settings.subjects.lab.yes": "Teoria e laboratorio",
    "settings.subjects.empty": "Non hai ancora nessuna materia.",
    "settings.subjects.note": "Eliminando una materia i suoi voti restano: tengono il nome che avevano.",
    "settings.subjects.delete.confirm": "Elimino «{name}»? I suoi {n} voti restano, col nome che ha adesso.",
    "settings.timetable": "Orario",
    "settings.timetable.current": "Vale da {date}",
    "settings.timetable.first": "Vale dall'inizio",
    "settings.timetable.add": "Nuovo orario",
    "settings.timetable.empty": "Non hai ancora un orario. Creane uno: è la prima cosa che vedi aprendo l'app.",
    "settings.timetable.note": "Ogni orario vale dalla sua settimana in poi. Quello nuovo nasce copiando l'ultimo, così cambi solo quello che è cambiato.",
    "settings.timetable.created": "Creato l'orario che vale dal {date}",
    "timetable.start.how": "Da che giorno vale il nuovo orario?",
    "settings.timetable.delete.confirm": "Elimino l'orario che vale dal {date}? Torna valido quello di prima.",
    "settings.timetable.hour": "{n}ª",
    "settings.timetable.free": "libera",
    "timetable.break": "Pausa",
    "timetable.days": "Ore per giorno",
    "timetable.days.n": "{n} ore",
    "timetable.days.how": "Quante ore {day}?",
    "timetable.days.lose": "{day} ha lezioni nelle ore che togli: {n} caselle tornano vuote.",
    "settings.data": "I tuoi dati",
    "settings.data.download": "Scarica una copia",
    "settings.data.restore": "Ripristina da una copia",
    "settings.data.note": "I tuoi dati stanno solo su questo telefono. Se cancelli i dati dei siti o cambi telefono, senza una copia non c'è niente da cui recuperarli.",
    "settings.data.saved": "Copia salvata",
    "settings.data.restored.one": "Copia rimessa dentro: 1 voto",
    "settings.data.restored.many": "Copia rimessa dentro: {n} voti",
    "settings.data.badfile": "Questo file non è una copia dell'Agenda.",
    "settings.lang": "Lingua",
    "settings.lang.auto": "Automatica",
    "settings.theme": "Tema",
    "settings.theme.auto": "Automatico",
    "settings.theme.light": "Chiaro",
    "settings.theme.dark": "Scuro",
  },

  en: {
    "common.cancel": "Cancel",
    "common.save": "Save",
    "common.delete": "Delete",
    "common.close": "Close",
    "common.add": "Add",
    "common.keep": "Keep it",
    "common.back": "Back",

    "mode.theory": "Theory",
    "mode.lab": "Lab",
    "mode.lab.short": "Lab",

    /* promemoria della copia */
    "backup.title": "Download a copy of your data",
    "backup.note.last": "Your last copy is from {date}.",
    "backup.note.never": "You haven't made one yet: if you lose your phone, your timetable and grades can't be recovered.",
    "backup.save": "Download",
    "backup.later": "Later",

    "settings.title": "Settings",
    "grades.title": "Grades",
    "grades.term1": "1st term",
    "grades.term2": "2nd term",
    "grades.year": "Year",
    "grades.overall": "Overall average",
    "grades.count.one": "{n} grade",
    "grades.count.many": "{n} grades",
    "grades.none": "No grades in this period yet.",
    "grades.add": "Add grade",
    "grades.edit": "Edit grade",
    "grades.subjects": "Subjects",
    "grades.subject": "Subject",
    "grades.value": "Grade",
    "grades.date": "Day",
    "grades.theory": "Theory",
    "grades.lab": "Lab",
    "grades.all": "Overall",
    "grades.empty.subject": "No grades in this period.",
    "grades.saved": "Grade saved",
    "grades.deleted": "Grade deleted",
    "grades.delete.confirm": "Delete the {value} in {subject} from {date}?",
    "settings.look": "Appearance",
    "settings.look.note": "“Automatic” follows the phone's theme and language.",
    "settings.timetable.state.none": "none",
    "settings.timetable.state.draft": "provisional",
    "settings.timetable.state.final": "final",
    "settings.timetable.none.note": "You have no timetable yet: make one from the table button at the top of the To do screen.",
    "settings.timetable.draft.note": "The timetable is provisional: you edit it from the table button at the top of the To do screen. When it's the right one, make it final from there.",
    "settings.timetable.final.note": "The timetable is final: it can only be viewed. If it changes again at school, make it editable from here.",
    "settings.timetable.unlock": "Make it editable again",
    "settings.timetable.unlocked": "The timetable can be edited again",
    "settings.data.age.never": "no copy",
    "settings.data.age.today": "copy from today",
    "settings.data.age.yesterday": "copy from yesterday",
    "settings.data.age.days": "copy from {n} days ago",
    "settings.data.last.never": "You haven't downloaded a copy from this phone yet.",
    "settings.data.last.today": "Last copy: today.",
    "settings.data.last.yesterday": "Last copy: yesterday.",
    "settings.data.last.days": "Last copy: {n} days ago.",
    "timetable.final.make": "This is the final timetable",
    "timetable.final.confirm": "From now on the timetable can only be viewed. If it changes again at school, make it editable from Settings › Timetable.",
    "timetable.final.yes": "It's final",
    "timetable.final.note": "Final timetable. To change it: Settings › Timetable.",
    "settings.subjects": "Subjects",
    "settings.subjects.add": "Add a subject",
    "settings.subjects.name": "Name",
    "settings.subjects.short": "Short",
    "settings.subjects.color": "Colour",
    "settings.subjects.color.cell": "Row {row}, column {col}",
    "settings.subjects.color.note": "Tap a colour, or hold and slide: the colour under your finger shows up above.",
    "settings.subjects.lab.no": "Theory only",
    "settings.subjects.lab.yes": "Theory and lab",
    "settings.subjects.empty": "You have no subjects yet.",
    "settings.subjects.note": "Deleting a subject keeps its grades: they keep the name it had.",
    "settings.subjects.delete.confirm": "Delete “{name}”? Its {n} grades stay, with the name it has now.",
    "settings.timetable": "Timetable",
    "settings.timetable.current": "From {date}",
    "settings.timetable.first": "From the start",
    "settings.timetable.add": "New timetable",
    "settings.timetable.empty": "You have no timetable yet. Make one: it's the first thing you see when you open the app.",
    "settings.timetable.note": "Each timetable applies from its week onwards. A new one starts as a copy of the last, so you only change what changed.",
    "settings.timetable.created": "Made the timetable that starts on {date}",
    "timetable.start.how": "From which day does the new timetable start?",
    "settings.timetable.delete.confirm": "Delete the timetable from {date}? The previous one applies again.",
    "settings.timetable.hour": "{n}",
    "settings.timetable.free": "free",
    "timetable.break": "Break",
    "timetable.days": "Hours per day",
    "timetable.days.n": "{n} hours",
    "timetable.days.how": "How many hours on {day}?",
    "timetable.days.lose": "{day} has lessons in the hours you're removing: {n} cells will be emptied.",
    "settings.data": "Your data",
    "settings.data.download": "Download a copy",
    "settings.data.restore": "Restore from a copy",
    "settings.data.note": "Your data lives only on this phone. If you clear website data or change phone, without a copy there's nothing to get it back from.",
    "settings.data.saved": "Copy saved",
    "settings.data.restored.one": "Copy put back: 1 grade",
    "settings.data.restored.many": "Copy put back: {n} grades",
    "settings.data.badfile": "This file isn't an Agenda copy.",
    "settings.lang": "Language",
    "settings.lang.auto": "Automatic",
    "settings.theme": "Theme",
    "settings.theme.auto": "Automatic",
    "settings.theme.light": "Light",
    "settings.theme.dark": "Dark",
  },
};

export const LANGS = ["it", "en"];

let lang = "it";

/** La lingua del telefono, se è una di quelle che l'app parla. */
export function deviceLang() {
  for (const tag of navigator.languages || [navigator.language || "it"]) {
    const base = String(tag).slice(0, 2).toLowerCase();
    if (LANGS.includes(base)) return base;
  }
  return "it";
}

export function setLang(value) {
  lang = LANGS.includes(value) ? value : deviceLang();
  document.documentElement.lang = lang;
  return lang;
}

export function getLang() {
  return lang;
}

/**
 * Il testo di una chiave, con i segnaposto `{nome}` sostituiti.
 *
 * Una chiave che manca torna come chiave, visibile: un testo mancante deve
 * dare fastidio subito, non passare per una stringa vuota che nessuno nota.
 */
export function t(key, vars) {
  const raw = DICT[lang]?.[key] ?? DICT.it[key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, name) => (name in vars ? String(vars[name]) : `{${name}}`));
}

/** Plurale semplice: due chiavi, una per il singolare e una per il plurale. */
export function tn(n, keyOne, keyMany) {
  return t(n === 1 ? keyOne : keyMany, { n });
}

/**
 * Sostituisce i testi dentro un pezzo di pagina già scritto.
 * `data-i18n` per il contenuto, `data-i18n-ph` per il segnaposto di un campo,
 * `data-i18n-label` per l'etichetta accessibile.
 */
export function apply(root = document) {
  for (const node of root.querySelectorAll("[data-i18n]")) {
    node.textContent = t(node.dataset.i18n);
  }
  for (const node of root.querySelectorAll("[data-i18n-ph]")) {
    node.placeholder = t(node.dataset.i18nPh);
  }
  for (const node of root.querySelectorAll("[data-i18n-label]")) {
    node.setAttribute("aria-label", t(node.dataset.i18nLabel));
  }
}
