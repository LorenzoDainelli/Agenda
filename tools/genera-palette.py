#!/usr/bin/env python3
"""Genera una palette completa a partire da poche decisioni, e la verifica.

Perché un generatore e non un file di colori scritto a mano: una palette di
questa app sono circa novanta valori per tema, e ognuno ha un vincolo di
contrasto da rispettare. Scritti a mano, i vincoli si verificano dopo — e la
prima versione di questi token aveva infatti due numeri sbagliati nei
commenti. Qui il vincolo viene prima del valore: si dice «questo testo deve
stare almeno a 4.5:1 su quel fondo» e la chiarezza necessaria la trova il
programma, che poi scrive nel commento il numero che ha davvero ottenuto.

Le decisioni che restano umane sono poche, e sono quelle che si vedono:
quanto è calda la carta, che tonalità ha il colore d'azione, dove stanno le
sei tonalità delle materie. Tutto il resto è conseguenza.

Uso:
    python3 tools/genera-palette.py                  # scrive i candidati
    python3 tools/genera-palette.py --verifica       # solo il rapporto
"""

import sys
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from colore import (  # noqa: E402
    almeno, contrasto, cr, delta_e, lch, lch_a_hex, per_contrasto,
)

RADICE = pathlib.Path(__file__).resolve().parent.parent
USCITA = RADICE / "design_handoff" / "palette-alternative"

# ── Soglie ─────────────────────────────────────────────────────────────────
# Le stesse per tutti i candidati, così il confronto è fra palette e non fra
# metri diversi. 4.5:1 è la soglia WCAG per il testo, 3:1 per un elemento non
# testuale che porta informazione (un pallino, un anello, un bordo di stato).
TESTO = 4.5
INFORMATIVO = 3.0

# Il colore d'azione e il colore di una materia non devono mai sembrare la
# stessa cosa: se si assomigliano, un pallino di materia si legge come «questo
# è toccabile» e un pulsante si legge come «questa è una materia». Due misure,
# perché servono a due cose diverse: la distanza di tonalità impedisce che
# siano parenti, ΔE che siano gemelli a occhio. I valori sono quelli che la
# palette in uso già rispetta (36° e ΔE 16.9 la sua materia più vicina).
TONALITA_MINIMA = 40.0
DISTANZA_MINIMA = 15.0

# La fascia proibita attorno alla tonalità del colore d'azione: 50°, cioè
# il minimo che regge il vincolo di distinguibilità anche nel tema scuro. Le sei
# tonalità delle materie non si scelgono: si distribuiscono in quello che
# resta del cerchio, che è il modo di garantire il vincolo invece di provare
# rotazioni finché una passa (le prime due ricette scritte a mano cadevano
# entrambe a meno di 5° dal primario).
FASCIA = 50.0

# Nomi delle tonalità, per angolo in CIELAB. Il nome non si sceglie: si ricava
# dall'angolo, così non può mentire — e il primo giro di candidati aveva una
# materia chiamata `oliva` che era blu.
NOMI_TONALITA = [
    (8, "granata"), (30, "ruggine"), (52, "cuoio"), (75, "senape"), (105, "oliva"),
    (130, "felce"), (150, "alloro"), (168, "smeraldo"), (190, "verderame"),
    (208, "ottanio"), (228, "ardesia"), (250, "oltremare"), (268, "indaco"),
    (288, "glicine"), (308, "malva"), (326, "vinaccia"), (345, "rubino"),
]


def tonalita_materie(h_primario):
    """Le sei tonalità, distribuite fuori dalla fascia del colore d'azione."""
    arco = 360 - 2 * FASCIA
    return [(h_primario + FASCIA + i * arco / 5) % 360 for i in range(6)]


def nomi_tonalita(angoli):
    """Il nome di ogni tonalità, il più vicino non ancora usato."""
    usati, nomi = set(), []
    for h in angoli:
        ordinati = sorted(NOMI_TONALITA,
                          key=lambda voce: min(abs(voce[0] - h), 360 - abs(voce[0] - h)))
        scelto = next(nome for _, nome in ordinati if nome not in usati)
        usati.add(scelto)
        nomi.append(scelto)
    return nomi

# I semantici non cambiano tonalità fra un candidato e l'altro, di proposito:
# una verifica è ambra e un ritardo è rosso in tutte e tre le palette. Quello
# che cambia in una palette è il suo carattere — le superfici, il colore
# d'azione, le materie — non il significato dei colori di stato.
SEMANTICI = {
    "test": {"h": 69, "C": 57, "h_scuro": 82, "C_scuro": 60},
    "late": {"h": 37, "C": 71, "h_scuro": 29, "C_scuro": 48},
    "done": {"h": 153, "C": 40, "h_scuro": 156, "C_scuro": 44},
}


class Palette:
    """Costruisce i token di un tema e tiene il conto di cosa ha verificato."""

    def __init__(self, spec, tema):
        self.spec = spec
        self.tema = tema
        self.t = {}       # token → hex
        self.note = {}    # token → commento
        self.prove = []   # (descrizione, valore, soglia, passa)

    # ── attrezzi ───────────────────────────────────────────────────────
    def metti(self, nome, valore, nota=None):
        self.t[nome] = valore
        if nota:
            self.note[nome] = nota
        return valore

    def prova(self, descrizione, colore, fondo, soglia):
        r = contrasto(colore, fondo)
        self.prove.append((descrizione, r, soglia, r >= soglia - 0.005))
        return r

    @property
    def scuro(self):
        return self.tema == "dark"

    def costruisci(self):
        s = self.spec
        c = s["scuro" if self.scuro else "chiaro"]
        neutro_h = s["neutro"]["h"]

        # ── Superfici ──────────────────────────────────────────────────
        # Sono le uniche chiarezze decise a mano: sono la scelta di
        # carattere della palette (carta calda, bianco freddo, grigio
        # verde), e non hanno un vincolo di contrasto proprio — lo hanno i
        # colori che ci vanno sopra, che partono da qui.
        bg = self.metti("--ag-bg", lch_a_hex(c["L_bg"], c["C_bg"], neutro_h))
        sup = self.metti("--ag-surface", lch_a_hex(c["L_surface"], c["C_surface"], neutro_h),
                         "righe, campi, giorni senza niente")
        forte = self.metti("--ag-surface-strong", lch_a_hex(c["L_strong"], c["C_surface"], neutro_h),
                           "premuto, tracce")
        self.metti("--ag-hairline", lch_a_hex(c["L_hairline"], c["C_surface"], neutro_h),
                   "con parsimonia, solo separatori")

        # ── Testo ──────────────────────────────────────────────────────
        verso = "chiaro" if self.scuro else "scuro"
        testo = self.metti("--ag-text", per_contrasto(15, bg, neutro_h, 6 if self.scuro else 5, verso))
        self.prova("testo su bg", testo, bg, TESTO)
        self.prova("testo su surface", testo, sup, TESTO)
        self.note["--ag-text"] = f"{cr(testo, bg)}:1 su --ag-bg · {cr(testo, sup)}:1 su --ag-surface"

        # Il caso peggiore di `muted` è la superficie più marcata, non il
        # fondo: si risolve su quella, e sulle altre due avanza margine.
        muted = self.metti("--ag-text-muted", per_contrasto(TESTO + 0.2, forte, neutro_h, 10, verso))
        for dove, fondo in (("bg", bg), ("surface", sup), ("surface-strong", forte)):
            self.prova(f"muted su {dove}", muted, fondo, TESTO)
        self.note["--ag-text-muted"] = (f"{cr(muted, bg)}:1 su --ag-bg · {cr(muted, sup)}:1 su "
                                        f"--ag-surface · {cr(muted, forte)}:1 su --ag-surface-strong")

        # `faint` sta SOTTO soglia di proposito, ed è l'unico token così:
        # serve alle cose che non portano informazione (le frecce, la tacca
        # spenta del peso, il puntino separatore). Il commento lo dice, così
        # nessuno lo usa per un testo — è già stato usato per sbaglio due
        # volte, e sono stati due difetti veri.
        faint = self.metti("--ag-text-faint", per_contrasto(2.7, forte, neutro_h, 8, verso))
        self.note["--ag-text-faint"] = (f"{cr(faint, forte)}:1 su --ag-surface-strong — SOTTO SOGLIA, "
                                        "e va bene: SOLO cose che non portano informazione (frecce ›, "
                                        "tacca spenta del peso, puntino separatore). Mai testo da "
                                        "leggere, mai un segnaposto")

        # ── Colore d'azione ────────────────────────────────────────────
        ph, pc = s["primario"]["h"], s["primario"]["C"]
        if self.scuro:
            # Un colore d'azione scuro su un fondo scuro non si vede: nel
            # tema scuro il primario schiarisce e l'inchiostro sopra diventa
            # quasi nero.
            primario = self.metti("--ag-primary",
                                  per_contrasto(s["primario"]["profondita_scuro"], bg, ph, pc * 0.6, "chiaro"))
            sopra = self.metti("--ag-on-primary", per_contrasto(7, primario, ph, 12, "scuro"))
            self.metti("--ag-primary-pressed", lch_a_hex(min(96, lch(primario)[0] + 8), pc * 0.55, ph),
                       "nel tema scuro il premuto schiarisce")
            soft = self.metti("--ag-primary-soft", lch_a_hex(c["L_surface"] + 2, pc * 0.8, ph),
                              "chip e righe scelte")
            self.metti("--ag-primary-softer", lch_a_hex(c["L_bg"] + 2.5, pc * 0.7, ph))
        else:
            primario = self.metti("--ag-primary",
                                  per_contrasto(s["primario"]["profondita"], "#ffffff", ph, pc, "scuro"))
            sopra = self.metti("--ag-on-primary", "#ffffff")
            # Il premuto scurisce ancora, ma sotto un certo punto non si
            # distingue più dal normale: si prende il più scuro fra «+3.5 di
            # contrasto» e il quasi nero.
            self.metti("--ag-primary-pressed",
                       per_contrasto(min(17.0, s["primario"]["profondita"] + 3.5), "#ffffff", ph, pc, "scuro"))
            soft = self.metti("--ag-primary-soft", lch_a_hex(94, s["primario"]["soft_C"], ph),
                              "chip e righe scelte")
            self.metti("--ag-primary-softer", lch_a_hex(97.5, s["primario"]["soft_C"] * 0.6, ph))
        self.prova("inchiostro sopra il primario", sopra, primario, TESTO)
        self.note["--ag-primary"] = (f"{cr(primario, bg)}:1 su --ag-bg · "
                                     f"l'inchiostro sopra {cr(sopra, primario)}:1")

        # L'inchiostro sul chip chiaro: deve passare sul chip, non sul fondo.
        ink = self.metti("--ag-primary-ink", almeno(primario, soft, 7, "chiaro" if self.scuro else "scuro", C=pc))
        self.prova("primary-ink sul chip", ink, soft, TESTO)
        self.note["--ag-primary-ink"] = f"{cr(ink, soft)}:1 su --ag-primary-soft"

        # ── Semantici ─────────────────────────────────────────────────
        for nome, sem in SEMANTICI.items():
            h = sem["h_scuro" if self.scuro else "h"]
            C = sem["C_scuro" if self.scuro else "C"]
            if self.scuro:
                pieno = per_contrasto(6.5, bg, h, C, "chiaro")
                chip = lch_a_hex(c["L_bg"] + 6, C * 0.35, h)
                inchiostro = per_contrasto(8.5, chip, h, C * 0.75, "chiaro")
            else:
                pieno = per_contrasto(5.4, bg, h, C, "scuro")
                chip = lch_a_hex(95, C * 0.22, h)
                inchiostro = per_contrasto(6.4, chip, h, C, "scuro")
            self.metti(f"--ag-{nome}", pieno)
            self.metti(f"--ag-{nome}-soft", chip)
            self.metti(f"--ag-{nome}-ink", inchiostro)
            self.prova(f"{nome} su bg", pieno, bg, TESTO)
            self.prova(f"{nome} su surface", pieno, sup, TESTO)
            self.prova(f"{nome}-ink sul chip", inchiostro, chip, TESTO)
            self.note[f"--ag-{nome}"] = f"{cr(pieno, bg)}:1 su --ag-bg · {cr(pieno, sup)}:1 su --ag-surface"
            self.note[f"--ag-{nome}-ink"] = f"{cr(inchiostro, chip)}:1 su --ag-{nome}-soft"

        # Eliminare usa lo stesso rosso del ritardo, di proposito: sono la
        # stessa idea di «qualcosa non va», e due rossi diversi sarebbero
        # rumore, non informazione.
        self.metti("--ag-danger", self.t["--ag-late"])
        self.metti("--ag-danger-soft", self.t["--ag-late-soft"])

        # ── Spenti ────────────────────────────────────────────────────
        spento_bg = self.metti("--ag-disabled-bg", lch_a_hex(c["L_strong"] + (1 if self.scuro else -1),
                                                             c["C_surface"], neutro_h))
        spento = self.metti("--ag-disabled-text", per_contrasto(2.9, spento_bg, neutro_h, 8, verso))
        self.note["--ag-disabled-text"] = (f"{cr(spento, spento_bg)}:1 — sotto soglia perché un "
                                           "comando spento non si deve leggere come attivo")

        # ── Peso del giorno ───────────────────────────────────────────
        # Sei gradini fissi, non un calcolo a tempo di esecuzione: così
        # l'inchiostro sopra ogni gradino è verificato per costruzione.
        # Il salto dell'inchiostro dal testo al bianco (o al nero, nel tema
        # scuro) cade dove cade: fra le luminanze in cui passa il bianco e
        # quelle in cui passa il testo c'è una fascia in cui non passa
        # nessuno dei due, e i gradini vanno tenuti fuori da quella fascia.
        L0 = c["L_bg"] + (2.5 if self.scuro else -2.5)
        L5 = lch(primario)[0]
        chiari = []
        for i in range(6):
            k = i / 5
            chiari.append((L0 + (L5 - L0) * k, 3 + (pc - 3) * (k ** 0.8)))

        # La fascia morta: le chiarezze in cui non passa né il testo né il
        # bianco (o il quasi nero, nel tema scuro). Un gradino che ci finisce
        # dentro non ha inchiostro possibile, e non è un dettaglio: il numero
        # dentro la casella è l'unica cosa che dice QUANTO pesa quel giorno.
        # Si sposta il gradino, di poco e verso l'estremo più vicino, invece
        # di scegliergli un inchiostro che non passa.
        def inchiostro_migliore(colore):
            candidati = (testo, sopra if self.scuro else "#ffffff")
            return max(candidati, key=lambda x: contrasto(x, colore))

        gradini = []
        for i, (L, C) in enumerate(chiari):
            colore = lch_a_hex(L, C, ph)
            if contrasto(inchiostro_migliore(colore), colore) < TESTO + 0.1:
                for passo in range(1, 60):
                    trovato = None
                    for segno in (-1, 1):
                        prova = lch_a_hex(L + segno * passo * 0.25, C, ph)
                        if contrasto(inchiostro_migliore(prova), prova) >= TESTO + 0.1:
                            trovato = prova
                            break
                    if trovato:
                        colore = trovato
                        break
            gradini.append(colore)
        inchiostri = []
        for i, g in enumerate(gradini):
            scelto = inchiostro_migliore(g)
            # Fra i due si preferisce il colore del testo quando passa con
            # margine: è quello che usa la riga accanto, e un numero dentro la
            # casella che cambia colore a metà scala si nota.
            if contrasto(testo, g) >= TESTO + 0.3:
                scelto = testo
            inchiostri.append(scelto)
            self.prova(f"inchiostro sul gradino {i}", scelto, g, TESTO)
            self.metti(f"--ag-load-{i}", g)
            self.metti(f"--ag-load-ink-{i}", scelto)
        for i in range(1, 6):
            stacco = contrasto(gradini[i], gradini[i - 1])
            self.prove.append((f"stacco fra gradino {i-1} e {i}", stacco, 1.25, stacco >= 1.25))
            self.note[f"--ag-load-{i}"] = (f"{cr(inchiostri[i], gradini[i])}:1 · "
                                           f"stacco {stacco:.2f} dal gradino precedente")
        self.note["--ag-load-0"] = f"{cr(inchiostri[0], gradini[0])}:1"

        # ── Materie ───────────────────────────────────────────────────
        # Sei tonalità in due intensità, non dodici colori diversi: la
        # varietà viene dal valore, non dalla saturazione. Con dodici
        # tonalità a saturazione bassa le più vicine finiscono sotto ΔE 6 e
        # diventano dodici grigi; con sei tonalità e due intensità si
        # distinguono le tonalità fra loro (ΔE alto) e si assomigliano le
        # due intensità della stessa tonalità (ΔE basso), che è esattamente
        # il messaggio giusto: «due inglesi», non due materie estranee.
        mat = s["materie"]
        angoli = tonalita_materie(ph)
        self.nomi_materie = nomi_tonalita(angoli)
        for i, nome in enumerate(self.nomi_materie):
            h = angoli[i]
            for intensita, suffisso in ((0, ""), (1, "-2")):
                if self.scuro:
                    L = mat["L_scuro"][intensita]
                    pieno = lch_a_hex(L, mat["C_scuro"], h)
                    chip = lch_a_hex(c["L_surface"] + 2 + intensita * 9, mat["C_scuro"] * 0.5, h)
                    inchiostro = per_contrasto(8, chip, h, mat["C_scuro"] * 0.5, "chiaro")
                else:
                    L = mat["L_chiaro"][intensita]
                    pieno = lch_a_hex(L, mat["C_chiaro"], h)
                    chip = lch_a_hex(89 - intensita * 7, mat["C_chiaro"] * 0.55, h)
                    inchiostro = per_contrasto(7, chip, h, mat["C_chiaro"], "scuro")
                base = f"--ag-subj-{nome}{suffisso}"
                self.metti(base, pieno)
                self.metti(f"{base}-soft", chip)
                self.metti(f"{base}-ink", inchiostro)
                self.prova(f"materia {nome}{suffisso} su surface", pieno, sup, INFORMATIVO)
                self.prova(f"materia {nome}{suffisso}, inchiostro sul chip", inchiostro, chip, TESTO)
                self.note[base] = f"{cr(pieno, sup)}:1 su --ag-surface · {cr(inchiostro, chip)}:1 l'inchiostro sul chip"

        # Le due intensità di una tonalità devono avere la STESSA tonalità:
        # è questo che le fa leggere come «due inglesi» e non come due materie
        # estranee, non un ΔE piccolo (che nel tema scuro è per forza grande,
        # perché le due intensità stanno una sopra e una sotto la chiarezza
        # del colore d'azione).
        for nome in self.nomi_materie:
            h1 = lch(self.t[f"--ag-subj-{nome}"])[2]
            h2 = lch(self.t[f"--ag-subj-{nome}-2"])[2]
            scarto = min(abs(h1 - h2), 360 - abs(h1 - h2))
            self.prove.append((f"le due intensità di {nome} hanno la stessa tonalità",
                               3 - scarto, 0.0, scarto <= 3))

        # Il controllo di cui sopra, fatto sul risultato e non sull'intenzione.
        for nome in self.nomi_materie:
            for suffisso in ("", "-2"):
                colore = self.t[f"--ag-subj-{nome}{suffisso}"]
                h_mat = lch(colore)[2]
                dh = min(abs(h_mat - ph), 360 - abs(h_mat - ph))
                self.prove.append((f"{nome}{suffisso} lontana di tonalità dal colore d'azione",
                                   dh, TONALITA_MINIMA, dh >= TONALITA_MINIMA))
                d = delta_e(colore, primario)
                self.prove.append((f"{nome}{suffisso} distinguibile dal colore d'azione",
                                   d, DISTANZA_MINIMA, d >= DISTANZA_MINIMA))

        # ── Ombre ─────────────────────────────────────────────────────
        if self.scuro:
            self.metti("--ag-shadow-color", f"{int(neutro_h * 0.75)} 60% 2%")
            for k, v in (("sm", 0.3), ("md", 0.55), ("lg", 0.7)):
                self.metti(f"--ag-shadow-a-{k}", str(v))
        else:
            self.metti("--ag-shadow-color", f"{int(neutro_h * 0.75)} 45% 14%")
            for k, v in (("sm", 0.05), ("md", 0.18), ("lg", 0.42)):
                self.metti(f"--ag-shadow-a-{k}", str(v))
        return self


# ── I candidati ────────────────────────────────────────────────────────────
# Tre direzioni, non tre sfumature della stessa: cambia la temperatura delle
# superfici E la tonalità del colore d'azione, che sono le due cose che si
# vedono da lontano.

CANDIDATI = {
    "carta": {
        "titolo": "Carta",
        "motivo": """Superfici di carta calda e un colore d'azione quasi nero, come
 * l'inchiostro di una penna su un quaderno. La serietà qui non viene da un
 * colore serio: viene dal non avere un colore d'azione acceso. Le materie
 * sono inchiostri diluiti, che su carta calda è il loro posto naturale.""",
        "neutro": {"h": 80},
        "chiaro": {"L_bg": 98.6, "C_bg": 3.2, "L_surface": 96.0, "C_surface": 4.0,
                   "L_strong": 92.2, "L_hairline": 91.0},
        "scuro": {"L_bg": 8.0, "C_bg": 3.5, "L_surface": 14.5, "C_surface": 4.0,
                  "L_strong": 20.0, "L_hairline": 18.0},
        # Quasi nero: è la scelta che fa la palette. Un colore d'azione a
        # 13:1 dal bianco non è «un blu scuro», è inchiostro — e su carta
        # calda un inchiostro freddo è esattamente quello che si vede su un
        # quaderno vero.
        "primario": {"h": 268, "C": 14, "profondita": 13.0, "profondita_scuro": 8.0, "soft_C": 4.0},
        # La rotazione non è estetica, è un vincolo: con l'offset di prima una
        # delle sei tonalità cadeva a 4° dal primario, e si chiamava perfino
        # `inchiostro` — lo stesso nome della metafora del colore d'azione.
        # 298 è la rotazione che massimizza la distanza minima dal primario.
        # Nel tema scuro il colore d'azione schiarisce fino a L≈72, cioè
        # dentro la fascia di chiarezza delle materie: due colori con la
        # stessa chiarezza e tonalità vicine sono lo stesso colore a occhio,
        # per quanto lontani siano sulla ruota. Le due intensità si spostano
        # sopra e sotto quella fascia invece di attraversarla.
        "materie": {"L_chiaro": [37, 50], "C_chiaro": 21, "L_scuro": [86, 61], "C_scuro": 19},
    },
    "bosco": {
        "titolo": "Bosco",
        "motivo": """Superfici grigio-verdi neutre e un verde profondo come colore
 * d'azione. È l'unico dei tre candidati che non è blu: il blu è il colore di
 * default delle app, e questo lo evita di proposito senza per questo
 * diventare caldo. Le materie partono da una rotazione diversa delle sei
 * tonalità, che si dispongono da sé il più lontano possibile dal verde
 * dell'app.""",
        "neutro": {"h": 155},
        "chiaro": {"L_bg": 100.0, "C_bg": 0.0, "L_surface": 96.2, "C_surface": 3.0,
                   "L_strong": 92.5, "L_hairline": 91.5},
        "scuro": {"L_bg": 7.0, "C_bg": 4.0, "L_surface": 14.0, "C_surface": 4.5,
                  "L_strong": 19.5, "L_hairline": 17.5},
        "primario": {"h": 158, "C": 26, "profondita": 9.0, "profondita_scuro": 7.5, "soft_C": 8.0},
        "materie": {"L_chiaro": [37, 50], "C_chiaro": 21, "L_scuro": [86, 61], "C_scuro": 19},
    },
}


# ── Scrittura ──────────────────────────────────────────────────────────────

ORDINE = [
    ("Superfici", ["--ag-bg", "--ag-surface", "--ag-surface-strong", "--ag-hairline"]),
    ("Testo", ["--ag-text", "--ag-text-muted", "--ag-text-faint"]),
    ("Colore d'azione", ["--ag-primary", "--ag-primary-pressed", "--ag-primary-ink",
                         "--ag-primary-soft", "--ag-primary-softer", "--ag-on-primary"]),
    ("Semantici", ["--ag-test", "--ag-test-soft", "--ag-test-ink",
                   "--ag-late", "--ag-late-soft", "--ag-late-ink",
                   "--ag-done", "--ag-done-soft", "--ag-done-ink",
                   "--ag-danger", "--ag-danger-soft"]),
    ("Spenti", ["--ag-disabled-bg", "--ag-disabled-text"]),
    ("Peso del giorno", [f"--ag-load-{i}" for i in range(6)]),
    ("Ombre", ["--ag-shadow-color", "--ag-shadow-a-sm", "--ag-shadow-a-md", "--ag-shadow-a-lg"]),
]


def blocco(p, selettore):
    righe = [f"{selettore} {{", f"  color-scheme: {p.tema};", ""]
    for titolo, nomi in ORDINE:
        righe.append(f"  /* ── {titolo} " + "─" * max(3, 58 - len(titolo)) + " */")
        for nome in nomi:
            if nome not in p.t:
                continue
            valore = p.t[nome]
            nota = p.note.get(nome)
            if nome.startswith("--ag-load-"):
                i = nome.rsplit("-", 1)[1]
                ink = p.t[f"--ag-load-ink-{i}"]
                riga = f"  {nome}: {valore};   --ag-load-ink-{i}: {ink};"
                righe.append(f"{riga}{' ' * max(1, 62 - len(riga))}/* {nota} */" if nota else riga)
                continue
            riga = f"  {nome}: {valore};"
            righe.append(f"{riga}{' ' * max(1, 34 - len(riga))}/* {nota} */" if nota else riga)
        righe.append("")
    righe.append("  /* ── Materie: sei tonalità, due intensità " + "─" * 25 + " */")
    for nome in [k for k in p.t if k.startswith("--ag-subj-") and not k.endswith(("-soft", "-ink"))]:
        righe.append(f"  {nome}: {p.t[nome]};")
        righe.append(f"  {nome}-soft: {p.t[nome + '-soft']};")
        righe.append(f"  {nome}-ink: {p.t[nome + '-ink']};   /* {p.note[nome]} */")
    righe.append("}")
    return "\n".join(righe)


def intestazione(spec, rapporto):
    return f"""/* Agenda — candidato palette «{spec['titolo']}».
 *
 * NON è un file in uso: è uno dei candidati da guardare in
 * palette-alternative/confronto.html. Quello scelto diventa
 * design_handoff/tokens/colors.css e gli altri si buttano.
 *
 * {spec['motivo'].strip()}
 *
 * Generato da tools/genera-palette.py: ogni rapporto di contrasto scritto qui
 * è calcolato dal programma che ha scelto il valore, non stimato a mano
 * (regola 3 di CLAUDE.md). Si modifica la ricetta nel generatore, non questo
 * file — e poi si rigenera.
 *
{rapporto}
 */

"""


def rapporto_materie(p):
    nomi = [k[len("--ag-subj-"):] for k in p.t
            if k.startswith("--ag-subj-") and not k.endswith(("-soft", "-ink"))]
    def base(n):
        return n[:-2] if n.endswith("-2") else n
    pieni = {n: p.t[f"--ag-subj-{n}"] for n in nomi}
    chip = {n: p.t[f"--ag-subj-{n}-soft"] for n in nomi}
    coppie = [(a, b) for i, a in enumerate(nomi) for b in nomi[i + 1:]]
    diverse = [(a, b) for a, b in coppie if base(a) != base(b)]
    stesse = [(a, b) for a, b in coppie if base(a) == base(b)]
    return (min(delta_e(pieni[a], pieni[b]) for a, b in diverse),
            min(delta_e(pieni[a], pieni[b]) for a, b in stesse),
            min(delta_e(chip[a], chip[b]) for a, b in diverse),
            len(coppie))


def main():
    solo_verifica = "--verifica" in sys.argv
    USCITA.mkdir(parents=True, exist_ok=True)
    problemi = 0

    for slug, spec in CANDIDATI.items():
        temi = {t: Palette(spec, t).costruisci() for t in ("light", "dark")}
        print(f"\n══ {spec['titolo']} ══")
        for tema, p in temi.items():
            falliti = [x for x in p.prove if not x[3]]
            print(f"  tema {tema:5s}: {len(p.prove)} controlli, {len(falliti)} falliti")
            for descrizione, valore, soglia, _ in falliti:
                problemi += 1
                print(f"    KO  {descrizione}: {valore:.2f} < {soglia}")
            d1, d2, d3, n = rapporto_materie(p)
            print(f"    materie ({n} coppie): ΔE {d1:.1f} fra tonalità · "
                  f"{d2:.1f} fra le due intensità · {d3:.1f} fra i chip")
            if d1 < 10:
                problemi += 1
                print(f"    KO  le tonalità non si distinguono: ΔE {d1:.1f} < 10")

        if not solo_verifica:
            righe = []
            for tema, p in temi.items():
                d1, d2, d3, n = rapporto_materie(p)
                righe.append(
                    f" * Tema {tema}: {len(p.prove)} controlli, tutti passati. Materie, su {n} "
                    f"coppie: ΔE minimo {d1:.1f} fra tonalità diverse (si distinguono senza "
                    f"sforzo) e {d3:.1f} fra i chip, che è il prezzo di restare desaturati — "
                    f"accettabile perché dentro un chip c'è sempre la sigla. Fra le due intensità "
                    f"della stessa tonalità ΔE è {d2:.1f}, ma è tutta differenza di CHIAREZZA: la "
                    f"tonalità è identica, quindi si leggono come due versioni dello stesso "
                    f"colore, che è lo scopo.")
            testo = intestazione(spec, "\n".join(righe))
            testo += "/* ══ TEMA CHIARO " + "═" * 58 + " */\n\n"
            testo += blocco(temi["light"], ':root,\n:root[data-theme="light"]') + "\n\n"
            testo += "/* ══ TEMA SCURO " + "═" * 59 + " */\n\n"
            testo += blocco(temi["dark"], ':root[data-theme="dark"]') + "\n"
            percorso = USCITA / f"{spec['titolo'].lower()}.css"
            percorso.write_text(testo, encoding="utf-8")
            print(f"  scritto {percorso.relative_to(RADICE)} ({len(testo.splitlines())} righe)")

    print()
    return 1 if problemi else 0


if __name__ == "__main__":
    sys.exit(main())
