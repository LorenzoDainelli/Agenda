/* Agenda — copie di sicurezza.
 *
 * I dati vivono solo sul telefono. Se qualcuno cancella i dati dei siti in
 * Impostazioni → Safari, o se si cambia telefono, non c'è niente da cui
 * recuperarli — e l'app non se ne accorgerebbe nemmeno, perché si
 * cancellerebbe anche il segnalino che dice "qui c'erano dei dati". Si
 * riaprirebbe vuota, senza poter avvisare.
 *
 * Per questo il file lo si scarica a mano, e lo si scarica dove vuole lui.
 */

import { today as todayISO, addDays, diffDays } from "./days.js";
import { exportAll, readBackup, applyBackup, loadBackupInfo, saveBackupInfo } from "./storage.js";

/** Ogni quanti giorni l'app ricorda di scaricare una copia (deciso dall'utente). */
export const BACKUP_EVERY_DAYS = 30;
/** Per quanti giorni «Più tardi» fa sparire l'avviso (assunzione A19). */
export const SNOOZE_DAYS = 7;

/**
 * Se oggi va ricordata la copia (assunzione A18).
 *
 * Si conta dall'ultima copia scaricata da questo telefono; se non ce n'è mai
 * stata una, dal compito più vecchio — nei primi giorni d'uso non c'è ancora
 * niente che valga un avviso. Senza compiti non c'è niente da perdere, e
 * l'avviso non compare.
 */
export function isDue(tasks, info, today = todayISO()) {
  if (!tasks.length) return false;
  if (info.snoozedUntil && today < info.snoozedUntil) return false;
  const since = info.lastSavedOn
    ?? tasks.map((task) => task.createdAt).filter(Boolean).sort()[0];
  return Boolean(since) && diffDays(since, today) >= BACKUP_EVERY_DAYS;
}

/** «Più tardi»: l'avviso torna fra una settimana. */
export function snooze(today = todayISO()) {
  saveBackupInfo({ ...loadBackupInfo(), snoozedUntil: addDays(today, SNOOZE_DAYS) });
}

/** La copia è uscita davvero: si ricomincia a contare da oggi. */
function markSaved(today) {
  saveBackupInfo({ lastSavedOn: today, snoozedUntil: null });
}

function fileName(today) {
  return `agenda-${today}.json`;
}

/**
 * Consegna il file al telefono.
 *
 * Su iPhone il modo naturale è il pannello di condivisione ("Salva su File");
 * altrove si scarica come un file qualsiasi.
 *
 * @returns {Promise<boolean>} vero solo se il file è davvero uscito dall'app.
 *   Se annulla il pannello torna falso, e chi chiama non deve considerare
 *   fatta la copia.
 */
export async function download() {
  const today = todayISO();
  const name = fileName(today);
  const content = JSON.stringify(exportAll(today), null, 2);
  const file = new File([content], name, { type: "application/json" });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
      markSaved(today);
      return true;
    } catch (error) {
      // `AbortError` è lui che ha annullato: non è un guasto, e non va
      // raccontato come tale.
      if (error?.name === "AbortError") return false;
      // Qualunque altro errore: si riprova con il download normale.
    }
  }

  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
  markSaved(today);
  return true;
}

/**
 * Legge un file scelto e lo rimette dentro.
 * @throws {Error} se il file non è una copia dell'Agenda
 */
export async function restore(file) {
  const text = await file.text();
  const parsed = readBackup(text);
  return applyBackup(parsed);
}
