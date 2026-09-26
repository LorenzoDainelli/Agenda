/* Agenda — impostazioni (§6.4).
 *
 * Divise in pagine, come le Impostazioni dell'iPhone: la prima è un elenco
 * corto, e ogni riga dice a destra come stanno le cose, così spesso non serve
 * nemmeno aprirla. Prima erano una pagina sola lunga tre schermate, con
 * l'orario in mezzo, e per cambiare il tema bisognava scorrerle tutte.
 *
 * L'orario vero non sta più qui: ha il suo pulsante nella testata
 * (timetable-view.js). Qui resta solo l'interruttore per tornare a
 * modificarlo quando è definitivo, che è apposta lontano dalla griglia (A31).
 */

import { today as todayISO, diffDays } from "./days.js";
import { t, LANGS } from "./i18n.js";
import { newId, AREA_PRIVATE, PART_TAP } from "./model.js";
import { COLORS, newSubject, colorStyle, suggestShort, findSubject, countUsing, nextColor } from "./subjects.js";
import { countInArea, moveArea } from "./tasks.js";
import { loadBackupInfo } from "./storage.js";
import {
  el, esc, onEach, toast, confirmSheet, openSheet, closeSheet, dot, chevron,
} from "./ui.js";
import * as backup from "./backup.js";

let ctx = null;
let handlers = null;
/** La pagina aperta. `null` = l'elenco. */
let page = null;

/** Le pagine, nell'ordine dell'elenco: prima quello che si tocca più spesso,
 *  in fondo la copia di sicurezza (decisione del quarto giro). Ogni gruppo è
 *  un riquadro a sé. */
const PAGE_GROUPS = [["look"], ["subjects", "areas", "tasks", "timetable"], ["data"]];

export function open(context, callbacks) {
  ctx = context;
  handlers = callbacks;
  // si riparte sempre dall'elenco: riaprire le impostazioni su una pagina
  // lasciata aperta giorni prima farebbe cercare la strada (A34)
  page = null;
  render();
}

export function refresh(context) {
  if (!ctx) return;
  ctx = context;
  render();
}

/* ── Materie ──────────────────────────────────────────────────────── */

function subjectsGroup() {
  const { subjects } = ctx.settings;
  const rows = subjects.map((subject) => `
    <button class="ag-row ag-row--tap" type="button" data-subject="${esc(subject.id)}">
      ${dot(colorStyle(subject.color))}
      <span class="ag-row__label">${esc(subject.name)}</span>
      <span class="ag-row__value">${esc(subject.short)}</span>
      ${chevron()}
    </button>`);

  return `
    <div class="ag-group">
      ${rows.length ? `<div class="ag-rows">${rows.join("")}</div>` : `<p class="ag-group__note">${esc(t("settings.subjects.empty"))}</p>`}
      <div class="ag-row">
        <input class="ag-input ag-input--inline" id="subject-new" type="text"
               placeholder="${esc(t("settings.subjects.add"))}" enterkeyhint="done" autocapitalize="words">
        <button class="ag-iconbtn" type="button" id="subject-add" aria-label="${esc(t("common.add"))}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
        </button>
      </div>
      <p class="ag-group__note">${esc(t("settings.subjects.note"))}</p>
    </div>`;
}

/** Il pannello di una materia: nome, sigla, colore, elimina. */
function editSubject(id) {
  const subject = findSubject(ctx.settings.subjects, id);
  if (!subject) return;
  const using = countUsing(ctx.tasks, id);

  const body = openSheet(`
    <p class="ag-sheet__title">${esc(subject.name)}</p>
    <div class="ag-group">
      <div class="ag-row">
        <span class="ag-row__label">${esc(t("settings.subjects.name"))}</span>
        <input class="ag-input ag-input--inline" id="s-name" type="text" value="${esc(subject.name)}"
               style="width:52%" autocapitalize="words">
      </div>
      <div class="ag-row">
        <span class="ag-row__label">${esc(t("settings.subjects.short"))}</span>
        <input class="ag-input ag-input--inline" id="s-short" type="text" value="${esc(subject.short)}"
               maxlength="4" style="width:32%;text-align:center;text-transform:uppercase">
      </div>
      <span class="ag-group__label">${esc(t("settings.subjects.color"))}</span>
      <div class="ag-chips ag-chips--wrap">
        ${COLORS.map((color) => `
          <button class="ag-chip ag-chip--subject" type="button" data-color="${color}"
                  aria-pressed="${subject.color === color ? "true" : "false"}"
                  style="${colorStyle(color)}" aria-label="${color}">
            ${dot(colorStyle(color))}
          </button>`).join("")}
      </div>
      <button class="ag-btn" type="button" data-act="save">${esc(t("common.save"))}</button>
      <button class="ag-btn ag-btn--danger" type="button" data-act="del">${esc(t("common.delete"))}</button>
    </div>
  `);

  let color = subject.color;
  onEach(body, "[data-color]", "click", (event) => {
    color = event.currentTarget.dataset.color;
    for (const chip of body.querySelectorAll("[data-color]")) {
      chip.setAttribute("aria-pressed", chip.dataset.color === color ? "true" : "false");
    }
  });

  body.querySelector('[data-act="save"]').addEventListener("click", () => {
    const name = body.querySelector("#s-name").value.trim() || subject.name;
    const short = body.querySelector("#s-short").value.trim().toUpperCase() || suggestShort(name);
    handlers.onSettings({
      ...ctx.settings,
      subjects: ctx.settings.subjects.map((entry) =>
        entry.id === id ? { ...entry, name, short, color } : entry),
    });
    closeSheet();
  });

  body.querySelector('[data-act="del"]').addEventListener("click", () => {
    closeSheet();
    confirmSheet(t("settings.subjects.delete.confirm", { name: subject.name, n: using }), {
      onConfirm: () => {
        handlers.onSettings({
          ...ctx.settings,
          subjects: ctx.settings.subjects.filter((entry) => entry.id !== id),
        });
      },
    });
  });
}

/* ── Orario ───────────────────────────────────────────────────────── */

/** Dice com'è l'orario. Da definitivo, è l'unico posto da cui si torna a
 *  modificarlo (decisione del quarto giro). */
function timetableGroup() {
  const none = !ctx.timetables.length;
  const final = Boolean(ctx.settings.timetableFinal);
  const note = none ? "settings.timetable.none.note"
    : final ? "settings.timetable.final.note" : "settings.timetable.draft.note";
  return `
    <div class="ag-group">
      <p class="ag-group__note">${esc(t(note))}</p>
      ${final ? `
        <button class="ag-btn ag-btn--secondary" type="button" id="tt-unlock">
          ${esc(t("settings.timetable.unlock"))}
        </button>` : ""}
    </div>`;
}

/* ── Ambiti ───────────────────────────────────────────────────────── */

function areasGroup() {
  const fixed = [
    { id: "school", name: t("area.school") },
    { id: AREA_PRIVATE, name: t("area.private") },
  ];
  const rows = [
    ...fixed.map((area) => `
      <div class="ag-row">
        <span class="ag-row__label">${esc(area.name)}</span>
        <span class="ag-row__value">${esc(t("settings.areas.fixed"))}</span>
      </div>`),
    ...ctx.settings.areas.map((area) => `
      <div class="ag-row">
        <span class="ag-row__label">${esc(area.name)}</span>
        <span class="ag-row__value">${countInArea(ctx.tasks, area.id)}</span>
        <button class="ag-iconbtn ag-iconbtn--plain ag-iconbtn--tight" type="button" data-area-del="${esc(area.id)}"
                aria-label="${esc(t("common.delete"))}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </div>`),
  ];

  return `
    <div class="ag-group">
      <div class="ag-rows">${rows.join("")}</div>
      <div class="ag-row">
        <input class="ag-input ag-input--inline" id="area-new" type="text"
               placeholder="${esc(t("settings.areas.add"))}" enterkeyhint="done" autocapitalize="words">
        <button class="ag-iconbtn" type="button" id="area-add" aria-label="${esc(t("common.add"))}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
        </button>
      </div>
    </div>`;
}

/* ── Dati ─────────────────────────────────────────────────────────── */

function dataGroup() {
  return `
    <div class="ag-group">
      <button class="ag-btn ag-btn--secondary" type="button" id="data-download">
        ${esc(t("settings.data.download"))}
      </button>
      <button class="ag-btn ag-btn--secondary" type="button" id="data-restore">
        ${esc(t("settings.data.restore"))}
      </button>
      <p class="ag-group__note">${esc(backupAge("last"))} ${esc(t("settings.data.note"))}</p>
    </div>`;
}

/** Di quando è l'ultima copia scaricata da questo telefono, in due forme:
 *  corta per la riga dell'elenco ("age"), come frase nella pagina ("last"). */
function backupAge(form) {
  const { lastSavedOn } = loadBackupInfo();
  if (!lastSavedOn) return t(`settings.data.${form}.never`);
  const n = diffDays(lastSavedOn, todayISO());
  if (n <= 0) return t(`settings.data.${form}.today`);
  if (n === 1) return t(`settings.data.${form}.yesterday`);
  return t(`settings.data.${form}.days`, { n });
}

/* ── Compiti ──────────────────────────────────────────────────────── */

function tasksGroup() {
  const partTap = ctx.settings.partTap;
  return `
    <div class="ag-group">
      <span class="ag-group__label">${esc(t("settings.parttap"))}</span>
      <div class="ag-seg" id="parttap-seg">
        ${PART_TAP.map((mode) => `
          <button class="ag-seg__opt" type="button" data-parttap="${mode}" aria-pressed="${partTap === mode ? "true" : "false"}">
            ${esc(t(`settings.parttap.${mode}`))}
          </button>`).join("")}
      </div>
      <p class="ag-group__note">${esc(t("settings.parttap.note"))}</p>
    </div>`;
}

/* ── Aspetto ──────────────────────────────────────────────────────── */

/** Tema e lingua, in quest'ordine: il tema si cambia, la lingua quasi mai. */
function lookGroup() {
  const { lang, theme } = ctx.settings;
  return `
    <div class="ag-group">
      <span class="ag-group__label">${esc(t("settings.theme"))}</span>
      <div class="ag-seg" id="theme-seg">
        <button class="ag-seg__opt" type="button" data-theme="" aria-pressed="${!theme ? "true" : "false"}">
          ${esc(t("settings.theme.auto"))}
        </button>
        <button class="ag-seg__opt" type="button" data-theme="light" aria-pressed="${theme === "light" ? "true" : "false"}">
          ${esc(t("settings.theme.light"))}
        </button>
        <button class="ag-seg__opt" type="button" data-theme="dark" aria-pressed="${theme === "dark" ? "true" : "false"}">
          ${esc(t("settings.theme.dark"))}
        </button>
      </div>
    </div>

    <div class="ag-group">
      <span class="ag-group__label">${esc(t("settings.lang"))}</span>
      <div class="ag-seg" id="lang-seg">
        <button class="ag-seg__opt" type="button" data-lang="" aria-pressed="${!lang ? "true" : "false"}">
          ${esc(t("settings.lang.auto"))}
        </button>
        ${LANGS.map((code) => `
          <button class="ag-seg__opt" type="button" data-lang="${code}" aria-pressed="${lang === code ? "true" : "false"}">
            ${code.toUpperCase()}
          </button>`).join("")}
      </div>
      <p class="ag-group__note">${esc(t("settings.look.note"))}</p>
    </div>`;
}

/* ── L'elenco ─────────────────────────────────────────────────────── */

/** Quello che ogni riga dice a destra (A34). */
function pageValue(id) {
  const { settings, timetables } = ctx;
  switch (id) {
    case "look": {
      const parts = [];
      if (settings.theme) parts.push(t(`settings.theme.${settings.theme}`));
      if (settings.lang) parts.push(settings.lang.toUpperCase());
      return parts.length ? parts.join(" · ") : t("settings.theme.auto");
    }
    case "subjects": return String(settings.subjects.length);
    case "areas": return String(2 + settings.areas.length);
    case "tasks": return t(`settings.parttap.${settings.partTap}`);
    case "timetable":
      if (!timetables.length) return t("settings.timetable.state.none");
      return t(settings.timetableFinal ? "settings.timetable.state.final" : "settings.timetable.state.draft");
    case "data": return backupAge("age");
    default: return "";
  }
}

function listPage() {
  return PAGE_GROUPS.map((group) => `
    <div class="ag-rows">
      ${group.map((id) => `
        <button class="ag-row ag-row--tap" type="button" data-page="${id}">
          <span class="ag-row__label">${esc(t(`settings.${id}`))}</span>
          <span class="ag-row__value">${esc(pageValue(id))}</span>
          ${chevron()}
        </button>`).join("")}
    </div>`).join("");
}

const PAGES = {
  look: lookGroup,
  subjects: subjectsGroup,
  areas: areasGroup,
  tasks: tasksGroup,
  timetable: timetableGroup,
  data: dataGroup,
};

/** Torna all'elenco. Dice se c'era una pagina da cui tornare: se no, il tasto
 *  Esc chiude le impostazioni come gli altri livelli. */
export function back() {
  if (!page) return false;
  showPage(null);
  return true;
}

function showPage(next) {
  page = next;
  render();
  // una pagina nuova si legge dall'alto, non dal punto in cui era l'elenco
  el("settings-body").scrollTop = 0;
}

/* ── Disegno ──────────────────────────────────────────────────────── */

export function render() {
  const body = el("settings-body");
  body.innerHTML = page ? PAGES[page]() : listPage();

  // la testata: il nome della pagina, e la freccia per tornare all'elenco
  el("settings-title").textContent = t(page ? `settings.${page}` : "settings.title");
  el("settings-back").hidden = !page;

  onEach(body, "[data-page]", "click", (event) => showPage(event.currentTarget.dataset.page));

  /* Materie */
  const addSubject = () => {
    const input = body.querySelector("#subject-new");
    const name = input.value.trim();
    if (!name) return;
    handlers.onSettings({
      ...ctx.settings,
      subjects: [...ctx.settings.subjects, newSubject(name, ctx.settings.subjects)],
    });
  };
  body.querySelector("#subject-add")?.addEventListener("click", addSubject);
  body.querySelector("#subject-new")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") { event.preventDefault(); addSubject(); }
  });
  onEach(body, "[data-subject]", "click", (event) => editSubject(event.currentTarget.dataset.subject));

  /* Orario: da definitivo torna modificabile. Nessuna conferma, perché non
     si perde niente (A32). */
  body.querySelector("#tt-unlock")?.addEventListener("click", () => {
    handlers.onSettings({ ...ctx.settings, timetableFinal: false });
    toast(t("settings.timetable.unlocked"));
  });

  /* Ambiti */
  const addArea = () => {
    const input = body.querySelector("#area-new");
    const name = input.value.trim();
    if (!name) return;
    handlers.onSettings({
      ...ctx.settings,
      areas: [...ctx.settings.areas, { id: newId("a"), name, color: nextColor(ctx.settings.areas) }],
    });
  };
  body.querySelector("#area-add")?.addEventListener("click", addArea);
  body.querySelector("#area-new")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") { event.preventDefault(); addArea(); }
  });
  onEach(body, "[data-area-del]", "click", (event) => {
    const id = event.currentTarget.dataset.areaDel;
    const area = ctx.settings.areas.find((entry) => entry.id === id);
    const n = countInArea(ctx.tasks, id);
    confirmSheet(t("settings.areas.delete.confirm", { name: area?.name ?? "", n }), {
      onConfirm: () => {
        handlers.onTasks(moveArea(ctx.tasks, id));
        handlers.onSettings({
          ...ctx.settings,
          areas: ctx.settings.areas.filter((entry) => entry.id !== id),
        });
      },
    });
  });

  /* Dati */
  body.querySelector("#data-download")?.addEventListener("click", async () => {
    const saved = await backup.download();
    if (saved) toast(t("settings.data.saved"));
    handlers.onBackup?.();
  });
  body.querySelector("#data-restore")?.addEventListener("click", () => {
    el("restore-file").click();
  });

  /* Parti con un numero, lingua e tema */
  onEach(body, "[data-parttap]", "click", (event) => {
    handlers.onSettings({ ...ctx.settings, partTap: event.currentTarget.dataset.parttap });
  });
  onEach(body, "[data-lang]", "click", (event) => {
    handlers.onSettings({ ...ctx.settings, lang: event.currentTarget.dataset.lang || null });
  });
  onEach(body, "[data-theme]", "click", (event) => {
    handlers.onSettings({ ...ctx.settings, theme: event.currentTarget.dataset.theme || null });
  });
}
