/* Verifica dei contrasti sulla pagina renderizzata, non sui numeri dei token.
 *
 * Guida l'app nei due temi e su sei schermate, e su ognuna passa il
 * controllo di audit.mjs. Quello che trova qui e non nei token è la differenza
 * fra un numero scritto in un commento e un pixel disegnato davvero.
 */
import { chromium, devices } from "playwright";
import { AUDIT } from "./audit.mjs";
const CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const browser = await chromium.launch({ executablePath: CHROME });
const ctx = await browser.newContext({ ...devices["iPhone 15"], hasTouch: true, isMobile: true, locale: "it-IT", timezoneId: "Europe/Rome" });
// Le prove sono scritte per lunedì 21 settembre 2026, alle dieci: l'orologio
// del browser si ferma lì. Senza, dal giorno dopo le date dei dati finti
// scivolano nel passato, parte la rassegna degli arretrati e la prova fallisce
// per colpa del calendario, non dell'app. Si ferma solo la data: i timer
// (i toast, le animazioni) continuano a scorrere.
await ctx.clock.setFixedTime(new Date("2026-09-21T10:00:00+02:00"));
const page = await ctx.newPage();

const scenari = [
  ["elenco", async () => {}],
  ["calendario settimana", async () => { await page.click("#open-calendar"); await page.waitForTimeout(400); }],
  ["calendario mese", async () => { await page.locator('#cal-mode [data-mode="month"]').click(); await page.waitForTimeout(400); }],
  ["impostazioni", async () => { await page.click('[data-close="calendar-layer"]'); await page.click("#open-settings"); await page.waitForTimeout(400); }],
  // il compito con le parti, così si misurano anche i chip «quando»
  ["pannello compito", async () => { await page.click('[data-close="settings-layer"]'); await page.locator("#list .ag-task__main", { hasText: "Compito con parti" }).click(); await page.waitForTimeout(400); }],
  ["archivio", async () => { await page.click('[data-close="task-layer"]'); await page.click("#open-archive"); await page.waitForTimeout(400); }],
];

let totali = 0, placeholderVisti = 0, falliti = [];
for (const tema of ["light", "dark"]) {
  await page.goto("http://localhost:8099/index.html", { waitUntil: "networkidle" });
  await page.evaluate((tema) => {
    const subjects = ["petrolio","oltremare","muschio","oliva-2","mattone","mattone-2","oliva","prugna-2","prugna","oltremare-2","petrolio-2"]
      .map((c,i) => ({ id:"s-"+c, name:"Materia "+c, short:c.slice(0,4).toUpperCase(), color:c }));
    localStorage.setItem("agenda:settings", JSON.stringify({version:1,lang:"it",theme:tema,subjects,areas:[{id:"a-1",name:"Palestra",color:"oliva-2"}],lessonsPerDay:6,schoolDays:[1,2,3,4,5,6]}));
    const base = o => ({ id:"t-"+Math.random().toString(36).slice(2,8), area:"school", subjectId:null, subjectName:null,
      kind:"homework", title:"x", due:null, weight:1, createdAt:"2026-09-21", doneAt:null, droppedAt:null,
      plan:{skip:[],pick:{}}, parts:[], ...o });
    localStorage.setItem("agenda:tasks", JSON.stringify([
      base({title:"Verifica di storia", kind:"test", subjectId:"s-violet", subjectName:"Materia violet", due:"2026-09-25", weight:3, plan:{skip:[],pick:{"2026-09-22":"evening","2026-09-23":"afternoon"}}}),
      base({title:"Compito in ritardo", subjectId:"s-sky", subjectName:"Materia sky", due:"2026-09-18", weight:2}),
      base({title:"Compito con parti", subjectId:"s-amber", subjectName:"Materia amber", due:"2026-09-24", weight:3,
            parts:[{id:"p1",title:"cinque frasi",total:5,done:2,pick:{"2026-09-22":"morning"}},{id:"p2",title:"due esercizi",total:2,done:0,pick:{}}],
            plan:{skip:[],pick:{"2026-09-22":"morning","2026-09-23":"evening"}}}),
      base({title:"Giornata pesante", subjectId:"s-rose", subjectName:"Materia rose", due:"2026-09-26", weight:3, plan:{skip:[],pick:{"2026-09-22":"afternoon"}}}),
      base({title:"Cosa privata", area:"private", kind:"todo"}),
      // fatte oggi: restano nell'elenco barrate, ed è il caso che prima non si
      // guardava perché sparivano subito
      base({title:"Fatto stamattina", subjectId:"s-petrolio", subjectName:"Materia petrolio", due:"2026-09-23", weight:2,
            doneAt:"2026-09-21", parts:[{id:"p3",title:"scheda",total:1,done:1,pick:{}},{id:"p4",title:"otto righe",total:8,done:8,pick:{}}],
            plan:{skip:[],pick:{"2026-09-21":"afternoon"}}}),
      base({title:"Verifica ripassata", kind:"test", subjectId:"s-prugna", subjectName:"Materia prugna", due:"2026-09-21", weight:2,
            doneAt:"2026-09-21"}),
      // nell'archivio: una fatta e una lasciata cadere
      base({title:"Fatto la settimana scorsa", subjectId:"s-muschio", subjectName:"Materia muschio", due:"2026-09-16", doneAt:"2026-09-15"}),
      base({title:"Lasciato cadere", due:"2026-09-17", droppedAt:"2026-09-17"}),
    ]));
    localStorage.setItem("agenda:timetables", JSON.stringify([{weekStart:"2026-09-21",
      grid:{"1":["s-sky","s-sky","s-amber",null,null,null],"2":["s-violet",null,null,null,null,null],
            "3":["s-green",null,null,null,null,null],"4":["s-amber","s-sky",null,null,null,null],
            "5":["s-rose",null,null,null,null,null],"6":[null,null,null,null,null,null]}}]));
    localStorage.setItem("agenda:review", JSON.stringify({lastReviewedOn:"2026-09-21"}));
  }, tema);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  for (const [nome, azione] of scenari) {
    await azione();
    const res = await page.evaluate(AUDIT);
    const nPh = res.filter((r) => r.cls.includes("::placeholder")).length;
    totali += res.length;
    if (nPh) placeholderVisti += nPh;
    const ko = res.filter(r => !r.passa);
    console.log(`${tema.padEnd(5)} · ${nome.padEnd(22)} ${res.length.toString().padStart(3)} elementi, ${ko.length ? ko.length + " SOTTO SOGLIA" : "tutti a norma"}`);
    for (const r of ko) falliti.push({ tema, scenario: nome, ...r });
  }
}

console.log(`\n${totali} elementi di testo esaminati nei due temi, di cui ${placeholderVisti} segnaposto.`);
if (placeholderVisti === 0) console.log("ATTENZIONE: nessun segnaposto esaminato — il controllo non sta guardando niente.");
if (falliti.length === 0) {
  console.log("Nessun testo sotto la soglia WCAG AA che gli spetta.");
} else {
  console.log(`${falliti.length} sotto soglia:\n`);
  const visti = new Set();
  for (const f of falliti) {
    const key = f.tema + f.cls + f.rapporto;
    if (visti.has(key)) continue;
    visti.add(key);
    console.log(`  [${f.tema}] ${f.rapporto}:1 (serve ${f.soglia}) ${f.px}px  .${f.cls}\n      «${f.testo}»  in ${f.scenario}`);
  }
}
await browser.close();
