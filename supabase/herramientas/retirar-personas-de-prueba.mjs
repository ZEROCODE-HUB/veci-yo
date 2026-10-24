/**
 * Retira las personas de prueba que crea `supabase/tests/personas-de-prueba.ts`
 * cuando una corrida de la suite muere antes de su limpieza final (pasó el
 * 23/10/2026: el sistema la cortó por falta de memoria y dejó a los huéspedes
 * de prueba en la 102).
 *
 *   node supabase/herramientas/retirar-personas-de-prueba.mjs
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

// Las mismas que `PERSONAS` en personas-de-prueba.ts, y los dueños de usar y tirar.
const CORREOS = [
  "nuevo.inquilino@veciyo.test", "huesped.pasado@veciyo.test", "huesped.futuro@veciyo.test",
  "laura.invitada@veciyo.test", "residente@veciyo.test", "coadmin@veciyo.test",
  "invitado.prueba@veciyo.test", "propietario.nuevo@veciyo.test",
];

const { data, error } = await sb.auth.admin.listUsers({ perPage: 1000 });
if (error) throw error;
const cuentas = data.users.filter(
  (u) => CORREOS.includes(u.email ?? "") || /^dueno-[a-z-]+-[a-z0-9]+@veciyo\.test$/.test(u.email ?? ""),
);

for (const u of cuentas) {
  await sb.from("llamada_internet").delete().or(`de_usuario_id.eq.${u.id},contestada_por.eq.${u.id}`);
  await sb.from("invitado").update({ revision_anfitrion_por: null }).eq("revision_anfitrion_por", u.id);
  await sb.from("invitado").update({ revision_menor_por: null }).eq("revision_menor_por", u.id);
  await sb.from("contacto_condominio").update({ creado_por: null }).eq("creado_por", u.id);
  // Sus membresías, antes: al borrar la cuenta pasarían a no tener dueño, y
  // `membresia_unidad_con_acceso_requiere_cuenta` no deja una con acceso sin cuenta.
  await sb.from("membresia_unidad").delete().eq("usuario_id", u.id);
  await sb.from("membresia_condominio").delete().eq("usuario_id", u.id);
  await sb.from("bitacora_plataforma").delete().eq("actor_id", u.id);
  const { error: e } = await sb.auth.admin.deleteUser(u.id);
  console.log(e ? `NO ${u.email}: ${e.message}` : `retirada ${u.email}`);
}
