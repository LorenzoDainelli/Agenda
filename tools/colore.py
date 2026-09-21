"""Matematica del colore, la parte che serve a questo progetto.

Sta in un file suo perché la usano in due: il generatore delle palette e il
controllo dei contrasti. Nessuna dipendenza: conversioni scritte a mano.

Due spazi, per due lavori diversi:

* **sRGB** con la luminanza relativa di WCAG, per i **contrasti**. È la
  formula del contrasto, non una sua approssimazione.
* **CIELAB** (e la sua forma polare LCh), per **scegliere** i colori: in Lab
  la chiarezza è separata dalla tonalità, quindi si può dire «lo stesso
  colore, più scuro» e ottenerlo davvero. E la distanza fra due punti in Lab
  (ΔE) dice quanto due colori si distinguono a occhio, che è la domanda vera
  quando si sceglie il colore di una materia.
"""

import math

# Bianco D65, lo stesso riferimento che usa sRGB.
BIANCO = (0.95047, 1.0, 1.08883)


# ── sRGB ───────────────────────────────────────────────────────────────────

def hex_a_rgb(valore):
    """'#16405c' → (0.086, 0.251, 0.361), canali 0…1."""
    v = valore.strip().lstrip("#")
    if len(v) == 3:
        v = "".join(c * 2 for c in v)
    return tuple(int(v[i:i + 2], 16) / 255 for i in (0, 2, 4))


def rgb_a_hex(rgb):
    return "#" + "".join(f"{round(max(0.0, min(1.0, c)) * 255):02x}" for c in rgb)


def _lineare(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def _gamma(c):
    return c * 12.92 if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055


def luminanza(rgb):
    """Luminanza relativa secondo WCAG 2."""
    r, g, b = (_lineare(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrasto(a, b):
    """Rapporto di contrasto WCAG fra due colori, ≥ 1. Accetta hex o rgb."""
    la = luminanza(hex_a_rgb(a) if isinstance(a, str) else a)
    lb = luminanza(hex_a_rgb(b) if isinstance(b, str) else b)
    chiaro, scuro = max(la, lb), min(la, lb)
    return (chiaro + 0.05) / (scuro + 0.05)


def cr(a, b):
    """Il contrasto come lo si scrive nei commenti: '10.93'."""
    return f"{contrasto(a, b):.2f}"


# ── CIELAB ─────────────────────────────────────────────────────────────────

def _f(t):
    return t ** (1 / 3) if t > 216 / 24389 else (24389 / 27 * t + 16) / 116


def _f_inv(t):
    return t ** 3 if t ** 3 > 216 / 24389 else (116 * t - 16) / (24389 / 27)


def rgb_a_lab(rgb):
    r, g, b = (_lineare(c) for c in rgb)
    x = 0.4124564 * r + 0.3575761 * g + 0.1804375 * b
    y = 0.2126729 * r + 0.7151522 * g + 0.0721750 * b
    z = 0.0193339 * r + 0.1191920 * g + 0.9503041 * b
    fx, fy, fz = (_f(v / w) for v, w in zip((x, y, z), BIANCO))
    return (116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz))


def lab_a_rgb(lab):
    """Lab → sRGB. Restituisce anche se è finito fuori dai colori
    rappresentabili: chi chiama decide cosa farne (vedi `lch_a_hex`)."""
    L, a, b = lab
    fy = (L + 16) / 116
    fx, fz = fy + a / 500, fy - b / 200
    x, y, z = (_f_inv(v) * w for v, w in zip((fx, fy, fz), BIANCO))
    r = 3.2404542 * x - 1.5371385 * y - 0.4985314 * z
    g = -0.9692660 * x + 1.8760108 * y + 0.0415560 * z
    bl = 0.0556434 * x - 0.2040259 * y + 1.0572252 * z
    return tuple(_gamma(c) for c in (r, g, bl))


def fuori_gamut(rgb):
    return any(c < -0.0005 or c > 1.0005 for c in rgb)


def lch_a_hex(L, C, h):
    """LCh → hex, rientrando nel gamut abbassando la saturazione.

    Se un colore chiesto non esiste in sRGB, la scelta è fra tagliare i canali
    (che sposta la tonalità e la chiarezza: il colore non è più quello che si
    è chiesto) e togliere saturazione tenendo fermi L e h. Si toglie
    saturazione: la chiarezza è quella che governa i contrasti, e la tonalità
    è quella che distingue una materia dall'altra. La saturazione è la sola
    delle tre di cui si può fare a meno.
    """
    rad = math.radians(h)
    for i in range(400):
        c = C * (1 - i / 400)
        rgb = lab_a_rgb((L, c * math.cos(rad), c * math.sin(rad)))
        if not fuori_gamut(rgb):
            return rgb_a_hex(rgb)
    return rgb_a_hex(lab_a_rgb((L, 0, 0)))


def lch(colore):
    """hex → (L, C, h)."""
    L, a, b = rgb_a_lab(hex_a_rgb(colore))
    return (L, math.hypot(a, b), math.degrees(math.atan2(b, a)) % 360)


def delta_e(a, b):
    """ΔE*ab (CIE76): distanza in linea d'aria fra due colori in Lab.

    Sotto 2 due colori sono la stessa cosa, verso 5 si distinguono guardando,
    sopra 10 si distinguono senza guardare. Serve per i colori delle materie:
    il contrasto dice se un colore si VEDE sul suo fondo, ΔE dice se due
    colori si distinguono FRA LORO — due domande diverse, e per le materie
    conta la seconda.
    """
    la, lb = rgb_a_lab(hex_a_rgb(a)), rgb_a_lab(hex_a_rgb(b))
    return math.dist(la, lb)


# ── Risolvere per contrasto ────────────────────────────────────────────────

def per_contrasto(bersaglio, fondo, h, C, verso, L_min=0.0, L_max=100.0):
    """Il colore di tonalità `h` che sul fondo dato fa almeno `bersaglio`.

    `verso` è "scuro" o "chiaro": da che parte del fondo cercare. Fra tutti i
    valori che passano si prende quello che si allontana MENO dal fondo, cioè
    il più colorato dei sufficienti — un colore più scuro del necessario passa
    il contrasto ma spegne la palette senza guadagnare niente.

    Si scandiscono le chiarezze invece di dimezzare l'intervallo perché il
    rientro nel gamut rende la funzione non del tutto monotona, e una
    bisezione su una funzione non monotona trova un valore che passa ma non il
    migliore.
    """
    passi = [L_min + (L_max - L_min) * i / 1000 for i in range(1001)]
    if verso == "scuro":
        passi.reverse()  # dal più chiaro: il primo che passa è il più colorato
    candidati = []
    for L in passi:
        colore = lch_a_hex(L, C, h)
        if contrasto(colore, fondo) >= bersaglio:
            candidati.append(colore)
            if len(candidati) >= 1:
                return colore
    return lch_a_hex(L_min if verso == "scuro" else L_max, C, h)


def almeno(colore, fondo, bersaglio, verso, C=None):
    """Tiene il colore se passa già, se no lo porta al minimo che passa.

    È la funzione che rende vera la regola 3: un valore scelto a occhio resta
    solo se il conto gli dà ragione, e se non gliela dà viene corretto invece
    di essere annotato con un numero sbagliato.
    """
    if contrasto(colore, fondo) >= bersaglio:
        return colore
    L, c, h = lch(colore)
    return per_contrasto(bersaglio, fondo, h, C if C is not None else c, verso)
