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

### Decise dall'utente il 25 settembre 2026, nel terzo giro di domande

| cosa | decisione |
|---|---|
| palette | **Notte**, quella che c'era già. Le due alternative (Carta, Bosco) sono state guardate e scartate: la cartella `palette-alternative/` è stata buttata come previsto, e gli strumenti che l'hanno generata restano in `tools/` |
| un compito fatto | **resta al suo posto, barrato, fino a mezzanotte**; poi passa nell'archivio. Prima spariva subito, e l'unico modo di rimediare a un tocco sbagliato era il toast di cinque secondi |
| le parti nell'elenco | **tutte sotto la riga del compito**, quelle fatte barrate, ognuna con il suo cerchio da spuntare senza aprire il compito. La scritta «restano: …» accanto al titolo sparisce: sarebbe un doppione di quello che si vede sotto |
| il tocco su una parte con un numero («5 frasi») | **si sceglie dalle impostazioni**: `+1 a ogni tocco` oppure `un tocco la fa tutta` |
| il petrolio nel tema scuro | i due petrolio distavano dal colore d'azione ΔE 10.8 e 12.2, sotto la soglia di 15 che vale per tutte le altre materie. Gli è stata mostrata la correzione prima/dopo (tinta da 217° a 200°, luminosità e intensità invariate) e ha scelto di **correggerlo**, in tutti e due i temi. Ora la materia più vicina al colore d'azione sta a ΔE 16.1 |
| il nome di una parte, toccato dall'elenco | **apre il compito**, come il titolo; la parte si spunta solo dal suo cerchio |
| giorni diversi per le singole parti | **sì, dal compito aperto** |
| come si dà un giorno a una parte | un **chip «quando»** su ogni parte, nel compito aperto: toccandolo sale un foglio coi giorni della finestra e i tre momenti |
| una parte con un giorno, nell'elenco | il compito compare **una volta sola, nel giorno della prossima parte da fare**, con sotto tutte le parti e accanto a ognuna il suo giorno. Finita quella, passa al giorno della successiva |
| una parte con un giorno, nel calendario | **un blocchetto per ogni parte**, nel suo giorno e nel suo momento; sotto la griglia, il nome della parte accanto al compito |
| il peso di un compito diviso in parti | **si divide fra le parti**: un compito pesante (3) in due parti su due giorni fa 1.5 per giorno, arrotondato |
| la domenica | **vale come gli altri giorni**: se una domenica non si vuole fare niente, la si esclude a mano |
| una parte non fatta nel suo giorno | il suo giorno si legge **in rosso** («ieri · sera»), come la scadenza di un compito in ritardo; il compito sta già in Oggi |
| copia di sicurezza | l'app **ricorda di scaricarla una volta al mese**, con un avviso sulla strada come quello della rassegna |
| quando per oggi è tutto fatto | **niente**: le righe restano barrate fino a mezzanotte, il numerino dice 0, l'app non fa i complimenti |
| i blocchetti della settimana (24px, sotto i 44 della regola 10) | **si tocca la colonna, non il blocchetto**: un tocco in un punto qualsiasi della colonna di un giorno mostra quel giorno per esteso sotto la griglia, e da lì si apre il compito |
| la rassegna di un compito con parti | **le parti, da spuntare una per una**; per il resto si risponde Rimanda o Non serve più |
| spuntare scorrendo | **sì**: trascinando la riga verso destra si spunta, con l'annulla nel toast. Il cerchio resta |
| l'ordine dentro una sezione | **resta com'è**: verifiche, poi peso, poi scadenza |

#### Assunzioni prese nel farlo (si ribaltano senza discutere)

| # | Assunzione | Come si ribalta |
|---|---|---|
| A5 | Il modo di partenza delle parti con un numero è **+1 a ogni tocco**: è quello che l'utente aveva davanti come consigliato quando ha chiesto l'impostazione. Da piena, un altro tocco la riporta a zero, e il toast offre l'annulla. | `partTap` in `DEFAULT_SETTINGS` di `storage.js` |
| A6 | Il numerino accanto al nome di una sezione conta **quello che resta**, non le righe: una sezione con solo cose barrate dice 0. Allo stesso modo i filtri, la striscia dei prossimi giorni e l'avviso in cima ignorano le cose fatte. | `sections()` in `tasks.js` |
| A7 | Toccare di nuovo il cerchio di un compito fatto oggi lo rimette da fare **com'era prima della spunta**, parti comprese, finché l'app resta aperta. Senza questo, spuntare per sbaglio un compito con tre parti di cui una fatta e poi togliere la spunta lascerebbe tutte e tre barrate. Dopo aver chiuso l'app resta solo il toast, che dura cinque secondi, e togliendo la spunta le parti restano come sono. | `tickOff()` in `app.js` |
| A8 | Il toast compare solo quando un tocco su una parte cambia lo stato del compito (lo chiude o lo riapre) o azzera una parte con un numero. Le altre spunte si tolgono ritoccando lo stesso cerchio, e un toast per ogni tocco sarebbe rumore. | `tapPartInList()` in `app.js` |
| A9 | Le cose **lasciate cadere** («non serve più») vanno subito nell'archivio: non sono fatte, e barrarle nell'elenco direbbe il falso. | `isShownInList()` in `tasks.js` |
| A10 | A mezzanotte l'elenco si aggiorna **anche se l'app è aperta davanti**, con un timer puntato alla mezzanotte, e non solo quando torna in primo piano. | `scheduleMidnight()` in `app.js` |
| A11 | Le parti si spuntano dall'elenco **e basta**: il calendario resta una cosa che si guarda (§6.2). | — |
| A12 | Una parte ha **un giorno solo** (e un momento). Una parte che si fa in due giorni sono due parti: «5 frasi» lunedì e martedì diventano «3 frasi» e «2 frasi». Un foglio con più giorni per parte sarebbe la fila dei giorni del compito dentro ogni parte, cioè l'opzione che l'utente ha scartato. | `setPartPick()` in `model.js` |
| A13 | I giorni scelti per il compito valgono per **le parti che non hanno un giorno loro**. Se ogni parte ancora da fare ha il suo giorno, i giorni del compito non contano più né per l'elenco né per il calendario: resterebbero un blocchetto senza niente dentro. | `followsTask()` in `model.js` |
| A14 | Nel peso di un giorno una parte **fatta non pesa**, come un compito fatto. Le parti senza un giorno loro portano la loro quota nei giorni scelti per il compito, ognuno per intero, come succedeva già al compito. Si arrotonda il totale del giorno, non la quota di ogni parte. | `dayLoad()` in `model.js` |
| A15 | Un compito **senza scadenza** non ha una finestra, e quindi le sue parti non hanno il chip «quando»: vale la stessa regola del compito. | `partsBlock()` in `compose.js` |
| A16 | Escludere un giorno dalla fila o spostare la scadenza **toglie il giorno alle parti** che ci cadevano fuori, come succede già ai giorni scelti per il compito. | `toggleSkip()` e `reschedule()` in `model.js` |
| A17 | La fila dei giorni del compito **non** mostra i giorni delle parti: quelli si leggono sui loro chip, subito sotto. Due posti che dicono la stessa cosa sono uno di troppo. | — |
| A18 | L'avviso della copia compare quando l'ultima copia scaricata da questo telefono ha **30 giorni o più**. Se non ne è mai stata scaricata una, si conta dal compito più vecchio: nei primi giorni d'uso non c'è ancora niente che valga un avviso, e senza compiti l'avviso non compare mai. | `isDue()` in `backup.js` |
| A19 | L'avviso ha due pulsanti: **Scarica** e **Più tardi**, che lo fa sparire per 7 giorni. Senza il secondo, un giorno in cui la copia non si può fare l'avviso resterebbe lì a ogni apertura, e un avviso che c'è sempre smette di essere letto. | `SNOOZE_DAYS` in `backup.js` |
| A20 | La data dell'ultima copia sta in una chiave sua (`agenda:backup`, §4.5) e **non entra nel file** della copia: dice qualcosa di questo telefono, e ripristinare una copia vecchia non deve far credere all'app di averne appena fatta una. | `storage.js` |
| A21 | Anche il chip «quando» nel compito aperto diventa **rosso** quando il giorno della parte è passato e la parte non è fatta: il pannello e l'elenco devono dire la stessa cosa. | `whenChip()` in `compose.js` |
| A22 | Lo scorrimento fa **quello che fa il cerchio**: su una riga da fare la spunta, su una riga fatta oggi la rimette da fare. Scatta oltre un terzo della larghezza della riga; mentre si trascina, il cerchio si riempie quando rilasciando si spunterebbe. Solo nell'elenco Da fare: nell'archivio e nella rassegna no. | `bindSwipe()` in `app.js` |
| A23 | Nella rassegna, spuntare l'**ultima** parte chiude il compito (§5.2) e fa passare al prossimo arretrato, come avrebbe fatto «Fatto». Il tocco su una parte con un numero segue l'impostazione, come nell'elenco. | `review.js` |
| A24 | Gli altri tre posti sotto i 44px — i filtri (36), le opzioni dei selettori a segmenti (38) e le righe sotto la griglia del calendario (34) — **crescono a 44**. È un cambio visibile di pochi pixel, e l'alternativa (un'area di tocco invisibile più grande del disegno) avrebbe chiesto un altro numero scritto a mano per ciascuno. | `components.css` |
| A25 | Nella griglia della settimana i momenti non sono più scritti (MATT, POM, SERA, SCADE) ma disegnati: **sole, mezzo sole, luna, bandierina**. Con le scritte la colonna di sinistra era larga 3.1rem e sull'iPhone 15 le colonne dei giorni scendevano a 40px, sotto i 44 del tocco minimo; con le icone (1rem) arrivano a 45. Scelta di chi usa l'app dopo aver visto le tre versioni. Il nome intero resta nel `title` e nell'`aria-label`. Si ribalta rimettendo le forme brevi in `i18n.js` e la colonna a 3.1rem. | `calendar.js`, `components.css`, `i18n.js` |

### Decise dall'utente il 26 settembre 2026, nel quarto giro di domande

Dopo averla installata sul telefono.

| cosa | decisione |
|---|---|
| il campo «Che cosa devi fare?» | nella scuola **non serve**: si sceglie la materia e si scrive nelle parti. Diventa un **nome facoltativo, in fondo** al pannello. In cima, subito dopo scuola/privato e compito/verifica, ci sono la materia e poi le parti. Nel privato il nome resta il primo campo, perché lì non c'è una materia |
| un compito di scuola senza nome | nell'elenco **si chiama come la materia** («Inglese»), o «Verifica di Storia» se è una verifica |
| il campo del nome tagliato in alto | era un difetto: il contorno del campo col fuoco usciva dal pannello e veniva tagliato. Il pannello ha ora un margine in cima |
| i prossimi giorni | **restano così**, con il sesto a metà che fa capire che si scorre |
| l'orario | esce dalle impostazioni e diventa un **pulsante nella testata, a sinistra del calendario** |
| orario provvisorio e definitivo | a inizio anno l'orario cambia di settimana in settimana ed è **modificabile**; quando è quello **definitivo** lo si dice con un pulsante in fondo all'orario, e da lì **si guarda soltanto** |
| tornare a modificare un orario definitivo | **solo dalle impostazioni**, così non lo si cambia per sbaglio |
| le parti di una verifica | la sezione si chiama **«Cosa studiare»**: in una verifica le parti sono gli argomenti |
| la data in cima | **più piccola e su una riga**: sta sotto i pulsanti, larga quanto lo schermo |
| il peso di un compito nuovo | parte da **Medio**, che è quello che capita più spesso |
| una verifica nell'elenco | conta i giorni: **«tra 3 giorni»** fino a una settimana prima, poi la data |
| il privato | ci vanno **cose da fare e la lista della spesa**. Le cose da fare a volte hanno un giorno e a volte no: restano come sono |
| la lista della spesa | **una lista fissa**: c'è sempre, non scade, non va nell'archivio. Si aggiunge quando viene in mente, si spunta al supermercato, e le cose spuntate se ne vanno a mezzanotte |
| dove sta la spesa | **un pulsante suo in testata**, che la apre a tutta pagina (§6.7) |
| un numerino sul carrello | **sì**, quante cose restano da comprare; con la lista vuota non c'è |
| la sezione «Senza data» | **resta in fondo** all'elenco |
| l'icona dell'app | **quella che c'è** (il quadrato blu con la spunta) diventa definitiva |
| le quantità nella spesa | **sì**: «2 latte», «500 g farina» |
| le notifiche (fase successiva) | **una sola, alle 15:00** (§8) |
| spuntare dal calendario | **no**: il calendario si guarda e basta |
| impostazioni | **tutto quello proposto**: divise in pagine (Aspetto, Materie, Ambiti, Compiti, Orario, I tuoi dati) con un elenco corto all'inizio; «Automatica» al posto di «Come il telefono»; righe più compatte; lingua e tema in cima, la copia in fondo |

#### Assunzioni prese nel farlo (si ribaltano senza discutere)

| # | Assunzione | Come si ribalta |
|---|---|---|
| A26 | Un compito senza nome si salva con `title: ""` e il nome **si calcola quando si disegna**: se la materia cambia nome, cambia anche il compito. Nell'ordinamento un titolo vuoto vale il nome della materia. | `taskTitle()` in `ui.js`, `compare()` in `tasks.js` |
| A27 | Un compito che si chiama come la materia porta il **pallino davanti al nome**, e la riga sotto non ripete la materia: sarebbe la stessa parola due volte. | `taskRow()` in `app.js` |
| A28 | Una parte scritta e non ancora aggiunta col `+` **non si perde**: resta scritta se nel frattempo si tocca un'altra cosa, e toccando Aggiungi/Salva diventa una parte. Dopo averne aggiunta una, il cursore resta nel campo, pronto per la prossima. | `readInputs()` e `save()` in `compose.js` |
| A29 | Nel compito nuovo di scuola **la tastiera non si apre da sola**: il primo gesto è toccare la materia. Nel privato sì, sul nome, che lì è il primo campo. | `openNew()` in `compose.js` |
| A30 | Un compito di scuola **senza materia e senza nome** non si salva: l'avviso dice «Scegli una materia o scrivi un nome». Senza nessuno dei due non ci sarebbe niente da scrivere nell'elenco. | `save()` in `compose.js` |
| A31 | «Definitivo» vale per l'orario **intero**, non per una settimana, e sta in `settings.timetableFinal` (entra nella copia: è una scelta, non un fatto del telefono). Da definitivo il pannello mostra la griglia di questa settimana, senza «Nuova settimana» e senza l'elenco delle settimane. | `timetable-view.js`, `storage.js` |
| A32 | Rendere l'orario definitivo **chiede conferma**, e la conferma dice dove si torna indietro. Tornare a modificarlo dalle impostazioni non la chiede: non si perde niente. | `timetable-view.js`, `settings.js` |
| A33 | L'icona dell'orario è una **tabella** (righe e colonne), per non confonderla col calendario che le sta accanto. | `index.html` |
| A34 | Le impostazioni partono sempre dall'**elenco**; ogni pagina ha la freccia ‹ per tornarci, la ✕ chiude tutto. Ogni riga dell'elenco dice a destra come stanno le cose («Automatico», «6», «definitivo», «copia di 3 giorni fa»). | `settings.js` |
| A35 | «Automatica» per la lingua, «Automatico» per il tema; in inglese «Automatic». | `i18n.js` |
| A36 | Le righe delle impostazioni stanno **in un unico riquadro**, separate da una riga sottile, alte 48px invece di 60: è la forma delle Impostazioni dell'iPhone, ed è quella che rende l'elenco delle materie compatto. | `.ag-rows` in `components.css` |
| A37 | «Se ne vanno a mezzanotte» **non vuol dire cancellate** (regola 4): le cose comprate passano in **«Già comprate»**, sotto la lista, e un tocco le rimette in lista. È anche la cosa più utile: latte e pane tornano ogni settimana, e riscriverli ogni volta è testo libero dove basta un tocco (regola 5). | `shopping.js` |
| A38 | Scrivere una cosa che è già fra le «Già comprate» (stesso nome, maiuscole a parte) **la rimette in lista** invece di farne una seconda; se è già in lista, non si aggiunge due volte. | `addItem()` in `shopping.js` |
| A39 | Una cosa della lista **non si cancella da sola, e nemmeno con un tocco**: una cosa scritta per sbaglio si spunta, e finisce fra le «Già comprate». Quelle si svuotano tutte insieme con «Svuota», che chiede conferma coi numeri. Una × su ogni riga sarebbe stata una cancellazione per riga, e ognuna avrebbe voluto la sua conferma. | `shopping-view.js` |
| A40 | Il carrello sta **per primo** in testata, a sinistra dell'orario: è l'unico pulsante che non riguarda la scuola, e così non si mette in mezzo a quelli che la riguardano. Con cinque pulsanti la testata regge perché la data sta già su una riga sua. | `index.html` |
| A41 | La lista della spesa **entra nella copia di sicurezza** e si ripristina come i compiti: si unisce per `id`, non si cancella niente che nel file non c'è. Il formato del file resta alla versione 1: un campo in più lo ignora solo chi non lo conosce. | `storage.js` |
| A42 | La quantità si scrive **davanti al nome**, come le parti di un compito («5 frasi»): «2 latte», «500 g farina», «1,5 kg mele», «2 litri latte». Le unità riconosciute sono quelle della spesa (g, hg, kg, ml, cl, dl, l, pz, e le forme per esteso); un numero da solo si legge «×2». Un numero attaccato al nome («3uova») resta nel nome: meglio un nome strano che una quantità inventata. | `parseItem()` in `shopping.js` |
| A43 | Riscrivere una cosa già in lista **con un'altra quantità la cambia** (e lo dice), invece di fare un doppione; senza numero non cambia niente. Una cosa che torna dalle «Già comprate» tiene la quantità dell'ultima volta, a meno di scriverne una nuova. | `addItem()` in `shopping.js` |

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
      settings.js               impostazioni, divise in pagine
      timetable-view.js         il pannello dell'orario: provvisorio o definitivo
      shopping.js               la lista della spesa: regole pure
      shopping-view.js          il pannello della spesa
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
    backup.mjs                  quando compare il promemoria della copia
    shopping.mjs                la lista della spesa: aggiungere, spuntare, mezzanotte
    browser/                    prove che guidano l'app in un browser vero
                                (servono Playwright: vedi test/browser/LEGGIMI.md)
      audit.mjs                 il controllo dei contrasti sulla pagina renderizzata
      contrasti.mjs             lo passa su dodici schermate dell'app, nei due temi
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

Per la scelta della palette in `design_handoff/` c'era anche
`palette-alternative/`, con i candidati e la pagina che li confrontava. È stata
scelta Notte, cioè quella che era già `tokens/colors.css`, e la cartella è
stata buttata come previsto. Se un giorno servisse un nuovo confronto,
`tools/genera-palette.py` e `tools/confronto-palette.py` la rigenerano.

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
    { id: "s-1", name: "Inglese", short: "INGL", color: "petrolio" }
  ],
  areas: [             // SOLO gli ambiti personalizzati: i due fissi non stanno qui
    { id: "a-1", name: "Palestra", color: "oliva" }
  ],
  lessonsPerDay: 6,    // righe della griglia dell'orario
  schoolDays: [1,2,3,4,5,6],
  partTap: "step",     // una parte con un numero, toccata dall'elenco:
                       // "step" = +1 a ogni tocco | "all" = un tocco la fa tutta
  timetableFinal: false // l'orario è definitivo: si guarda e basta (A31)
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
    title: "Compiti di inglese",  // "" = si chiama come la materia (A26)
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
  pianificazione resta del compito intero. Una parte **con** `pick` ha il suo
  giorno — uno solo (assunzione A12) — scelto dal chip «quando» (§6.5).
  **Le tre forme chieste dall'utente sono lo stesso oggetto**, non tre tipi
  diversi.
- `momento` ∈ `"morning" | "afternoon" | "evening"`.

### 4.4 `agenda:review`

```js
{ lastReviewedOn: "2026-09-21" }   // ultimo giorno in cui ha risposto alla rassegna
```

### 4.5 `agenda:backup`

```js
{
  lastSavedOn: "2026-09-25" | null,  // l'ultima copia scaricata da questo telefono
  snoozedUntil: "2026-10-02" | null  // «Più tardi»: l'avviso non compare prima di questo giorno
}
```

Non entra nel file della copia (assunzione A20).

### 4.6 `agenda:shopping`

```js
{
  items: [
    { id: "c-k3f9", name: "latte", qty: "2" | "500 g" | null,
      addedAt: "2026-09-26",
      boughtAt: null | "2026-09-26" }   // null = da comprare
  ]
}
```

Un solo elenco. Quello che si vede dipende da `boughtAt` e da oggi (§6.7):
`null` è da comprare; oggi è comprata ma ancora in lista, barrata; un giorno
prima di oggi è fra le «Già comprate». Entra nella copia (A41).

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
giorniScelti(compito)   = i giorni delle parti ancora da fare che ne hanno uno
                          + plan.pick, se qualche parte da fare non ha un giorno
                            suo (o se il compito non ha parti da fare)
giornoDiLavoro(compito) = oggi, se una parte da fare aveva un giorno già passato,
                          altrimenti il più piccolo dei giorniScelti da oggi in avanti,
                          oggi se ci sono giorni scelti ma sono tutti passati,
                          altrimenti due,
                          altrimenti nessuno (cosa senza data)
```

Le parti fatte non contano: è quello che fa passare un compito dal giorno
delle frasi a quello degli esercizi quando le frasi sono finite. E una parte
rimasta indietro porta il compito a oggi anche se un'altra è più avanti: dei
giorni del compito non si sa se in un giorno passato ha lavorato o no, di
quelli di una parte sì — la parte è lì, non spuntata.

È questo che decide dove il compito sta nell'elenco e nel calendario. Un
compito senza giorni scelti compare sulla sua scadenza, marcato **da
pianificare**: l'app non decide per lui, ma non lo nasconde nemmeno.

### 5.2 Stato di un compito

| stato | condizione | dove si vede |
|---|---|---|
| `done` | `doneAt` valorizzato | fatto oggi: al suo posto nell'elenco, barrato, fino a mezzanotte; poi archivio |
| `dropped` | `droppedAt` valorizzato | archivio |
| `late` | non fatto e `due < oggi` | in cima, sempre |
| `today` | `giornoDiLavoro == oggi` | sezione Oggi |
| `planned` | tutto il resto con una data | sezione del suo giorno |
| `undated` | `due == null` e nessun `pick` | sezione Senza data |

Una parte non ha uno stato suo: è fatta quando `done >= total`. **Un compito si
spunta da sé quando tutte le sue parti sono fatte**, e spuntando il compito si
spuntano tutte le parti. Al contrario, togliere la spunta a una parte di un
compito fatto lo rimette da fare: un compito con una parte che manca non è
fatto. La regola vale sia dall'elenco sia dal pannello del compito.

---

## 6. Schermate

Sette in tutto, e solo la prima è una vera schermata: le altre sono pannelli
che si aprono sopra e si chiudono con una ✕, come in Shift Hours.

### 6.1 Da fare (si apre sempre qui)

Testata: l'occhiello «Da fare» con le cinque icone (spesa, orario,
calendario, archivio, impostazioni), e sotto la data, su una riga sola.

Sotto, due cose e in quest'ordine:

1. un **avviso**, che compare *solo* quando c'è un arretrato o una verifica
   entro domani. Un avviso che c'è sempre non è un avviso. Più giù, sulla
   strada fra i filtri e l'elenco, l'avviso della rassegna (§7) e quello della
   **copia di sicurezza**, una volta al mese (assunzioni A18–A20);
2. la **striscia dei prossimi sette giorni**, ognuno col fondo del suo peso e
   il numero di cose che ci sono. Non è un riepilogo, è uno strumento: serve a
   rispondere alla domanda «dove lo metto?», che è il problema dell'app — e a
   quella domanda il numero di cose di oggi non risponde. Toccando un giorno si
   apre il calendario su quel giorno.

Elenco a sezioni, nell'ordine: **In ritardo**, **Oggi**, **Domani**,
**Questa settimana**, **Più avanti**, **Senza data**. Dentro ogni sezione:
prima le verifiche, poi per peso decrescente, poi per titolo.

Ogni riga: titolo, riga secondaria con materia (col suo pallino) · scadenza ·
peso, e il cerchio della spunta a destra (44×44).

**Sotto la riga, le sue parti**, tutte, ognuna col suo cerchio: si spuntano
senza aprire il compito. Una parte che ha un suo giorno lo porta scritto sotto
il nome («oggi · sera», «mar 22 · pomerig.»). Quelle fatte restano barrate, perché la domanda vera
è *che cosa mi manca* e la risposta si legge meglio accanto a quello che è già
fatto. Una parte con un numero («5 frasi») porta il conto dentro il cerchio
(`3/5`), e il tocco fa quello che dice l'impostazione (§6.4): +1, oppure tutta
in una volta. Quando l'ultima parte si spunta, si spunta da sé anche il
compito (§5.2).

*(La prima versione diceva «restano: esercizi sul libro» accanto al titolo, e
sotto aveva una barra di avanzamento. Con le parti in vista erano due doppioni,
e sono stati tolti tutti e due. La barra, fra l'altro, nell'elenco non si era
mai disegnata: il riempimento era un elemento in linea, e la larghezza non gli
si applicava.)*

Le verifiche portano il loro colore e un contorno: sono l'unica cosa che non si
può rimandare.

Un filtro in testa all'elenco con gli ambiti: **Tutto · Scuola · Privato · …**

Toccando una riga si apre il compito (§6.5). Toccando il cerchio si spunta:
la riga si barra e **resta al suo posto fino a mezzanotte**, col toast
"fatto — annulla" per i primi cinque secondi. Ritoccando il cerchio torna da
fare. A mezzanotte le cose fatte passano nell'archivio, anche se l'app è
aperta in quel momento.

In basso, fisso, il pulsante `+`.

### 6.2 Calendario

Due viste commutabili, **settimana** (di partenza) e **mese**.

- **Settimana**: una **griglia** con la stessa forma di quella dell'orario —
  sette colonne (i giorni) per tre righe (mattina, pomeriggio, sera), più una
  quarta riga per quello che scade quel giorno senza essere stato pianificato.
  Dentro le caselle, blocchetti col colore della materia e la sua sigla:
  **uno per ogni parte che ha un suo giorno**, nel suo momento, e uno per il
  compito nei giorni scelti per lui quando ha parti senza un giorno loro (o
  non ha parti). Il peso di un compito si divide fra le sue parti
  (assunzione A14).
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
e da lì si modifica: ma il calendario in sé non ha azioni.) Nella settimana i
blocchetti non si toccano — sono alti 24px — ma si tocca la **colonna** del
giorno, che lo mostra per esteso sotto la griglia; è da lì, su righe alte 44px,
che si apre un compito.

### 6.3 Archivio

Le cose fatte e quelle lasciate cadere, più recenti prima, raggruppate per mese.
Ogni riga si può **rimettere da fare** con un tocco. Niente si cancella da sé.

Le cose fatte **oggi** non sono qui: stanno ancora nell'elenco, barrate, e
arrivano nell'archivio a mezzanotte. Una cosa sta sempre in uno solo dei due
posti, mai in nessuno. Quelle lasciate cadere oggi invece arrivano subito:
non sono fatte, e barrarle nell'elenco direbbe il falso.

### 6.4 Impostazioni

Divise in pagine (decisione del quarto giro). La prima è un elenco corto, in
un unico riquadro, e ogni riga dice a destra come stanno le cose:

1. **Aspetto** — tema e lingua, in quest'ordine: `Automatico · Chiaro ·
   Scuro` e `Automatica · IT · EN`. «Automatico» segue il telefono.
2. **Materie** — elenco con nome, sigla e colore. Aggiungi, rinomina, cambia
   colore, elimina. Eliminare una materia **non cancella i compiti**: restano
   col nome che avevano (come il `typeName` congelato di Shift Hours).
3. **Ambiti** — Scuola e Privato ci sono sempre; qui si aggiungono gli altri.
4. **Compiti** — **cosa fa un tocco su una parte con un numero** dall'elenco:
   `+1 a ogni tocco` oppure `un tocco la fa tutta`.
5. **Orario** — dice se è provvisorio o definitivo. Da definitivo c'è
   «Rendilo di nuovo modificabile»: è l'unico posto da cui si torna indietro.
6. **I tuoi dati** — `Scarica una copia`, `Ripristina da una copia`.

L'orario vero non sta più qui: ha il suo pulsante nella testata (§6.6).

> **Ambito privato, fase 1**: una cosa privata è lo stesso oggetto di un
> compito (`kind: "todo"`), senza materia e con la scadenza che può mancare.
> Ricorrenze e appuntamenti **non** sono in questa fase: si aggiungono quando
> l'uso reale dirà se servono.

### 6.5 Il compito aperto

Un pannello, non una schermata, uguale per il compito nuovo e per quello
aperto. Tutto modificabile sul posto. L'ordine è quello dei gesti:

- **scuola**: scuola/privato, compito/verifica, **materia**, **le parti**
  (quello che c'è da fare, una riga per parte), scadenza, peso, la fila dei
  giorni della finestra (§5), e in fondo il **nome, facoltativo**: se resta
  vuoto il compito si chiama come la materia (A26);
- **privato** e gli altri ambiti: il **nome**, che qui è obbligatorio e viene
  per primo, poi scadenza, peso, la fila dei giorni e le parti.

Su un compito che esiste già, in fondo, `Fatto` ed `Elimina`.

Sotto il nome di ogni parte c'è il suo **chip «quando»**: dice «quando?» se la
parte segue il compito, o il suo giorno e il suo momento («mar 22 · sera»).
Toccandolo sale un foglio coi giorni della finestra — quelli esclusi no — e i
tre momenti: un tocco sul giorno, uno sul momento, fatto. Se la parte ha già
un giorno, il foglio offre anche «Nessun giorno».

### 6.6 Orario

Un pannello che si apre dal pulsante con la tabella, nella testata. La griglia
è quella di sempre: giorni in colonna, ore in riga, le ore consecutive della
stessa materia fuse in una casella sola.

- **Provvisorio** (a inizio anno): toccando una casella si cambia la materia;
  c'è «Nuova settimana», che crea l'orario della prossima copiando l'ultimo,
  e l'elenco delle settimane da cui vale ognuno. In fondo, «È l'orario
  definitivo», con una conferma che dice come si torna indietro.
- **Definitivo**: la griglia di questa settimana e basta, **da guardare**. Le
  caselle non si toccano. Si torna a modificarlo solo dalle impostazioni
  (§6.4, A31–A32).

### 6.7 Spesa

Un pannello che si apre dal carrello, il primo pulsante della testata.

- **La lista**: una riga per cosa, col cerchio a destra come i compiti. Un
  tocco la spunta; la riga resta barrata al suo posto **fino a mezzanotte**,
  come un compito fatto, e ritoccandola torna da comprare.
- Sotto, il campo **«Aggiungi…»** col `+`. Dopo aver aggiunto una cosa il
  cursore resta lì, pronto per la prossima. La **quantità** si scrive davanti
  («2 latte», «500 g farina») e si legge a destra della riga (A42–A43).
- Sul carrello in testata, un **numerino** con le cose che restano da
  comprare; con la lista vuota non c'è.
- **Già comprate**: quello che è stato comprato nei giorni prima, il più
  recente per primo, a chip. Un tocco lo rimette in lista (A37). In fondo
  «Svuota», con la conferma coi numeri.

Non ha scadenze, non ha peso, non va nell'archivio e non compare nel
calendario: non è un compito.

---

## 7. La rassegna degli arretrati

Alla prima apertura di un giorno nuovo, se esiste almeno un compito in ritardo
e la rassegna non è già stata fatta oggi (`agenda:review`), si apre un pannello
che li mostra **uno per volta**, con tre risposte grandi:

- **Fatto** → `doneAt = oggi`
- se il compito ha **parti**, sono sotto di lui, ognuna col suo cerchio: si
  spuntano quelle fatte, e spuntata l'ultima il compito è fatto e si passa al
  prossimo (assunzione A23)
- **Rimanda** → sceglie la nuova scadenza fra chips (domani, dopodomani, la
  prossima lezione di quella materia, altro)
- **Non serve più** → `droppedAt = oggi`

Si può chiudere la rassegna a metà: quello che resta torna in cima all'elenco,
e la rassegna **non si ripropone lo stesso giorno**. Nessun compito resta in uno
stato ambiguo, ma non si viene mai bloccati.

---

## 8. Notifiche — fuori da questa fase, e perché

L'utente le ha messe in stand-by. Quando si riprenderanno, ne ha chiesta
**una sola al giorno, alle 15:00** (quarto giro): dopo la scuola, quando si
decide cosa fare nel pomeriggio. Restano qui scritte le due cose da sapere,
per non rifare il ragionamento da zero:

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
`src/js/subjects.js`, `src/js/timetable.js`, `src/js/timetable-view.js`,
pannello impostazioni.

- **Accettazione**: il `+` crea la settimana nuova copiando l'ultima; l'orario
  di una settimana passata non cambia quando si crea quello nuovo; scegliendo
  una materia il pannello di inserimento propone la data della sua prossima
  lezione. Da definitivo le caselle dell'orario non si toccano e non c'è
  «Nuova settimana»; dalle impostazioni torna modificabile.

### Task 4 — Inserimento e compito aperto
`src/js/compose.js`, `src/js/planner.js`.

- **Accettazione**: un compito di scuola con materia, scadenza e peso si crea
  in **quattro tocchi più le parti**, senza scrivere un nome; nessuna tastiera
  per le date; le parti si aggiungono senza uscire dal pannello, e una parte
  scritta ma non ancora aggiunta non si perde (A28).

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

### Task 10 — Lista della spesa
`src/js/shopping.js`, `src/js/shopping-view.js`, `test/shopping.mjs`.

- **Accettazione**: una cosa si aggiunge con la tastiera e il `+` e il cursore
  resta nel campo; spuntata resta barrata fino a mezzanotte e poi è fra le
  «Già comprate»; un tocco la rimette in lista; scriverla di nuovo non fa un
  doppione; «Svuota» chiede conferma coi numeri; la lista esce nella copia e
  torna col ripristino.

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
