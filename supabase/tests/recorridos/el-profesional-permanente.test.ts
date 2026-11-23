import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio, supabase } from "./cliente";
import { agregarTrabajador } from "@/features/propietario/services/trabajadores.repo";
import {
  cambiarPermisosDeTrabajador,
  obtenerMisInvitacionesDeTrabajador,
  obtenerPermisosDeTrabajadores,
} from "@/features/propietario/services/trabajadores.repo";
import { crearVisita, obtenerVisitas } from "@/features/visitas/services/visitas.repo";
import { obtenerAnuncios } from "@/features/anuncios/services/anuncios.repo";
import { aceptarInvitacion, datosParaRegistrarse } from "@/shared/services/invitaciones";

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
let token = "";
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
  await servicio.from("invitacion").delete().eq("correo", correo);
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
    // La invitación de siempre, con su código (23/11/2026). El token sale de
    // la función de la base: `enviarInvitacion` no lo devuelve con el correo encendido.
    const { data, error } = await supabase.rpc("invitar_trabajador", { p_trabajador_id: id });
    expect(error).toBeNull();
    token = (Array.isArray(data) ? data[0] : data)?.token ?? "";
    expect(token).toBeTruthy();
    await salir();
  });

  it("alguien de otra vivienda no puede invitarlo", async () => {
    const { data: fila } = await servicio
      .from("trabajador_de_la_vivienda").select("id").eq("correo_invitado", correo).single();
    await entrarComo("propietario@veciyo.test");
    const { error } = await supabase.rpc("invitar_trabajador", { p_trabajador_id: fila!.id });
    expect(error?.message).toMatch(/No tienes permiso/);
    await salir();
  });

  it("su registro sale con el nombre que escribió Sofía", async () => {
    const datos = await datosParaRegistrarse(token);
    expect(datos?.correo).toBe(correo);
    expect(`${datos?.nombre} ${datos?.apellido}`).toContain("Rosa");
  });

  it("él acepta con el enlace y la tarjeta de Inicio ya no se la ofrece", async () => {
    await entrarComo(correo);
    expect(await obtenerMisInvitacionesDeTrabajador()).toHaveLength(1);
    await aceptarInvitacion(token);
    expect(await obtenerMisInvitacionesDeTrabajador()).toHaveLength(0);
    // Y no se acepta dos veces.
    await expect(aceptarInvitacion(token)).rejects.toThrow(/ya no esta disponible/i);
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

  it("Sofía le quita el permiso de crear visitas, y él lo pierde (23/11/2026)", async () => {
    await salir();
    await entrarComo(SOFIA);
    const permisos = await obtenerPermisosDeTrabajadores(U102);
    const [id] = Object.keys(permisos).filter((k) => permisos[k].puedeCrearVisitas);
    expect(id).toBeTruthy();
    await cambiarPermisosDeTrabajador(id, { puedeCrearVisitas: false, puedeContestarCitofono: true });
    expect((await obtenerPermisosDeTrabajadores(U102))[id].puedeCrearVisitas).toBe(false);
    await salir();

    await entrarComo(correo);
    const { data } = await supabase.rpc("mis_viviendas_de_trabajador");
    expect(data?.[0]?.puede_crear_visitas).toBe(false);
    await expect(
      crearVisita({
        condominioId: CONDOMINIO,
        unidadId: U102,
        tipo: "temporal",
        estado: "programada",
        fechaDesde: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
        profesion: MARCA,
        invitados: [{ nombre: `${MARCA} sin permiso` }],
      }),
    ).rejects.toThrow(/row-level security|permission|permiso/i);
  });

  it("alguien de otra vivienda no puede cambiarle los permisos", async () => {
    await salir();
    await entrarComo(SOFIA);
    const [id] = Object.keys(await obtenerPermisosDeTrabajadores(U102));
    await salir();
    await entrarComo("propietario@veciyo.test");
    await expect(
      cambiarPermisosDeTrabajador(id, { puedeCrearVisitas: true, puedeContestarCitofono: true }),
    ).rejects.toThrow(/No tienes permiso/);
    await expect(obtenerPermisosDeTrabajadores(U102)).rejects.toThrow(/Solo quien gestiona/);
    await salir();
    await entrarComo(correo);
  });

  it("ve el anuncio de los profesionales permanentes, y no el de los propietarios", async () => {
    const anuncios = await obtenerAnuncios();
    const titulos = anuncios.map((a) => a.titulo);
    expect(titulos).toContain(`${MARCA} para ellos`);
    expect(titulos).not.toContain(`${MARCA} para propietarios`);
  });
});
