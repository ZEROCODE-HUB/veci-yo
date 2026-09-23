"""
Enumera las columnas booleanas del esquema y dice cuales no mira la base.

Se usa a mano, contra el Supabase real:
    python supabase/herramientas/casillas_sin_control.py

Nacio de un defecto que se repitio seis veces: una casilla que la pantalla
respeta y la base ignora. Se escribio como consulta suelta y **dos veces dio un
numero equivocado**:

  · la primera miraba politicas y funciones pero no las restricciones CHECK,
    asi que dio por sueltas cuatro que si estaban sujetas;
  · la segunda filtraba por prefijo (`puede_`, `permite_`, `para_`...) y dejo
    fuera doce columnas, entre ellas `permiso_vivienda.huespedes_temporales`,
    que es un tercer interruptor para "este edificio admite renta corta".

Por eso vive aqui y no en la cabeza de nadie: un filtro de mas convierte
"la lista esta cerrada" en una afirmacion falsa.
"""

import io
import json
import urllib.request as u

CONTROLES = {
    "politicas": """select coalesce(pg_get_expr(polqual,polrelid),'')||' '||
        coalesce(pg_get_expr(polwithcheck,polrelid),'') e
      from pg_policy p join pg_class c on c.oid=p.polrelid
      join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'""",
    "funciones": """select pg_get_functiondef(p.oid) e from pg_proc p
      join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.prokind='f'""",
    "restricciones": """select pg_get_constraintdef(co.oid) e from pg_constraint co
      join pg_class cl on cl.oid=co.conrelid join pg_namespace n on n.oid=cl.relnamespace
      where n.nspname='public' and co.contype='c'""",
    "indices": "select indexdef e from pg_indexes where schemaname='public'",
}


def entorno():
    datos = {}
    for linea in io.open(".env.local", encoding="utf-8"):
        linea = linea.strip()
        if linea and not linea.startswith("#") and "=" in linea:
            clave, valor = linea.split("=", 1)
            datos[clave] = valor
    return datos


def consultar(env, sql):
    peticion = u.Request(
        "https://api.supabase.com/v1/projects/%s/database/query" % env["SUPABASE_PROJECT_REF"],
        data=json.dumps({"query": sql}).encode(),
        headers={
            "Authorization": "Bearer " + env["SUPABASE_ACCESS_TOKEN"],
            "Content-Type": "application/json",
        },
        method="POST",
    )
    return json.loads(u.urlopen(peticion).read().decode() or "[]")


def main():
    env = entorno()

    # Sin filtro de nombre: el filtro fue el error la segunda vez.
    columnas = consultar(env, """select table_name t, column_name c
      from information_schema.columns
      where table_schema='public' and data_type='boolean'
      order by table_name, column_name""")

    mirado = " ".join(
        fila["e"] or ""
        for sql in CONTROLES.values()
        for fila in consultar(env, sql)
    )

    sueltas = [
        "%s.%s" % (f["t"], f["c"]) for f in columnas if f["c"] not in mirado
    ]

    print("Columnas booleanas del esquema: %d" % len(columnas))
    print("Sin ningun control en la base:  %d" % len(sueltas))
    for nombre in sueltas:
        print("   ", nombre)
    print()
    print("Una columna aqui no es necesariamente un defecto: puede ser estado")
    print("(`invitado.llego`) o presentacion (`zona_comun.usa_slots`). Lo es si")
    print("expresa un permiso, una restriccion o una afirmacion sobre alguien.")


if __name__ == "__main__":
    main()
