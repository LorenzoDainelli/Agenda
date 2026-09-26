/* Agenda — la lista della spesa: le regole (§6.7, §4.6).
 *
 * Solo funzioni pure, senza pagina: si provano da test/shopping.mjs. Il
 * pannello che le usa sta in shopping-view.js, come l'orario sta diviso fra
 * timetable.js e timetable-view.js.
 *
 * Una cosa da comprare non è un compito: non ha scadenza, non ha peso, non va
 * nell'archivio. Ha un solo stato che conta, `boughtAt`, e quello che si vede
 * dipende da lui e da oggi:
 *   - null        → da comprare
 *   - oggi        → comprata, ancora in lista e barrata fino a mezzanotte
 *   - prima       → fra le «Già comprate», da dove un tocco la rimette in lista
 * Niente si cancella da sé (regola 4, assunzione A37): a mezzanotte una cosa
 * comprata cambia posto, non sparisce.
 */

import { newId } from "./model.js";

/** Lo stesso nome, scritto un po' diverso: «Latte » e «latte» sono una cosa. */
function key(name) {
  return String(name ?? "").trim().toLocaleLowerCase();
}

/** Un elenco letto da fuori (il telefono, una copia) reso sicuro da usare. */
export function normalize(items) {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => item && typeof item.id === "string" && typeof item.name === "string" && item.name.trim())
    .map((item) => ({
      id: item.id,
      name: item.name.trim(),
      addedAt: typeof item.addedAt === "string" ? item.addedAt : null,
      boughtAt: typeof item.boughtAt === "string" ? item.boughtAt : null,
    }));
}

/**
 * Aggiunge una cosa. Dice anche cosa è successo, perché il pannello lo possa
 * dire a sua volta:
 *   "added"   — nuova
 *   "back"    — c'era fra le comprate, torna in lista (A38)
 *   "already" — è già in lista, non si fa un doppione
 *   "empty"   — niente da aggiungere
 */
export function addItem(items, name, today) {
  const clean = String(name ?? "").trim();
  if (!clean) return { items, status: "empty" };
  const found = items.find((item) => key(item.name) === key(clean));
  if (found && !found.boughtAt) return { items, status: "already" };
  if (found) {
    // torna in fondo alla lista, come una cosa appena scritta: è lì che la si
    // cerca con gli occhi dopo averla aggiunta
    const rest = items.filter((item) => item.id !== found.id);
    return { items: [...rest, { ...found, boughtAt: null, addedAt: today }], status: "back" };
  }
  return {
    items: [...items, { id: newId("c"), name: clean, addedAt: today, boughtAt: null }],
    status: "added",
  };
}

/** Il cerchio: da comprare → comprata oggi, e viceversa. Una cosa comprata
 *  un altro giorno torna da comprare (è il tocco sulle «Già comprate»). */
export function toggleItem(items, id, today) {
  const item = items.find((entry) => entry.id === id);
  if (!item) return items;
  if (!item.boughtAt || item.boughtAt === today) {
    const boughtAt = item.boughtAt ? null : today;
    return items.map((entry) => (entry.id === id ? { ...entry, boughtAt } : entry));
  }
  // dalle «Già comprate»: torna in fondo alla lista, come una cosa appena
  // scritta, per la stessa ragione di addItem
  return [...items.filter((entry) => entry.id !== id), { ...item, boughtAt: null, addedAt: today }];
}

/** La lista: da comprare, e comprate oggi (barrate), nell'ordine in cui sono
 *  state scritte. Una riga spuntata resta al suo posto, come un compito fatto. */
export function inList(items, today) {
  return items.filter((item) => !item.boughtAt || item.boughtAt === today);
}

/** Le «Già comprate»: prima quella comprata più di recente, poi per nome. */
export function boughtBefore(items, today) {
  return items
    .filter((item) => item.boughtAt && item.boughtAt < today)
    .sort((a, b) => b.boughtAt.localeCompare(a.boughtAt) || a.name.localeCompare(b.name));
}

/** Quante cose restano da comprare. */
export function countToBuy(items) {
  return items.filter((item) => !item.boughtAt).length;
}

/** «Svuota»: toglie le «Già comprate», e solo quelle. La conferma coi numeri
 *  la chiede chi la chiama (regola 4). */
export function clearBought(items, today) {
  return items.filter((item) => !item.boughtAt || item.boughtAt >= today);
}
