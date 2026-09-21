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
eq("dentro Oggi vince il peso", secs.find(s => s.key === "today").tasks.map(t => t.title), ["pesante oggi","leggero oggi"]);
eq("il compito fatto non c'è", secs.flatMap(s => s.tasks).some(t => t.title === "fatto"), false);

console.log("verifica prima di tutto, anche se leggera");
const mix = [mk("pesante", { due: OGGI, weight: 3 }), mk("verifica", { kind: "test", due: OGGI, weight: 1 })];
eq("la verifica è prima", Q.sections(mix, { today: OGGI })[0].tasks.map(t => t.title), ["verifica","pesante"]);

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
eq("il giorno dello studio", Q.onDay(conVerifica, "2026-09-24").map(t => t.title), ["studia storia"]);
eq("il giorno della verifica", Q.onDay(conVerifica, "2026-09-25").map(t => t.title), ["verifica storia"]);
eq("diviso per momento", Q.onDayBySlot(conVerifica, "2026-09-24").evening.map(t => t.title), ["studia storia"]);
eq("una verifica non pianificata va di mattina", Q.onDayBySlot(conVerifica, "2026-09-25").morning.map(t => t.title), ["verifica storia"]);
eq("da pianificare nel giorno della scadenza",
   Q.unplannedOn([mk("non pianificato", { due: "2026-09-25" })], "2026-09-25").length, 1);
eq("se l'ha pianificato non è più da pianificare", Q.unplannedOn([studio], "2026-09-25").length, 0);

console.log("arretrati in ordine, i più vecchi prima");
eq("ordine", Q.lateTasks([mk("b",{due:"2026-09-22"}), mk("a",{due:"2026-09-19"})], OGGI).map(t => t.title), ["a","b"]);

console.log("archivio");
const arch = Q.archive([
  M.markDone(mk("settembre", { due: OGGI }), "2026-09-20"),
  M.markDone(mk("agosto", { due: OGGI }), "2026-08-15"),
  M.markDropped(mk("caduto", { due: OGGI }), "2026-09-22"),
  mk("aperto", { due: OGGI }),
]);
eq("raggruppato per mese, il più recente prima", arch.map(m => m.month), ["2026-09","2026-08"]);
eq("dentro settembre, il più recente prima", arch[0].tasks.map(t => t.title), ["caduto","settembre"]);
eq("l'aperto non c'è", arch.flatMap(m => m.tasks).some(t => t.title === "aperto"), false);

console.log("eliminare un ambito sposta le sue cose in Privato");
eq("spostate", Q.moveArea([mk("x", { area: "a-1" })], "a-1").map(t => t.area), ["private"]);

console.log(`\n${pass} passati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
