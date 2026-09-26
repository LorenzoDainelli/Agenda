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
// del browser si ferma lì. Senza, dal giorno dopo le date dei dati finti
// scivolano nel passato, parte la rassegna degli arretrati e la prova fallisce
// per colpa del calendario, non dell'app. Si ferma solo la data: i timer
// (i toast, le animazioni) continuano a scorrere.
await ctx.clock.setFixedTime(new Date("2026-09-21T10:00:00+02:00"));
const page = await ctx.newPage();
await page.goto("http://localhost:8099/index.html", { waitUntil: "networkidle" });

// Dati inventati, come negli altri driver: nel repo non entra mai un dato
// vero (regola 1 di CLAUDE.md). Servono solo a far comparire tutti gli stati
// che una palette deve reggere: un arretrato, una verifica, un compito a
// parti, una cosa privata, giorni con pesi diversi.
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
  const base = (over) => ({
    id: "t-" + Math.random().toString(36).slice(2, 8), area: "school", subjectId: null, subjectName: null,
    kind: "homework", title: "x", due: null, weight: 1, createdAt: "2026-09-21", doneAt: null,
    droppedAt: null, plan: { skip: [], pick: {} }, parts: [], ...over,
  });
  localStorage.setItem("agenda:tasks", JSON.stringify([
    base({ title: "Schede di inglese", subjectId: "s-ingl", subjectName: "Inglese", due: "2026-09-18", weight: 2 }),
    base({ title: "Compiti di inglese", subjectId: "s-ingl", subjectName: "Inglese", due: "2026-09-24", weight: 2,
           plan: { skip: ["2026-09-23"], pick: { "2026-09-22": "evening" } },
           parts: [{ id: "p1", title: "frasi da tradurre", total: 5, done: 5 },
                   { id: "p2", title: "esercizi sul libro", total: 2, done: 0 }] }),
    base({ title: "Verifica di storia", kind: "test", subjectId: "s-stor", subjectName: "Storia",
           due: "2026-09-25", weight: 3, plan: { skip: [], pick: { "2026-09-23": "afternoon", "2026-09-24": "evening" } } }),
    base({ title: "Esercizi di matematica", subjectId: "s-mate", subjectName: "Matematica", due: "2026-09-24", weight: 3,
           plan: { skip: [], pick: { "2026-09-22": "afternoon" } } }),
    base({ title: "Relazione di scienze", subjectId: "s-scie", subjectName: "Scienze", due: "2026-10-05", weight: 3 }),
    base({ title: "Riassunto di italiano", subjectId: "s-ital", subjectName: "Italiano", due: "2026-09-22", weight: 1 }),
    base({ title: "Comprare le cuffie", area: "private", kind: "todo", due: null }),
  ]));
  localStorage.setItem("agenda:review", JSON.stringify({ lastReviewedOn: "2026-09-21" }));
});
await page.reload({ waitUntil: "networkidle" });

await page.waitForTimeout(400);

const html = async (s) => await page.locator(s).first().evaluate((el) => el.outerHTML);
const dentro = async (s) => await page.locator(s).first().evaluate((el) => el.innerHTML);

const pezzi = {
  intestazione: await html(".ag-header"),
  corpo: await dentro(".ag-app__body"),
  barra: await html(".ag-actionbar"),
};

await page.click("#open-calendar");
await page.waitForTimeout(400);
pezzi.settimana = await dentro("#calendar-body");

writeFileSync(USCITA, JSON.stringify(pezzi, null, 1));
console.log(`catturate ${Object.keys(pezzi).length} parti in ${USCITA}`);
for (const [k, v] of Object.entries(pezzi)) console.log(`  ${k}: ${v.length} caratteri`);

await browser.close();
