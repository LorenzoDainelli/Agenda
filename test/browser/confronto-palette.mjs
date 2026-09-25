/* Guarda la pagina di confronto delle palette in Chromium: fa uno scatto per
 * ogni candidato nei due temi e passa su ognuno il controllo dei contrasti.
 *
 * Serve a rispondere a una domanda sola: una palette generata dai vincoli
 * giusti è davvero a norma quando è disegnata? I numeri li ha calcolati il
 * generatore su singole coppie colore-fondo; qui si guarda la pagina vera,
 * dove un testo può finire su un fondo che il generatore non aveva in mente.
 *
 *   python3 -m http.server 8098 --directory design_handoff
 *   node test/browser/confronto-palette.mjs /tmp/scatti
 */
import { chromium, devices } from "playwright";
import { mkdirSync } from "node:fs";
import { AUDIT } from "./audit.mjs";

const DOVE = process.argv[2] || "/tmp/palette";
mkdirSync(DOVE, { recursive: true });

const CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const browser = await chromium.launch({ executablePath: CHROME });
const ctx = await browser.newContext({
  ...devices["iPhone 15"], hasTouch: true, isMobile: true, locale: "it-IT",
});
const page = await ctx.newPage();
const errori = [];
page.on("pageerror", (e) => errori.push("pageerror: " + e.message));
page.on("console", (m) => {
  // Il browser chiede /favicon.ico da sé e il server statico non ce l'ha: è
  // rumore, non un difetto della pagina.
  // Il testo del messaggio non dice quale risorsa manca: la dice
  // `location().url`, e senza guardare lì il favicon passerebbe il filtro.
  const dove = m.location?.().url || "";
  if (m.type() === "error" && !dove.includes("favicon")) errori.push("console: " + m.text() + " " + dove);
});

await page.goto("http://localhost:8098/palette-alternative/confronto.html", { waitUntil: "networkidle" });

let totali = 0;
const falliti = [];
for (const palette of ["notte", "carta", "bosco"]) {
  for (const tema of ["light", "dark"]) {
    // Si toccano i pulsanti veri invece di scrivere gli attributi: così si
    // prova anche il codice della pagina, e i pulsanti mostrano quale
    // candidato è in mostra — senza, lo scatto direbbe «Notte» sotto una
    // schermata che è Carta.
    await page.click(`[data-imposta="palette"][data-valore="${palette}"]`);
    await page.click(`[data-imposta="theme"][data-valore="${tema}"]`);
    await page.waitForTimeout(200);
    const res = await page.evaluate(AUDIT);
    const ko = res.filter((r) => !r.passa);
    totali += res.length;
    for (const f of ko) falliti.push({ palette, tema, ...f });
    console.log(`${palette.padEnd(6)} ${tema.padEnd(5)} ${res.length.toString().padStart(3)} elementi, ` +
                (ko.length ? `${ko.length} SOTTO SOGLIA` : "tutti a norma"));
    const suffisso = tema === "dark" ? "-scuro" : "";
    await page.screenshot({ path: `${DOVE}/${palette}${suffisso}.png` });
    await page.screenshot({ path: `${DOVE}/${palette}${suffisso}-intera.png`, fullPage: true });
  }
}

console.log(`\n${totali} elementi di testo esaminati in tre palette per due temi.`);
if (falliti.length) {
  console.log(`${falliti.length} sotto soglia:`);
  const visti = new Set();
  for (const f of falliti) {
    const chiave = f.palette + f.tema + f.cls + f.rapporto;
    if (visti.has(chiave)) continue;
    visti.add(chiave);
    console.log(`  [${f.palette}/${f.tema}] ${f.rapporto}:1 (serve ${f.soglia}) ${f.px}px .${f.cls}\n      «${f.testo}»`);
  }
} else {
  console.log("Nessun testo sotto la soglia WCAG AA che gli spetta, in nessuna delle tre.");
}
if (errori.length) { console.log("\nERRORI DI PAGINA:"); errori.forEach((e) => console.log("  " + e)); }

await browser.close();
process.exit(falliti.length || errori.length ? 1 : 0);
