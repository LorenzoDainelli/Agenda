/* Agenda — persistenza.
 *
 * QUESTA È L'UNICA PORTA VERSO I DATI. Nessun altro file nomina
 * `localStorage` (regola 11 del piano). Non è pignoleria: il giorno in cui
 * serviranno le notifiche i dati dovranno stare in IndexedDB, perché un
 * service worker non può leggere `localStorage` — e quel giorno si cambia
 * questo file e nient'altro.
 *
 * Tutto vive sul telefono. Nessun server, nessun account, nessuna
 * sincronizzazione: due telefoni sono due mondi separati.
 */

const KEY_SETTINGS = "agenda:settings";
const KEY_TASKS = "agenda:tasks";
const KEY_TIMETABLES = "agenda:timetables";
const KEY_REVIEW = "agenda:review";
// La data dell'ultima copia scaricata. NON entra nel file della copia
// (assunzione A20): dice qualcosa di questo telefono, e ripristinare una copia
// vecchia non deve far credere all'app di averne appena fatta una.
const KEY_BACKUP = "agenda:backup";

/*
 * Numero di versione del file esportato.
 *   1 — Fase 1.
 * Un file prodotto oggi deve restare ripristinabile fra due anni: quando il
 * formato cambia si alza questo numero e si insegna a `readBackup` a leggere
 * anche i precedenti, mai a rifiutarli.
 */
export const BACKUP_VERSION = 1;

/* ── Accesso grezzo ───────────────────────────────────────────────── */

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    // Memoria piena, dati corrotti o navigazione privata: si riparte pulito
    // invece di lasciare l'app bloccata su una schermata bianca.
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/* ── Impostazioni ─────────────────────────────────────────────────── */

const DEFAULT_SETTINGS = {
  version: 1,
  lang: null,       // null = come il telefono
  theme: null,      // null = come il telefono
  subjects: [],
  areas: [],        // solo quelli personalizzati: Scuola e Privato non stanno qui
  lessonsPerDay: 6,
  schoolDays: [1, 2, 3, 4, 5, 6],
  partTap: "step",  // una parte con un numero, toccata dall'elenco: +1 ("step") o tutta ("all")
};

export function loadSettings() {
  const stored = read(KEY_SETTINGS, {});
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    subjects: Array.isArray(stored.subjects) ? stored.subjects : [],
    areas: Array.isArray(stored.areas) ? stored.areas : [],
    schoolDays: Array.isArray(stored.schoolDays) && stored.schoolDays.length
      ? stored.schoolDays
      : DEFAULT_SETTINGS.schoolDays,
    lessonsPerDay: Number(stored.lessonsPerDay) > 0
      ? Number(stored.lessonsPerDay)
      : DEFAULT_SETTINGS.lessonsPerDay,
    // un valore che non conosciamo (una copia scritta a mano, una versione
    // futura) torna al modo di partenza invece di far fare al cerchio una
    // terza cosa che nessuno ha deciso
    partTap: stored.partTap === "all" ? "all" : DEFAULT_SETTINGS.partTap,
  };
}

export function saveSettings(settings) {
  return write(KEY_SETTINGS, { ...settings, version: 1 });
}

/* ── Compiti ──────────────────────────────────────────────────────── */

export function loadTasks() {
  const tasks = read(KEY_TASKS, []);
  return Array.isArray(tasks) ? tasks.filter(isTask) : [];
}

export function saveTasks(tasks) {
  return write(KEY_TASKS, tasks);
}

/** Controllo minimo: basta a non far esplodere l'app su un dato storto. */
function isTask(entry) {
  return Boolean(
    entry &&
    typeof entry === "object" &&
    typeof entry.id === "string" &&
    typeof entry.title === "string"
  );
}

/* ── Orari ────────────────────────────────────────────────────────── */

/** Elenco di orari, il più recente per primo. */
export function loadTimetables() {
  const list = read(KEY_TIMETABLES, []);
  if (!Array.isArray(list)) return [];
  return list
    .filter((tt) => tt && typeof tt.weekStart === "string" && tt.grid && typeof tt.grid === "object")
    .sort((a, b) => b.weekStart.localeCompare(a.weekStart));
}

export function saveTimetables(list) {
  return write(KEY_TIMETABLES, [...list].sort((a, b) => b.weekStart.localeCompare(a.weekStart)));
}

/* ── Rassegna degli arretrati ─────────────────────────────────────── */

export function loadReview() {
  const stored = read(KEY_REVIEW, null);
  return stored && typeof stored === "object" ? stored : { lastReviewedOn: null };
}

export function saveReview(state) {
  return write(KEY_REVIEW, state);
}

/* ── Promemoria della copia ───────────────────────────────────────── */

export function loadBackupInfo() {
  const stored = read(KEY_BACKUP, null);
  const iso = (value) => (typeof value === "string" ? value : null);
  return {
    lastSavedOn: iso(stored?.lastSavedOn),
    snoozedUntil: iso(stored?.snoozedUntil),
  };
}

export function saveBackupInfo(info) {
  return write(KEY_BACKUP, info);
}

/* ── Copie di sicurezza ───────────────────────────────────────────── */

export function exportAll(todayISO) {
  return {
    app: "agenda",
    version: BACKUP_VERSION,
    exportedAt: todayISO,
    settings: loadSettings(),
    tasks: loadTasks(),
    timetables: loadTimetables(),
    review: loadReview(),
  };
}

/**
 * Legge e controlla il testo di un file. Non scrive niente: serve a poter
 * mostrare la conferma prima di toccare i dati.
 *
 * @throws {Error} se il file non è una copia di questa app
 */
export function readBackup(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("not-json");
  }
  if (!data || typeof data !== "object" || data.app !== "agenda") {
    throw new Error("not-a-backup");
  }
  const tasks = Array.isArray(data.tasks) ? data.tasks.filter(isTask) : [];
  return {
    version: Number(data.version) || 1,
    exportedAt: typeof data.exportedAt === "string" ? data.exportedAt : null,
    settings: data.settings && typeof data.settings === "object" ? data.settings : {},
    tasks,
    timetables: Array.isArray(data.timetables) ? data.timetables : [],
  };
}

/**
 * Rimette dentro una copia già controllata.
 *
 * **Non cancella mai niente che non sia nel file.** Le cose del telefono
 * restano; quelle del file si sovrappongono per `id`. Un compito creato dopo
 * la copia sopravvive al ripristino — che è la regola più importante di tutte,
 * perché il caso normale è ripristinare una copia vecchia di giorni.
 */
export function applyBackup(parsed) {
  const merged = new Map(loadTasks().map((task) => [task.id, task]));
  for (const task of parsed.tasks) merged.set(task.id, task);
  saveTasks([...merged.values()]);

  const mergedTT = new Map(loadTimetables().map((tt) => [tt.weekStart, tt]));
  for (const tt of parsed.timetables) {
    if (tt && typeof tt.weekStart === "string" && tt.grid) mergedTT.set(tt.weekStart, tt);
  }
  saveTimetables([...mergedTT.values()]);

  // Le materie si uniscono per id: una materia del telefono che nel file non
  // c'è non deve sparire, se no i compiti che la usano perdono il colore.
  const device = loadSettings();
  const subjects = new Map(device.subjects.map((s) => [s.id, s]));
  for (const s of parsed.settings.subjects || []) {
    if (s && typeof s.id === "string") subjects.set(s.id, s);
  }
  const areas = new Map(device.areas.map((a) => [a.id, a]));
  for (const a of parsed.settings.areas || []) {
    if (a && typeof a.id === "string") areas.set(a.id, a);
  }
  saveSettings({
    ...device,
    ...parsed.settings,
    subjects: [...subjects.values()],
    areas: [...areas.values()],
  });

  return { tasks: parsed.tasks.length, total: merged.size };
}

/** Per il pulsante "ricomincia da zero", se un giorno servirà. Oggi non è usato. */
export function wipe() {
  for (const key of [KEY_SETTINGS, KEY_TASKS, KEY_TIMETABLES, KEY_REVIEW, KEY_BACKUP]) {
    try { localStorage.removeItem(key); } catch { /* niente da fare */ }
  }
}
