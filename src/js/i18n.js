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
    "app.name": "Agenda",
    "common.cancel": "Annulla",
    "common.save": "Salva",
    "common.delete": "Elimina",
    "common.close": "Chiudi",
    "common.done": "Fatto",
    "common.undo": "Annulla",
    "common.add": "Aggiungi",
    "common.edit": "Modifica",
    "common.keep": "Lascia stare",
    "common.other": "Altro",
    "common.none": "Nessuna",
    "common.today": "Oggi",
    "common.tomorrow": "Domani",
    "common.yesterday": "Ieri",
    "common.back": "Indietro",

    /* schermata Da fare */
    "todo.eyebrow": "Da fare",
    "todo.hero.label": "Per oggi",
    "todo.hero.things": "cose",
    "todo.hero.thing": "cosa",
    "todo.hero.nothing": "Niente per oggi",
    "todo.hero.late": "{n} in ritardo",
    "todo.hero.tomorrow": "{n} entro domani",
    "todo.hero.allclear": "Sei in pari",
    "todo.section.late": "In ritardo",
    "todo.section.today": "Oggi",
    "todo.section.tomorrow": "Domani",
    "todo.section.week": "Questa settimana",
    "todo.section.later": "Più avanti",
    "todo.section.undated": "Senza data",
    "todo.empty.title": "Non c'è niente da fare",
    "todo.empty.note": "Tocca il + per aggiungere un compito o una cosa da fare.",
    "todo.empty.filtered.title": "Niente qui",
    "todo.empty.filtered.note": "In questo ambito non c'è niente da fare.",
    "todo.next": "Prossimi giorni",
    "todo.next.hint": "Tocca un giorno per aprire il calendario l\u00ec.",
    "urgent.late": "{n} in ritardo",
    "urgent.test.today": "Verifica oggi",
    "urgent.test.tomorrow": "Verifica domani",
    "urgent.both": "{n} in ritardo \u00b7 verifica {when}",
    "cal.day.nothing": "Niente per questo giorno",
    "cal.day.load": "peso {n}",
    "cal.tap": "Tocca un giorno per vedere cosa c'\u00e8. Tocca una cosa per aprirla.",
    "slot.unplanned": "Da pianificare",
    "todo.filter.all": "Tutto",
    "todo.add": "Aggiungi",

    /* ambiti */
    "area.school": "Scuola",
    "area.private": "Privato",

    /* tipi */
    "kind.homework": "Compito",
    "kind.test": "Verifica",
    "kind.todo": "Da fare",

    /* peso */
    "weight.label": "Peso",
    "weight.1": "Leggero",
    "weight.2": "Medio",
    "weight.3": "Pesante",

    /* momenti della giornata */
    "slot.morning": "Mattina",
    "slot.afternoon": "Pomeriggio",
    "slot.evening": "Sera",
    "slot.morning.short": "mattina",
    "slot.afternoon.short": "pomerig.",
    "slot.evening.short": "sera",

    /* pannello del compito */
    "task.new": "Nuovo",
    "task.title.placeholder": "Che cosa devi fare?",
    "task.title.test": "Verifica di {subject}",
    "task.name.optional": "Nome (facoltativo)",
    "task.name.auto": "Come la materia",
    "task.subject": "Materia",
    "task.subject.recent": "Oggi hai avuto",
    "task.subject.all": "Tutte le materie",
    "task.subject.none": "Senza materia",
    "task.kind": "Tipo",
    "task.due": "Per quando",
    "task.due.next": "prossima lezione",
    "task.due.none": "Senza scadenza",
    "task.due.pick": "Scegli il giorno",
    "task.window": "Quando lo fai",
    "task.window.hint": "Tocca un giorno per escluderlo, tienilo premuto per dire che lo farai lì.",
    "task.window.hint.test": "Questi sono i giorni in cui puoi studiare. Il giorno della verifica è quello in ambra.",
    "task.window.empty": "Non resta nessun giorno prima della scadenza.",
    "task.window.nodue": "Senza una scadenza non c'è una finestra di giorni: scegli tu quando farlo.",
    "task.parts": "Parti",
    "task.parts.todo": "Cosa c'è da fare",
    "task.parts.add": "Aggiungi una parte",
    "task.parts.placeholder": "Es. traduzione 5 frasi",
    "task.parts.quantity": "Quante",
    "task.parts.hint": "Un compito è fatto quando lo sono tutte le sue parti.",
    "task.progress": "{done} di {total}",
    "task.delete.confirm": "Elimino «{title}»? Non si può tornare indietro.",
    "task.deleted": "Eliminato",
    "task.done.toast": "Fatto",
    "task.done.auto.toast": "Fatte tutte le parti: compito fatto",
    "part.check": "Spunta \u00ab{title}\u00bb",
    "part.count": "\u00ab{title}\u00bb: {done} di {total}",
    "part.reset.toast": "\u00ab{title}\u00bb di nuovo a zero",
    "backup.title": "Scarica una copia dei tuoi dati",
    "backup.note.last": "L'ultima copia \u00e8 del {date}.",
    "backup.note.never": "Non ne hai ancora fatta una: se perdi il telefono, i compiti non si recuperano.",
    "backup.save": "Scarica",
    "backup.later": "Pi\u00f9 tardi",
    "part.when": "quando?",
    "part.when.title": "Quando fai \u00ab{title}\u00bb?",
    "part.when.none": "Nessun giorno: segue il compito",
    "task.undone.toast": "Rimesso da fare",
    "task.saved": "Salvato",
    "task.needtitle": "Scrivi che cosa devi fare",
    "task.needname": "Scegli una materia o scrivi un nome",
    "task.plan.needed": "Da pianificare",
    "task.due.in": "fra {n} giorni",
    "task.due.inone": "domani",
    "task.due.overdue": "in ritardo di {n} giorni",
    "task.due.overdueone": "in ritardo di un giorno",
    "task.due.on": "per {date}",

    /* calendario */
    "cal.title": "Calendario",
    "cal.week": "Settimana",
    "cal.month": "Mese",
    "cal.thisweek": "Questa settimana",
    "cal.load": "peso {n}",
    "cal.nothing": "niente",
    "cal.unplanned": "Da pianificare",
    "cal.readonly": "Il calendario si guarda. Per cambiare qualcosa, tocca la cosa da cambiare.",

    /* archivio */
    "archive.title": "Archivio",
    "archive.done": "Fatte",
    "archive.dropped": "Lasciate cadere",
    "archive.restore": "Rimetti da fare",
    "archive.empty.title": "Archivio vuoto",
    "archive.empty.note": "Qui finisce quello che spunti o che lasci cadere.",

    /* rassegna degli arretrati */
    "review.title": "Che fine hanno fatto?",
    "review.note": "{n} cose sono passate di scadenza. Sistemiamole una per una.",
    "review.done": "Fatto",
    "review.postpone": "Rimanda",
    "review.drop": "Non serve più",
    "review.postpone.title": "Per quando?",
    "review.left": "ne restano {n}",
    "review.finished": "Tutto sistemato",

    /* impostazioni */
    "settings.title": "Impostazioni",
    "settings.look": "Aspetto",
    "settings.look.note": "«Automatico» segue il tema del telefono, «Automatica» la sua lingua.",
    "settings.tasks": "Compiti",
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
    "settings.subjects.empty": "Non hai ancora nessuna materia.",
    "settings.subjects.note": "Eliminando una materia i compiti restano: tengono il nome che avevano.",
    "settings.subjects.delete.confirm": "Elimino «{name}»? I {n} compiti che la usano restano, col nome che hanno adesso.",
    "settings.timetable": "Orario",
    "settings.timetable.current": "Vale da {date}",
    "settings.timetable.first": "Vale dall'inizio",
    "settings.timetable.add": "Nuova settimana",
    "settings.timetable.empty": "Non hai ancora un orario. Creane uno: serve a proporre le scadenze da sé.",
    "settings.timetable.note": "Ogni orario vale dalla sua settimana in poi. Quello nuovo nasce copiando l'ultimo, così cambi solo quello che è cambiato.",
    "settings.timetable.created": "Creato l'orario della settimana del {date}",
    "settings.timetable.delete.confirm": "Elimino l'orario che vale dal {date}? Torna valido quello di prima.",
    "settings.timetable.hour": "{n}ª",
    "settings.timetable.free": "libera",
    "settings.areas": "Ambiti",
    "settings.areas.add": "Aggiungi un ambito",
    "settings.areas.fixed": "sempre presente",
    "settings.areas.delete.confirm": "Elimino l'ambito «{name}»? Le {n} cose che ci stanno dentro passano a Privato.",
    "settings.data": "I tuoi dati",
    "settings.data.download": "Scarica una copia",
    "settings.data.restore": "Ripristina da una copia",
    "settings.data.note": "I tuoi dati stanno solo su questo telefono. Se cancelli i dati dei siti o cambi telefono, senza una copia non c'è niente da cui recuperarli.",
    "settings.data.saved": "Copia salvata",
    "settings.data.restored": "Rimesse dentro {n} cose",
    "settings.data.badfile": "Questo file non è una copia dell'Agenda.",
    "settings.lang": "Lingua",
    "settings.lang.auto": "Automatica",
    "settings.parttap": "Parti con un numero",
    "settings.parttap.step": "+1 a ogni tocco",
    "settings.parttap.all": "Un tocco la fa tutta",
    "settings.parttap.note": "Vale per le parti come \u00ab5 frasi\u00bb spuntate dall'elenco. Dentro il compito ci sono sempre i tasti \u2212 e +.",
    "settings.theme": "Tema",
    "settings.theme.auto": "Automatico",
    "settings.theme.light": "Chiaro",
    "settings.theme.dark": "Scuro",
  },

  en: {
    "app.name": "Agenda",
    "common.cancel": "Cancel",
    "common.save": "Save",
    "common.delete": "Delete",
    "common.close": "Close",
    "common.done": "Done",
    "common.undo": "Undo",
    "common.add": "Add",
    "common.edit": "Edit",
    "common.keep": "Keep it",
    "common.other": "Other",
    "common.none": "None",
    "common.today": "Today",
    "common.tomorrow": "Tomorrow",
    "common.yesterday": "Yesterday",
    "common.back": "Back",

    "todo.eyebrow": "To do",
    "todo.hero.label": "For today",
    "todo.hero.things": "things",
    "todo.hero.thing": "thing",
    "todo.hero.nothing": "Nothing for today",
    "todo.hero.late": "{n} overdue",
    "todo.hero.tomorrow": "{n} due tomorrow",
    "todo.hero.allclear": "You're all caught up",
    "todo.section.late": "Overdue",
    "todo.section.today": "Today",
    "todo.section.tomorrow": "Tomorrow",
    "todo.section.week": "This week",
    "todo.section.later": "Later",
    "todo.section.undated": "No date",
    "todo.empty.title": "Nothing to do",
    "todo.empty.note": "Tap + to add homework or something to do.",
    "todo.empty.filtered.title": "Nothing here",
    "todo.empty.filtered.note": "Nothing to do in this area.",
    "todo.next": "Next days",
    "todo.next.hint": "Tap a day to open the calendar there.",
    "urgent.late": "{n} overdue",
    "urgent.test.today": "Test today",
    "urgent.test.tomorrow": "Test tomorrow",
    "urgent.both": "{n} overdue \u00b7 test {when}",
    "cal.day.nothing": "Nothing on this day",
    "cal.day.load": "weight {n}",
    "cal.tap": "Tap a day to see what's on it. Tap a thing to open it.",
    "slot.unplanned": "Needs planning",
    "todo.filter.all": "All",
    "todo.add": "Add",

    "area.school": "School",
    "area.private": "Personal",

    "kind.homework": "Homework",
    "kind.test": "Test",
    "kind.todo": "To do",

    "weight.label": "Weight",
    "weight.1": "Light",
    "weight.2": "Medium",
    "weight.3": "Heavy",

    "slot.morning": "Morning",
    "slot.afternoon": "Afternoon",
    "slot.evening": "Evening",
    "slot.morning.short": "morning",
    "slot.afternoon.short": "afternoon",
    "slot.evening.short": "evening",

    "task.new": "New",
    "task.title.placeholder": "What do you have to do?",
    "task.title.test": "{subject} test",
    "task.name.optional": "Name (optional)",
    "task.name.auto": "Same as the subject",
    "task.subject": "Subject",
    "task.subject.recent": "You had today",
    "task.subject.all": "All subjects",
    "task.subject.none": "No subject",
    "task.kind": "Kind",
    "task.due": "Due",
    "task.due.next": "next lesson",
    "task.due.none": "No due date",
    "task.due.pick": "Pick a day",
    "task.window": "When you'll do it",
    "task.window.hint": "Tap a day to rule it out, hold it to say you'll do it then.",
    "task.window.hint.test": "These are the days you can study. The test day is the amber one.",
    "task.window.empty": "No days left before it's due.",
    "task.window.nodue": "Without a due date there's no window of days: pick when you'll do it.",
    "task.parts": "Parts",
    "task.parts.todo": "What to do",
    "task.parts.add": "Add a part",
    "task.parts.placeholder": "e.g. translate 5 sentences",
    "task.parts.quantity": "How many",
    "task.parts.hint": "A task is done when all its parts are.",
    "task.progress": "{done} of {total}",
    "task.delete.confirm": "Delete “{title}”? This can't be undone.",
    "task.deleted": "Deleted",
    "task.done.toast": "Done",
    "task.done.auto.toast": "All parts done: task done",
    "part.check": "Tick \u201c{title}\u201d",
    "part.count": "\u201c{title}\u201d: {done} of {total}",
    "part.reset.toast": "\u201c{title}\u201d back to zero",
    "backup.title": "Download a copy of your data",
    "backup.note.last": "Your last copy is from {date}.",
    "backup.note.never": "You haven't made one yet: if you lose your phone, your tasks can't be recovered.",
    "backup.save": "Download",
    "backup.later": "Later",
    "part.when": "when?",
    "part.when.title": "When will you do \u201c{title}\u201d?",
    "part.when.none": "No day: follows the task",
    "task.undone.toast": "Back on the list",
    "task.saved": "Saved",
    "task.needtitle": "Write what you have to do",
    "task.needname": "Pick a subject or write a name",
    "task.plan.needed": "Needs planning",
    "task.due.in": "in {n} days",
    "task.due.inone": "tomorrow",
    "task.due.overdue": "{n} days overdue",
    "task.due.overdueone": "one day overdue",
    "task.due.on": "due {date}",

    "cal.title": "Calendar",
    "cal.week": "Week",
    "cal.month": "Month",
    "cal.thisweek": "This week",
    "cal.load": "weight {n}",
    "cal.nothing": "nothing",
    "cal.unplanned": "Needs planning",
    "cal.readonly": "The calendar is for looking. To change something, tap the thing itself.",

    "archive.title": "Archive",
    "archive.done": "Done",
    "archive.dropped": "Dropped",
    "archive.restore": "Put back",
    "archive.empty.title": "Archive is empty",
    "archive.empty.note": "What you tick off or drop ends up here.",

    "review.title": "What happened to these?",
    "review.note": "{n} things went past their due date. Let's sort them out one by one.",
    "review.done": "Done it",
    "review.postpone": "Postpone",
    "review.drop": "Not needed",
    "review.postpone.title": "Until when?",
    "review.left": "{n} left",
    "review.finished": "All sorted",

    "settings.title": "Settings",
    "settings.look": "Appearance",
    "settings.look.note": "“Automatic” follows the phone's theme and language.",
    "settings.tasks": "Tasks",
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
    "settings.subjects.empty": "You have no subjects yet.",
    "settings.subjects.note": "Deleting a subject keeps the homework: it keeps the name it had.",
    "settings.subjects.delete.confirm": "Delete “{name}”? The {n} tasks using it stay, with the name they have now.",
    "settings.timetable": "Timetable",
    "settings.timetable.current": "From {date}",
    "settings.timetable.first": "From the start",
    "settings.timetable.add": "New week",
    "settings.timetable.empty": "You have no timetable yet. Make one: it's what lets due dates be proposed for you.",
    "settings.timetable.note": "Each timetable applies from its week onwards. A new one starts as a copy of the last, so you only change what changed.",
    "settings.timetable.created": "Made the timetable for the week of {date}",
    "settings.timetable.delete.confirm": "Delete the timetable from {date}? The previous one applies again.",
    "settings.timetable.hour": "{n}",
    "settings.timetable.free": "free",
    "settings.areas": "Areas",
    "settings.areas.add": "Add an area",
    "settings.areas.fixed": "always there",
    "settings.areas.delete.confirm": "Delete the area “{name}”? The {n} things in it move to Personal.",
    "settings.data": "Your data",
    "settings.data.download": "Download a copy",
    "settings.data.restore": "Restore from a copy",
    "settings.data.note": "Your data lives only on this phone. If you clear website data or change phone, without a copy there's nothing to get it back from.",
    "settings.data.saved": "Copy saved",
    "settings.data.restored": "Put back {n} things",
    "settings.data.badfile": "This file isn't an Agenda copy.",
    "settings.lang": "Language",
    "settings.lang.auto": "Automatic",
    "settings.parttap": "Parts with a number",
    "settings.parttap.step": "+1 per tap",
    "settings.parttap.all": "One tap does it all",
    "settings.parttap.note": "For parts like \u201c5 sentences\u201d ticked from the list. Inside the task the \u2212 and + buttons are always there.",
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
