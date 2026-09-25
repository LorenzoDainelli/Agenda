/* Il promemoria della copia di sicurezza (assunzioni A18–A20 del piano).
 *
 * Si prova solo la regola — quando l'avviso compare — perché è l'unica parte
 * che decide qualcosa: lo scaricamento vero passa dal telefono e si prova
 * aprendo l'app (test/browser/archivio-copia-offline.mjs).
 */
import { isDue, BACKUP_EVERY_DAYS, SNOOZE_DAYS } from "../src/js/backup.js";

let pass = 0, fail = 0;
const eq = (label, got, want) => {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}\n       atteso ${w}\n       ottenuto ${g}`); }
};

const OGGI = "2026-09-25";
const mai = { lastSavedOn: null, snoozedUntil: null };
const compito = (createdAt) => ({ id: "t-" + createdAt, createdAt });

console.log("le costanti decise");
eq("una volta al mese", BACKUP_EVERY_DAYS, 30);
eq("«Più tardi» vale una settimana", SNOOZE_DAYS, 7);

console.log("quando compare");
eq("senza compiti mai: non c'è niente da perdere", isDue([], mai, OGGI), false);
eq("mai fatta, primo compito di 10 giorni fa: ancora no", isDue([compito("2026-09-15")], mai, OGGI), false);
eq("mai fatta, primo compito di 30 giorni fa: sì", isDue([compito("2026-08-26")], mai, OGGI), true);
eq("conta il compito più vecchio, non il primo dell'elenco",
   isDue([compito("2026-09-20"), compito("2026-08-01")], mai, OGGI), true);
eq("ultima copia di 29 giorni fa: no", isDue([compito("2026-01-01")], { ...mai, lastSavedOn: "2026-08-27" }, OGGI), false);
eq("ultima copia di 30 giorni fa: sì", isDue([compito("2026-01-01")], { ...mai, lastSavedOn: "2026-08-26" }, OGGI), true);

console.log("«Più tardi»");
const rimandato = { lastSavedOn: "2026-07-01", snoozedUntil: "2026-09-28" };
eq("prima della data del rinvio non compare", isDue([compito("2026-01-01")], rimandato, OGGI), false);
eq("il giorno del rinvio torna", isDue([compito("2026-01-01")], rimandato, "2026-09-28"), true);

console.log(`\n${pass} passati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
