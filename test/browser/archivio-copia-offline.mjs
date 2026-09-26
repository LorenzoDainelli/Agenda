import { chromium, devices } from "playwright";
import { readFileSync } from "node:fs";
const CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const browser = await chromium.launch({ executablePath: CHROME });
const ctx = await browser.newContext({
  ...devices["iPhone 15"], hasTouch: true, isMobile: true,
  locale: "it-IT", timezoneId: "Europe/Rome", acceptDownloads: true,
});
// Le prove sono scritte per lunedì 21 settembre 2026, alle dieci: l'orologio
// del browser si ferma lì. Senza, dal giorno dopo le date dei dati finti
// scivolano nel passato, parte la rassegna degli arretrati e la prova fallisce
// per colpa del calendario, non dell'app. Si ferma solo la data: i timer
// (i toast, le animazioni) continuano a scorrere.
await ctx.clock.setFixedTime(new Date("2026-09-21T10:00:00+02:00"));
const page = await ctx.newPage();
const errors = [];
page.on("console", m => { if (m.type() === "error") errors.push("console: " + m.text()); });
page.on("pageerror", e => errors.push("pageerror: " + e.message));
const txt = async s => ((await page.locator(s).first().textContent()) || "").trim().replace(/\s+/g," ");
const all = async s => (await page.locator(s).allTextContents()).map(v=>v.trim().replace(/\s+/g," ")).filter(Boolean);
let ko = 0;
const check = (l, ok, x="") => { if(!ok) ko++; console.log(`  ${ok?"ok  ":"KO  "} ${l}${x?" — "+x:""}`); };

await page.goto("http://localhost:8099/index.html", { waitUntil: "networkidle" });
await page.evaluate(() => {
  const subjects = [{id:"s-ingl",name:"Inglese",short:"INGL",color:"petrolio"},
                    {id:"s-stor",name:"Storia",short:"STOR",color:"prugna"}];
  localStorage.setItem("agenda:settings", JSON.stringify({version:1,lang:null,theme:null,subjects,areas:[],lessonsPerDay:6,schoolDays:[1,2,3,4,5,6]}));
  const base = o => ({ id:"t-"+Math.random().toString(36).slice(2,8), area:"school", subjectId:null, subjectName:null,
    kind:"homework", title:"x", due:null, weight:1, createdAt:"2026-09-21", doneAt:null, droppedAt:null,
    plan:{skip:[],pick:{}}, parts:[], ...o });
  localStorage.setItem("agenda:tasks", JSON.stringify([
    base({title:"Da fare adesso", subjectId:"s-ingl", subjectName:"Inglese", due:"2026-09-24"}),
    // fatto IERI: una cosa fatta oggi resta nell'elenco fino a mezzanotte e
    // nell'archivio non c'è ancora (§6.3)
    base({title:"Già fatto", subjectId:"s-stor", subjectName:"Storia", due:"2026-09-22", doneAt:"2026-09-20"}),
    base({title:"Lasciato cadere", due:"2026-09-22", droppedAt:"2026-09-21"}),
    base({title:"Fatto in agosto", due:"2026-08-20", doneAt:"2026-08-21"}),
  ]));
  localStorage.setItem("agenda:timetables", JSON.stringify([{weekStart:"2026-09-21",
    grid:{"1":["s-ingl",null,null,null,null,null],"2":[null,null,null,null,null,null],"3":[null,null,null,null,null,null],
          "4":["s-ingl",null,null,null,null,null],"5":[null,null,null,null,null,null],"6":[null,null,null,null,null,null]}}]));
  localStorage.setItem("agenda:review", JSON.stringify({lastReviewedOn:"2026-09-21"}));
});
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(400);

console.log("== archivio ==");
await page.click("#open-archive"); await page.waitForTimeout(350);
console.log("   mesi:", (await all("#archive-body .ag-section__title")).join(" · "));
check("due mesi, il più recente prima", (await all("#archive-body .ag-section__title")).join("|") === "settembre 2026|agosto 2026",
      (await all("#archive-body .ag-section__title")).join("|"));
check("tre cose chiuse in archivio", await page.locator("#archive-body .ag-task").count() === 3, String(await page.locator("#archive-body .ag-task").count()));
check("il lasciato cadere è marcato", (await all("#archive-body .ag-task__flag")).some(t=>/cadere/i.test(t)), (await all("#archive-body .ag-task__flag")).join("/"));
check("l'aperto NON è in archivio", !(await all("#archive-body .ag-task__title")).includes("Da fare adesso"));
await page.screenshot({ path: "/tmp/shots/13-archivio.png" });
const rimesso = await txt("#archive-body .ag-task__title");
await page.locator("#archive-body [data-restore]").first().click(); await page.waitForTimeout(350);
check("rimettere da fare lo toglie dall'archivio", await page.locator("#archive-body .ag-task").count() === 2, String(await page.locator("#archive-body .ag-task").count()));
await page.click('[data-close="archive-layer"]'); await page.waitForTimeout(250);
check("ed è tornato nell'elenco", (await all("#list .ag-task__title")).includes(rimesso), `${rimesso} in ${(await all("#list .ag-task__title")).join("/")}`);

console.log("\n== il promemoria della copia, una volta al mese ==");
check("con compiti di oggi e nessuna copia, niente promemoria", await page.locator("#backup-alert").isHidden());
await page.evaluate(() => {
  const tasks = JSON.parse(localStorage.getItem("agenda:tasks"));
  tasks.push({ id:"t-vecchio", area:"private", subjectId:null, subjectName:null, kind:"todo", title:"Cosa di agosto",
    due:null, weight:1, createdAt:"2026-08-10", doneAt:null, droppedAt:null, plan:{skip:[],pick:{}}, parts:[] });
  localStorage.setItem("agenda:tasks", JSON.stringify(tasks));
});
await page.reload({ waitUntil: "networkidle" }); await page.waitForTimeout(300);
check("con un compito di più di 30 giorni e nessuna copia, compare", !(await page.locator("#backup-alert").isHidden()));
check("e dice che non ne è mai stata fatta una", (await txt("#backup-alert-note")).includes("Non ne hai ancora fatta una"), await txt("#backup-alert-note"));
await page.click("#backup-later"); await page.waitForTimeout(250);
check("«Più tardi» lo fa sparire", await page.locator("#backup-alert").isHidden());
check("per una settimana", (await page.evaluate(() => JSON.parse(localStorage.getItem("agenda:backup")).snoozedUntil)) === "2026-09-28");
await page.evaluate(() => localStorage.removeItem("agenda:backup"));
await page.reload({ waitUntil: "networkidle" }); await page.waitForTimeout(300);
const dl0 = page.waitForEvent("download", { timeout: 15000 }).catch(() => null);
await page.click("#backup-save");
check("«Scarica» fa uscire il file", Boolean(await dl0));
await page.waitForTimeout(300);
check("e il promemoria sparisce", await page.locator("#backup-alert").isHidden());
check("si ricomincia a contare da oggi", (await page.evaluate(() => JSON.parse(localStorage.getItem("agenda:backup")).lastSavedOn)) === "2026-09-21");

console.log("\n== copia di sicurezza: giro completo ==");
await page.click("#open-settings"); await page.waitForTimeout(300);
await page.click('[data-page="data"]'); await page.waitForTimeout(200);
const dl = page.waitForEvent("download", { timeout: 15000 }).catch(() => null);
await page.click("#data-download");
const file = await dl;
check("il file esce dall'app", Boolean(file), file ? await file.suggestedFilename() : "nessun download");
let percorso = null;
if (file) { percorso = "/tmp/copia.json"; await file.saveAs(percorso); }
// la data dell'ultima copia dice qualcosa di questo telefono: nel file non va (A20)
check("il file non si porta dietro la data dell'ultima copia", percorso && !readFileSync(percorso, "utf8").includes("lastSavedOn"));
// ora distruggo tutto e ripristino
await page.evaluate(() => { localStorage.removeItem("agenda:tasks"); });
await page.reload({ waitUntil: "networkidle" }); await page.waitForTimeout(400);
check("dopo aver cancellato, l'elenco è vuoto", await page.locator(".ag-empty").count() === 1);
// aggiungo un compito NUOVO, che il file non conosce: il ripristino non deve toccarlo
await page.click("#add"); await page.waitForTimeout(250);
await page.fill("#task-title", "Nato dopo la copia");
await page.click("#task-save"); await page.waitForTimeout(300);
await page.click("#open-settings"); await page.waitForTimeout(250);
await page.setInputFiles("#restore-file", percorso); await page.waitForTimeout(600);
console.log("   toast:", await txt(".ag-toast__text"));
await page.click('[data-close="settings-layer"]'); await page.waitForTimeout(300);
const titoli = await all("#list .ag-task__title");
console.log("   elenco dopo il ripristino:", titoli.join(" · "));
check("i compiti del file sono tornati", titoli.includes("Da fare adesso"));
check("il compito nato DOPO la copia è ancora lì", titoli.includes("Nato dopo la copia"));
await page.screenshot({ path: "/tmp/shots/14-ripristino.png" });

console.log("\n== un file che non è una copia dell'Agenda ==");
await page.click("#open-settings"); await page.waitForTimeout(250);
// i toast precedenti vanno via da soli dopo cinque secondi: se restano, il
// controllo qui sotto leggerebbe quello vecchio
await page.waitForFunction(() => document.querySelectorAll(".ag-toast").length === 0, null, { timeout: 8000 });
const quantiPrima = await page.evaluate(() => JSON.parse(localStorage.getItem("agenda:tasks")).length);
await page.evaluate(() => {
  const dt = new DataTransfer();
  dt.items.add(new File(['{"qualcosa":"altro"}'], "finto.json", { type: "application/json" }));
  const input = document.getElementById("restore-file");
  input.files = dt.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
});
await page.waitForTimeout(500);
check("l'app lo rifiuta e lo dice", (await txt(".ag-toast__text")).includes("non è una copia"), await txt(".ag-toast__text"));
// confrontato con prima, non con un numero scritto a mano: il numero cambia
// ogni volta che una prova qui sopra aggiunge un compito
check("e non ha toccato i dati", (await page.evaluate(() => JSON.parse(localStorage.getItem("agenda:tasks")).length)) === quantiPrima,
      `${quantiPrima} → ${await page.evaluate(() => JSON.parse(localStorage.getItem("agenda:tasks")).length)}`);
await page.click('[data-close="settings-layer"]');

console.log("\n== avvio offline (service worker) ==");
await page.waitForTimeout(1500); // il service worker deve finire di mettere in cache
const sw = await page.evaluate(async () => {
  const reg = await navigator.serviceWorker.getRegistration();
  return { registrato: Boolean(reg), attivo: Boolean(reg?.active), stato: reg?.active?.state ?? null };
});
console.log("   service worker:", JSON.stringify(sw));
check("il service worker è attivo", sw.attivo, sw.stato);
const inCache = await page.evaluate(async () => {
  const names = await caches.keys();
  const cache = await caches.open(names[0]);
  const keys = await cache.keys();
  return { cache: names[0], quanti: keys.length };
});
console.log("   in cache:", JSON.stringify(inCache));
check("i file dell'app sono in cache", inCache.quanti >= 26, String(inCache.quanti));

await ctx.setOffline(true);
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(1200);
check("l'app si apre in aereo", (await page.locator("#today-title").count()) === 1 && (await txt("#today-title")).length > 5, await txt("#today-title"));
check("e i dati ci sono ancora", (await all("#list .ag-task__title")).length > 0, (await all("#list .ag-task__title")).join("/"));
await page.screenshot({ path: "/tmp/shots/15-offline.png" });
await ctx.setOffline(false);

console.log("\n== errori ==");
const veri = errors.filter(e => !/favicon|Failed to load resource/.test(e));
console.log(veri.length ? veri.join("\n") : "nessuno");
console.log(`\n${ko === 0 ? "TUTTI I CONTROLLI PASSATI" : ko + " CONTROLLI FALLITI"}`);
await browser.close();
process.exit(ko ? 1 : 0);
