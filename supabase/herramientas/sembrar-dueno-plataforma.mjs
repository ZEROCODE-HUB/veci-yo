/**
 * Siembra al **primer dueño de la plataforma**.
 *
 * Tiene que ser un script y no una migración, y tiene que usar la clave de
 * servicio: el disparador `proteger_staff_plataforma` solo deja escribir en
 * `staff_plataforma` a quien ya es dueño, y al principio no hay ninguno. Esa
 * puerta --`auth.uid() is null`, o sea la clave de servicio-- es el unico
 * camino de entrada, y es a proposito: un sistema donde el primer dueño se
 * puede crear desde la aplicacion no tiene dueño.
 *
 * A partir de aqui los demas se reparten desde el panel, con
 * `panel_dar_rol_plataforma`, y queda anotado en la bitacora.
 *
 * Es **aditivo y repetible**: si la cuenta ya existe no la toca, y si ya tiene
 * el rol lo deja como esta. No borra nada de nadie.
 *
 *   node supabase/herramientas/sembrar-dueno-plataforma.mjs
 *   node supabase/herramientas/sembrar-dueno-plataforma.mjs alguien@correo.com
 *
 * Sin argumentos siembra la cuenta de prueba `dueno@veciyo.test`. Con un correo
 * le da el rol a **una cuenta que ya existe**: no la crea, porque una cuenta de
 * verdad la hace su dueño con su contraseña.
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
const DE_PRUEBA = {
  correo: "dueno@veciyo.test",
  nombre: "Oscar",
  apellido: "Plataforma",
};

/** Busca la cuenta por correo. Devuelve su id, o null si no esta. */
async function buscar(correo) {
  let pagina = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({
      page: pagina,
      perPage: 1000,
    });
    if (error) throw error;
    const ya = data.users.find(
      (u) => u.email?.toLowerCase() === correo.toLowerCase(),
    );
    if (ya) return ya.id;
    if (data.users.length < 1000) return null;
    pagina += 1;
  }
}

async function main() {
  const pedido = process.argv[2];
  const correo = (pedido ?? DE_PRUEBA.correo).toLowerCase();

  let id = await buscar(correo);

  if (!id) {
    if (pedido) {
      /*
        Una cuenta de verdad no se crea desde aqui: la hace su dueño, con su
        contraseña, y nadie mas la conoce. Si no existe, lo que falta es que
        esa persona se registre.
      */
      console.error(
        `No hay ninguna cuenta con ${correo}.\n` +
          `Que se registre en la aplicacion y vuelve a correr esto.`,
      );
      process.exit(1);
    }

    const { data, error } = await admin.auth.admin.createUser({
      email: correo,
      password: CLAVE,
      email_confirm: true,
    });
    if (error) throw error;
    id = data.user.id;
    console.log(`cuenta creada: ${correo}`);
  } else {
    console.log(`cuenta encontrada: ${correo}`);
  }

  /*
    El perfil hay que **crearlo**: no hay ningun disparador que lo haga, lo
    inserta la aplicacion al registrarse (`sesion.ts`). La otra semilla daba por
    supuesto un disparador y hacia un `update`, que no encontraba ninguna fila
    --y un `update` de cero filas no es un error--, asi que las dos cuentas del
    segundo edificio llevaban desde el 01/10/2026 sin nombre.

    Va fuera del `if` a proposito: tambien repara una cuenta que ya existia sin
    perfil, que es como estaban las tres el 02/10/2026. Si la cuenta ya tiene
    nombre, no se le toca: una cuenta de verdad trae el nombre de su dueño.
  */
  const { data: perfil, error: errorLeer } = await admin
    .from("perfil")
    .select("nombre")
    .eq("id", id)
    .maybeSingle();
  if (errorLeer) throw errorLeer;

  if (!perfil) {
    const { error: errorPerfil } = await admin.from("perfil").insert({
      id,
      nombre: pedido ? correo.split("@")[0] : DE_PRUEBA.nombre,
      apellido: pedido ? "" : DE_PRUEBA.apellido,
    });
    if (errorPerfil) throw errorPerfil;
    console.log("perfil creado");
  }

  const { data: ya, error: errorYa } = await admin
    .from("staff_plataforma")
    .select("rol, activo")
    .eq("usuario_id", id)
    .maybeSingle();
  if (errorYa) throw errorYa;

  if (ya?.rol === "dueno" && ya.activo) {
    console.log("ya era dueño de la plataforma: no se toca nada");
    return;
  }

  /*
    `upsert` y no `insert`: la gracia de que esto sea repetible es que se pueda
    correr sin mirar primero si ya esta.
  */
  const { error } = await admin.from("staff_plataforma").upsert(
    {
      usuario_id: id,
      rol: "dueno",
      activo: true,
      nota: "Primer dueño, sembrado con la clave de servicio",
    },
    { onConflict: "usuario_id" },
  );
  if (error) throw error;

  console.log(`dueño de la plataforma: ${correo}`);

  const { count } = await admin
    .from("staff_plataforma")
    .select("*", { count: "exact", head: true })
    .eq("activo", true);
  console.log(`staff de plataforma activo: ${count}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
