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
  today as todayISO, addDays, mondayOf, dow, dayNumber, monthKey, firstOfMonth,
  addMonths, daysInMonth, dowShort, monthYear, dayMonth, weekdayInitials,
} from "./days.js";
import { t, getLang } from "./i18n.js";
import { dayLoad, loadStep, isDone, isOpen } from "./model.js";
import { onDayBySlot, unplannedOn } from "./tasks.js";
import { subjectColor, colorStyle } from "./subjects.js";
import { el, esc, onEach, emptyState } from "./ui.js";

/* Quanti mesi mostra la vista mese: da questo mese a undici mesi avanti.
   Un anno è l'orizzonte oltre il quale non c'è niente da vedere, perché non
   esistono compiti dati con un anno di anticipo. */
const MONTHS_AHEAD = 11;

let mode = "week";
let weekStart = null;
let ctx = null;
let onOpenTask = null;

export function open(context, callbacks) {
  ctx = context;
  onOpenTask = callbacks.onOpenTask;
  weekStart = mondayOf(todayISO());
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

/* ── Vista settimana ──────────────────────────────────────────────── */

function pellet(task, day) {
  const color = subjectColor(ctx.settings.subjects, task);
  const classes = [
    "ag-pellet",
    task.kind === "test" ? "ag-pellet--test" : "",
    isDone(task) ? "ag-pellet--done" : "",
  ].filter(Boolean).join(" ");
  return `
    <button class="${classes}" type="button" data-task="${esc(task.id)}">
      ${task.kind === "test" ? "" : `<span class="ag-dot" style="${colorStyle(color)}" aria-hidden="true"></span>`}
      <span class="ag-pellet__title">${esc(task.title)}</span>
    </button>`;
}

function weekDay(day) {
  const lang = getLang();
  const bySlot = onDayBySlot(ctx.tasks, day);
  const unplanned = unplannedOn(ctx.tasks, day);
  const load = dayLoad(ctx.tasks, day);
  const step = loadStep(load);
  const isToday = day === todayISO();

  const slots = ["morning", "afternoon", "evening"]
    .filter((slot) => bySlot[slot].length > 0)
    .map((slot) => `
      <div class="ag-slot">
        <span class="ag-slot__label">${esc(t(`slot.${slot}`))}</span>
        ${bySlot[slot].map((task) => pellet(task, day)).join("")}
      </div>`);

  if (unplanned.length) {
    slots.push(`
      <div class="ag-slot">
        <span class="ag-slot__label">${esc(t("cal.unplanned"))}</span>
        ${unplanned.map((task) => pellet(task, day)).join("")}
      </div>`);
  }

  const body = slots.length
    ? `<div class="ag-wday__slots">${slots.join("")}</div>`
    : `<span class="ag-slot__label">${esc(t("cal.nothing"))}</span>`;

  return `
    <section class="ag-wday ${isToday ? "ag-wday--today" : ""}" style="${loadStyle(step)}">
      <header class="ag-wday__head">
        <span class="ag-wday__dow">${esc(dowShort(day, lang))}</span>
        <span class="ag-wday__n">${dayNumber(day)}</span>
        ${load ? `<span class="ag-wday__load">${esc(t("cal.load", { n: load }))}</span>` : ""}
      </header>
      ${body}
    </section>`;
}

function renderWeek() {
  const lang = getLang();
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const from = dayMonth(days[0], lang);
  const to = dayMonth(days[6], lang);
  const isThis = weekStart === mondayOf(todayISO());

  return `
    <div class="ag-week">
      <div class="ag-week__nav">
        <button class="ag-iconbtn" type="button" data-week="-1" aria-label="${esc(t("common.back"))}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>
        </button>
        <span class="ag-week__range">${esc(from)} – ${esc(to)}</span>
        <button class="ag-iconbtn" type="button" data-week="1" aria-label="${esc(t("cal.week"))}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>
        </button>
      </div>
      ${isThis ? "" : `<button class="ag-btn ag-btn--secondary ag-btn--sm" type="button" data-week="0">${esc(t("cal.thisweek"))}</button>`}
      ${days.map(weekDay).join("")}
      <p class="ag-group__note">${esc(t("cal.readonly"))}</p>
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
    render();
    el("calendar-body").scrollTop = 0;
  });

  onEach(body, "[data-task]", "click", (event) => {
    onOpenTask(event.currentTarget.dataset.task);
  });

  // Dal mese si scende alla settimana di quel giorno: è il gesto naturale
  // dopo aver visto una casella carica e non aver capito perché.
  onEach(body, "[data-day]", "click", (event) => {
    weekStart = mondayOf(event.currentTarget.dataset.day);
    mode = "week";
    render();
    el("calendar-body").scrollTop = 0;
  });
}
