/* La lista della spesa (§6.7, assunzioni A37–A39 del piano).
 *
 * Le regole stanno in shopping.js e non toccano la pagina: si provano qui. Il
 * pannello si prova aprendo l'app (test/browser/percorso-base.mjs).
 */
import {
  normalize, addItem, toggleItem, inList, boughtBefore, countToBuy, clearBought, parseItem, qtyLabel,
} from "../src/js/shopping.js";

let pass = 0, fail = 0;
const eq = (label, got, want) => {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}\n       atteso ${w}\n       ottenuto ${g}`); }
};

const OGGI = "2026-09-26";
const IERI = "2026-09-25";
const nomi = (list) => list.map((item) => item.name);

console.log("aggiungere");
let r = addItem([], "  latte ", OGGI);
eq("una cosa nuova si aggiunge, senza spazi attorno", [r.status, nomi(r.items)], ["added", ["latte"]]);
eq("nasce da comprare, con la data di oggi", [r.items[0].boughtAt, r.items[0].addedAt], [null, OGGI]);
let lista = r.items;
lista = addItem(lista, "pane", OGGI).items;
eq("un nome vuoto non aggiunge niente", addItem(lista, "   ", OGGI).status, "empty");
eq("una cosa già in lista non fa un doppione (maiuscole a parte)", [addItem(lista, "Latte", OGGI).status, addItem(lista, "Latte", OGGI).items.length], ["already", 2]);

console.log("spuntare");
const idLatte = lista[0].id;
lista = toggleItem(lista, idLatte, OGGI);
eq("spuntata oggi: resta in lista, barrata", nomi(inList(lista, OGGI)), ["latte", "pane"]);
eq("e non conta più fra quelle da comprare", countToBuy(lista), 1);
eq("ritoccata, torna da comprare al suo posto", nomi(inList(toggleItem(lista, idLatte, OGGI), OGGI)), ["latte", "pane"]);
eq("una cosa che non c'è non cambia niente", toggleItem(lista, "c-nessuna", OGGI), lista);

console.log("a mezzanotte");
const domani = "2026-09-27";
eq("il giorno dopo non è più nella lista", nomi(inList(lista, domani)), ["pane"]);
eq("ma fra le «Già comprate», non cancellata (A37)", nomi(boughtBefore(lista, domani)), ["latte"]);
eq("un tocco la rimette in lista, in fondo", nomi(inList(toggleItem(lista, idLatte, domani), domani)), ["pane", "latte"]);
r = addItem(lista, "LATTE", domani);
eq("scriverla di nuovo la rimette in lista invece di farne un'altra (A38)", [r.status, r.items.length, nomi(inList(r.items, domani))],
   ["back", 2, ["pane", "latte"]]);
eq("e torna con la data di oggi", r.items.find((item) => item.id === idLatte).addedAt, domani);

console.log("le «Già comprate»");
const storico = [
  { id: "c-1", name: "uova", addedAt: "2026-09-01", boughtAt: "2026-09-20" },
  { id: "c-2", name: "burro", addedAt: "2026-09-01", boughtAt: IERI },
  { id: "c-3", name: "arance", addedAt: "2026-09-01", boughtAt: IERI },
  { id: "c-4", name: "pasta", addedAt: OGGI, boughtAt: OGGI },
  { id: "c-5", name: "sale", addedAt: OGGI, boughtAt: null },
];
eq("la più recente prima, poi per nome", nomi(boughtBefore(storico, OGGI)), ["arance", "burro", "uova"]);
eq("«Svuota» toglie solo quelle", nomi(clearBought(storico, OGGI)), ["pasta", "sale"]);

console.log("le quantità (A42–A43)");
eq("un numero davanti è la quantità", parseItem("2 latte"), { name: "latte", qty: "2" });
eq("con l'unità, anche attaccata e in maiuscolo", [parseItem("500g farina"), parseItem("1,5 KG mele")],
   [{ name: "farina", qty: "500 g" }, { name: "mele", qty: "1,5 kg" }]);
eq("le unità scritte per esteso", parseItem("2 litri latte"), { name: "latte", qty: "2 litri" });
eq("senza numero davanti la quantità non c'è", parseItem("latte"), { name: "latte", qty: null });
eq("un numero attaccato al nome resta nel nome", parseItem("3uova"), { name: "3uova", qty: null });
eq("un numero solo si legge «×2», con l'unità com'è", [qtyLabel("2"), qtyLabel("500 g"), qtyLabel(null)], ["×2", "500 g", ""]);
let q = addItem([], "6 uova", OGGI);
eq("aggiunta con la quantità", [q.items[0].name, q.items[0].qty], ["uova", "6"]);
q = addItem(q.items, "12 uova", OGGI);
eq("riscritta con un'altra quantità, la cambia invece di fare un doppione", [q.status, q.items.length, q.items[0].qty], ["updated", 1, "12"]);
eq("riscritta senza numero, resta com'era", addItem(q.items, "uova", OGGI).status, "already");
q = { items: toggleItem(q.items, q.items[0].id, IERI) };
eq("tornando dalle «Già comprate» senza numero tiene la quantità di prima", addItem(q.items, "uova", OGGI).items[0].qty, "12");
eq("con un numero nuovo prende quello", addItem(q.items, "6 uova", OGGI).items[0].qty, "6");

console.log("un elenco che arriva da fuori");
eq("scarta quello che non è una cosa da comprare", nomi(normalize([
  { id: "c-a", name: "mele" }, { id: "c-b", name: "   " }, { name: "senza id" }, null, "testo", { id: 3, name: "id numerico" },
])), ["mele"]);
eq("e completa i campi che mancano", normalize([{ id: "c-a", name: " mele " }])[0], { id: "c-a", name: "mele", qty: null, addedAt: null, boughtAt: null });
eq("un elenco che non è un elenco diventa vuoto", normalize({ items: 3 }), []);

console.log(`\n${pass} passati, ${fail} falliti`);
process.exit(fail ? 1 : 0);
