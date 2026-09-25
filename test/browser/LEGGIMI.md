# Prove nel browser

Le prove in `test/` non hanno bisogno di niente: provano le regole pure
(`node test/tutti.mjs`). Queste qui invece guidano l'app in un browser vero, e
**hanno bisogno di Playwright**, che non è una dipendenza del progetto — l'app
non ha dipendenze, e non è il caso di aggiungerne una per le prove.

```sh
npm install playwright            # una volta sola, fuori dal repo se preferisci
npx playwright install chromium

python3 -m http.server 8099 --directory src   # in un altro terminale
node test/browser/percorso-base.mjs
```

| file | cosa verifica |
|---|---|
| `percorso-base.mjs` | materie, orario, creazione di un compito, i tre gesti sulla fila dei giorni, le parti spuntate dall'elenco nei due modi dell'impostazione, i giorni delle singole parti (chip «quando», elenco, calendario), spunta con annulla, le cose fatte che restano fino a mezzanotte (anche con l'app aperta davanti), calendario, temi, lingue |
| `archivio-copia-offline.mjs` | archivio, giro completo della copia di sicurezza (compreso «il ripristino non cancella quello che è più recente del file»), file non valido, avvio in aereo |
| `contrasti.mjs` | risale il fondo effettivo di ogni testo renderizzato nei due temi e lo confronta con la soglia WCAG che gli spetta — gradienti e opacità compresi |
| `riferimento.mjs` | `design_handoff/reference.html` si apre senza errori nei due temi |

`contrasti.mjs` è quello che conta di più: i numeri nei commenti dei token si
possono sbagliare, e si sono sbagliati (il testo del blocco in cima era
misurato sull'estremo scuro del gradiente invece che su quello chiaro). Questo
misura quello che si vede davvero.

I percorsi dentro questi file puntano a `http://localhost:8099`.

L'orologio del browser è fermo a **lunedì 21 settembre 2026, alle dieci**
(`ctx.clock.setFixedTime`): i dati finti hanno date scritte per quel giorno, e
senza fermarlo le prove fallirebbero dal giorno dopo per colpa del calendario.
