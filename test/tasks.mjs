import * as Q from "../src/js/tasks.js";
import * as M from "../src/js/model.js";

let pass = 0, fail = 0;
const eq = (label, got, want) => {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}\n       atteso ${w}\n       ottenuto ${g}`); }
};

const OGGI = "2026-09-23"; // mercoledì — la settimana finisce domenica 27
const mk = (title, fields) => ({ ...M.newTask({ title, createdAt: OGGI, ...fields }) });

console.log("in quale sezione va un compito");
eq("scaduto", Q.sectionOf(mk("a", { due: "2026-09-22" }), OGGI), "late");
eq("scade oggi", Q.sectionOf(mk("a", { due: OGGI }), OGGI), "today");
eq("scade domani", Q.sectionOf(mk("a", { due: "2026-09-24" }), OGGI), "tomorrow");
eq("scade domenica = questa settimana", Q.sectionOf(mk("a", { due: "2026-09-27" }), OGGI), "week");
eq("scade lunedì prossimo = più avanti", Q.sectionOf(mk("a", { due: "2026-09-28" }), OGGI), "later");
eq("senza data", Q.sectionOf(mk("a", { due: null }), OGGI), "undated");
eq("scade lunedì ma lo fa oggi → oggi",
   Q.sectionOf(M.togglePick(mk("a", { due: "2026-09-28" }), OGGI), OGGI), "today");
eq("scade lunedì e lo fa venerdì → questa settimana",
   Q.sectionOf(M.togglePick(mk("a", { due: "2026-09-28" }), "2026-09-25"), OGGI), "week");

console.log("sezioni dell'elenco");
const tasks = [
  mk("verifica storia", { kind: "test", due: "2026-09-25", weight: 3 }),
  mk("scaduto", { due: "2026-09-21" }),
  mk("leggero oggi", { due: OGGI, weight: 1 }),
  mk("pesante oggi", { due: OGGI, weight: 3 }),
  mk("spesa", { area: "private", due: null }),
  M.markDone(mk("fatto", { due: OGGI }), OGGI),
];
const secs = Q.sections(tasks, { today: OGGI });
eq("nessuna sezione vuota, nell'ordine giusto", secs.map(s => s.key), ["late","today","week","undated"]);
// "fatto" è stato fatto oggi: resta dov'era, barrato, fino a mezzanotte (§6.1)
eq("dentro Oggi vince il peso, e il fatto di oggi resta al suo posto",
   secs.find(s => s.key === "today").tasks.map(t => t.title), ["pesante oggi","fatto","leggero oggi"]);
eq("il numerino della sezione conta solo quello che resta", secs.find(s => s.key === "today").open, 2);

console.log("fatto oggi: nell'elenco fino a mezzanotte, poi nell'archivio");
const IERI = "2026-09-22";
const fattoOggi = M.markDone(mk("fatto oggi", { due: "2026-09-25" }), OGGI);
const fattoIeri = M.markDone(mk("fatto ieri", { due: "2026-09-25" }), IERI);
const lasciatoOggi = M.markDropped(mk("lasciato oggi", { due: "2026-09-25" }), OGGI);
const arretratoFatto = M.markDone(mk("arretrato fatto", { due: "2026-09-21" }), OGGI);
const dalFuturo = { ...mk("orologio sbagliato", { due: "2026-09-25" }), doneAt: "2026-09-30" };
const chiusi = [fattoOggi, fattoIeri, lasciatoOggi, arretratoFatto, dalFuturo];
const inElenco = Q.sections(chiusi, { today: OGGI }).flatMap(s => s.tasks).map(t => t.title);
const inArchivio = Q.archive(chiusi, OGGI).flatMap(m => m.tasks).map(t => t.title);
eq("nell'elenco solo le cose fatte oggi", inElenco.sort(), ["arretrato fatto", "fatto oggi"]);
eq("nell'archivio tutto il resto", inArchivio.sort(), ["fatto ieri", "lasciato oggi", "orologio sbagliato"]);
eq("ogni cosa in uno solo dei due posti, e mai in nessuno",
   chiusi.every(t => inElenco.includes(t.title) !== inArchivio.includes(t.title)), true);
eq("fatto oggi resta nella sezione del suo giorno, non salta in Oggi",
   Q.sections([fattoOggi], { today: OGGI }).map(s => s.key), ["week"]);
eq("un arretrato fatto oggi resta fra gli arretrati",
   Q.sections([arretratoFatto], { today: OGGI }).map(s => s.key), ["late"]);
eq("una sezione con solo cose fatte dice 0", Q.sections([arretratoFatto], { today: OGGI })[0].open, 0);
eq("il giorno dopo non c'è più", Q.sections([fattoOggi], { today: "2026-09-24" }).length, 0);
eq("ed è nell'archivio", Q.archive([fattoOggi], "2026-09-24").flatMap(m => m.tasks).length, 1);
eq("i filtri non contano le cose fatte", Q.countsByArea(chiusi), { all: 0 });

console.log("verifica prima di tutto, anche se leggera");
const mix = [mk("pesante", { due: OGGI, weight: 3 }), mk("verifica", { kind: "test", due: OGGI, weight: 1 })];
eq("la verifica è prima", Q.sections(mix, { today: OGGI })[0].tasks.map(t => t.title), ["verifica","pesante"]);

console.log("verifiche: in cima solo a 7 giorni o meno (A53)");
const lontane = [
  mk("leggero", { due: "2026-10-12", weight: 1 }),
  mk("verifica lontana", { kind: "test", due: "2026-10-12", weight: 3 }),
  mk("verifica vicina", { kind: "test", due: "2026-09-30", weight: 1 }),
  mk("pesante", { due: "2026-10-12", weight: 3 }),
];
eq("vicina in cima, lontana in coda, in mezzo per peso",
   Q.sections(lontane, { today: OGGI })[0].tasks.map(t => t.title),
   ["verifica vicina", "pesante", "leggero", "verifica lontana"]);
eq("a 7 giorni esatti è ancora vicina",
   Q.sections([mk("x", { due: "2026-09-30", weight: 3 }), mk("v", { kind: "test", due: "2026-09-30", weight: 1 })],
     { today: OGGI })[0].tasks.map(t => t.title), ["v", "x"]);
eq("a 8 giorni è già lontana",
   Q.sections([mk("x", { due: "2026-10-01", weight: 1 }), mk("v", { kind: "test", due: "2026-10-01", weight: 3 })],
     { today: OGGI })[0].tasks.map(t => t.title), ["x", "v"]);

console.log("parti consigliate (A48)");
// newTask nasce senza parti: le parti si mettono dopo, come fa il pannello
const conParti = (task, titles) => ({ ...task, parts: titles.map((title) => M.newPart(title)) });
const scritte = [
  conParti(mk("", { subjectId: "s-a", createdAt: "2026-09-20" }), ["esercizi", "Pag. 45 es. 3"]),
  conParti(mk("", { subjectId: "s-b", createdAt: "2026-09-21" }), ["Riassunto", "esercizi"]),
  conParti(mk("spesa", { area: "private" }), ["Riassunto privato"]),
];
const avvio = ["Esercizi", "Studiare"];
eq("prima quelle della stessa materia, poi quelle di partenza, poi le altre",
   Q.partSuggestions(scritte, { area: "school", subjectId: "s-b", starters: avvio }),
   ["Esercizi", "Riassunto", "Studiare", "Pag. 45 es. 3"]);
const tante = [conParti(mk("", { subjectId: "s-c" }), ["a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8", "a9"])];
eq("quelle di partenza ci sono anche con uno storico lungo",
   Q.partSuggestions(tante, { area: "school", subjectId: "s-z", starters: avvio }).slice(0, 2), ["Esercizi", "Studiare"]);
eq("una parola di partenza tiene la sua forma", Q.partSuggestions(scritte, { area: "school", starters: avvio })[0], "Esercizi");
eq("scrivendo restano quelle che cominciano così", Q.partSuggestions(scritte, { area: "school", typed: "stu", starters: avvio }), ["Studiare"]);
eq("il numero davanti non conta", Q.partSuggestions(scritte, { area: "school", typed: "5 ria", starters: avvio }), ["Riassunto"]);
eq("vale anche una parola in mezzo", Q.partSuggestions(scritte, { area: "school", typed: "es. 3", starters: avvio }), ["Pag. 45 es. 3"]);
eq("quella scritta tale e quale no", Q.partSuggestions(scritte, { area: "school", typed: "studiare", starters: avvio }), []);
eq("quelle già nel compito no", Q.partSuggestions(scritte, { area: "school", starters: avvio, exclude: ["ESERCIZI"] }).includes("Esercizi"), false);
eq("il privato non prende quelle della scuola", Q.partSuggestions(scritte, { area: "private" }), ["Riassunto privato"]);
eq("al massimo quante ne chiedo", Q.partSuggestions(scritte, { area: "school", starters: avvio, limit: 2 }).length, 2);

console.log("filtro per ambito");
eq("solo scuola", Q.byArea(tasks, "school").length, 5);
eq("solo privato", Q.byArea(tasks, "private").map(t => t.title), ["spesa"]);
eq("tutti", Q.byArea(tasks, "all").length, 6);
eq("conteggi per i filtri", Q.countsByArea(tasks), { all: 5, school: 4, private: 1 });

console.log("numeri del blocco in cima");
eq("oggi comprende gli arretrati", Q.summary(tasks, { today: OGGI }),
   { forToday: 3, late: 1, dueTomorrow: 0, open: 5 });
eq("con una scadenza domani", Q.summary([...tasks, mk("x", { due: "2026-09-24" })], { today: OGGI }).dueTomorrow, 1);

console.log("calendario: cosa c'è in un giorno");
let studio = mk("studia storia", { due: "2026-09-25", weight: 2 });
studio = M.togglePick(studio, "2026-09-24", "evening");
const conVerifica = [studio, mk("verifica storia", { kind: "test", due: "2026-09-25" })];
eq("il giorno dello studio", Q.entriesOn(conVerifica, "2026-09-24").map(e => e.task.title), ["studia storia"]);
eq("il giorno della verifica", Q.entriesOn(conVerifica, "2026-09-25").map(e => e.task.title), ["verifica storia"]);
eq("diviso per momento", Q.onDayBySlot(conVerifica, "2026-09-24").evening.map(e => e.task.title), ["studia storia"]);
eq("una verifica non pianificata va di mattina", Q.onDayBySlot(conVerifica, "2026-09-25").morning.map(e => e.task.title), ["verifica storia"]);
// Un momento che l'app non conosce può arrivare da una copia ripristinata o
// scritta da una versione successiva. Prima faceva saltare l'intera griglia
// della settimana, che restava vuota: non sembrava un errore, sembrava che
// non ci fosse niente da fare.
const inventato = { ...studio, plan: { skip: [], pick: { "2026-09-24": "sera" } } };
eq("un momento sconosciuto non svuota il calendario",
   Q.onDayBySlot([inventato], "2026-09-24").afternoon.map(e => e.task.title), ["studia storia"]);
eq("e non finisce in nessun altro momento",
   [Q.onDayBySlot([inventato], "2026-09-24").morning.length,
    Q.onDayBySlot([inventato], "2026-09-24").evening.length], [0, 0]);

eq("da pianificare nel giorno della scadenza",
   Q.unplannedOn([mk("non pianificato", { due: "2026-09-25" })], "2026-09-25").length, 1);
eq("se l'ha pianificato non è più da pianificare", Q.unplannedOn([studio], "2026-09-25").length, 0);

console.log("calendario: le parti coi loro giorni (§6.2)");
{
  const LUN = "2026-09-21", MAR = "2026-09-22", MER = "2026-09-23";
  let c = { ...mk("compiti di inglese", { due: "2026-09-24", weight: 2 }), parts: [M.newPart("frasi", 5), M.newPart("esercizi", 2)] };
  c = M.setPartPick(c, c.parts[0].id, LUN, "evening");
  c = M.setPartPick(c, c.parts[1].id, MAR, "afternoon");
  const voce = (e) => [e.task.title, e.part?.title ?? null, e.slot, e.done];
  eq("lunedì: una voce, le frasi di sera", Q.entriesOn([c], LUN).map(voce), [["compiti di inglese", "frasi", "evening", false]]);
  eq("martedì: gli esercizi di pomeriggio", Q.onDayBySlot([c], MAR).afternoon.map(voce), [["compiti di inglese", "esercizi", "afternoon", false]]);
  const conGiorno = M.togglePick(c, MER, "evening");
  eq("il giorno del compito non dà una voce se ogni parte ha il suo", Q.entriesOn([conGiorno], MER).length, 0);
  const unaSegue = M.setPartPick(conGiorno, c.parts[1].id, null);
  eq("la dà se una parte lo segue", Q.entriesOn([unaSegue], MER).map(voce), [["compiti di inglese", null, "evening", false]]);
  eq("una parte fatta resta, barrata", Q.entriesOn([M.setPartDone(c, c.parts[0].id, 5)], LUN).map((e) => e.done), [true]);
  eq("nell'elenco, lunedì è di oggi", Q.sectionOf(c, LUN), "today");
  eq("finite le frasi, è di domani", Q.sectionOf(M.setPartDone(c, c.parts[0].id, 5), LUN), "tomorrow");
  eq("con i giorni delle parti non è da pianificare", Q.unplannedOn([c], "2026-09-24").length, 0);
}

console.log("arretrati in ordine, i più vecchi prima");
eq("ordine", Q.lateTasks([mk("b",{due:"2026-09-22"}), mk("a",{due:"2026-09-19"})], OGGI).map(t => t.title), ["a","b"]);

console.log("archivio");
const arch = Q.archive([
  M.markDone(mk("settembre", { due: OGGI }), "2026-09-20"),
  M.markDone(mk("agosto", { due: OGGI }), "2026-08-15"),
  M.markDropped(mk("caduto", { due: OGGI }), "2026-09-22"),
  mk("aperto", { due: OGGI }),
], OGGI);
eq("raggruppato per mese, il più recente prima", arch.map(m => m.month), ["2026-09","2026-08"]);
eq("dentro settembre, il più recente prima", arch[0].tasks.map(t => t.title), ["caduto","settembre"]);
eq("l'aperto non c'è", arch.flatMap(m => m.tasks).some(t => t.title === "aperto"), false);

console.log("eliminare un ambito sposta le sue cose in Privato");
eq("spostate", Q.moveArea([mk("x", { area: "a-1" })], "a-1").map(t => t.area), ["private"]);

console.log(`\n${pass} passati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
