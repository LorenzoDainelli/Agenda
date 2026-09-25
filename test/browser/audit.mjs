/* Il controllo dei contrasti su una pagina renderizzata, come funzione da
 * passare a `page.evaluate`.
 *
 * Sta in un file suo perché lo usano in due: contrasti.mjs (che guida l'app) e
 * confronto-palette.mjs (che guarda la pagina di confronto delle palette). Una
 * seconda copia di questa funzione sarebbe la prima cosa a restare indietro, e
 * resterebbe indietro proprio nel controllo che deve accorgersi delle cose che
 * restano indietro.
 *
 * Per ogni elemento che contiene testo: risale i genitori fino a trovare un
 * fondo opaco, calcola il rapporto e lo confronta con la soglia WCAG AA che gli
 * spetta (3:1 per il testo grande o grassetto, 4.5:1 per il resto).
 *
 * E tiene conto dell'`opacity`, sua e dei genitori. La prima versione non lo
 * faceva: una riga fatta, disegnata al 55%, risultava leggibile quanto una
 * riga aperta, e la stessa cosa succedeva a ogni testo "attenuato" con
 * l'opacità invece che con un colore. Finché le righe fatte sparivano subito
 * il buco non si vedeva; da quando restano nell'elenco fino a mezzanotte, sì.
 */

export const AUDIT = () => {
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

  /* Il testo e il fondo come arrivano davvero allo schermo quando l'elemento,
     o un suo genitore, è trasparente. Un gruppo con opacità α si disegna
     prima tutto intero (testo sul suo fondo) e poi si mescola con quello che
     c'è sotto: quindi sia il testo sia il fondo vicino finiscono mescolati con
     lo stesso "sotto", ed è per questo che il contrasto cala. Con più livelli
     trasparenti uno dentro l'altro si moltiplicano le α e si mescola col fondo
     sotto al più esterno: è un'approssimazione, ma sbaglia sempre dalla
     parte del severo solo quando i fondi intermedi sono più scuri di quello
     esterno, cioè mai in questa app. */
  const faded = (el, color, bg, fgLum) => {
    let alpha = 1, outer = null;
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const o = parseFloat(getComputedStyle(n).opacity);
      if (o < 1) { alpha *= o; outer = n; }
    }
    if (!outer) return { color, bg };
    const under = bgOf(outer.parentElement || document.body, fgLum);
    return { color: over(color, under, alpha), bg: over(bg, under, alpha), alpha };
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
    const bg0 = bgOf(el, lum(fg.rgb));
    const vero = faded(el, fg.a === 1 ? fg.rgb : over(fg.rgb, bg0, fg.a), bg0, lum(fg.rgb));
    const colore = vero.color, bg = vero.bg;
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
    const bg0 = bgOf(el, lum(fg.rgb));
    const vero = faded(el, fg.a === 1 ? fg.rgb : over(fg.rgb, bg0, fg.a), bg0, lum(fg.rgb));
    const color = vero.color, bg = vero.bg;
    const px = parseFloat(st.fontSize);
    const bold = Number(st.fontWeight) >= 700;
    const soglia = (px >= 24 || (px >= 18.66 && bold)) ? 3 : 4.5;
    const rr = ratio(color, bg);
    out.push({ testo: own.slice(0, 40), cls: el.className?.toString?.().slice(0,44) || el.tagName,
               px: Math.round(px), rapporto: Math.round(rr*100)/100, soglia,
               ...(vero.alpha ? { opacita: Math.round(vero.alpha*100)/100 } : {}),
               passa: rr >= soglia - 0.005 });
  }
  return out;
};
