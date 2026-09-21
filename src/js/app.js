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
  loadReview, saveReview,
} from "./storage.js";
import {
  markDone, markOpen, isLate, isDone, isDropped, isOpen, isPartDone, progress,
  dayLoad, loadStep, AREA_PRIVATE,
} from "./model.js";
import {
  sections, summary, countsByArea, replaceTask, removeTask, findTask, archive,
  byArea, onDay,
} from "./tasks.js";
import { subjectLabel, subjectColor, colorStyle } from "./subjects.js";
import {
  el, esc, toast, openLayer, closeLayer, topLayer, closeSheet, isSheetOpen,
  onEach, dot, weightTicks, checkIcon, emptyState,
} from "./ui.js";
import * as compose from "./compose.js";
import * as calendar from "./calendar.js";
import * as review from "./review.js";
import * as settings from "./settings.js";
import * as backup from "./backup.js";

/* ── Stato ────────────────────────────────────────────────────────── */

let state = {
  settings: null,
  tasks: [],
  timetables: [],
  review: { lastReviewedOn: null },
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
    const n = onDay(filtered, d).filter(isOpen).length;
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
  if (left <= 6) {
    return { text: `${dowShort(task.due, getLang())} ${dayNumber(task.due)}`, className: "" };
  }
  return { text: dayMonth(task.due, getLang()), className: "" };
}

/**
 * Cosa resta da fare di un compito con parti.
 *
 * Al massimo due nomi: con tre o più la riga diventa un paragrafo, e allora
 * il conto è più utile del dettaglio. Una parte lasciata a metà porta anche
 * il suo numero, perché "3 di 5 frasi" e "0 di 5 frasi" sono due situazioni
 * molto diverse.
 */
function remainingLabel(task) {
  const parts = (task.parts || []).filter((part) => !isPartDone(part));
  if (parts.length === 0) return null;
  if (parts.length > 2) return t("task.progress", progress(task));
  const nomi = parts.map((part) =>
    part.total > 1 && part.done > 0 ? `${part.title} ${part.done}/${part.total}` : part.title);
  return t("task.remaining", { what: nomi.join(", ") });
}

function taskRow(task) {
  const subject = subjectLabel(state.settings.subjects, task);
  const color = subjectColor(state.settings.subjects, task);
  const due = dueLabel(task);
  const p = progress(task);
  const unplanned = task.due && Object.keys(task.plan?.pick || {}).length === 0;

  const classes = [
    "ag-task",
    task.kind === "test" ? "ag-task--test" : "",
    isLate(task, day) ? "ag-task--late" : "",
    isDone(task) ? "ag-task--done" : "",
  ].filter(Boolean).join(" ");

  const meta = [];
  if (subject) meta.push(`<span class="ag-task__subject">${dot(colorStyle(color))}${esc(subject)}</span>`);
  if (task.kind === "test") meta.push(`<span class="ag-task__flag ag-task__flag--test">${esc(t("kind.test"))}</span>`);
  if (due) meta.push(`<span class="${due.className}">${esc(due.text)}</span>`);
  // Non "0 di 2" ma il nome di quello che manca: la domanda vera non è
  // quante parti restano, è QUALI.
  const resta = remainingLabel(task);
  if (resta) meta.push(`<span>${esc(resta)}</span>`);
  if (unplanned && !isLate(task, day)) {
    meta.push(`<span class="ag-task__flag ag-task__flag--plan">${esc(t("task.plan.needed"))}</span>`);
  }
  meta.push(weightTicks(task.weight));

  return `
    <div class="${classes}">
      <button class="ag-task__main" type="button" data-open="${esc(task.id)}">
        <span class="ag-task__title">${esc(task.title)}</span>
        <span class="ag-task__meta">${meta.join("")}</span>
        ${p.hasParts && p.done > 0 && p.done < p.total ? `
          <span class="ag-progress"><span class="ag-progress__fill" style="width:${(p.done / p.total) * 100}%"></span></span>` : ""}
      </button>
      <button class="ag-check" type="button" data-check="${esc(task.id)}"
              aria-pressed="${isDone(task) ? "true" : "false"}"
              aria-label="${esc(t("common.done"))}">${checkIcon()}</button>
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
        <span class="ag-section__n">${group.tasks.length}</span>
      </header>
      ${group.tasks.map(taskRow).join("")}
    </section>`).join("");

  onEach(box, "[data-open]", "click", (event) => openTask(event.currentTarget.dataset.open));
  onEach(box, "[data-check]", "click", (event) => tickOff(event.currentTarget.dataset.check));
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

function renderAll() {
  renderHeader();
  renderUrgent();
  renderNext();
  renderFilters();
  renderReviewAlert();
  renderList();
  // I livelli aperti si ridisegnano insieme al resto: se si spunta una cosa
  // dal pannello del compito, il calendario dietro non deve restare vecchio.
  if (!el("calendar-layer").hidden) calendar.render();
  if (!el("settings-layer").hidden) settings.refresh(ctx());
  if (!el("archive-layer").hidden) renderArchive();
}

/* ── Azioni sui compiti ───────────────────────────────────────────── */

function openTask(id) {
  const task = findTask(state.tasks, id);
  if (!task) return;
  compose.openExisting(task, ctx(), taskHandlers);
}

/**
 * La spunta. La riga resta barrata e il toast offre l'annulla per cinque
 * secondi: è il tempo di accorgersi di aver toccato la riga sbagliata.
 */
function tickOff(id) {
  const task = findTask(state.tasks, id);
  if (!task) return;
  const before = JSON.parse(JSON.stringify(task));
  const after = isDone(task) ? markOpen(task) : markDone(task, day);
  saveTasksAndRender(replaceTask(state.tasks, after));
  toast(isDone(after) ? t("task.done.toast") : t("task.undone.toast"), {
    onUndo: () => saveTasksAndRender(replaceTask(state.tasks, before)),
  });
}

const taskHandlers = {
  onSave: (task) => {
    saveTasksAndRender(replaceTask(state.tasks, task));
  },
  onDelete: (task) => {
    saveTasksAndRender(removeTask(state.tasks, task.id));
    toast(t("task.deleted"), {
      onUndo: () => saveTasksAndRender(replaceTask(state.tasks, task)),
    });
  },
  onDone: (task) => {
    saveTasksAndRender(replaceTask(state.tasks, markDone(task, day)));
    toast(t("task.done.toast"));
  },
  onReopen: (task) => {
    saveTasksAndRender(replaceTask(state.tasks, markOpen(task)));
    toast(t("task.undone.toast"));
  },
};

/* ── Archivio ─────────────────────────────────────────────────────── */

function renderArchive() {
  const months = archive(state.tasks);
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
              <span class="ag-task__title">${esc(task.title)}</span>
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

function bindChrome() {
  // La funzione avvolta, non passata: `addEventListener` passerebbe l'oggetto
  // evento come primo argomento, e openCalendar lo prenderebbe per un giorno.
  el("open-calendar").addEventListener("click", () => openCalendar());
  el("open-archive").addEventListener("click", openArchive);
  el("open-settings").addEventListener("click", openSettings);
  el("review-open").addEventListener("click", openReview);

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
}

function maybeReview() {
  if (review.isDue(state.tasks, state.review, day)) openReview();
}

function start() {
  state.settings = loadSettings();
  state.tasks = loadTasks();
  state.timetables = loadTimetables();
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
