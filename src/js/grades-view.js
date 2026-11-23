/* Agenda — il pannello dei voti (§6.8).
 *
 * In cima il periodo e la media generale, sotto le materie. Una materia
 * chiusa è una riga con la sua media complessiva a destra: è quello che si
 * guarda il più delle volte, e le righe stanno tutte in una schermata.
 * Aperta mostra teoria, laboratorio e complessiva, poi i voti. Le regole
 * (quadrimestri, medie) stanno in grades.js.
 */

import { today as todayISO, dayMonth } from "./days.js";
import { t, tn, getLang } from "./i18n.js";
import { findSubject, colorStyle } from "./subjects.js";
import {
  VALUES, PASS, schoolYearOf, rangeOf, defaultPeriod, newGrade, inPeriod,
  subjectAverages, overallAverage, subjectsWithGrades, formatNumber, replaceGrade, removeGrade,
} from "./grades.js";
import {
  el, esc, onEach, toast, confirmSheet, openSheet, closeSheet, datePickerSheet, dot, expandIcon,
  enter, slideSegments, runNumber,
} from "./ui.js";

let grades = [];
let ctx = null;
let handlers = null;
let period = 1;
/* Le materie aperte restano aperte mentre si aggiungono voti: ogni salvataggio
   ridisegna il pannello, e richiuderle farebbe perdere il segno. */
const opened = new Set();
/* La media generale mostrata l'ultima volta: cambiando periodo il numero
   corre da lì a quello nuovo (A79). */
let lastOverall = null;

export function open(list, context, callbacks) {
  grades = list;
  ctx = context;
  handlers = callbacks;
  period = defaultPeriod(todayISO());
  opened.clear();
  lastOverall = null;
  render();
  enter(el("grades-body"));
}

export function refresh(list, context) {
  if (!handlers) return;
  grades = list;
  ctx = context;
  render();
}

function change(next) {
  grades = next;
  handlers.onChange(next);
}

/** Un numero di media, rosso sotto il 6 (A70). Il numero c'è sempre: il
 *  colore aggiunge, non sostituisce. */
function avg(value, extra = "") {
  const low = value !== null && value < PASS;
  return `<span class="ag-grades__avg ${low ? "ag-grades__avg--low" : ""} ${extra}">${esc(formatNumber(value, getLang()))}</span>`;
}

function periodSeg() {
  const options = [[1, "grades.term1"], [2, "grades.term2"], ["year", "grades.year"]];
  return `
    <div class="ag-seg" id="gr-period">
      ${options.map(([value, key]) => `
        <button class="ag-seg__opt" type="button" data-period="${value}"
                aria-pressed="${period === value ? "true" : "false"}">${esc(t(key))}</button>`).join("")}
    </div>`;
}

function subjectBlock(entry, shown) {
  const lang = getLang();
  const own = shown.filter((g) => g.subjectId === entry.id);
  const avgs = subjectAverages(shown, entry.id);
  const isOpen = opened.has(entry.id);
  const style = entry.subject ? colorStyle(entry.subject.color) : "";
  // teoria e laboratorio si dicono solo se la materia li distingue, o se ha
  // già voti di laboratorio (togliere il laboratorio non li fa sparire, A47)
  const split = entry.subject?.lab || own.some((g) => g.lab);
  const detail = isOpen ? `
    <div class="ag-grades__detail">
      <div class="ag-grades__stats">
        ${split ? `
          <div class="ag-grades__stat"><span>${esc(t("grades.theory"))}</span>${avg(avgs.theory)}</div>
          <div class="ag-grades__stat"><span>${esc(t("grades.lab"))}</span>${avg(avgs.lab)}</div>` : ""}
        <div class="ag-grades__stat"><span>${esc(t("grades.all"))}</span>${avg(avgs.all)}</div>
      </div>
      ${own.length ? own.map((g) => `
        <button class="ag-grades__grade" type="button" data-grade="${esc(g.id)}">
          <span class="ag-grades__when">${esc(dayMonth(g.date, lang))}${split ? ` · ${esc(t(g.lab ? "grades.lab" : "grades.theory"))}` : ""}</span>
          ${avg(g.value)}
        </button>`).join("")
        : `<p class="ag-group__note">${esc(t("grades.empty.subject"))}</p>`}
    </div>` : "";
  return `
    <button class="ag-row ag-row--tap" type="button" data-gr-subject="${esc(entry.id)}"
            aria-expanded="${isOpen ? "true" : "false"}">
      ${entry.subject ? dot(style) : ""}
      <span class="ag-row__label">${esc(entry.name)}</span>
      ${avg(avgs.all)}
      ${expandIcon()}
    </button>
    ${detail}`;
}

export function render() {
  const body = el("grades-body");
  const year = schoolYearOf(todayISO());
  const shown = inPeriod(grades, year, period);
  const subjects = ctx.settings.subjects;
  const entries = subjectsWithGrades(shown, subjects);

  body.innerHTML = `
    ${periodSeg()}
    <div class="ag-grades__total">
      <span class="ag-group__label">${esc(t("grades.overall"))}</span>
      ${avg(overallAverage(shown), "ag-grades__avg--big")}
      <span class="ag-group__note">${esc(shown.length ? tn(shown.length, "grades.count.one", "grades.count.many") : t("grades.none"))}</span>
    </div>
    ${subjects.length ? `
      <button class="ag-btn" type="button" id="gr-add">${esc(t("grades.add"))}</button>`
      : `<p class="ag-group__note">${esc(t("settings.subjects.empty"))}</p>`}
    ${entries.length ? `
      <div class="ag-group">
        <span class="ag-group__label">${esc(t("grades.subjects"))}</span>
        <div class="ag-rows">${entries.map((entry) => subjectBlock(entry, shown)).join("")}</div>
      </div>` : ""}
  `;
  bind(body);
  slideSegments(body);
  // la media generale corre verso il numero nuovo e rimbalza, ma solo se è
  // cambiata: aprire una materia non la deve far saltare
  const overall = overallAverage(shown);
  const big = body.querySelector(".ag-grades__avg--big");
  if (lastOverall !== null && overall !== null && overall !== lastOverall) {
    big.classList.add("ag-chip--pop");
    runNumber(big, lastOverall, overall, (v) => formatNumber(v, getLang()));
  }
  lastOverall = overall;
}

function bind(body) {
  onEach(body, "[data-period]", "click", (event) => {
    const value = event.currentTarget.dataset.period;
    period = value === "year" ? "year" : Number(value);
    render();
  });
  body.querySelector("#gr-add")?.addEventListener("click", () => formSheet(null));
  onEach(body, "[data-gr-subject]", "click", (event) => {
    const id = event.currentTarget.dataset.grSubject;
    if (opened.has(id)) opened.delete(id); else opened.add(id);
    render();
  });
  onEach(body, "[data-grade]", "click", (event) => {
    const grade = grades.find((g) => g.id === event.currentTarget.dataset.grade);
    if (grade) formSheet(grade);
  });
}

/**
 * Il foglio per inserire o correggere un voto (A67, A71). Tutto a tocchi:
 * materia, teoria o laboratorio, voto, giorno. Il giorno si sceglie col
 * calendario, che prende il posto del foglio: per questo la bozza vive fuori
 * e il foglio si riapre com'era.
 */
function formSheet(existing, draft = null, picked = null) {
  const today = todayISO();
  const year = schoolYearOf(today);
  const lastDay = rangeOf(year, "year").to;
  const d = draft || (existing ? { ...existing } : {
    subjectId: null,
    value: null,
    // d'estate oggi non è in nessun quadrimestre: si propone l'ultimo giorno
    date: today > lastDay ? lastDay : today,
    lab: false,
  });
  const lang = getLang();
  const subject = d.subjectId ? findSubject(ctx.settings.subjects, d.subjectId) : null;
  const ready = d.subjectId && d.value !== null;

  const sheet = openSheet(`
    <p class="ag-sheet__title">${esc(t(existing ? "grades.edit" : "grades.add"))}</p>
    <div class="ag-group">
      <span class="ag-group__label">${esc(t("grades.subject"))}</span>
      <div class="ag-chips ag-chips--wrap">
        ${ctx.settings.subjects.map((s) => `
          <button class="ag-chip ag-chip--subject" type="button" data-f-subject="${esc(s.id)}"
                  aria-pressed="${d.subjectId === s.id ? "true" : "false"}" style="${colorStyle(s.color)}">
            ${dot(colorStyle(s.color))}<span>${esc(s.name)}</span>
          </button>`).join("")}
      </div>
      ${subject?.lab || d.lab ? `
        <div class="ag-seg" id="gr-form-lab">
          ${[false, true].map((lab) => `
            <button class="ag-seg__opt" type="button" data-f-lab="${lab ? "1" : "0"}"
                    aria-pressed="${Boolean(d.lab) === lab ? "true" : "false"}">${esc(t(lab ? "grades.lab" : "grades.theory"))}</button>`).join("")}
        </div>` : ""}
    </div>
    <div class="ag-group">
      <span class="ag-group__label">${esc(t("grades.value"))}</span>
      <div class="ag-chips ag-chips--wrap ag-grades__values">
        ${VALUES.map((v) => `
          <button class="ag-chip" type="button" data-f-value="${v}"
                  aria-pressed="${d.value === v ? "true" : "false"}">${esc(formatNumber(v, lang))}</button>`).join("")}
      </div>
    </div>
    <div class="ag-group">
      <span class="ag-group__label">${esc(t("grades.date"))}</span>
      <div class="ag-chips">
        <button class="ag-chip" type="button" data-f-date aria-pressed="true">${esc(dayMonth(d.date, lang))}</button>
      </div>
    </div>
    <button class="ag-btn" type="button" data-f-act="save" ${ready ? "" : "disabled"}>${esc(t("common.save"))}</button>
    ${existing ? `<button class="ag-btn ag-btn--danger" type="button" data-f-act="delete">${esc(t("common.delete"))}</button>` : ""}
    <button class="ag-btn ag-btn--ghost" type="button" data-f-act="cancel">${esc(t("common.cancel"))}</button>
  `);

  // il chip appena toccato rimbalza; gli altri accesi restano fermi
  if (picked) sheet.querySelector(picked)?.classList.add("ag-chip--pop");
  slideSegments(sheet);
  const again = (key = null) => formSheet(existing, d, key);
  onEach(sheet, "[data-f-subject]", "click", (event) => {
    d.subjectId = event.currentTarget.dataset.fSubject;
    // una materia senza laboratorio non può avere un voto di laboratorio
    if (!findSubject(ctx.settings.subjects, d.subjectId)?.lab) d.lab = false;
    again(`[data-f-subject="${d.subjectId}"]`);
  });
  onEach(sheet, "[data-f-lab]", "click", (event) => {
    d.lab = event.currentTarget.dataset.fLab === "1";
    again();
  });
  onEach(sheet, "[data-f-value]", "click", (event) => {
    d.value = Number(event.currentTarget.dataset.fValue);
    again(`[data-f-value="${d.value}"]`);
  });
  sheet.querySelector("[data-f-date]").addEventListener("click", () => {
    datePickerSheet(d.date, {
      title: t("grades.date"),
      min: rangeOf(year, "year").from,
      max: today < lastDay ? today : lastDay,
      onPick: (picked) => {
        if (picked) d.date = picked;
        again();
      },
    });
  });
  sheet.querySelector('[data-f-act="cancel"]').addEventListener("click", closeSheet);
  sheet.querySelector('[data-f-act="save"]').addEventListener("click", () => {
    if (!ready) return;
    const name = findSubject(ctx.settings.subjects, d.subjectId)?.name;
    closeSheet();
    if (existing) {
      change(replaceGrade(grades, { ...existing, ...d, subjectName: name || existing.subjectName }));
    } else {
      change([...grades, newGrade({ ...d, subjectName: name })]);
    }
    opened.add(d.subjectId);
    // il voto finisce nel suo quadrimestre: se non è quello che si guarda,
    // ci si sposta lì, se no sembrerebbe sparito
    const term = d.date < rangeOf(year, 2).from ? 1 : 2;
    if (period !== "year" && period !== term) period = term;
    render();
    toast(t("grades.saved"));
  });
  sheet.querySelector('[data-f-act="delete"]')?.addEventListener("click", () => {
    const label = findSubject(ctx.settings.subjects, existing.subjectId)?.name || existing.subjectName || "?";
    // la conferma dice cosa sparisce, coi numeri dentro (regola 4)
    confirmSheet(t("grades.delete.confirm", {
      value: formatNumber(existing.value, lang), subject: label, date: dayMonth(existing.date, lang),
    }), {
      onConfirm: () => {
        change(removeGrade(grades, existing.id));
        render();
        toast(t("grades.deleted"));
      },
    });
  });
}
