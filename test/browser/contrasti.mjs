/* Verifica dei contrasti sulla pagina renderizzata, non sui numeri dei token.
 *
 * Guida l'app nei due temi e su quindici schermate, e su ognuna passa il
 * controllo di audit.mjs. Quello che trova qui e non nei token è la differenza
 * fra un numero scritto in un commento e un pixel disegnato davvero.
 */
import { chromium, devices } from "playwright";
import { AUDIT } from "./audit.mjs";
const CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const browser = await chromium.launch({ executablePath: CHROME });
const ctx = await browser.newContext({ ...devices["iPhone 15"], hasTouch: true, isMobile: true, locale: "it-IT", timezoneId: "Europe/Rome" });
// Le prove sono scritte per lunedì 21 settembre 2026, alle dieci: l'orologio
// del browser si ferma lì. Si ferma solo la data: i timer (gli avvisi, le
// animazioni) continuano a scorrere.
await ctx.clock.setFixedTime(new Date("2026-09-21T10:00:00+02:00"));
const page = await ctx.newPage();

// Si aspetta che un foglio o un livello sia fermo: salgono con la molla
// (A76), e a metà strada una parte del testo starebbe ancora sul fondo sotto.
const fermo = () => page.waitForTimeout(600);

const scenari = [
  // la schermata principale è l'orario (A72), con il promemoria della copia
  ["orario", async () => {}],
  ["orario, una casella", async () => { await page.locator('#timetable-body [data-cell^="1:0:"]').click(); await fermo(); }],
  ["orario, ore per giorno", async () => { await page.keyboard.press("Escape"); await page.waitForTimeout(400);
    await page.click("#tt-days"); await fermo(); }],
  ["impostazioni", async () => { await page.keyboard.press("Escape"); await page.waitForTimeout(400); await page.click("#open-settings"); await fermo(); }],
  // le pagine delle impostazioni: le righe in un riquadro solo e i segmenti
  ["impostazioni materie", async () => { await page.click('[data-page="subjects"]'); await fermo(); }],
  // la tabella dei colori (A57–A59), col campione acceso su una casella del
  // fondo, la più chiara; salvando, da qui in poi una materia ha un colore
  // della tabella e si misura anche quello
  ["materia, tabella colori", async () => { await page.click('#settings-body [data-subject="s-petrolio"]'); await fermo();
    await page.locator('#sheet [data-color="t-9-9"]').click(); await page.waitForTimeout(200); }],
  ["impostazioni, dopo", async () => { await page.click('#sheet [data-act="save"]'); await fermo(); }],
  ["impostazioni aspetto", async () => { await page.click("#settings-back"); await page.click('[data-page="look"]'); await fermo(); }],
  ["impostazioni orario", async () => { await page.click("#settings-back"); await page.click('[data-page="timetable"]'); await fermo(); }],
  ["impostazioni dati", async () => { await page.click("#settings-back"); await page.click('[data-page="data"]'); await fermo(); }],
  // i voti, con una materia aperta: medie sopra e sotto il 6, teoria e laboratorio
  ["voti", async () => { await page.click('[data-close="settings-layer"]'); await page.waitForTimeout(300);
    await page.click("#open-grades"); await fermo();
    await page.click('[data-gr-subject="s-mattone"]'); await fermo(); }],
  ["voti, inserire", async () => { await page.click("#gr-add"); await fermo();
    await page.locator('#sheet-body [data-f-subject="s-mattone"]').click(); await page.waitForTimeout(200);
    await page.locator('#sheet-body [data-f-value="5.5"]').click(); await fermo(); }],
  ["voti, il giorno", async () => { await page.locator("#sheet-body [data-f-date]").click(); await fermo(); }],
  // l'avviso a pillola (A77), sopra l'orario
  ["avviso", async () => { await page.keyboard.press("Escape"); await page.waitForTimeout(400);
    await page.click('[data-close="grades-layer"]'); await page.waitForTimeout(400);
    await page.evaluate(async () => (await import("./js/ui.js")).toast("Voto salvato")); await fermo(); }],
  // l'orario definitivo, che si guarda e basta
  ["orario definitivo", async () => { await page.click("#tt-final"); await fermo();
    await page.click('#sheet [data-act="yes"]'); await fermo(); }],
];

let totali = 0, placeholderVisti = 0, falliti = [];
for (const tema of ["light", "dark"]) {
  await page.goto("http://localhost:8099/index.html", { waitUntil: "networkidle" });
  await page.evaluate((tema) => {
    const subjects = ["petrolio","oltremare","muschio","oliva-2","mattone","mattone-2","oliva","prugna-2","prugna","oltremare-2","petrolio-2"]
      .map((c,i) => ({ id:"s-"+c, name:"Materia "+c, short:c.slice(0,4).toUpperCase(), color:c, lab: c === "mattone" }));
    localStorage.setItem("agenda:settings", JSON.stringify({version:1,lang:"it",theme:tema,subjects,areas:[],lessonsPerDay:6,schoolDays:[1,2,3,4,5,6]}));
    // due orari: il primo di agosto, così senza nessuna copia scaricata
    // compare il promemoria (A74)
    const grid = {"1":["s-petrolio","s-petrolio","s-oliva","s-mattone@lab","s-mattone@lab",null],"2":["s-prugna",null,null,null,null,null],
            "3":["s-muschio",null,null,null,null,null],"4":["s-oliva","s-petrolio","s-prugna","@break","s-mattone","s-oltremare","s-muschio","s-muschio"],
            "5":["s-prugna-2",null,null,null,null,null],"6":[null,null,null,null,null,null]};
    localStorage.setItem("agenda:timetables", JSON.stringify([{weekStart:"2026-09-21", grid}, {weekStart:"2026-08-17", grid}]));
    localStorage.setItem("agenda:grades", JSON.stringify({ items: [
      { id:"g-1", subjectId:"s-mattone", subjectName:"Materia mattone", value:5.5, date:"2026-09-15", lab:true },
      { id:"g-2", subjectId:"s-mattone", subjectName:"Materia mattone", value:7, date:"2026-09-18", lab:false },
      { id:"g-3", subjectId:"s-prugna", subjectName:"Materia prugna", value:4, date:"2026-09-19", lab:false } ] }));
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
