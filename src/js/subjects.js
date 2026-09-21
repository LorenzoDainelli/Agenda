/* Agenda — materie.
 *
 * Una materia è un nome, una sigla e un colore. Il colore non è un valore
 * esadecimale: è il NOME di un token (`sky`, `teal`, …). Nessun colore viene
 * mai scritto nel JavaScript — qui si sceglie quale token usare, e il valore
 * vero vive solo in `design_handoff/tokens/colors.css` (regola 3 di CLAUDE.md).
 */

import { newId } from "./model.js";

/**
 * Gli undici colori disponibili, nell'ordine in cui vengono proposti.
 * L'ordine non è casuale: colori vicini nella tavolozza sono lontani
 * nell'elenco, così le prime materie che si creano prendono colori che non si
 * confondono fra loro.
 */
export const COLORS = [
  "sky", "amber", "violet", "green", "rose",
  "teal", "orange", "indigo", "lime", "fuchsia", "slate",
];

/** Le tre variabili che servono a dipingere qualcosa col colore di una materia. */
export function colorVars(color) {
  const name = COLORS.includes(color) ? color : "slate";
  return {
    "--ag-dot": `var(--ag-subj-${name})`,
    "--ag-chip-soft": `var(--ag-subj-${name}-soft)`,
    "--ag-chip-ink": `var(--ag-subj-${name}-ink)`,
  };
}

/** Le stesse variabili come stringa da mettere in un attributo `style`. */
export function colorStyle(color) {
  return Object.entries(colorVars(color)).map(([k, v]) => `${k}:${v}`).join(";");
}

/**
 * La sigla proposta per un nome.
 *
 * Quattro lettere sono il massimo che sta in una casella dell'orario a
 * larghezza di iPhone con sei colonne — misurato, non scelto. Un nome di due
 * parole ("Scienze motorie") dà le iniziali di entrambe, che si riconoscono
 * meglio delle prime quattro lettere della prima.
 */
export function suggestShort(name) {
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) return words[0].slice(0, 4).toUpperCase();
  return words.slice(0, 3).map((w) => w[0]).join("").toUpperCase();
}

/** Il primo colore non ancora usato, così due materie nuove non nascono uguali. */
export function nextColor(subjects) {
  const used = new Set(subjects.map((s) => s.color));
  return COLORS.find((c) => !used.has(c)) || COLORS[subjects.length % COLORS.length];
}

export function newSubject(name, subjects = []) {
  const clean = String(name).trim();
  return {
    id: newId("s"),
    name: clean,
    short: suggestShort(clean),
    color: nextColor(subjects),
  };
}

export function findSubject(subjects, id) {
  return subjects.find((s) => s.id === id) || null;
}

/**
 * Il nome da mostrare per la materia di un compito.
 *
 * Vince la materia che esiste ancora; se è stata eliminata resta il nome
 * congelato dentro il compito. Così eliminare una materia non rende
 * illeggibili i compiti che la usavano (regola 4: mai perdere dati in
 * silenzio, nemmeno un nome).
 */
export function subjectLabel(subjects, task) {
  const found = task.subjectId ? findSubject(subjects, task.subjectId) : null;
  return found?.name ?? task.subjectName ?? null;
}

export function subjectColor(subjects, task) {
  const found = task.subjectId ? findSubject(subjects, task.subjectId) : null;
  return found?.color ?? "slate";
}

/** Quanti compiti usano una materia: serve a dirlo nella conferma di eliminazione. */
export function countUsing(tasks, subjectId) {
  return tasks.filter((task) => task.subjectId === subjectId).length;
}
