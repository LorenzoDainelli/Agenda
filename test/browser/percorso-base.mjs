import { chromium, devices } from "playwright";
const CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const browser = await chromium.launch({ executablePath: CHROME });
const ctx = await browser.newContext({
  ...devices["iPhone 15"], hasTouch: true, isMobile: true,
  locale: "it-IT", timezoneId: "Europe/Rome",
});
// Le prove sono scritte per lunedì 21 settembre 2026, alle dieci: l'orologio
// del browser si ferma lì. Senza, dal giorno dopo le date dei dati finti
// scivolano nel passato, parte la rassegna degli arretrati e la prova fallisce
// per colpa del calendario, non dell'app. Si ferma solo la data: i timer
// (i toast, le animazioni) continuano a scorrere.
await ctx.clock.setFixedTime(new Date("2026-09-21T10:00:00+02:00"));
const page = await ctx.newPage();
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
const txt = async (s) => ((await page.locator(s).first().textContent()) || "").trim().replace(/\s+/g, " ");
const all = async (s) => (await page.locator(s).allTextContents()).map(v => v.trim().replace(/\s+/g," ")).filter(Boolean);
let ko = 0;
const check = (label, ok, extra="") => { if (!ok) ko++; console.log(`  ${ok ? "ok  " : "KO  "} ${label}${extra ? " — " + extra : ""}`); };

await page.goto("http://localhost:8099/index.html", { waitUntil: "networkidle" });

// ── preparo i dati via localStorage: qui interessa l'interfaccia, non il
//    tempo di riempire le impostazioni a mano
await page.evaluate(() => {
  const S = (n, short, color) => ({ id: "s-" + short.toLowerCase(), name: n, short, color });
  const subjects = [S("Inglese","INGL","petrolio"), S("Matematica","MATE","mattone"),
                    S("Storia","STOR","prugna"), S("Informatica","INFO","muschio")];
  localStorage.setItem("agenda:settings", JSON.stringify({
    version:1, lang:null, theme:null, subjects, areas:[], lessonsPerDay:6, schoolDays:[1,2,3,4,5,6],
  }));
  localStorage.setItem("agenda:timetables", JSON.stringify([{
    weekStart: "2026-09-21",
    grid: { "1":["s-ingl","s-ingl","s-mate",null,null,null], "2":["s-stor",null,null,null,null,null],
            "3":["s-info",null,null,null,null,null], "4":["s-mate","s-ingl",null,null,null,null],
            "5":["s-stor",null,null,null,null,null], "6":[null,null,null,null,null,null] },
  }]));
  localStorage.removeItem("agenda:tasks");
  localStorage.removeItem("agenda:review");
});
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(300);

console.log("== creare e salvare un compito con parti ==");
await page.click("#add"); await page.waitForTimeout(250);
await page.fill("#task-title", "Compiti di inglese");
await page.locator('#subject-chips [data-subject]:has-text("Inglese")').first().click();
await page.waitForTimeout(200);
await page.locator('[data-weight="2"]').click();
await page.fill("#part-new", "5 frasi da tradurre"); await page.click("#part-add"); await page.waitForTimeout(150);
await page.fill("#part-new", "2 esercizi sul libro"); await page.click("#part-add"); await page.waitForTimeout(150);
// scelgo martedì 22 con pressione lunga
const mar = page.locator('#window-days [data-day="2026-09-22"]');
await mar.hover();
await page.mouse.down(); await page.waitForTimeout(600); await page.mouse.up();
await page.waitForTimeout(300);
check("la pressione lunga apre la scelta del momento", await page.locator("#sheet-body .ag-sheet__option").count() === 3,
      (await all("#sheet-body .ag-sheet__option")).join("/"));
await page.locator('#sheet-body .ag-sheet__option:has-text("Sera")').click();
await page.waitForTimeout(250);
check("martedì risulta scelto", (await page.locator('#window-days [data-day="2026-09-22"]').getAttribute("class")).includes("ag-day--picked"));
check("e porta il momento", (await txt('#window-days [data-day="2026-09-22"] .ag-day__slot')) === "sera", await txt('#window-days [data-day="2026-09-22"] .ag-day__slot'));
// escludo mercoledì con un tocco
await page.locator('#window-days [data-day="2026-09-23"]').click(); await page.waitForTimeout(200);
check("mercoledì risulta escluso", (await page.locator('#window-days [data-day="2026-09-23"]').getAttribute("class")).includes("ag-day--out"));
await page.screenshot({ path: "/tmp/shots/05-finestra.png" });
await page.click("#task-save"); await page.waitForTimeout(300);

console.log("\n== l'elenco ==");
check("il compito è nell'elenco", await page.locator("#list .ag-task").count() === 1);
check("sezione = Domani (lo fa martedì)", (await all(".ag-section__title")).includes("Domani"), (await all(".ag-section__title")).join("/"));
const meta = await txt("#list .ag-task__meta");
check("la riga porta materia e scadenza", meta.includes("Inglese") && meta.includes("gio 24"), meta);
check("le parti stanno sotto la riga", await page.locator("#list .ag-subpart").count() === 2);
check("la parte con un numero porta il conto nel cerchio", (await txt("#list .ag-check__count")) === "0/5", await txt("#list .ag-check__count"));
check("e la riga non le ripete accanto al titolo", !meta.includes("restano"), meta);

console.log("\n== spuntare le parti senza aprire il compito ==");
const parte = (i) => page.locator("#list .ag-subpart").nth(i);
const cerchio = (i) => parte(i).locator("[data-part]");
const riga = page.locator("#list .ag-task").first();
await cerchio(0).click(); await page.waitForTimeout(150);
check("+1 a ogni tocco, di partenza", (await parte(0).locator(".ag-check__count").textContent()) === "1/5");
check("e nessun toast per un tocco normale", await page.locator(".ag-toast").count() === 0);
for (let i = 0; i < 4; i++) { await cerchio(0).click(); await page.waitForTimeout(80); }
check("al quinto tocco la parte è fatta", (await cerchio(0).getAttribute("aria-pressed")) === "true");
check("e resta sotto, barrata", (await parte(0).getAttribute("class")).includes("ag-subpart--done"));
check("il compito non è ancora fatto", !(await riga.getAttribute("class")).includes("ag-task--done"));
await cerchio(1).click(); await page.waitForTimeout(80);
await cerchio(1).click(); await page.waitForTimeout(250);
check("spuntata l'ultima parte, il compito si spunta da sé", (await riga.getAttribute("class")).includes("ag-task--done"));
check("e lo dice il toast", (await all(".ag-toast__text")).some((x) => x.includes("Fatte tutte le parti")), (await all(".ag-toast__text")).join("/"));
check("la riga resta nell'elenco", await page.locator("#list .ag-task").count() === 1);
check("il numerino della sezione dice che non resta niente", (await txt(".ag-section__n")) === "0", await txt(".ag-section__n"));
await page.waitForTimeout(5400); // i toast se ne vanno
await cerchio(1).click(); await page.waitForTimeout(250);
check("togliendo una parte il compito torna da fare", !(await riga.getAttribute("class")).includes("ag-task--done"));
check("la parte con un numero torna a zero", (await parte(1).locator(".ag-check__count").textContent()) === "0/2");

console.log("\n== togliere la spunta ridà le parti com'erano ==");
await riga.locator("[data-check]").click(); await page.waitForTimeout(200);
check("spuntando il compito tutte le parti si spuntano", await page.locator("#list .ag-subpart--done").count() === 2);
await riga.locator("[data-check]").click(); await page.waitForTimeout(200);
check("togliendo la spunta tornano com'erano: una fatta e una no",
      await page.locator("#list .ag-subpart--done").count() === 1 && (await txt("#list .ag-check__count")) === "0/2");
await page.waitForTimeout(5400);

console.log("\n== l'impostazione: un tocco la fa tutta ==");
await page.click("#open-settings"); await page.waitForTimeout(250);
await page.click('[data-page="tasks"]'); await page.waitForTimeout(200);
await page.locator('[data-parttap="all"]').click(); await page.waitForTimeout(250);
check("l'impostazione risulta scelta", (await page.locator('[data-parttap="all"]').getAttribute("aria-pressed")) === "true");
await page.click('[data-close="settings-layer"]'); await page.waitForTimeout(200);
await cerchio(1).click(); await page.waitForTimeout(250);
check("un tocco riempie la parte da 2", (await cerchio(1).getAttribute("aria-pressed")) === "true");
check("e il compito è fatto", (await riga.getAttribute("class")).includes("ag-task--done"));
await page.waitForTimeout(5400);
await riga.locator("[data-check]").click(); await page.waitForTimeout(200);
await page.waitForTimeout(5400);
await page.click("#open-settings"); await page.waitForTimeout(250);
await page.click('[data-page="tasks"]'); await page.waitForTimeout(200);
await page.locator('[data-parttap="step"]').click(); await page.waitForTimeout(200);
await page.click('[data-close="settings-layer"]'); await page.waitForTimeout(200);

console.log("\n== altri compiti, per vedere le sezioni ==");
await page.evaluate(() => {
  const tasks = JSON.parse(localStorage.getItem("agenda:tasks"));
  const base = (over) => ({ id:"t-"+Math.random().toString(36).slice(2,8), area:"school", subjectId:null,
    subjectName:null, kind:"homework", title:"x", due:null, weight:1, createdAt:"2026-09-21",
    doneAt:null, droppedAt:null, plan:{skip:[],pick:{}}, parts:[], ...over });
  tasks.push(base({ title:"Verifica di storia", kind:"test", subjectId:"s-stor", subjectName:"Storia", due:"2026-09-25", weight:3 }));
  tasks.push(base({ title:"Esercizi di matematica", subjectId:"s-mate", subjectName:"Matematica", due:"2026-09-24", weight:3 }));
  tasks.push(base({ title:"Relazione di informatica", subjectId:"s-info", subjectName:"Informatica", due:"2026-10-05", weight:3 }));
  tasks.push(base({ title:"Comprare le cuffie", area:"private", kind:"todo", due:null }));
  tasks.push(base({ title:"Schede di inglese", subjectId:"s-ingl", subjectName:"Inglese", due:"2026-09-18", weight:2 }));
  localStorage.setItem("agenda:tasks", JSON.stringify(tasks));
});
await page.reload({ waitUntil: "networkidle" }); await page.waitForTimeout(400);
// la rassegna parte da sé perché c'è un arretrato
check("la rassegna si apre da sé", !(await page.locator("#review-layer").isHidden()));
console.log("   rassegna:", await txt("#review-body .ag-task__title"), "|", await txt("#review-body .ag-task__due--late"));
await page.screenshot({ path: "/tmp/shots/06-rassegna.png" });
await page.locator('#review-body [data-act="postpone"]').click(); await page.waitForTimeout(250);
console.log("   opzioni rimando:", (await all("#review-body .ag-sheet__option")).join(" / "));
await page.locator('#review-body [data-to]:has-text("Domani")').click(); await page.waitForTimeout(350);
check("dopo l'ultimo arretrato la rassegna si chiude", await page.locator("#review-layer").isHidden());
check("l'avviso della rassegna non c'è più", await page.locator("#review-alert").isHidden());

console.log("\n== sezioni complete ==");
console.log("   ", (await all(".ag-section__title")).join(" · "));
console.log("   prossimi giorni:", (await all("#next-days .ag-nday")).join(" | "));
check("la striscia mostra sette giorni", await page.locator("#next-days .ag-nday").count() === 7);
check("l'avviso in cima non c'è (niente di urgente)", await page.locator("#urgent").isHidden());
await page.screenshot({ path: "/tmp/shots/07-elenco.png" });
await page.screenshot({ path: "/tmp/shots/07b-elenco-intero.png", fullPage: true });

console.log("\n== aree di tocco (regola 10) ==");
const filtro = await page.locator(".ag-filter").first().boundingBox();
check("i filtri sono alti almeno 44px", filtro.height >= 44, `${filtro.height.toFixed(1)}px`);

console.log("\n== spuntare scorrendo ==");
const primaRiga = page.locator("#list .ag-task").first();
const titoloPrima = await primaRiga.locator(".ag-task__title").textContent();
const scaglia = async (fino) => {
  const box = await page.locator("#list .ag-task", { hasText: titoloPrima }).boundingBox();
  const y = box.y + 18;
  await page.mouse.move(box.x + 30, y);
  await page.mouse.down();
  for (let x = 40; x <= fino; x += 20) await page.mouse.move(box.x + x, y);
  await page.mouse.up();
  await page.waitForTimeout(300);
};
await scaglia(80);
check("uno scorrimento corto non spunta", !(await page.locator("#list .ag-task", { hasText: titoloPrima }).getAttribute("class")).includes("ag-task--done"));
check("e non apre il compito", await page.locator("#task-layer").isHidden());
await scaglia(260);
check("uno scorrimento lungo verso destra spunta", (await page.locator("#list .ag-task", { hasText: titoloPrima }).getAttribute("class")).includes("ag-task--done"));
check("con l'annulla nel toast", await page.locator(".ag-toast__undo").count() >= 1);
check("e non apre il compito", await page.locator("#task-layer").isHidden());
await scaglia(260);
check("sulla riga fatta, lo stesso gesto la rimette da fare", !(await page.locator("#list .ag-task", { hasText: titoloPrima }).getAttribute("class")).includes("ag-task--done"));
await page.waitForTimeout(5400);

console.log("\n== spuntare, con annulla ==");
const prima = await page.locator("#list .ag-task").count();
await page.locator("#list [data-check]").first().click(); await page.waitForTimeout(250);
check("compare il toast con l'annulla", await page.locator(".ag-toast__undo").count() === 1);
check("la riga resta al suo posto, barrata", await page.locator("#list .ag-task").count() === prima
      && (await page.locator("#list .ag-task").first().getAttribute("class")).includes("ag-task--done"));
await page.locator(".ag-toast__undo").click(); await page.waitForTimeout(300);
check("annullando torna da fare", !(await page.locator("#list .ag-task").first().getAttribute("class")).includes("ag-task--done"));

console.log("\n== calendario ==");
await page.click("#open-calendar"); await page.waitForTimeout(350);
check("la griglia ha sette intestazioni di giorno", await page.locator(".ag-wgrid__head").count() === 7);
// i momenti sono icone (A25): il nome si legge dall'aria-label, non dal testo
const momenti = await page.locator(".ag-wgrid__slot").evaluateAll(els => els.map(e => e.getAttribute("aria-label")));
check("i momenti della giornata sono righe, con un nome", momenti.length >= 3 && momenti.every(Boolean), momenti.join("/"));
console.log("   blocchi nella griglia:", (await all(".ag-wblock")).join(" "));
check("il giorno scelto ha il suo dettaglio sotto", await page.locator(".ag-wday-detail__title").count() === 1,
      await txt(".ag-wday-detail__title"));
await page.locator('.ag-wgrid__head[data-pick-day="2026-09-22"]').click(); await page.waitForTimeout(300);
check("toccando un'intestazione cambia il giorno del dettaglio",
      (await txt(".ag-wday-detail__title")).includes("22"), await txt(".ag-wday-detail__title"));
// i blocchetti non si toccano (24px): si tocca la colonna, in un punto qualsiasi
await page.locator('.ag-wgrid__cell[data-pick-day="2026-09-24"]').last().click(); await page.waitForTimeout(300);
check("toccando una casella qualsiasi della colonna si sceglie quel giorno",
      (await txt(".ag-wday-detail__title")).includes("24"), await txt(".ag-wday-detail__title"));
check("i blocchetti non sono pulsanti", await page.locator("button.ag-wblock").count() === 0);
const colonna = await page.locator('.ag-wgrid__cell[data-pick-day="2026-09-24"]').first().boundingBox();
check("una colonna è larga almeno 44px", colonna.width >= 44, `${colonna.width.toFixed(1)}px`);
const pellet = await page.locator(".ag-pellet").first().boundingBox();
check("le righe sotto la griglia sono alte almeno 44px", pellet.height >= 44, `${pellet.height.toFixed(1)}px`);
await page.screenshot({ path: "/tmp/shots/08-settimana.png" });
await page.screenshot({ path: "/tmp/shots/08b-settimana-intera.png", fullPage: true });
await page.locator('#cal-mode [data-mode="month"]').click(); await page.waitForTimeout(350);
check("il mese mostra dodici blocchi", await page.locator(".ag-cal__month").count() === 12, String(await page.locator(".ag-cal__month").count()));
check("un giorno con verifica ha l'anello", await page.locator(".ag-cal__ring").count() >= 1);
await page.screenshot({ path: "/tmp/shots/09-mese.png" });
await page.locator('.ag-cal__month:first-child [data-day="2026-09-22"]').click(); await page.waitForTimeout(300);
check("toccando un giorno si scende alla sua settimana", await page.locator(".ag-wgrid__head").count() === 7);
await page.click('[data-close="calendar-layer"]'); await page.waitForTimeout(200);

console.log("\n== tema scuro ==");
await page.click("#open-settings"); await page.waitForTimeout(300);
await page.click('[data-page="look"]'); await page.waitForTimeout(200);
await page.locator('[data-theme="dark"]').click(); await page.waitForTimeout(300);
check("l'attributo del tema cambia", await page.getAttribute("html","data-theme") === "dark");
// Non il valore esatto: quello cambia con la palette e il test diventerebbe
// rosso per una scelta di design invece che per un difetto. Conta che sia scuro.
const bg = await page.evaluate(() => {
  const [r,g,b] = getComputedStyle(document.body).backgroundColor.match(/\d+/g).map(Number);
  return { css: `rgb(${r}, ${g}, ${b})`, chiaro: (r*0.2126 + g*0.7152 + b*0.0722) / 255 };
});
check("il fondo diventa scuro", bg.chiaro < 0.2, `${bg.css} — luminosità ${bg.chiaro.toFixed(3)}`);
await page.screenshot({ path: "/tmp/shots/10-scuro-impostazioni.png" });
await page.click('[data-close="settings-layer"]'); await page.waitForTimeout(250);
await page.screenshot({ path: "/tmp/shots/11-scuro-elenco.png" });
await page.click("#open-calendar"); await page.waitForTimeout(350);
await page.screenshot({ path: "/tmp/shots/12-scuro-settimana.png" });
await page.click('[data-close="calendar-layer"]');

console.log("\n== lingua inglese forzata ==");
await page.click("#open-settings"); await page.waitForTimeout(250);
await page.click('[data-page="look"]'); await page.waitForTimeout(200);
await page.locator('#lang-seg [data-lang="en"]').click(); await page.waitForTimeout(300);
check("l'interfaccia passa all'inglese", (await txt("#settings-title")) === "Appearance", await txt("#settings-title"));
await page.locator('#lang-seg [data-lang="it"]').click(); await page.waitForTimeout(250);
await page.locator('[data-theme=""]').click(); await page.waitForTimeout(250);
await page.click('[data-close="settings-layer"]');

console.log("\n== giorni diversi per le parti ==");
await page.evaluate(() => {
  const tasks = JSON.parse(localStorage.getItem("agenda:tasks"));
  tasks.push({ id:"t-parti", area:"school", subjectId:"s-stor", subjectName:"Storia", kind:"homework",
    title:"Riassunto di storia", due:"2026-09-24", weight:3, createdAt:"2026-09-21", doneAt:null, droppedAt:null,
    plan:{skip:[],pick:{}},
    parts:[{id:"p-a",title:"prima metà",total:1,done:0,pick:{}},{id:"p-b",title:"seconda metà",total:1,done:0,pick:{}}] });
  localStorage.setItem("agenda:tasks", JSON.stringify(tasks));
});
await page.reload({ waitUntil: "networkidle" }); await page.waitForTimeout(300);
const rigaParti = page.locator("#list .ag-task", { hasText: "Riassunto di storia" });
check("senza giorni è da pianificare", await rigaParti.locator(".ag-task__flag--plan").count() === 1);
await rigaParti.locator(".ag-task__main").click(); await page.waitForTimeout(300);
check("nel compito aperto ogni parte ha il suo chip «quando»", (await all("#task-body .ag-part__pill")).join("/") === "quando?/quando?",
      (await all("#task-body .ag-part__pill")).join("/"));
await page.locator("#task-body [data-part-when]").first().click(); await page.waitForTimeout(250);
check("il foglio offre i giorni della finestra", (await all("#when-days [data-when-day]")).join("/") === "oggi/domani/mer 23",
      (await all("#when-days [data-when-day]")).join("/"));
check("e il primo è già scelto", (await page.locator('#when-days [data-when-day="2026-09-21"]').getAttribute("aria-pressed")) === "true");
await page.locator('[data-when-slot="evening"]').click(); await page.waitForTimeout(250);
await page.locator("#task-body [data-part-when]").nth(1).click(); await page.waitForTimeout(250);
await page.locator('#when-days [data-when-day="2026-09-23"]').click();
await page.locator('[data-when-slot="afternoon"]').click(); await page.waitForTimeout(250);
check("i chip dicono il giorno e il momento", (await all("#task-body .ag-part__pill")).join("/") === "oggi · sera/mer 23 · pomerig.",
      (await all("#task-body .ag-part__pill")).join("/"));
await page.click("#task-save"); await page.waitForTimeout(300);
check("non è più da pianificare", await rigaParti.locator(".ag-task__flag--plan").count() === 0);
check("nell'elenco ogni parte porta il suo giorno", (await rigaParti.locator(".ag-subpart__when").allTextContents()).join("/") === "oggi · sera/mer 23 · pomerig.",
      (await rigaParti.locator(".ag-subpart__when").allTextContents()).join("/"));
const sezioneDi = async (loc) => loc.evaluate((n) => n.closest(".ag-section").querySelector(".ag-section__title").textContent.trim());
check("il compito sta nel giorno della prossima parte: oggi", (await sezioneDi(rigaParti)) === "Oggi", await sezioneDi(rigaParti));
await rigaParti.locator("[data-part]").first().click(); await page.waitForTimeout(300);
check("finita la prima metà, passa a mercoledì", (await sezioneDi(rigaParti)) === "Questa settimana", await sezioneDi(rigaParti));
await page.click("#open-calendar"); await page.waitForTimeout(350);
check("nel calendario un blocchetto per ogni parte",
      await page.locator('.ag-wblock[title="Riassunto di storia · prima metà"]').count() === 1
      && await page.locator('.ag-wblock[title="Riassunto di storia · seconda metà"]').count() === 1);
check("quella fatta è barrata", (await page.locator('.ag-wblock[title="Riassunto di storia · prima metà"]').getAttribute("class")).includes("ag-wblock--done"));
check("e sotto la griglia c'è il nome della parte", (await all(".ag-pellet__title")).includes("Riassunto di storia · prima metà"),
      (await all(".ag-pellet__title")).join(" | "));
await page.click('[data-close="calendar-layer"]'); await page.waitForTimeout(200);
await rigaParti.locator(".ag-task__main").click(); await page.waitForTimeout(300);
await page.locator("#task-body [data-part-when]").nth(1).click(); await page.waitForTimeout(250);
await page.locator("[data-when-none]").click(); await page.waitForTimeout(250);
check("«Nessun giorno» rimette la parte a seguire il compito", (await all("#task-body .ag-part__pill")).at(1) === "quando?",
      (await all("#task-body .ag-part__pill")).join("/"));
await page.click("#task-save"); await page.waitForTimeout(300);

console.log("\n== una parte rimasta indietro ==");
await page.evaluate(() => {
  const tasks = JSON.parse(localStorage.getItem("agenda:tasks"));
  tasks.push({ id:"t-indietro", area:"school", subjectId:"s-mate", subjectName:"Matematica", kind:"homework",
    title:"Problemi di geometria", due:"2026-09-25", weight:2, createdAt:"2026-09-18", doneAt:null, droppedAt:null,
    plan:{skip:[],pick:{}},
    parts:[{id:"p-x",title:"primi tre",total:1,done:0,pick:{"2026-09-20":"evening"}},
           {id:"p-y",title:"gli altri",total:1,done:0,pick:{"2026-09-23":"afternoon"}}] });
  localStorage.setItem("agenda:tasks", JSON.stringify(tasks));
});
await page.reload({ waitUntil: "networkidle" }); await page.waitForTimeout(300);
const rigaIndietro = page.locator("#list .ag-task", { hasText: "Problemi di geometria" });
check("sta in Oggi, anche se l'altra parte è mercoledì", (await sezioneDi(rigaIndietro)) === "Oggi", await sezioneDi(rigaIndietro));
const quandoIndietro = rigaIndietro.locator(".ag-subpart__when").first();
check("il giorno passato si legge «ieri · sera»", (await quandoIndietro.textContent()).trim() === "ieri · sera", await quandoIndietro.textContent());
check("ed è rosso", (await quandoIndietro.getAttribute("class")).includes("ag-subpart__when--late"));
check("l'altra no", !(await rigaIndietro.locator(".ag-subpart__when").nth(1).getAttribute("class")).includes("--late"));

console.log("\n== la rassegna di un compito con parti ==");
await page.evaluate(() => {
  const tasks = JSON.parse(localStorage.getItem("agenda:tasks"));
  tasks.push({ id:"t-rass", area:"school", subjectId:"s-info", subjectName:"Informatica", kind:"homework",
    title:"Esercizi di informatica", due:"2026-09-19", weight:2, createdAt:"2026-09-15", doneAt:null, droppedAt:null,
    plan:{skip:[],pick:{}},
    parts:[{id:"r-1",title:"primo esercizio",total:1,done:0,pick:{}},{id:"r-2",title:"secondo esercizio",total:1,done:0,pick:{}}] });
  localStorage.setItem("agenda:tasks", JSON.stringify(tasks));
  localStorage.setItem("agenda:review", JSON.stringify({ lastReviewedOn: "2026-09-20" }));
});
await page.reload({ waitUntil: "networkidle" }); await page.waitForTimeout(400);
check("la rassegna si apre", !(await page.locator("#review-layer").isHidden()));
// il compito con parti potrebbe non essere il primo della coda: si risponde
// «Non serve più»… no — si rimanda chi c'è prima, finché non arriva lui
for (let i = 0; i < 5 && !(await txt("#review-body .ag-task__title")).includes("informatica"); i++) {
  await page.locator('#review-body [data-act="postpone"]').click(); await page.waitForTimeout(200);
  await page.locator('#review-body [data-to]').first().click(); await page.waitForTimeout(300);
}
check("il compito con parti porta le sue parti", await page.locator("#review-body .ag-subpart").count() === 2);
check("e il loro nome non apre niente", await page.locator("#review-body .ag-subpart__title[data-open]").count() === 0);
await page.locator("#review-body [data-part-id]").first().click(); await page.waitForTimeout(300);
check("spuntata una parte, il compito resta lì", (await txt("#review-body .ag-task__title")).includes("informatica")
      && await page.locator("#review-body .ag-subpart--done").count() === 1);
await page.locator("#review-body [data-part-id]").nth(1).click(); await page.waitForTimeout(400);
check("spuntata l'ultima, il compito è fatto e la rassegna va avanti",
      await page.evaluate(() => JSON.parse(localStorage.getItem("agenda:tasks")).find((t) => t.id === "t-rass").doneAt) === "2026-09-21");
if (!(await page.locator("#review-layer").isHidden())) { await page.click('[data-close="review-layer"]'); await page.waitForTimeout(200); }

console.log("\n== un compito di scuola senza nome ==");
await page.click("#add"); await page.waitForTimeout(250);
check("nella scuola la tastiera non si apre da sola", await page.evaluate(() => document.activeElement?.tagName !== "INPUT"));
check("la materia viene prima del nome", await page.evaluate(() => {
  const m = document.querySelector("#task-body #subject-chips"), n = document.querySelector("#task-body #task-title");
  return Boolean(m && n) && (m.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
}));
await page.click("#task-save"); await page.waitForTimeout(250);
check("senza materia e senza nome non si salva, e lo dice", !(await page.locator("#task-layer").isHidden())
      && (await all(".ag-toast__text")).some((x) => x.includes("Scegli una materia")), (await all(".ag-toast__text")).join(" | "));
await page.locator('#subject-chips [data-subject="s-mate"]').click(); await page.waitForTimeout(200);
check("il nome vuoto mostra quello che prenderà", (await page.getAttribute("#task-title", "placeholder")) === "Matematica",
      await page.getAttribute("#task-title", "placeholder"));
await page.fill("#part-new", "problemi pag 12");
await page.locator('[data-weight="2"]').click(); await page.waitForTimeout(200);
check("una parte scritta e non aggiunta resta scritta dopo un altro tocco", (await page.inputValue("#part-new")) === "problemi pag 12");
await page.click("#task-save"); await page.waitForTimeout(300);
const senzaNome = page.locator("#list .ag-task", { has: page.locator(".ag-task__title--subject") });
check("si chiama come la materia, col pallino davanti", (await senzaNome.locator(".ag-task__title").allTextContents()).map((x) => x.trim()).join("/") === "Matematica",
      (await senzaNome.locator(".ag-task__title").allTextContents()).join("/"));
check("la parte scritta e non aggiunta è diventata una parte", (await senzaNome.locator(".ag-subpart__name").allTextContents()).join("/") === "problemi pag 12",
      (await senzaNome.locator(".ag-subpart__name").allTextContents()).join("/"));
check("la riga sotto non ripete la materia", !((await senzaNome.locator(".ag-task__meta").textContent()) || "").includes("Matematica"));
check("il nome salvato resta vuoto", await page.evaluate(() => JSON.parse(localStorage.getItem("agenda:tasks")).some((x) => x.subjectId === "s-mate" && x.title === "")));

console.log("\n== l'orario, dal pulsante in alto ==");
const testata = await page.evaluate(() => {
  const title = document.getElementById("today-title").getBoundingClientRect();
  const btns = [...document.querySelectorAll(".ag-header__actions .ag-iconbtn")].map((b) => b.getBoundingClientRect());
  return { n: btns.length, minW: Math.min(...btns.map((b) => b.width)), titleRight: title.right, firstLeft: Math.min(...btns.map((b) => b.left)) };
});
check("in testata ci sono quattro pulsanti, l'orario per primo", testata.n === 4 && (await page.locator(".ag-header__actions .ag-iconbtn").first().getAttribute("id")) === "open-timetable");
check("larghi almeno 44px", testata.minW >= 44, `${testata.minW}px`);
check("e il titolo non ci finisce sotto", testata.titleRight <= testata.firstLeft + 1, `${testata.titleRight} / ${testata.firstLeft}`);
await page.click("#open-timetable"); await page.waitForTimeout(300);
check("provvisorio: le caselle si toccano", await page.locator("#timetable-body button.ag-tt__cell").count() > 0);
await page.locator('#timetable-body [data-cell^="2:1:"]').click(); await page.waitForTimeout(250);
await page.locator("#sheet-body .ag-sheet__option", { hasText: "Informatica" }).click(); await page.waitForTimeout(250);
check("toccando una casella si cambia la materia",
      await page.evaluate(() => JSON.parse(localStorage.getItem("agenda:timetables"))[0].grid["2"][1]) === "s-info");
await page.click("#tt-final"); await page.waitForTimeout(250);
check("renderlo definitivo chiede conferma, e dice come si torna indietro", (await txt("#sheet-body .ag-sheet__title")).includes("Impostazioni › Orario"),
      await txt("#sheet-body .ag-sheet__title"));
await page.click('#sheet [data-act="yes"]'); await page.waitForTimeout(300);
check("definitivo: le caselle non si toccano più", await page.locator("#timetable-body button.ag-tt__cell").count() === 0
      && await page.locator("#timetable-body .ag-tt__cell").count() > 0);
check("e non c'è più «Nuova settimana»", await page.locator("#tt-add").count() === 0);
check("e resta definitivo", await page.evaluate(() => JSON.parse(localStorage.getItem("agenda:settings")).timetableFinal) === true);
await page.click('[data-close="timetable-layer"]'); await page.waitForTimeout(200);

console.log("\n== impostazioni a pagine ==");
await page.click("#open-settings"); await page.waitForTimeout(250);
check("si parte dall'elenco: sei righe", await page.locator("#settings-body [data-page]").count() === 6);
check("e ognuna dice come stanno le cose", (await txt('[data-page="timetable"] .ag-row__value')) === "definitivo", await txt('[data-page="timetable"] .ag-row__value'));
check("nell'elenco non c'è la freccia indietro", await page.locator("#settings-back").isHidden());
const riga48 = await page.locator("#settings-body [data-page]").first().boundingBox();
check("righe compatte, ma sopra i 44px", riga48.height >= 44 && riga48.height < 60, `${riga48.height}px`);
await page.click('[data-page="timetable"]'); await page.waitForTimeout(200);
check("dentro una pagina: il suo nome e la freccia", (await txt("#settings-title")) === "Orario" && !(await page.locator("#settings-back").isHidden()));
await page.click("#tt-unlock"); await page.waitForTimeout(250);
check("da qui l'orario torna modificabile", await page.evaluate(() => JSON.parse(localStorage.getItem("agenda:settings")).timetableFinal) === false);
await page.click("#settings-back"); await page.waitForTimeout(200);
check("la freccia torna all'elenco", await page.locator("#settings-body [data-page]").count() === 6 && (await txt("#settings-title")) === "Impostazioni");
check("che ora dice provvisorio", (await txt('[data-page="timetable"] .ag-row__value')) === "provvisorio");
await page.click('[data-page="subjects"]'); await page.waitForTimeout(200);
await page.keyboard.press("Escape"); await page.waitForTimeout(200);
check("Esc da una pagina torna all'elenco, non chiude", !(await page.locator("#settings-layer").isHidden()) && await page.locator("#settings-body [data-page]").count() === 6);
await page.click('[data-close="settings-layer"]'); await page.waitForTimeout(200);
await page.click("#open-timetable"); await page.waitForTimeout(250);
check("e l'orario si tocca di nuovo", await page.locator("#timetable-body button.ag-tt__cell").count() > 0);
await page.click('[data-close="timetable-layer"]'); await page.waitForTimeout(200);

console.log("\n== a mezzanotte le cose fatte vanno nell'archivio ==");
// una riga ancora da fare: quella in cima può essere già fatta (la rassegna qui sopra)
await page.locator("#list .ag-task:not(.ag-task--done) [data-check]").first().click(); await page.waitForTimeout(250);
const fattoTitolo = await txt("#list .ag-task--done .ag-task__title");
await page.click("#open-archive"); await page.waitForTimeout(250);
check("fatto oggi: non ancora nell'archivio", !(await all("#archive-body .ag-task__title")).includes(fattoTitolo), fattoTitolo);
await page.click('[data-close="archive-layer"]'); await page.waitForTimeout(200);
await ctx.clock.setFixedTime(new Date("2026-09-22T00:00:05+02:00"));
await page.evaluate(() => window.dispatchEvent(new Event("focus"))); await page.waitForTimeout(300);
check("passata la mezzanotte non è più nell'elenco", !(await all("#list .ag-task__title")).includes(fattoTitolo));
await page.click("#open-archive"); await page.waitForTimeout(250);
check("ed è nell'archivio", (await all("#archive-body .ag-task__title")).includes(fattoTitolo));
await page.click('[data-close="archive-layer"]'); await page.waitForTimeout(200);

console.log("\n== anche con l'app aperta davanti, senza toccarla ==");
// Un contesto a parte con l'orologio finto intero (anche i timer): si parte
// alle 23:59:50 con una cosa fatta oggi e si lascia scorrere il tempo.
const ctx2 = await browser.newContext({ ...devices["iPhone 15"], locale: "it-IT", timezoneId: "Europe/Rome" });
await ctx2.clock.install({ time: new Date("2026-09-21T23:59:50+02:00") });
const p2 = await ctx2.newPage();
p2.on("pageerror", (e) => errors.push("pageerror (mezzanotte): " + e.message));
await p2.goto("http://localhost:8099/index.html");
await p2.evaluate(() => {
  localStorage.setItem("agenda:tasks", JSON.stringify([{ id:"t-notte", area:"private", subjectId:null, subjectName:null,
    kind:"todo", title:"Fatto a tarda sera", due:null, weight:1, createdAt:"2026-09-21", doneAt:"2026-09-21",
    droppedAt:null, plan:{skip:[],pick:{}}, parts:[] }]));
});
await p2.reload(); await p2.clock.runFor(500);
check("alle 23:59:50 la cosa fatta è ancora lì", await p2.locator("#list .ag-task--done").count() === 1);
await p2.clock.runFor(20000);
check("a mezzanotte se ne va da sola", await p2.locator("#list .ag-task").count() === 0);
await ctx2.close();

console.log("\n== errori raccolti ==");
console.log(errors.length ? errors.join("\n") : "nessuno");
console.log(`\n${ko === 0 ? "TUTTI I CONTROLLI PASSATI" : ko + " CONTROLLI FALLITI"}`);
await browser.close();
process.exit(ko || errors.length ? 1 : 0);
