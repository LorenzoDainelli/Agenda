#!/usr/bin/env python3
"""Costruisce la pagina che mette le palette candidate una accanto all'altra.

Una palette non si giudica da una tavolozza di quadratini: si giudica sulla
schermata che si guarderà tutti i giorni. Questa pagina prende il markup VERO
dell'app (catturato da test/browser/cattura-schermate.mjs) e gli cambia sotto
i token, così fra un candidato e l'altro cambia solo il colore — non le
proporzioni, non i testi, non cosa c'è dentro le righe.

Uso:
    python3 tools/confronto-palette.py <markup.json> [--autonomo <cartella>]

`--autonomo` scrive una seconda copia con tutto il CSS dentro il file, da
aprire sul telefono senza avere il repo a portata di mano.
"""

import json
import pathlib
import re
import sys

RADICE = pathlib.Path(__file__).resolve().parent.parent
CARTELLA = RADICE / "design_handoff" / "palette-alternative"

# (chiave, titolo, file, in una riga cosa la distingue)
CANDIDATI = [
    ("notte", "Notte", RADICE / "design_handoff" / "tokens" / "colors.css",
     "quella che hai ora: bianco freddo, blu notte"),
    ("carta", "Carta", CARTELLA / "carta.css",
     "carta calda, colore d'azione quasi nero"),
    ("bosco", "Bosco", CARTELLA / "bosco.css",
     "grigio neutro, verde profondo — l'unica non blu"),
]


def scopa(css, chiave):
    """Riscrive i due selettori di tema in modo che tre palette convivano.

    I file dei candidati sono scritti per diventare `tokens/colors.css`, quindi
    dichiarano i token su `:root`. Tre `:root` nella stessa pagina si
    sovrascriverebbero a vicenda, e vincerebbe l'ultimo: qui ognuno viene
    legato al suo `data-palette`, che è l'unica differenza fra i tre file
    caricati insieme.
    """
    css = re.sub(r':root,\s*\n:root\[data-theme="light"\]',
                 f'[data-palette="{chiave}"][data-theme="light"]', css)
    css = css.replace(':root[data-theme="dark"]', f'[data-palette="{chiave}"][data-theme="dark"]')
    return css


CHROME = """
/* La pagina di confronto ha un vestito suo, fatto con gli stessi token:
   cambiando palette cambia anche lui, che è voluto — si vede il colore
   d'azione applicato a un comando vero, non a un quadratino. */
* { box-sizing: border-box; }
/* Questa regola nell'app sta in app.css, che qui non si carica (porterebbe
   anche l'altezza fissa e lo scorrimento interno, che in una pagina di
   confronto sono d'impiccio). Senza di lei tutto ciò che nell'app è nascosto
   — l'avviso della rassegna, i livelli chiusi — si vedrebbe come un riquadro
   vuoto, ed era esattamente quello che si vedeva. */
[hidden] { display: none !important; }
body {
  margin: 0;
  background: var(--ag-surface);
  color: var(--ag-text);
  font-family: var(--ag-font);
  -webkit-text-size-adjust: 100%;
}
.cf-barra {
  position: sticky; top: 0; z-index: 5;
  display: flex; flex-direction: column; gap: var(--ag-space-2);
  padding: var(--ag-space-3) var(--ag-gutter);
  background: var(--ag-bg);
  border-bottom: 1px solid var(--ag-hairline);
}
.cf-riga { display: flex; gap: var(--ag-space-2); align-items: center; }
.cf-riga--scelte { overflow-x: auto; scrollbar-width: none; }
.cf-btn {
  flex: 1 0 auto;
  min-height: var(--ag-touch-min);
  padding: 0 var(--ag-space-4);
  border: 1px solid var(--ag-hairline);
  border-radius: var(--ag-radius-pill);
  background: var(--ag-surface);
  color: var(--ag-text);
  font: inherit;
  font-size: var(--ag-size-sm);
  font-weight: var(--ag-weight-semibold);
}
.cf-btn[aria-pressed="true"] {
  background: var(--ag-primary);
  border-color: var(--ag-primary);
  color: var(--ag-on-primary);
}
.cf-nota {
  margin: 0;
  font-size: var(--ag-size-xs);
  color: var(--ag-text-muted);
}
.cf-schermo {
  margin: var(--ag-space-5) auto;
  max-width: var(--ag-app-max-width);
  /* Le due schermate stanno una sotto l'altra e scorre la pagina, non
     l'elenco: nell'app il corpo scorre da sé, qui no. */
  pointer-events: none;
}
.cf-schermo .ag-app { height: auto; overflow: visible; box-shadow: var(--ag-shadow-md); }
.cf-schermo .ag-app__body { overflow: visible; padding-top: var(--ag-space-4); }
.cf-titolo {
  max-width: var(--ag-app-max-width);
  margin: var(--ag-space-6) auto var(--ag-space-2);
  padding-inline: var(--ag-gutter);
  font-size: var(--ag-size-2xs);
  font-weight: var(--ag-weight-semibold);
  letter-spacing: var(--ag-tracking-wide);
  text-transform: uppercase;
  color: var(--ag-text-muted);
}
.cf-pannello {
  background: var(--ag-bg);
  box-shadow: var(--ag-shadow-md);
  padding: var(--ag-space-4) var(--ag-gutter) var(--ag-space-6);
  display: flex; flex-direction: column; gap: var(--ag-space-6);
}
.cf-materie {
  max-width: var(--ag-app-max-width);
  margin: 0 auto var(--ag-space-8);
  padding: var(--ag-space-4) var(--ag-gutter);
  background: var(--ag-bg);
  box-shadow: var(--ag-shadow-md);
}
.cf-griglia { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--ag-space-2); }
.cf-mat { display: flex; align-items: center; gap: var(--ag-space-2); font-size: var(--ag-size-sm); }
.cf-pallino { width: 14px; height: 14px; border-radius: 50%; flex: none; }
"""

SCRIPT = """
(function () {
  var radice = document.documentElement;
  function scegli(attributo, valore) {
    radice.dataset[attributo] = valore;
    document.querySelectorAll('[data-imposta="' + attributo + '"]').forEach(function (b) {
      b.setAttribute("aria-pressed", b.dataset.valore === valore ? "true" : "false");
    });
    try { localStorage.setItem("confronto:" + attributo, valore); } catch (e) {}
  }
  document.querySelectorAll("[data-imposta]").forEach(function (b) {
    b.addEventListener("click", function () { scegli(b.dataset.imposta, b.dataset.valore); });
  });
  // Il tema di partenza è quello del telefono, la palette è quella in uso:
  // così la prima cosa che si vede è lo stato attuale, e il confronto parte
  // da lì invece che da una preferenza inventata.
  var temaSalvato, palSalvata;
  try {
    temaSalvato = localStorage.getItem("confronto:theme");
    palSalvata = localStorage.getItem("confronto:palette");
  } catch (e) {}
  var scuro = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  scegli("theme", temaSalvato || (scuro ? "dark" : "light"));
  scegli("palette", palSalvata || "notte");
})();
"""


def alias_materie(css_candidato, chiave, nomi_in_uso, nomi_candidato):
    """Fa rispondere il candidato anche ai nomi dei colori della palette in uso.

    Il markup catturato nomina i colori come li nomina l'app oggi
    (`--ag-subj-petrolio`…). Un candidato ha nomi suoi, perché le sue tonalità
    sono altre: senza questo pezzo i pallini delle materie sparirebbero — e
    infatti erano spariti, cioè il confronto stava nascondendo proprio una
    delle cose da confrontare.

    Le due liste sono nello stesso ordine (sei tonalità, ognuna piena e
    chiara), quindi si accoppiano per posizione. Nella palette che verrà
    scelta i nomi si rinominano una volta e questo pezzo non serve più.
    """
    righe = []
    for vecchio, nuovo in zip(nomi_in_uso, nomi_candidato):
        for suffisso in ("", "-soft", "-ink"):
            righe.append(f"  --ag-subj-{vecchio}{suffisso}: var(--ag-subj-{nuovo}{suffisso});")
    return (f'\n/* I nomi della palette in uso, rimandati ai colori di questo candidato:\n'
            f' * il markup catturato chiede quelli. */\n'
            f'[data-palette="{chiave}"][data-theme="light"],\n'
            f'[data-palette="{chiave}"][data-theme="dark"] {{\n'
            + "\n".join(righe) + "\n}\n")


def materie(css, chiave):
    """I nomi delle materie di una palette, per la fila dei pallini."""
    blocco = css[:css.index(f'[data-palette="{chiave}"][data-theme="dark"]')]
    nomi = re.findall(r"--ag-subj-([a-z0-9-]+):\s*#", blocco)
    return [n for n in nomi if not n.endswith(("-soft", "-ink"))]


def pagina(pezzi, css_token, nomi_materie, autonomo):
    teste = "".join(
        f'<button class="cf-btn" type="button" data-imposta="palette" data-valore="{k}" '
        f'aria-pressed="false">{titolo}</button>'
        for k, titolo, _, _ in CANDIDATI)
    note = "".join(
        f'<span data-per-palette="{k}" hidden>{descrizione}</span>'
        for k, _, _, descrizione in CANDIDATI)

    # Un blocco di pallini per candidato, ognuno coi SUOI nomi: sono quelli
    # che si leggerebbero nelle impostazioni, e un nome che non corrisponde al
    # colore è la prima cosa che fa perdere fiducia in una palette.
    blocchi = []
    for k, _, _, _ in CANDIDATI:
        pallini = "".join(
            f'<div class="cf-mat"><span class="cf-pallino" style="background:var(--ag-subj-{n})"></span>'
            f'<span>{n.replace("-2", " 2")}</span></div>' for n in nomi_materie[k])
        blocchi.append(f'<div class="cf-materie" data-per-palette="{k}" hidden>'
                       f'<div class="cf-griglia">{pallini}</div></div>')
    pallini = "".join(blocchi)

    if autonomo:
        stile = (f"<style>\n{css_token}\n</style>\n<style>{CHROME}</style>")
    else:
        stile = ('<link rel="stylesheet" href="../tokens/typography.css">\n'
                 '<link rel="stylesheet" href="../tokens/space.css">\n'
                 '<link rel="stylesheet" href="confronto-token.css">\n'
                 '<link rel="stylesheet" href="../components.css">\n'
                 f'<style>{CHROME}</style>')

    return f"""<!doctype html>
<html lang="it" data-theme="light" data-palette="notte">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Palette a confronto</title>
<!-- GENERATO da tools/confronto-palette.py — non si modifica a mano.
     Il markup delle due schermate è quello vero dell'app, catturato da
     test/browser/cattura-schermate.mjs: fra un candidato e l'altro cambiano
     solo i token, e quindi solo i colori. I comandi non fanno niente: qui si
     guarda, non si usa. -->
{stile}
</head>
<body>

<div class="cf-barra">
  <div class="cf-riga cf-riga--scelte">{teste}</div>
  <div class="cf-riga">
    <button class="cf-btn" type="button" data-imposta="theme" data-valore="light" aria-pressed="false">Chiaro</button>
    <button class="cf-btn" type="button" data-imposta="theme" data-valore="dark" aria-pressed="false">Scuro</button>
  </div>
  <p class="cf-nota">{note}</p>
</div>

<p class="cf-titolo">La schermata di tutti i giorni</p>
<div class="cf-schermo">
  <div class="ag-app">
    {pezzi['intestazione']}
    <div class="ag-app__body">{pezzi['corpo']}</div>
    {pezzi['barra']}
  </div>
</div>

<p class="cf-titolo">La settimana</p>
<div class="cf-schermo">
  <div class="cf-pannello">{pezzi['settimana']}</div>
</div>

<p class="cf-titolo">I dodici colori delle materie</p>
{pallini}

<script>{SCRIPT}</script>
<script>
/* La riga sotto ai pulsanti dice in una frase cosa distingue il candidato
   scelto: tre palette si confondono in fretta, e senza la frase si finisce a
   toccare i pulsanti senza sapere più quale si sta guardando. */
(function () {{
  function aggiorna() {{
    var attuale = document.documentElement.dataset.palette;
    document.querySelectorAll("[data-per-palette]").forEach(function (n) {{
      n.hidden = n.dataset.perPalette !== attuale;
    }});
  }}
  document.querySelector(".cf-barra").addEventListener("click", function () {{
    setTimeout(aggiorna, 0);
  }});
  aggiorna();
}})();
</script>
</body>
</html>
"""


def main():
    argomenti = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not argomenti:
        sys.exit("uso: python3 tools/confronto-palette.py <markup.json> [--autonomo <cartella>]")
    pezzi = json.loads(pathlib.Path(argomenti[0]).read_text(encoding="utf-8"))

    # ── i token dei tre candidati, ognuno legato al suo data-palette ──
    parti, nomi = [], {}
    for chiave, titolo, percorso, _ in CANDIDATI:
        scopato = scopa(percorso.read_text(encoding="utf-8"), chiave)
        nomi[chiave] = materie(scopato, chiave)
        parti.append(f"/* ══ {titolo} — da {percorso.name} ══ */\n" + scopato)
    in_uso = nomi[CANDIDATI[0][0]]
    for chiave, _, _, _ in CANDIDATI[1:]:
        parti.append(alias_materie(None, chiave, in_uso, nomi[chiave]))
    css_token = "\n\n".join(parti)
    (CARTELLA / "confronto-token.css").write_text(
        "/* GENERATO da tools/confronto-palette.py: i tre candidati messi\n"
        " * insieme, ognuno legato al suo data-palette. Non si modifica a mano:\n"
        " * si modificano i file dei candidati e si rigenera. */\n\n" + css_token,
        encoding="utf-8")

    (CARTELLA / "confronto.html").write_text(pagina(pezzi, css_token, nomi, False), encoding="utf-8")
    print(f"scritto {(CARTELLA / 'confronto.html').relative_to(RADICE)}")
    print(f"scritto {(CARTELLA / 'confronto-token.css').relative_to(RADICE)}")

    if "--autonomo" in sys.argv:
        dove = pathlib.Path(sys.argv[sys.argv.index("--autonomo") + 1])
        dove.mkdir(parents=True, exist_ok=True)
        tutto = "\n".join((RADICE / "design_handoff" / "tokens" / f).read_text(encoding="utf-8")
                          for f in ("typography.css", "space.css"))
        tutto += "\n" + css_token + "\n"
        tutto += (RADICE / "design_handoff" / "components.css").read_text(encoding="utf-8")
        (dove / "confronto.html").write_text(pagina(pezzi, tutto, nomi, True), encoding="utf-8")
        print(f"scritta la copia autonoma in {dove / 'confronto.html'}")


if __name__ == "__main__":
    main()
