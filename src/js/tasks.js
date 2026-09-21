/* Agenda — le domande che si fanno all'elenco dei compiti.
 *
 * Come model.js, qui non si tocca la pagina: sono funzioni che prendono
 * l'elenco e tornano l'elenco riordinato o raggruppato. Il rendering sta
 * altrove, e questo permette di provare a mano le regole di ordinamento —
 * che sono la cosa che decide se l'app è utile o solo piena.
 */

import { today as todayISO, addDays, mondayOf, monthKey } from "./days.js";
import {
  isOpen, isDone, isDropped, isLate, workDate, progress, AREA_PRIVATE,
} from "./model.js";

/** Le sezioni dell'elenco, nell'ordine in cui si mostrano. */
export const SECTIONS = ["late", "today", "tomorrow", "week", "later", "undated"];

/**
 * In quale sezione va un compito.
 *
 * Decide il suo "giorno di lavoro" (il primo giorno scelto, o la scadenza:
 * vedi model.workDate), non la scadenza da sola. È la differenza fra un'app
 * che dice "questo scade giovedì" e una che dice "questo lo fai martedì": la
 * seconda è quella che serve.
 */
export function sectionOf(task, today = todayISO()) {
  if (isLate(task, today)) return "late";
  const day = workDate(task, today);
  if (!day) return "undated";
  if (day <= today) return "today";
  if (day === addDays(today, 1)) return "tomorrow";
  // "questa settimana" è la settimana di calendario, non i sette giorni
  // successivi: l'etichetta dice "questa settimana" e deve significare quello
  const endOfWeek = addDays(mondayOf(today), 6);
  if (day <= endOfWeek) return "week";
  return "later";
}

/**
 * L'ordine dentro una sezione.
 *
 * Prima le verifiche, perché sono l'unica cosa che non si può rimandare. Poi
 * il peso, dal più pesante: se una giornata va male, quello che salta è
 * meglio che sia leggero. Poi la scadenza più vicina, poi il titolo — gli
 * ultimi due servono solo a non far ballare l'elenco fra un disegno e l'altro.
 */
function compare(a, b) {
  if ((a.kind === "test") !== (b.kind === "test")) return a.kind === "test" ? -1 : 1;
  if (a.weight !== b.weight) return b.weight - a.weight;
  const dueA = a.due || "9999-99-99";
  const dueB = b.due || "9999-99-99";
  if (dueA !== dueB) return dueA.localeCompare(dueB);
  return a.title.localeCompare(b.title);
}

/** Solo l'ambito chiesto. `null` o "all" = tutti. */
export function byArea(tasks, area) {
  if (!area || area === "all") return tasks;
  return tasks.filter((task) => task.area === area);
}

/**
 * L'elenco raggruppato, pronto da disegnare. Le sezioni vuote non arrivano
 * affatto: una sezione con l'intestazione e niente sotto fa sembrare che
 * l'app abbia perso qualcosa.
 */
export function sections(tasks, { today = todayISO(), area = "all" } = {}) {
  const open = byArea(tasks, area).filter(isOpen);
  const buckets = new Map(SECTIONS.map((key) => [key, []]));
  for (const task of open) buckets.get(sectionOf(task, today)).push(task);
  return SECTIONS
    .map((key) => ({ key, tasks: buckets.get(key).sort(compare) }))
    .filter((section) => section.tasks.length > 0);
}

/** Quante cose aperte per ambito: i numerini sui filtri. */
export function countsByArea(tasks) {
  const counts = { all: 0 };
  for (const task of tasks) {
    if (!isOpen(task)) continue;
    counts.all += 1;
    counts[task.area] = (counts[task.area] || 0) + 1;
  }
  return counts;
}

/**
 * I numeri del blocco in cima: quante cose per oggi, quante in ritardo,
 * quante entro domani.
 *
 * "Per oggi" conta anche gli arretrati: sono cose da fare oggi, e tenerli
 * fuori dal numero grande vorrebbe dire che l'app dice "0 cose" a chi ha tre
 * compiti scaduti.
 */
export function summary(tasks, { today = todayISO(), area = "all" } = {}) {
  const open = byArea(tasks, area).filter(isOpen);
  const tomorrow = addDays(today, 1);
  let forToday = 0;
  let late = 0;
  let dueTomorrow = 0;
  for (const task of open) {
    const section = sectionOf(task, today);
    if (section === "late") { late += 1; forToday += 1; }
    else if (section === "today") forToday += 1;
    if (task.due === tomorrow) dueTomorrow += 1;
  }
  return { forToday, late, dueTomorrow, open: open.length };
}

/** Le cose scelte per un certo giorno, per il calendario. */
export function onDay(tasks, day) {
  return tasks
    .filter((task) => {
      if (isDropped(task)) return false;
      if (task.plan?.pick && day in task.plan.pick) return true;
      // una verifica compare anche nel giorno in cui si svolge, sempre
      return task.kind === "test" && task.due === day;
    })
    .sort(compare);
}

/** Come sopra, divise per momento della giornata. Una verifica sta nel suo giorno
 *  anche se non è stata pianificata: il momento in quel caso è "mattina". */
export function onDayBySlot(tasks, day) {
  const out = { morning: [], afternoon: [], evening: [] };
  for (const task of onDay(tasks, day)) {
    const slot = task.plan?.pick?.[day]
      || (task.kind === "test" && task.due === day ? "morning" : "afternoon");
    out[slot].push(task);
  }
  return out;
}

/** Le cose che scadono in un giorno ma non sono state pianificate da nessuna parte. */
export function unplannedOn(tasks, day) {
  return tasks
    .filter((task) => isOpen(task)
      && task.due === day
      && Object.keys(task.plan?.pick || {}).length === 0
      && task.kind !== "test")
    .sort(compare);
}

/** Tutti gli arretrati, i più vecchi per primi: la rassegna li affronta in quest'ordine. */
export function lateTasks(tasks, today = todayISO()) {
  return tasks.filter((task) => isLate(task, today)).sort((a, b) => a.due.localeCompare(b.due));
}

/** L'archivio: fatte e lasciate cadere, raggruppate per mese, le più recenti prima. */
export function archive(tasks) {
  const closed = tasks
    .filter((task) => isDone(task) || isDropped(task))
    .map((task) => ({ task, when: task.doneAt || task.droppedAt }))
    .sort((a, b) => b.when.localeCompare(a.when));
  const months = new Map();
  for (const entry of closed) {
    const key = monthKey(entry.when);
    if (!months.has(key)) months.set(key, []);
    months.get(key).push(entry.task);
  }
  return [...months.entries()].map(([month, list]) => ({ month, tasks: list }));
}

/** Il testo dell'avanzamento da mostrare sulla riga, o null se non ha parti. */
export function progressLabel(task) {
  const p = progress(task);
  return p.hasParts ? p : null;
}

/** Sposta in Privato le cose di un ambito che si sta eliminando. */
export function moveArea(tasks, fromArea, toArea = AREA_PRIVATE) {
  return tasks.map((task) => (task.area === fromArea ? { ...task, area: toArea } : task));
}

export function countInArea(tasks, area) {
  return tasks.filter((task) => task.area === area).length;
}

export function replaceTask(tasks, updated) {
  const index = tasks.findIndex((task) => task.id === updated.id);
  if (index === -1) return [...tasks, updated];
  const out = [...tasks];
  out[index] = updated;
  return out;
}

export function removeTask(tasks, id) {
  return tasks.filter((task) => task.id !== id);
}

export function findTask(tasks, id) {
  return tasks.find((task) => task.id === id) || null;
}
