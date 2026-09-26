/* Agenda — il pannello di un compito: quello nuovo e quello aperto.
 *
 * È la stessa schermata per entrambi i casi, di proposito: non c'è una
 * "schermata di creazione" e una "di modifica" da imparare separatamente. Un
 * compito nuovo è un compito vuoto.
 *
 * L'ordine dei campi non è quello del modello dati, è quello dei gesti. Nella
 * scuola si tocca la materia e si scrivono le parti, cioè quello che il
 * professore sta dettando; il resto è a tocchi, nell'ordine in cui serve
 * deciderlo, e il nome è in fondo e facoltativo: un compito senza nome si
 * chiama come la sua materia (decisione del quarto giro, assunzione A26).
 * Nel privato non c'è una materia, e il nome torna il primo campo.
 *
 * ASSUNZIONE A2 del piano: le parti stanno dentro questo pannello dall'inizio,
 * non dietro un secondo passaggio. L'utente ha chiesto "più informazioni
 * possibile in meno tempo possibile", e una parte scritta mentre il professore
 * la sta dicendo è un'informazione che non si recupera più dopo.
 */

import { today as todayISO, addDays, dowShort, dayMonth, dayNumber } from "./days.js";
import { t, getLang } from "./i18n.js";
import {
  newTask, newPart, KINDS, WEIGHTS, SLOTS, AREA_SCHOOL, AREA_PRIVATE,
  progress, isPartDone, setPartDone, reschedule, isOpen,
  windowDays, pickedDays, partDay, setPartPick,
} from "./model.js";
import { findSubject, colorStyle } from "./subjects.js";
import { nextLessons, subjectsOn } from "./timetable.js";
import {
  el, esc, openLayer, closeLayer, toast, confirmSheet, datePickerSheet, onEach,
  dot, checkIcon, openSheet, closeSheet, whenLabel, relativeDay, taskTitle,
} from "./ui.js";
import * as planner from "./planner.js";

/* Lo stato del pannello mentre è aperto. Non è lo stato dell'app: quello vive
   in app.js, e qui arriva solo quello che serve. */
let draft = null;
let isNew = false;
let ctx = null;      // { settings, timetables, tasks }
let handlers = null; // { onSave, onDelete, onDone }
/* Il testo scritto nel campo della parte nuova e non ancora aggiunto col +.
   Ogni tocco ridisegna il pannello, e senza tenerlo da parte un tocco sulla
   scadenza cancellerebbe una parte scritta a metà (assunzione A28). */
let pendingPart = "";

/* ── Apertura ─────────────────────────────────────────────────────── */

export function openNew(context, callbacks, preset = {}) {
  ctx = context;
  handlers = callbacks;
  isNew = true;
  // L'ordine conta: `preset` arriva prima, l'ambito normalizzato dopo. Con lo
  // spread in fondo, un filtro su "Tutto" faceva nascere il compito
  // nell'ambito "all", che non esiste — e il pannello restava senza materie.
  draft = newTask({ ...preset, area: (!preset.area || preset.area === "all") ? AREA_SCHOOL : preset.area });
  pendingPart = "";
  el("task-layer-title").textContent = t("task.new");
  el("task-save").textContent = t("common.add");
  openLayer("task-layer");
  render();
  // Nel privato la tastiera si apre da sé sul nome, che lì è la prima cosa da
  // scrivere. Nella scuola no: il primo gesto è toccare la materia, e una
  // tastiera aperta coprirebbe proprio le materie (assunzione A29).
  if (!isSchool()) el("task-body").querySelector("#task-title")?.focus();
}

export function openExisting(task, context, callbacks) {
  ctx = context;
  handlers = callbacks;
  isNew = false;
  draft = JSON.parse(JSON.stringify(task));
  pendingPart = "";
  el("task-layer-title").textContent = t("common.edit");
  el("task-save").textContent = t("common.save");
  openLayer("task-layer");
  render();
}

export function close() {
  closeLayer("task-layer");
  draft = null;
  ctx = null;
  pendingPart = "";
}

/* ── Disegno ──────────────────────────────────────────────────────── */

/** Prende dalla pagina quello che l'utente ha scritto, prima di ridisegnare:
 *  il nome e la parte scritta ma non ancora aggiunta. */
function readInputs() {
  const body = el("task-body");
  const input = body.querySelector("#task-title");
  if (input) draft.title = input.value;
  const part = body.querySelector("#part-new");
  if (part) pendingPart = part.value;
}

function isSchool() {
  return draft.area === AREA_SCHOOL;
}

/** Le materie da proporre: prima quelle di oggi, poi tutte le altre.
 *  È la scorciatoia che conta davvero — un compito lo si inserisce quasi
 *  sempre il giorno in cui è stato dato. */
function subjectChips() {
  const { settings, timetables } = ctx;
  if (!settings.subjects.length) {
    return `<p class="ag-group__note">${esc(t("settings.subjects.empty"))}</p>`;
  }
  const todayIds = subjectsOn(timetables, todayISO());
  const rest = settings.subjects.filter((s) => !todayIds.includes(s.id));
  const ordered = [...todayIds.map((id) => findSubject(settings.subjects, id)).filter(Boolean), ...rest];

  const chips = ordered.map((subject) => `
    <button class="ag-chip ag-chip--subject" type="button" data-subject="${esc(subject.id)}"
            aria-pressed="${draft.subjectId === subject.id ? "true" : "false"}"
            style="${colorStyle(subject.color)}">
      ${dot(colorStyle(subject.color))}
      <span>${esc(subject.name)}</span>
    </button>`);

  const label = todayIds.length ? t("task.subject.recent") : t("task.subject");
  return `
    <div class="ag-group">
      <span class="ag-group__label">${esc(label)}</span>
      <div class="ag-chips" id="subject-chips">${chips.join("")}</div>
    </div>`;
}

/** Le date proposte: le prossime lezioni di quella materia, poi domani, poi
 *  la scelta libera. Senza orario o senza materia restano domani e la scelta. */
function dueChips() {
  const lang = getLang();
  const today = todayISO();
  const proposals = [];

  if (isSchool() && draft.subjectId) {
    for (const day of nextLessons(ctx.timetables, draft.subjectId, today, 2)) {
      proposals.push({ value: day, label: `${dowShort(day, lang)} ${dayNumber(day)}`, note: t("task.due.next") });
    }
  }
  const tomorrow = addDays(today, 1);
  if (!proposals.some((p) => p.value === tomorrow)) {
    proposals.push({ value: tomorrow, label: t("common.tomorrow") });
  }
  // la scadenza già scelta deve sempre essere fra i chip, anche se non è una
  // delle proposte: se no sparirebbe dalla vista pur essendo impostata
  if (draft.due && !proposals.some((p) => p.value === draft.due)) {
    proposals.unshift({ value: draft.due, label: dayMonth(draft.due, lang) });
  }

  const chips = proposals.map((p) => `
    <button class="ag-chip" type="button" data-due="${p.value}"
            aria-pressed="${draft.due === p.value ? "true" : "false"}">
      <span>${esc(p.label)}</span>
      ${p.note ? `<span class="ag-chip__sub">${esc(p.note)}</span>` : ""}
    </button>`);

  chips.push(`
    <button class="ag-chip ag-chip--ghost" type="button" data-due="pick">
      ${esc(t("common.other"))}
    </button>`);

  if (!isSchool()) {
    chips.push(`
      <button class="ag-chip ag-chip--ghost" type="button" data-due="none"
              aria-pressed="${draft.due === null ? "true" : "false"}">
        ${esc(t("task.due.none"))}
      </button>`);
  }

  return `
    <div class="ag-group">
      <span class="ag-group__label">${esc(t("task.due"))}</span>
      <div class="ag-chips" id="due-chips">${chips.join("")}</div>
    </div>`;
}

function areaChips() {
  const areas = [
    { id: AREA_SCHOOL, name: t("area.school") },
    { id: AREA_PRIVATE, name: t("area.private") },
    ...ctx.settings.areas,
  ];
  const chips = areas.map((area) => `
    <button class="ag-chip" type="button" data-area="${esc(area.id)}"
            aria-pressed="${draft.area === area.id ? "true" : "false"}">
      ${esc(area.name)}
    </button>`);
  return `<div class="ag-chips" id="area-chips">${chips.join("")}</div>`;
}

/** Il campo del nome. Nel privato è il primo e serve; nella scuola sta in
 *  fondo, facoltativo, e da vuoto mostra il nome che il compito prenderà. */
function nameField() {
  const input = (placeholder) => `
      <input class="ag-input ${isSchool() ? "" : "ag-input--title"}" id="task-title" type="text"
             value="${esc(draft.title)}" placeholder="${esc(placeholder)}"
             enterkeyhint="done" autocomplete="off" autocapitalize="sentences">`;
  if (!isSchool()) return input(t("task.title.placeholder"));
  const subject = draft.subjectName;
  const auto = subject
    ? (draft.kind === "test" ? t("task.title.test", { subject }) : subject)
    : t("task.name.auto");
  return `
    <div class="ag-group">
      <label class="ag-group__label" for="task-title">${esc(t("task.name.optional"))}</label>
      ${input(auto)}
    </div>`;
}

function kindSeg() {
  const kinds = isSchool() ? ["homework", "test"] : ["todo"];
  if (kinds.length === 1) return "";
  return `
    <div class="ag-seg" id="kind-seg">
      ${kinds.map((kind) => `
        <button class="ag-seg__opt ${kind === "test" ? "ag-seg__opt--test" : ""}" type="button"
                data-kind="${kind}" aria-pressed="${draft.kind === kind ? "true" : "false"}">
          ${esc(t(`kind.${kind}`))}
        </button>`).join("")}
    </div>`;
}

function weightSeg() {
  return `
    <div class="ag-group">
      <span class="ag-group__label">${esc(t("weight.label"))}</span>
      <div class="ag-seg" id="weight-seg">
        ${WEIGHTS.map((w) => `
          <button class="ag-seg__opt" type="button" data-weight="${w}"
                  aria-pressed="${draft.weight === w ? "true" : "false"}">
            ${esc(t(`weight.${w}`))}
          </button>`).join("")}
      </div>
    </div>`;
}

/**
 * Il chip «quando» di una parte (§6.5): "quando?" se segue il compito, il suo
 * giorno se ne ha uno. Senza una finestra di giorni non c'è niente da
 * scegliere, e il chip non c'è (assunzione A15) — a meno che la parte un
 * giorno ce l'abbia già: allora si vede, perché è un'informazione vera.
 */
function whenChip(part, conFinestra) {
  const giorno = partDay(part);
  if (!conFinestra && !giorno) return "";
  const testo = giorno ? whenLabel(giorno, part.pick[giorno]) : t("part.when");
  // passato e non fatto: rosso, come nell'elenco (assunzione A21)
  const stato = !giorno ? "" : giorno < todayISO() && !isPartDone(part) ? "ag-part__pill--late" : "ag-part__pill--set";
  return `
    <button class="ag-part__when" type="button" data-part-when="${esc(part.id)}"
            ${conFinestra ? "" : "disabled"}>
      <span class="ag-part__pill ${stato}">${esc(testo)}</span>
    </button>`;
}

/**
 * Il foglio del chip «quando»: i giorni della finestra del compito (quelli
 * esclusi no) e i tre momenti. Un tocco sul giorno, uno sul momento, fatto.
 *
 * Il giorno parte già scelto — quello della parte, o il primo scelto per il
 * compito, o il primo della finestra — così nel caso comune basta toccare il
 * momento.
 */
function whenSheet(partId) {
  const part = draft.parts.find((entry) => entry.id === partId);
  if (!part) return;
  const today = todayISO();
  const giorni = windowDays(draft, today);
  const attuale = partDay(part);
  let scelto = giorni.includes(attuale) ? attuale
    : pickedDays(draft).find((day) => giorni.includes(day)) || giorni[0];

  const body = openSheet(`
    <p class="ag-sheet__title">${esc(t("part.when.title", { title: part.title }))}</p>
    <div class="ag-chips" id="when-days">
      ${giorni.map((day) => `
        <button class="ag-chip" type="button" data-when-day="${day}"
                aria-pressed="${day === scelto ? "true" : "false"}">${esc(relativeDay(day, today))}</button>`).join("")}
    </div>
    <div class="ag-group">
      ${SLOTS.map((slot) => `
        <button class="ag-sheet__option" type="button" data-when-slot="${slot}"
                aria-selected="${attuale && part.pick[attuale] === slot ? "true" : "false"}">
          <span>${esc(t(`slot.${slot}`))}</span>
        </button>`).join("")}
    </div>
    ${attuale ? `<button class="ag-btn ag-btn--ghost" type="button" data-when-none>${esc(t("part.when.none"))}</button>` : ""}
  `);

  onEach(body, "[data-when-day]", "click", (event) => {
    scelto = event.currentTarget.dataset.whenDay;
    for (const chip of body.querySelectorAll("[data-when-day]")) {
      chip.setAttribute("aria-pressed", chip.dataset.whenDay === scelto ? "true" : "false");
    }
  });
  onEach(body, "[data-when-slot]", "click", (event) => {
    const slot = event.currentTarget.dataset.whenSlot;
    closeSheet();
    draft = setPartPick(draft, partId, scelto, slot);
    render();
  });
  body.querySelector("[data-when-none]")?.addEventListener("click", () => {
    closeSheet();
    draft = setPartPick(draft, partId, null);
    render();
  });
}

function partsBlock() {
  const conFinestra = Boolean(draft.due) && windowDays(draft, todayISO()).length > 0;
  const rows = (draft.parts || []).map((part) => {
    const done = isPartDone(part);
    const counter = part.total > 1
      ? `
        <span class="ag-counter">
          <button class="ag-counter__btn" type="button" data-part-minus="${esc(part.id)}"
                  ${part.done <= 0 ? "disabled" : ""} aria-label="-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"/></svg>
          </button>
          <span class="ag-counter__value">${part.done}/${part.total}</span>
          <button class="ag-counter__btn" type="button" data-part-plus="${esc(part.id)}"
                  ${done ? "disabled" : ""} aria-label="+1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
          </button>
        </span>`
      : `
        <button class="ag-check" type="button" data-part-toggle="${esc(part.id)}"
                aria-pressed="${done ? "true" : "false"}" aria-label="${esc(t("common.done"))}">
          ${checkIcon()}
        </button>`;

    return `
      <div class="ag-part ${done ? "ag-part--done" : ""}">
        <span class="ag-part__main">
          <span class="ag-part__title">${esc(part.title)}</span>
          ${whenChip(part, conFinestra)}
        </span>
        ${counter}
        <button class="ag-iconbtn ag-iconbtn--plain ag-iconbtn--tight" type="button" data-part-del="${esc(part.id)}"
                aria-label="${esc(t("common.delete"))}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </div>`;
  });

  const p = progress(draft);
  // nella scuola le parti sono il compito stesso, e il titolo lo dice
  const label = isSchool() ? t("task.parts.todo") : t("task.parts");
  return `
    <div class="ag-group">
      <span class="ag-group__label">
        ${esc(label)}${p.hasParts ? ` — ${esc(t("task.progress", p))}` : ""}
      </span>
      <div class="ag-parts">${rows.join("")}</div>
      <div class="ag-row">
        <input class="ag-input ag-input--inline" id="part-new" type="text"
               value="${esc(pendingPart)}"
               placeholder="${esc(t("task.parts.placeholder"))}" enterkeyhint="done">
        <button class="ag-iconbtn" type="button" id="part-add" aria-label="${esc(t("task.parts.add"))}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
        </button>
      </div>
      <p class="ag-group__note">${esc(t("task.parts.hint"))}</p>
    </div>`;
}

function render({ keepFocus = false } = {}) {
  const body = el("task-body");
  const hadFocus = keepFocus && document.activeElement?.id;
  const caret = document.activeElement?.selectionStart ?? null;

  const plan = `
    <div class="ag-group">
      <span class="ag-group__label">${esc(t("task.window"))}</span>
      ${planner.render(draft, todayISO())}
    </div>`;

  // Due ordini, uno per ambito (§6.5): nella scuola prima la materia e le
  // parti, il nome in fondo; altrove il nome in cima, perché è tutto quello
  // che dice che cos'è.
  const fields = isSchool()
    ? [subjectChips(), partsBlock(), dueChips(), weightSeg(), plan, nameField()]
    : [dueChips(), weightSeg(), plan, partsBlock()];

  body.innerHTML = `
    <div class="ag-group">
      ${areaChips()}
      ${isSchool() ? kindSeg() : nameField()}
    </div>
    ${fields.join("")}
    ${isNew ? "" : `
      <div class="ag-group">
        ${isOpen(draft) ? `
          <button class="ag-btn ag-btn--done" type="button" id="task-done">
            ${checkIcon()} <span>${esc(t("review.done"))}</span>
          </button>` : `
          <button class="ag-btn ag-btn--secondary" type="button" id="task-reopen">
            ${esc(t("archive.restore"))}
          </button>`}
        <button class="ag-btn ag-btn--danger" type="button" id="task-delete">
          ${esc(t("common.delete"))}
        </button>
      </div>`}
  `;

  bind(body);

  if (hadFocus) {
    const again = body.querySelector(`#${hadFocus}`);
    if (again) {
      again.focus();
      if (caret !== null && again.setSelectionRange) again.setSelectionRange(caret, caret);
    }
  }
}

/* ── Gesti ────────────────────────────────────────────────────────── */

function bind(body) {
  onEach(body, "[data-area]", "click", (event) => {
    readInputs();
    const area = event.currentTarget.dataset.area;
    draft.area = area;
    if (area !== AREA_SCHOOL) {
      draft.kind = "todo";
      draft.subjectId = null;
      draft.subjectName = null;
    } else if (draft.kind === "todo") {
      draft.kind = "homework";
    }
    render();
  });

  onEach(body, "[data-kind]", "click", (event) => {
    readInputs();
    const kind = event.currentTarget.dataset.kind;
    draft.kind = KINDS.includes(kind) ? kind : draft.kind;
    render();
  });

  onEach(body, "[data-subject]", "click", (event) => {
    readInputs();
    const id = event.currentTarget.dataset.subject;
    if (draft.subjectId === id) {
      draft.subjectId = null;
      draft.subjectName = null;
    } else {
      const subject = findSubject(ctx.settings.subjects, id);
      draft.subjectId = id;
      draft.subjectName = subject?.name ?? null;
      // scegliendo la materia, se non c'è ancora una scadenza la prima
      // proposta dell'orario diventa quella: è il tocco che si risparmia
      if (!draft.due) {
        const [next] = nextLessons(ctx.timetables, id, todayISO(), 1);
        if (next) draft = reschedule(draft, next);
      }
    }
    render();
  });

  onEach(body, "[data-due]", "click", (event) => {
    readInputs();
    const value = event.currentTarget.dataset.due;
    if (value === "pick") {
      datePickerSheet(draft.due, {
        title: t("task.due.pick"),
        min: todayISO(),
        allowNone: isSchool() ? null : t("task.due.none"),
        onPick: (iso) => { draft = reschedule(draft, iso); render(); },
      });
      return;
    }
    if (value === "none") draft = reschedule(draft, null);
    else draft = reschedule(draft, draft.due === value ? null : value);
    render();
  });

  onEach(body, "[data-weight]", "click", (event) => {
    readInputs();
    draft.weight = Number(event.currentTarget.dataset.weight);
    render();
  });

  planner.bind(body, draft, todayISO(), (updated) => {
    readInputs();
    draft = { ...updated, title: draft.title };
    render();
  });

  /* Parti */
  const addPart = () => {
    const input = body.querySelector("#part-new");
    const value = input.value.trim();
    if (!value) return;
    readInputs();
    draft.parts = [...(draft.parts || []), parsePart(value)];
    pendingPart = "";
    render();
    // il cursore resta nel campo: le parti si dettano una dopo l'altra, e
    // richiudere e riaprire la tastiera a ogni parte è un gesto buttato
    el("task-body").querySelector("#part-new")?.focus();
  };

  body.querySelector("#part-add")?.addEventListener("click", addPart);
  body.querySelector("#part-new")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") { event.preventDefault(); addPart(); }
  });

  onEach(body, "[data-part-when]", "click", (event) => {
    readInputs();
    whenSheet(event.currentTarget.dataset.partWhen);
  });
  onEach(body, "[data-part-toggle]", "click", (event) => {
    readInputs();
    const id = event.currentTarget.dataset.partToggle;
    const part = draft.parts.find((p) => p.id === id);
    draft = setPartDone(draft, id, isPartDone(part) ? 0 : part.total);
    render();
  });
  onEach(body, "[data-part-plus]", "click", (event) => {
    readInputs();
    const id = event.currentTarget.dataset.partPlus;
    const part = draft.parts.find((p) => p.id === id);
    draft = setPartDone(draft, id, part.done + 1);
    render();
  });
  onEach(body, "[data-part-minus]", "click", (event) => {
    readInputs();
    const id = event.currentTarget.dataset.partMinus;
    const part = draft.parts.find((p) => p.id === id);
    draft = setPartDone(draft, id, part.done - 1);
    render();
  });
  onEach(body, "[data-part-del]", "click", (event) => {
    readInputs();
    const id = event.currentTarget.dataset.partDel;
    draft.parts = draft.parts.filter((p) => p.id !== id);
    render();
  });

  /* Azioni su un compito che esiste già */
  body.querySelector("#task-done")?.addEventListener("click", () => {
    readInputs();
    handlers.onDone(draft);
    close();
  });
  body.querySelector("#task-reopen")?.addEventListener("click", () => {
    readInputs();
    handlers.onReopen(draft);
    close();
  });
  body.querySelector("#task-delete")?.addEventListener("click", () => {
    readInputs();
    confirmSheet(t("task.delete.confirm", { title: taskTitle(ctx.settings.subjects, draft) }), {
      onConfirm: () => { handlers.onDelete(draft); close(); },
    });
  });
}

/** "5 frasi" o "2 esercizi": il numero davanti diventa la quantità, il resto
 *  il nome. È l'unico pezzo di interpretazione del testo in tutta l'app, e sta
 *  qui perché è come si scrivono i compiti sul diario. */
function parsePart(value) {
  const match = value.match(/^(\d{1,3})\s+(.+)$/);
  return match ? newPart(match[2], Number(match[1])) : newPart(value, 1);
}

/** Il pulsante in fondo: salva e chiude.
 *  Nel privato serve un nome; nella scuola basta la materia (A30). */
export function save() {
  if (!draft) return;
  readInputs();
  draft.title = draft.title.trim();
  // una parte scritta e non aggiunta col + è una parte: toccare Aggiungi
  // non deve buttarla (A28, e regola 4: mai perdere dati in silenzio)
  if (pendingPart.trim()) {
    draft.parts = [...(draft.parts || []), parsePart(pendingPart.trim())];
    pendingPart = "";
  }
  const named = draft.title || (isSchool() && draft.subjectName);
  if (!named) {
    toast(t(isSchool() ? "task.needname" : "task.needtitle"));
    // senza materia, il posto giusto dove guardare sono le materie; il campo
    // del nome sta in fondo e la tastiera le coprirebbe
    if (!isSchool()) el("task-body").querySelector("#task-title")?.focus();
    return;
  }
  handlers.onSave(draft, { isNew });
  close();
}

export function isOpenPanel() {
  return Boolean(draft);
}
