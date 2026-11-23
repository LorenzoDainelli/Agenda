/* Agenda — i mattoni dell'interfaccia.
 *
 * Le cose che servono a tutte le schermate: costruire un pezzo di pagina,
 * far entrare e uscire livelli e fogli, chiedere una conferma, far comparire
 * un avviso, far muovere i pezzi come nel Visore.
 *
 * Nessuna di queste usa `alert`, `confirm` o `prompt`: una finestra del
 * browser in un'app aggiunta alla home ha l'aria di un errore di sistema, e
 * non si può né tradurre né disegnare (regola 4 di CLAUDE.md).
 */

import {
  today as todayISO, addMonths, daysInMonth, dow, firstOfMonth, monthYear, weekdayInitials,
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

/** Scorciatoia per attaccare un ascoltatore a tutti i figli con un attributo. */
export function onEach(root, selector, event, handler) {
  for (const target of root.querySelectorAll(selector)) {
    target.addEventListener(event, handler);
  }
}

/* ── Entrare e uscire ─────────────────────────────────────────────────
 *
 * Come nel Visore, niente compare o sparisce di colpo (A76, A79): un livello
 * o un foglio entra con la sua animazione e, chiudendosi, esce con la sua
 * prima di diventare `hidden`. Mentre esce non prende più i tocchi, così chi
 * tocca subito dopo tocca quello che c'è sotto.
 *
 * L'animazione la sceglie il CSS con due classi, `--in` e `--out`: qui si
 * decide solo quando. Con «Riduci movimento» le durate sono zero e l'uscita
 * è immediata.
 */

/** Il tempo dell'uscita, letto dal token: è il CSS a decidere quanto dura. */
function leaveMs(node) {
  const value = getComputedStyle(node).animationDuration || "0s";
  const ms = value.endsWith("ms") ? parseFloat(value) : parseFloat(value) * 1000;
  return Number.isFinite(ms) ? ms : 0;
}

const leaving = new WeakMap();

function show(node, base) {
  const pending = leaving.get(node);
  if (pending) {
    // stava uscendo e lo si riapre: si ferma dov'è, senza rientrare da capo
    clearTimeout(pending);
    leaving.delete(node);
    node.classList.remove(`${base}--out`);
    return;
  }
  if (!node.hidden) return;
  node.classList.remove(`${base}--out`);
  node.classList.add(`${base}--in`);
  node.hidden = false;
}

function hide(node, base, done) {
  if (node.hidden || leaving.has(node)) return;
  node.classList.remove(`${base}--in`);
  node.classList.add(`${base}--out`);
  const finish = () => {
    leaving.delete(node);
    node.classList.remove(`${base}--out`);
    node.hidden = true;
    if (done) done();
  };
  const ms = leaveMs(node);
  if (!ms) { finish(); return; }
  leaving.set(node, setTimeout(finish, ms));
}

/* ── Livelli ──────────────────────────────────────────────────────── */

const layerStack = [];

export function openLayer(id) {
  const layer = el(id);
  if (!layer || (!layer.hidden && !leaving.has(layer))) return;
  show(layer, "ag-layer");
  if (!layerStack.includes(id)) layerStack.push(id);
}

export function closeLayer(id) {
  const layer = el(id);
  if (!layer) return;
  const index = layerStack.lastIndexOf(id);
  if (index !== -1) layerStack.splice(index, 1);
  hide(layer, "ag-layer");
}

/** Se un livello è aperto davvero: uno che sta uscendo conta già come chiuso. */
export function isLayerOpen(id) {
  const layer = el(id);
  return Boolean(layer) && !layer.hidden && !leaving.has(layer);
}

export function topLayer() {
  return layerStack.at(-1) ?? null;
}

/* ── Fogli ────────────────────────────────────────────────────────── */

let sheetOnClose = null;

/**
 * Fa salire il foglio dal basso col contenuto dato, con la molla dei fogli.
 * Se il foglio è già su, cambia solo il contenuto: passare dal voto al
 * calendario non deve far ridiscendere e risalire tutto.
 * Toccando lo sfondo si chiude: è il gesto che tutti si aspettano, e non è
 * l'unico modo (ogni foglio ha anche il suo pulsante).
 */
export function openSheet(html, { onClose } = {}) {
  el("sheet-body").innerHTML = html;
  show(el("scrim"), "ag-scrim");
  show(el("sheet"), "ag-sheet");
  sheetOnClose = onClose || null;
  return el("sheet-body");
}

export function closeSheet() {
  hide(el("scrim"), "ag-scrim");
  // il contenuto resta finché il foglio non è sceso: sparirebbe a metà strada
  hide(el("sheet"), "ag-sheet", () => el("sheet-body").replaceChildren());
  const fn = sheetOnClose;
  sheetOnClose = null;
  if (fn) fn();
}

export function isSheetOpen() {
  const sheet = el("sheet");
  return !sheet.hidden && !leaving.has(sheet);
}

/**
 * Una conferma. Il messaggio dice cosa sta per succedere, coi numeri dentro:
 * "Elimino «Inglese»? I 4 voti restano." Mai un "Sei sicuro?", che non dà
 * nessuna informazione a chi deve decidere.
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
    <div class="ag-group ag-cascade">
      ${options.map((opt, i) => `
        <button class="ag-sheet__option" type="button" data-value="${esc(opt.value)}" style="--i:${i}"
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

/* ── Avvisi ───────────────────────────────────────────────────────── */

/** Quanto resta un avviso: circa due secondi e mezzo, come i messaggini a
 *  pillola del Visore (A77). Era cinque per dare il tempo dell'annulla, che
 *  apparteneva ai compiti e alla spesa e non c'è più. */
const TOAST_MS = 2500;

/**
 * Un avviso a pillola che sale dal basso e se ne va da sé. Uno solo alla
 * volta: un avviso nuovo spinge via quello di prima, come nel Visore.
 */
export function toast(message) {
  const box = el("toasts");
  for (const old of box.querySelectorAll(".ag-toast:not(.ag-toast--leaving)")) old.dispatchEvent(new Event("ag-dismiss"));
  const item = node(`
    <div class="ag-toast" role="status">
      <span class="ag-toast__icon" aria-hidden="true">${checkIcon()}</span>
      <span class="ag-toast__text">${esc(message)}</span>
    </div>
  `);
  box.append(item);

  let timer = null;
  const dismiss = () => {
    if (timer) clearTimeout(timer);
    if (item.classList.contains("ag-toast--leaving")) return;
    item.classList.add("ag-toast--leaving");
    setTimeout(() => item.remove(), leaveMs(item));
  };
  item.addEventListener("ag-dismiss", dismiss);
  timer = setTimeout(dismiss, TOAST_MS);
  return dismiss;
}

/* ── Movimento dei pezzi ──────────────────────────────────────────── */

/* L'ultima scelta di ogni selettore a segmenti, per id: la pagina si
   ridisegna da capo a ogni tocco, e senza ricordarla la macchia non saprebbe
   da dove partire. */
const segmentAt = new Map();

/**
 * Nel selettore a segmenti la macchia scivola sulla scelta nuova, come nella
 * barra in basso del Visore (A79). La macchia è un `::before` del selettore:
 * qui si dice solo quanti segmenti ci sono e quale è acceso. Va chiamata dopo
 * ogni disegno; un selettore senza id si accende al suo posto, senza viaggio.
 */
export function slideSegments(root) {
  for (const seg of root.querySelectorAll(".ag-seg")) {
    const options = [...seg.querySelectorAll(".ag-seg__opt")];
    const index = options.findIndex((opt) => opt.getAttribute("aria-pressed") === "true");
    if (index < 0) continue;
    seg.style.setProperty("--seg-n", String(options.length));
    seg.classList.add("ag-seg--slide");
    const before = seg.id ? segmentAt.get(seg.id) : undefined;
    if (seg.id) segmentAt.set(seg.id, index);
    if (before === undefined || before === index) {
      seg.style.setProperty("--seg-i", String(index));
      continue;
    }
    // parte da dov'era, e al disegno dopo va dove deve: è il salto di
    // posizione che il CSS trasforma in uno scivolamento
    seg.style.setProperty("--seg-i", String(before));
    seg.classList.add("ag-seg--still");
    requestAnimationFrame(() => {
      seg.classList.remove("ag-seg--still");
      requestAnimationFrame(() => seg.style.setProperty("--seg-i", String(index)));
    });
  }
}

/**
 * L'entrata a cascata di una pagina (A79): le righe dei riquadri e dei
 * gruppi `.ag-cascade` arrivano una dopo l'altra. Si chiama quando una pagina
 * si apre, non a ogni disegno; la classe se ne va da sola a cascata finita,
 * così i disegni dopo un tocco non ripartono da capo.
 */
export function enter(root) {
  const rows = root.querySelectorAll(".ag-rows > *, .ag-cascade > *");
  rows.forEach((row, i) => row.style.setProperty("--i", String(Math.min(i, 12))));
  root.classList.add("ag-enter");
  clearTimeout(enterTimers.get(root));
  // finisce quando l'ultima riga è arrivata: i tempi sono quelli dei token
  const css = getComputedStyle(document.documentElement);
  const ms = (parseFloat(css.getPropertyValue("--ag-motion-scene")) || 0)
    + 12 * (parseFloat(css.getPropertyValue("--ag-stagger")) || 0);
  enterTimers.set(root, setTimeout(() => root.classList.remove("ag-enter"), ms));
}
const enterTimers = new WeakMap();

/**
 * Un numero che corre verso quello nuovo invece di cambiare di colpo, come il
 * conto degli scatti nel Visore (A79). `format` lo scrive; con «Riduci
 * movimento» si scrive subito quello finale.
 */
export function runNumber(target, from, to, format) {
  const quiet = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (quiet || from === null || to === null || from === to) {
    target.textContent = format(to);
    return;
  }
  // dura quanto la molla piccola: il tempo è un token, non un numero qui
  const ms = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--ag-motion-bounce")) || 0;
  const start = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - start) / ms);
    // la stessa curva del resto: parte svelto e rallenta arrivando
    const eased = 1 - (1 - k) ** 3;
    target.textContent = format(k < 1 ? from + (to - from) * eased : to);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ── Pezzi ricorrenti ─────────────────────────────────────────────── */

/** Il pallino colorato di una materia. */
export function dot(colorStyle) {
  return `<span class="ag-dot" style="${colorStyle}" aria-hidden="true"></span>`;
}

/** La freccia che apre e chiude qualcosa sotto di sé: punta in giù da chiusa,
 *  e si gira quando il pulsante ha `aria-expanded="true"` (lo fa il CSS). */
export function expandIcon() {
  return `<svg class="ag-expand__icon" width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"
    aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>`;
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

/* ── Scelta di un giorno ──────────────────────────────────────────────
 *
 * Un mese alla volta, con le frecce per scorrere. Non è un campo di testo e
 * non è il selettore nativo: il selettore nativo di iOS è una ruota che va
 * bene per una data di nascita, non per "il giovedì della settimana prossima",
 * dove serve vedere i giorni della settimana in fila.
 */


export function datePickerSheet(current, { title, min, max, onPick, allowNone } = {}) {
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
      // `max` serve ai voti: un voto non può essere di un giorno che non c'è ancora
      const disabled = (min && iso < min) || (max && iso > max);
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
