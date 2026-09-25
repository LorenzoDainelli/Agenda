/* Agenda — le domande che si fanno all'elenco dei compiti.
 *
 * Come model.js, qui non si tocca la pagina: sono funzioni che prendono
 * l'elenco e tornano l'elenco riordinato o raggruppato. Il rendering sta
 * altrove, e questo permette di provare a mano le regole di ordinamento —
 * che sono la cosa che decide se l'app è utile o solo piena.
 */

import { today as todayISO, addDays, mondayOf, monthKey } from "./days.js";
import {
  isOpen, isDone, isDropped, isLate, workDate, isPartDone, partDay, hasPlan,
  AREA_PRIVATE, SLOTS,
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
 * Fatto oggi: resta nell'elenco, barrato, fino a mezzanotte (§6.1).
 *
 * Uguale a oggi e non "da oggi in poi": una data di fatto nel futuro può
 * venire solo da un orologio sbagliato, e una cosa così resterebbe barrata
 * nell'elenco per giorni. Va nell'archivio, dove almeno si trova.
 */
export function isDoneToday(task, today = todayISO()) {
  return isDone(task) && task.doneAt === today;
}

/**
 * Cosa sta nell'elenco: le cose aperte e quelle fatte oggi. L'archivio prende
 * esattamente il resto (vedi archive), così una cosa è sempre in uno solo dei
 * due posti e mai in nessuno.
 *
 * Le cose lasciate cadere oggi non restano: non sono fatte, e barrarle
 * direbbe il falso.
 */
export function isShownInList(task, today = todayISO()) {
  return isOpen(task) || isDoneToday(task, today);
}

/**
 * L'elenco raggruppato, pronto da disegnare. Le sezioni vuote non arrivano
 * affatto: una sezione con l'intestazione e niente sotto fa sembrare che
 * l'app abbia perso qualcosa.
 *
 * Una cosa fatta oggi resta nella sezione in cui era da aperta, e nello
 * stesso punto: si decide come se la spunta non ci fosse. Se si spostasse,
 * toccare il cerchio per sbaglio la farebbe sparire da sotto il dito, e per
 * ritrovarla bisognerebbe cercarla. `open` conta solo quello che resta: il
 * numerino accanto al nome della sezione dice quanto manca, non quante righe
 * ci sono.
 */
export function sections(tasks, { today = todayISO(), area = "all" } = {}) {
  const shown = byArea(tasks, area).filter((task) => isShownInList(task, today));
  const buckets = new Map(SECTIONS.map((key) => [key, []]));
  for (const task of shown) {
    const asIfOpen = isDone(task) ? { ...task, doneAt: null } : task;
    buckets.get(sectionOf(asIfOpen, today)).push(task);
  }
  return SECTIONS
    .map((key) => {
      const list = buckets.get(key).sort(compare);
      return { key, tasks: list, open: list.filter(isOpen).length };
    })
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

/**
 * Le voci di un giorno, per il calendario: `{ task, part, slot, done }`.
 *
 * Una voce è un compito (`part` null) o una sua parte che ha quel giorno
 * (§6.2): un compito con le frasi lunedì e gli esercizi martedì dà una voce
 * lunedì e una martedì, ognuna col suo nome. Il compito stesso compare nei
 * giorni scelti per lui solo se ha parti senza un giorno loro, o non ha parti
 * — se no sarebbe un blocchetto senza niente dentro (assunzione A13).
 *
 * `done` dice se la voce va barrata: la parte fatta, o il compito fatto, o —
 * per la voce del compito — tutte le parti che la seguono fatte.
 */
export function entriesOn(tasks, day) {
  const out = [];
  for (const task of tasks) {
    if (isDropped(task)) continue;
    const parts = task.parts || [];
    const seguono = parts.filter((part) => !partDay(part));
    const suo = task.plan?.pick?.[day];
    // una verifica compare nel giorno in cui si svolge, sempre
    if (task.kind === "test" && task.due === day) {
      out.push({ task, part: null, slot: suo || "morning", done: isDone(task) });
    } else if (suo && (parts.length === 0 || seguono.length > 0)) {
      out.push({ task, part: null, slot: suo,
                 done: isDone(task) || (seguono.length > 0 && seguono.every(isPartDone)) });
    }
    for (const part of parts) {
      if (partDay(part) !== day) continue;
      out.push({ task, part, slot: part.pick[day], done: isDone(task) || isPartDone(part) });
    }
  }
  // l'ordine dei compiti è quello dell'elenco; dentro lo stesso compito, prima
  // la sua voce e poi le parti nell'ordine in cui sono state scritte
  const posto = (entry) => (entry.part ? entry.task.parts.indexOf(entry.part) + 1 : 0);
  return out.sort((a, b) => compare(a.task, b.task) || (a.task.id === b.task.id ? posto(a) - posto(b) : 0));
}

/** Come sopra, divise per momento della giornata. Una verifica sta nel suo giorno
 *  anche se non è stata pianificata: il momento in quel caso è "mattina". */
export function onDayBySlot(tasks, day) {
  const out = { morning: [], afternoon: [], evening: [] };
  for (const entry of entriesOn(tasks, day)) {
    const scelto = entry.slot;
    // Un momento che non conosciamo finisce nel pomeriggio invece di far
    // saltare tutto. Non è una cortesia: i dati possono arrivare da una copia
    // ripristinata, scritta da una versione futura o modificata a mano, e un
    // valore inatteso lì dentro lascerebbe il calendario della settimana
    // completamente vuoto — cioè il difetto peggiore possibile, perché non
    // sembra un errore, sembra che non ci sia niente da fare.
    const slot = SLOTS.includes(scelto) ? scelto : "afternoon";
    out[slot].push(entry);
  }
  return out;
}

/** Le cose che scadono in un giorno ma non sono state pianificate da nessuna
 *  parte: né un giorno del compito, né un giorno di una sua parte. */
export function unplannedOn(tasks, day) {
  return tasks
    .filter((task) => isOpen(task)
      && task.due === day
      && !hasPlan(task)
      && task.kind !== "test")
    .sort(compare);
}

/** Tutti gli arretrati, i più vecchi per primi: la rassegna li affronta in quest'ordine. */
export function lateTasks(tasks, today = todayISO()) {
  return tasks.filter((task) => isLate(task, today)).sort((a, b) => a.due.localeCompare(b.due));
}

/** L'archivio: fatte e lasciate cadere, raggruppate per mese, le più recenti prima.
 *  Tranne quelle fatte oggi, che sono ancora nell'elenco (vedi isShownInList). */
export function archive(tasks, today = todayISO()) {
  const closed = tasks
    .filter((task) => !isShownInList(task, today))
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
