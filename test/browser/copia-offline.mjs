import { chromium, devices } from "playwright";
import { readFileSync } from "node:fs";
const CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const browser = await chromium.launch({ executablePath: CHROME });
const ctx = await browser.newContext({
  ...devices["iPhone 15"], hasTouch: true, isMobile: true,
  locale: "it-IT", timezoneId: "Europe/Rome", acceptDownloads: true,
});
// Le prove sono scritte per lunedì 21 settembre 2026, alle dieci: l'orologio
// del browser si ferma lì. Si ferma solo la data: i timer (gli avvisi, le
// animazioni) continuano a scorrere.
await ctx.clock.setFixedTime(new Date("2026-09-21T10:00:00+02:00"));
const page = await ctx.newPage();
const errors = [];
page.on("console", m => { if (m.type() === "error") errors.push("console: " + m.text()); });
page.on("pageerror", e => errors.push("pageerror: " + e.message));
const txt = async s => ((await page.locator(s).first().textContent()) || "").trim().replace(/\s+/g," ");
let ko = 0;
const check = (l, ok, x="") => { if(!ok) ko++; console.log(`  ${ok?"ok  ":"KO  "} ${l}${x?" — "+x:""}`); };
const voti = () => page.evaluate(() => (JSON.parse(localStorage.getItem("agenda:grades")) || { items: [] }).items);
// un avviso dura due secondi e mezzo (A77): prima di leggerne uno nuovo si
// aspetta che i vecchi se ne siano andati
const senzaAvvisi = () => page.waitForFunction(() => document.querySelectorAll(".ag-toast").length === 0, null, { timeout: 8000 });

await page.goto("http://localhost:8099/index.html", { waitUntil: "networkidle" });
await page.evaluate(() => {
  const subjects = [{id:"s-ingl",name:"Inglese",short:"INGL",color:"petrolio"},
                    {id:"s-stor",name:"Storia",short:"STOR",color:"prugna"}];
  localStorage.setItem("agenda:settings", JSON.stringify({version:1,lang:null,theme:null,subjects,areas:[],lessonsPerDay:6,schoolDays:[1,2,3,4,5,6]}));
  localStorage.setItem("agenda:timetables", JSON.stringify([{weekStart:"2026-09-21",
    grid:{"1":["s-ingl",null,null,null,null,null],"2":[null,null,null,null,null,null],"3":[null,null,null,null,null,null],
          "4":["s-ingl",null,null,null,null,null],"5":[null,null,null,null,null,null],"6":[null,null,null,null,null,null]}}]));
  localStorage.setItem("agenda:grades", JSON.stringify({ items: [
    { id:"g-ingl", subjectId:"s-ingl", subjectName:"Inglese", value:7.5, date:"2026-09-18", lab:false }] }));
  // i dati delle funzioni tolte (A73): devono fare il giro della copia anche loro
  localStorage.setItem("agenda:tasks", JSON.stringify([{ id:"t-vecchio", area:"school", subjectId:null, subjectName:null,
    kind:"homework", lab:false, title:"Un compito di prima", due:"2026-09-30", weight:2, createdAt:"2026-09-10",
    doneAt:null, droppedAt:null, plan:{skip:[],pick:{}}, parts:[] }]));
  localStorage.setItem("agenda:shopping", JSON.stringify({ items: [{ id:"c-prova", name:"cosa da comprare", addedAt:"2026-09-21", boughtAt:null }] }));
});
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(400);

console.log("== il promemoria della copia, una volta al mese (A74) ==");
check("con un orario e un voto recenti e nessuna copia, niente promemoria", await page.locator("#backup-alert").isHidden());
await page.evaluate(() => {
  const list = JSON.parse(localStorage.getItem("agenda:grades")).items;
  list.push({ id:"g-agosto", subjectId:"s-stor", subjectName:"Storia", value:6, date:"2026-08-10", lab:false });
  localStorage.setItem("agenda:grades", JSON.stringify({ items: list }));
});
await page.reload({ waitUntil: "networkidle" }); await page.waitForTimeout(300);
check("con un voto di più di 30 giorni e nessuna copia, compare", !(await page.locator("#backup-alert").isHidden()));
check("e dice cosa si perderebbe", (await txt("#backup-alert-note")).includes("orario e voti"), await txt("#backup-alert-note"));
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
await page.click("#open-settings"); await page.waitForTimeout(500);
await page.click('[data-page="data"]'); await page.waitForTimeout(300);
const dl = page.waitForEvent("download", { timeout: 15000 }).catch(() => null);
await page.click("#data-download");
const file = await dl;
check("il file esce dall'app", Boolean(file), file ? await file.suggestedFilename() : "nessun download");
let percorso = null;
if (file) { percorso = "/tmp/copia.json"; await file.saveAs(percorso); }
const testo = percorso ? readFileSync(percorso, "utf8") : "";
// la data dell'ultima copia dice qualcosa di questo telefono: nel file non va (A20)
check("il file non si porta dietro la data dell'ultima copia", percorso && !testo.includes("lastSavedOn"));
check("porta i voti", testo.includes("g-ingl") && testo.includes("g-agosto"));
check("e anche i compiti e la spesa di prima (A73)", testo.includes("t-vecchio") && testo.includes("cosa da comprare"));
// ora distruggo tutto e ripristino
await page.evaluate(() => { for (const k of ["agenda:tasks", "agenda:shopping", "agenda:grades"]) localStorage.removeItem(k); });
// un voto NUOVO, che il file non conosce: il ripristino non deve toccarlo
await page.evaluate(() => localStorage.setItem("agenda:grades", JSON.stringify({ items: [
  { id:"g-nuovo", subjectId:"s-ingl", subjectName:"Inglese", value:9, date:"2026-09-21", lab:false }] })));
await page.reload({ waitUntil: "networkidle" }); await page.waitForTimeout(400);
await page.click("#open-settings"); await page.waitForTimeout(500);
await senzaAvvisi();
await page.setInputFiles("#restore-file", percorso); await page.waitForTimeout(600);
console.log("   avviso:", await txt(".ag-toast__text"));
check("l'avviso dice quanti voti sono tornati", (await txt(".ag-toast__text")) === "Copia rimessa dentro: 2 voti", await txt(".ag-toast__text"));
const dopo = (await voti()).map((g) => g.id).sort();
check("i voti del file sono tornati", dopo.includes("g-ingl") && dopo.includes("g-agosto"), dopo.join("/"));
check("il voto nato DOPO la copia è ancora lì", dopo.includes("g-nuovo"));
check("e sono tornati anche compiti e spesa", await page.evaluate(() =>
  JSON.parse(localStorage.getItem("agenda:tasks")).some((x) => x.id === "t-vecchio")
  && JSON.parse(localStorage.getItem("agenda:shopping")).items.some((x) => x.id === "c-prova")));
await page.click('[data-close="settings-layer"]'); await page.waitForTimeout(400);
await page.click("#open-grades"); await page.waitForTimeout(500);
check("e i voti si vedono", (await txt('[data-gr-subject="s-ingl"] .ag-grades__avg')) === "8,25", await txt('[data-gr-subject="s-ingl"] .ag-grades__avg'));
await page.click('[data-close="grades-layer"]'); await page.waitForTimeout(400);
await page.screenshot({ path: "/tmp/shots/14-ripristino.png" });

console.log("\n== un file che non è una copia dell'Agenda ==");
await page.click("#open-settings"); await page.waitForTimeout(500);
await senzaAvvisi();
const quantiPrima = (await voti()).length;
await page.evaluate(() => {
  const dt = new DataTransfer();
  dt.items.add(new File(['{"qualcosa":"altro"}'], "finto.json", { type: "application/json" }));
  const input = document.getElementById("restore-file");
  input.files = dt.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
});
await page.waitForTimeout(500);
check("l'app lo rifiuta e lo dice", (await txt(".ag-toast__text")).includes("non è una copia"), await txt(".ag-toast__text"));
check("e non ha toccato i dati", (await voti()).length === quantiPrima);
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
check("i file dell'app sono in cache", inCache.quanti >= 25, String(inCache.quanti));

await ctx.setOffline(true);
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(1200);
check("l'app si apre in aereo", (await page.locator("#today-title").count()) === 1 && (await txt("#today-title")).length > 5, await txt("#today-title"));
check("e l'orario c'è ancora", (await page.locator("#timetable-body .ag-tt__cell").count()) > 0);
await page.screenshot({ path: "/tmp/shots/15-offline.png" });
await ctx.setOffline(false);

console.log("\n== errori ==");
const veri = errors.filter(e => !/favicon|Failed to load resource/.test(e));
console.log(veri.length ? veri.join("\n") : "nessuno");
console.log(`\n${ko === 0 ? "TUTTI I CONTROLLI PASSATI" : ko + " CONTROLLI FALLITI"}`);
await browser.close();
process.exit(ko ? 1 : 0);
