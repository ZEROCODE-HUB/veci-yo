/**
 * Vuelve a sembrar el edificio de las pruebas automáticas: «Las Barranqueras
 * 246», con sus cuatro cuentas fijas (admin@, guardia@, propietario@ y
 * vecino@ `veciyo.test`).
 *
 * El 29/10/2026 se vació la base a pedido del cliente y con ella se fue el
 * edificio contra el que corren las pruebas de `npm run test:rls`. El
 * 11/11/2026 el cliente pidió volver a tenerlo, como un edificio más («al
 * final borraremos todo»), para poder probar todo de forma automática.
 *
 * Dos pasos, porque las cuentas solo se pueden crear por la API de Auth y el
 * resto es SQL:
 *
 *   node supabase/herramientas/sembrar-edificio-de-pruebas.mjs
 *   psql ... -f supabase/herramientas/edificio-de-pruebas.sql
 *   node supabase/herramientas/sembrar-segundo-condominio.mjs
 *
 * `edificio-de-pruebas.sql` sale del respaldo del 20/10 (solo la estructura:
 * torres, viviendas, zonas, estacionamientos, reglamentos, renta corta, turnos
 * y las membresías de las cuatro cuentas). Es repetible: `on conflict do
 * nothing`. Las demás personas (huéspedes, residente, coadministradora) las
 * crea y las borra la propia suite (`supabase/tests/personas-de-prueba.ts`).
 *
 * A estas cuentas no les llega ningún correo: `enviar-correo` no escribe a
 * `veciyo.test`. Y ningún aviso push: no tienen celular.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const RAIZ = resolve(import.meta.dirname, "..", "..");

function entorno() {
  const texto = readFileSync(join(RAIZ, ".env.local"), "utf-8");
  const salida = {};
  for (const linea of texto.split("\n")) {
    const limpia = linea.trim();
    if (!limpia || limpia.startsWith("#")) continue;
    const corte = limpia.indexOf("=");
    if (corte < 0) continue;
    salida[limpia.slice(0, corte)] = limpia.slice(corte + 1).trim();
  }
  return salida;
}

const env = entorno();
const admin = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CLAVE = "Prueba123!";

/** Los mismos ids que tenían: el SQL y las pruebas los nombran. */
const CUENTAS = [
  { id: "bb874459-efef-473d-81d8-a13f7bc38847", correo: "admin@veciyo.test" },
  { id: "4f389349-aa4f-4e02-9088-6e353c12f243", correo: "guardia@veciyo.test" },
  { id: "58537b22-7599-4720-a387-dd0467b1c11e", correo: "propietario@veciyo.test" },
  { id: "60f20bc2-450d-4d0d-b0a0-b21b90331bfb", correo: "vecino@veciyo.test" },
];

const { data: lista, error: errorLista } = await admin.auth.admin.listUsers({ perPage: 1000 });
if (errorLista) throw errorLista;
const existentes = new Map(lista.users.map((u) => [u.email, u.id]));

for (const c of CUENTAS) {
  const ya = existentes.get(c.correo);
  if (ya) {
    if (ya !== c.id) throw new Error(`${c.correo} ya existe con otro id (${ya}): no se toca`);
    console.log(`${c.correo}: ya estaba`);
    continue;
  }
  const { error } = await admin.auth.admin.createUser({
    id: c.id,
    email: c.correo,
    password: CLAVE,
    email_confirm: true,
  });
  if (error) throw new Error(`${c.correo}: ${error.message}`);
  console.log(`${c.correo}: creada`);
}
