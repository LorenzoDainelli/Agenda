# Agenda

App web personale per i **compiti di scuola**, le **verifiche** e le **cose da
fare**, con la parte che manca alle altre agende: non solo *per quando* una
cosa va fatta, ma **in quali giorni si può fare**.

Il contratto completo del progetto è in [`PIANO-FASE-1.md`](PIANO-FASE-1.md):
**quello comanda**, questo file spiega solo come si usa il codice. Le regole
sempre valide stanno in [`CLAUDE.md`](CLAUDE.md).

## L'idea

Un compito dato lunedì per giovedì non è "un compito di giovedì": è un compito
che si può fare lunedì, martedì o mercoledì. L'app parte da qui.

Ogni compito ha una **finestra**: i giorni fra oggi e il giorno prima della
scadenza. Di serie valgono tutti, e tu intervieni solo dove serve —

- **tocchi** un giorno per escluderlo (*«martedì ho allenamento»*)
- **tieni premuto** per dire che lo farai lì, scegliendo mattina, pomeriggio o
  sera
- **trascini il dito** sulla fila per prenderne più di fila

Non c'è una modalità "intervallo" e una "giorni singoli": è lo stesso gesto.

Una **verifica** usa la stessa regola, e per questo non ha bisogno di un
meccanismo suo: la sua scadenza è il giorno in cui si svolge, e la finestra
sono i giorni in cui si studia. Cambia come si vede, non come si pianifica.

Un compito si può spezzare in **parti**, e una parte può portare un numero:
*«5 frasi da tradurre»* si spunta cinque volte, *«2 esercizi sul libro»* due.
Scrivendo `5 frasi da tradurre` nel campo delle parti, il numero davanti
diventa da sé la quantità.

## Com'è fatta

Sito statico: HTML, CSS e JavaScript **senza librerie, senza build, senza
server**. I file che stanno nel repo sono esattamente quelli che girano sul
telefono. PWA installabile: si aggiunge alla schermata home e funziona offline.

```
design_handoff/     sorgente di verità del sistema visivo
  tokens/           colori (due temi), tipografia, spaziature
  components.css    gli stili dei componenti
src/                l'app — l'unica cartella che viene pubblicata
  css/tokens/       COPIE dei token
  js/               un file per responsabilità (sotto)
```

| file | di cosa risponde |
|---|---|
| `days.js` | date: sempre stringhe `YYYY-MM-DD`, mai oggetti `Date` salvati |
| `i18n.js` | i due dizionari; ogni testo visibile passa da qui |
| `storage.js` | **l'unica porta verso i dati** |
| `model.js` | la regola della finestra, lo stato di un compito, il peso di un giorno |
| `tasks.js` | le domande all'elenco: sezioni, ordinamenti, archivio |
| `subjects.js` | materie, sigle, colori |
| `timetable.js` | gli orari settimanali e la proposta della scadenza |
| `planner.js` | la fila dei giorni e i suoi tre gesti |
| `compose.js` | il pannello di un compito, nuovo o aperto |
| `calendar.js` | settimana e mese |
| `review.js` | la rassegna degli arretrati |
| `settings.js` | le impostazioni, divise in pagine: aspetto, materie, ambiti, compiti, orario, dati |
| `timetable-view.js` | il pannello dell'orario, provvisorio o definitivo |
| `shopping.js` | la lista della spesa: cosa è in lista, cosa è già comprato |
| `shopping-view.js` | il pannello della spesa |
| `backup.js` | il file che esce e quello che rientra |
| `ui.js` | fogli, conferme, notifiche: mai una finestra del browser |
| `app.js` | orchestrazione e schermata «Da fare» |

> Un file `.js` nuovo va aggiunto anche a `CORE_ASSETS` in
> `src/service-worker.js`, se no l'app non parte quando è offline. Il workflow
> di pubblicazione lo controlla e diventa rosso se ci si dimentica.

I file di `src/css/tokens/` e `src/css/components.css` **sono copie**: si
modificano in `design_handoff/` e si ricopiano, perché `src/` deve poter essere
pubblicata da sola. Anche questo lo controlla il workflow.

```sh
cp design_handoff/tokens/*.css src/css/tokens/
cp design_handoff/components.css src/css/components.css
```

## L'orario cambia ogni settimana, e va bene

All'inizio dell'anno l'orario è provvisorio. Per questo l'orario **non è una
griglia: è un elenco di griglie**, ognuna con la settimana da cui vale — lo
stesso schema con cui Shift Hours tiene la paga oraria nel tempo.

Il pulsante *Nuova settimana* crea la griglia della settimana successiva
**copiando l'ultima che esiste**, così si corregge solo quello che è cambiato. E
soprattutto: la settimana scorsa non diventa retroattivamente quella nuova.
Due ore di fila della stessa materia si vedono come una casella sola, più alta.

Si apre dal pulsante con la tabella, in alto a sinistra del calendario. Quando
l'orario è quello giusto, «È l'orario definitivo» lo rende **da guardare e
basta**: le caselle non si toccano più, e un tocco sbagliato non lo cambia. Se
a scuola cambia di nuovo, si torna a modificarlo da *Impostazioni → Orario*.

L'orario serve a una cosa: **proporre la scadenza**. Scrivi un compito di
inglese e l'app propone il giorno della prossima lezione di inglese — non
quella di oggi, che è quella in cui il compito è stato dato.

## Provarla in locale

Serve un server vero: l'app usa i moduli JavaScript, che aprendo il file
direttamente col browser non funzionano.

```sh
python3 -m http.server 8000 --directory src
# poi apri http://localhost:8000
```

## Dove vivono i dati

Solo sul dispositivo, in `localStorage`, sotto quattro chiavi: `agenda:settings`,
`agenda:tasks`, `agenda:timetables`, `agenda:review`. Nessun server, nessun
account, nessuna sincronizzazione. **Nel repo non finisce mai nessun dato
reale**: né un compito, né una materia, né l'orario scolastico.

Due telefoni sono due mondi separati: la stessa app aperta su due dispositivi
non condivide niente.

Siccome i dati vivono solo nel telefono, se qualcuno cancella i dati dei siti in
Impostazioni → Safari, o se si cambia telefono, **non c'è niente da cui
recuperarli**. In *Impostazioni → I tuoi dati* ci sono `Scarica una copia` e
`Ripristina da una copia`. Il ripristino **non cancella mai** un compito più
recente del file.

## Lingua e tema

L'interfaccia è in italiano e in inglese, e segue la lingua del telefono; si può
forzare dalle impostazioni. Lo stesso per il tema chiaro e scuro.

Il tema lo decide uno script inline nel `<head>`, prima che la pagina si
disegni: se lo decidesse `app.js` si vedrebbe un lampo di tema chiaro su un
telefono in tema scuro.

## Quello che l'app non fa

- **Non decide per te.** Non distribuisce i compiti sui giorni da sé: ti mostra
  quanto pesa ogni giornata e scegli tu.
- **Il calendario non modifica niente.** Si guarda.
- **Non ti manda notifiche** (per ora — vedi §8 del piano: si può fare gratis e
  senza far uscire un dato dal telefono, ma è una fase a parte).
- Niente voti, niente medie, niente ricorrenze, niente condivisione con i
  compagni.

## Come si aggiorna dopo che è installata sul telefono

Un push su `main` che tocca `src/**` fa ripubblicare il sito (workflow
`.github/workflows/deploy.yml`). Alla successiva apertura **con connessione**,
il service worker scarica la versione nuova e la applica alla riapertura dopo.
Nessuna reinstallazione, i dati restano.

Non serve toccare `CACHE_VERSION` in `src/service-worker.js`: al momento della
pubblicazione il workflow ci scrive l'identificativo del commit.

### Prima pubblicazione

Da fare una volta sola, su GitHub: **Settings → Pages → Source** = *Deploy from
a branch*, branch **`gh-pages`**, cartella **`/ (root)`**. Il branch `gh-pages`
lo crea il workflow al primo deploy, quindi la voce compare solo dopo che il
workflow è girato almeno una volta.

## Installarla sull'iPhone

Aprire il link **in Safari** → Condividi → *Aggiungi a Home*. È importante
aggiungerla alla home e non lasciarla come semplice scheda del browser: su iOS i
dati dei siti soltanto visitati possono essere cancellati dopo giorni di
inattività, quelli delle app aggiunte alla home no.

> ⚠️ **Non cancellare mai l'icona dalla schermata home** per "forzare" un
> aggiornamento: su iPhone, togliendo l'icona si cancellano anche i dati
> dell'app. L'aggiornamento non ne ha mai bisogno.

## Icone

Le icone sono **segnaposto dichiarate**: quadrato blu con una spunta bianca,
generate da `design_handoff/makeicon.py` (nessuna libreria: un PNG è quattro
chunk e un flusso zlib). Si sostituiscono quando ci sarà un'icona vera.
