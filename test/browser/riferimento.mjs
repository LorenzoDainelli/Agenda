import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const p = await b.newPage({ viewport: { width: 1180, height: 1400 } });
const errs = [];
p.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
p.on("pageerror", e => errs.push(e.message));
await p.goto("http://localhost:8098/reference.html", { waitUntil: "networkidle" });
await p.waitForTimeout(400);
console.log("tabella dei colori:", await p.locator("#palette .ag-palette__cell").count(), "(attese 120: dieci righe per dodici colonne)");
// una casella senza token resterebbe trasparente, e nella tabella sembrerebbe
// solo un buco: si contano, nei due temi
const vuote = () => p.evaluate(() => [...document.querySelectorAll("#palette .ag-palette__cell")]
  .filter((c) => getComputedStyle(c).backgroundColor === "rgba(0, 0, 0, 0)").length);
console.log("caselle senza token, tema chiaro:", await vuote());
console.log("colori di prima  :", await p.locator("#subj-swatches .sw").count(), "(attesi 12: sei tonalità x due intensità)");
console.log("gradini peso     :", await p.locator("#load-swatches .sw").count(), "(attesi 6)");
console.log("caselle orario   :", await p.locator("#tt-grid .ag-tt__cell").count(), "(attese 35: 36 ore meno una fusione)");
console.log("componenti        :", await p.locator(".bits > *").count());
await p.screenshot({ path: "/tmp/shots/20-reference-chiaro.png", fullPage: true });
await p.click("#toggle"); await p.waitForTimeout(300);
console.log("tema dopo il tocco:", await p.getAttribute("html","data-theme"));
console.log("caselle senza token, tema scuro:", await vuote());
await p.screenshot({ path: "/tmp/shots/21-reference-scuro.png", fullPage: true });
const veri = errs.filter(e => !/favicon|Failed to load resource/.test(e));
console.log("errori in console :", veri.length ? veri.join(" | ") : "nessuno (l'unico 404 e favicon.ico, che questa pagina di lavoro non ha)");
await b.close();
