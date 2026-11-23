/* Prove dei voti: quadrimestri e medie (A66–A69). Materie e voti inventati. */
import * as G from "../src/js/grades.js";

let pass = 0, fail = 0;
const eq = (label, got, want) => {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}\n       atteso ${w}\n       ottenuto ${g}`); }
};
const v = (subjectId, value, date, lab = false) => G.newGrade({ subjectId, subjectName: subjectId, value, date, lab });

console.log("i voti possibili");
eq("dal 2 al 10 di mezzo in mezzo", [G.VALUES[0], G.VALUES[1], G.VALUES.at(-1), G.VALUES.length], [2, 2.5, 10, 17]);
eq("6,25 non è un voto", G.isValue(6.25), false);

console.log("quadrimestri (A66)");
eq("settembre è nel primo", G.termOf("2026-09-01"), 1);
eq("il 31 gennaio ancora nel primo", G.termOf("2027-01-31"), 1);
eq("il 1 febbraio nel secondo", G.termOf("2027-02-01"), 2);
eq("il 30 giugno ancora nel secondo", G.termOf("2027-06-30"), 2);
eq("luglio in nessuno", G.termOf("2027-07-10"), null);
eq("gennaio appartiene all'anno iniziato a settembre", G.schoolYearOf("2027-01-15"), 2026);
eq("settembre apre l'anno nuovo", G.schoolYearOf("2027-09-01"), 2027);
eq("anno intero", G.rangeOf(2026, "year"), { from: "2026-09-01", to: "2027-06-30" });
eq("d'estate si apre sull'anno intero", G.defaultPeriod("2027-07-20"), "year");

console.log("medie");
const voti = [
  v("s-a", 6, "2026-10-01"), v("s-a", 8, "2026-11-01", true), v("s-a", 7, "2026-12-01"),
  v("s-b", 5, "2026-10-10"),
  v("s-a", 10, "2027-03-01"),
];
const primo = G.inPeriod(voti, 2026, 1);
eq("il primo quadrimestre ha quattro voti", primo.length, 4);
eq("dal più recente", primo[0].date, "2026-12-01");
const a = G.subjectAverages(primo, "s-a");
eq("media di teoria", a.theory, 6.5);
eq("media di laboratorio", a.lab, 8);
eq("complessiva = tutti i voti insieme (A68)", a.all, 7);
eq("senza voti di laboratorio: nessuna media, non zero", G.subjectAverages(primo, "s-b").lab, null);
eq("generale = media delle medie (A69)", G.overallAverage(primo), 6);
eq("anno intero", G.subjectAverages(G.inPeriod(voti, 2026, "year"), "s-a").all, 7.75);
eq("nessun voto: nessuna media", G.overallAverage([]), null);

console.log("scrittura");
eq("6,5 all'italiana", G.formatNumber(6.5, "it"), "6,5");
eq("due decimali al massimo", G.formatNumber(20 / 3, "it"), "6,67");
eq("nessuna media: un trattino", G.formatNumber(null, "it"), "—");

console.log("materie eliminate");
const elenco = G.subjectsWithGrades([v("s-x", 6, "2026-10-01")], [{ id: "s-a", name: "A" }]);
eq("restano coi voti e il nome congelato", elenco.map((s) => s.name), ["A", "s-x"]);
eq("si scartano i voti rotti", G.normalize([{ id: "g", subjectId: "s", value: 6.3, date: "2026-10-01" }, voti[0]]).length, 1);

console.log(`\n${pass} passati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
