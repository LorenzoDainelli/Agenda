/* Agenda — impostazioni.
 *
 * Quattro gruppi: materie, orario, ambiti, i tuoi dati. Più lingua e tema, che
 * stanno in fondo perché si toccano una volta sola.
 *
 * L'orario è la parte più grossa e la sola che ha una forma sua: vedi
 * timetable.js per il perché è un elenco di griglie e non una griglia.
 */

import { today as todayISO, dayMonth, dowShort, addDays, mondayOf } from "./days.js";
import { t, getLang, LANGS } from "./i18n.js";
import { newId, AREA_PRIVATE } from "./model.js";
import { COLORS, newSubject, colorStyle, suggestShort, findSubject, countUsing, nextColor } from "./subjects.js";
import {
  createNext, timetableFor, blocksOf, setBlock, countHours,
} from "./timetable.js";
import { countInArea, moveArea } from "./tasks.js";
import {
  el, esc, onEach, toast, confirmSheet, chooseSheet, openSheet, closeSheet, dot, chevron,
} from "./ui.js";
import * as backup from "./backup.js";

let ctx = null;
let handlers = null;
/** Quale settimana dell'orario si sta guardando. `null` = quella di oggi. */
let ttWeek = null;

export function open(context, callbacks) {
  ctx = context;
  handlers = callbacks;
  ttWeek = null;
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
    <div class="ag-row ag-row--tap" data-subject="${esc(subject.id)}">
      ${dot(colorStyle(subject.color))}
      <span class="ag-row__label">${esc(subject.name)}</span>
      <span class="ag-row__value">${esc(subject.short)}</span>
      ${chevron()}
    </div>`);

  return `
    <div class="ag-group">
      <span class="ag-group__label">${esc(t("settings.subjects"))}</span>
      ${rows.join("") || `<p class="ag-group__note">${esc(t("settings.subjects.empty"))}</p>`}
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

function currentWeekShown() {
  return ttWeek || mondayOf(todayISO());
}

function timetableGroup() {
  const { settings, timetables } = ctx;
  const shown = currentWeekShown();
  const timetable = timetableFor(timetables, shown);

  if (!timetable) {
    return `
      <div class="ag-group">
        <span class="ag-group__label">${esc(t("settings.timetable"))}</span>
        <p class="ag-group__note">${esc(t("settings.timetable.empty"))}</p>
        <button class="ag-btn ag-btn--secondary" type="button" id="tt-add">
          ${esc(t("settings.timetable.add"))}
        </button>
      </div>`;
  }

  const lang = getLang();
  const days = settings.schoolDays;
  const hours = settings.lessonsPerDay;

  /* La griglia. Ogni colonna è un giorno, ogni riga un'ora. Le ore
     consecutive della stessa materia diventano una casella sola alta N
     (blocksOf), che è come si legge un orario — e toccandola si cambiano
     tutte le sue ore insieme. */
  const cells = [];
  for (let row = 0; row < hours; row += 1) {
    cells.push(`<span class="ag-tt__hour" style="grid-row:${row + 2}">${row + 1}</span>`);
  }
  for (const [index, day] of days.entries()) {
    for (const block of blocksOf(timetable.grid[String(day)], hours)) {
      const subject = block.subjectId ? findSubject(settings.subjects, block.subjectId) : null;
      cells.push(`
        <button class="ag-tt__cell ${subject ? "" : "ag-tt__cell--empty"}" type="button"
                data-cell="${day}:${block.from}:${block.span}"
                style="grid-column:${index + 2};grid-row:${block.from + 2}/span ${block.span};${subject ? colorStyle(subject.color) : ""}"
                aria-label="${esc(dowShort(addDays(mondayOf(shown), day - 1), lang))} ${block.from + 1}">
          ${esc(subject ? subject.short : "")}
        </button>`);
    }
  }

  const heads = days.map((day) =>
    `<span>${esc(dowShort(addDays(mondayOf(shown), day - 1), lang))}</span>`).join("");

  const others = timetables.map((entry) => {
    const isFirst = entry === timetables[timetables.length - 1];
    const label = isFirst
      ? t("settings.timetable.first")
      : t("settings.timetable.current", { date: dayMonth(entry.weekStart, lang) });
    return `
      <div class="ag-row ag-row--tap" data-tt="${entry.weekStart}"
           style="${entry.weekStart === timetable.weekStart ? "background:var(--ag-primary-soft)" : ""}">
        <span class="ag-row__label">${esc(label)}</span>
        <span class="ag-row__value">${countHours(entry)}</span>
        ${timetables.length > 1 ? `
          <button class="ag-iconbtn ag-iconbtn--plain ag-iconbtn--tight" type="button" data-tt-del="${entry.weekStart}"
                  aria-label="${esc(t("common.delete"))}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
          </button>` : ""}
      </div>`;
  });

  return `
    <div class="ag-group">
      <span class="ag-group__label">${esc(t("settings.timetable"))}</span>
      <div class="ag-tt" style="--ag-tt-days:${days.length}">
        <div class="ag-tt__head"><span></span>${heads}</div>
        <div class="ag-tt__grid">${cells.join("")}</div>
      </div>
      <button class="ag-btn ag-btn--secondary" type="button" id="tt-add">
        ${esc(t("settings.timetable.add"))}
      </button>
      <div class="ag-tt__weeks">${others.join("")}</div>
      <p class="ag-group__note">${esc(t("settings.timetable.note"))}</p>
    </div>`;
}

/** Tocco su una casella: scegli la materia, o liberala. */
function editCell(day, from, span) {
  const shown = currentWeekShown();
  const timetable = timetableFor(ctx.timetables, shown);
  if (!timetable) return;
  const currentId = timetable.grid[String(day)]?.[from] ?? null;

  const options = ctx.settings.subjects.map((subject) => ({
    value: subject.id,
    label: subject.name,
    note: subject.short,
    selected: subject.id === currentId,
  }));
  options.push({ value: "", label: t("settings.timetable.free"), selected: !currentId });

  chooseSheet(t("settings.timetable.hour", { n: from + 1 }), options, (value) => {
    const grid = setBlock(timetable.grid, day, from, span, value || null);
    handlers.onTimetables(ctx.timetables.map((entry) =>
      entry.weekStart === timetable.weekStart ? { ...entry, grid } : entry));
  });
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
      <span class="ag-group__label">${esc(t("settings.areas"))}</span>
      ${rows.join("")}
      <div class="ag-row">
        <input class="ag-input ag-input--inline" id="area-new" type="text"
               placeholder="${esc(t("settings.areas.add"))}" enterkeyhint="done" autocapitalize="words">
        <button class="ag-iconbtn" type="button" id="area-add" aria-label="${esc(t("common.add"))}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
        </button>
      </div>
    </div>`;
}

/* ── Dati, lingua, tema ───────────────────────────────────────────── */

function dataGroup() {
  const lang = ctx.settings.lang;
  const theme = ctx.settings.theme;
  return `
    <div class="ag-group">
      <span class="ag-group__label">${esc(t("settings.data"))}</span>
      <button class="ag-btn ag-btn--secondary" type="button" id="data-download">
        ${esc(t("settings.data.download"))}
      </button>
      <button class="ag-btn ag-btn--secondary" type="button" id="data-restore">
        ${esc(t("settings.data.restore"))}
      </button>
      <p class="ag-group__note">${esc(t("settings.data.note"))}</p>
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
    </div>

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
    </div>`;
}

/* ── Disegno ──────────────────────────────────────────────────────── */

export function render() {
  const body = el("settings-body");
  body.innerHTML = subjectsGroup() + timetableGroup() + areasGroup() + dataGroup();

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

  /* Orario */
  body.querySelector("#tt-add")?.addEventListener("click", () => {
    const created = createNext(ctx.timetables, ctx.settings, todayISO());
    ttWeek = created.weekStart;
    handlers.onTimetables([created, ...ctx.timetables]);
    toast(t("settings.timetable.created", { date: dayMonth(created.weekStart, getLang()) }));
  });
  onEach(body, "[data-cell]", "click", (event) => {
    const [day, from, span] = event.currentTarget.dataset.cell.split(":").map(Number);
    editCell(day, from, span);
  });
  onEach(body, "[data-tt]", "click", (event) => {
    if (event.target.closest("[data-tt-del]")) return;
    ttWeek = event.currentTarget.dataset.tt;
    render();
  });
  onEach(body, "[data-tt-del]", "click", (event) => {
    event.stopPropagation();
    const weekStart = event.currentTarget.dataset.ttDel;
    confirmSheet(t("settings.timetable.delete.confirm", { date: dayMonth(weekStart, getLang()) }), {
      onConfirm: () => {
        ttWeek = null;
        handlers.onTimetables(ctx.timetables.filter((entry) => entry.weekStart !== weekStart));
      },
    });
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
  });
  body.querySelector("#data-restore")?.addEventListener("click", () => {
    el("restore-file").click();
  });

  /* Lingua e tema */
  onEach(body, "[data-lang]", "click", (event) => {
    handlers.onSettings({ ...ctx.settings, lang: event.currentTarget.dataset.lang || null });
  });
  onEach(body, "[data-theme]", "click", (event) => {
    handlers.onSettings({ ...ctx.settings, theme: event.currentTarget.dataset.theme || null });
  });
}
