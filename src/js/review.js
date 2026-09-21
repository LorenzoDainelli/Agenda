/* Agenda — la rassegna degli arretrati.
 *
 * Alla prima apertura di un giorno nuovo, se qualcosa è passato di scadenza
 * senza essere fatto, l'app lo chiede: fatto, rimanda, o non serve più. Uno
 * per volta, tre risposte grandi, nessuna via di mezzo.
 *
 * Perché esiste: un compito scaduto e non fatto è l'unico stato in cui l'app
 * non sa la verità, e più giorni passano meno si riesce a ricostruirla. Se
 * nessuno lo chiede, l'elenco si riempie di cose che forse sono state fatte e
 * forse no, e un elenco di cui non si è sicuri non si guarda più.
 *
 * Si può chiudere a metà: quello che resta torna in cima all'elenco e la
 * rassegna non si ripropone lo stesso giorno. Bloccare qualcuno la mattina
 * davanti a otto domande è il modo migliore per fargli chiudere l'app.
 */

import { today as todayISO, addDays, dowShort, dayMonth, dayNumber, diffDays } from "./days.js";
import { t, getLang } from "./i18n.js";
import { markDone, markDropped, reschedule } from "./model.js";
import { lateTasks } from "./tasks.js";
import { subjectLabel, subjectColor, colorStyle } from "./subjects.js";
import { nextLessons } from "./timetable.js";
import { el, esc, openLayer, closeLayer, onEach, datePickerSheet, dot, emptyState } from "./ui.js";

let ctx = null;
let handlers = null;
let queue = [];

/** Se c'è da fare la rassegna oggi. */
export function isDue(tasks, review, today = todayISO()) {
  if (review.lastReviewedOn === today) return false;
  return lateTasks(tasks, today).length > 0;
}

export function open(context, callbacks) {
  ctx = context;
  handlers = callbacks;
  queue = lateTasks(ctx.tasks, todayISO()).map((task) => task.id);
  openLayer("review-layer");
  render();
}

export function close() {
  closeLayer("review-layer");
  // La rassegna si segna come fatta anche se chiusa a metà: la promessa è
  // "non ti chiedo la stessa cosa due volte nello stesso giorno".
  handlers.onFinish();
  queue = [];
}

function next() {
  queue.shift();
  if (queue.length === 0) {
    close();
    return;
  }
  render();
}

function render() {
  const body = el("review-body");
  const lang = getLang();
  const id = queue[0];
  const task = ctx.tasks.find((entry) => entry.id === id);

  if (!task) {
    body.innerHTML = emptyState(t("review.finished"), "");
    return;
  }

  const late = -diffDays(todayISO(), task.due);
  const subject = subjectLabel(ctx.settings.subjects, task);
  const color = subjectColor(ctx.settings.subjects, task);

  body.innerHTML = `
    <p class="ag-group__note">${esc(t("review.note", { n: queue.length }))}</p>

    <div class="ag-group">
      <div class="ag-task ag-task--late" style="pointer-events:none">
        <span class="ag-task__main">
          <span class="ag-task__title">${esc(task.title)}</span>
          <span class="ag-task__meta">
            ${subject ? `<span class="ag-task__subject">${dot(colorStyle(color))}${esc(subject)}</span>` : ""}
            <span class="ag-task__due--late">
              ${esc(late === 1 ? t("task.due.overdueone") : t("task.due.overdue", { n: late }))}
            </span>
          </span>
        </span>
      </div>
    </div>

    <div class="ag-group">
      <button class="ag-btn ag-btn--done" type="button" data-act="done">${esc(t("review.done"))}</button>
      <button class="ag-btn ag-btn--secondary" type="button" data-act="postpone">${esc(t("review.postpone"))}</button>
      <button class="ag-btn ag-btn--ghost" type="button" data-act="drop">${esc(t("review.drop"))}</button>
    </div>

    <p class="ag-group__note">${esc(t("review.left", { n: queue.length }))}</p>
  `;

  onEach(body, "[data-act]", "click", (event) => {
    const act = event.currentTarget.dataset.act;
    if (act === "done") {
      handlers.onUpdate(markDone(task, todayISO()));
      next();
    } else if (act === "drop") {
      handlers.onUpdate(markDropped(task, todayISO()));
      next();
    } else {
      postpone(task);
    }
  });
}

/** Le proposte per rimandare: domani, dopodomani, la prossima lezione di
 *  quella materia, e la scelta libera. */
function postpone(task) {
  const lang = getLang();
  const today = todayISO();
  const options = [
    { value: addDays(today, 1), label: t("common.tomorrow") },
    { value: addDays(today, 2), label: `${dowShort(addDays(today, 2), lang)} ${dayNumber(addDays(today, 2))}` },
  ];
  const [lesson] = task.subjectId ? nextLessons(ctx.timetables, task.subjectId, today, 1) : [];
  if (lesson && !options.some((opt) => opt.value === lesson)) {
    options.push({ value: lesson, label: `${dayMonth(lesson, lang)}`, note: t("task.due.next") });
  }

  const body = el("review-body");
  body.innerHTML = `
    <p class="ag-sheet__title">${esc(t("review.postpone.title"))}</p>
    <div class="ag-group">
      ${options.map((opt) => `
        <button class="ag-sheet__option" type="button" data-to="${opt.value}">
          <span>${esc(opt.label)}</span>
          ${opt.note ? `<span class="ag-row__value">${esc(opt.note)}</span>` : ""}
        </button>`).join("")}
      <button class="ag-sheet__option" type="button" data-to="pick">
        <span>${esc(t("common.other"))}</span>
      </button>
      <button class="ag-btn ag-btn--ghost" type="button" data-to="back">${esc(t("common.back"))}</button>
    </div>`;

  onEach(body, "[data-to]", "click", (event) => {
    const value = event.currentTarget.dataset.to;
    if (value === "back") { render(); return; }
    if (value === "pick") {
      datePickerSheet(task.due, {
        title: t("review.postpone.title"),
        min: addDays(todayISO(), 1),
        onPick: (iso) => {
          if (iso) { handlers.onUpdate(reschedule(task, iso)); next(); }
          else render();
        },
      });
      return;
    }
    handlers.onUpdate(reschedule(task, value));
    next();
  });
}
