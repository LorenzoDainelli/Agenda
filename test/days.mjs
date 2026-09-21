/* Prove su days.js — le date.
 *
 * Sono la cosa più noiosa e la più facile da sbagliare: un mese che finisce,
 * un anno che gira, un anno bisestile, una settimana a cavallo. Qui stanno
 * scritti tutti i casi in cui l'app sbaglierebbe in silenzio.
 */
import * as D from "../src/js/days.js";

let pass = 0, fail = 0;
const eq = (label, got, want) => {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}\n       atteso ${w}\n       ottenuto ${g}`); }
};

console.log("giorno della settimana (1 = lunedì)");
eq("lunedì", D.dow("2026-09-21"), 1);
eq("domenica", D.dow("2026-09-27"), 7);
eq("sabato", D.dow("2026-09-26"), 6);

console.log("il lunedì di una settimana");
eq("da giovedì", D.mondayOf("2026-09-24"), "2026-09-21");
eq("da domenica (non salta alla settimana dopo)", D.mondayOf("2026-09-27"), "2026-09-21");
eq("da lunedì (resta lui)", D.mondayOf("2026-09-21"), "2026-09-21");

console.log("sommare giorni");
eq("dentro il mese", D.addDays("2026-09-21", 3), "2026-09-24");
eq("scavalcando il mese", D.addDays("2026-09-30", 1), "2026-10-01");
eq("scavalcando l'anno", D.addDays("2026-12-31", 1), "2027-01-01");
eq("indietro scavalcando l'anno", D.addDays("2027-01-01", -1), "2026-12-31");
eq("29 febbraio di un bisestile", D.addDays("2028-02-28", 1), "2028-02-29");
eq("28 febbraio di un NON bisestile", D.addDays("2027-02-28", 1), "2027-03-01");

console.log("distanza fra due giorni");
eq("avanti", D.diffDays("2026-09-21", "2026-09-25"), 4);
eq("indietro", D.diffDays("2026-09-25", "2026-09-21"), -4);
eq("stesso giorno", D.diffDays("2026-09-21", "2026-09-21"), 0);
eq("scavalcando l'ora legale (26 ottobre 2026)", D.diffDays("2026-10-24", "2026-10-27"), 3);
eq("scavalcando l'ora solare (29 marzo 2026)", D.diffDays("2026-03-28", "2026-03-30"), 2);

console.log("intervalli");
eq("quattro giorni", D.range("2026-09-21", "2026-09-24").length, 4);
eq("un giorno solo", D.range("2026-09-21", "2026-09-21"), ["2026-09-21"]);
eq("intervallo impossibile = vuoto", D.range("2026-09-24", "2026-09-21"), []);

console.log("mesi");
eq("mese di", D.monthKey("2026-09-24"), "2026-09");
eq("primo del mese", D.firstOfMonth("2026-09-24"), "2026-09-01");
eq("dicembre + 1", D.addMonths("2026-12-05", 1), "2027-01-01");
eq("gennaio - 1", D.addMonths("2026-01-05", -1), "2025-12-01");
eq("+ 12 mesi", D.addMonths("2026-09-01", 12), "2027-09-01");
eq("giorni di febbraio 2028 (bisestile)", D.daysInMonth("2028-02-01"), 29);
eq("giorni di febbraio 2027", D.daysInMonth("2027-02-01"), 28);
eq("giorni di settembre", D.daysInMonth("2026-09-01"), 30);
eq("giorni di gennaio", D.daysInMonth("2026-01-01"), 31);

console.log("formati nelle due lingue");
eq("giorno corto it", D.dowShort("2026-09-25", "it"), "ven");
eq("giorno corto en", D.dowShort("2026-09-25", "en"), "Fri");
eq("giorno lungo it", D.dowLong("2026-09-25", "it"), "venerdì");
eq("giorno e mese it", D.dayMonth("2026-09-25", "it"), "25 set");
eq("data intera it", D.full("2026-09-25", "it"), "venerdì 25 settembre");
eq("mese e anno it", D.monthYear("2026-09-25", "it"), "settembre 2026");
eq("sigle dei sette giorni it", D.weekdayInitials("it"), ["lun","mar","mer","gio","ven","sab","dom"]);
eq("le sigle partono sempre dal lunedì, anche in inglese",
   D.weekdayInitials("en")[0], "Mon");

console.log("controlli e limiti");
eq("data valida", D.isISO("2026-09-21"), true);
eq("data storta", D.isISO("21/09/2026"), false);
eq("non è una stringa", D.isISO(null), false);
eq("limitare dentro l'intervallo", D.clamp("2026-09-10", "2026-09-21", "2026-09-30"), "2026-09-21");
eq("limitare oltre l'intervallo", D.clamp("2026-10-10", "2026-09-21", "2026-09-30"), "2026-09-30");
eq("oggi è una data valida", D.isISO(D.today()), true);

console.log(`\n${pass} passati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
