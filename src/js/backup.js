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

import { today as todayISO } from "./days.js";
import { exportAll, readBackup, applyBackup } from "./storage.js";

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
