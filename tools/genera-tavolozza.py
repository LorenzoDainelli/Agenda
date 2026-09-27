#!/usr/bin/env python3
"""Genera la tabella dei colori delle materie, e la verifica.

La tabella è quella che l'utente ha mandato come riferimento il 26 settembre
2026 (la tavolozza a griglia dell'iPhone: dieci righe, dodici colonne), con
la richiesta di «ammorbidire in automatico i colori più a pastello». Le 120
caselle sono campionate da quella immagine e stanno qui sotto, in `SORGENTE`.

Dalla casella di partenza si tengono due cose, e il resto lo decide il conto:

* la **tonalità** (h in LCh), che è quello che fa riconoscere un colore;
* il **posto nella riga**: la riga dice quanto è chiaro, dal più cupo in alto
  al più tenue in basso, come nell'originale.

La chiarezza vera invece non si prende dall'originale: si riparte da quella
che serve a ogni tema. Nel tema scuro il pallino deve stare chiaro sul fondo
scuro, nel chiaro scuro sul fondo chiaro, e l'originale — pensato per un
foglio bianco — nel tema scuro avrebbe le prime righe invisibili.

Il pastello è l'intensità (C in LCh) tagliata a `INTENSITA`: quello che
nell'originale grida (il giallo limone, il blu elettrico) scende al tetto, e
quello che era già tenue resta com'era.

Ogni colore porta il suo contrasto misurato (regola 3 di CLAUDE.md), e se una
sola casella non passa la soglia il programma si ferma invece di scrivere.

Uso:
    python3 tools/genera-tavolozza.py              # riscrive il file dei token
    python3 tools/genera-tavolozza.py --verifica   # esce 1 se il file non è
                                                   # quello che uscirebbe da qui
"""

import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from colore import contrasto, delta_e, lch, lch_a_hex, per_contrasto  # noqa: E402

RADICE = pathlib.Path(__file__).resolve().parent.parent
TOKEN = RADICE / "design_handoff" / "tokens" / "colors.css"
USCITA = RADICE / "design_handoff" / "tokens" / "tavolozza.css"

# ── La decisione che resta umana ───────────────────────────────────────────
# Il tetto dell'intensità. Tre livelli sono stati messi a confronto sulla
# schermata vera: 22 (tenue, quasi grigio), 34 (pastello), 46 (vivo). Scelto
# 34 (A57): sotto, le colonne vicine — il blu e l'indaco, l'arancio e
# l'ambra — cominciano a confondersi; sopra, la tabella torna a essere quella
# dell'iPhone. Si cambia qui e si rilancia.
INTENSITA = 34

# ── Soglie ─────────────────────────────────────────────────────────────────
# 3:1 per il pallino (elemento non testuale che porta informazione), 4.5:1 per
# l'inchiostro del chip. Si mira più in alto della soglia (3.2 e 7) perché il
# rientro nel gamut arrotonda, e perché un inchiostro a 7:1 si legge anche al
# sole — che è dove si guarda un telefono fra un'ora e l'altra.
INFORMATIVO, MIRA_PALLINO = 3.0, 3.2
TESTO, MIRA_INCHIOSTRO = 4.5, 7.0

# Sotto questa distanza dal colore d'azione una materia comincia a sembrare
# un pulsante (vedi i token). La tabella ha tutte le tinte, blu compresi, e
# le caselle troppo vicine non si tolgono: si contano e si scrivono (A60).
DISTANZA_AZIONE = 15.0

RIGHE, COLONNE = 10, 12

# Campionata dall'immagine di riferimento, riga per riga. La prima riga sono i
# grigi, dal bianco al nero; nelle altre le colonne sono le tinte (azzurro,
# blu, indaco, viola, magenta, rosso, arancio, ambra, giallo scuro, giallo,
# lime, verde) e le righe vanno dal più cupo al più tenue.
SORGENTE = [
    ("#ffffff", "#ebebeb", "#d6d6d6", "#c2c2c2", "#adadad", "#999999", "#858585", "#707070", "#5c5c5c", "#474747", "#333333", "#000000"),
    ("#133648", "#081c53", "#0e0537", "#29093a", "#370c1b", "#541108", "#532007", "#53350c", "#523e0f", "#65611a", "#505518", "#2b3d16"),
    ("#1e4c63", "#0f2e76", "#180a4e", "#3f1156", "#4d1629", "#781e0e", "#712f0f", "#734c15", "#735919", "#8c8628", "#707625", "#3f5623"),
    ("#2f6c8c", "#1941a3", "#280b72", "#591e77", "#6f223d", "#a62c17", "#a0461a", "#a06b23", "#9f7d27", "#c2bc3c", "#9da536", "#587934"),
    ("#3d8ab0", "#2255ce", "#321b8e", "#702898", "#8d2e4f", "#d03a20", "#ca5a24", "#c8872e", "#c99f35", "#f4ed4d", "#c5d147", "#729b44"),
    ("#479fd3", "#285ff6", "#4724ab", "#8c33b6", "#aa395d", "#eb512e", "#ed732e", "#f3ae3c", "#f5c944", "#fefc67", "#ddec5c", "#86b953"),
    ("#59c4f7", "#4f85f6", "#5832e2", "#af43ec", "#d44a7a", "#ed6c58", "#ef8c56", "#f3b757", "#f6ce5b", "#fff981", "#e6f07a", "#a3d16e"),
    ("#78d3f8", "#7fa6f8", "#7e52f5", "#c45ff6", "#de789d", "#f09286", "#f2a984", "#f6c983", "#f9db85", "#fff9a1", "#ebf39b", "#badc94"),
    ("#a5e1fb", "#adc5fa", "#ab8df7", "#d696f8", "#e8a8bf", "#f5b8b1", "#f6c7af", "#f9dbae", "#fae5af", "#fefbc1", "#f3f8be", "#d2e7ba"),
    ("#d2f0fe", "#d6e2fd", "#d6cafa", "#eaccfb", "#f3d5df", "#f9dcd9", "#fae3d8", "#fcedd8", "#fef4d8", "#fefce1", "#f8fbde", "#e3efd6"),
]


def token(nome, tema):
    """Un valore di colors.css, nel blocco del tema chiesto (come fa
    colori-fuori-dai-token.py: prima del selettore scuro c'è il chiaro)."""
    testo = TOKEN.read_text(encoding="utf-8")
    taglio = testo.index(':root[data-theme="dark"]')
    blocco = testo[:taglio] if tema == "light" else testo[taglio:]
    trovato = re.search(rf"^\s*{re.escape(nome)}:\s*(#[0-9a-fA-F]{{6}})\s*;", blocco, re.M)
    if not trovato:
        sys.exit(f"token {nome} non trovato nel tema {tema}: controllare {TOKEN}")
    return trovato.group(1).lower()


def tra(a, b, t):
    return a + (b - a) * t


def casella(r, c, tema, fondo):
    """I tre colori di una casella: pallino, fondo del chip, inchiostro."""
    _, C, h = lch(SORGENTE[r][c])
    if r == 0:
        # i grigi: la posizione nella riga fa la chiarezza, dal chiaro a
        # sinistra allo scuro a destra, come nell'originale
        t, C = 1 - c / (COLONNE - 1), 0
    else:
        t = (r - 1) / (RIGHE - 2)
    C = min(C, INTENSITA)
    if tema == "dark":
        # pallini fra L 60 e 90: sotto 60 le prime righe sul fondo scuro
        # starebbero vicino alla soglia, sopra 90 sarebbero tutte bianche
        pieno = lch_a_hex(tra(60, 90, t), C, h)
        chip = lch_a_hex(tra(14, 24, t), min(C * 0.6, 18), h)
        inchiostro = per_contrasto(MIRA_INCHIOSTRO, chip, h, min(C * 0.7, 24), "chiaro", L_min=50)
    else:
        # nel chiaro il pallino sta scuro, se no sul fondo chiaro non si vede:
        # il pastello qui è il fondo del chip, non il pallino
        pieno = lch_a_hex(tra(28, 56, t), C, h)
        if contrasto(pieno, fondo) < MIRA_PALLINO:
            pieno = per_contrasto(MIRA_PALLINO, fondo, h, C, "scuro")
        chip = lch_a_hex(tra(84, 93, t), min(C * 0.45, 16), h)
        inchiostro = per_contrasto(MIRA_INCHIOSTRO, chip, h, min(C * 0.8, 30), "scuro", L_max=50)
    return pieno, chip, inchiostro


def tema(nome_tema):
    fondo = token("--ag-surface", nome_tema)
    azione = token("--ag-primary", nome_tema)
    righe, sbagliate, vicine = [], [], []
    for r in range(RIGHE):
        for c in range(COLONNE):
            pieno, chip, inchiostro = casella(r, c, nome_tema, fondo)
            cp, ci = contrasto(pieno, fondo), contrasto(inchiostro, chip)
            if cp < INFORMATIVO or ci < TESTO:
                sbagliate.append(f"t-{r}-{c}: pallino {cp:.2f} · inchiostro {ci:.2f}")
            if delta_e(pieno, azione) < DISTANZA_AZIONE:
                vicine.append(f"t-{r}-{c}")
            base = f"--ag-subj-t-{r}-{c}"
            righe.append("  " + f"{base}: {pieno};".ljust(28)
                         + f"{base}-soft: {chip};".ljust(33)
                         + f"{base}-ink: {inchiostro};".ljust(32)
                         + f"/* {cp:5.2f} · {ci:5.2f} */")
    return righe, sbagliate, vicine


def scrivi():
    chiaro, sb_chiaro, vicine_chiaro = tema("light")
    scuro, sb_scuro, vicine_scuro = tema("dark")
    if sb_chiaro or sb_scuro:
        sys.exit("caselle sotto soglia:\n  " + "\n  ".join(sb_chiaro + sb_scuro))
    testa = f"""/* Agenda — la tabella dei colori delle materie.
 *
 * GENERATO da tools/genera-tavolozza.py: non si modifica a mano. Si cambia
 * il generatore e lo si rilancia, se no i numeri nei commenti smettono di
 * dire la verità.
 *
 * Dieci righe per dodici colonne, dalla tabella che l'utente ha mandato come
 * riferimento (la griglia dei colori dell'iPhone), ammorbidita a pastello:
 * intensità tagliata a {INTENSITA} in LCh (A57). La prima riga sono i grigi;
 * nelle altre ogni colonna è una tinta, dal più cupo in alto al più tenue in
 * basso.
 *
 * Il nome di una casella è `t-RIGA-COLONNA`, contando da zero: è quello che
 * si salva nella materia (A58), e i tre token si chiamano come quelli dei
 * dodici colori di prima, così chi dipinge una materia non vede differenza.
 *
 * I due numeri accanto a ogni riga, misurati: pallino su --ag-surface ·
 * inchiostro sul chip. Soglie {INFORMATIVO:.0f}:1 e {TESTO}:1, e il generatore si
 * ferma se una casella sola non passa.
 *
 * Il colore d'azione: la tabella ha tutte le tinte, blu compresi. Stanno a
 * meno di ΔE {DISTANZA_AZIONE:.0f} dal colore d'azione {len(vicine_chiaro)} caselle nel tema chiaro
 * ({", ".join(vicine_chiaro) or "nessuna"}) e {len(vicine_scuro)} nello scuro
 * ({", ".join(vicine_scuro) or "nessuna"}).
 * Non si tolgono: il colore lo sceglie lui, e accanto al colore di una
 * materia c'è sempre il suo nome o la sua sigla. Rischio noto (A60).
 */
"""
    testo = (testa
             + "\n:root,\n:root[data-theme=\"light\"] {\n" + "\n".join(chiaro) + "\n}\n"
             + "\n:root[data-theme=\"dark\"] {\n" + "\n".join(scuro) + "\n}\n")
    return testo, vicine_chiaro, vicine_scuro


def main():
    testo, vicine_chiaro, vicine_scuro = scrivi()
    print(f"intensità {INTENSITA}: 120 caselle per tema, tutte sopra soglia")
    print(f"vicine al colore d'azione (ΔE < {DISTANZA_AZIONE:.0f}):")
    print("  chiaro:", " ".join(vicine_chiaro) or "nessuna")
    print("  scuro: ", " ".join(vicine_scuro) or "nessuna")
    if "--verifica" in sys.argv:
        if not USCITA.exists() or USCITA.read_text(encoding="utf-8") != testo:
            sys.exit(f"{USCITA.relative_to(RADICE)} non è quello che esce dal generatore: "
                     "è stato toccato a mano, o il generatore è cambiato senza rilanciarlo")
        print(f"{USCITA.relative_to(RADICE)} è aggiornato")
        return
    USCITA.write_text(testo, encoding="utf-8")
    print(f"scritto {USCITA.relative_to(RADICE)}")


if __name__ == "__main__":
    main()
