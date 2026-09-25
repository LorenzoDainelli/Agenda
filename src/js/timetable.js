/* Agenda — l'orario scolastico.
 *
 * L'orario non è una griglia: è un ELENCO di griglie, ognuna con la settimana
 * da cui vale. È la stessa forma che Shift Hours dà alla paga oraria, e per lo
 * stesso motivo: all'inizio dell'anno l'orario è provvisorio e cambia quasi
 * ogni settimana, e un'unica griglia riscritta ogni volta farebbe diventare
 * retroattivamente vero un orario che quella settimana non c'era.
 *
 *   - la griglia più recente fra quelle che valgono da PRIMA di una certa data
 *     è quella valida per quella data
 *   - la prima griglia vale anche per le settimane precedenti alla sua: senza
 *     questa regola, un compito inserito la settimana prima di aver creato
 *     l'orario non saprebbe a quale orario riferirsi
 *   - una griglia nuova nasce copiando l'ultima, così si corregge solo quello
 *     che è cambiato
 *
 * Nella griglia le chiavi sono i giorni ISO ("1" = lunedì) e i valori sono
 * array lunghi `lessonsPerDay`, dove ogni posizione è l'id di una materia
 * oppure `null` per un'ora libera.
 */

import { mondayOf, addDays, dow, today as todayISO } from "./days.js";

export function emptyGrid(schoolDays, lessonsPerDay) {
  const grid = {};
  for (const day of schoolDays) grid[String(day)] = new Array(lessonsPerDay).fill(null);
  return grid;
}

export function newTimetable(weekStart, grid) {
  return { weekStart, grid: JSON.parse(JSON.stringify(grid)) };
}

/**
 * L'orario valido per una data.
 *
 * `list` arriva già ordinato dal più recente al più vecchio (ci pensa
 * storage.js), quindi il primo che vale da prima o da quella stessa settimana
 * è quello giusto. Se ne esistono solo di più recenti, vale il più vecchio:
 * vedi la seconda regola in testa al file.
 */
export function timetableFor(list, date) {
  if (!list.length) return null;
  const week = mondayOf(date);
  return list.find((tt) => tt.weekStart <= week) || list[list.length - 1];
}

/** L'orario che vale oggi. */
export function currentTimetable(list, today = todayISO()) {
  return timetableFor(list, today);
}

/**
 * La settimana per cui creare la griglia nuova: la prossima dopo l'ultima
 * esistente, oppure questa se non ce n'è nessuna.
 *
 * Se l'ultima griglia è di una settimana futura, si va ancora avanti: così
 * premendo `+` due volte si creano due settimane diverse e non si sovrascrive
 * quella appena fatta.
 */
export function nextWeekStart(list, today = todayISO()) {
  const thisWeek = mondayOf(today);
  if (!list.length) return thisWeek;
  const latest = list[0].weekStart;
  return latest < thisWeek ? thisWeek : addDays(latest, 7);
}

/** Crea la griglia della settimana nuova copiando l'ultima che esiste. */
export function createNext(list, settings, today = todayISO()) {
  const weekStart = nextWeekStart(list, today);
  const source = list[0]?.grid || emptyGrid(settings.schoolDays, settings.lessonsPerDay);
  return newTimetable(weekStart, source);
}

/** I giorni della settimana (1..7) in cui quella materia c'è, secondo una griglia. */
export function daysWithSubject(timetable, subjectId) {
  if (!timetable || !subjectId) return [];
  return Object.entries(timetable.grid)
    .filter(([, hours]) => Array.isArray(hours) && hours.includes(subjectId))
    .map(([day]) => Number(day))
    .sort((a, b) => a - b);
}

/**
 * Le prossime date in cui c'è quella materia, a partire dal giorno DOPO
 * `from` — perché la lezione di oggi è quella in cui il compito è stato dato,
 * e la scadenza è la prossima.
 *
 * Cerca fino a quattro settimane avanti e usa, per ogni giorno, l'orario
 * valido per quel giorno: se fra due settimane l'orario cambia, la seconda
 * proposta tiene conto della griglia nuova.
 */
export function nextLessons(list, subjectId, from = todayISO(), howMany = 2) {
  if (!subjectId || !list.length) return [];
  const out = [];
  for (let i = 1; i <= 28 && out.length < howMany; i += 1) {
    const day = addDays(from, i);
    const timetable = timetableFor(list, day);
    if (!timetable) continue;
    const hours = timetable.grid[String(dow(day))];
    if (Array.isArray(hours) && hours.includes(subjectId)) out.push(day);
  }
  return out;
}

/** Le materie che ha avuto in un certo giorno, senza ripetizioni e in ordine di ora. */
export function subjectsOn(list, date) {
  const timetable = timetableFor(list, date);
  if (!timetable) return [];
  const hours = timetable.grid[String(dow(date))] || [];
  const seen = new Set();
  const out = [];
  for (const id of hours) {
    if (id && !seen.has(id)) { seen.add(id); out.push(id); }
  }
  return out;
}

/**
 * La griglia di un giorno raggruppata in blocchi: due ore di fila della stessa
 * materia diventano un blocco solo, alto due. È come si legge un orario vero,
 * e anche come si scrive — toccando il blocco si cambiano tutte le sue ore
 * insieme, che è quasi sempre quello che si vuole.
 */
export function blocksOf(hours, lessonsPerDay) {
  const out = [];
  const list = Array.from({ length: lessonsPerDay }, (_, i) => hours?.[i] ?? null);
  let i = 0;
  while (i < list.length) {
    let span = 1;
    // Solo le ore con una materia si fondono. Le ore libere restano caselle
    // separate, altrimenti una griglia appena creata sarebbe un unico blocco
    // vuoto per giorno e non ci sarebbe modo di riempire una singola ora —
    // era così, e si vedeva solo provandola.
    if (list[i] !== null) {
      while (i + span < list.length && list[i + span] === list[i]) span += 1;
    }
    out.push({ subjectId: list[i], from: i, span });
    i += span;
  }
  return out;
}

/** Scrive una materia in un blocco di ore (tutte quelle del blocco). */
export function setBlock(grid, day, from, span, subjectId) {
  const key = String(day);
  const hours = [...(grid[key] || [])];
  for (let i = from; i < from + span; i += 1) hours[i] = subjectId;
  return { ...grid, [key]: hours };
}

/** Quante ore di lezione ha in tutto una griglia: per l'etichetta dell'elenco. */
export function countHours(timetable) {
  if (!timetable) return 0;
  return Object.values(timetable.grid)
    .reduce((sum, hours) => sum + (hours || []).filter(Boolean).length, 0);
}
