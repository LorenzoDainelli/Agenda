import * as T from "../src/js/timetable.js";
import * as S from "../src/js/subjects.js";

let pass = 0, fail = 0;
const eq = (label, got, want) => {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}\n       atteso ${w}\n       ottenuto ${g}`); }
};

const OGGI = "2026-09-21"; // lunedì
const settings = { schoolDays: [1,2,3,4,5,6], lessonsPerDay: 6 };

console.log("griglia vuota");
const vuota = T.emptyGrid(settings.schoolDays, settings.lessonsPerDay);
eq("sei giorni", Object.keys(vuota), ["1","2","3","4","5","6"]);
eq("sei ore per giorno, tutte libere", vuota["1"], [null,null,null,null,null,null]);

console.log("creare la settimana nuova");
let list = [];
const primo = T.createNext(list, settings, OGGI);
eq("senza orari, nasce quello di questa settimana", primo.weekStart, "2026-09-21");
// riempiamo: INGL lun 1ª e 2ª (ore doppie), MATE gio 3ª, INGL gio 4ª
primo.grid["1"][0] = "s-ingl"; primo.grid["1"][1] = "s-ingl";
primo.grid["4"][2] = "s-mate"; primo.grid["4"][3] = "s-ingl";
list = [primo];
const secondo = T.createNext(list, settings, OGGI);
eq("il secondo è la settimana dopo", secondo.weekStart, "2026-09-28");
eq("ed è una copia del primo", secondo.grid["1"], ["s-ingl","s-ingl",null,null,null,null]);
secondo.grid["1"][1] = null; // la modifico
list = [secondo, primo].sort((a,b) => b.weekStart.localeCompare(a.weekStart));
eq("modificare il nuovo non tocca il vecchio", list[1].grid["1"], ["s-ingl","s-ingl",null,null,null,null]);
eq("premendo + di nuovo va ancora avanti", T.nextWeekStart(list, OGGI), "2026-10-05");

console.log("quale orario vale quando");
eq("questa settimana → il primo", T.timetableFor(list, "2026-09-23").weekStart, "2026-09-21");
eq("la settimana dopo → il secondo", T.timetableFor(list, "2026-09-30").weekStart, "2026-09-28");
eq("fra un mese → ancora il secondo", T.timetableFor(list, "2026-10-26").weekStart, "2026-09-28");
eq("prima che esistessero → il più vecchio", T.timetableFor(list, "2026-09-10").weekStart, "2026-09-21");

console.log("proposta della scadenza");
eq("inglese da lunedì → giovedì, poi lunedì dopo", T.nextLessons(list, "s-ingl", OGGI, 2), ["2026-09-24","2026-09-28"]);
eq("matematica da lunedì → giovedì", T.nextLessons(list, "s-mate", OGGI, 1), ["2026-09-24"]);
eq("una materia che non c'è → niente", T.nextLessons(list, "s-boh", OGGI, 2), []);
eq("materia non scelta → niente", T.nextLessons(list, null, OGGI, 2), []);

console.log("materie di un giorno");
eq("lunedì (ore doppie contate una volta)", T.subjectsOn(list, OGGI), ["s-ingl"]);
eq("giovedì, in ordine di ora", T.subjectsOn(list, "2026-09-24"), ["s-mate","s-ingl"]);
eq("domenica, niente", T.subjectsOn(list, "2026-09-27"), []);

console.log("blocchi di ore consecutive");
eq("due ore di fila = un blocco alto 2", T.blocksOf(["s-a","s-a",null,null,null,null], 6),
   [{subjectId:"s-a",from:0,span:2},{subjectId:null,from:2,span:1},{subjectId:null,from:3,span:1},{subjectId:null,from:4,span:1},{subjectId:null,from:5,span:1}]);
eq("le ore libere NON si fondono (si deve poter riempire una singola ora)",
   T.blocksOf([null,null,null], 3).length, 3);
eq("griglia vuota: una casella per ora", T.blocksOf([], 6).length, 6);
eq("tre uguali di fila = un blocco alto 3",
   T.blocksOf(["s-a","s-a","s-a"], 3), [{subjectId:"s-a",from:0,span:3}]);
eq("tre materie diverse", T.blocksOf(["s-a","s-b","s-a"], 3),
   [{subjectId:"s-a",from:0,span:1},{subjectId:"s-b",from:1,span:1},{subjectId:"s-a",from:2,span:1}]);
eq("scrivere un blocco riempie tutte le sue ore",
   T.setBlock({"1":[null,null,null,null,null,null]}, 1, 1, 2, "s-x")["1"],
   [null,"s-x","s-x",null,null,null]);
eq("conteggio delle ore", T.countHours(primo), 4);

console.log("materie: sigle e colori");
eq("nome di una parola", S.suggestShort("Matematica"), "MATE");
eq("nome di due parole", S.suggestShort("Scienze motorie"), "SM");
eq("nome di tre parole", S.suggestShort("Tecnologie e progettazione sistemi"), "TEP");
eq("nome vuoto", S.suggestShort("   "), "");
eq("colori diversi per materie nuove", S.nextColor([{color:"sky"},{color:"amber"}]), "violet");
eq("il colore è un token, non un esadecimale", S.colorStyle("sky"),
   "--ag-dot:var(--ag-subj-sky);--ag-chip-soft:var(--ag-subj-sky-soft);--ag-chip-ink:var(--ag-subj-sky-ink)");
eq("un colore sconosciuto ripiega su slate", S.colorStyle("verdolino").includes("slate"), true);
eq("materia eliminata: resta il nome congelato",
   S.subjectLabel([], { subjectId: "s-x", subjectName: "Inglese" }), "Inglese");
eq("materia esistente: vince il nome attuale",
   S.subjectLabel([{id:"s-x",name:"Inglese 2"}], { subjectId: "s-x", subjectName: "Inglese" }), "Inglese 2");

console.log(`\n${pass} passati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
