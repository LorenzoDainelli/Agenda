# Palette candidate

Cartella **temporanea**. Contiene le palette fra cui scegliere e la pagina che
le mette a confronto. Quando una viene scelta diventa `../tokens/colors.css` e
questa cartella si butta.

## Perché esiste

Una palette non si giudica da una tavolozza di quadratini: si giudica sulla
schermata che si guarderà tutti i giorni. `confronto.html` prende il markup
**vero** dell'app e gli cambia sotto soltanto i token, così fra un candidato e
l'altro cambia il colore e nient'altro — non le proporzioni, non i testi, non
cosa c'è dentro le righe.

## Cosa c'è

| file | cos'è |
|---|---|
| `carta.css`, `bosco.css` | i due candidati nuovi, generati e verificati |
| `confronto-token.css` | i tre candidati insieme, ognuno legato al suo `data-palette` — **generato** |
| `confronto.html` | la pagina di confronto — **generata** |

Il terzo candidato non è qui: è `../tokens/colors.css`, la palette in uso.

## Come si rifà

```sh
# 1. i candidati (e il loro rapporto di verifica)
python3 tools/genera-palette.py

# 2. il markup vero dell'app (serve Playwright e l'app servita su :8099)
python3 -m http.server 8099 --directory src &
node test/browser/cattura-schermate.mjs /tmp/markup.json

# 3. la pagina di confronto
python3 tools/confronto-palette.py /tmp/markup.json

# 4. guardarla, e verificare i contrasti su tutte e tre
python3 -m http.server 8098 --directory design_handoff &
node test/browser/confronto-palette.mjs /tmp/scatti
```

I file generati non si modificano a mano: si modifica la ricetta in
`tools/genera-palette.py` e si rigenera. Una modifica fatta al file generato se
ne andrebbe al primo rigeneramento, senza un errore e senza un test rosso.

## Cosa garantisce il generatore

Per ogni candidato, in **entrambi** i temi:

* ogni testo sta sopra la soglia WCAG che gli spetta (4.5:1, o 3:1 se grande);
* il testo sopra ogni gradino del peso passa — e se un gradino cade nella
  fascia di chiarezza in cui non passa né il testo né il bianco, il gradino
  viene spostato invece di annotare un numero che non tiene;
* le sei tonalità delle materie stanno tutte **almeno 50° fuori** dalla
  tonalità del colore d'azione, e a ΔE ≥ 15 da esso: un pallino di materia non
  deve mai leggersi come «questo è toccabile»;
* le due intensità di una tonalità hanno la **stessa** tonalità, così si
  leggono come due versioni dello stesso colore;
* il nome di una tonalità è ricavato dal suo angolo, quindi non può mentire.

Il primo giro di candidati sbagliava le prime tre cose, e la palette in uso
sbaglia ancora la terza nel tema scuro (`petrolio-2` sta a ΔE 10.8 dal colore
d'azione).
