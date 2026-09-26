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

/* La quantità si scrive davanti, come le parti di un compito («5 frasi»):
   «2 latte», «500 g farina», «1,5 kg mele», «2 litri latte». Le unità sono
   quelle della spesa, corte e lunghe; una parola che non è fra queste resta
   nel nome, e il numero da solo diventa «×2» (A42). */
const QUANTITY = /^(\d+(?:[.,]\d+)?)\s*(kg|hg|g|l|dl|cl|ml|pz|litri|litro|grammi|etti|etto|chili|pezzi|conf)?\s+(.+)$/i;

/** Separa quantità e nome: «500g farina» → { qty: "500 g", name: "farina" }.
 *  Senza un numero davanti la quantità è null. */
export function parseItem(text) {
  const clean = String(text ?? "").trim();
  const match = clean.match(QUANTITY);
  if (!match) return { name: clean, qty: null };
  const [, number, unit, name] = match;
  return { name: name.trim(), qty: unit ? `${number} ${unit.toLowerCase()}` : number };
}

/** Come si legge una quantità: «×2» per un numero solo, «500 g» con l'unità. */
export function qtyLabel(qty) {
  if (!qty) return "";
  return /^\d+(?:[.,]\d+)?$/.test(qty) ? `×${qty}` : qty;
}

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
      qty: typeof item.qty === "string" && item.qty.trim() ? item.qty.trim() : null,
      addedAt: typeof item.addedAt === "string" ? item.addedAt : null,
      boughtAt: typeof item.boughtAt === "string" ? item.boughtAt : null,
    }));
}

/**
 * Aggiunge una cosa. Dice anche cosa è successo, perché il pannello lo possa
 * dire a sua volta:
 *   "added"   — nuova
 *   "back"    — c'era fra le comprate, torna in lista (A38)
 *   "updated" — è già in lista, e cambia la quantità (A43)
 *   "already" — è già in lista così com'è, non si fa un doppione
 *   "empty"   — niente da aggiungere
 */
export function addItem(items, text, today) {
  const { name, qty } = parseItem(text);
  if (!name) return { items, status: "empty" };
  const found = items.find((item) => key(item.name) === key(name));
  if (found && !found.boughtAt) {
    if (!qty || qty === found.qty) return { items, status: "already" };
    return { items: items.map((item) => (item.id === found.id ? { ...item, qty } : item)), status: "updated" };
  }
  if (found) {
    // torna in fondo alla lista, come una cosa appena scritta: è lì che la si
    // cerca con gli occhi dopo averla aggiunta. Senza un numero nuovo tiene
    // la quantità dell'ultima volta: sei uova restano sei uova.
    const rest = items.filter((item) => item.id !== found.id);
    return { items: [...rest, { ...found, qty: qty ?? found.qty ?? null, boughtAt: null, addedAt: today }], status: "back" };
  }
  return {
    items: [...items, { id: newId("c"), name, qty, addedAt: today, boughtAt: null }],
    status: "added",
  };
}

/** Una cosa scritta come la si scrive nel campo: «2 latte», «500 g farina».
 *  È il testo da cui parte la correzione (A54), e rileggendolo con parseItem
 *  torna la stessa cosa. */
export function itemText(item) {
  return item.qty ? `${item.qty} ${item.name}` : item.name;
}

/**
 * Corregge una cosa col testo nuovo, quantità compresa (A54). Dice cosa è
 * successo:
 *   "edited"  — cambiata
 *   "same"    — il testo è quello di prima
 *   "empty"   — senza un nome non si cambia niente
 *   "taken"   — c'è già un'altra cosa con quel nome (A55): non si cambia
 *   "missing" — la cosa non c'è più
 * La cosa corretta resta dov'era e com'era (comprata o no): cambia solo come
 * si chiama.
 */
export function editItem(items, id, text) {
  const item = items.find((entry) => entry.id === id);
  if (!item) return { items, status: "missing" };
  const { name, qty } = parseItem(text);
  if (!name) return { items, status: "empty" };
  if (name === item.name && qty === item.qty) return { items, status: "same" };
  const other = items.find((entry) => entry.id !== id && key(entry.name) === key(name));
  if (other) return { items, status: "taken" };
  return { items: items.map((entry) => (entry.id === id ? { ...entry, name, qty } : entry)), status: "edited" };
}

/** Toglie una cosa. La conferma la chiede chi la chiama (regola 4), e
 *  l'annulla rimette l'elenco di prima. */
export function removeItem(items, id) {
  return items.filter((item) => item.id !== id);
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
