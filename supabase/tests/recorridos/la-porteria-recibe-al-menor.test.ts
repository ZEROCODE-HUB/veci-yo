import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { enDias, entrarComo, salir, servicio, supabase } from "./cliente";
import { crearVisita, resolverRevisionManual } from "@/features/visitas/services/visitas.repo";
import {
  agregarVehiculoEnPorteria,
  anotarRevisionMenor,
  cambiarPlaca,
} from "@/features/visitas/services/porteria.repo";

/**
 * Recorrido: la portería recibe a un menor y corrige placas (14/10/2026).
 *
 * Lo pidió la responsable de producto. El guardia confirma al niño con su
 * documento en la mano y elige una de tres; si duda, avisa al anfitrión, y en
 * el caso más grave el niño no entra hasta que el anfitrión lo apruebe.
 *
 * La estancia es de **hoy**, porque la portería solo ve hoy, mañana y a quien
 * está dentro. Va en la 205, de hoy a mañana: una sola noche, la de hoy, que
 * no pisa la de mañana que usa el recorrido de los recordatorios.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U205 = "44444444-4444-4444-4444-444444444442";
const ANFITRION = "propietario@veciyo.test"; // Guillermo, de la 205
const GUARDIA = "guardia@veciyo.test";
const AJENA = "vecino@veciyo.test"; // Sofía, de la 102

const MARCA = "[prueba] el menor en porteria";

let visitaId = "";
let adultoId = "";
let ninoId = "";
let guillermoId = "";

/*
  La llegada se marca directo en la fila, con la clave de servicio: la regla
  vive en un disparador, que corre igual para cualquiera, y lo que se mide es
  esa regla. Con la sesión del guardia, en la suite completa la fila quedó una
  vez fuera de su vista y el `update` tocó cero filas sin error: el caso pasó
  a medir otra cosa. Se pide la fila de vuelta para saber que se tocó.
*/
async function llegar(id: string) {
  const { data, error } = await servicio
    .from("invitado")
    .update({ llego: true, ingreso_en: new Date().toISOString() })
    .eq("id", id)
    .select("id");
  return { error, tocadas: data?.length ?? 0 };
}

beforeAll(async () => {
  guillermoId = await entrarComo(ANFITRION);
  visitaId = await crearVisita({
    condominioId: CONDOMINIO,
    unidadId: U205,
    tipo: "huesped_temporal",
    fechaDesde: enDias(0),
    fechaHasta: enDias(1),
    anotacionesIngreso: MARCA,
    invitados: [
      { nombre: `${MARCA} adulto`, documentoNumero: "900301", tipoDocumento: "cedula_ciudadania" },
    ],
  });
  await salir();

  const { data: adulto } = await servicio
    .from("invitado")
    .select("id")
    .eq("visita_id", visitaId)
    .single();
  adultoId = adulto!.id;

  const { data: nino, error } = await servicio
    .from("invitado")
    .insert({
      visita_id: visitaId,
      orden: 1,
      nombre: `${MARCA} nino`,
      fecha_nacimiento: "2018-05-05",
      es_menor: true,
      responsable_id: adultoId,
      parentesco: "madre",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  ninoId = nino!.id;

  // El adulto ya verificado en portería: es lo que deja pasar al niño.
  const guardiaId = await entrarComo(GUARDIA);
  await salir();
  const { error: errorVerificado } = await servicio.from("verificacion_documento").insert({
    invitado_id: adultoId,
    estado: "verificado",
    verificado_por: guardiaId,
    verificado_en: new Date().toISOString(),
  });
  if (errorVerificado) throw new Error(errorVerificado.message);
});

afterAll(async () => {
  await servicio.from("notificacion").delete().eq("entidad_id", visitaId);
  await servicio.from("vehiculo_visita").delete().eq("visita_id", visitaId);
  await servicio.from("verificacion_documento").delete().in("invitado_id", [adultoId, ninoId]);
  if (visitaId) {
    const { error } = await servicio.from("visita").delete().eq("id", visitaId);
    expect(error).toBeNull();
  }
});

describe("el menor en portería", () => {
  it("sin confirmarlo, no entra", async () => {
    const { error } = await llegar(ninoId);
    expect(error?.message ?? "").toMatch(/primero confirma/i);
  });

  it("alguien que no es la portería no lo anota", async () => {
    await entrarComo(AJENA);
    await expect(anotarRevisionMenor(ninoId, "se_parece")).rejects.toThrow(/solo la porteria/i);
    await salir();
  });

  it("si no se parece y hay que avisar, se avisa al anfitrión y espera", async () => {
    await entrarComo(GUARDIA);
    await anotarRevisionMenor(ninoId, "no_se_parece_revisar", "No coincide la cara");
    await salir();
    const { error } = await llegar(ninoId);
    expect(error?.message ?? "").toMatch(/anfitrion tiene que revisar/i);

    const { data: avisos } = await servicio
      .from("notificacion")
      .select("usuario_id, tipo")
      .eq("entidad_id", visitaId)
      .eq("tipo", "menor_por_revisar");
    expect(avisos?.map((a) => a.usuario_id)).toContain(guillermoId);
  });

  it("nadie cambia lo anotado por fuera de su botón", async () => {
    await entrarComo(GUARDIA);
    const { error } = await supabase
      .from("invitado")
      .update({ revision_menor: "se_parece" })
      .eq("id", ninoId);
    await salir();
    expect(error?.message ?? "").toMatch(/solo se cambia desde su boton/i);
  });

  it("cuando el anfitrión lo aprueba, entra", async () => {
    await entrarComo(ANFITRION);
    await resolverRevisionManual({ invitadoUuid: ninoId, aprobar: true });
    await salir();

    const { error, tocadas } = await llegar(ninoId);
    expect(error).toBeNull();
    expect(tocadas).toBe(1);
  });
});

describe("la portería corrige placas", () => {
  let vehiculoId = "";

  it("apunta el vehículo con el que llegan y corrige la placa", async () => {
    await entrarComo(GUARDIA);
    await agregarVehiculoEnPorteria(visitaId, "xyz-987", "auto");
    const { data } = await supabase.from("vehiculo_visita").select("id, placa").eq("visita_id", visitaId);
    vehiculoId = data![0].id;
    expect(data![0].placa).toBe("XYZ987");

    await cambiarPlaca(vehiculoId, "XYZ 988");
    const { data: corregida } = await supabase
      .from("vehiculo_visita")
      .select("placa")
      .eq("id", vehiculoId)
      .single();
    await salir();
    expect(corregida!.placa).toBe("XYZ988");
  });

  it("alguien de otra vivienda, no", async () => {
    await entrarComo(AJENA);
    await expect(cambiarPlaca(vehiculoId, "AAA111")).rejects.toThrow(/no puedes cambiar/i);
    await expect(agregarVehiculoEnPorteria(visitaId, "AAA111")).rejects.toThrow(/solo la porteria/i);
    await salir();
  });
});
