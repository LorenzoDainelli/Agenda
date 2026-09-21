/* Agenda — il modello di un compito.
 *
 * Qui dentro non si tocca la pagina e non si tocca la memoria: sono funzioni
 * pure che prendono un compito e una data e dicono qualcosa su di lui. È il
 * posto in cui vive la regola della finestra (§5 del piano), cioè l'unica
 * idea originale di questa app — e l'unica cosa che vale la pena provare a
 * mano prima di fidarsi.
 */

import { today as todayISO, addDays, diffDays, range } from "./days.js";

export const AREA_SCHOOL = "school";
export const AREA_PRIVATE = "private";

export const KINDS = ["homework", "test", "todo"];
export const SLOTS = ["morning", "afternoon", "evening"];
export const WEIGHTS = [1, 2, 3];

/** Un id corto, leggibile in un file di backup e abbastanza unico per un telefono. */
export function newId(prefix) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function newTask(fields = {}) {
  return {
    id: newId("t"),
    area: fields.area || AREA_SCHOOL,
    subjectId: fields.subjectId ?? null,
    // il nome della materia viene congelato dentro il compito: se la materia
    // viene eliminata, il compito resta leggibile (lo stesso trucco del
    // `typeName` di Shift Hours)
    subjectName: fields.subjectName ?? null,
    kind: KINDS.includes(fields.kind) ? fields.kind : "homework",
    title: (fields.title || "").trim(),
    due: fields.due ?? null,
    weight: WEIGHTS.includes(fields.weight) ? fields.weight : 1,
    createdAt: fields.createdAt || todayISO(),
    doneAt: null,
    droppedAt: null,
    plan: { skip: [], pick: {} },
    parts: [],
  };
}

export function newPart(title, total = 1) {
  return {
    id: newId("p"),
    title: (title || "").trim(),
    total: Math.max(1, Number(total) || 1),
    done: 0,
    pick: {},
  };
}

/* ── La regola della finestra ─────────────────────────────────────────
 *
 *   finestra = [ oggi … scadenza − 1 giorno ] − giorni esclusi
 *
 * L'estremo destro è escluso perché un compito "per giovedì" si fa entro
 * mercoledì: giovedì lo si consegna. Tre casi limite, tutti voluti:
 *
 *   - scadenza domani  → resta il solo oggi
 *   - scadenza oggi    → resta il solo oggi, ed è l'ultimo momento utile
 *   - scadenza passata → finestra vuota: non c'è più niente da pianificare,
 *                        c'è da rispondere alla rassegna (review.js)
 *
 * Una verifica usa la stessa regola: il suo `due` è il giorno in cui si
 * svolge, e la finestra sono i giorni in cui si studia. Per questo non serve
 * un secondo meccanismo — la differenza fra un compito e una verifica sta in
 * come si mostrano, non in come si pianificano.
 */

/** La finestra grezza, senza togliere i giorni esclusi. */
export function fullWindow(task, today = todayISO()) {
  if (!task.due) return [];
  if (task.due < today) return [];
  if (task.due === today) return [today];
  const last = addDays(task.due, -1);
  return last < today ? [today] : range(today, last);
}

/** La finestra vera: quella grezza meno i giorni che ha escluso. */
export function windowDays(task, today = todayISO()) {
  const skip = new Set(task.plan?.skip || []);
  return fullWindow(task, today).filter((day) => !skip.has(day));
}

/** I giorni che ha scelto, in ordine. Possono essere nel passato. */
export function pickedDays(task) {
  return Object.keys(task.plan?.pick || {}).sort();
}

/**
 * Il giorno in cui il compito compare nell'elenco e nel calendario.
 *
 * Se ha scelto dei giorni vale il primo che non è ancora passato. Se sono
 * tutti passati e il compito non è fatto, è roba di oggi: aveva detto che
 * l'avrebbe fatto e non l'ha fatto, e nascondergli la cosa nel passato
 * sarebbe il modo più sicuro di non fargliela più vedere.
 */
export function workDate(task, today = todayISO()) {
  const picks = pickedDays(task);
  const ahead = picks.find((day) => day >= today);
  if (ahead) return ahead;
  if (picks.length > 0) return today;
  return task.due ?? null;
}

/* ── Stato ────────────────────────────────────────────────────────── */

export function isDone(task) {
  return Boolean(task.doneAt);
}

export function isDropped(task) {
  return Boolean(task.droppedAt);
}

export function isOpen(task) {
  return !isDone(task) && !isDropped(task);
}

export function isLate(task, today = todayISO()) {
  return isOpen(task) && Boolean(task.due) && task.due < today;
}

/** Quanti giorni mancano alla scadenza. Negativo se è passata. */
export function daysLeft(task, today = todayISO()) {
  return task.due ? diffDays(today, task.due) : null;
}

/* ── Parti e avanzamento ──────────────────────────────────────────── */

export function isPartDone(part) {
  return Number(part.done) >= Number(part.total);
}

/**
 * L'avanzamento di un compito, in parti fatte su parti totali.
 *
 * Si conta in parti e non in unità (le "5 frasi") di proposito: due parti da
 * 5 e da 2 non valgono 5/7 dell'impegno, e una barra che dicesse così
 * mentirebbe. Le unità si contano dentro la parte, dove il numero significa
 * qualcosa.
 */
export function progress(task) {
  if (!task.parts?.length) {
    return { done: isDone(task) ? 1 : 0, total: 1, hasParts: false };
  }
  return {
    done: task.parts.filter(isPartDone).length,
    total: task.parts.length,
    hasParts: true,
  };
}

export function allPartsDone(task) {
  return task.parts?.length > 0 && task.parts.every(isPartDone);
}

/* ── Peso di una giornata ─────────────────────────────────────────────
 *
 * Il fondo colorato di un giorno nel calendario viene da qui. I sei gradini
 * sono soglie fisse sulla somma dei pesi delle cose scelte per quel giorno,
 * non una scala calcolata sul massimo dello storico: una settimana di follia
 * non deve appiattire tutti gli altri mesi in un grigio uguale per sempre.
 *
 * Le soglie: un compito leggero vale 1, medio 2, pesante 3. Una giornata da
 * 10 o più è il gradino pieno — oltre non c'è niente da distinguere, è già
 * "troppo".
 */
const LOAD_STEPS = [0, 1, 3, 5, 7, 10];

export function loadStep(weightSum) {
  let step = 0;
  for (let i = LOAD_STEPS.length - 1; i >= 0; i -= 1) {
    if (weightSum >= LOAD_STEPS[i]) { step = i; break; }
  }
  return step;
}

/**
 * Quanto pesa un giorno: la somma dei pesi delle cose aperte scelte per quel
 * giorno, più le verifiche che si svolgono quel giorno (una verifica pesa nel
 * giorno in cui la si fa, non solo nei giorni in cui si studia).
 */
export function dayLoad(tasks, day) {
  let sum = 0;
  for (const task of tasks) {
    if (!isOpen(task)) continue;
    if (task.plan?.pick && day in task.plan.pick) sum += task.weight;
    else if (task.kind === "test" && task.due === day) sum += task.weight;
  }
  return sum;
}

/* ── Modifiche (tornano un compito nuovo, non modificano quello dato) ── */

export function toggleSkip(task, day) {
  const skip = new Set(task.plan?.skip || []);
  const pick = { ...(task.plan?.pick || {}) };
  if (skip.has(day)) {
    skip.delete(day);
  } else {
    skip.add(day);
    // un giorno escluso non può restare scelto: sarebbero due cose opposte
    // vere insieme, e la fila dei giorni non saprebbe come disegnarlo
    delete pick[day];
  }
  return { ...task, plan: { skip: [...skip].sort(), pick } };
}

export function togglePick(task, day, slot = "afternoon") {
  const pick = { ...(task.plan?.pick || {}) };
  const skip = new Set(task.plan?.skip || []);
  if (day in pick) delete pick[day];
  else { pick[day] = slot; skip.delete(day); }
  return { ...task, plan: { skip: [...skip].sort(), pick } };
}

export function setSlot(task, day, slot) {
  if (!(task.plan?.pick && day in task.plan.pick)) return task;
  return { ...task, plan: { ...task.plan, pick: { ...task.plan.pick, [day]: slot } } };
}

/** Spuntare un compito spunta anche tutte le sue parti: se no direbbe 1/2 ed è fatto. */
export function markDone(task, today = todayISO()) {
  return {
    ...task,
    doneAt: today,
    droppedAt: null,
    parts: (task.parts || []).map((part) => ({ ...part, done: part.total })),
  };
}

export function markOpen(task) {
  return { ...task, doneAt: null, droppedAt: null };
}

export function markDropped(task, today = todayISO()) {
  return { ...task, droppedAt: today, doneAt: null };
}

/** Sposta la scadenza. I giorni scelti che restano indietro vengono lasciati
 *  cadere: erano riferiti a una finestra che non c'è più. */
export function reschedule(task, due, today = todayISO()) {
  const pick = {};
  for (const [day, slot] of Object.entries(task.plan?.pick || {})) {
    if (day >= today && (!due || day < due)) pick[day] = slot;
  }
  return { ...task, due, plan: { skip: (task.plan?.skip || []).filter((d) => d >= today), pick } };
}

export function setPartDone(task, partId, value) {
  const parts = (task.parts || []).map((part) =>
    part.id === partId
      ? { ...part, done: Math.max(0, Math.min(Number(part.total), Number(value))) }
      : part
  );
  return { ...task, parts };
}
