/**
 * Siembra un **segundo condominio** de prueba.
 *
 * El aislamiento entre condominios es el requisito de seguridad central del
 * proyecto (regla 7) y **nunca se habia podido probar**: en la base habia un
 * solo edificio, «Las Barranqueras 246», y las diez cuentas de prueba eran
 * todas suyas. Asi que 75 de las 128 politicas y 50 funciones deciden por
 * `condominio_id` y todas respondian «si» a todo el mundo, porque todo el mundo
 * estaba en el mismo sitio. Una podia estar mal escrita y la suite seguiria en
 * verde.
 *
 * Esto crea el «alguien de otro edificio» que faltaba: un condominio con su
 * torre, su vivienda, su administracion y un propietario. Con eso,
 * `supabase/tests/aislamiento-entre-condominios.test.ts` puede preguntar lo
 * unico que importa: **¿ve lo nuestro?**
 *
 * Es **aditivo y repetible**: cada paso comprueba si ya existe antes de crear,
 * asi que correrlo dos veces no duplica nada. No borra nada de nadie.
 *
 * Las cuentas comparten la contraseña de las otras diez --`Prueba123!`-- para
 * que el arnes de pruebas no tenga un caso especial.
 *
 *   node supabase/herramientas/sembrar-segundo-condominio.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const RAIZ = resolve(import.meta.dirname, "..", "..");

/** `.env.local`, que es donde viven la url y la clave de servicio. */
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
const admin = createClient(
  env.EXPO_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const CLAVE = "Prueba123!";

/** Los ids se escriben a mano para que el sembrado sea repetible. */
const CONDOMINIO = "22222222-2222-2222-2222-222222222222";
const TORRE = "22222222-2222-2222-2222-222222222201";
const UNIDAD = "22222222-2222-2222-2222-222222222301";

const CUENTAS = [
  { correo: "admin2@veciyo.test", nombre: "Renata", apellido: "Oliveira" },
  { correo: "vecino2@veciyo.test", nombre: "Bruno", apellido: "Salas" },
];

/** Crea la cuenta si no existe, y devuelve su id en cualquier caso. */
async function cuenta({ correo, nombre, apellido }) {
  const { data: lista, error: errorLista } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (errorLista) throw errorLista;

  const ya = lista.users.find((u) => u.email === correo);
  if (ya) {
    console.log(`  ya existia: ${correo}`);
    return ya.id;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: correo,
    password: CLAVE,
    email_confirm: true,
  });
  if (error) throw error;

  console.log(`  creada: ${correo}`);

  /*
    El perfil lo crea un disparador al dar de alta la cuenta, asi que aqui solo
    se le ponen el nombre y el apellido.
  */
  const { error: errorPerfil } = await admin
    .from("perfil")
    .update({ nombre, apellido })
    .eq("id", data.user.id);
  if (errorPerfil) throw errorPerfil;

  return data.user.id;
}

/** Inserta si no hay nada con ese id. `upsert` evita el caso de la segunda pasada. */
async function poner(tabla, fila) {
  const { error } = await admin.from(tabla).upsert(fila, { onConflict: "id" });
  if (error) throw error;
  console.log(`  ${tabla}: ${fila.id}`);
}

async function main() {
  console.log("Cuentas:");
  const [renata, bruno] = await Promise.all(CUENTAS.map(cuenta));

  console.log("Edificio:");
  await poner("condominio", {
    id: CONDOMINIO,
    nombre: "[prueba] Mirador del Este",
    direccion: "Avenida Siempre Viva 742",
    pais: "CO",
    zona_horaria: "America/Bogota",
  });
  await poner("torre", {
    id: TORRE,
    condominio_id: CONDOMINIO,
    numero: 1,
    nombre: "Torre Unica",
  });
  await poner("unidad", {
    id: UNIDAD,
    condominio_id: CONDOMINIO,
    torre_id: TORRE,
    codigo: "901",
    piso: 9,
  });

  console.log("Membresias:");
  const { data: yaAdmin } = await admin
    .from("membresia_condominio")
    .select("id")
    .eq("usuario_id", renata)
    .eq("condominio_id", CONDOMINIO)
    .maybeSingle();

  if (!yaAdmin) {
    const { error } = await admin.from("membresia_condominio").insert({
      usuario_id: renata,
      condominio_id: CONDOMINIO,
      rol: "administrador",
      activo: true,
    });
    if (error) throw error;
  }
  console.log("  Renata administra el Mirador del Este");

  const { data: yaEs } = await admin
    .from("membresia_unidad")
    .select("id")
    .eq("usuario_id", bruno)
    .eq("unidad_id", UNIDAD)
    .maybeSingle();

  if (!yaEs) {
    const { error } = await admin.from("membresia_unidad").insert({
      usuario_id: bruno,
      unidad_id: UNIDAD,
      nombre: "Bruno Salas",
      rol: "propietario",
      es_residente: true,
      activo: true,
    });
    if (error) throw error;
  }
  console.log("  Bruno es propietario de la 901");

  console.log("\nListo. El segundo edificio existe y no comparte nada con el primero.");
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
