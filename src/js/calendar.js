/* Agenda — il calendario.
 *
 * Due viste: la settimana (quella con cui si lavora) e il mese (quella con cui
 * si guarda avanti). Il fondo di un giorno dice quanto pesa, sui sei gradini
 * fissi dei token: dal quasi bianco al blu pieno.
 *
 * IL CALENDARIO NON MODIFICA NIENTE. Si guarda. Toccando una cosa si apre il
 * suo pannello, e da lì si modifica — ma nel calendario non c'è nessuna
 * azione, nessuna spunta, nessun trascinamento. È una scelta: una vista che
 * mostra il carico e insieme lo cambia diventa un posto in cui si sbaglia per
 * sbaglio.
 */

import {
  today as todayISO, addDays, mondayOf, dow, dayNumber, firstOfMonth,
  addMonths, daysInMonth, dowShort, monthYear, dayMonth, weekdayInitials, full,
} from "./days.js";
import { t, getLang } from "./i18n.js";
import { dayLoad, loadStep, isOpen } from "./model.js";
import { onDayBySlot, unplannedOn } from "./tasks.js";
import { subjectColor, colorStyle } from "./subjects.js";
import { el, esc, onEach, emptyState } from "./ui.js";

/* Quanti mesi mostra la vista mese: da questo mese a undici mesi avanti.
   Un anno è l'orizzonte oltre il quale non c'è niente da vedere, perché non
   esistono compiti dati con un anno di anticipo. */
const MONTHS_AHEAD = 11;

let mode = "week";
let weekStart = null;
let selectedDay = null;
let ctx = null;
let onOpenTask = null;

export function open(context, callbacks, onDayISO = null) {
  ctx = context;
  onOpenTask = callbacks.onOpenTask;
  selectedDay = onDayISO || todayISO();
  weekStart = mondayOf(selectedDay);
  mode = "week";
  render();
}

export function setMode(next) {
  mode = next === "month" ? "month" : "week";
  render();
}

export function getMode() {
  return mode;
}

/** Le variabili del gradino di peso, da mettere in `style`. */
function loadStyle(step) {
  return `--ag-load:var(--ag-load-${step});--ag-load-ink:var(--ag-load-ink-${step})`;
}

/* ── Vista settimana ──────────────────────────────────────────────────
 *
 * La stessa forma della griglia dell'orario, e non per pigrizia: due griglie
 * che mostrano la stessa settimana devono somigliarsi, o il telefono sembra
 * due app diverse. Giorni in colonna, momenti della giornata in riga (dove
 * l'orario ha le ore), blocchi colorati con la sigla della materia.
 *
 * In 42px di colonna ci sta una sigla, non un titolo. Per questo sotto la
 * griglia c'è l'elenco per esteso del giorno scelto: la griglia dice DOVE, e
 * l'elenco dice COSA. Toccando un'intestazione si cambia il giorno scelto.
 */

const SLOT_ROWS = ["morning", "afternoon", "evening"];

/* Le icone dei momenti al posto delle scritte: una scritta breve ("SCADE")
   voleva una colonna da 3.1rem e lasciava ai giorni 40px, sotto il tocco
   minimo. Sole, mezzo sole, luna, bandierina della scadenza. */
const SLOT_ICONS = {
  morning: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  afternoon: '<path d="M4 18h16M7 18a5 5 0 0 1 10 0"/><path d="M12 8v2M5.6 11.6l1.4 1.4M18.4 11.6 17 13"/>',
  evening: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  unplanned: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
};

function slotIcon(slot) {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SLOT_ICONS[slot]}</svg>`;
}

/** L'etichetta dentro un blocchetto: la sigla della materia, o le prime
 *  lettere del titolo per le cose che non hanno una materia. */
function blockLabel(task) {
  const subject = task.subjectId
    ? ctx.settings.subjects.find((s) => s.id === task.subjectId)
    : null;
  if (subject?.short) return subject.short;
  return task.title.trim().slice(0, 4).toUpperCase();
}

/** Il nome per esteso di una voce: il compito, e la parte se è una parte. */
function entryTitle(entry) {
  return entry.part ? `${entry.task.title} · ${entry.part.title}` : entry.task.title;
}

/**
 * Un blocchetto: un compito, o una sua parte che ha quel giorno (§6.2). La
 * sigla è la stessa — è la materia — e il nome della parte si legge
 * nell'elenco sotto la griglia.
 *
 * Non si tocca: è alto 24px, e la regola è 44. Si tocca la colonna intera,
 * che mostra il giorno per esteso sotto la griglia, e da lì si apre il
 * compito su una riga della misura giusta. Il nome per esteso sta nel
 * `title`, che su un computer compare passandoci sopra.
 *
 * L'ambra della verifica vale SOLO nel giorno in cui la verifica si svolge:
 * nei giorni prima quello che c'è è lo studio, e dipingerlo come la verifica
 * farebbe sembrare che ci siano tre verifiche invece di una. Nei giorni di
 * studio vale il colore della materia.
 */
function block(entry, day) {
  const { task } = entry;
  const color = subjectColor(ctx.settings.subjects, task);
  const eVerifica = !entry.part && task.kind === "test" && task.due === day;
  const classes = [
    "ag-wblock",
    eVerifica ? "ag-wblock--test" : "",
    entry.done ? "ag-wblock--done" : "",
  ].filter(Boolean).join(" ");
  const style = eVerifica ? "" : colorStyle(color);
  return `<span class="${classes}" style="${style}" title="${esc(entryTitle(entry))}">${esc(blockLabel(task))}</span>`;
}

/** Le cose da pianificare sono compiti interi: le vestiamo da voce per
 *  disegnarle con gli stessi blocchetti. */
const asEntry = (task) => ({ task, part: null, slot: null, done: false });

function weekDays() {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

function grid() {
  const lang = getLang();
  const days = weekDays();
  const today = todayISO();

  const heads = days.map((d) => {
    const step = loadStep(dayLoad(ctx.tasks, d));
    const classes = [
      "ag-wgrid__head",
      d === today ? "ag-wgrid__head--today" : "",
      d === selectedDay && d !== today ? "ag-wgrid__head--on" : "",
    ].filter(Boolean).join(" ");
    return `
      <button class="${classes}" type="button" data-pick-day="${d}"
              style="${loadStyle(step)}" aria-label="${esc(full(d, lang))}">
        <span class="ag-wgrid__dow">${esc(dowShort(d, lang))}</span>
        <span class="ag-wgrid__n">${dayNumber(d)}</span>
      </button>`;
  });

  // La riga "da pianificare" si disegna solo se in questa settimana c'è
  // qualcosa da pianificare: una riga vuota fa cercare quello che non c'è.
  const conDaPianificare = days.some((d) => unplannedOn(ctx.tasks, d).length > 0);
  const righe = [...SLOT_ROWS, ...(conDaPianificare ? ["unplanned"] : [])];

  const celle = righe.flatMap((slot) => {
    const nome = slot === "unplanned" ? "slot.unplanned" : `slot.${slot}`;
    const etichetta = `<span class="ag-wgrid__slot" role="img" title="${esc(t(nome))}" aria-label="${esc(t(nome))}">${slotIcon(slot)}</span>`;
    const dayCells = days.map((d) => {
      const lista = slot === "unplanned" ? unplannedOn(ctx.tasks, d).map(asEntry) : onDayBySlot(ctx.tasks, d)[slot];
      // ogni casella porta il suo giorno: toccandone una qualsiasi si sceglie
      // la colonna, che è il bersaglio vero (vedi block)
      return `<div class="ag-wgrid__cell ${lista.length ? "" : "ag-wgrid__cell--empty"}" data-pick-day="${d}">${lista.map((entry) => block(entry, d)).join("")}</div>`;
    });
    return [etichetta, ...dayCells];
  });

  return `
    <div class="ag-wgrid">
      <span></span>${heads.join("")}
      ${celle.join("")}
    </div>`;
}

/** L'elenco per esteso del giorno scelto, sotto la griglia. */
function dayDetail() {
  const lang = getLang();
  const load = dayLoad(ctx.tasks, selectedDay);
  const bySlot = onDayBySlot(ctx.tasks, selectedDay);
  const unplanned = unplannedOn(ctx.tasks, selectedDay).map(asEntry);

  const gruppi = [
    ...SLOT_ROWS.map((slot) => [t(`slot.${slot}`), bySlot[slot]]),
    [t("slot.unplanned"), unplanned],
  ].filter(([, lista]) => lista.length > 0);

  const corpo = gruppi.length
    ? gruppi.map(([nome, lista]) => `
        <div class="ag-slot">
          <span class="ag-slot__label">${esc(nome)}</span>
          ${lista.map((entry) => pellet(entry, selectedDay)).join("")}
        </div>`).join("")
    : `<p class="ag-group__note">${esc(t("cal.day.nothing"))}</p>`;

  return `
    <div class="ag-wday-detail">
      <div class="ag-wday-detail__head">
        <span class="ag-wday-detail__title">${esc(full(selectedDay, lang))}</span>
        ${load ? `<span class="ag-wday-detail__load">${esc(t("cal.day.load", { n: load }))}</span>` : ""}
      </div>
      ${corpo}
    </div>`;
}

function pellet(entry, day) {
  const { task } = entry;
  const color = subjectColor(ctx.settings.subjects, task);
  const eVerifica = !entry.part && task.kind === "test" && task.due === day;
  const classes = [
    "ag-pellet",
    eVerifica ? "ag-pellet--test" : "",
    entry.done ? "ag-pellet--done" : "",
  ].filter(Boolean).join(" ");
  return `
    <button class="${classes}" type="button" data-task="${esc(task.id)}">
      ${eVerifica ? "" : `<span class="ag-dot" style="${colorStyle(color)}" aria-hidden="true"></span>`}
      <span class="ag-pellet__title">${esc(entryTitle(entry))}</span>
    </button>`;
}

function renderWeek() {
  const lang = getLang();
  const days = weekDays();
  const isThis = weekStart === mondayOf(todayISO());

  return `
    <div class="ag-week">
      <div class="ag-week__nav">
        <button class="ag-iconbtn" type="button" data-week="-1" aria-label="${esc(t("common.back"))}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>
        </button>
        <span class="ag-week__range">${esc(dayMonth(days[0], lang))} – ${esc(dayMonth(days[6], lang))}</span>
        <button class="ag-iconbtn" type="button" data-week="1" aria-label="${esc(t("cal.week"))}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>
        </button>
      </div>
      ${isThis ? "" : `<button class="ag-btn ag-btn--secondary ag-btn--sm" type="button" data-week="0">${esc(t("cal.thisweek"))}</button>`}
      ${grid()}
      ${dayDetail()}
      <p class="ag-group__note">${esc(t("cal.tap"))}</p>
    </div>`;
}

/* ── Vista mese ───────────────────────────────────────────────────── */

function monthBlock(month) {
  const lang = getLang();
  const first = firstOfMonth(month);
  const total = daysInMonth(first);
  const blanks = dow(first) - 1;
  const today = todayISO();

  const cells = [];
  for (let i = 0; i < blanks; i += 1) {
    cells.push('<span class="ag-cal__cell ag-cal__cell--empty"></span>');
  }
  for (let d = 1; d <= total; d += 1) {
    const iso = `${first.slice(0, 8)}${String(d).padStart(2, "0")}`;
    const load = dayLoad(ctx.tasks, iso);
    const step = loadStep(load);
    const hasTest = ctx.tasks.some((task) => isOpen(task) && task.kind === "test" && task.due === iso);
    // I pallini dicono quante cose ci sono, fino a tre: il numero esatto non
    // sta in una casella di questa misura, e "tre o più" è l'informazione
    // utile — sotto c'è la settimana per i dettagli.
    const count = Math.min(3, onDayBySlot(ctx.tasks, iso).morning.length
      + onDayBySlot(ctx.tasks, iso).afternoon.length
      + onDayBySlot(ctx.tasks, iso).evening.length);
    const number = hasTest
      ? `<span class="ag-cal__ring"><span class="ag-cal__n">${d}</span></span>`
      : `<span class="ag-cal__n ${iso === today ? "ag-cal__n--today" : ""}">${d}</span>`;
    cells.push(`
      <button class="ag-cal__cell" type="button" data-day="${iso}" style="${loadStyle(step)}"
              aria-label="${esc(dayMonth(iso, lang))}">
        ${number}
        <span class="ag-cal__pips">
          ${Array.from({ length: count }, () => '<span class="ag-cal__pip"></span>').join("")}
        </span>
      </button>`);
  }

  return `
    <section class="ag-cal__month">
      <h2 class="ag-cal__title">${esc(monthYear(first, lang))}</h2>
      <div class="ag-cal__weekdays">${weekdayInitials(lang).map((d) => `<span>${esc(d)}</span>`).join("")}</div>
      <div class="ag-cal__grid">${cells.join("")}</div>
    </section>`;
}

function renderMonth() {
  const start = firstOfMonth(todayISO());
  const months = Array.from({ length: MONTHS_AHEAD + 1 }, (_, i) => addMonths(start, i));
  return `<div class="ag-cal">${months.map(monthBlock).join("")}</div>`;
}

/* ── Disegno ──────────────────────────────────────────────────────── */

export function render() {
  const body = el("calendar-body");
  if (!ctx) return;

  if (!ctx.tasks.length) {
    body.innerHTML = emptyState(t("todo.empty.title"), t("todo.empty.note"));
  } else {
    body.innerHTML = mode === "week" ? renderWeek() : renderMonth();
  }

  for (const button of el("cal-mode").querySelectorAll("[data-mode]")) {
    button.setAttribute("aria-pressed", button.dataset.mode === mode ? "true" : "false");
  }

  onEach(body, "[data-week]", "click", (event) => {
    const step = Number(event.currentTarget.dataset.week);
    weekStart = step === 0 ? mondayOf(todayISO()) : addDays(weekStart, step * 7);
    // cambiando settimana il giorno scelto si sposta al lunedì di quella
    // nuova: se no il dettaglio sotto mostrerebbe un giorno che non è più
    // nella griglia sopra
    selectedDay = step === 0 ? todayISO() : weekStart;
    render();
    el("calendar-body").scrollTop = 0;
  });

  onEach(body, "[data-pick-day]", "click", (event) => {
    selectedDay = event.currentTarget.dataset.pickDay;
    render();
  });

  onEach(body, "[data-task]", "click", (event) => {
    onOpenTask(event.currentTarget.dataset.task);
  });

  // Dal mese si scende alla settimana di quel giorno: è il gesto naturale
  // dopo aver visto una casella carica e non aver capito perché.
  onEach(body, "[data-day]", "click", (event) => {
    selectedDay = event.currentTarget.dataset.day;
    weekStart = mondayOf(selectedDay);
    mode = "week";
    render();
    el("calendar-body").scrollTop = 0;
  });
}
