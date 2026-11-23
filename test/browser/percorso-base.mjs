import { chromium, devices } from "playwright";
const CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const browser = await chromium.launch({ executablePath: CHROME });
const ctx = await browser.newContext({
  ...devices["iPhone 15"], hasTouch: true, isMobile: true,
  locale: "it-IT", timezoneId: "Europe/Rome",
});
// Le prove sono scritte per lunedì 21 settembre 2026, alle dieci: l'orologio
// del browser si ferma lì, così la settimana dell'orario e il quadrimestre dei
// voti sono sempre quelli. Si ferma solo la data: i timer (gli avvisi, le
// animazioni) continuano a scorrere.
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
                    S("Storia","STOR","prugna"), S("Scienze","SCIE","muschio")];
  localStorage.setItem("agenda:settings", JSON.stringify({
    version:1, lang:null, theme:null, subjects, areas:[], lessonsPerDay:6, schoolDays:[1,2,3,4,5,6],
  }));
  localStorage.setItem("agenda:timetables", JSON.stringify([{
    weekStart: "2026-09-21",
    grid: { "1":["s-ingl","s-ingl","s-mate",null,null,null], "2":["s-stor",null,null,null,null,null],
            "3":["s-scie",null,null,null,null,null], "4":["s-mate","s-ingl",null,null,null,null],
            "5":["s-stor",null,null,null,null,null], "6":[null,null,null,null,null,null] },
  }]));
  // dati di prima, delle funzioni tolte (A73): non si vedono più ma devono
  // restare dove sono, e uscire nella copia
  localStorage.setItem("agenda:tasks", JSON.stringify([{ id:"t-vecchio", area:"school", subjectId:null, subjectName:null,
    kind:"homework", lab:false, title:"Un compito di prima", due:"2026-09-30", weight:2, createdAt:"2026-09-10",
    doneAt:null, droppedAt:null, plan:{skip:[],pick:{}}, parts:[] }]));
  localStorage.setItem("agenda:shopping", JSON.stringify({ items: [{ id:"c-vecchio", name:"latte", addedAt:"2026-09-10", boughtAt:null }] }));
  localStorage.removeItem("agenda:grades");
});
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(300);

console.log("== la schermata principale è l'orario (A72–A73) ==");
const testata = await page.evaluate(() => {
  const h = document.getElementById("today-title");
  const title = h.getBoundingClientRect();
  const btns = [...document.querySelectorAll(".ag-header__actions .ag-iconbtn")].map((b) => b.getBoundingClientRect());
  return { n: btns.length, minW: Math.min(...btns.map((b) => b.width)), titleTop: title.top,
           btnBottom: Math.max(...btns.map((b) => b.bottom)), oneLine: h.scrollWidth <= h.clientWidth && title.height < 40, h: title.height };
});
check("in testata ci sono due pulsanti: voti e impostazioni", testata.n === 2
      && (await page.locator(".ag-header__actions .ag-iconbtn").first().getAttribute("id")) === "open-grades");
check("larghi almeno 44px", testata.minW >= 44, `${testata.minW}px`);
check("la data sta sotto i pulsanti, su una riga intera", testata.titleTop >= testata.btnBottom - 1 && testata.oneLine,
      `alta ${testata.h}px, da ${testata.titleTop} (pulsanti fino a ${testata.btnBottom})`);
check("sopra c'è scritto «Orario»", (await txt(".ag-header__eyebrow")) === "Orario");
check("e l'orario è la pagina, senza aprire niente", await page.locator("#timetable-body .ag-tt__cell").count() > 0);
check("compiti, calendario, archivio e spesa non ci sono più",
      await page.locator("#add, #list, #open-calendar, #open-archive, #open-shopping, #open-timetable").count() === 0);
const righe = await page.evaluate(() => [...document.querySelectorAll(".ag-tt__hour")].map((h) => h.getBoundingClientRect().height));
check("ogni ora della griglia è alta almeno un tocco", Math.min(...righe) >= 44, righe.join("/"));

console.log("\n== l'orario ==");
check("provvisorio: le caselle si toccano", await page.locator("#timetable-body button.ag-tt__cell").count() > 0);
await page.locator('#timetable-body [data-cell^="2:1:"]').click(); await page.waitForTimeout(250);
await page.locator("#sheet-body .ag-sheet__option", { hasText: "Scienze" }).click(); await page.waitForTimeout(250);
check("toccando una casella si cambia la materia",
      await page.evaluate(() => JSON.parse(localStorage.getItem("agenda:timetables"))[0].grid["2"][1]) === "s-scie");
// ore diverse per giorno e pausa (A64): il sabato passa a 8 ore, la 5ª è pausa
await page.click("#tt-days"); await page.waitForTimeout(250);
await page.locator('#sheet-body [data-value="6"]').click(); await page.waitForTimeout(250);
await page.locator('#sheet-body [data-value="8"]').click(); await page.waitForTimeout(250);
check("un giorno può avere più ore degli altri", await page.evaluate(() => JSON.parse(localStorage.getItem("agenda:timetables"))[0].grid["6"].length) === 8
      && await page.locator('#timetable-body [data-cell^="6:7:"]').count() === 1 && await page.locator('#timetable-body [data-cell^="1:7:"]').count() === 0);
await page.locator('#timetable-body [data-cell^="6:4:"]').click(); await page.waitForTimeout(250);
await page.locator('#sheet-body [data-value="@break"]').click(); await page.waitForTimeout(250);
check("e un'ora può essere la pausa", (await txt('#timetable-body [data-cell^="6:4:"]')) === "Pausa", await txt('#timetable-body [data-cell^="6:4:"]'));
await page.click("#tt-days"); await page.waitForTimeout(250);
await page.locator('#sheet-body [data-value="6"]').click(); await page.waitForTimeout(250);
await page.locator('#sheet-body [data-value="4"]').click(); await page.waitForTimeout(250);
check("accorciando sopra la pausa lo chiede prima", await page.locator("#sheet-body [data-act=\"no\"]").count() > 0
      && await page.evaluate(() => JSON.parse(localStorage.getItem("agenda:timetables"))[0].grid["6"].length) === 8);
await page.locator('#sheet-body [data-act="no"]').first().click(); await page.waitForTimeout(250);
await page.click("#tt-add"); await page.waitForTimeout(250);
const giornoScelto = await page.locator("#sheet-body [data-value]").nth(2).getAttribute("data-value");
check("un orario nuovo chiede da che giorno parte", (await txt("#sheet-body .ag-sheet__title")).includes("Da che giorno"));
await page.locator("#sheet-body [data-value]").nth(2).click(); await page.waitForTimeout(250);
check("e parte proprio da quel giorno", await page.evaluate(() => JSON.parse(localStorage.getItem("agenda:timetables"))[0].weekStart) === giornoScelto);
// lo si toglie (con la sua conferma), così le prove dopo lavorano sull'orario di oggi
await page.locator(`[data-tt-del="${giornoScelto}"]`).click(); await page.waitForTimeout(250);
await page.locator('#sheet-body [data-act="yes"]').click(); await page.waitForTimeout(250);
await page.click("#tt-final"); await page.waitForTimeout(250);
check("renderlo definitivo chiede conferma, e dice come si torna indietro", (await txt("#sheet-body .ag-sheet__title")).includes("Impostazioni › Orario"),
      await txt("#sheet-body .ag-sheet__title"));
await page.click('#sheet [data-act="yes"]'); await page.waitForTimeout(300);
check("definitivo: le caselle non si toccano più", await page.locator("#timetable-body button.ag-tt__cell").count() === 0
      && await page.locator("#timetable-body .ag-tt__cell").count() > 0);
check("e non c'è più «Nuovo orario»", await page.locator("#tt-add").count() === 0);
check("e resta definitivo", await page.evaluate(() => JSON.parse(localStorage.getItem("agenda:settings")).timetableFinal) === true);

console.log("\n== impostazioni a pagine ==");
await page.click("#open-settings"); await page.waitForTimeout(250);
check("si parte dall'elenco: quattro righe (niente ambiti né parti)", await page.locator("#settings-body [data-page]").count() === 4);
check("e ognuna dice come stanno le cose", (await txt('[data-page="timetable"] .ag-row__value')) === "definitivo", await txt('[data-page="timetable"] .ag-row__value'));
check("nell'elenco non c'è la freccia indietro", await page.locator("#settings-back").isHidden());
const riga48 = await page.locator("#settings-body [data-page]").first().boundingBox();
check("righe compatte, ma sopra i 44px", riga48.height >= 44 && riga48.height < 60, `${riga48.height}px`);
await page.click('[data-page="timetable"]'); await page.waitForTimeout(200);
check("dentro una pagina: il suo nome e la freccia", (await txt("#settings-title")) === "Orario" && !(await page.locator("#settings-back").isHidden()));
await page.click("#tt-unlock"); await page.waitForTimeout(250);
check("da qui l'orario torna modificabile", await page.evaluate(() => JSON.parse(localStorage.getItem("agenda:settings")).timetableFinal) === false);
await page.click("#settings-back"); await page.waitForTimeout(200);
check("la freccia torna all'elenco", await page.locator("#settings-body [data-page]").count() === 4 && (await txt("#settings-title")) === "Impostazioni");
check("che ora dice provvisorio", (await txt('[data-page="timetable"] .ag-row__value')) === "provvisorio");
await page.click('[data-page="subjects"]'); await page.waitForTimeout(200);
await page.keyboard.press("Escape"); await page.waitForTimeout(200);
check("Esc da una pagina torna all'elenco, non chiude", !(await page.locator("#settings-layer").isHidden()) && await page.locator("#settings-body [data-page]").count() === 4);
await page.click('[data-close="settings-layer"]'); await page.waitForTimeout(200);
check("e l'orario si tocca di nuovo", await page.locator("#timetable-body button.ag-tt__cell").count() > 0);

console.log("\n== la tabella dei colori (A57–A60) ==");
await page.click("#open-settings"); await page.waitForTimeout(250);
await page.click('[data-page="subjects"]'); await page.waitForTimeout(200);
// il foglio sale con la molla (A76): si aspetta che sia fermo prima di misurarlo
await page.locator('#settings-body [data-subject="s-ingl"]').click(); await page.waitForTimeout(600);
const caselle = page.locator("#sheet .ag-palette__cell");
check("dieci righe per dodici colonne", await caselle.count() === 120);
check("un colore di prima non accende nessuna casella (A58)", await page.locator('#sheet .ag-palette__cell[aria-checked="true"]').count() === 0);
check("e dalla tastiera si entra da una casella sola", await page.locator('#sheet .ag-palette__cell[tabindex="0"]').count() === 1);
for (const tema of ["light", "dark"]) {
  const vuote = await page.evaluate((tema) => {
    document.documentElement.dataset.theme = tema;
    return [...document.querySelectorAll("#sheet .ag-palette__cell")]
      .filter((c) => getComputedStyle(c).backgroundColor === "rgba(0, 0, 0, 0)").map((c) => c.dataset.color);
  }, tema);
  check(`ogni casella ha il suo token (tema ${tema === "light" ? "chiaro" : "scuro"})`, vuote.length === 0, vuote.join(" "));
}
await page.evaluate(() => { document.documentElement.dataset.theme = "light"; });
const tabella = await page.locator("#sheet .ag-palette").boundingBox();
check("le caselle sono quadrate e stanno nella larghezza", Math.abs(tabella.width / 12 - tabella.height / 10) < 1 && tabella.width <= 393,
      `${(tabella.width / 12).toFixed(1)}×${(tabella.height / 10).toFixed(1)}px`);
{
  // si appoggia il dito sulla riga 2 colonna 1 e si trascina fino alla riga 6
  // colonna 8, uscendo un poco di lato: conta la casella dove ci si ferma
  const w = tabella.width / 12, h = tabella.height / 10;
  const punto = (r, c) => [tabella.x + (c + 0.5) * w, tabella.y + (r + 0.5) * h];
  const [x0, y0] = punto(2, 1), [x1, y1] = punto(6, 8);
  const scorreva = await page.evaluate(() => document.querySelector("#sheet").scrollTop);
  await page.mouse.move(x0, y0); await page.mouse.down();
  check("appoggiando il dito la casella si accende subito", (await page.getAttribute("#sheet [data-color=\"t-2-1\"]", "aria-checked")) === "true");
  for (let i = 1; i <= 10; i++) await page.mouse.move(x0 + ((x1 - x0) * i) / 10, y0 + ((y1 - y0) * i) / 10);
  await page.mouse.up(); await page.waitForTimeout(150);
  check("trascinando la scelta segue il dito", (await page.getAttribute("#sheet [data-color=\"t-6-8\"]", "aria-checked")) === "true"
        && await page.locator('#sheet .ag-palette__cell[aria-checked="true"]').count() === 1);
  check("e il pannello non scorre", await page.evaluate(() => document.querySelector("#sheet").scrollTop) === scorreva);
  check("il campione sopra ha il colore sotto il dito, col nome della materia",
        (await page.getAttribute("#s-sample", "style")).includes("--ag-subj-t-6-8-soft") && (await txt("#s-sample")) === "Inglese");
  // uscendo dalla tabella si resta sulla casella del bordo
  await page.mouse.move(x1, y1); await page.mouse.down();
  await page.mouse.move(tabella.x + tabella.width + 40, y1, { steps: 6 }); await page.mouse.up();
  check("uscendo di lato si resta sul bordo", (await page.getAttribute("#sheet [data-color=\"t-6-11\"]", "aria-checked")) === "true");
}
await page.locator('#sheet [data-color="t-4-5"]').click();
check("un tocco solo sceglie", (await page.getAttribute('#sheet [data-color="t-4-5"]', "aria-checked")) === "true");
await page.locator('#sheet [data-color="t-4-5"]').press("ArrowRight");
check("con le frecce ci si sposta", (await page.getAttribute('#sheet [data-color="t-4-6"]', "aria-checked")) === "true"
      && await page.evaluate(() => document.activeElement?.dataset.color) === "t-4-6");
await page.locator("#s-name").fill("Inglese B");
check("il campione segue anche il nome", (await txt("#s-sample")) === "Inglese B");
await page.locator("#s-name").fill("Inglese");
await page.locator('#sheet [data-act="save"]').click(); await page.waitForTimeout(250);
check("il colore si salva col nome della casella", await page.evaluate(() =>
  JSON.parse(localStorage.getItem("agenda:settings")).subjects.find((s) => s.id === "s-ingl").color) === "t-4-6");
check("e il pallino della materia lo usa", (await page.getAttribute('#settings-body [data-subject="s-ingl"] .ag-dot', "style")).includes("--ag-subj-t-4-6"));
await page.locator("#subject-new").fill("Materia di prova");
await page.locator("#subject-add").click(); await page.waitForTimeout(250);
check("una materia nuova nasce con un colore della tabella", await page.evaluate(() =>
  /^t-\d+-\d+$/.test(JSON.parse(localStorage.getItem("agenda:settings")).subjects.at(-1).color)));
await page.screenshot({ path: "/tmp/shots/05c-tabella-colori.png" });
await page.click('[data-close="settings-layer"]'); await page.waitForTimeout(200);

console.log("\n== teoria e laboratorio (A44–A47) ==");
await page.click("#open-settings"); await page.waitForTimeout(250);
await page.click('[data-page="subjects"]'); await page.waitForTimeout(200);
await page.locator('#settings-body [data-subject="s-mate"]').click(); await page.waitForTimeout(250);
check("la materia nasce «Solo teoria»", (await page.getAttribute('#s-lab [data-lab="0"]', "aria-pressed")) === "true");
await page.locator('#s-lab [data-lab="1"]').click();
await page.locator('#sheet [data-act="save"]').click(); await page.waitForTimeout(250);
check("segnata col laboratorio, l'elenco lo dice", (await txt('#settings-body [data-subject="s-mate"] .ag-row__value')) === "MATE · Lab",
      await txt('#settings-body [data-subject="s-mate"] .ag-row__value'));
await page.click('[data-close="settings-layer"]'); await page.waitForTimeout(200);
await page.locator('#timetable-body [data-cell^="3:1:"]').click(); await page.waitForTimeout(250);
check("nell'orario la materia si sceglie come teoria o come laboratorio",
      (await all("#sheet-body .ag-sheet__option")).some((x) => x.startsWith("Matematica · Teoria"))
      && (await all("#sheet-body .ag-sheet__option")).some((x) => x.startsWith("Matematica · Laboratorio")),
      (await all("#sheet-body .ag-sheet__option")).join(" | "));
await page.locator("#sheet-body .ag-sheet__option", { hasText: "Matematica · Laboratorio" }).click(); await page.waitForTimeout(250);
check("l'ora di laboratorio si salva come id@lab",
      await page.evaluate(() => JSON.parse(localStorage.getItem("agenda:timetables"))[0].grid["3"][1]) === "s-mate@lab");
check("e la casella porta «LAB» sotto la sigla", (await txt('#timetable-body [data-cell^="3:1:"]')) === "MATE Lab"
      && await page.locator('#timetable-body [data-cell^="3:1:"] .ag-tt__lab').count() === 1, await txt('#timetable-body [data-cell^="3:1:"]'));
console.log("\n== i voti (§6.8, A66–A71) ==");
const voti = () => page.evaluate(() => JSON.parse(localStorage.getItem("agenda:grades") || '{"items":[]}').items);
const aggiungiVoto = async (materia, valore, lab = null) => {
  await page.click("#gr-add"); await page.waitForTimeout(200);
  await page.locator(`#sheet-body [data-f-subject="${materia}"]`).click(); await page.waitForTimeout(150);
  if (lab !== null) { await page.locator(`#sheet-body [data-f-lab="${lab ? 1 : 0}"]`).click(); await page.waitForTimeout(150); }
  await page.locator(`#sheet-body [data-f-value="${valore}"]`).click(); await page.waitForTimeout(150);
  await page.locator('#sheet-body [data-f-act="save"]').click(); await page.waitForTimeout(250);
};
await page.click("#open-grades"); await page.waitForTimeout(250);
check("si apre sul quadrimestre di oggi", (await page.getAttribute('#gr-period [data-period="1"]', "aria-pressed")) === "true");
check("senza voti la media è un trattino", (await txt(".ag-grades__avg--big")) === "—");
await page.click("#gr-add"); await page.waitForTimeout(200);
check("i voti sono diciassette chip, dal 2 al 10", await page.locator("#sheet-body [data-f-value]").count() === 17
      && (await txt('#sheet-body [data-f-value="6.5"]')) === "6,5");
check("senza materia e voto non si salva", await page.locator('#sheet-body [data-f-act="save"][disabled]').count() === 1);
await page.locator('#sheet-body [data-f-act="cancel"]').click(); await page.waitForTimeout(200);
await aggiungiVoto("s-mate", 5.5, true);
await aggiungiVoto("s-mate", 8, false);
await aggiungiVoto("s-ingl", 7);
check("i voti si salvano col giorno di oggi", (await voti()).length === 3 && (await voti()).every((g) => g.date === "2026-09-21"));
check("il laboratorio resta segnato", (await voti()).some((g) => g.subjectId === "s-mate" && g.lab && g.value === 5.5));
check("media generale = media delle medie (6,75 e 7)", (await txt(".ag-grades__avg--big")) === "6,88", await txt(".ag-grades__avg--big"));
// salvando le materie si aprono: le richiudo
await page.click('[data-gr-subject="s-mate"]'); await page.waitForTimeout(150);
await page.click('[data-gr-subject="s-ingl"]'); await page.waitForTimeout(150);
check("chiusa, la materia mostra solo la complessiva", await page.locator(".ag-grades__stats").count() === 0
      && (await txt('[data-gr-subject="s-mate"] .ag-grades__avg')) === "6,75");
await page.click('[data-gr-subject="s-mate"]'); await page.waitForTimeout(150);
check("aperta: teoria, laboratorio e complessiva", (await all(".ag-grades__stat")).join(" | ") === "Teoria8 | Laboratorio5,5 | Complessiva6,75",
      (await all(".ag-grades__stat")).join(" | "));
check("sotto il 6 è rossa", await page.locator(".ag-grades__grade .ag-grades__avg--low").count() === 1);
check("il secondo quadrimestre è vuoto", await (async () => {
  await page.click('#gr-period [data-period="2"]'); await page.waitForTimeout(150);
  const vuoto = (await txt(".ag-grades__avg--big")) === "—";
  await page.click('#gr-period [data-period="1"]'); await page.waitForTimeout(150);
  return vuoto;
})());
await page.locator(".ag-grades__grade").first().click(); await page.waitForTimeout(200);
await page.locator('#sheet-body [data-f-act="delete"]').click(); await page.waitForTimeout(200);
check("eliminare chiede conferma, con voto e materia", (await txt("#sheet-body .ag-sheet__title")).includes("Matematica"), await txt("#sheet-body .ag-sheet__title"));
await page.locator('#sheet-body [data-act="yes"]').click(); await page.waitForTimeout(250);
check("e poi lo toglie", (await voti()).length === 2);
await page.click('[data-close="grades-layer"]'); await page.waitForTimeout(200);

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
await page.screenshot({ path: "/tmp/shots/11-scuro-orario.png" });

console.log("\n== lingua inglese forzata ==");
await page.click("#open-settings"); await page.waitForTimeout(250);
await page.click('[data-page="look"]'); await page.waitForTimeout(200);
await page.locator('#lang-seg [data-lang="en"]').click(); await page.waitForTimeout(300);
check("l'interfaccia passa all'inglese", (await txt("#settings-title")) === "Appearance", await txt("#settings-title"));
await page.locator('#lang-seg [data-lang="it"]').click(); await page.waitForTimeout(250);
await page.locator('[data-theme=""]').click(); await page.waitForTimeout(250);
await page.click('[data-close="settings-layer"]');

console.log("\n== il movimento del Visore (A76–A79) ==");
await page.click("#open-grades"); await page.waitForTimeout(60);
check("un livello entra con la sua animazione", await page.evaluate(() =>
  document.getElementById("grades-layer").classList.contains("ag-layer--in")
  && getComputedStyle(document.getElementById("grades-layer")).animationName === "ag-layer-in"));
await page.waitForTimeout(400);
await page.click("#gr-add"); await page.waitForTimeout(500);
await page.locator('#sheet-body [data-f-act="cancel"]').click(); await page.waitForTimeout(40);
check("un foglio chiudendosi prima scende…", await page.evaluate(() => {
  const s = document.getElementById("sheet"); return !s.hidden && s.classList.contains("ag-sheet--out");
}));
await page.waitForTimeout(400);
check("…e poi sparisce davvero", await page.locator("#sheet").isHidden() && await page.locator("#scrim").isHidden());
const prima = await page.evaluate(() => getComputedStyle(document.getElementById("gr-period")).getPropertyValue("--seg-i").trim());
await page.click('#gr-period [data-period="year"]'); await page.waitForTimeout(500);
check("nel selettore la macchia scivola sulla scelta nuova", prima === "0"
      && await page.evaluate(() => getComputedStyle(document.getElementById("gr-period")).getPropertyValue("--seg-i").trim()) === "2");
await page.click('#gr-period [data-period="1"]'); await page.waitForTimeout(300);
const pressione = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--ag-press").trim());
check("un pulsante premuto si stringe a 0,96", pressione === "0.96", pressione);
await page.click('[data-close="grades-layer"]'); await page.waitForTimeout(400);
check("il livello chiuso non resta davanti", await page.locator("#grades-layer").isHidden());
{
  // un avviso qualunque, fatto comparire da qui: conta la forma e quanto resta
  await page.evaluate(async () => (await import("./js/ui.js")).toast("Prova"));
  await page.waitForTimeout(200);
  const forma = await page.evaluate(() => getComputedStyle(document.querySelector(".ag-toast:last-child")).borderRadius);
  check("l'avviso è una pillola", parseFloat(forma) > 100, forma);
  await page.waitForTimeout(3200);
  check("e se ne va da solo dopo un paio di secondi", await page.locator(".ag-toast").count() === 0);
}
{
  // «Riduci movimento»: niente si muove, il foglio sparisce subito
  const quieto = await browser.newContext({ ...devices["iPhone 15"], reducedMotion: "reduce", locale: "it-IT" });
  await quieto.clock.setFixedTime(new Date("2026-09-21T10:00:00+02:00"));
  const q = await quieto.newPage();
  await q.goto("http://localhost:8099/index.html", { waitUntil: "networkidle" });
  await q.evaluate((dati) => { for (const [k, v] of Object.entries(dati)) localStorage.setItem(k, v); },
    await page.evaluate(() => Object.fromEntries(Object.entries(localStorage))));
  await q.reload({ waitUntil: "networkidle" });
  await q.click("#open-grades"); await q.click("#gr-add");
  await q.locator('#sheet-body [data-f-act="cancel"]').click();
  check("con «Riduci movimento» il foglio si chiude subito", await q.locator("#sheet").isHidden());
  check("e niente si stringe", (await q.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--ag-press").trim())) === "1");
  await quieto.close();
}

console.log("\n== i dati di prima restano (A73) ==");
check("i compiti sono ancora in memoria", await page.evaluate(() => JSON.parse(localStorage.getItem("agenda:tasks")).some((x) => x.id === "t-vecchio")));
check("e la spesa pure", await page.evaluate(() => JSON.parse(localStorage.getItem("agenda:shopping")).items.some((x) => x.id === "c-vecchio")));
const copia = await page.evaluate(async () => (await import("./js/storage.js")).exportAll("2026-09-21"));
check("e la copia di sicurezza li porta fuori, coi voti e l'orario", copia.tasks.some((x) => x.id === "t-vecchio")
      && copia.shopping.items.some((x) => x.id === "c-vecchio") && Array.isArray(copia.grades.items) && copia.timetables.length > 0);

console.log("\n== errori raccolti ==");
console.log(errors.length ? errors.join("\n") : "nessuno");
console.log(`\n${ko === 0 ? "TUTTI I CONTROLLI PASSATI" : ko + " CONTROLLI FALLITI"}`);
await browser.close();
process.exit(ko || errors.length ? 1 : 0);
