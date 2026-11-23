# Agenda

App web personale per **l'orario scolastico** e i **voti**, con le medie del
primo e del secondo quadrimestre, dell'anno e di ogni materia, teoria e
laboratorio. Si apre sull'orario, che è quello che si guarda ogni giorno.

Il contratto completo del progetto è in [`PIANO-FASE-1.md`](PIANO-FASE-1.md):
**quello comanda**, questo file spiega solo come si usa il codice. Le regole
sempre valide stanno in [`CLAUDE.md`](CLAUDE.md).

## Com'era, e com'è

L'app è nata come agenda dei compiti, con la regola della finestra (i giorni
in cui un compito si può fare), le parti, il calendario, l'archivio e una
lista della spesa. Nell'undicesimo giro l'utente ha chiesto di togliere tutto
quello che non usava: sono rimasti l'orario, i voti e le impostazioni che
servono a loro (A72–A73 nel piano). I compiti e la spesa già salvati sul
telefono **non sono stati cancellati**: restano in memoria ed escono ancora
nella copia di sicurezza. Il codice tolto è nella storia di git.

Il movimento — i tempi, le molle dei fogli, la pressione dei pulsanti, gli
avvisi a pillola, le ombre — viene dal Visore, l'app iPhone dello stesso
autore (A76–A79).

## Com'è fatta

Sito statico: HTML, CSS e JavaScript **senza librerie, senza build, senza
server**. I file che stanno nel repo sono esattamente quelli che girano sul
telefono. PWA installabile: si aggiunge alla schermata home e funziona offline.

```
design_handoff/     sorgente di verità del sistema visivo
  tokens/           colori (due temi), tabella dei colori delle materie, tipografia, spaziature
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
| `model.js` | gli id di materie e voti |
| `subjects.js` | materie, sigle, colori: la tabella da cui si scelgono e i dodici di prima |
| `timetable.js` | gli orari nel tempo, le ore di ogni giorno, la pausa |
| `timetable-view.js` | l'orario, la schermata principale: provvisorio o definitivo |
| `grades.js` | i voti: quadrimestri e medie |
| `grades-view.js` | il pannello dei voti |
| `settings.js` | le impostazioni, divise in pagine: aspetto, materie, orario, dati |
| `backup.js` | il file che esce e quello che rientra |
| `ui.js` | livelli, fogli, conferme, avvisi e il loro movimento: mai una finestra del browser |
| `app.js` | orchestrazione e testata |

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

`tokens/tavolozza.css`, la tabella dei colori delle materie, non si scrive
nemmeno lì: la **genera** `tools/genera-tavolozza.py`, che ammorbidisce i colori
a pastello, misura ogni contrasto e si ferma se uno non passa. Si cambia il
generatore e lo si rilancia (`python3 tools/genera-tavolozza.py`), poi si
ricopia; il workflow controlla che il file sia quello che ne esce.

## L'orario cambia ogni settimana, e va bene

All'inizio dell'anno l'orario è provvisorio. Per questo l'orario **non è una
griglia: è un elenco di griglie**, ognuna con la settimana da cui vale — lo
stesso schema con cui Shift Hours tiene la paga oraria nel tempo.

Il pulsante *Nuovo orario* chiede da che giorno vale e crea la griglia
**copiando l'ultima che esiste**, così si corregge solo quello che è cambiato. E
soprattutto: la settimana scorsa non diventa retroattivamente quella nuova.
Due ore di fila della stessa materia si vedono come una casella sola, più alta.
Ogni giorno ha le sue ore, e un'ora può essere la pausa.

È la prima cosa che si vede aprendo l'app. Quando
l'orario è quello giusto, «È l'orario definitivo» lo rende **da guardare e
basta**: le caselle non si toccano più, e un tocco sbagliato non lo cambia. Se
a scuola cambia di nuovo, si torna a modificarlo da *Impostazioni → Orario*.

Una materia può dividersi in **teoria e laboratorio** (si segna nelle
impostazioni). Allora nell'orario un'ora è dell'una o dell'altro, e così
anche un voto.

## I voti

Dal pulsante con le barre: un voto è la materia, teoria o laboratorio, un
numero dal 2 al 10 di mezzo in mezzo e il giorno, tutto a tocchi. In cima si
sceglie il periodo (1° quadrimestre da settembre a gennaio, 2° da febbraio al
30 giugno, o l'anno intero) e sotto c'è la media generale, che è la media
delle medie delle materie. Una materia chiusa mostra la sua media; aperta,
anche quella di teoria e di laboratorio, e i voti uno per uno.

## Provarla in locale

Serve un server vero: l'app usa i moduli JavaScript, che aprendo il file
direttamente col browser non funzionano.

```sh
python3 -m http.server 8000 --directory src
# poi apri http://localhost:8000
```

## Dove vivono i dati

Solo sul dispositivo, in `localStorage`: `agenda:settings`,
`agenda:timetables`, `agenda:grades`, e le chiavi di prima che l'app non
legge più ma non tocca (`agenda:tasks`, `agenda:shopping`, `agenda:review`).
Nessun server, nessun account, nessuna sincronizzazione. **Nel repo non
finisce mai nessun dato reale**: né un voto, né una materia, né l'orario
scolastico.

Due telefoni sono due mondi separati: la stessa app aperta su due dispositivi
non condivide niente.

Siccome i dati vivono solo nel telefono, se qualcuno cancella i dati dei siti in
Impostazioni → Safari, o se si cambia telefono, **non c'è niente da cui
recuperarli**. In *Impostazioni → I tuoi dati* ci sono `Scarica una copia` e
`Ripristina da una copia`. Il ripristino **non cancella mai** un voto più
recente del file.

## Lingua e tema

L'interfaccia è in italiano e in inglese, e segue la lingua del telefono; si può
forzare dalle impostazioni. Lo stesso per il tema chiaro e scuro.

Il tema lo decide uno script inline nel `<head>`, prima che la pagina si
disegni: se lo decidesse `app.js` si vedrebbe un lampo di tema chiaro su un
telefono in tema scuro.

## Quello che l'app non fa

- **Non ti manda notifiche.**
- Niente compiti, calendario, archivio o spesa: sono stati tolti apposta.
- Niente sincronizzazione con il registro della scuola: i voti si scrivono a
  mano, e restano sul telefono.

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

L'icona è un quadrato blu con una spunta bianca, generata da
`design_handoff/makeicon.py` (nessuna libreria: un PNG è quattro chunk e un
flusso zlib). Era nata come segnaposto; dopo averla vista sul telefono è
diventata quella **definitiva**.
