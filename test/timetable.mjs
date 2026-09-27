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
   [{subjectId:"s-a",lab:false,from:0,span:2},{subjectId:null,lab:false,from:2,span:1},{subjectId:null,lab:false,from:3,span:1},{subjectId:null,lab:false,from:4,span:1},{subjectId:null,lab:false,from:5,span:1}]);
eq("le ore libere NON si fondono (si deve poter riempire una singola ora)",
   T.blocksOf([null,null,null], 3).length, 3);
eq("griglia vuota: una casella per ora", T.blocksOf([], 6).length, 6);
eq("tre uguali di fila = un blocco alto 3",
   T.blocksOf(["s-a","s-a","s-a"], 3), [{subjectId:"s-a",lab:false,from:0,span:3}]);
eq("tre materie diverse", T.blocksOf(["s-a","s-b","s-a"], 3),
   [{subjectId:"s-a",lab:false,from:0,span:1},{subjectId:"s-b",lab:false,from:1,span:1},{subjectId:"s-a",lab:false,from:2,span:1}]);
eq("scrivere un blocco riempie tutte le sue ore",
   T.setBlock({"1":[null,null,null,null,null,null]}, 1, 1, 2, "s-x")["1"],
   [null,"s-x","s-x",null,null,null]);
eq("conteggio delle ore", T.countHours(primo), 4);

console.log("teoria e laboratorio (A44–A45)");
eq("un'ora di laboratorio si scrive id@lab", T.cellValue("s-x", true), "s-x@lab");
eq("un'ora di teoria è l'id e basta", T.cellValue("s-x", false), "s-x");
eq("ora libera", T.cellValue(null, true), null);
eq("si rilegge il laboratorio", T.readCell("s-x@lab"), { subjectId: "s-x", lab: true });
eq("si rilegge la teoria", T.readCell("s-x"), { subjectId: "s-x", lab: false });
eq("un valore strano è un'ora libera", T.readCell(42), { subjectId: null, lab: false });
eq("teoria e laboratorio di fila NON si fondono", T.blocksOf(["s-x","s-x@lab","s-x@lab"], 3),
   [{subjectId:"s-x",lab:false,from:0,span:1},{subjectId:"s-x",lab:true,from:1,span:2}]);
const conLab = T.newTimetable("2026-09-21", {
  "1": ["s-x", "s-x", null, null, null, null],
  "3": ["s-x@lab", "s-x@lab", null, null, null, null],
  "4": ["s-x", null, null, null, null, null],
});
eq("prossima lezione, qualunque", T.nextLessons([conLab], "s-x", OGGI, 2), ["2026-09-23", "2026-09-24"]);
eq("prossima lezione di laboratorio", T.nextLessons([conLab], "s-x", OGGI, 2, true), ["2026-09-23", "2026-09-30"]);
eq("prossima lezione di teoria", T.nextLessons([conLab], "s-x", OGGI, 2, false), ["2026-09-24", "2026-09-28"]);
eq("il laboratorio conta fra le materie del giorno", T.subjectsOn([conLab], "2026-09-23"), ["s-x"]);
eq("e fra i giorni della materia", T.daysWithSubject(conLab, "s-x"), [1, 3, 4]);
eq("e fra le ore", T.countHours(conLab), 5);

console.log("materie: sigle e colori");
eq("nome di una parola", S.suggestShort("Matematica"), "MATE");
eq("nome di due parole", S.suggestShort("Scienze motorie"), "SM");
eq("nome di tre parole", S.suggestShort("Lingua e letteratura italiana"), "LEL");
eq("nome vuoto", S.suggestShort("   "), "");
eq("una materia nuova nasce con un colore della tabella (A58)", S.nextColor([]), "t-3-5");
eq("colori diversi per materie nuove", S.nextColor([{color:"t-3-5"},{color:"t-3-1"}]), "t-3-11");
eq("un colore di prima non toglie niente alla tabella", S.nextColor([{color:"petrolio"}]), "t-3-5");
eq("dodici colori proposti, tutti diversi", new Set(S.SUGGESTED).size, 12);
eq("le prime sei materie hanno sei tinte diverse",
   new Set(S.SUGGESTED.slice(0,6).map(c => S.palettePos(c).col)).size, 6);
eq("nessuna nasce nella colonna vicina al colore d'azione (A60)",
   S.SUGGESTED.every(c => S.palettePos(c).col !== 0), true);
eq("il colore è un token, non un esadecimale", S.colorStyle("t-4-7"),
   "--ag-dot:var(--ag-subj-t-4-7);--ag-chip-soft:var(--ag-subj-t-4-7-soft);--ag-chip-ink:var(--ag-subj-t-4-7-ink)");
eq("i colori di prima restano validi (A58)", S.colorStyle("petrolio"),
   "--ag-dot:var(--ag-subj-petrolio);--ag-chip-soft:var(--ag-subj-petrolio-soft);--ag-chip-ink:var(--ag-subj-petrolio-ink)");
eq("un colore sconosciuto ripiega sul primo proposto, non sul nulla", S.colorStyle("verdolino").includes("t-3-5"), true);
eq("una casella fuori dalla tabella è sconosciuta", S.colorStyle("t-10-0").includes("t-3-5"), true);
eq("e anche una colonna di troppo", S.isColor("t-0-12"), false);
eq("la tabella è dieci per dodici", [S.PALETTE_ROWS, S.PALETTE_COLS], [10, 12]);
eq("nome di una casella", S.paletteColor(9, 11), "t-9-11");
eq("e ritorno", S.palettePos("t-9-11"), { row: 9, col: 11 });
eq("un colore di prima non ha una casella", S.palettePos("petrolio"), null);
eq("dodici colori di prima, sempre validi", S.COLORS.every(S.isColor) && S.COLORS.length === 12, true);
eq("materia eliminata: resta il nome congelato",
   S.subjectLabel([], { subjectId: "s-x", subjectName: "Inglese" }), "Inglese");
eq("materia esistente: vince il nome attuale",
   S.subjectLabel([{id:"s-x",name:"Inglese 2"}], { subjectId: "s-x", subjectName: "Inglese" }), "Inglese 2");

console.log(`\n${pass} passati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
