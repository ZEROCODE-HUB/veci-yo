import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio, supabase } from "./cliente";
import { agregarTrabajador } from "@/features/propietario/services/trabajadores.repo";
import {
  obtenerMisInvitacionesDeTrabajador,
  responderInvitacionDeTrabajador,
} from "@/features/propietario/services/trabajadores.repo";
import { crearVisita, obtenerVisitas } from "@/features/visitas/services/visitas.repo";
import { obtenerAnuncios } from "@/features/anuncios/services/anuncios.repo";

/**
 * Recorrido: el profesional permanente con cuenta (18/11/2026, pedido del
 * cliente: «revisa que le salga todo bien»).
 *
 * Con las funciones de la app, en el orden en que pasa:
 *   1. Sofía lo registra en la 102 con cuenta y permiso de crear visitas.
 *   2. Él entra con ese correo, ve la invitación y la acepta.
 *   3. Su sesión sabe en qué vivienda y edificio está, y que puede crear visitas.
 *   4. Registra una visita para la 102 y la ve en su lista.
 *   5. Ve el anuncio dirigido a los profesionales permanentes, y no el de los
 *      propietarios.
 */
const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const SOFIA = "vecino@veciyo.test";
const MARCA = "[prueba] profesional recorrido";

let correo = "";
let usuarioId = "";
const publicaciones: string[] = [];

beforeAll(async () => {
  correo = `prof-recorrido-${Date.now().toString(36)}@veciyo.test`;
  const { data, error } = await servicio.auth.admin.createUser({
    email: correo,
    password: "Prueba123!",
    email_confirm: true,
  });
  if (error) throw new Error(error.message);
  usuarioId = data.user!.id;
  const perfil = await servicio.from("perfil").insert({ id: usuarioId, nombre: "[prueba]", apellido: "Profesional" });
  if (perfil.error) throw new Error(perfil.error.message);

  for (const [titulo, paraTrabajadores] of [
    [`${MARCA} para ellos`, true],
    [`${MARCA} para propietarios`, false],
  ] as const) {
    const { data: p, error: e } = await servicio
      .from("publicacion")
      .insert({
        condominio_id: CONDOMINIO,
        categoria: "administracion",
        titulo,
        tipo: "anuncio",
        para_propietarios: !paraTrabajadores,
        para_residentes: false,
        para_huespedes: false,
        para_porteria: false,
        para_trabajadores: paraTrabajadores,
      })
      .select("id")
      .single();
    if (e) throw new Error(e.message);
    publicaciones.push(p.id);
  }
});

afterAll(async () => {
  await salir();
  const { data: visitas } = await servicio.from("visita").select("id").eq("profesion", MARCA);
  for (const v of visitas ?? []) {
    await servicio.from("notificacion").delete().eq("entidad_id", v.id);
    await servicio.from("invitado").delete().eq("visita_id", v.id);
    await servicio.from("visita").delete().eq("id", v.id);
  }
  for (const id of publicaciones) {
    await servicio.from("notificacion").delete().eq("entidad_id", id);
    await servicio.from("publicacion").delete().eq("id", id);
  }
  await servicio.from("trabajador_de_la_vivienda").delete().eq("correo_invitado", correo);
  if (usuarioId) {
    await servicio.from("notificacion").delete().eq("usuario_id", usuarioId);
    const { error } = await servicio.auth.admin.deleteUser(usuarioId);
    if (error) throw new Error(error.message);
  }
});

describe("el profesional permanente con cuenta, de principio a fin", () => {
  it("Sofía lo registra con cuenta y permiso de crear visitas", async () => {
    await entrarComo(SOFIA);
    const id = await agregarTrabajador({
      unidadId: U102,
      nombre: `${MARCA} Rosa`,
      oficio: "Profesor",
      conApp: true,
      correo,
      puedeContestarCitofono: true,
      puedeCrearVisitas: true,
    });
    expect(id).toBeTruthy();
    await salir();
  });

  it("él ve la invitación al entrar y la acepta", async () => {
    await entrarComo(correo);
    const invitaciones = await obtenerMisInvitacionesDeTrabajador();
    expect(invitaciones).toHaveLength(1);
    expect(invitaciones[0].unidad).toBe("102");
    await responderInvitacionDeTrabajador(invitaciones[0].id, true);
    expect(await obtenerMisInvitacionesDeTrabajador()).toHaveLength(0);
  });

  it("su sesión sabe en qué vivienda y edificio está, y qué puede", async () => {
    const { data, error } = await supabase.rpc("mis_viviendas_de_trabajador");
    expect(error).toBeNull();
    expect(data).toEqual([
      expect.objectContaining({
        unidad_id: U102,
        condominio_id: CONDOMINIO,
        puede_crear_visitas: true,
        puede_contestar_citofono: true,
      }),
    ]);
  });

  it("registra una visita para la 102 y la ve en su lista", async () => {
    const id = await crearVisita({
      condominioId: CONDOMINIO,
      unidadId: U102,
      tipo: "temporal",
      estado: "programada",
      fechaDesde: new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10),
      profesion: MARCA,
      invitados: [{ nombre: `${MARCA} electricista` }],
    });
    expect(id).toBeTruthy();
    const visitas = await obtenerVisitas({ ambito: "unidad", unidadIds: [U102] });
    expect(visitas.map((v) => v.uuid)).toEqual([id]);
  });

  it("ve el anuncio de los profesionales permanentes, y no el de los propietarios", async () => {
    const anuncios = await obtenerAnuncios();
    const titulos = anuncios.map((a) => a.titulo);
    expect(titulos).toContain(`${MARCA} para ellos`);
    expect(titulos).not.toContain(`${MARCA} para propietarios`);
  });
});
