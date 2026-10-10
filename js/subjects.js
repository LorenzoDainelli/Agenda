/* Agenda — materie.
 *
 * Una materia è un nome, una sigla e un colore, e può dividersi in teoria e
 * laboratorio (`lab: true`, A44). Il colore non è un valore
 * esadecimale: è il NOME di un token (`t-5-5`, `petrolio`, …). Nessun colore
 * viene mai scritto nel JavaScript — qui si sceglie quale token usare, e il
 * valore vero vive solo in `design_handoff/tokens/` (regola 3 di CLAUDE.md).
 */

import { newId } from "./model.js";

/** Le dimensioni della tabella dei colori (`tokens/tavolozza.css`, A57). */
export const PALETTE_ROWS = 10;
export const PALETTE_COLS = 12;

/** Il nome di una casella della tabella, contando da zero. */
export function paletteColor(row, col) {
  return `t-${row}-${col}`;
}

/** Riga e colonna di una casella, o null se il colore non è della tabella. */
export function palettePos(color) {
  const match = /^t-(\d+)-(\d+)$/.exec(String(color));
  if (!match) return null;
  const row = Number(match[1]);
  const col = Number(match[2]);
  return row < PALETTE_ROWS && col < PALETTE_COLS ? { row, col } : null;
}

/**
 * I dodici colori di prima della tabella (A58).
 *
 * Non si propongono più, ma restano validi: una materia creata prima della
 * tabella, o arrivata da una copia di sicurezza, tiene il suo colore finché
 * non se ne sceglie un altro. Toglierli le lascerebbe tutte col colore di
 * ripiego, e sarebbe perdere un dato in silenzio (regola 4).
 */
export const COLORS = [
  "petrolio", "mattone", "oltremare", "oliva", "prugna", "muschio",
  "petrolio-2", "mattone-2", "oltremare-2", "oliva-2", "prugna-2", "muschio-2",
];

/**
 * I colori con cui nasce una materia nuova, nell'ordine (A58).
 *
 * Sei tinte della tabella lontane fra loro — rosso, blu, verde, ambra, rosa,
 * viola — prima in una chiarezza e poi in un'altra: le prime sei materie
 * prendono sei tinte diverse, e due si assomigliano solo dalla settima. La
 * colonna dell'azzurro non c'è: è quella vicina al colore d'azione (A60), e
 * una materia che nasce lì sembrerebbe un pulsante.
 */
export const SUGGESTED = [
  "t-3-5", "t-3-1", "t-3-11", "t-3-8", "t-3-4", "t-3-3",
  "t-7-5", "t-7-1", "t-7-11", "t-7-8", "t-7-4", "t-7-3",
];

/** Un colore che ha i suoi token: una casella della tabella o uno di prima. */
export function isColor(color) {
  return palettePos(color) !== null || COLORS.includes(color);
}

/** Le tre variabili che servono a dipingere qualcosa col colore di una materia. */
export function colorVars(color) {
  // Un nome sconosciuto (un dato rovinato, un backup di una versione futura)
  // non deve dare un colore vuoto: ripiega sul primo colore proposto.
  const name = isColor(color) ? color : SUGGESTED[0];
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
  return SUGGESTED.find((c) => !used.has(c)) || SUGGESTED[subjects.length % SUGGESTED.length];
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
  return found?.color ?? SUGGESTED[0];
}

/** Quanti compiti usano una materia: serve a dirlo nella conferma di eliminazione. */
export function countUsing(tasks, subjectId) {
  return tasks.filter((task) => task.subjectId === subjectId).length;
}
