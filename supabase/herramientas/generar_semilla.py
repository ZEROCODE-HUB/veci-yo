"""Genera el SQL del edificio de pruebas a partir del respaldo del 20/10.

Solo la estructura (lo que la limpieza del 20/10 dejó) y las cuatro cuentas
fijas. Lo de movimiento (visitas, llamadas, avisos...) no: lo traen las pruebas.

uso: python generar_semilla.py respaldo.sql columnas.txt salida.sql
columnas.txt: líneas «tabla|columna» de la base actual.
"""
import os
import sys
from leer_respaldo import bloques

RESPALDO, COLUMNAS, SALIDA = sys.argv[1:4]
C1 = "11111111-1111-1111-1111-111111111111"
CUENTAS = {
    "bb874459-efef-473d-81d8-a13f7bc38847",  # admin@
    "4f389349-aa4f-4e02-9088-6e353c12f243",  # guardia@
    "58537b22-7599-4720-a387-dd0467b1c11e",  # propietario@
    "60f20bc2-450d-4d0d-b0a0-b21b90331bfb",  # vecino@
}

actuales = {}
for l in open(COLUMNAS, encoding="utf-8"):
    l = l.strip()
    if "|" in l:
        t, c = l.split("|")
        actuales.setdefault(t, set()).add(c)

datos = {t: (c, f) for t, c, f in bloques(RESPALDO)}


def filas(tabla):
    c, f = datos["public." + tabla]
    return [dict(zip(c, r)) for r in f]


unidades = {r["id"] for r in filas("unidad") if r["condominio_id"] == C1}
membresias_c = {r["id"] for r in filas("membresia_condominio")
                if r["condominio_id"] == C1 and r["usuario_id"] in CUENTAS}
# La 205 ya no se alquila por noches (11/11/2026): Laura es su inquilina líder y
# desde el 29/10 una vivienda de renta corta no puede tenerla.
suscripciones = {r["id"] for r in filas("suscripcion_renta_corta")
                 if r["unidad_id"] in unidades and r["unidad_id"] != "44444444-4444-4444-4444-444444444442"}
conversaciones = {r["id"] for r in filas("conversacion") if r["condominio_id"] == C1}

# tabla -> filtro
PLAN = [
    ("condominio", lambda r: r["id"] == C1),
    ("tipologia", lambda r: r["condominio_id"] == C1),
    ("torre", lambda r: r["condominio_id"] == C1),
    ("unidad", lambda r: r["condominio_id"] == C1),
    ("porteria", lambda r: r["condominio_id"] == C1),
    ("zona_comun", lambda r: r["condominio_id"] == C1),
    ("estacionamiento", lambda r: r["condominio_id"] == C1),
    ("deposito", lambda r: r["condominio_id"] == C1),
    ("reglamento", lambda r: r["condominio_id"] == C1),
    ("contacto_condominio", lambda r: r["condominio_id"] == C1),
    ("pregunta_frecuente", lambda r: r["condominio_id"] == C1),
    ("cuota_administracion", lambda r: r["condominio_id"] == C1),
    # Marcela (301) en mora a propósito: las pruebas de morosidad la usan.
    ("pago_cuota", lambda r: r["unidad_id"] in unidades),
    ("perfil", lambda r: r["id"] in CUENTAS),
    ("membresia_condominio", lambda r: r["id"] in membresias_c),
    ("membresia_unidad", lambda r: r["unidad_id"] in unidades and (r["usuario_id"] in CUENTAS or r["usuario_id"] == "\\N")),
    ("permiso_vivienda", lambda r: r["condominio_id"] == C1),
    ("suscripcion_renta_corta", lambda r: r["id"] in suscripciones),
    ("periodo_suscripcion", lambda r: r.get("suscripcion_id") in suscripciones),
    ("libro_huesped", lambda r: r["unidad_id"] in unidades),
    ("paquete_verificaciones", lambda r: r["unidad_id"] in unidades),
    ("registro_turismo", lambda r: r["unidad_id"] in unidades),
    ("turno_guardia", lambda r: r.get("membresia_id") in membresias_c),
    ("documento_legal", lambda r: r["condominio_id"] == C1),
    ("conversacion", lambda r: r["id"] in conversaciones),
    ("canal_rol", lambda r: r["conversacion_id"] in conversaciones),
    ("participante_conversacion", lambda r: r["conversacion_id"] in conversaciones and r["usuario_id"] in CUENTAS),
]

# Lo que no se copia tal cual.
CAMBIOS = {
    ("condominio", "email"): None,  # era un correo real
    ("libro_huesped", "wifi_password_secret"): None,
    ("libro_huesped", "puerta_password_secret"): None,
}
# La propietaria de la 102, que se alquila por noches, no puede figurar como
# residente desde el 29/10.
CAMBIOS_FILA = {
    "26074cf1-a050-40ea-a4b1-f33f1a42af6d": {"es_residente": "f"},
    # La 101 queda sin nadie viviendo (11/11/2026): es la vivienda en la que las
    # pruebas activan la renta corta, y desde el 29/10 eso exige que nadie viva.
    "29c9cd0a-b88a-4537-8898-5f44696ea3a9": {"es_residente": "f"},
}
# Martín, residente sin cuenta de la 101: nadie lo usaba y no dejaba alquilarla.
FUERA = {"57f8b0be-fb35-4220-8e7f-158e096b2d67"}


def literal(v):
    if v is None or v == "\\N":
        return "null"
    v = v.replace("\\t", "\t").replace("\\n", "\n").replace("\\r", "\r").replace("\\\\", "\\")
    return "'" + v.replace("'", "''") + "'"


salida = ["-- Edificio de las pruebas automáticas. Lo genera el respaldo del 20/10; ver sembrar-edificio-de-pruebas.mjs.",
          "begin;"]
for tabla, filtro in PLAN:
    if "public." + tabla not in datos:
        salida.append(f"-- {tabla}: no está en el respaldo")
        continue
    cols_actuales = actuales.get(tabla, set())
    n = 0
    for r in filas(tabla):
        if not filtro(r) or r.get("id") in FUERA:
            continue
        cols = [c for c in r if c in cols_actuales]
        vals = []
        for c in cols:
            v = r[c]
            if (tabla, c) in CAMBIOS:
                v = CAMBIOS[(tabla, c)]
            # Quien creó una conversación puede ser una cuenta que ya no existe.
            if (tabla, c) == ("conversacion", "creada_por") and v not in CUENTAS:
                v = None
            if c in CAMBIOS_FILA.get(r.get("id"), {}):
                v = CAMBIOS_FILA[r["id"]][c]
            vals.append(literal(v))
        salida.append(f"insert into public.{tabla} ({', '.join(cols)}) values ({', '.join(vals)}) on conflict do nothing;")
        n += 1
    perdidas = [c for c in datos["public." + tabla][0] if c not in cols_actuales]
    salida.append(f"-- {tabla}: {n} filas" + (f" (columnas que ya no existen: {', '.join(perdidas)})" if perdidas else ""))
salida.append("commit;")
# Lo que no está en el respaldo (la 206, del 11/11/2026) va a mano, después.
a_mano = os.path.join(os.path.dirname(os.path.abspath(__file__)), "edificio-de-pruebas-a-mano.sql")
if os.path.exists(a_mano):
    salida.append("")
    salida.append(open(a_mano, encoding="utf-8").read().rstrip("\n"))
open(SALIDA, "w", encoding="utf-8", newline="\n").write("\n".join(salida) + "\n")
print("\n".join(l for l in salida if l.startswith("--")))
