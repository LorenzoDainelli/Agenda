import { chromium, devices } from "playwright";
const CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const browser = await chromium.launch({ executablePath: CHROME });
const ctx = await browser.newContext({
  ...devices["iPhone 15"], hasTouch: true, isMobile: true,
  locale: "it-IT", timezoneId: "Europe/Rome",
});
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
check("e dice COSA resta, non quante parti", meta.includes("restano: frasi da tradurre"), meta);

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

console.log("\n== spuntare, con annulla ==");
const prima = await page.locator("#list .ag-task").count();
await page.locator("#list [data-check]").first().click(); await page.waitForTimeout(250);
check("compare il toast con l'annulla", await page.locator(".ag-toast__undo").count() === 1);
await page.locator(".ag-toast__undo").click(); await page.waitForTimeout(300);
check("annullando il compito torna", await page.locator("#list .ag-task").count() === prima, `${prima} → ${await page.locator("#list .ag-task").count()}`);

console.log("\n== calendario ==");
await page.click("#open-calendar"); await page.waitForTimeout(350);
check("la griglia ha sette intestazioni di giorno", await page.locator(".ag-wgrid__head").count() === 7);
check("i momenti della giornata sono righe", (await all(".ag-wgrid__slot")).length >= 3, (await all(".ag-wgrid__slot")).join("/"));
console.log("   blocchi nella griglia:", (await all(".ag-wblock")).join(" "));
check("il giorno scelto ha il suo dettaglio sotto", await page.locator(".ag-wday-detail__title").count() === 1,
      await txt(".ag-wday-detail__title"));
await page.locator('.ag-wgrid__head[data-pick-day="2026-09-22"]').click(); await page.waitForTimeout(300);
check("toccando un'intestazione cambia il giorno del dettaglio",
      (await txt(".ag-wday-detail__title")).includes("22"), await txt(".ag-wday-detail__title"));
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
await page.locator('#lang-seg [data-lang="en"]').click(); await page.waitForTimeout(300);
check("l'interfaccia passa all'inglese", (await txt('[data-i18n="settings.title"]')) === "Settings", await txt('[data-i18n="settings.title"]'));
await page.locator('#lang-seg [data-lang="it"]').click(); await page.waitForTimeout(250);
await page.locator('[data-theme=""]').click(); await page.waitForTimeout(250);
await page.click('[data-close="settings-layer"]');

console.log("\n== errori raccolti ==");
console.log(errors.length ? errors.join("\n") : "nessuno");
console.log(`\n${ko === 0 ? "TUTTI I CONTROLLI PASSATI" : ko + " CONTROLLI FALLITI"}`);
await browser.close();
process.exit(ko || errors.length ? 1 : 0);
