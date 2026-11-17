import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio, supabase } from "./cliente";
import { enviarMensajeAViviendas, obtenerPersonalPermanente } from "@/features/directorio/services/directorio.repo";

/**
 * Recorrido: el directorio de la administración (16/11/2026, cliente: «poder
 * seleccionar masivamente, y poder enviar un mensaje» y «profesional
 * permanente debe igual mostrarse en el directorio de Viviendas»).
 *
 *   · `mensaje_a_viviendas` escribe en el chat administración–vivienda de
 *     cada departamento (y lo crea si falta), y el aviso sale por el
 *     disparador de siempre. Una vecina no puede usarla, ni la administración
 *     de otro edificio.
 *   · `personal_permanente_de_la_vivienda` lo ven la administración, la
 *     portería y quien es de esa vivienda; una vecina de la 102, no el de la
 *     301.
 *
 * Todo lo que crea --dos visitas, la conversación de la 101 si no existía, los
 * mensajes y sus avisos-- se apunta por id y se borra por id.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U101 = "44444444-4444-4444-4444-444444444441";
const U102 = "44444444-4444-4444-4444-444444444443";
const U301 = "44444444-4444-4444-4444-444444444444";
const ADMIN = "admin@veciyo.test";
const GUARDIA = "guardia@veciyo.test";
const VECINA = "vecino@veciyo.test";
const PROPIETARIO = "propietario@veciyo.test";
const ADMIN_AJENO = "admin2@veciyo.test";

/*
  Sin la marca `[prueba`: el barrido global de cualquier `vitest run` que
  arranque en paralelo borraría estas visitas a mitad del archivo. Se retiran
  por id en el `afterAll`.
*/
const SELLO = `Directorio ${Date.now()}`;
const TEXTO = `Mensaje de prueba del directorio ${Date.now()}`;

const visitas: string[] = [];
let conversacionesPrevias = new Set<string>();

async function crearPermanente(unidadId: string, nombre: string, estado: "programada" | "cancelada") {
  const { data, error } = await servicio
    .from("visita")
    .insert({
      condominio_id: CONDOMINIO,
      unidad_id: unidadId,
      tipo: "permanente",
      estado,
      profesion: `Jardinería ${SELLO}`,
      dias_trabajo: [1, 3, 5],
    })
    .select("id")
    .single();
  if (error) throw new Error(`No se pudo crear la visita: ${error.message}`);
  visitas.push(data.id);
  const { error: errorInvitado } = await servicio.from("invitado").insert({
    visita_id: data.id,
    nombre,
    apellidos: SELLO,
    tipo_documento: "cedula_ciudadania",
    documento_numero: "1098765432",
    telefono: "3105550000",
    codigo_pais: "CO",
    es_titular: true,
  });
  if (errorInvitado) throw new Error(`No se pudo crear el invitado: ${errorInvitado.message}`);
}

async function conversacionesDeAdministracion(): Promise<{ id: string; unidad_id: string | null }[]> {
  const { data, error } = await servicio
    .from("conversacion")
    .select("id, unidad_id")
    .eq("condominio_id", CONDOMINIO)
    .eq("tipo", "area")
    .eq("area", "administracion");
  if (error) throw new Error(error.message);
  return data ?? [];
}

beforeAll(async () => {
  conversacionesPrevias = new Set((await conversacionesDeAdministracion()).map((c) => c.id));
  await crearPermanente(U301, "Rosa", "programada");
  await crearPermanente(U301, "Cancelado", "cancelada");
  await crearPermanente(U101, "Hernán", "programada");
});

afterAll(async () => {
  await salir();
  const conversaciones = await conversacionesDeAdministracion();
  const ids = conversaciones.map((c) => c.id);

  // Los mensajes y avisos de este archivo, por su texto exacto, y luego por id.
  const { data: mensajes, error: errorMensajes } = await servicio
    .from("mensaje")
    .select("id")
    .in("conversacion_id", ids)
    .like("texto", `${TEXTO}%`);
  if (errorMensajes) throw new Error(errorMensajes.message);
  const { data: avisos, error: errorAvisos } = await servicio
    .from("notificacion")
    .select("id")
    .in("entidad_id", ids)
    .like("mensaje", `${TEXTO}%`);
  if (errorAvisos) throw new Error(errorAvisos.message);

  for (const { id } of avisos ?? []) {
    const { error } = await servicio.from("notificacion").delete().eq("id", id);
    if (error) throw new Error(`No se pudo borrar el aviso: ${error.message}`);
  }
  for (const { id } of mensajes ?? []) {
    const { error } = await servicio.from("mensaje").delete().eq("id", id);
    if (error) throw new Error(`No se pudo borrar el mensaje: ${error.message}`);
  }
  // Las conversaciones que nacieron en este archivo.
  for (const id of ids.filter((id) => !conversacionesPrevias.has(id))) {
    const { error: errorPart } = await servicio
      .from("participante_conversacion")
      .delete()
      .eq("conversacion_id", id);
    if (errorPart) throw new Error(errorPart.message);
    const { error } = await servicio.from("conversacion").delete().eq("id", id);
    if (error) throw new Error(`No se pudo borrar la conversación: ${error.message}`);
  }
  for (const id of visitas) {
    const { error: errorInv } = await servicio.from("invitado").delete().eq("visita_id", id);
    if (errorInv) throw new Error(errorInv.message);
    const { error } = await servicio.from("visita").delete().eq("id", id);
    if (error) throw new Error(`No se pudo borrar la visita: ${error.message}`);
  }

  // Comprobar que limpió: ni sus visitas ni sus mensajes quedan.
  const { count: quedanVisitas } = await servicio
    .from("visita")
    .select("id", { count: "exact", head: true })
    .in("id", visitas);
  expect(quedanVisitas).toBe(0);
  const { count: quedanMensajes } = await servicio
    .from("mensaje")
    .select("id", { count: "exact", head: true })
    .like("texto", `${TEXTO}%`);
  expect(quedanMensajes).toBe(0);
});

describe("personal permanente de la vivienda", () => {
  it("la administración lo ve, con sus datos, y no ve el cancelado", async () => {
    await entrarComo(ADMIN);
    const personal = await obtenerPersonalPermanente(U301);
    const nuestros = personal.filter((p) => p.nombre.includes(SELLO));
    expect(nuestros.map((p) => p.nombre)).toEqual([`Rosa ${SELLO}`]);
    expect(nuestros[0]).toMatchObject({
      profesion: `Jardinería ${SELLO}`,
      diasTrabajo: [1, 3, 5],
      documento: "Cédula de ciudadanía 1098765432",
      telefono: "3105550000",
      codigoPais: "CO",
    });
  });

  it("la portería lo ve", async () => {
    await entrarComo(GUARDIA);
    const personal = await obtenerPersonalPermanente(U301);
    expect(personal.some((p) => p.nombre === `Rosa ${SELLO}`)).toBe(true);
  });

  it("quien es de la vivienda ve el de la suya", async () => {
    await entrarComo(PROPIETARIO);
    const personal = await obtenerPersonalPermanente(U101);
    expect(personal.some((p) => p.nombre === `Hernán ${SELLO}`)).toBe(true);
  });

  it("una vecina de la 102 no ve el de la 301", async () => {
    await entrarComo(VECINA);
    await expect(obtenerPersonalPermanente(U301)).rejects.toThrow(/Solo la administración, la portería/);
  });

  it("la administración de otro edificio no lo ve", async () => {
    await entrarComo(ADMIN_AJENO);
    await expect(obtenerPersonalPermanente(U301)).rejects.toThrow(/Solo la administración, la portería/);
  });
});

describe("mensaje a varias viviendas", () => {
  it("una vecina no puede: no se envía a ninguna y no queda mensaje", async () => {
    await entrarComo(VECINA);
    const resultado = await enviarMensajeAViviendas([U102, U101], `${TEXTO} vecina`);
    expect(resultado.every((r) => !r.enviado)).toBe(true);
    const { count } = await servicio
      .from("mensaje")
      .select("id", { count: "exact", head: true })
      .eq("texto", `${TEXTO} vecina`);
    expect(count).toBe(0);
  });

  it("la administración de otro edificio no puede", async () => {
    await entrarComo(ADMIN_AJENO);
    const resultado = await enviarMensajeAViviendas([U101], `${TEXTO} ajena`);
    expect(resultado).toEqual([
      expect.objectContaining({ unidadId: U101, enviado: false, codigo: null }),
    ]);
    const { count } = await servicio
      .from("mensaje")
      .select("id", { count: "exact", head: true })
      .eq("texto", `${TEXTO} ajena`);
    expect(count).toBe(0);
  });

  it("un mensaje vacío no sale", async () => {
    await entrarComo(ADMIN);
    await expect(enviarMensajeAViviendas([U101], "   ")).rejects.toThrow(/Escribe el mensaje/);
  });

  it("la administración escribe en el chat de cada una, crea el que falta y avisa", async () => {
    const yo = await entrarComo(ADMIN);
    const resultado = await enviarMensajeAViviendas([U101, U102], TEXTO);
    expect(resultado.map((r) => [r.codigo, r.enviado]).sort()).toEqual([
      ["101", true],
      ["102", true],
    ]);

    // Cada mensaje en la conversación de administración de su vivienda.
    const conversaciones = await conversacionesDeAdministracion();
    for (const unidad of [U101, U102]) {
      const conversacion = conversaciones.find((c) => c.unidad_id === unidad);
      expect(conversacion, `la ${unidad} tiene su chat con la administración`).toBeTruthy();
      expect(resultado.find((r) => r.unidadId === unidad)?.conversacionId).toBe(conversacion?.id);
      const { data } = await servicio
        .from("mensaje")
        .select("autor_id, texto")
        .eq("conversacion_id", conversacion?.id ?? "")
        .eq("texto", TEXTO);
      expect(data).toEqual([{ autor_id: yo, texto: TEXTO }]);
    }

    // El aviso lo deja el disparador de siempre a quien vive en la 102.
    const vecina = await entrarComo(VECINA);
    const { data: avisos } = await supabase
      .from("notificacion")
      .select("tipo, titulo")
      .eq("usuario_id", vecina)
      .eq("mensaje", TEXTO);
    expect(avisos).toEqual([{ tipo: "mensaje_de_chat", titulo: "Administración" }]);
  });
});
