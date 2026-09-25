# Agenda — Regole sempre attive

Questa repo contiene **un solo progetto**: un'agenda dei compiti scolastici e
delle cose da fare, per uso personale, che gira sul telefono di chi la scrive.
Ogni sessione che lavora qui legge questo file prima di qualunque task.

Il contratto completo del progetto è in [`PIANO-FASE-1.md`](PIANO-FASE-1.md):
**quello comanda**. Questo file contiene solo le regole che valgono sempre,
anche per le fasi che ancora non esistono.

## Regole NON NEGOZIABILI

1. **I dati sono suoi e restano sul suo telefono.** `localStorage` (domani
   IndexedDB), mai un server, mai un account, mai una sincronizzazione. Nel repo
   non finisce mai un dato reale: né un compito, né una materia, né un orario
   scolastico, né il nome di un professore o di un compagno. Nemmeno come
   esempio, nemmeno in un commento.
2. **Nessun valore estetico fuori dai token.** Colori, dimensioni, raggi,
   durate: vivono in `design_handoff/tokens/`. Se manca un valore si aggiunge un
   token, non un numero. I file di `src/css/tokens/` e `src/css/components.css`
   **sono copie** e non si modificano: si modifica `design_handoff/` e si
   ricopia.
3. **Ogni colore che porta informazione porta il suo contrasto misurato**, nel
   commento accanto, calcolato — non stimato. Se non passa la soglia, o cambia
   il colore o si scrive perché il rischio è accettato.
4. **Mai perdere dati in silenzio.** Niente si cancella da sé. Ogni
   cancellazione chiede conferma dicendo cosa sta per succedere, coi numeri
   dentro. Mai `alert`, `confirm` o `prompt` del browser: le conferme sono
   componenti dell'app.
5. **Mai testo libero dove basta un tocco.** La tastiera si apre solo per i nomi.
6. **Pianificazione prima, costruzione a fasi.** Ogni fase parte da un
   `PIANO-FASE-N.md` scritto **prima** di qualunque riga di codice, con task
   atomici, file esatti e criteri di accettazione verificabili. Ci si ferma dopo
   ogni fase e si fa provare il risultato.
7. **Mai inventare dati o funzionalità non richieste.** Se manca
   un'informazione, fermarsi e chiedere. Se si è costretti a decidere da soli,
   la decisione va scritta come **assunzione** nel piano, con come si ribalta.
8. **Nessun file fuori dal piano** della fase su cui si sta lavorando.

## Come è fatta

Sito statico: HTML, CSS e JavaScript senza librerie, senza build, senza server.
**I file che stanno nel repo sono esattamente quelli che girano sul telefono.**
PWA installabile: si aggiunge alla schermata home e funziona offline.

```
design_handoff/     sorgente di verità del sistema visivo (token + componenti + reference)
src/                l'app, l'unica cartella che viene pubblicata
```

Un file `.js` nuovo va aggiunto anche a `CORE_ASSETS` in
`src/service-worker.js`, se no l'app non parte offline.

```sh
# dopo aver modificato il sistema visivo
cp design_handoff/tokens/*.css src/css/tokens/
cp design_handoff/components.css src/css/components.css
```

## Provarla in locale

Serve un server vero: l'app usa i moduli JavaScript, che aprendo il file
direttamente col browser non funzionano.

```sh
python3 -m http.server 8000 --directory src
```

## Lingua

Interfaccia in **italiano e inglese**, segue la lingua del telefono. Ogni testo
visibile passa da `src/js/i18n.js`: una stringa scritta a mano dentro l'HTML o
dentro un altro `.js` è un errore, perché esiste in una lingua sola.

Documentazione di repo e **commenti nel codice: italiano**. I commenti spiegano
*perché*, non *cosa*: il cosa si legge dal codice.
