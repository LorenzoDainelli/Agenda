import * as M from "../src/js/model.js";

const OGGI = "2026-09-21"; // lunedì
let pass = 0, fail = 0;
const eq = (label, got, want) => {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}\n       atteso ${w}\n       ottenuto ${g}`); }
};

const task = (due, extra = {}) => ({ ...M.newTask({ title: "x", due, createdAt: OGGI }), ...extra });

console.log("finestra — i casi del piano");
eq("per giovedì (lun→mer)", M.fullWindow(task("2026-09-24"), OGGI), ["2026-09-21","2026-09-22","2026-09-23"]);
eq("per domani → solo oggi", M.fullWindow(task("2026-09-22"), OGGI), ["2026-09-21"]);
eq("per oggi → solo oggi (ultimo momento)", M.fullWindow(task("2026-09-21"), OGGI), ["2026-09-21"]);
eq("già scaduto → vuota", M.fullWindow(task("2026-09-20"), OGGI), []);
eq("senza scadenza → vuota", M.fullWindow(task(null), OGGI), []);

console.log("finestra — con giorni esclusi");
let t = task("2026-09-25");
t = M.toggleSkip(t, "2026-09-22");
eq("martedì escluso", M.windowDays(t, OGGI), ["2026-09-21","2026-09-23","2026-09-24"]);
eq("il giorno escluso è registrato", t.plan.skip, ["2026-09-22"]);
t = M.toggleSkip(t, "2026-09-22");
eq("ritoccato → torna dentro", M.windowDays(t, OGGI).length, 4);

console.log("scegliere un giorno");
t = M.togglePick(t, "2026-09-23", "evening");
eq("scelto mercoledì sera", t.plan.pick, { "2026-09-23": "evening" });
eq("giorno di lavoro = il giorno scelto", M.workDate(t, OGGI), "2026-09-23");
t = M.toggleSkip(t, "2026-09-23");
eq("escludere un giorno scelto lo de-sceglie", t.plan.pick, {});
eq("e lo mette fra gli esclusi", t.plan.skip, ["2026-09-23"]);

console.log("giorno di lavoro");
eq("senza scelte = la scadenza", M.workDate(task("2026-09-24"), OGGI), "2026-09-24");
eq("senza scadenza = niente", M.workDate(task(null), OGGI), null);
let vecchio = task("2026-09-30");
vecchio = M.togglePick(vecchio, "2026-09-19");
eq("scelta tutta nel passato → è roba di oggi", M.workDate(vecchio, OGGI), OGGI);
vecchio = M.togglePick(vecchio, "2026-09-25");
eq("con una scelta futura → vale quella", M.workDate(vecchio, OGGI), "2026-09-25");

console.log("stato");
eq("scaduto e aperto = in ritardo", M.isLate(task("2026-09-20"), OGGI), true);
eq("scaduto ma fatto ≠ in ritardo", M.isLate(M.markDone(task("2026-09-20"), OGGI), OGGI), false);
eq("scaduto ma lasciato cadere ≠ in ritardo", M.isLate(M.markDropped(task("2026-09-20"), OGGI), OGGI), false);
eq("giorni che restano", M.daysLeft(task("2026-09-24"), OGGI), 3);
eq("giorni che restano, scaduto", M.daysLeft(task("2026-09-19"), OGGI), -2);

console.log("parti");
let p = task("2026-09-25");
p = { ...p, parts: [M.newPart("traduzione 5 frasi", 5), M.newPart("2 esercizi", 2)] };
eq("appena create: 0 di 2", M.progress(p), { done: 0, total: 2, hasParts: true });
p = M.setPartDone(p, p.parts[0].id, 5);
eq("prima parte finita: 1 di 2", M.progress(p), { done: 1, total: 2, hasParts: true });
p = M.setPartDone(p, p.parts[1].id, 1);
eq("seconda a metà: ancora 1 di 2", M.progress(p).done, 1);
eq("non tutte fatte", M.allPartsDone(p), false);
p = M.setPartDone(p, p.parts[1].id, 99);
eq("il contatore non sfora il totale", p.parts[1].done, 2);
eq("tutte fatte", M.allPartsDone(p), true);
eq("senza parti l'avanzamento è 0/1", M.progress(task("2026-09-25")), { done: 0, total: 1, hasParts: false });
eq("spuntare il compito spunta le parti", M.progress(M.markDone(p, OGGI)), { done: 2, total: 2, hasParts: true });

console.log("il tocco su una parte, dall'elenco");
// una parte da 3 e una a spunta secca, niente di fatto
let q = { ...task("2026-09-25"), parts: [M.newPart("frasi", 3), M.newPart("scheda", 1)] };
const [frasi, scheda] = q.parts.map((x) => x.id);
const conto = (t) => t.parts.map((x) => x.done);
eq("+1: il primo tocco fa 1 di 3", conto(M.tapPart(q, frasi, "step", OGGI)), [1, 0]);
eq("tutta: il primo tocco la riempie", conto(M.tapPart(q, frasi, "all", OGGI)), [3, 0]);
eq("una parte a spunta secca non conta, si spunta", conto(M.tapPart(q, scheda, "step", OGGI)), [0, 1]);
let pieno = q;
for (let i = 0; i < 3; i++) pieno = M.tapPart(pieno, frasi, "step", OGGI);
eq("+1: al terzo tocco è piena", M.isPartDone(pieno.parts[0]), true);
eq("+1: da piena, un altro tocco la riporta a zero", conto(M.tapPart(pieno, frasi, "step", OGGI)), [0, 0]);
eq("tutta: da piena, un tocco la svuota", conto(M.tapPart(pieno, frasi, "all", OGGI)), [0, 0]);
eq("una parte che non c'è non cambia niente", M.tapPart(q, "p-nessuna", "step", OGGI), q);

console.log("il compito segue le sue parti (§5.2)");
const finito = M.tapPart(M.tapPart(q, frasi, "all", OGGI), scheda, "step", OGGI);
eq("spuntata l'ultima parte, il compito è fatto oggi", finito.doneAt, OGGI);
eq("finché ne manca una, no", M.tapPart(q, frasi, "all", OGGI).doneAt, null);
eq("tolta la spunta a una parte, il compito torna da fare", M.tapPart(finito, scheda, "step", OGGI).doneAt, null);
eq("e le altre parti restano come sono", conto(M.tapPart(finito, scheda, "step", OGGI)), [3, 0]);
// rimesso da fare dall'archivio: le parti sono ancora tutte spuntate
const riaperto = M.markOpen(M.markDone(q, "2026-09-20"));
eq("un compito riaperto con le parti tutte fatte non si richiude da sé",
   M.settleParts(riaperto, OGGI, riaperto).doneAt, null);
eq("ma si chiude se le parti diventano tutte fatte adesso",
   M.settleParts({ ...q, parts: q.parts.map((x) => ({ ...x, done: x.total })) }, OGGI, q).doneAt, OGGI);
eq("un compito lasciato cadere non viene chiuso da una parte",
   M.settleParts({ ...M.markDropped(q, OGGI), parts: riaperto.parts }, OGGI, q).doneAt, null);
const semplice = task("2026-09-25");
eq("senza parti non cambia niente", M.settleParts(semplice, OGGI), semplice);

console.log("i giorni delle parti (§5.1)");
// lunedì 21 le frasi, martedì 22 gli esercizi; scadenza giovedì 24
const LUN = "2026-09-21", MAR = "2026-09-22", MER = "2026-09-23";
let d = { ...task("2026-09-24", { weight: 3 }), parts: [M.newPart("frasi", 5), M.newPart("esercizi", 2)] };
const [fr, es] = d.parts.map((x) => x.id);
eq("una parte nuova segue il compito", M.partDay(d.parts[0]), null);
eq("niente scelto: da pianificare", M.hasPlan(d), false);
d = M.setPartPick(d, fr, LUN, "evening");
d = M.setPartPick(d, es, MAR, "afternoon");
eq("ogni parte ha il suo giorno", d.parts.map(M.partDay), [LUN, MAR]);
eq("e il suo momento", d.parts[0].pick, { [LUN]: "evening" });
eq("un momento che non esiste diventa pomeriggio", M.setPartPick(d, fr, LUN, "notte").parts[0].pick, { [LUN]: "afternoon" });
eq("togliere il giorno", M.partDay(M.setPartPick(d, fr, null).parts[0]), null);
eq("con i giorni delle parti non è più da pianificare", M.hasPlan(d), true);
eq("i giorni in cui c'è qualcosa da fare", M.plannedDays(d), [LUN, MAR]);
eq("lunedì il compito sta lunedì", M.workDate(d, LUN), LUN);
const frasiFatte = M.setPartDone(d, fr, 5);
eq("finite le frasi, passa al martedì degli esercizi", M.workDate(frasiFatte, LUN), MAR);
eq("una parte non fatta di un giorno passato è roba di oggi", M.workDate(d, MER), MER);

console.log("i giorni del compito valgono per le parti che non ne hanno uno (A13)");
const conGiorno = M.togglePick(d, MER, "evening");
eq("se ogni parte da fare ha il suo giorno, quello del compito non conta",
   M.plannedDays(conGiorno), [LUN, MAR]);
const unaSegue = M.setPartPick(conGiorno, es, null);
eq("se una parte non ha un giorno, conta anche quello del compito",
   M.plannedDays(unaSegue), [LUN, MER]);
eq("fatte tutte le parti con un giorno, restano i giorni del compito",
   M.plannedDays(M.setPartDone(M.setPartDone(conGiorno, fr, 5), es, 2)), [MER]);

console.log("il peso si divide fra le parti (A14)");
eq("pesante in due parti su due giorni: 1.5 arrotondato a 2", [M.dayLoad([d], LUN), M.dayLoad([d], MAR)], [2, 2]);
eq("una parte fatta non pesa più", M.dayLoad([frasiFatte], LUN), 0);
eq("un giorno senza parti non pesa", M.dayLoad([d], MER), 0);
let leggero = { ...task("2026-09-25", { weight: 1 }), parts: [M.newPart("a"), M.newPart("b"), M.newPart("c")] };
leggero = M.setPartPick(leggero, leggero.parts[0].id, LUN);
eq("un terzo di leggero non scende a zero: un giorno con qualcosa pesa almeno 1", M.dayLoad([leggero], LUN), 1);
eq("le parti che seguono il compito pesano nei suoi giorni",
   M.dayLoad([M.togglePick(leggero, MAR)], MAR), 1);
eq("due compiti medi interi su un giorno fanno 4, come prima",
   M.dayLoad([M.togglePick(task("2026-09-24", { weight: 2 }), LUN), M.togglePick(task("2026-09-24", { weight: 2 }), LUN)], LUN), 4);

console.log("escludere un giorno o spostare la scadenza (A16)");
eq("escludere martedì toglie il giorno agli esercizi", M.toggleSkip(d, MAR).parts.map(M.partDay), [LUN, null]);
eq("rimetterlo dentro non glielo ridà", M.toggleSkip(M.toggleSkip(d, MAR), MAR).parts.map(M.partDay), [LUN, null]);
eq("spostare la scadenza a martedì toglie il giorno agli esercizi",
   M.reschedule(d, MAR, LUN).parts.map(M.partDay), [LUN, null]);
eq("e le parti restano dove sono", M.reschedule(d, MAR, LUN).parts.map((x) => x.title), ["frasi", "esercizi"]);

console.log("peso della giornata");
const tasks = [
  M.togglePick({ ...M.newTask({ title: "a", due: "2026-09-25", weight: 3 }) }, "2026-09-22"),
  M.togglePick({ ...M.newTask({ title: "b", due: "2026-09-25", weight: 2 }) }, "2026-09-22"),
  { ...M.newTask({ title: "verifica", kind: "test", due: "2026-09-22", weight: 3 }) },
];
eq("somma dei pesi scelti + verifica del giorno", M.dayLoad(tasks, "2026-09-22"), 8);
eq("un giorno senza niente", M.dayLoad(tasks, "2026-09-23"), 0);
eq("gradino di 0", M.loadStep(0), 0);
eq("gradino di 1", M.loadStep(1), 1);
eq("gradino di 2", M.loadStep(2), 1);
eq("gradino di 3", M.loadStep(3), 2);
eq("gradino di 8", M.loadStep(8), 4);
eq("gradino di 40", M.loadStep(40), 5);

console.log("spostare la scadenza");
let r = task("2026-09-25");
r = M.togglePick(r, "2026-09-22");
r = M.togglePick(r, "2026-09-24");
r = M.reschedule(r, "2026-09-23", OGGI);
eq("le scelte fuori dalla nuova finestra cadono", Object.keys(r.plan.pick), ["2026-09-22"]);

console.log(`\n${pass} passati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
