"""Icone segnaposto per Agenda: quadrato blu, spunta bianca.

Dichiaratamente provvisorie, come quelle della Fase 1 di Shift Hours.
Nessuna libreria: un PNG è quattro chunk e un flusso zlib, e installare Pillow
solo per disegnare una spunta sarebbe una dipendenza in più per sempre.
Il blu è lo stesso token --ag-primary, scritto qui una volta sola.
"""
import zlib, struct, math

BLU = (0x00, 0x66, 0xCC)
BIANCO = (0xFF, 0xFF, 0xFF)

def dist_seg(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay
    L2 = dx*dx + dy*dy
    tt = 0.0 if L2 == 0 else max(0.0, min(1.0, ((px-ax)*dx + (py-ay)*dy) / L2))
    cx, cy = ax + tt*dx, ay + tt*dy
    return math.hypot(px-cx, py-cy)

def render(size):
    # la spunta, in coordinate 0..1
    segs = [(0.26, 0.52, 0.43, 0.69), (0.43, 0.69, 0.75, 0.33)]
    half = 0.052
    rows = []
    # 3 campioni per lato per pixel: i bordi obliqui senza antialiasing
    # sembrano una scala, e su un'icona si vede
    ss = 3
    for y in range(size):
        row = bytearray()
        for x in range(size):
            hits = 0
            for sy in range(ss):
                for sx in range(ss):
                    px = (x + (sx + 0.5)/ss) / size
                    py = (y + (sy + 0.5)/ss) / size
                    if min(dist_seg(px, py, *s) for s in segs) <= half:
                        hits += 1
            a = hits / (ss*ss)
            row += bytes(round(BLU[i]*(1-a) + BIANCO[i]*a) for i in range(3))
        rows.append(bytes(row))
    return rows

def png(path, size):
    rows = render(size)
    raw = b"".join(b"\x00" + r for r in rows)   # filtro 0 per ogni riga
    def chunk(tag, data):
        c = tag + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xffffffff)
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)  # 8 bit, RGB
    out = (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr)
           + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))
    open(path, "wb").write(out)
    print(f"{path}  {size}x{size}  {len(out)} byte")

png("/home/user/Agenda/src/icons/icon-192.png", 192)
png("/home/user/Agenda/src/icons/icon-512.png", 512)
