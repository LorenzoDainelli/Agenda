/* Cattura il markup vero di due schermate dell'app, per il confronto delle
 * palette.
 *
 * Perché catturarlo invece di scrivere a mano una finta schermata: una palette
 * si giudica su quello che si guarderà davvero, e una finta fatta a mano
 * mostrerebbe le proporzioni che immagina chi la scrive. Qui le righe, i
 * chip, la griglia e i gradini del peso sono esattamente quelli dell'app.
 *
 * Serve Playwright, che non è una dipendenza del progetto (vedi LEGGIMI.md).
 *   node test/browser/cattura-schermate.mjs /percorso/markup.json
 */
import { chromium, devices } from "playwright";
import { writeFileSync } from "node:fs";

const USCITA = process.argv[2];
if (!USCITA) { console.error("uso: node cattura-schermate.mjs <markup.json>"); process.exit(2); }

const CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const browser = await chromium.launch({ executablePath: CHROME });
const ctx = await browser.newContext({
  ...devices["iPhone 15"], hasTouch: true, isMobile: true,
  locale: "it-IT", timezoneId: "Europe/Rome",
});
// Le prove sono scritte per lunedì 21 settembre 2026, alle dieci: l'orologio
// del browser si ferma lì, così la settimana dell'orario è sempre quella.
await ctx.clock.setFixedTime(new Date("2026-09-21T10:00:00+02:00"));
const page = await ctx.newPage();
await page.goto("http://localhost:8099/index.html", { waitUntil: "networkidle" });

// Dati inventati, come negli altri driver: nel repo non entra mai un dato
// vero (regola 1 di CLAUDE.md). Servono solo a far comparire tutti gli stati
// che una palette deve reggere: tutte le materie nell'orario, voti sopra e
// sotto il 6, teoria e laboratorio.
await page.evaluate(() => {
  const S = (n, short, color) => ({ id: "s-" + short.toLowerCase(), name: n, short, color });
  localStorage.setItem("agenda:settings", JSON.stringify({
    version: 1, lang: null, theme: null, areas: [], lessonsPerDay: 6, schoolDays: [1, 2, 3, 4, 5, 6],
    subjects: [S("Inglese", "INGL", "petrolio"), S("Matematica", "MATE", "mattone"),
               S("Storia", "STOR", "prugna"), S("Scienze", "SCIE", "muschio"),
               S("Italiano", "ITAL", "oliva"), S("Geografia", "GEOG", "oltremare")],
  }));
  localStorage.setItem("agenda:timetables", JSON.stringify([{
    weekStart: "2026-09-21",
    grid: { "1": ["s-ingl", "s-ingl", "s-mate", "s-ital", null, null], "2": ["s-stor", "s-geog", null, null, null, null],
            "3": ["s-scie", "s-scie", "s-mate", null, null, null], "4": ["s-mate", "s-ingl", "s-ital", null, null, null],
            "5": ["s-stor", "s-geog", null, null, null, null], "6": [null, null, null, null, null, null] },
  }]));
  localStorage.setItem("agenda:grades", JSON.stringify({ items: [
    { id: "g-1", subjectId: "s-ingl", subjectName: "Inglese", value: 7.5, date: "2026-09-15", lab: false },
    { id: "g-2", subjectId: "s-mate", subjectName: "Matematica", value: 5, date: "2026-09-16", lab: false },
    { id: "g-3", subjectId: "s-stor", subjectName: "Storia", value: 8, date: "2026-09-18", lab: false },
  ] }));
});
await page.reload({ waitUntil: "networkidle" });

await page.waitForTimeout(400);

const html = async (s) => await page.locator(s).first().evaluate((el) => el.outerHTML);
const dentro = async (s) => await page.locator(s).first().evaluate((el) => el.innerHTML);

const pezzi = {
  intestazione: await html(".ag-header"),
  corpo: await dentro(".ag-app__body"),
};

await page.click("#open-grades");
await page.waitForTimeout(600);
await page.click('[data-gr-subject="s-mate"]');
await page.waitForTimeout(400);
pezzi.voti = await dentro("#grades-body");

writeFileSync(USCITA, JSON.stringify(pezzi, null, 1));
console.log(`catturate ${Object.keys(pezzi).length} parti in ${USCITA}`);
for (const [k, v] of Object.entries(pezzi)) console.log(`  ${k}: ${v.length} caratteri`);

await browser.close();
