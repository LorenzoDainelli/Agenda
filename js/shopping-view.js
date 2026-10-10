/* Agenda — il pannello della spesa (§6.7).
 *
 * Si usa in piedi fra gli scaffali, con una mano: per questo ogni riga intera
 * è il bersaglio del tocco, non solo il cerchio, e il campo per aggiungere
 * tiene il cursore dopo ogni cosa scritta. Correggere e togliere sono gesti
 * di lato sulla stessa riga (A54): verso sinistra si corregge, verso destra
 * si toglie, con la conferma. Le regole (cosa è in lista, cosa è già
 * comprato, i doppioni) stanno in shopping.js.
 */

import { today as todayISO } from "./days.js";
import { t } from "./i18n.js";
import {
  addItem, toggleItem, inList, boughtBefore, clearBought, parseItem, qtyLabel,
  itemText, editItem, removeItem, countToBuy, listText,
} from "./shopping.js";
import { el, esc, onEach, toast, confirmSheet, openSheet, closeSheet, bindSwipe } from "./ui.js";

let items = [];
let handlers = null;
/* Il testo scritto e non ancora aggiunto: ogni tocco ridisegna il pannello, e
   senza tenerlo da parte un tocco su una riga lo cancellerebbe (come A28). */
let pending = "";
/* Lo scorrimento si attacca una volta sola, al contenitore: le righe si
   ridisegnano a ogni tocco, il contenitore resta. */
let swipeBound = false;

export function open(list, callbacks) {
  items = list;
  handlers = callbacks;
  pending = "";
  render();
}

export function refresh(list) {
  if (!handlers) return;
  items = list;
  render();
}

function change(next) {
  items = next;
  handlers.onChange(next);
}

function row(item) {
  const bought = Boolean(item.boughtAt);
  // la riga intera è il pulsante: al supermercato si mira male
  return `
    <button class="ag-row ag-row--tap ag-shop" type="button" data-item="${esc(item.id)}"
            aria-pressed="${bought ? "true" : "false"}">
      <span class="ag-row__label">${esc(item.name)}</span>
      ${item.qty ? `<span class="ag-row__value">${esc(qtyLabel(item.qty))}</span>` : ""}
      <span class="ag-check" aria-hidden="true" aria-pressed="${bought ? "true" : "false"}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>
      </span>
    </button>`;
}

export function render() {
  const body = el("shopping-body");
  const today = todayISO();
  const list = inList(items, today);
  const before = boughtBefore(items, today);

  body.innerHTML = `
    <div class="ag-group">
      ${list.length
        ? `<div class="ag-rows">${list.map(row).join("")}</div>
           <p class="ag-group__note">${esc(t("shop.swipe.hint"))}</p>`
        : `<p class="ag-group__note">${esc(t("shop.empty"))}</p>`}
      <div class="ag-row">
        <input class="ag-input ag-input--inline" id="shop-new" type="text" value="${esc(pending)}"
               placeholder="${esc(t("shop.add"))}" enterkeyhint="done" autocomplete="off">
        <button class="ag-iconbtn" type="button" id="shop-add" aria-label="${esc(t("common.add"))}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
        </button>
      </div>
      <p class="ag-group__note">${esc(t("shop.qty.hint"))}</p>
      ${countToBuy(items) ? `
        <button class="ag-btn ag-btn--secondary" type="button" id="shop-copy">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg>
          ${esc(t("shop.copy"))}
        </button>` : ""}
    </div>
    ${before.length ? `
      <div class="ag-group">
        <span class="ag-group__label">${esc(t("shop.bought"))}</span>
        <div class="ag-chips ag-chips--wrap">
          ${before.map((item) => `
            <button class="ag-chip" type="button" data-back="${esc(item.id)}">
              ${esc(item.name)}${item.qty ? ` <span class="ag-chip__sub">${esc(qtyLabel(item.qty))}</span>` : ""}
            </button>`).join("")}
        </div>
        <p class="ag-group__note">${esc(t("shop.bought.note"))}</p>
        <button class="ag-btn ag-btn--ghost" type="button" id="shop-clear">${esc(t("shop.clear"))}</button>
      </div>` : ""}
  `;

  bind(body, before.length);
  if (!swipeBound) {
    swipeBound = true;
    bindSwipe(body, {
      selector: "[data-item]",
      directions: ["left", "right"],
      onSwipe: (target, direction) => {
        if (direction === "left") editSheet(target.dataset.item);
        else askRemove(target.dataset.item);
      },
    });
  }
}

/** Verso sinistra: il foglio per correggerla, col testo com'era scritto
 *  («2 latte»), da cambiare come lo si scriverebbe (A54). Qui la tastiera si
 *  apre da sola: è un nome, ed è l'unica cosa che c'è da fare. */
function editSheet(id) {
  const item = items.find((entry) => entry.id === id);
  if (!item) return;
  const sheet = openSheet(`
    <p class="ag-sheet__title">${esc(t("shop.edit"))}</p>
    <div class="ag-group">
      <input class="ag-input" id="shop-edit" type="text" value="${esc(itemText(item))}"
             enterkeyhint="done" autocomplete="off" aria-label="${esc(t("shop.edit"))}">
      <p class="ag-group__note">${esc(t("shop.qty.hint"))}</p>
      <button class="ag-btn" type="button" data-act="save">${esc(t("common.save"))}</button>
      <button class="ag-btn ag-btn--ghost" type="button" data-act="cancel">${esc(t("common.cancel"))}</button>
    </div>
  `);
  const input = sheet.querySelector("#shop-edit");
  const save = () => {
    const result = editItem(items, id, input.value);
    // senza un nome non si chiude: la cosa c'è ancora, e va chiamata in qualche modo
    if (result.status === "empty") return;
    closeSheet();
    if (result.status === "taken") toast(t("shop.taken", { name: parseItem(input.value).name }));
    if (result.status === "edited") change(result.items);
  };
  sheet.querySelector('[data-act="save"]').addEventListener("click", save);
  sheet.querySelector('[data-act="cancel"]').addEventListener("click", closeSheet);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") { event.preventDefault(); save(); }
  });
  input.focus();
}

/** Verso destra: toglierla, dopo averlo chiesto (regola 4). L'annulla la
 *  rimette dov'era, senza disfare quello che è cambiato nel frattempo. */
function askRemove(id) {
  const item = items.find((entry) => entry.id === id);
  if (!item) return;
  const text = itemText(item);
  confirmSheet(t("shop.remove.confirm", { name: text }), {
    confirmLabel: t("shop.remove"),
    onConfirm: () => {
      const index = items.findIndex((entry) => entry.id === id);
      change(removeItem(items, id));
      toast(t("shop.removed", { name: text }), {
        onUndo: () => {
          if (items.some((entry) => entry.id === id)) return;
          const next = [...items];
          next.splice(Math.min(index, next.length), 0, item);
          change(next);
        },
      });
    },
  });
}

function bind(body, nBought) {
  const input = body.querySelector("#shop-new");
  input.addEventListener("input", () => { pending = input.value; });

  const add = () => {
    const result = addItem(items, input.value, todayISO());
    if (result.status === "empty") return;
    const { name, qty } = parseItem(input.value);
    pending = "";
    if (result.status === "already") toast(t("shop.already", { name }));
    else if (result.status === "back") toast(t("shop.back", { name }));
    else if (result.status === "updated") toast(t("shop.updated", { name, qty: qtyLabel(qty) }));
    change(result.items);
    // il cursore resta nel campo: la spesa si detta una cosa dopo l'altra
    el("shopping-body").querySelector("#shop-new")?.focus();
  };
  body.querySelector("#shop-add").addEventListener("click", add);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") { event.preventDefault(); add(); }
  });

  onEach(body, "[data-item]", "click", (event) => {
    change(toggleItem(items, event.currentTarget.dataset.item, todayISO()));
  });
  onEach(body, "[data-back]", "click", (event) => {
    change(toggleItem(items, event.currentTarget.dataset.back, todayISO()));
  });

  body.querySelector("#shop-copy")?.addEventListener("click", async () => {
    const copied = await copyText(listText(items, t("shop.title")));
    toast(copied ? t("shop.copied") : t("shop.copy.failed"));
  });

  body.querySelector("#shop-clear")?.addEventListener("click", () => {
    confirmSheet(nBought === 1 ? t("shop.clear.confirm.one") : t("shop.clear.confirm", { n: nBought }), {
      confirmLabel: t("shop.clear"),
      onConfirm: () => change(clearBought(items, todayISO())),
    });
  });
}

/** Mette un testo negli appunti e dice se ci è riuscito (A63). La strada
 *  nuova vuole un indirizzo sicuro: l'app pubblicata lo è, una prova aperta
 *  da un altro computer di casa no, e lì si ripiega sulla vecchia. */
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return copyTextOld(text);
  }
}

/** La strada vecchia: un campo nascosto, selezionato e copiato. In sola
 *  lettura perché sul telefono non apra la tastiera; `ag-input` per i suoi
 *  17px, sotto i quali Safari ingrandirebbe la pagina prendendo il fuoco. */
function copyTextOld(text) {
  const area = document.createElement("textarea");
  area.className = "ag-input ag-visually-hidden";
  area.setAttribute("readonly", "");
  area.setAttribute("aria-hidden", "true");
  area.value = text;
  document.body.append(area);
  try {
    area.focus({ preventScroll: true });
    area.select();
    area.setSelectionRange(0, text.length);
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    area.remove();
  }
}
