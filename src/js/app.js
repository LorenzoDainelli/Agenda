/* Agenda — orchestrazione.
 *
 * Qui vive lo stato dell'app e la schermata principale, che dall'undicesimo
 * giro è l'orario (A72). Sopra si aprono due livelli: i voti e le
 * impostazioni, ognuno col suo file.
 *
 * Lo stato è tre cose: le impostazioni, gli orari, i voti. Ogni modifica
 * passa da una delle funzioni `save*` qui sotto, che scrivono e ridisegnano —
 * non esiste un pezzo di interfaccia che si aggiorna da solo senza passare da
 * qui. È una regola noiosa e fa risparmiare un pomeriggio ogni volta che
 * qualcosa non si aggiorna.
 *
 * I compiti e la spesa di prima non si leggono più qui, ma non si toccano:
 * restano in memoria ed escono nella copia di sicurezza (A73).
 */

import { today as todayISO, full, dayMonth } from "./days.js";
import { t, tn, setLang, deviceLang, getLang, apply as applyI18n } from "./i18n.js";
import {
  loadSettings, saveSettings, loadTimetables, saveTimetables, loadBackupInfo, loadGrades, saveGrades,
} from "./storage.js";
import { el, toast, closeLayer, topLayer, closeSheet, isSheetOpen, isLayerOpen, onEach, openLayer } from "./ui.js";
import * as settings from "./settings.js";
import * as timetableView from "./timetable-view.js";
import * as gradesView from "./grades-view.js";
import { normalize as normalizeGrades } from "./grades.js";
import * as backup from "./backup.js";

/* ── Stato ────────────────────────────────────────────────────────── */

const state = {
  settings: null,
  timetables: [],
  grades: [],
};

/** Il giorno che l'app crede sia oggi. Serve a accorgersi della mezzanotte. */
let day = todayISO();

function ctx() {
  return { settings: state.settings, timetables: state.timetables, grades: state.grades };
}

/* ── Scritture ────────────────────────────────────────────────────── */

function saveSettingsAndRender(next) {
  state.settings = next;
  saveSettings(next);
  applyLang();
  applyTheme();
  renderAll();
}

function saveGradesAndRender(list) {
  state.grades = list;
  saveGrades(list);
  renderAll();
}

function saveTimetablesAndRender(list) {
  state.timetables = list;
  saveTimetables(list);
  renderAll();
}

/* ── Lingua e tema ────────────────────────────────────────────────── */

function applyLang() {
  setLang(state.settings.lang || deviceLang());
  applyI18n(document);
}

function applyTheme() {
  const forced = state.settings.theme;
  const dark = forced
    ? forced === "dark"
    : window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = dark ? "#0b1118" : "#ffffff";
}

/* ── La schermata principale ──────────────────────────────────────── */

function renderHeader() {
  el("today-title").textContent = full(day, getLang());
}

/** Il promemoria della copia, una volta al mese (A18–A20, A74). Si conta
 *  dalla cosa più vecchia che c'è: un voto o un orario. */
function renderBackupAlert() {
  const box = el("backup-alert");
  const info = loadBackupInfo();
  const dates = [...state.grades.map((g) => g.date), ...state.timetables.map((tt) => tt.weekStart)];
  const due = backup.isDue(dates, info, day);
  box.hidden = !due;
  if (!due) return;
  el("backup-alert-title").textContent = t("backup.title");
  el("backup-alert-note").textContent = info.lastSavedOn
    ? t("backup.note.last", { date: dayMonth(info.lastSavedOn, getLang()) })
    : t("backup.note.never");
  el("backup-save").textContent = t("backup.save");
  el("backup-later").textContent = t("backup.later");
}

const timetableHandlers = {
  onTimetables: (list) => saveTimetablesAndRender(list),
  onSettings: (next) => saveSettingsAndRender(next),
};

function renderAll() {
  renderHeader();
  renderBackupAlert();
  timetableView.refresh(ctx());
  // I livelli aperti si ridisegnano insieme al resto: una materia cambiata
  // nelle impostazioni cambia anche i voti dietro.
  if (isLayerOpen("settings-layer")) settings.refresh(ctx());
  if (isLayerOpen("grades-layer")) gradesView.refresh(state.grades, ctx());
}

/* ── Livelli ──────────────────────────────────────────────────────── */

function openSettings() {
  openLayer("settings-layer");
  settings.open(ctx(), {
    onSettings: (next) => saveSettingsAndRender(next),
    onTimetables: (list) => saveTimetablesAndRender(list),
    // una copia scaricata dalle impostazioni fa sparire il promemoria
    onBackup: () => renderAll(),
  });
}

function openGrades() {
  openLayer("grades-layer");
  gradesView.open(state.grades, ctx(), { onChange: (list) => saveGradesAndRender(list) });
}

/* ── Avvio ────────────────────────────────────────────────────────── */

function bindChrome() {
  el("open-grades").addEventListener("click", openGrades);
  el("open-settings").addEventListener("click", openSettings);
  el("settings-back").addEventListener("click", () => settings.back());
  el("backup-save").addEventListener("click", async () => {
    if (await backup.download()) toast(t("settings.data.saved"));
    renderAll();
  });
  el("backup-later").addEventListener("click", () => {
    backup.snooze(day);
    renderAll();
  });

  onEach(document, "[data-close]", "click", (event) => closeLayer(event.currentTarget.dataset.close));

  el("scrim").addEventListener("click", closeSheet);

  /* Il tasto Esc su desktop, e il tasto indietro del telefono: chiudono un
     livello alla volta, dal più recente. */
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (isSheetOpen()) { closeSheet(); return; }
    const top = topLayer();
    // dentro una pagina delle impostazioni, Esc torna all'elenco
    if (top === "settings-layer" && settings.back()) return;
    if (top) closeLayer(top);
  });

  el("restore-file").addEventListener("change", async (event) => {
    const [file] = event.target.files;
    event.target.value = "";
    if (!file) return;
    try {
      const result = await backup.restore(file);
      state.settings = loadSettings();
      state.timetables = loadTimetables();
      state.grades = normalizeGrades(loadGrades());
      applyLang();
      applyTheme();
      renderAll();
      settings.refresh(ctx());
      toast(tn(result.grades, "settings.data.restored.one", "settings.data.restored.many"));
    } catch {
      toast(t("settings.data.badfile"));
    }
  });

  /* Il tema del telefono può cambiare mentre l'app è aperta (di sera, da sé). */
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (!state.settings.theme) applyTheme();
  });

  /* La mezzanotte. Un'app lasciata aperta di sera si risveglia il giorno dopo
     credendo che sia ancora ieri: la data in cima e l'orario della settimana
     sarebbero quelli sbagliati. Si controlla a ogni ritorno in primo piano,
     che è quando si guarda. */
  const checkDay = () => {
    const now = todayISO();
    if (now === day) return;
    day = now;
    renderAll();
  };
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) checkDay();
  });
  window.addEventListener("focus", checkDay);
}

function start() {
  state.settings = loadSettings();
  state.timetables = loadTimetables();
  state.grades = normalizeGrades(loadGrades());
  day = todayISO();

  applyLang();
  applyTheme();
  bindChrome();
  timetableView.open(ctx(), timetableHandlers);
  renderAll();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch(() => {
      // Senza service worker l'app funziona, solo non offline: non è un
      // motivo per disturbare l'utente con un messaggio.
    });
  }
}

start();
