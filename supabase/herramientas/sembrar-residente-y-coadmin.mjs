/**
 * Dos cuentas de prueba que faltaban (15/10/2026): una **residente común** de
 * la 102 --sin gestionar nada-- y una **coadministradora** sin los permisos de
 * seguridad ni de chats. Sin ellas no había con quién comprobar que a cada uno
 * se le ofrece solo lo que puede usar (huecos 21 y 32).
 *
 * Aditivo y repetible: si la cuenta ya existe, la reutiliza. La contraseña es
 * la de las demás cuentas de prueba (ver la memoria del proyecto).
 *
 *   node supabase/herramientas/sembrar-residente-y-coadmin.mjs
 */
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(new URL("../../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]),
);
const sb = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const CLAVE = process.env.CLAVE_PRUEBAS;
if (!CLAVE) throw new Error("Falta CLAVE_PRUEBAS en el entorno");

async function cuenta(correo, nombre, apellido) {
  const { data: lista } = await sb.auth.admin.listUsers({ perPage: 500 });
  let usuario = lista.users.find((u) => u.email === correo);
  if (!usuario) {
    const { data, error } = await sb.auth.admin.createUser({
      email: correo, password: CLAVE, email_confirm: true,
    });
    if (error) throw error;
    usuario = data.user;
  }
  const { error } = await sb.from("perfil").upsert({ id: usuario.id, nombre, apellido });
  if (error) throw error;
  return usuario.id;
}

const residente = await cuenta("residente@veciyo.test", "Rocío", "Residente");
const { data: yaVive } = await sb.from("membresia_unidad").select("id")
  .eq("unidad_id", U102).eq("usuario_id", residente).maybeSingle();
if (!yaVive) {
  const { error } = await sb.from("membresia_unidad").insert({
    unidad_id: U102, usuario_id: residente, nombre: "Rocío Residente",
    rol: "residente", activo: true, es_residente: true,
  });
  if (error) throw error;
}

const coadmin = await cuenta("coadmin@veciyo.test", "Carla", "Coadmin");
const { data: yaCoadmin } = await sb.from("membresia_condominio").select("id")
  .eq("condominio_id", CONDOMINIO).eq("usuario_id", coadmin).maybeSingle();
const permisos = { modificarSeguridad: false, contestarChat: false };
if (!yaCoadmin) {
  const { error } = await sb.from("membresia_condominio").insert({
    condominio_id: CONDOMINIO, usuario_id: coadmin, rol: "coadministrador",
    activo: true, permisos,
  });
  if (error) throw error;
}
console.log("residente@veciyo.test y coadmin@veciyo.test listas");
