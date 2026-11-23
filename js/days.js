/* Agenda — date.
 *
 * Una data in questa app è SEMPRE una stringa `YYYY-MM-DD`, mai un oggetto
 * `Date` salvato. Il motivo è banale e costa caro scoprirlo dopo: un `Date`
 * porta dentro un'ora e un fuso, e "il 25 settembre" diventa "il 24 alle 23"
 * appena si attraversa un confine di fuso o l'ora legale. Una stringa di dieci
 * caratteri non ha questo problema.
 *
 * Gli oggetti `Date` esistono solo dentro queste funzioni, il tempo di fare un
 * conto, e sono sempre costruiti a mezzogiorno UTC: così nessun arrotondamento
 * di fuso può spostare il giorno.
 *
 * I giorni della settimana sono numeri ISO: 1 = lunedì … 7 = domenica.
 * I nomi dei giorni e dei mesi non sono scritti da nessuna parte: li dà
 * `Intl.DateTimeFormat` nella lingua attiva.
 */

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function isISO(value) {
  return typeof value === "string" && ISO.test(value);
}

/** Da stringa a Date, a mezzogiorno UTC. Solo per uso interno ai conti. */
function at(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

function fmt(date) {
  return date.toISOString().slice(0, 10);
}

/** Oggi secondo l'orologio del telefono, non secondo UTC. */
export function today() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(iso, n) {
  const date = at(iso);
  date.setUTCDate(date.getUTCDate() + n);
  return fmt(date);
}

/** Quanti giorni da `from` a `to`. Negativo se `to` è prima. */
export function diffDays(from, to) {
  return Math.round((at(to) - at(from)) / 86400000);
}

/** Giorno della settimana ISO: 1 = lunedì … 7 = domenica. */
export function dow(iso) {
  return ((at(iso).getUTCDay() + 6) % 7) + 1;
}

export function mondayOf(iso) {
  return addDays(iso, 1 - dow(iso));
}

/** Tutti i giorni da `from` a `to`, estremi compresi. Vuoto se `to` < `from`. */
export function range(from, to) {
  const out = [];
  const n = diffDays(from, to);
  for (let i = 0; i <= n; i += 1) out.push(addDays(from, i));
  return out;
}

export function dayNumber(iso) {
  return Number(iso.slice(8, 10));
}

export function monthKey(iso) {
  return iso.slice(0, 7);
}

/** Il primo giorno del mese di `iso`. */
export function firstOfMonth(iso) {
  return `${monthKey(iso)}-01`;
}

export function addMonths(iso, n) {
  const [y, m] = iso.split("-").map(Number);
  const total = (y * 12 + (m - 1)) + n;
  const yy = Math.floor(total / 12);
  const mm = String((total % 12) + 1).padStart(2, "0");
  return `${yy}-${mm}-01`;
}

export function daysInMonth(iso) {
  const [y, m] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function clamp(iso, min, max) {
  if (min && iso < min) return min;
  if (max && iso > max) return max;
  return iso;
}

/* ── Formati ──────────────────────────────────────────────────────────
 * Tutti prendono la lingua attiva, perché l'interfaccia è bilingue e un nome
 * di giorno scritto a mano esisterebbe in una lingua sola.
 */

function intl(locale, options) {
  return new Intl.DateTimeFormat(locale, { timeZone: "UTC", ...options });
}

/** "lun", "Mon" */
export function dowShort(iso, locale) {
  return intl(locale, { weekday: "short" }).format(at(iso)).replace(".", "");
}

/** "lunedì", "Monday" */
export function dowLong(iso, locale) {
  return intl(locale, { weekday: "long" }).format(at(iso));
}

/** "25 set", "25 Sep" */
export function dayMonth(iso, locale) {
  return intl(locale, { day: "numeric", month: "short" }).format(at(iso)).replace(".", "");
}

/** "giovedì 25 settembre", "Thursday 25 September" */
export function full(iso, locale) {
  return intl(locale, { weekday: "long", day: "numeric", month: "long" }).format(at(iso));
}

/** "settembre 2026", "September 2026" */
export function monthYear(iso, locale) {
  return intl(locale, { month: "long", year: "numeric" }).format(at(iso));
}

/** Le sigle dei sette giorni a partire dal lunedì: per le intestazioni. */
export function weekdayInitials(locale) {
  return range("2024-01-01", "2024-01-07").map((iso) => dowShort(iso, locale));
}
