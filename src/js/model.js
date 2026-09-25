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

/* ── I giorni delle parti ───────────────────────────────────────────
 *
 * Una parte può avere il suo giorno (§5.1 del piano): le frasi lunedì, gli
 * esercizi martedì. Uno solo per parte (assunzione A12), e le parti che non
 * ne hanno uno seguono i giorni scelti per il compito.
 */

/** Il giorno di una parte, o null se segue il compito. */
export function partDay(part) {
  return Object.keys(part?.pick || {}).sort()[0] ?? null;
}

/** Dà un giorno (e un momento) a una parte; `day` null glielo toglie. */
export function setPartPick(task, partId, day, slot = "afternoon") {
  const parts = (task.parts || []).map((part) => {
    if (part.id !== partId) return part;
    return { ...part, pick: day ? { [day]: SLOTS.includes(slot) ? slot : "afternoon" } : {} };
  });
  return { ...task, parts };
}

/**
 * Se i giorni scelti per il compito valgono ancora (assunzione A13).
 *
 * Valgono finché c'è una parte da fare che non ha un giorno suo: è lei che si
 * fa in quei giorni. Quando ogni parte da fare ha il suo, i giorni del
 * compito resterebbero un appuntamento senza niente dentro.
 */
export function followsTask(task) {
  const open = (task.parts || []).filter((part) => !isPartDone(part));
  return open.length === 0 || open.some((part) => !partDay(part));
}

/** I giorni in cui c'è qualcosa di questo compito da fare, in ordine. */
export function plannedDays(task) {
  const days = new Set();
  for (const part of task.parts || []) {
    const day = partDay(part);
    if (day && !isPartDone(part)) days.add(day);
  }
  if (followsTask(task)) for (const day of pickedDays(task)) days.add(day);
  return [...days].sort();
}

/** Se ha un giorno scelto da qualche parte, suo o di una parte: altrimenti
 *  è "da pianificare". */
export function hasPlan(task) {
  return pickedDays(task).length > 0 || (task.parts || []).some((part) => partDay(part));
}

/**
 * Il giorno in cui il compito compare nell'elenco e nel calendario.
 *
 * Se ha scelto dei giorni vale il primo che non è ancora passato. Se sono
 * tutti passati e il compito non è fatto, è roba di oggi: aveva detto che
 * l'avrebbe fatto e non l'ha fatto, e nascondergli la cosa nel passato
 * sarebbe il modo più sicuro di non fargliela più vedere.
 *
 * I giorni sono quelli delle parti ancora da fare più quelli del compito
 * (vedi plannedDays): finite le frasi di lunedì, il compito passa al martedì
 * degli esercizi.
 *
 * Una parte non fatta nel giorno che le era stato dato porta il compito a
 * oggi anche se un'altra parte è più avanti: con i giorni del compito non si
 * sa se in un giorno passato ha lavorato o no, con quelli di una parte sì —
 * la parte è lì, non spuntata.
 */
export function workDate(task, today = todayISO()) {
  const indietro = (task.parts || []).some((part) =>
    !isPartDone(part) && partDay(part) && partDay(part) < today);
  if (indietro) return today;
  const picks = plannedDays(task);
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
 *
 * Un compito con parti divide il suo peso fra le parti (§6.2): un compito
 * pesante spezzato in due sere diventa due sere medie, ed è lo scopo di
 * spezzarlo. Si arrotonda il totale del giorno e non la quota di ogni parte,
 * e un giorno con qualcosa dentro non scende mai sotto 1: una parte da 0.3
 * che arrotondata sparisse farebbe sembrare vuoto un giorno che non lo è.
 */
export function dayLoad(tasks, day) {
  let sum = 0;
  for (const task of tasks) {
    if (!isOpen(task)) continue;
    if (task.kind === "test" && task.due === day) sum += task.weight;
    else sum += shareOn(task, day);
  }
  return sum > 0 ? Math.max(1, Math.round(sum)) : 0;
}

/**
 * Quanto pesa un compito in un giorno che non è quello della sua verifica.
 *
 * Senza parti, tutto il peso in ogni giorno scelto: è come funzionava prima
 * delle parti, e un compito scelto per due giorni pesa in tutti e due. Con le
 * parti, ogni parte porta la sua quota: nel suo giorno se ne ha uno, nei
 * giorni del compito se no. Una parte fatta non porta niente (assunzione A14).
 */
function shareOn(task, day) {
  const onTaskDay = Boolean(task.plan?.pick && day in task.plan.pick);
  const parts = task.parts || [];
  if (!parts.length) return onTaskDay ? task.weight : 0;
  const quota = task.weight / parts.length;
  let sum = 0;
  for (const part of parts) {
    if (isPartDone(part)) continue;
    const own = partDay(part);
    if (own ? own === day : onTaskDay) sum += quota;
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
    // vere insieme, e la fila dei giorni non saprebbe come disegnarlo. Vale
    // anche per le parti che ci cadevano (assunzione A16)
    delete pick[day];
    const parts = (task.parts || []).map((part) =>
      (partDay(part) === day ? { ...part, pick: {} } : part));
    return { ...task, plan: { skip: [...skip].sort(), pick }, parts };
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
 *  cadere: erano riferiti a una finestra che non c'è più. Quelli delle parti
 *  come quelli del compito (assunzione A16). */
export function reschedule(task, due, today = todayISO()) {
  const keep = (day) => day >= today && (!due || day < due);
  const pick = {};
  for (const [day, slot] of Object.entries(task.plan?.pick || {})) {
    if (keep(day)) pick[day] = slot;
  }
  const parts = (task.parts || []).map((part) => {
    const day = partDay(part);
    return day && !keep(day) ? { ...part, pick: {} } : part;
  });
  return { ...task, due, plan: { skip: (task.plan?.skip || []).filter((d) => d >= today), pick }, parts };
}

export function setPartDone(task, partId, value) {
  const parts = (task.parts || []).map((part) =>
    part.id === partId
      ? { ...part, done: Math.max(0, Math.min(Number(part.total), Number(value))) }
      : part
  );
  return { ...task, parts };
}

/** I due modi del tocco su una parte con un numero (impostazione `partTap`). */
export const PART_TAP = ["step", "all"];

/**
 * Il tocco sul cerchio di una parte, dall'elenco.
 *
 * Una parte a spunta secca si spunta e si toglie. Una parte con un numero fa
 * quello che dice l'impostazione: "all" come una spunta secca, "step" +1 a
 * ogni tocco — e da piena torna a zero, perché un cerchio che a un certo punto
 * smette di rispondere sembra rotto.
 *
 * Torna il compito già sistemato (vedi settleParts): chi chiama non deve
 * ricordarsi di chiuderlo quando l'ultima parte è fatta.
 */
export function tapPart(task, partId, mode = "step", today = todayISO()) {
  const part = (task.parts || []).find((entry) => entry.id === partId);
  if (!part) return task;
  const stepwise = mode === "step" && Number(part.total) > 1;
  let value;
  if (isPartDone(part)) value = 0;
  else value = stepwise ? Number(part.done) + 1 : Number(part.total);
  return settleParts(setPartDone(task, partId, value), today, task);
}

/**
 * Lo stato del compito dopo che le sue parti sono cambiate (§5.2 del piano).
 *
 * Le due metà della regola non sono simmetriche, e di proposito:
 *
 *   - tutte le parti fatte e compito aperto → si chiude da sé. Ma solo se
 *     prima *non* erano già tutte fatte: un compito rimesso da fare
 *     dall'archivio ha ancora tutte le parti spuntate, e richiuderlo al primo
 *     salvataggio vorrebbe dire che non si può più riaprire;
 *   - una parte non fatta e compito fatto → si riapre, sempre. Un compito a
 *     cui manca un pezzo non è fatto, qualunque cosa sia successa prima.
 *
 * `before` è il compito prima della modifica; se manca vale "prima non erano
 * tutte fatte".
 */
export function settleParts(task, today = todayISO(), before = null) {
  if (!task.parts?.length) return task;
  if (allPartsDone(task)) {
    const wereAll = before ? allPartsDone(before) : false;
    if (isOpen(task) && !wereAll) return { ...task, doneAt: today, droppedAt: null };
    return task;
  }
  return isDone(task) ? { ...task, doneAt: null } : task;
}
