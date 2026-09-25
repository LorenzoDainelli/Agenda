#!/usr/bin/env python3
"""Controlla i pochi colori che sono costretti a stare fuori dai token.

Un `<meta name="theme-color">` e un manifest sono JSON e HTML: non leggono le
variabili CSS, quindi quei due o tre valori vanno scritti a mano. Il problema
non è scriverli, è che restano indietro — è già successo: il manifest portava
ancora il primario della prima palette, e la barra di stato del tema scuro un
fondo che non esisteva più. Un occhio non lo vede, questo script sì.

Uso: python3 tools/colori-fuori-dai-token.py   (esce 1 se qualcosa non torna)
"""

import json
import pathlib
import re
import sys

RADICE = pathlib.Path(__file__).resolve().parent.parent
TOKEN = RADICE / "design_handoff" / "tokens" / "colors.css"


def token(nome, tema):
    """Il valore di un token nel blocco del tema chiesto.

    I due blocchi sono separati dal selettore del tema scuro: prima c'è il
    chiaro, dopo lo scuro. Si taglia lì invece di interpretare il CSS.
    """
    testo = TOKEN.read_text(encoding="utf-8")
    taglio = testo.index(':root[data-theme="dark"]')
    blocco = testo[:taglio] if tema == "light" else testo[taglio:]
    trovato = re.search(rf"^\s*{re.escape(nome)}:\s*(#[0-9a-fA-F]{{3,8}})\s*;", blocco, re.M)
    if not trovato:
        sys.exit(f"token {nome} non trovato nel tema {tema}: controllare {TOKEN}")
    return trovato.group(1).lower()


def main():
    bg_chiaro = token("--ag-bg", "light")
    bg_scuro = token("--ag-bg", "dark")
    primario = token("--ag-primary", "light")

    errori = []

    # La barra di stato: i due valori compaiono nello script inline dell'HTML
    # (prima di qualunque disegno) e in applyTheme(), che li riscrive quando il
    # tema cambia a app aperta. Devono essere gli stessi in entrambi i posti.
    for percorso in ("src/index.html", "src/js/app.js"):
        testo = (RADICE / percorso).read_text(encoding="utf-8").lower()
        for valore, tema in ((bg_chiaro, "chiaro"), (bg_scuro, "scuro")):
            if valore not in testo:
                errori.append(f"{percorso}: la barra di stato del tema {tema} non è {valore} (--ag-bg)")

    manifest = json.loads((RADICE / "src" / "manifest.webmanifest").read_text(encoding="utf-8"))
    if manifest.get("theme_color", "").lower() != primario:
        errori.append(f"manifest: theme_color è {manifest.get('theme_color')}, il primario è {primario}")
    if manifest.get("background_color", "").lower() != bg_chiaro:
        errori.append(f"manifest: background_color è {manifest.get('background_color')}, --ag-bg è {bg_chiaro}")

    for errore in errori:
        print(errore)
    return 1 if errori else 0


if __name__ == "__main__":
    sys.exit(main())
