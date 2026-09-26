/* Agenda — la fila dei giorni.
 *
 * È il componente che porta la regola della finestra (§5 del piano) sotto le
 * dita. Un giorno può essere in tre stati:
 *
 *   dentro   → posso farlo qui (è il default di tutta la finestra)
 *   escluso  → qui non posso
 *   scelto   → qui lo faccio, in un certo momento della giornata
 *
 * I gesti sono tre, e sono gli stessi tre di una lista della spesa:
 *
 *   tocco            → escludi / rimetti dentro
 *   tocco tenuto     → scegli il giorno (e il momento)
 *   dito trascinato  → applica a tutti i giorni che tocchi
 *
 * Il trascinamento è il motivo per cui non serve una modalità "intervallo":
 * un intervallo è solo un tocco lungo una fila di giorni, e trascinare il
 * dito è come si fa su un telefono. Un interruttore fra "giorni scelti" e
 * "intervallo" sarebbe una cosa in più da capire per fare la stessa cosa.
 */

import { dowShort, dayNumber } from "./days.js";
import { t, getLang } from "./i18n.js";
import { fullWindow, togglePick, toggleSkip, SLOTS } from "./model.js";
import { esc, chooseSheet } from "./ui.js";

/** Quanto deve durare la pressione per contare come "tocco tenuto". */
const HOLD_MS = 420;
/** Oltre questo spostamento è un trascinamento, non una pressione. */
const MOVE_PX = 10;

export function render(task, today) {
  const lang = getLang();
  const days = fullWindow(task, today);
  const skip = new Set(task.plan?.skip || []);
  const pick = task.plan?.pick || {};

  if (!task.due) {
    return `<p class="ag-window__hint">${esc(t("task.window.nodue"))}</p>`;
  }
  if (days.length === 0) {
    return `<p class="ag-window__hint">${esc(t("task.window.empty"))}</p>`;
  }

  // Il giorno della scadenza chiude la fila: non è toccabile, ma si vede —
  // serve a capire dove finisce la finestra e perché.
  const cells = days.map((day) => {
    const picked = day in pick;
    const state = picked ? "picked" : skip.has(day) ? "out" : "in";
    const slot = picked ? t(`slot.${pick[day]}.short`) : "";
    return `
      <button class="ag-day ag-day--${state}" type="button" data-day="${day}"
              aria-label="${esc(dowShort(day, lang))} ${dayNumber(day)}">
        <span class="ag-day__dow">${esc(dowShort(day, lang))}</span>
        <span class="ag-day__n">${dayNumber(day)}</span>
        <span class="ag-day__slot">${esc(slot)}</span>
      </button>`;
  });

  cells.push(`
    <span class="ag-day ag-day--due" aria-hidden="true">
      <span class="ag-day__dow">${esc(dowShort(task.due, lang))}</span>
      <span class="ag-day__n">${dayNumber(task.due)}</span>
      <span class="ag-day__slot">${esc(task.kind === "test" ? t("kind.test") : t("task.due"))}</span>
    </span>`);

  const hint = task.kind === "test" ? t("task.window.hint.test") : t("task.window.hint");

  return `
    <div class="ag-window">
      <div class="ag-window__days" id="window-days">${cells.join("")}</div>
      <p class="ag-window__hint">${esc(hint)}</p>
    </div>`;
}

/**
 * Attacca i gesti alla fila appena disegnata.
 *
 * `onChange` riceve il compito modificato; a ridisegnare ci pensa chi chiama,
 * perché la fila vive dentro un pannello che ha altre cose da aggiornare
 * insieme (l'avanzamento, il riepilogo).
 */
export function bind(root, task, today, onChange) {
  const strip = root.querySelector("#window-days");
  if (!strip) return;

  let current = task;
  let mode = null;        // "skip" | "unskip": deciso dal primo giorno toccato
  let startDay = null;
  let lastDay = null;
  let moved = false;
  let held = false;
  let timer = null;
  let startX = 0;
  let startY = 0;

  const dayAt = (x, y) => {
    const found = document.elementFromPoint(x, y);
    const cell = found?.closest?.("[data-day]");
    return cell?.dataset.day ?? null;
  };

  const stopTimer = () => {
    if (timer) { clearTimeout(timer); timer = null; }
  };

  /* Il tocco tenuto: apre la scelta del momento della giornata. Su un giorno
     già scelto offre anche di togliere la scelta, perché un tocco tenuto su
     un giorno scelto altrimenti non avrebbe risposta. */
  const hold = (day) => {
    held = true;
    const picked = current.plan?.pick?.[day];
    const options = SLOTS.map((slot) => ({
      value: slot,
      label: t(`slot.${slot}`),
      selected: picked === slot,
    }));
    if (picked) options.push({ value: "none", label: t("common.none") });
    chooseSheet(t("task.window"), options, (value) => {
      if (value === "none") {
        current = togglePick(current, day);
      } else if (picked) {
        current = { ...current, plan: { ...current.plan, pick: { ...current.plan.pick, [day]: value } } };
      } else {
        current = togglePick(current, day, value);
      }
      onChange(current);
    });
  };

  const apply = (day) => {
    const skipped = (current.plan?.skip || []).includes(day);
    const picked = Boolean(current.plan?.pick && day in current.plan.pick);
    if (mode === "skip" && !skipped) current = toggleSkip(current, day);
    else if (mode === "unskip" && (skipped || picked)) {
      // rimettere dentro un giorno scelto vuol dire togliergli la scelta:
      // "dentro" è lo stato di mezzo, ed è dove si torna
      current = picked ? togglePick(current, day) : toggleSkip(current, day);
    }
  };

  strip.addEventListener("pointerdown", (event) => {
    const day = event.target.closest?.("[data-day]")?.dataset.day;
    if (!day) return;
    startDay = day;
    lastDay = day;
    moved = false;
    held = false;
    startX = event.clientX;
    startY = event.clientY;
    const skipped = (current.plan?.skip || []).includes(day);
    const picked = Boolean(current.plan?.pick && day in current.plan.pick);
    mode = (skipped || picked) ? "unskip" : "skip";
    timer = setTimeout(() => { timer = null; hold(day); }, HOLD_MS);
  });

  strip.addEventListener("pointermove", (event) => {
    if (!startDay || held) return;
    if (!moved && (Math.abs(event.clientX - startX) > MOVE_PX || Math.abs(event.clientY - startY) > MOVE_PX)) {
      moved = true;
      stopTimer();
      // il primo giorno lo prende subito: chi trascina si aspetta che anche
      // quello da cui è partito cambi
      apply(startDay);
      onChange(current);
    }
    if (!moved) return;
    const day = dayAt(event.clientX, event.clientY);
    if (day && day !== lastDay) {
      lastDay = day;
      apply(day);
      onChange(current);
    }
  });

  const finish = () => {
    stopTimer();
    if (startDay && !moved && !held) {
      apply(startDay);
      onChange(current);
    }
    startDay = null;
    lastDay = null;
    mode = null;
  };

  strip.addEventListener("pointerup", finish);
  strip.addEventListener("pointercancel", () => { stopTimer(); startDay = null; });
  // Senza questo, trascinando il dito la fila scorre e il gesto si perde.
  strip.addEventListener("contextmenu", (event) => event.preventDefault());
}

/** Il riassunto della pianificazione, per la riga di un compito. */
export function planSummary(task, today) {
  const picks = Object.keys(task.plan?.pick || {}).sort().filter((day) => day >= today);
  if (picks.length === 0) return null;
  const lang = getLang();
  const first = picks[0];
  const slot = t(`slot.${task.plan.pick[first]}.short`);
  const more = picks.length > 1 ? ` +${picks.length - 1}` : "";
  return `${dowShort(first, lang)} ${dayNumber(first)} ${slot}${more}`;
}
