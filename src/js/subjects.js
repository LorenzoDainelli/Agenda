/* Agenda — materie.
 *
 * Una materia è un nome, una sigla e un colore, e può dividersi in teoria e
 * laboratorio (`lab: true`, A44). Il colore non è un valore
 * esadecimale: è il NOME di un token (`sky`, `teal`, …). Nessun colore viene
 * mai scritto nel JavaScript — qui si sceglie quale token usare, e il valore
 * vero vive solo in `design_handoff/tokens/colors.css` (regola 3 di CLAUDE.md).
 */

import { newId } from "./model.js";

/**
 * I dodici colori disponibili, nell'ordine in cui vengono proposti.
 *
 * Sono sei tonalità in due intensità (vedi il commento nei token, che spiega
 * perché sei e non dodici). L'ordine conta: prima tutte e sei le tonalità
 * piene, alternate in modo da mettere le più lontane vicine nell'elenco, e
 * solo dopo le versioni chiare. Così le prime sei materie che si creano
 * prendono sei tonalità diverse, e due materie si assomigliano solo quando ce
 * ne sono più di sei — che è il momento in cui è inevitabile.
 */
export const COLORS = [
  "petrolio", "mattone", "oltremare", "oliva", "prugna", "muschio",
  "petrolio-2", "mattone-2", "oltremare-2", "oliva-2", "prugna-2", "muschio-2",
];

/** Le tre variabili che servono a dipingere qualcosa col colore di una materia. */
export function colorVars(color) {
  // Un nome sconosciuto (un dato vecchio, un backup di un'altra versione) non
  // deve dare un colore vuoto: ripiega sulla prima tonalità.
  const name = COLORS.includes(color) ? color : COLORS[0];
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
    lab: false,
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

/**
 * Teoria o laboratorio, per un compito (A44–A47): "lab", "theory", oppure
 * null quando la cosa non si pone.
 *
 * Si pone se la materia ha il laboratorio, o se il compito è segnato di
 * laboratorio: togliere il laboratorio a una materia non deve far dimenticare
 * che quel compito era di laboratorio (A47).
 */
export function modeOf(subjects, task) {
  if (task.lab) return "lab";
  const found = task.subjectId ? findSubject(subjects, task.subjectId) : null;
  return found?.lab ? "theory" : null;
}

export function subjectColor(subjects, task) {
  const found = task.subjectId ? findSubject(subjects, task.subjectId) : null;
  return found?.color ?? COLORS[0];
}

/** Quanti compiti usano una materia: serve a dirlo nella conferma di eliminazione. */
export function countUsing(tasks, subjectId) {
  return tasks.filter((task) => task.subjectId === subjectId).length;
}
