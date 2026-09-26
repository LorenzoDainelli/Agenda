/* Agenda — il pannello della spesa (§6.7).
 *
 * Si usa in piedi fra gli scaffali, con una mano: per questo ogni riga intera
 * è il bersaglio del tocco, non solo il cerchio, e il campo per aggiungere
 * tiene il cursore dopo ogni cosa scritta. Le regole (cosa è in lista, cosa è
 * già comprato, i doppioni) stanno in shopping.js.
 */

import { today as todayISO } from "./days.js";
import { t } from "./i18n.js";
import { addItem, toggleItem, inList, boughtBefore, clearBought } from "./shopping.js";
import { el, esc, onEach, toast, confirmSheet } from "./ui.js";

let items = [];
let handlers = null;
/* Il testo scritto e non ancora aggiunto: ogni tocco ridisegna il pannello, e
   senza tenerlo da parte un tocco su una riga lo cancellerebbe (come A28). */
let pending = "";

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
        ? `<div class="ag-rows">${list.map(row).join("")}</div>`
        : `<p class="ag-group__note">${esc(t("shop.empty"))}</p>`}
      <div class="ag-row">
        <input class="ag-input ag-input--inline" id="shop-new" type="text" value="${esc(pending)}"
               placeholder="${esc(t("shop.add"))}" enterkeyhint="done" autocomplete="off">
        <button class="ag-iconbtn" type="button" id="shop-add" aria-label="${esc(t("common.add"))}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
        </button>
      </div>
    </div>
    ${before.length ? `
      <div class="ag-group">
        <span class="ag-group__label">${esc(t("shop.bought"))}</span>
        <div class="ag-chips ag-chips--wrap">
          ${before.map((item) => `
            <button class="ag-chip" type="button" data-back="${esc(item.id)}">${esc(item.name)}</button>`).join("")}
        </div>
        <p class="ag-group__note">${esc(t("shop.bought.note"))}</p>
        <button class="ag-btn ag-btn--ghost" type="button" id="shop-clear">${esc(t("shop.clear"))}</button>
      </div>` : ""}
  `;

  bind(body, before.length);
}

function bind(body, nBought) {
  const input = body.querySelector("#shop-new");
  input.addEventListener("input", () => { pending = input.value; });

  const add = () => {
    const result = addItem(items, input.value, todayISO());
    if (result.status === "empty") return;
    const name = input.value.trim();
    pending = "";
    if (result.status === "already") toast(t("shop.already", { name }));
    else if (result.status === "back") toast(t("shop.back", { name }));
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

  body.querySelector("#shop-clear")?.addEventListener("click", () => {
    confirmSheet(nBought === 1 ? t("shop.clear.confirm.one") : t("shop.clear.confirm", { n: nBought }), {
      confirmLabel: t("shop.clear"),
      onConfirm: () => change(clearBought(items, todayISO())),
    });
  });
}
