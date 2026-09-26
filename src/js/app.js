/* Agenda — orchestrazione.
 *
 * Qui vive lo stato dell'app e la schermata principale, quella che si apre
 * sempre: "Da fare". Tutto il resto (calendario, archivio, impostazioni,
 * pannello del compito, rassegna) sono livelli che si aprono sopra, e ognuno
 * ha il suo file.
 *
 * Lo stato è tre cose: le impostazioni, i compiti, gli orari. Ogni modifica
 * passa da una delle funzioni `save*` qui sotto, che scrivono e ridisegnano —
 * non esiste un pezzo di interfaccia che si aggiorna da solo senza passare da
 * qui. È una regola noiosa e fa risparmiare un pomeriggio ogni volta che
 * qualcosa non si aggiorna.
 */

import {
  today as todayISO, addDays, full, dayMonth, dowShort, dayNumber, monthYear, diffDays,
} from "./days.js";
import { t, setLang, deviceLang, getLang, apply as applyI18n } from "./i18n.js";
import {
  loadSettings, saveSettings, loadTasks, saveTasks, loadTimetables, saveTimetables,
  loadReview, saveReview, loadBackupInfo, loadShopping, saveShopping,
} from "./storage.js";
import {
  markDone, markOpen, isLate, isDone, isDropped, isOpen,
  dayLoad, loadStep, tapPart, settleParts, hasPlan, AREA_PRIVATE,
} from "./model.js";
import {
  sections, summary, countsByArea, replaceTask, removeTask, findTask, archive,
  byArea, entriesOn,
} from "./tasks.js";
import { subjectLabel, subjectColor, colorStyle } from "./subjects.js";
import {
  el, esc, toast, openLayer, closeLayer, topLayer, closeSheet, isSheetOpen,
  onEach, dot, weightTicks, checkIcon, emptyState, partItem, taskTitle,
} from "./ui.js";
import * as compose from "./compose.js";
import * as calendar from "./calendar.js";
import * as review from "./review.js";
import * as settings from "./settings.js";
import * as timetableView from "./timetable-view.js";
import * as shoppingView from "./shopping-view.js";
import { normalize as normalizeShopping } from "./shopping.js";
import * as backup from "./backup.js";

/* ── Stato ────────────────────────────────────────────────────────── */

let state = {
  settings: null,
  tasks: [],
  timetables: [],
  review: { lastReviewedOn: null },
  shopping: [],
};

/** L'ambito su cui è puntato il filtro. Non si salva: è una vista, non un dato. */
let area = "all";

/** Il giorno che l'app crede sia oggi. Serve a accorgersi della mezzanotte. */
let day = todayISO();

function ctx() {
  return { settings: state.settings, tasks: state.tasks, timetables: state.timetables };
}

/* ── Scritture ────────────────────────────────────────────────────── */

function saveTasksAndRender(tasks) {
  state.tasks = tasks;
  saveTasks(tasks);
  renderAll();
}

function saveSettingsAndRender(next) {
  state.settings = next;
  saveSettings(next);
  applyLang();
  applyTheme();
  renderAll();
}

function saveShoppingAndRender(items) {
  state.shopping = items;
  saveShopping(items);
  renderAll();
}

function saveTimetablesAndRender(list) {
  state.timetables = list;
  saveTimetables(list);
  renderAll();
}

/* ── Lingua e tema ────────────────────────────────────────────────── */

function applyLang() {
  setLang(state.settings.lang || deviceLang());
  applyI18n(document);
}

function applyTheme() {
  const forced = state.settings.theme;
  const dark = forced
    ? forced === "dark"
    : window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = dark ? "#0b1118" : "#ffffff";
}

/* ── La schermata Da fare ─────────────────────────────────────────── */

function areaName(id) {
  if (id === "all") return t("todo.filter.all");
  if (id === "school") return t("area.school");
  if (id === AREA_PRIVATE) return t("area.private");
  return state.settings.areas.find((entry) => entry.id === id)?.name ?? id;
}

function renderHeader() {
  el("today-title").textContent = full(day, getLang());
}

/* Quanti giorni mostra la striscia: oggi più i sei successivi. Una settimana
   è l'orizzonte in cui si decide quando fare un compito — oltre, la risposta
   non è "quel giorno" ma "guardo il calendario". */
const NEXT_DAYS = 7;

/**
 * L'avviso in cima. Compare solo per le due cose che non aspettano: qualcosa
 * in ritardo, o una verifica entro domani. Tutto il resto lo dice l'elenco,
 * e un avviso che c'è sempre non è un avviso.
 */
function renderUrgent() {
  const box = el("urgent");
  const s = summary(state.tasks, { today: day, area });
  const tomorrow = addDays(day, 1);
  const test = state.tasks.find((task) => isOpen(task) && task.kind === "test"
    && (task.due === day || task.due === tomorrow));
  const when = test ? (test.due === day ? t("urgent.test.today") : t("urgent.test.tomorrow")) : null;

  if (!s.late && !test) { box.hidden = true; return; }
  box.hidden = false;
  box.classList.toggle("ag-urgent--test", !s.late);
  el("urgent-text").textContent = s.late && test
    ? t("urgent.both", { n: s.late, when: test.due === day ? t("common.today").toLowerCase() : t("common.tomorrow").toLowerCase() })
    : s.late ? t("urgent.late", { n: s.late }) : when;
}

/**
 * La striscia dei prossimi giorni, col peso di ognuno.
 *
 * Non è un riepilogo: è uno strumento. Serve a rispondere alla domanda
 * "dove lo metto?", che è il problema dell'app — e a quella domanda il
 * numero di cose di oggi non risponde.
 */
function renderNext() {
  const lang = getLang();
  const days = Array.from({ length: NEXT_DAYS }, (_, i) => addDays(day, i));
  const filtered = byArea(state.tasks, area);

  el("next-days").innerHTML = days.map((d) => {
    const load = dayLoad(filtered, d);
    const step = loadStep(load);
    const n = entriesOn(filtered, d).filter((entry) => !entry.done).length;
    const hasTest = filtered.some((task) => isOpen(task) && task.kind === "test" && task.due === d);
    return `
      <button class="ag-nday ${d === day ? "ag-nday--today" : ""} ${hasTest ? "ag-nday--test" : ""}"
              type="button" data-next-day="${d}"
              style="--ag-load:var(--ag-load-${step});--ag-load-ink:var(--ag-load-ink-${step})"
              aria-label="${esc(full(d, lang))}">
        <span class="ag-nday__dow">${esc(d === day ? t("common.today") : dowShort(d, lang))}</span>
        <span class="ag-nday__n">${dayNumber(d)}</span>
        <span class="ag-nday__n2">${n || ""}</span>
      </button>`;
  }).join("");

  // `data-next-day` e non `data-day`: `data-day` è già usato dalla fila dei
  // giorni del pianificatore e dalle caselle del mese. Tre componenti con lo
  // stesso attributo funzionano finché ognuno cerca dentro il proprio
  // contenitore, ma è un incidente che aspetta di capitare.
  onEach(el("next-days"), "[data-next-day]", "click", (event) => {
    openCalendar(event.currentTarget.dataset.nextDay);
  });
}

function renderFilters() {
  const counts = countsByArea(state.tasks);
  const ids = ["all", "school", AREA_PRIVATE, ...state.settings.areas.map((a) => a.id)];
  el("filters").innerHTML = ids.map((id) => `
    <button class="ag-filter" type="button" data-filter="${esc(id)}"
            aria-pressed="${area === id ? "true" : "false"}">
      <span>${esc(areaName(id))}</span>
      ${counts[id] ? `<span class="ag-filter__n">${counts[id]}</span>` : ""}
    </button>`).join("");

  onEach(el("filters"), "[data-filter]", "click", (event) => {
    area = event.currentTarget.dataset.filter;
    renderAll();
  });
}

/** Il testo della scadenza sulla riga: quello che serve sapere a colpo
 *  d'occhio, che non è la data ma quanto tempo resta. */
function dueLabel(task) {
  if (!task.due) return null;
  const left = diffDays(day, task.due);
  if (left < 0) {
    const n = -left;
    return {
      text: n === 1 ? t("task.due.overdueone") : t("task.due.overdue", { n }),
      className: "ag-task__due--late",
    };
  }
  if (left === 0) return { text: t("common.today"), className: "ag-task__due--soon" };
  if (left === 1) return { text: t("common.tomorrow"), className: "ag-task__due--soon" };
  // Una verifica conta i giorni che mancano, fino a una settimana prima: per
  // una verifica la domanda è «quanto tempo ho per studiare», non «che giorno
  // è» (decisione del quarto giro). Oltre la settimana torna la data.
  if (task.kind === "test" && left <= 7) return { text: t("task.due.in", { n: left }), className: "" };
  if (left <= 6) {
    return { text: `${dowShort(task.due, getLang())} ${dayNumber(task.due)}`, className: "" };
  }
  return { text: dayMonth(task.due, getLang()), className: "" };
}

function taskRow(task) {
  const subject = subjectLabel(state.settings.subjects, task);
  const color = subjectColor(state.settings.subjects, task);
  const due = dueLabel(task);
  const unplanned = task.due && !hasPlan(task);

  const classes = [
    "ag-task",
    "ag-task--swipeable",
    task.kind === "test" ? "ag-task--test" : "",
    isLate(task, day) ? "ag-task--late" : "",
    isDone(task) ? "ag-task--done" : "",
  ].filter(Boolean).join(" ");

  // Un compito che si chiama come la sua materia porta il pallino davanti al
  // nome, e la riga sotto non ripete la materia (assunzione A27).
  const namedBySubject = Boolean(subject) && !task.title?.trim();
  const title = namedBySubject
    ? `<span class="ag-task__title ag-task__title--subject">${dot(colorStyle(color))}${esc(taskTitle(state.settings.subjects, task))}</span>`
    : `<span class="ag-task__title">${esc(task.title)}</span>`;

  const meta = [];
  if (subject && !namedBySubject) meta.push(`<span class="ag-task__subject">${dot(colorStyle(color))}${esc(subject)}</span>`);
  if (task.kind === "test") meta.push(`<span class="ag-task__flag ag-task__flag--test">${esc(t("kind.test"))}</span>`);
  if (due) meta.push(`<span class="${due.className}">${esc(due.text)}</span>`);
  // Le parti non sono più scritte qui ("restano: …"): stanno sotto la riga,
  // tutte, e ripeterle accanto al titolo le farebbe leggere due volte.
  if (unplanned && !isLate(task, day) && isOpen(task)) {
    meta.push(`<span class="ag-task__flag ag-task__flag--plan">${esc(t("task.plan.needed"))}</span>`);
  }
  meta.push(weightTicks(task.weight));

  return `
    <div class="${classes}" data-swipe="${esc(task.id)}">
      <button class="ag-task__main" type="button" data-open="${esc(task.id)}">
        ${title}
        <span class="ag-task__meta">${meta.join("")}</span>
      </button>
      <button class="ag-check" type="button" data-check="${esc(task.id)}"
              aria-pressed="${isDone(task) ? "true" : "false"}"
              aria-label="${esc(t("common.done"))}">${checkIcon()}</button>
      ${task.parts?.length ? `
        <ul class="ag-subparts">${task.parts.map((part) => partItem(task, part, day)).join("")}</ul>` : ""}
    </div>`;
}

function renderList() {
  const groups = sections(state.tasks, { today: day, area });
  const box = el("list");

  if (!groups.length) {
    box.innerHTML = area === "all"
      ? emptyState(t("todo.empty.title"), t("todo.empty.note"))
      : emptyState(t("todo.empty.filtered.title"), t("todo.empty.filtered.note"));
    return;
  }

  box.innerHTML = groups.map((group) => `
    <section class="ag-section ${group.key === "late" ? "ag-section--late" : ""}">
      <header class="ag-section__head">
        <span class="ag-section__title">${esc(t(`todo.section.${group.key}`))}</span>
        <span class="ag-section__n">${group.open}</span>
      </header>
      ${group.tasks.map(taskRow).join("")}
    </section>`).join("");

  onEach(box, "[data-open]", "click", (event) => openTask(event.currentTarget.dataset.open));
  onEach(box, "[data-check]", "click", (event) => tickOff(event.currentTarget.dataset.check));
  onEach(box, "[data-part]", "click", (event) => {
    const { part, partId } = event.currentTarget.dataset;
    tapPartInList(part, partId);
  });
}

function renderReviewAlert() {
  const box = el("review-alert");
  const due = review.isDue(state.tasks, state.review, day);
  box.hidden = !due;
  if (!due) return;
  const n = state.tasks.filter((task) => isLate(task, day)).length;
  el("review-alert-title").textContent = t("review.title");
  el("review-alert-note").textContent = t("review.note", { n });
  el("review-open").textContent = t("common.done");
}

/** Il promemoria della copia, una volta al mese (assunzioni A18–A20). */
function renderBackupAlert() {
  const box = el("backup-alert");
  const info = loadBackupInfo();
  const due = backup.isDue(state.tasks, info, day);
  box.hidden = !due;
  if (!due) return;
  el("backup-alert-title").textContent = t("backup.title");
  el("backup-alert-note").textContent = info.lastSavedOn
    ? t("backup.note.last", { date: dayMonth(info.lastSavedOn, getLang()) })
    : t("backup.note.never");
  el("backup-save").textContent = t("backup.save");
  el("backup-later").textContent = t("backup.later");
}

function renderAll() {
  renderHeader();
  renderUrgent();
  renderNext();
  renderFilters();
  renderReviewAlert();
  renderBackupAlert();
  renderList();
  // I livelli aperti si ridisegnano insieme al resto: se si spunta una cosa
  // dal pannello del compito, il calendario dietro non deve restare vecchio.
  if (!el("calendar-layer").hidden) calendar.render();
  if (!el("settings-layer").hidden) settings.refresh(ctx());
  if (!el("timetable-layer").hidden) timetableView.refresh(ctx());
  if (!el("shopping-layer").hidden) shoppingView.refresh(state.shopping);
  if (!el("archive-layer").hidden) renderArchive();
}

/* ── Azioni sui compiti ───────────────────────────────────────────── */

function openTask(id) {
  const task = findTask(state.tasks, id);
  if (!task) return;
  compose.openExisting(task, ctx(), taskHandlers);
}

/**
 * Com'erano le parti di un compito prima che la sua spunta le spuntasse
 * tutte. Serve a togliere la spunta e ritrovarle com'erano (assunzione A7 del
 * piano): senza, un compito con una parte fatta su tre, spuntato per sbaglio
 * e poi rimesso da fare, resterebbe con tre parti barrate. Sta in memoria e
 * non nei dati: è un "annulla" più lungo del toast, non una cosa da salvare.
 */
const partsBeforeTick = new Map();

/**
 * La spunta. La riga resta barrata al suo posto fino a mezzanotte (§6.1), e
 * il toast offre l'annulla per cinque secondi: è il tempo di accorgersi di
 * aver toccato la riga sbagliata. Dopo, basta ritoccare il cerchio.
 */
function tickOff(id) {
  const task = findTask(state.tasks, id);
  if (!task) return;
  const before = JSON.parse(JSON.stringify(task));
  let after;
  if (isDone(task)) {
    after = markOpen(task);
    const parts = partsBeforeTick.get(id);
    if (parts) after = { ...after, parts };
    partsBeforeTick.delete(id);
  } else {
    partsBeforeTick.set(id, before.parts || []);
    after = markDone(task, day);
  }
  saveTasksAndRender(replaceTask(state.tasks, after));
  toast(isDone(after) ? t("task.done.toast") : t("task.undone.toast"), {
    onUndo: () => {
      partsBeforeTick.delete(id);
      saveTasksAndRender(replaceTask(state.tasks, before));
    },
  });
}

/**
 * Il tocco sul cerchio di una parte, senza aprire il compito.
 *
 * Il toast c'è solo quando il tocco fa qualcosa di più di quello che si vede
 * sotto il dito (assunzione A8): chiude o riapre il compito, o riporta a zero
 * una parte con un numero. Negli altri casi si rimedia ritoccando lo stesso
 * cerchio, e un toast a ogni tocco sarebbe rumore.
 */
function tapPartInList(taskId, partId) {
  const task = findTask(state.tasks, taskId);
  const part = task?.parts?.find((entry) => entry.id === partId);
  if (!part) return;
  const before = JSON.parse(JSON.stringify(task));
  const after = tapPart(task, partId, state.settings.partTap, day);
  const reset = Number(part.total) > 1 && Number(part.done) > 0
    && Number(after.parts.find((entry) => entry.id === partId).done) === 0;
  // la spunta di una parte non passa da tickOff: se il compito si chiude o si
  // riapre da qui, lo stato "prima della spunta" di tickOff non vale più
  partsBeforeTick.delete(taskId);
  saveTasksAndRender(replaceTask(state.tasks, after));
  const undo = { onUndo: () => saveTasksAndRender(replaceTask(state.tasks, before)) };
  if (isDone(after) && !isDone(task)) toast(t("task.done.auto.toast"), undo);
  else if (!isDone(after) && isDone(task)) toast(t("task.undone.toast"), undo);
  else if (reset) toast(t("part.reset.toast", { title: part.title }), undo);
}

/* Ogni modifica che passa dal pannello del compito rende vecchio il ricordo
   delle parti di tickOff: ritrovarle dopo vorrebbe dire disfare quello che
   si è appena fatto nel pannello. */
const taskHandlers = {
  onSave: (task) => {
    partsBeforeTick.delete(task.id);
    // la stessa regola dell'elenco (§5.2): spuntate dal pannello tutte le
    // parti, il compito è fatto; tolta la spunta a una, non lo è più
    const before = findTask(state.tasks, task.id);
    saveTasksAndRender(replaceTask(state.tasks, settleParts(task, day, before)));
  },
  onDelete: (task) => {
    saveTasksAndRender(removeTask(state.tasks, task.id));
    toast(t("task.deleted"), {
      onUndo: () => saveTasksAndRender(replaceTask(state.tasks, task)),
    });
  },
  onDone: (task) => {
    partsBeforeTick.delete(task.id);
    saveTasksAndRender(replaceTask(state.tasks, markDone(task, day)));
    toast(t("task.done.toast"));
  },
  onReopen: (task) => {
    partsBeforeTick.delete(task.id);
    saveTasksAndRender(replaceTask(state.tasks, markOpen(task)));
    toast(t("task.undone.toast"));
  },
};

/* ── Archivio ─────────────────────────────────────────────────────── */

function renderArchive() {
  const months = archive(state.tasks, day);
  const body = el("archive-body");

  if (!months.length) {
    body.innerHTML = emptyState(t("archive.empty.title"), t("archive.empty.note"));
    return;
  }

  body.innerHTML = months.map((group) => `
    <section class="ag-section">
      <header class="ag-section__head">
        <span class="ag-section__title">${esc(monthYear(`${group.month}-01`, getLang()))}</span>
        <span class="ag-section__n">${group.tasks.length}</span>
      </header>
      ${group.tasks.map((task) => {
        const subject = subjectLabel(state.settings.subjects, task);
        const color = subjectColor(state.settings.subjects, task);
        const when = task.doneAt || task.droppedAt;
        return `
          <div class="ag-task ${isDropped(task) ? "" : "ag-task--done"}">
            <button class="ag-task__main" type="button" data-open="${esc(task.id)}">
              <span class="ag-task__title">${esc(taskTitle(state.settings.subjects, task))}</span>
              <span class="ag-task__meta">
                ${subject ? `<span class="ag-task__subject">${dot(colorStyle(color))}${esc(subject)}</span>` : ""}
                <span>${esc(dayMonth(when, getLang()))}</span>
                ${isDropped(task) ? `<span class="ag-task__flag">${esc(t("archive.dropped"))}</span>` : ""}
              </span>
            </button>
            <button class="ag-btn ag-btn--secondary ag-btn--sm ag-btn--auto" type="button"
                    data-restore="${esc(task.id)}">${esc(t("archive.restore"))}</button>
          </div>`;
      }).join("")}
    </section>`).join("");

  onEach(body, "[data-open]", "click", (event) => openTask(event.currentTarget.dataset.open));
  onEach(body, "[data-restore]", "click", (event) => {
    const task = findTask(state.tasks, event.currentTarget.dataset.restore);
    if (task) {
      saveTasksAndRender(replaceTask(state.tasks, markOpen(task)));
      toast(t("task.undone.toast"));
    }
  });
}

/* ── Livelli ──────────────────────────────────────────────────────── */

function openCalendar(onDayISO = null) {
  openLayer("calendar-layer");
  calendar.open(ctx(), { onOpenTask: (id) => openTask(id) }, onDayISO);
}

function openArchive() {
  openLayer("archive-layer");
  renderArchive();
}

function openSettings() {
  openLayer("settings-layer");
  settings.open(ctx(), {
    onSettings: (next) => saveSettingsAndRender(next),
    onTimetables: (list) => saveTimetablesAndRender(list),
    onTasks: (tasks) => saveTasksAndRender(tasks),
    // una copia scaricata dalle impostazioni fa sparire il promemoria
    onBackup: () => renderAll(),
  });
}

function openShopping() {
  openLayer("shopping-layer");
  shoppingView.open(state.shopping, { onChange: (items) => saveShoppingAndRender(items) });
}

function openTimetable() {
  openLayer("timetable-layer");
  timetableView.open(ctx(), {
    onTimetables: (list) => saveTimetablesAndRender(list),
    onSettings: (next) => saveSettingsAndRender(next),
  });
}

function openReview() {
  review.open(ctx(), {
    onUpdate: (task) => saveTasksAndRender(replaceTask(state.tasks, task)),
    onFinish: () => {
      state.review = { lastReviewedOn: day };
      saveReview(state.review);
      renderAll();
    },
  });
}

/* ── Avvio ────────────────────────────────────────────────────────── */

/* ── Spuntare scorrendo (assunzione A22) ─────────────────────────────
 *
 * Trascinando una riga verso destra si spunta: fa quello che fa il cerchio,
 * compreso rimettere da fare una riga già fatta. Il cerchio si riempie
 * quando, rilasciando, si spunterebbe: è il modo di sapere in anticipo cosa
 * succede, e di tornare indietro col dito se non era quello che si voleva.
 */

/** Prima di così è un tocco un po' mosso, non uno scorrimento. */
const SWIPE_START_PX = 12;
/** Oltre questa parte della riga, rilasciando si spunta. */
const SWIPE_FRACTION = 1 / 3;
/** Per quanto dopo uno scorrimento si ignora il click che il browser manda
 *  comunque all'elemento sotto il dito, e che aprirebbe il compito. */
const SWIPE_CLICK_MS = 400;

function bindSwipe(box) {
  let row = null;
  let startX = 0;
  let startY = 0;
  let swiping = false;
  let armed = false;
  let quietUntil = 0;

  const reset = () => {
    if (row) {
      row.style.transform = "";
      row.classList.remove("ag-task--swiping", "ag-task--armed");
    }
    row = null;
    swiping = false;
    armed = false;
  };

  box.addEventListener("pointerdown", (event) => {
    const target = event.target.closest?.("[data-swipe]");
    if (!target || event.button > 0) return;
    row = target;
    startX = event.clientX;
    startY = event.clientY;
  });

  box.addEventListener("pointermove", (event) => {
    if (!row) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (!swiping) {
      // in verticale è l'elenco che scorre: la riga non c'entra
      if (Math.abs(dy) > SWIPE_START_PX && Math.abs(dy) >= Math.abs(dx)) { reset(); return; }
      if (dx <= SWIPE_START_PX || dx < Math.abs(dy)) return;
      swiping = true;
      row.classList.add("ag-task--swiping");
      row.setPointerCapture?.(event.pointerId);
    }
    const shift = Math.max(0, dx);
    row.style.transform = `translateX(${shift}px)`;
    armed = shift > row.offsetWidth * SWIPE_FRACTION;
    row.classList.toggle("ag-task--armed", armed);
  });

  box.addEventListener("pointerup", () => {
    if (!row) return;
    const id = swiping && armed ? row.dataset.swipe : null;
    if (swiping) quietUntil = performance.now() + SWIPE_CLICK_MS;
    reset();
    if (id) tickOff(id);
  });
  box.addEventListener("pointercancel", reset);

  box.addEventListener("click", (event) => {
    if (performance.now() < quietUntil) {
      event.stopPropagation();
      event.preventDefault();
    }
  }, true);
}

function bindChrome() {
  bindSwipe(el("list"));
  // La funzione avvolta, non passata: `addEventListener` passerebbe l'oggetto
  // evento come primo argomento, e openCalendar lo prenderebbe per un giorno.
  el("open-calendar").addEventListener("click", () => openCalendar());
  el("open-shopping").addEventListener("click", openShopping);
  el("open-timetable").addEventListener("click", openTimetable);
  el("open-archive").addEventListener("click", openArchive);
  el("open-settings").addEventListener("click", openSettings);
  el("settings-back").addEventListener("click", () => settings.back());
  el("review-open").addEventListener("click", openReview);
  el("backup-save").addEventListener("click", async () => {
    if (await backup.download()) toast(t("settings.data.saved"));
    renderAll();
  });
  el("backup-later").addEventListener("click", () => {
    backup.snooze(day);
    renderAll();
  });

  el("add").addEventListener("click", () => {
    compose.openNew(ctx(), taskHandlers, { area });
  });

  el("task-save").addEventListener("click", () => compose.save());

  onEach(document, "[data-close]", "click", (event) => {
    const id = event.currentTarget.dataset.close;
    if (id === "task-layer") compose.close();
    else if (id === "review-layer") review.close();
    else closeLayer(id);
  });

  onEach(el("cal-mode"), "[data-mode]", "click", (event) => {
    calendar.setMode(event.currentTarget.dataset.mode);
  });

  el("scrim").addEventListener("click", closeSheet);

  /* Il tasto Esc su desktop, e il tasto indietro del telefono: chiudono un
     livello alla volta, dal più recente. */
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (isSheetOpen()) { closeSheet(); return; }
    const top = topLayer();
    if (top === "task-layer") compose.close();
    else if (top === "review-layer") review.close();
    // dentro una pagina delle impostazioni, Esc torna all'elenco
    else if (top === "settings-layer" && settings.back()) return;
    else if (top) closeLayer(top);
  });

  el("restore-file").addEventListener("change", async (event) => {
    const [file] = event.target.files;
    event.target.value = "";
    if (!file) return;
    try {
      const result = await backup.restore(file);
      state.settings = loadSettings();
      state.tasks = loadTasks();
      state.timetables = loadTimetables();
      state.shopping = normalizeShopping(loadShopping());
      applyLang();
      applyTheme();
      renderAll();
      settings.refresh(ctx());
      toast(t("settings.data.restored", { n: result.tasks }));
    } catch {
      toast(t("settings.data.badfile"));
    }
  });

  /* Il tema del telefono può cambiare mentre l'app è aperta (di sera, da sé). */
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (!state.settings.theme) applyTheme();
  });

  /* La mezzanotte. Un'app lasciata aperta di sera si risveglia il giorno dopo
     credendo che sia ancora ieri: "oggi" sarebbe il giorno sbagliato, gli
     arretrati non comparirebbero e la rassegna non partirebbe. Si controlla a
     ogni ritorno in primo piano, che è quando l'utente guarda. */
  const checkDay = () => {
    const now = todayISO();
    if (now === day) return;
    day = now;
    renderAll();
    maybeReview();
  };
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) checkDay();
  });
  window.addEventListener("focus", checkDay);
  scheduleMidnight(checkDay);
}

/**
 * Un timer puntato alla prossima mezzanotte (assunzione A10). Il controllo al
 * ritorno in primo piano non basta più da quando le cose fatte restano
 * nell'elenco fino a mezzanotte: con l'app aperta davanti, a mezzanotte e un
 * minuto sarebbero ancora lì. Si ripunta ogni volta, perché un timer lungo
 * ore su un telefono che dorme può arrivare in ritardo, mai in anticipo, e
 * `checkDay` guarda comunque l'orologio vero.
 */
function scheduleMidnight(onMidnight) {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
  setTimeout(() => {
    onMidnight();
    scheduleMidnight(onMidnight);
  }, next - now);
}

function maybeReview() {
  if (review.isDue(state.tasks, state.review, day)) openReview();
}

function start() {
  state.settings = loadSettings();
  state.tasks = loadTasks();
  state.timetables = loadTimetables();
  state.shopping = normalizeShopping(loadShopping());
  state.review = loadReview();
  day = todayISO();

  applyLang();
  applyTheme();
  bindChrome();
  renderAll();

  // La rassegna parte da sé: è il suo unico modo di essere utile. Chiuderla
  // resta sempre possibile.
  maybeReview();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch(() => {
      // Senza service worker l'app funziona, solo non offline: non è un
      // motivo per disturbare l'utente con un messaggio.
    });
  }
}

start();
