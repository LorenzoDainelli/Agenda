/* Agenda — i mattoni dell'interfaccia.
 *
 * Quattro cose che servono a tutte le schermate: costruire un pezzo di
 * pagina, far salire un foglio dal basso, chiedere una conferma, far
 * comparire una notifica.
 *
 * Nessuna di queste usa `alert`, `confirm` o `prompt`: una finestra del
 * browser in un'app aggiunta alla home ha l'aria di un errore di sistema, e
 * non si può né tradurre né disegnare (regola 4 di CLAUDE.md).
 */

import {
  today as todayISO, addMonths, addDays, daysInMonth, dow, firstOfMonth,
  monthYear, weekdayInitials, dayNumber,
} from "./days.js";
import { t, getLang } from "./i18n.js";

export const el = (id) => document.getElementById(id);

/** Testo dentro l'HTML: sempre passato da qui, mai concatenato a mano. */
export function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Da stringa HTML a elemento. Un solo nodo radice. */
export function node(html) {
  const box = document.createElement("div");
  box.innerHTML = html.trim();
  return box.firstElementChild;
}

export function clear(parent) {
  parent.replaceChildren();
}

/** Scorciatoia per attaccare un ascoltatore a tutti i figli con un attributo. */
export function onEach(root, selector, event, handler) {
  for (const target of root.querySelectorAll(selector)) {
    target.addEventListener(event, handler);
  }
}

/* ── Livelli ──────────────────────────────────────────────────────── */

const layerStack = [];

export function openLayer(id) {
  const layer = el(id);
  if (!layer || !layer.hidden) return;
  layer.hidden = false;
  layerStack.push(id);
}

export function closeLayer(id) {
  const layer = el(id);
  if (!layer) return;
  layer.hidden = true;
  const index = layerStack.lastIndexOf(id);
  if (index !== -1) layerStack.splice(index, 1);
}

export function topLayer() {
  return layerStack.at(-1) ?? null;
}

/* ── Fogli ────────────────────────────────────────────────────────── */

let sheetOnClose = null;

/**
 * Fa salire il foglio dal basso col contenuto dato.
 * Toccando lo sfondo si chiude: è il gesto che tutti si aspettano, e non è
 * l'unico modo (ogni foglio ha anche il suo pulsante).
 */
export function openSheet(html, { onClose } = {}) {
  el("sheet-body").innerHTML = html;
  el("scrim").hidden = false;
  el("sheet").hidden = false;
  sheetOnClose = onClose || null;
  return el("sheet-body");
}

export function closeSheet() {
  el("sheet").hidden = true;
  el("scrim").hidden = true;
  el("sheet-body").replaceChildren();
  const fn = sheetOnClose;
  sheetOnClose = null;
  if (fn) fn();
}

export function isSheetOpen() {
  return !el("sheet").hidden;
}

/**
 * Una conferma. Il messaggio dice cosa sta per succedere, coi numeri dentro:
 * "Elimino «Inglese»? I 4 compiti che la usano restano." Mai un "Sei sicuro?",
 * che non dà nessuna informazione a chi deve decidere.
 */
export function confirmSheet(message, { confirmLabel, danger = true, onConfirm }) {
  const body = openSheet(`
    <p class="ag-sheet__title">${esc(message)}</p>
    <button class="ag-btn ${danger ? "ag-btn--danger" : ""}" type="button" data-act="yes">
      ${esc(confirmLabel || t("common.delete"))}
    </button>
    <button class="ag-btn ag-btn--ghost" type="button" data-act="no">${esc(t("common.keep"))}</button>
  `);
  body.querySelector('[data-act="yes"]').addEventListener("click", () => {
    closeSheet();
    onConfirm();
  });
  body.querySelector('[data-act="no"]').addEventListener("click", closeSheet);
}

/**
 * Un foglio di scelta: un elenco di opzioni, una si tocca.
 * `options` = [{ value, label, note, selected }]
 */
export function chooseSheet(title, options, onPick) {
  const body = openSheet(`
    ${title ? `<p class="ag-sheet__title">${esc(title)}</p>` : ""}
    <div class="ag-group">
      ${options.map((opt) => `
        <button class="ag-sheet__option" type="button" data-value="${esc(opt.value)}"
                aria-selected="${opt.selected ? "true" : "false"}">
          <span>${esc(opt.label)}</span>
          ${opt.note ? `<span class="ag-row__value">${esc(opt.note)}</span>` : ""}
        </button>
      `).join("")}
    </div>
  `);
  onEach(body, "[data-value]", "click", (event) => {
    const { value } = event.currentTarget.dataset;
    closeSheet();
    onPick(value);
  });
}

/* ── Notifiche ────────────────────────────────────────────────────── */

const TOAST_MS = 5000;

/**
 * Una notifica in basso, che se ne va da sé. Con `onUndo` porta anche
 * l'annulla — ed è il motivo per cui sta aperta cinque secondi e non due:
 * cinque secondi sono il tempo di accorgersi di aver spuntato la riga
 * sbagliata e rimediare.
 */
export function toast(message, { onUndo } = {}) {
  const box = el("toasts");
  const item = node(`
    <div class="ag-toast">
      <span class="ag-toast__text">${esc(message)}</span>
      ${onUndo ? `<button class="ag-toast__undo" type="button">${esc(t("common.undo"))}</button>` : ""}
    </div>
  `);
  box.append(item);

  let timer = null;
  const dismiss = () => {
    if (timer) clearTimeout(timer);
    item.classList.add("ag-toast--leaving");
    setTimeout(() => item.remove(), 200);
  };

  if (onUndo) {
    item.querySelector(".ag-toast__undo").addEventListener("click", () => {
      dismiss();
      onUndo();
    });
  }
  timer = setTimeout(dismiss, TOAST_MS);
  return dismiss;
}

/* ── Pezzi ricorrenti ─────────────────────────────────────────────── */

/** Il pallino colorato di una materia. */
export function dot(colorStyle) {
  return `<span class="ag-dot" style="${colorStyle}" aria-hidden="true"></span>`;
}

/** Le tre tacche del peso. Portano anche un nome accessibile: il peso non è
 *  leggibile da una forma se non si vede la forma. */
export function weightTicks(weight) {
  const ticks = [1, 2, 3]
    .map((n) => `<span class="ag-weight__tick ${n <= weight ? "ag-weight__tick--on" : ""}"></span>`)
    .join("");
  return `<span class="ag-weight" role="img" aria-label="${esc(t(`weight.${weight}`))}">${ticks}</span>`;
}

export function checkIcon() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`;
}

export function chevron() {
  return `<svg class="ag-row__chevron" width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"
    aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>`;
}

export function emptyState(title, note) {
  return `
    <div class="ag-empty">
      <span class="ag-empty__icon">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="3.5" y="4.5" width="17" height="16" rx="3"/><path d="M8 9.5h8M8 14h5"/></svg>
      </span>
      <span class="ag-empty__title">${esc(title)}</span>
      <span class="ag-empty__note">${esc(note)}</span>
    </div>`;
}

/* ── Scelta di un giorno ──────────────────────────────────────────────
 *
 * Un mese alla volta, con le frecce per scorrere. Non è un campo di testo e
 * non è il selettore nativo: il selettore nativo di iOS è una ruota che va
 * bene per una data di nascita, non per "il giovedì della settimana prossima",
 * dove serve vedere i giorni della settimana in fila.
 */


export function datePickerSheet(current, { title, min, onPick, allowNone } = {}) {
  let month = firstOfMonth(current || todayISO());
  const today = todayISO();
  const lang = getLang();

  const draw = () => {
    const first = firstOfMonth(month);
    const blanks = dow(first) - 1;          // quante caselle vuote prima del 1°
    const total = daysInMonth(first);
    const cells = [];
    for (let i = 0; i < blanks; i += 1) cells.push('<span class="ag-cal__cell ag-cal__cell--empty"></span>');
    for (let d = 1; d <= total; d += 1) {
      const iso = `${first.slice(0, 8)}${String(d).padStart(2, "0")}`;
      const disabled = min && iso < min;
      const chosen = iso === current;
      cells.push(`
        <button class="ag-cal__cell" type="button" data-pick="${iso}" ${disabled ? "disabled" : ""}
                style="${chosen ? "background:var(--ag-primary);color:var(--ag-on-primary)" : ""}${disabled ? ";opacity:.35" : ""}">
          <span class="ag-cal__n ${iso === today && !chosen ? "ag-cal__n--today" : ""}">${d}</span>
        </button>`);
    }

    const body = openSheet(`
      ${title ? `<p class="ag-sheet__title">${esc(title)}</p>` : ""}
      <div class="ag-week__nav">
        <button class="ag-iconbtn" type="button" data-move="-1" aria-label="${esc(monthYear(addMonths(month, -1), lang))}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>
        </button>
        <span class="ag-week__range">${esc(monthYear(month, lang))}</span>
        <button class="ag-iconbtn" type="button" data-move="1" aria-label="${esc(monthYear(addMonths(month, 1), lang))}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>
        </button>
      </div>
      <div class="ag-cal__weekdays">${weekdayInitials(lang).map((d) => `<span>${esc(d)}</span>`).join("")}</div>
      <div class="ag-cal__grid">${cells.join("")}</div>
      ${allowNone ? `<button class="ag-btn ag-btn--ghost" type="button" data-pick="">${esc(allowNone)}</button>` : ""}
    `);

    onEach(body, "[data-move]", "click", (event) => {
      month = addMonths(month, Number(event.currentTarget.dataset.move));
      draw();
    });
    onEach(body, "[data-pick]", "click", (event) => {
      const value = event.currentTarget.dataset.pick;
      closeSheet();
      onPick(value || null);
    });
  };

  draw();
}

/** Le date proposte come chip: domani, dopodomani e le prossime lezioni. */
export function dayChipLabel(iso) {
  const today = todayISO();
  if (iso === today) return null;   // il chip "oggi" lo mette chi chiama, con il suo testo
  if (iso === addDays(today, 1)) return null;
  return String(dayNumber(iso));
}
