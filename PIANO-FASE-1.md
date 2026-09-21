# Piano-contratto — Fase 1: Agenda dei compiti

> Documento autosufficiente per l'esecutore. Non deve servire altro ragionamento
> oltre a quanto scritto qui. Se qualcosa è ambiguo o manca, fermati e chiedi —
> non improvvisare.
>
> Il piano comanda: in caso di conflitto fra questo file e il `README.md`, vale
> questo. Le decisioni prese dall'utente sono in sezione 1, quelle prese
> dall'esecutore in sua assenza sono in **sezione 2 (assunzioni)** e vanno
> considerate provvisorie: si ribaltano senza discutere.

---

## 0. Contesto

App web personale per **Lorenzo**, studente di un istituto tecnico (ITIS),
sei giorni di scuola a settimana. Serve a tenere insieme due cose che oggi
stanno in posti diversi o in nessun posto: **i compiti e le verifiche di
scuola** e **le cose da fare private**.

Il problema vero non è ricordarsi *cosa* c'è da fare — è decidere **quando
farlo**. Un compito dato lunedì per giovedì si può fare lunedì, martedì o
mercoledì; un compito lungo si spezza in due sere; una verifica non si "fa
prima", si studia nei giorni che la precedono. Un'app che sa solo elencare
scadenze non serve a niente che un foglio di carta non faccia meglio.

**Dispositivo di riferimento: iPhone, Safari, aggiunta alla schermata home.**
Deve funzionare in modo decente su desktop, ma iPhone è il target su cui si
decide ogni compromesso.

**Lingua: interfaccia bilingue italiano/inglese**, segue la lingua del telefono
e si può forzare dalle impostazioni. Documentazione di repo e commenti nel
codice: italiano.

---

## 1. Regole NON NEGOZIABILI

1. **Nessun backend, nessun account, nessun login.** Sito statico. L'app si apre
   da un link e funziona. (Le notifiche push sono in stand-by: vedi §8.)
2. **I dati vivono solo sul dispositivo.** `localStorage`, sotto le chiavi di §4.
   Nel repo non finisce mai un dato reale: né un compito, né una materia, né un
   orario scolastico, né un nome di professore.
3. **Nessun colore, dimensione o durata scritti a mano fuori dai token** di
   `design_handoff/`. Se manca un valore si aggiunge un token, non un numero.
4. **Ogni colore che porta informazione ha il suo contrasto misurato e scritto
   nel commento accanto.** Mai un rapporto stimato a occhio, mai un numero
   inventato. Se un contrasto non passa la soglia, o si cambia il colore o si
   scrive esplicitamente che il rischio è noto e perché è accettato.
5. **Mai perdere dati in silenzio.** Nessuna cancellazione automatica, nessuna
   archiviazione senza che si veda. Ogni cancellazione chiede conferma dicendo
   cosa sta per succedere, coi numeri dentro. Mai una finestra del browser
   (`confirm`, `alert`, `prompt`): le conferme sono componenti dell'app.
6. **Spuntare non è cancellare.** Un compito fatto resta recuperabile
   dall'archivio. Un tocco sbagliato si annulla.
7. **Mai testo libero dove basta un tocco.** La tastiera si apre solo per i nomi
   (titolo del compito, nome della materia, nome della parte). Date, materie,
   pesi, momenti della giornata, giorni: sempre a tocchi.
8. **Un file `.js` nuovo va aggiunto a `CORE_ASSETS` in
   `src/service-worker.js`**, altrimenti l'app non parte offline.
9. **`src/` deve essere pubblicabile da sola.** I token e `components.css` di
   `design_handoff/` sono **copiati** in `src/css/`, non linkati.
10. **Target di tocco mai sotto 44×44 px.**
11. **La persistenza sta dietro un'interfaccia sola** (`src/js/storage.js`).
    Nessun altro file chiama `localStorage` direttamente: il giorno in cui
    servono le notifiche si passa a IndexedDB cambiando quel file e nient'altro.
12. **Nessun file fuori da quelli elencati in §3** senza istruzione esplicita.

---

## 2. Assunzioni dell'esecutore (provvisorie, da confermare)

Queste quattro decisioni sono state prese in assenza dell'utente per non
fermare il lavoro. Sono tutte isolate in modo da poter essere ribaltate senza
riscrivere l'app.

| # | Assunzione | Stato |
|---|---|---|
| A1 | Colore d'azione: blu `#0066CC`, il blu del tema ufficiale delle scuole italiane, preso come base plausibile perché il sito dell'istituto non era raggiungibile dal proxy di rete dell'ambiente di sviluppo. | **Superata.** L'utente ha chiesto di non copiare la scuola e ha indicato la direzione «sobria e seria»: il colore d'azione è il blu notte `#16405C`, scelto fra otto candidati misurati come quello che si confonde meno con i colori delle materie. |
| A2 | Inserimento: pannello unico con chips e parti già dentro. | **Confermata** dall'uso: un compito completo si crea in quattro tocchi più il titolo. |
| A3 | Dimensionamento per 9-12 materie. | **Confermata.** |
| A4 | Elenco raggruppato per giorno, arretrati sempre in cima. | **Confermata.** |

### Decise dall'utente il 21 settembre 2026, dopo aver visto l'app

| cosa | decisione |
|---|---|
| voti delle verifiche | **non si fanno**: il registro elettronico c'è già, e due posti che dicono lo stesso voto sono uno di troppo |
| colori delle materie | la prima tavolozza (undici colori saturi) è stata bocciata: «sembra un parco giochi per bambini». Rifatta in sei tonalità × due intensità, tutte al 30% di saturazione (vedi il commento nei token) |
| blocco in cima | il grande rettangolo colorato col numero è stato sostituito dalla **striscia dei prossimi giorni** col peso di ognuno, più un avviso che compare solo quando c'è un arretrato o una verifica entro domani |
| righe dei compiti | al posto di «0 di 2», il **nome** di quello che resta da fare |
| calendario settimana | rifatto da zero con la forma della griglia dell'orario: giorni in colonna, momenti in riga, la settimana intera in una schermata |

### Decise dall'utente il 21 settembre 2026, nel secondo giro di domande

| cosa | decisione |
|---|---|
| nome dell'app | **Agenda**, definitivo. Non era più provvisorio da qui in avanti: è il nome sotto l'icona |
| pubblicazione | la repo diventa **pubblica**. GitHub Pages su una repo privata richiede un piano a pagamento, e nella repo non c'è un solo dato personale (regola 1): renderla pubblica costa niente e non espone niente |
| palette | nessuna delle tre direzioni è stata scelta a scatola chiusa: sono state **generate tutte e tre e messe a confronto sulla schermata vera** (`design_handoff/palette-alternative/confronto.html`). La scelta arriva dopo averle guardate sul telefono |
| ambito privato | **ancora non deciso**: resta come sta (un compito senza materia, con la scadenza che può mancare) e si decide quando l'uso reale avrà detto cosa serve |

Rimasta aperta e **non** decisa: la forma definitiva dell'ambito privato
(vedi §6.4). Il nome dell'app non è più in questa lista.

---

## 3. Struttura file attesa

Il progetto sta **alla radice della repo** (decisione dell'utente): la repo
`Agenda` *è* il progetto.

```
/
  README.md                     come si usa e come si pubblica
  CLAUDE.md                     regole sempre attive per chi lavora qui
  PIANO-FASE-1.md               questo file
  design_handoff/               sorgente di verità del sistema visivo
    tokens/
      colors.css                colori, tema chiaro e scuro
      typography.css            tipografia
      space.css                 spaziature, raggi, ombre, movimento
    components.css              stili dei componenti
    reference.html              pagina di riferimento dei componenti
  src/                          l'app: l'unica cartella pubblicata
    index.html
    manifest.webmanifest
    service-worker.js
    css/
      styles.css                entry: solo @import
      app.css                   layout specifico dell'app
      components.css            COPIA da design_handoff/
      tokens/*.css              COPIE da design_handoff/tokens/
    js/
      app.js                    orchestrazione, avvio, schermata «Da fare»
      i18n.js                   dizionario e sostituzione dei testi
      days.js                   date: ISO, settimane, formati, nomi dei giorni
      storage.js                unica porta verso la persistenza
      model.js                  modello dei compiti: stato, finestra dei giorni
      subjects.js               materie e loro colori
      timetable.js              orari settimanali e proposta della scadenza
      tasks.js                  query sui compiti: raggruppamenti, ordinamenti
      compose.js                pannello di inserimento e modifica
      planner.js                selettore dei giorni e dei momenti
      calendar.js               viste settimana e mese
      review.js                 rassegna degli arretrati
      settings.js               materie, orario, ambiti, dati
      ui.js                     fogli, conferme, notifiche, scelta di un giorno
      backup.js                 esportazione e ripristino
    icons/
      icon-192.png
      icon-512.png
  test/                         prove delle regole pure, senza browser
    tutti.mjs                   le esegue tutte: `node test/tutti.mjs`
    days.mjs                    date e casi limite di calendario
    model.mjs                   la finestra, lo stato, le parti, il peso
    timetable.mjs               orari nel tempo, blocchi, proposta scadenza
    tasks.mjs                   sezioni, ordinamenti, archivio
    browser/                    prove che guidano l'app in un browser vero
                                (servono Playwright: vedi test/browser/LEGGIMI.md)
      audit.mjs                 il controllo dei contrasti sulla pagina renderizzata
      contrasti.mjs             lo passa su cinque schermate dell'app, nei due temi
      cattura-schermate.mjs     salva il markup vero dell'app, per il confronto palette
      confronto-palette.mjs     guarda le palette candidate e le verifica
      percorso-base.mjs         il giro completo: creare, pianificare, spuntare
      archivio-copia-offline.mjs  archivio, copia di sicurezza, funzionamento offline
      riferimento.mjs           la pagina di riferimento dei componenti
  tools/                        strumenti di progetto, non finiscono nell'app
    colore.py                   matematica del colore: contrasti WCAG, CIELAB, ΔE
    genera-palette.py           genera una palette intera dai suoi vincoli
    confronto-palette.py        costruisce la pagina di confronto delle palette
    colori-fuori-dai-token.py   controlla i pochi colori che stanno fuori dai token
  .github/workflows/deploy.yml  pubblica src/ su GitHub Pages
```

Dentro `design_handoff/` c'è anche `palette-alternative/`, che contiene i
candidati da guardare e la pagina che li confronta. **Non è una cartella
definitiva**: quando una palette viene scelta diventa `tokens/colors.css` e
tutta la cartella si butta.

> **Due file in più rispetto alla prima stesura di questo piano**, aggiunti in
> corso d'opera e scritti qui perché il piano resti la verità: `ui.js` (i
> mattoni condivisi dell'interfaccia — fogli, conferme, notifiche — che
> altrimenti sarebbero finiti in `app.js` creando una dipendenza circolare con
> tutti gli altri moduli) e `settings.js` (il pannello impostazioni, che da
> solo è grosso quanto tre schermate e in `app.js` l'avrebbe raddoppiato).

---

## 4. Modello dati

Tutte le date sono stringhe ISO `YYYY-MM-DD`, mai oggetti `Date` salvati.
I giorni della settimana sono numeri **1 = lunedì … 7 = domenica** (ISO).

### 4.1 `agenda:settings`

```js
{
  version: 1,
  lang: null,          // null = segue il telefono; "it" | "en"
  theme: null,         // null = segue il telefono; "light" | "dark"
  subjects: [          // le materie dell'anno, inserite da lui
    { id: "s-1", name: "Inglese", short: "INGL", color: "sky" }
  ],
  areas: [             // SOLO gli ambiti personalizzati: i due fissi non stanno qui
    { id: "a-1", name: "Palestra", color: "lime" }
  ],
  lessonsPerDay: 6,    // righe della griglia dell'orario
  schoolDays: [1,2,3,4,5,6]
}
```

### 4.2 `agenda:timetables`

Elenco di orari, **il più recente per primo**. Ognuno porta il lunedì della
settimana da cui vale. L'orario valido per una data è quello con `weekStart`
più grande fra quelli `<=` al lunedì di quella data — lo stesso schema con cui
Shift Hours gestisce le paghe orarie nel tempo.

```js
[
  {
    weekStart: "2026-09-21",
    // chiave = giorno 1..6; array lungo lessonsPerDay; null = ora libera
    grid: { "1": ["s-1","s-1","s-3",null,null,null], "2": [...] }
  }
]
```

Il pulsante `+` crea l'orario della **prossima settimana** (o di questa, se non
c'è), **copiando la griglia dell'ultimo orario esistente**. Si corregge da lì.

### 4.3 `agenda:tasks`

```js
[
  {
    id: "t-k3f9",
    area: "school" | "private" | "a-1",
    subjectId: "s-1" | null,       // sempre null fuori da "school"
    kind: "homework" | "test" | "todo",
    title: "Compiti di inglese",
    due: "2026-09-25" | null,      // per una verifica è il GIORNO della verifica
    weight: 1 | 2 | 3,             // leggero | medio | pesante
    createdAt: "2026-09-21",
    doneAt: null | "2026-09-23",
    droppedAt: null | "2026-09-23",// "non serve più": non fatto, non in ritardo
    plan: {
      skip: ["2026-09-23"],        // giorni della finestra esclusi da lui
      pick: { "2026-09-22": "evening" }  // giorni scelti → momento della giornata
    },
    parts: [
      { id: "p-1", title: "Traduzione 5 frasi", total: 5, done: 5,
        pick: { "2026-09-22": "evening" } },
      { id: "p-2", title: "2 esercizi libro",   total: 2, done: 0, pick: {} }
    ]
  }
]
```

- `total: 1` è una parte a spunta secca; `total > 1` è una parte con quantità e
  barra di progresso. Una parte senza `pick` è una voce di checklist: la
  pianificazione resta del compito intero. **Le tre forme chieste dall'utente
  sono lo stesso oggetto**, non tre tipi diversi.
- `momento` ∈ `"morning" | "afternoon" | "evening"`.

### 4.4 `agenda:review`

```js
{ lastReviewedOn: "2026-09-21" }   // ultimo giorno in cui ha risposto alla rassegna
```

---

## 5. La regola della finestra (il cuore dell'app)

Un compito non ha "un giorno": ha una **finestra** di giorni in cui si può
fare. È l'unico meccanismo di pianificazione dell'app, e copre tutti i casi
che l'utente ha descritto senza modalità da scegliere.

```
finestra(compito) = [ oggi … due − 1 giorno ] − plan.skip
```

- **Estremo destro escluso**: un compito "per giovedì" si fa entro mercoledì.
  Se `due − 1 < oggi` ma `oggi <= due`, la finestra è il solo giorno di oggi:
  è l'ultimo momento utile.
- **Una verifica usa la stessa regola.** Il suo `due` è il giorno in cui si
  svolge, e quello che si pianifica nei giorni prima è lo **studio**. Per questo
  non serve un secondo meccanismo: una verifica è un compito la cui finestra
  finisce il giorno prima della data, per costruzione.
- **Di default tutta la finestra è valida** e `skip` è vuoto: un compito appena
  inserito è già pianificato in modo utile, senza un tocco.
- **Tocco su un giorno = lo escludi** (entra in `skip`).
- **Tocco tenuto su un giorno = lo scegli** (entra in `pick`, con il momento
  della giornata). Un giorno scelto non può essere escluso.
- Un **intervallo** e **giorni sparsi** non sono due cose: trascinando il dito
  sulla fila dei giorni si escludono o si scelgono più giorni di fila.

### 5.1 Il giorno in cui un compito "compare"

```
giornoDiLavoro(compito) = il più piccolo dei giorni in plan.pick,
                          altrimenti due,
                          altrimenti nessuno (cosa senza data)
```

È questo che decide dove il compito sta nell'elenco e nel calendario. Un
compito senza giorni scelti compare sulla sua scadenza, marcato **da
pianificare**: l'app non decide per lui, ma non lo nasconde nemmeno.

### 5.2 Stato di un compito

| stato | condizione | dove si vede |
|---|---|---|
| `done` | `doneAt` valorizzato | archivio |
| `dropped` | `droppedAt` valorizzato | archivio |
| `late` | non fatto e `due < oggi` | in cima, sempre |
| `today` | `giornoDiLavoro == oggi` | sezione Oggi |
| `planned` | tutto il resto con una data | sezione del suo giorno |
| `undated` | `due == null` e nessun `pick` | sezione Senza data |

Una parte non ha uno stato suo: è fatta quando `done >= total`. **Un compito si
spunta da sé quando tutte le sue parti sono fatte**, e spuntando il compito si
spuntano tutte le parti.

---

## 6. Schermate

Cinque in tutto, e solo la prima è una vera schermata: le altre sono pannelli
che si aprono sopra e si chiudono con una ✕, come in Shift Hours.

### 6.1 Da fare (si apre sempre qui)

Testata: titolo + tre icone (calendario, archivio, impostazioni).

Sotto, due cose e in quest'ordine:

1. un **avviso**, che compare *solo* quando c'è un arretrato o una verifica
   entro domani. Un avviso che c'è sempre non è un avviso;
2. la **striscia dei prossimi sette giorni**, ognuno col fondo del suo peso e
   il numero di cose che ci sono. Non è un riepilogo, è uno strumento: serve a
   rispondere alla domanda «dove lo metto?», che è il problema dell'app — e a
   quella domanda il numero di cose di oggi non risponde. Toccando un giorno si
   apre il calendario su quel giorno.

Elenco a sezioni, nell'ordine: **In ritardo**, **Oggi**, **Domani**,
**Questa settimana**, **Più avanti**, **Senza data**. Dentro ogni sezione:
prima le verifiche, poi per peso decrescente, poi per titolo.

Ogni riga: titolo, riga secondaria con materia (col suo pallino) · scadenza ·
**cosa resta da fare** · peso, e il cerchio della spunta a destra (44×44).

«Cosa resta» e non «quante parti restano»: un compito con due parti di cui una
fatta non dice `1 di 2` ma `restano: esercizi sul libro`, perché la domanda
vera è *che cosa mi manca*. Con tre parti o più torna il conto, perché tre nomi
in fila fanno di una riga un paragrafo.

Le verifiche portano il loro colore e un contorno: sono l'unica cosa che non si
può rimandare.

Un filtro in testa all'elenco con gli ambiti: **Tutto · Scuola · Privato · …**

Toccando una riga si apre il compito (§6.5). Toccando il cerchio si spunta:
la riga si barra, resta per qualche secondo con un toast "fatto — annulla",
poi scompare.

In basso, fisso, il pulsante `+`.

### 6.2 Calendario

Due viste commutabili, **settimana** (di partenza) e **mese**.

- **Settimana**: una **griglia** con la stessa forma di quella dell'orario —
  sette colonne (i giorni) per tre righe (mattina, pomeriggio, sera), più una
  quarta riga per quello che scade quel giorno senza essere stato pianificato.
  Dentro le caselle, blocchetti col colore della materia e la sua sigla.
  L'intestazione di ogni colonna porta il fondo del **peso** di quel giorno,
  sui gradini fissi dei token (gradini fissi e non calcolati, così il
  contrasto del testo sopra è garantito per costruzione).
  In 42px di colonna ci sta una sigla e non un titolo: per questo sotto la
  griglia c'è l'elenco per esteso del giorno scelto, e toccando
  un'intestazione si cambia giorno. La griglia dice DOVE, l'elenco dice COSA.
  *(La prima versione erano sette card una sotto l'altra: l'utente l'ha
  bocciata perché per vedere la settimana bisognava scorrere tre schermate.)*
- **Mese**: i mesi uno sotto l'altro, si scorre. Ogni casella: numero del
  giorno, fondo colorato per peso, e un anello attorno al numero se quel giorno
  c'è una verifica. Toccando un giorno si apre la settimana su quel giorno.

**Il calendario non modifica niente. Si guarda.** (Toccare un compito lo apre,
e da lì si modifica: ma il calendario in sé non ha azioni.)

### 6.3 Archivio

Le cose fatte e quelle lasciate cadere, più recenti prima, raggruppate per mese.
Ogni riga si può **rimettere da fare** con un tocco. Niente si cancella da sé.

### 6.4 Impostazioni

Quattro gruppi:
1. **Materie** — elenco con nome, sigla e colore. Aggiungi, rinomina, cambia
   colore, elimina. Eliminare una materia **non cancella i compiti**: restano
   col nome che avevano (come il `typeName` congelato di Shift Hours).
2. **Orario** — la griglia della settimana valida oggi, il `+` che crea quella
   nuova copiando l'ultima, e l'elenco degli orari con la data da cui valgono.
   Ore consecutive della stessa materia si fondono in una casella più alta.
3. **Ambiti** — Scuola e Privato ci sono sempre; qui si aggiungono gli altri.
4. **I tuoi dati** — `Scarica una copia`, `Ripristina da una copia`, lingua,
   tema.

> **Ambito privato, fase 1**: una cosa privata è lo stesso oggetto di un
> compito (`kind: "todo"`), senza materia e con la scadenza che può mancare.
> Ricorrenze e appuntamenti **non** sono in questa fase: si aggiungono quando
> l'uso reale dirà se servono.

### 6.5 Il compito aperto

Un pannello, non una schermata: titolo, materia, tipo, scadenza, peso, la fila
dei giorni della finestra (§5), le parti con le loro spunte e quantità, e in
fondo `Elimina`. Tutto modificabile sul posto.

---

## 7. La rassegna degli arretrati

Alla prima apertura di un giorno nuovo, se esiste almeno un compito in ritardo
e la rassegna non è già stata fatta oggi (`agenda:review`), si apre un pannello
che li mostra **uno per volta**, con tre risposte grandi:

- **Fatto** → `doneAt = oggi`
- **Rimanda** → sceglie la nuova scadenza fra chips (domani, dopodomani, la
  prossima lezione di quella materia, altro)
- **Non serve più** → `droppedAt = oggi`

Si può chiudere la rassegna a metà: quello che resta torna in cima all'elenco,
e la rassegna **non si ripropone lo stesso giorno**. Nessun compito resta in uno
stato ambiguo, ma non si viene mai bloccati.

---

## 8. Notifiche — fuori da questa fase, e perché

L'utente le ha messe in stand-by. Restano qui scritte le due cose da sapere
quando si riprenderà il discorso, per non rifare il ragionamento da zero:

1. Un'app web non può programmare una notifica da sola: ad app chiusa non
   esegue codice. Serve un pezzo nel cloud con una sveglia (gratis: Cloudflare
   Workers Cron, GitHub Actions schedule).
2. **Esiste un disegno che non fa uscire un solo dato dal telefono**: il cron
   manda una notifica *vuota* a orario fisso (conosce solo un token opaco di
   consegna); il service worker si sveglia, **legge i compiti sul telefono** e
   compone lui il testo. Perché questo funzioni i dati devono stare in
   **IndexedDB** e non in `localStorage` — un service worker non può leggere
   `localStorage`. È il motivo della regola 11: tutta la persistenza passa da
   `storage.js`, e quel giorno si cambia solo quel file.

---

## 9. Task

Ogni task si chiude fermandosi e facendo provare il risultato prima del
successivo.

### Task 0 — Sistema visivo
`design_handoff/tokens/*.css`, `design_handoff/components.css`,
`design_handoff/reference.html`.

- Token per tema chiaro **e** scuro, con `prefers-color-scheme` e sovrascrittura
  via `data-theme` sull'elemento radice.
- 11 colori materia, ognuno con tre valori per tema (pieno, chip, testo sul
  chip) e **il contrasto misurato scritto accanto**.
- Sei gradini di peso per il calendario, ognuno con l'inchiostro già verificato.
- **Accettazione**: `reference.html` mostra ogni componente previsto nelle due
  schermate intere (Da fare, Calendario) alla larghezza di un iPhone, si apre
  senza errori in console, e passando il tema del sistema da chiaro a scuro
  nessun testo scende sotto 4,5:1.

### Task 1 — Shell, PWA, i18n, tema
`src/index.html`, `src/css/*`, `src/manifest.webmanifest`,
`src/service-worker.js`, `src/icons/*`, `src/js/i18n.js`, `src/js/days.js`.

- **Accettazione**: si apre in aereo dopo il primo caricamento; aggiunta alla
  home da Safari; cambiando la lingua del telefono l'app cambia lingua;
  rispetto della safe area; nessuna barra di scorrimento orizzontale.

### Task 2 — Persistenza e modello
`src/js/storage.js`, `src/js/model.js`.

- **Accettazione**: nessun altro file cita `localStorage`; la finestra di §5 è
  una funzione pura con i casi limite coperti (creato oggi per domani, creato
  oggi per oggi, già scaduto, senza scadenza).

### Task 3 — Materie e orario
`src/js/subjects.js`, `src/js/timetable.js`, pannello impostazioni.

- **Accettazione**: il `+` crea la settimana nuova copiando l'ultima; l'orario
  di una settimana passata non cambia quando si crea quello nuovo; scegliendo
  una materia il pannello di inserimento propone la data della sua prossima
  lezione.

### Task 4 — Inserimento e compito aperto
`src/js/compose.js`, `src/js/planner.js`.

- **Accettazione**: un compito con titolo, materia, scadenza e peso si crea in
  **quattro tocchi più il titolo**; nessuna tastiera per le date; le parti si
  aggiungono senza uscire dal pannello.

### Task 5 — Elenco Da fare
`src/js/tasks.js`, `src/js/app.js`.

- **Accettazione**: sezioni nell'ordine di §6.1; spunta con annulla; il filtro
  per ambito non fa sparire le sezioni vuote in modo confuso (una sezione vuota
  non si disegna).

### Task 6 — Calendario
`src/js/calendar.js`.

- **Accettazione**: settimana e mese; i pesi colorano i giorni sui gradini
  fissi; una verifica si riconosce senza leggere; il calendario non modifica
  niente.

### Task 7 — Rassegna degli arretrati
`src/js/review.js`.

- **Accettazione**: si apre una volta al giorno; chiudendola a metà non si
  ripropone; ogni risposta lascia il compito in uno stato definito.

### Task 8 — Archivio e copie di sicurezza
`src/js/backup.js`, pannello archivio.

- **Accettazione**: il file esportato si ripristina; il ripristino **non
  cancella mai** un compito più recente del file; un compito fatto si rimette
  da fare con un tocco.

### Task 9 — Pubblicazione
`.github/workflows/deploy.yml`.

- Pubblica **solo** `src/` sulla root del branch `gh-pages`, e scrive nel
  service worker l'identificativo del commit come versione della cache, così
  nessuno può dimenticarsi di alzarla a mano.
- **Accettazione**: un push su `main` che tocca `src/**` ripubblica; l'app già
  installata sul telefono riceve la versione nuova alla riapertura successiva.

---

## 9-bis. Cosa si controlla da sé

Tre cose non si possono verificare guardando l'app, e allora le controlla il
workflow di pubblicazione (`.github/workflows/deploy.yml`), che diventa rosso:

1. **I token e `components.css` in `src/` sono copie fedeli** di
   `design_handoff/`. Senza questo controllo, una regola scritta nella copia
   invece che nella sorgente se ne andrebbe al primo ricopiaggio, senza un
   errore e senza un test rosso. (È esattamente l'incidente che MyMoney
   racconta nel suo `design_handoff_mymoney/README.md`, dove quarantuno righe
   sono sparite così.)
2. **Ogni file `.js` è in `CORE_ASSETS`** del service worker. Un modulo
   dimenticato non si nota provando l'app online: si nota in aereo, cioè
   quando è troppo tardi.
3. **La versione della cache** porta l'identificativo del commit, scritto dal
   workflow: nessuno può dimenticarsi di alzarla a mano.

Le regole pure — la finestra, le sezioni, l'orario, le parti — hanno una
batteria di prove in `test/`, che si esegue con `node test/tutti.mjs` e non ha
bisogno di un browser.

---

## 10. Cosa NON c'è in questa fase

Scritto per evitare che venga aggiunto di iniziativa:

- notifiche push (§8) — in stand-by
- voti e medie delle verifiche — non chiesti
- ricorrenze e appuntamenti a ora fissa — non ancora decisi (§6.4)
- orari reali delle ore di lezione (la campanella): l'orario è **solo una
  sequenza** di ore, decisione dell'utente
- sincronizzazione fra dispositivi, condivisione con compagni, allegati, foto
- qualunque forma di distribuzione automatica dei compiti sui giorni: l'app
  mostra il carico, **non decide per lui**
