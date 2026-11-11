"""Lee los bloques COPY del respaldo del 20/10 y cuenta, por tabla, las filas
que pertenecen a los dos edificios de prueba."""
import json, sys

RUTA = sys.argv[1] if len(sys.argv) > 1 else ""
CONDOS = {"11111111-1111-1111-1111-111111111111", "22222222-2222-2222-2222-222222222222"}


def bloques(ruta):
    with open(ruta, "rb") as f:
        texto = f.read().decode("utf-8")
    lineas = texto.split("\n")
    i = 0
    while i < len(lineas):
        l = lineas[i]
        if l.startswith("COPY "):
            cab = l[5:]
            tabla = cab.split(" (")[0]
            cols = cab.split(" (", 1)[1].split(") FROM stdin")[0].split(", ")
            filas = []
            i += 1
            while lineas[i] != "\\.":
                filas.append(lineas[i].split("\t"))
                i += 1
            yield tabla, cols, filas
        i += 1


if __name__ == "__main__":
    datos = {t: (c, f) for t, c, f in bloques(RUTA)}
    unidades = set()
    torres = set()
    c, f = datos["public.unidad"]
    for fila in f:
        r = dict(zip(c, fila))
        if r.get("condominio_id") in CONDOS:
            unidades.add(r["id"])
    resumen = {}
    for t, (c, f) in datos.items():
        if not t.startswith("public."):
            continue
        n = 0
        for fila in f:
            r = dict(zip(c, fila))
            if r.get("condominio_id") in CONDOS or r.get("unidad_id") in unidades or r.get("id") in CONDOS:
                n += 1
        resumen[t] = (len(f), n, "condominio_id" in c, "unidad_id" in c)
    for t, v in sorted(resumen.items()):
        print(t, v)
