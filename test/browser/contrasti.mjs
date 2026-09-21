/* Verifica dei contrasti sulla pagina renderizzata, non sui numeri dei token.
 *
 * Per ogni elemento che contiene testo: risale i genitori fino a trovare un
 * fondo opaco, calcola il rapporto e lo confronta con la soglia WCAG AA che
 * gli spetta (3:1 per il testo grande o grassetto, 4.5:1 per il resto).
 */
import { chromium, devices } from "playwright";
const CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const browser = await chromium.launch({ executablePath: CHROME });
const ctx = await browser.newContext({ ...devices["iPhone 15"], hasTouch: true, isMobile: true, locale: "it-IT" });
const page = await ctx.newPage();

const AUDIT = () => {
  const lin = (c) => { c /= 255; return c <= 0.03928 ? c/12.92 : ((c+0.055)/1.055)**2.4; };
  const lum = ([r,g,b]) => 0.2126*lin(r) + 0.7152*lin(g) + 0.0722*lin(b);
  const parse = (s) => {
    const m = s.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(",").map(Number);
    return { rgb: [p[0],p[1],p[2]], a: p.length > 3 ? p[3] : 1 };
  };
  const over = (fg, bg, a) => fg.map((c,i) => c*a + bg[i]*(1-a));
  /* Il fondo effettivo sotto un elemento. Risale i genitori finché non trova
     qualcosa di opaco. Un fondo a GRADIENTE non compare in backgroundColor
     (che resta trasparente): senza gestirlo, il testo bianco del blocco in
     cima sembrava bianco su bianco. Dei colori del gradiente si prende il più
     chiaro se il testo è chiaro e il più scuro se il testo è scuro, cioè il
     caso peggiore. */
  const stops = (el) => {
    const img = getComputedStyle(el).backgroundImage;
    if (!img || !img.includes("gradient")) return null;
    const found = [...img.matchAll(/rgba?\(([^)]+)\)/g)]
      .map(m => m[1].split(",").map(Number).slice(0,3));
    return found.length ? found : null;
  };
  const bgOf = (node, fgLum) => {
    let el = node;
    while (el && el !== document.documentElement.parentNode) {
      const g = stops(el);
      if (g) {
        // il caso peggiore: lo stop più vicino in luminanza al testo
        return g.reduce((worst, c) =>
          Math.abs(lum(c) - fgLum) < Math.abs(lum(worst) - fgLum) ? c : worst);
      }
      const c = parse(getComputedStyle(el).backgroundColor);
      if (c && c.a === 1) return c.rgb;
      el = el.parentElement;
    }
    return [255,255,255];
  };
  const ratio = (a, b) => {
    const la = lum(a), lb = lum(b), hi = Math.max(la,lb), lo = Math.min(la,lb);
    return (hi+0.05)/(lo+0.05);
  };

  const out = [];

  /* I segnaposto dei campi. Vanno guardati a parte, perché il testo di un
     placeholder non è un nodo di testo: la prima versione di questo strumento
     non li vedeva, e uno stava a 2.67:1 senza che nessuno se ne accorgesse.
     Il colore si chiede a `getComputedStyle(el, "::placeholder")`, che lo
     risolve già — la strada di leggere le regole dal CSSOM sembrava più
     rigorosa e invece non trovava niente, perché i fogli arrivano via
     @import. */
  for (const el of document.querySelectorAll("input[placeholder], textarea[placeholder]")) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const st = getComputedStyle(el);
    if (st.visibility === "hidden" || st.opacity === "0") continue;
    const fg = parse(getComputedStyle(el, "::placeholder").color);
    if (!fg) continue;
    const bg = bgOf(el, lum(fg.rgb));
    const colore = fg.a === 1 ? fg.rgb : over(fg.rgb, bg, fg.a);
    const px = parseFloat(st.fontSize);
    const soglia = px >= 24 ? 3 : 4.5;
    const rr = ratio(colore, bg);
    out.push({ testo: "segnaposto: " + el.placeholder.slice(0, 26),
               cls: (el.id || el.className) + "::placeholder",
               px: Math.round(px), rapporto: Math.round(rr*100)/100, soglia,
               passa: rr >= soglia - 0.005 });
  }

  for (const el of document.querySelectorAll("body *")) {
    // solo elementi con testo proprio e visibili
    const own = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => n.textContent.trim()).join(" ");
    if (!own) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const st = getComputedStyle(el);
    if (st.visibility === "hidden" || st.opacity === "0") continue;
    const fg = parse(st.color);
    if (!fg) continue;
    const bg = bgOf(el, lum(fg.rgb));
    const color = fg.a === 1 ? fg.rgb : over(fg.rgb, bg, fg.a);
    const px = parseFloat(st.fontSize);
    const bold = Number(st.fontWeight) >= 700;
    const soglia = (px >= 24 || (px >= 18.66 && bold)) ? 3 : 4.5;
    const rr = ratio(color, bg);
    out.push({ testo: own.slice(0, 40), cls: el.className?.toString?.().slice(0,44) || el.tagName,
               px: Math.round(px), rapporto: Math.round(rr*100)/100, soglia,
               passa: rr >= soglia - 0.005 });
  }
  return out;
};

const scenari = [
  ["elenco", async () => {}],
  ["calendario settimana", async () => { await page.click("#open-calendar"); await page.waitForTimeout(400); }],
  ["calendario mese", async () => { await page.locator('#cal-mode [data-mode="month"]').click(); await page.waitForTimeout(400); }],
  ["impostazioni", async () => { await page.click('[data-close="calendar-layer"]'); await page.click("#open-settings"); await page.waitForTimeout(400); }],
  ["pannello compito", async () => { await page.click('[data-close="settings-layer"]'); await page.locator("#list [data-open]").first().click(); await page.waitForTimeout(400); }],
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
            parts:[{id:"p1",title:"cinque frasi",total:5,done:2,pick:{}},{id:"p2",title:"due esercizi",total:2,done:0,pick:{}}],
            plan:{skip:[],pick:{"2026-09-22":"morning","2026-09-23":"evening"}}}),
      base({title:"Giornata pesante", subjectId:"s-rose", subjectName:"Materia rose", due:"2026-09-26", weight:3, plan:{skip:[],pick:{"2026-09-22":"afternoon"}}}),
      base({title:"Cosa privata", area:"private", kind:"todo"}),
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
