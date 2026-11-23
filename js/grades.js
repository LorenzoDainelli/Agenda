/* Agenda — i voti e le loro medie (§6.8).
 *
 * Un voto è una materia, un numero, un giorno e, per una materia che ce l'ha,
 * se è di laboratorio. Qui ci sono solo le regole: quali voti esistono, a
 * quale quadrimestre appartiene un giorno, come si fa una media. Il pannello
 * sta in grades-view.js.
 *
 * I quadrimestri non sono date scritte qui ma una regola che vale ogni anno
 * (A66): il primo da settembre a gennaio, il secondo da febbraio a giugno.
 * Così l'anno prossimo funziona senza toccare niente, e nel repo non finisce
 * il calendario di una scuola vera.
 */

import { newId } from "./model.js";
import { isISO, today as todayISO } from "./days.js";

/** Dal 2 al 10 di mezzo in mezzo (A67): diciassette voti, tutti a un tocco. */
export const VALUES = Array.from({ length: 17 }, (_, i) => 2 + i / 2);

/** La soglia della sufficienza: sotto, la media si vede in rosso. */
export const PASS = 6;

/** L'anno scolastico di un giorno, come l'anno solare in cui comincia:
 *  da settembre si è nell'anno nuovo, prima ancora in quello vecchio. */
export function schoolYearOf(date) {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  return month >= 9 ? year : year - 1;
}

/** Il primo e l'ultimo giorno di un quadrimestre (1 o 2) o dell'anno intero. */
export function rangeOf(year, period) {
  const first = `${year}-09-01`;
  const split = `${year + 1}-02-01`;
  const last = `${year + 1}-06-30`;
  if (period === 1) return { from: first, to: `${year + 1}-01-31` };
  if (period === 2) return { from: split, to: last };
  return { from: first, to: last };
}

/** Il quadrimestre di un giorno: 1, 2, oppure null d'estate. */
export function termOf(date) {
  const month = Number(date.slice(5, 7));
  if (month >= 9 || month === 1) return 1;
  if (month <= 6) return 2;
  return null;
}

/** Il quadrimestre da mostrare aprendo i voti: quello di oggi, e d'estate
 *  l'anno intero, che è quello che si vuole rivedere a scuola finita. */
export function defaultPeriod(today = todayISO()) {
  return termOf(today) ?? "year";
}

export function isValue(value) {
  return VALUES.includes(value);
}

export function newGrade({ subjectId, subjectName, value, date, lab }) {
  return {
    id: newId("g"),
    subjectId,
    // il nome resta congelato nel voto, come nei compiti: eliminare una
    // materia non deve lasciare voti senza nome (regola 4)
    subjectName: subjectName || null,
    value,
    date,
    lab: lab === true,
  };
}

/** Tiene solo i voti che hanno senso: un file a metà o una copia vecchia
 *  non devono far comparire medie sbagliate. */
export function normalize(list) {
  if (!Array.isArray(list)) return [];
  return list.filter((g) => g && typeof g.id === "string" && typeof g.subjectId === "string"
    && isValue(g.value) && isISO(g.date));
}

/** La media, o null se non c'è nessun voto: «nessuna media» non è zero. */
export function average(values) {
  if (!values.length) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** I voti di un periodo dell'anno scolastico, dal più recente. */
export function inPeriod(grades, year, period) {
  const { from, to } = rangeOf(year, period);
  return grades
    .filter((g) => g.date >= from && g.date <= to)
    .sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Le medie di una materia (A68): teoria, laboratorio e tutti i voti insieme.
 * La complessiva è la media di tutti i voti, non delle due medie: un voto di
 * laboratorio pesa quanto uno di teoria.
 */
export function subjectAverages(grades, subjectId) {
  const own = grades.filter((g) => g.subjectId === subjectId);
  return {
    theory: average(own.filter((g) => !g.lab).map((g) => g.value)),
    lab: average(own.filter((g) => g.lab).map((g) => g.value)),
    all: average(own.map((g) => g.value)),
    count: own.length,
  };
}

/**
 * La media generale (A69): la media delle medie delle materie che hanno
 * almeno un voto. Ogni materia pesa uguale, come in pagella, e una materia
 * con tanti voti non schiaccia le altre.
 */
export function overallAverage(grades) {
  const ids = [...new Set(grades.map((g) => g.subjectId))];
  return average(ids.map((id) => subjectAverages(grades, id).all));
}

/**
 * Le materie da elencare: tutte quelle che esistono, poi quelle eliminate che
 * hanno ancora voti nel periodo, col nome congelato.
 */
export function subjectsWithGrades(grades, subjects) {
  const known = subjects.map((s) => ({ id: s.id, name: s.name, subject: s }));
  const ids = new Set(subjects.map((s) => s.id));
  const gone = new Map();
  for (const g of grades) {
    if (!ids.has(g.subjectId) && !gone.has(g.subjectId)) {
      gone.set(g.subjectId, { id: g.subjectId, name: g.subjectName || "?", subject: null });
    }
  }
  return [...known, ...gone.values()];
}

/** Un voto o una media scritti come a scuola: «6,5», «7,25», senza zeri
 *  inutili. Le medie si fermano a due decimali. */
export function formatNumber(value, lang) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat(lang === "en" ? "en" : "it", { maximumFractionDigits: 2 }).format(value);
}

export function replaceGrade(grades, grade) {
  return grades.map((g) => (g.id === grade.id ? grade : g));
}

export function removeGrade(grades, id) {
  return grades.filter((g) => g.id !== id);
}
