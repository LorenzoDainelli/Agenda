/* Agenda — il pannello dell'orario (§6.6).
 *
 * Stava nelle impostazioni, ed è uscito da lì per due motivi. Il primo: a
 * inizio anno l'orario cambia di settimana in settimana, e andarlo a cercare in
 * fondo alle impostazioni ogni volta era un giro lungo. Il secondo: finito
 * quel periodo lo si guarda e basta, e una cosa che si guarda sta in testata,
 * accanto al calendario.
 *
 * Per questo ha due stati. Provvisorio: si tocca una casella e si cambia la
 * materia, si crea la settimana nuova. Definitivo: si guarda e basta. Da
 * definitivo si torna indietro solo dalle impostazioni (A31–A32), perché un
 * orario giusto che cambia per un tocco sbagliato è peggio di nessun orario:
 * è da lì che l'app propone le scadenze.
 *
 * Il modello (un elenco di griglie, ognuna con la settimana da cui vale) è in
 * timetable.js, insieme al perché.
 */

import { today as todayISO, dayMonth, dowShort, addDays, mondayOf } from "./days.js";
import { t, getLang } from "./i18n.js";
import { findSubject, colorStyle } from "./subjects.js";
import { createNext, timetableFor, blocksOf, setBlock, countHours, cellValue, readCell } from "./timetable.js";
import { el, esc, onEach, toast, confirmSheet, chooseSheet } from "./ui.js";

let ctx = null;
let handlers = null;
/** Quale settimana dell'orario si sta guardando. `null` = quella di oggi. */
let shownWeek = null;

export function open(context, callbacks) {
  ctx = context;
  handlers = callbacks;
  shownWeek = null;
  render();
}

export function refresh(context) {
  if (!ctx) return;
  ctx = context;
  render();
}

function isFinal() {
  return Boolean(ctx.settings.timetableFinal);
}

function weekShown() {
  // da definitivo non si sceglie una settimana: si guarda quella di oggi
  return (!isFinal() && shownWeek) || mondayOf(todayISO());
}

/** La griglia: ogni colonna è un giorno, ogni riga un'ora. Le ore consecutive
 *  della stessa materia diventano una casella sola alta N (blocksOf), che è
 *  come si legge un orario — e toccandola si cambiano tutte le sue ore. Da
 *  definitivo le caselle non sono pulsanti: non c'è niente da toccare. */
function grid(timetable, shown) {
  const { settings } = ctx;
  const lang = getLang();
  const days = settings.schoolDays;
  const hours = settings.lessonsPerDay;
  const editable = !isFinal();

  const cells = [];
  for (let row = 0; row < hours; row += 1) {
    cells.push(`<span class="ag-tt__hour" style="grid-row:${row + 2}">${row + 1}</span>`);
  }
  for (const [index, day] of days.entries()) {
    for (const block of blocksOf(timetable.grid[String(day)], hours)) {
      const subject = block.subjectId ? findSubject(settings.subjects, block.subjectId) : null;
      const tag = editable ? "button" : "span";
      // un'ora di laboratorio porta «LAB» sotto la sigla (A44), e lo dice
      // anche a chi non vede la casella
      const lab = subject && block.lab;
      const name = subject ? ` ${subject.name}${lab ? ` · ${t("mode.lab")}` : ""}` : "";
      cells.push(`
        <${tag} class="ag-tt__cell ${subject ? "" : "ag-tt__cell--empty"}" ${editable ? `type="button" data-cell="${day}:${block.from}:${block.span}"` : ""}
                style="grid-column:${index + 2};grid-row:${block.from + 2}/span ${block.span};${subject ? colorStyle(subject.color) : ""}"
                aria-label="${esc(dowShort(addDays(mondayOf(shown), day - 1), lang))} ${block.from + 1}${esc(name)}">
          <span>${esc(subject ? subject.short : "")}</span>
          ${lab ? `<span class="ag-tt__lab">${esc(t("mode.lab.short"))}</span>` : ""}
        </${tag}>`);
    }
  }

  const heads = days.map((day) =>
    `<span>${esc(dowShort(addDays(mondayOf(shown), day - 1), lang))}</span>`).join("");

  return `
    <div class="ag-tt" style="--ag-tt-days:${days.length}">
      <div class="ag-tt__head"><span></span>${heads}</div>
      <div class="ag-tt__grid">${cells.join("")}</div>
    </div>`;
}

/** L'elenco delle settimane da cui vale ogni orario. Solo da provvisorio. */
function weeks(timetable) {
  const { timetables } = ctx;
  const lang = getLang();
  return timetables.map((entry) => {
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
  }).join("");
}

export function render() {
  const body = el("timetable-body");
  const shown = weekShown();
  const timetable = timetableFor(ctx.timetables, shown);

  if (!timetable) {
    body.innerHTML = `
      <div class="ag-group">
        <p class="ag-group__note">${esc(t("settings.timetable.empty"))}</p>
        <button class="ag-btn ag-btn--secondary" type="button" id="tt-add">
          ${esc(t("settings.timetable.add"))}
        </button>
      </div>`;
  } else if (isFinal()) {
    body.innerHTML = `
      <div class="ag-group">
        ${grid(timetable, shown)}
        <p class="ag-group__note">${esc(t("timetable.final.note"))}</p>
      </div>`;
  } else {
    body.innerHTML = `
      <div class="ag-group">
        ${grid(timetable, shown)}
        <button class="ag-btn ag-btn--secondary" type="button" id="tt-add">
          ${esc(t("settings.timetable.add"))}
        </button>
        <div class="ag-tt__weeks">${weeks(timetable)}</div>
        <p class="ag-group__note">${esc(t("settings.timetable.note"))}</p>
      </div>
      <div class="ag-group">
        <button class="ag-btn ag-btn--ghost" type="button" id="tt-final">
          ${esc(t("timetable.final.make"))}
        </button>
      </div>`;
  }

  bind(body);
}

/** Tocco su una casella: scegli la materia, o liberala. Una materia col
 *  laboratorio compare due volte, teoria e laboratorio (A44): un tocco solo,
 *  invece di scegliere la materia e poi il tipo. */
function editCell(day, from, span) {
  const timetable = timetableFor(ctx.timetables, weekShown());
  if (!timetable) return;
  const current = timetable.grid[String(day)]?.[from] ?? null;

  const options = ctx.settings.subjects.flatMap((subject) => {
    const modes = subject.lab ? [false, true] : [false];
    return modes.map((lab) => ({
      value: cellValue(subject.id, lab),
      label: subject.lab ? `${subject.name} · ${t(lab ? "mode.lab" : "mode.theory")}` : subject.name,
      note: subject.short,
      selected: cellValue(subject.id, lab) === current,
    }));
  });
  // un'ora di laboratorio di una materia che il laboratorio non l'ha più
  // resta scelta com'è (A47): se no nessuna riga risulterebbe selezionata
  const { subjectId, lab } = readCell(current);
  const orphan = lab && !ctx.settings.subjects.find((subject) => subject.id === subjectId)?.lab;
  if (orphan) {
    const subject = ctx.settings.subjects.find((entry) => entry.id === subjectId);
    if (subject) options.push({ value: current, label: `${subject.name} · ${t("mode.lab")}`, note: subject.short, selected: true });
  }
  options.push({ value: "", label: t("settings.timetable.free"), selected: !current });

  chooseSheet(t("settings.timetable.hour", { n: from + 1 }), options, (value) => {
    const next = setBlock(timetable.grid, day, from, span, value || null);
    handlers.onTimetables(ctx.timetables.map((entry) =>
      entry.weekStart === timetable.weekStart ? { ...entry, grid: next } : entry));
  });
}

function bind(body) {
  body.querySelector("#tt-add")?.addEventListener("click", () => {
    const created = createNext(ctx.timetables, ctx.settings, todayISO());
    shownWeek = created.weekStart;
    handlers.onTimetables([created, ...ctx.timetables]);
    toast(t("settings.timetable.created", { date: dayMonth(created.weekStart, getLang()) }));
  });
  onEach(body, "[data-cell]", "click", (event) => {
    const [day, from, span] = event.currentTarget.dataset.cell.split(":").map(Number);
    editCell(day, from, span);
  });
  onEach(body, "[data-tt]", "click", (event) => {
    if (event.target.closest("[data-tt-del]")) return;
    shownWeek = event.currentTarget.dataset.tt;
    render();
  });
  onEach(body, "[data-tt-del]", "click", (event) => {
    event.stopPropagation();
    const weekStart = event.currentTarget.dataset.ttDel;
    confirmSheet(t("settings.timetable.delete.confirm", { date: dayMonth(weekStart, getLang()) }), {
      onConfirm: () => {
        shownWeek = null;
        handlers.onTimetables(ctx.timetables.filter((entry) => entry.weekStart !== weekStart));
      },
    });
  });
  // La conferma dice dove si torna indietro: un «per sempre» detto a metà
  // farebbe esitare proprio quando la scelta è giusta (A32).
  body.querySelector("#tt-final")?.addEventListener("click", () => {
    confirmSheet(t("timetable.final.confirm"), {
      confirmLabel: t("timetable.final.yes"),
      danger: false,
      onConfirm: () => {
        shownWeek = null;
        handlers.onSettings({ ...ctx.settings, timetableFinal: true });
      },
    });
  });
}
