import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { enDias, entrarComo, isoEnDias, salir, servicio, supabase, ventanaDe } from "./cliente";
import {
  agregarVehiculoDeEstancia,
  cambiarFechasDeEstancia,
  crearVisita,
  quitarPersonaDeEstancia,
} from "@/features/visitas/services/visitas.repo";
import { miCodigoDeAcceso } from "@/features/huesped/services/huesped.service";

/** Sus fechas, lejos de las de los demas: ver `ventanaDe`. */
const V = ventanaDe("la-estancia-se-edita");

/**
 * Recorrido: el anfitrión edita la estancia y los privilegios la siguen
 * (14/10/2026). También el QR de la estancia.
 *
 * Lo pidió la responsable de producto: extender o acortar, quitar personas,
 * agregar vehículos; y que al cambiar la duración cambien los permisos de
 * corta o larga estancia. Los permisos salen de la membresía del huésped, así
 * que lo que se comprueba es que la membresía se mueve con la estancia.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const ANFITRIONA = "vecino@veciyo.test";
const AJENO = "propietario@veciyo.test";
const GUARDIA = "guardia@veciyo.test";
const HUESPED = "huesped.pasado@veciyo.test"; // Ramiro: su estancia de la 102 venció

const MARCA = "[prueba] la estancia se edita";

let visitaId = "";
let titularId = "";
let acompananteId = "";
let ramiroId = "";
let membresiaId = "";
let permisoCrudo: Record<string, unknown> | null = null;
const membresiasDePrueba: string[] = [];

beforeAll(async () => {
  ramiroId = await entrarComo(HUESPED);
  await salir();

  await entrarComo(ANFITRIONA);
  visitaId = await crearVisita({
    condominioId: CONDOMINIO,
    unidadId: U102,
    tipo: "huesped_temporal",
    fechaDesde: enDias(V + 2),
    fechaHasta: enDias(V + 4),
    anotacionesIngreso: MARCA,
    invitados: [
      { nombre: `${MARCA} titular`, documentoNumero: "900201", tipoDocumento: "cedula_ciudadania" },
      { nombre: `${MARCA} acompanante`, documentoNumero: "900202", tipoDocumento: "cedula_ciudadania" },
    ],
  });
  const { data } = await supabase.from("invitado").select("id, nombre").eq("visita_id", visitaId);
  titularId = data!.find((i) => i.nombre.endsWith("titular"))!.id;
  acompananteId = data!.find((i) => i.nombre.endsWith("acompanante"))!.id;
  await salir();

  // La cuenta del titular y su membresía, como las deja aceptar la invitación.
  await servicio.from("invitado").update({ usuario_id: ramiroId }).eq("id", titularId);
  const { data: m, error } = await servicio
    .from("membresia_unidad")
    .insert({
      unidad_id: U102,
      usuario_id: ramiroId,
      rol: "huesped_temporal",
      nombre: MARCA,
      activo: true,
      vigente_desde: isoEnDias(V + 2),
      vigente_hasta: isoEnDias(V + 4),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  membresiaId = m!.id;
  membresiasDePrueba.push(membresiaId);

  // La foto del permiso de la 102, cruda, para devolverla tal cual.
  const { data: permiso } = await servicio
    .from("permiso_vivienda")
    .select("*")
    .eq("unidad_id", U102)
    .maybeSingle();
  permisoCrudo = permiso;
});

afterAll(async () => {
  if (permisoCrudo) {
    await servicio.from("permiso_vivienda").update(permisoCrudo).eq("unidad_id", U102);
  }
  if (membresiasDePrueba.length > 0) {
    const { error } = await servicio.from("membresia_unidad").delete().in("id", membresiasDePrueba);
    expect(error).toBeNull();
  }
  if (visitaId) {
    await servicio.from("vehiculo_visita").delete().eq("visita_id", visitaId);
    const { error } = await servicio.from("visita").delete().eq("id", visitaId);
    expect(error).toBeNull();
  }
});

describe("cambiar las fechas", () => {
  it("alguien que no es el anfitrión, no", async () => {
    await entrarComo(AJENO);
    await expect(
      cambiarFechasDeEstancia({ visitaUuid: visitaId, desde: isoEnDias(V + 2), hasta: isoEnDias(V + 9) }),
    ).rejects.toThrow(/solo el anfitrion/i);
    await salir();
  });

  it("la salida antes de la llegada, no", async () => {
    await entrarComo(ANFITRIONA);
    await expect(
      cambiarFechasDeEstancia({ visitaUuid: visitaId, desde: isoEnDias(V + 5), hasta: isoEnDias(V + 3) }),
    ).rejects.toThrow(/mismo dia de la llegada o despues/i);
    await salir();
  });

  it("al extenderla, la membresía del huésped se mueve con ella", async () => {
    await entrarComo(ANFITRIONA);
    await cambiarFechasDeEstancia({ visitaUuid: visitaId, desde: isoEnDias(V + 2), hasta: isoEnDias(V + 12) });
    await salir();

    const { data: v } = await servicio.from("visita").select("fecha_hasta").eq("id", visitaId).single();
    expect(v!.fecha_hasta).toBe(isoEnDias(V + 12));
    const { data: m } = await servicio
      .from("membresia_unidad")
      .select("vigente_desde, vigente_hasta")
      .eq("id", membresiaId)
      .single();
    expect(m!.vigente_hasta).toBe(isoEnDias(V + 12));
  });

  it("con alguien dentro, la llegada ya no se mueve", async () => {
    await servicio.from("invitado").update({ llego: true }).eq("id", titularId);
    await entrarComo(ANFITRIONA);
    await expect(
      cambiarFechasDeEstancia({ visitaUuid: visitaId, desde: isoEnDias(V + 1), hasta: isoEnDias(V + 12) }),
    ).rejects.toThrow(/solo se puede cambiar el dia de salida/i);
    await salir();
    await servicio.from("invitado").update({ llego: false, ingreso_en: null }).eq("id", titularId);
  });
});

describe("corta o larga, según la membresía", () => {
  it("con el umbral puesto, una estancia de 10 noches es larga y una de 1 corta", async () => {
    await servicio
      .from("permiso_vivienda")
      .update({ diferencia_estancia: true, corta_hasta_noches: 3 })
      .eq("unidad_id", U102);

    const { data: hoy, error } = await servicio
      .from("membresia_unidad")
      .insert({
        unidad_id: U102,
        usuario_id: ramiroId,
        rol: "huesped_temporal",
        nombre: MARCA,
        activo: true,
        vigente_desde: isoEnDias(0),
        vigente_hasta: isoEnDias(10),
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    membresiasDePrueba.push(hoy!.id);

    await entrarComo(HUESPED);
    const { data: larga } = await supabase.rpc("mi_estancia_es_corta", { p_unidad_id: U102 });
    await salir();
    expect(larga).toBe(false);

    await servicio.from("membresia_unidad").update({ vigente_hasta: isoEnDias(1) }).eq("id", hoy!.id);
    await entrarComo(HUESPED);
    const { data: corta } = await supabase.rpc("mi_estancia_es_corta", { p_unidad_id: U102 });
    await salir();
    expect(corta).toBe(true);
  });
});

describe("personas y vehículos", () => {
  it("el titular no se quita", async () => {
    await entrarComo(ANFITRIONA);
    await expect(quitarPersonaDeEstancia(titularId)).rejects.toThrow(/titular no se quita/i);
    await salir();
  });

  it("alguien ajeno no quita a nadie", async () => {
    await entrarComo(AJENO);
    await expect(quitarPersonaDeEstancia(acompananteId)).rejects.toThrow(/solo el anfitrion/i);
    await salir();
  });

  it("el anfitrión quita a quien no ha entrado", async () => {
    await entrarComo(ANFITRIONA);
    await quitarPersonaDeEstancia(acompananteId);
    await salir();
    const { data } = await servicio.from("invitado").select("id").eq("id", acompananteId);
    expect(data).toEqual([]);
  });

  it("y agrega un vehículo con su responsable", async () => {
    await entrarComo(ANFITRIONA);
    await agregarVehiculoDeEstancia({ visitaUuid: visitaId, placa: "abc-123", tipo: "auto", responsableUuid: titularId });
    await salir();
    const { data } = await servicio.from("vehiculo_visita").select("placa, responsable_invitado_id").eq("visita_id", visitaId);
    expect(data).toEqual([{ placa: "ABC123", responsable_invitado_id: titularId }]);
  });
});

describe("el QR de la estancia", () => {
  it("al cerrar el preregistro nace el código, y lo ve el huésped con cuenta", async () => {
    await servicio
      .from("visita")
      .update({ precheckin_completado_en: new Date().toISOString() })
      .eq("id", visitaId);

    await entrarComo(HUESPED);
    const acceso = await miCodigoDeAcceso(U102);
    await salir();
    expect(acceso?.codigo).toMatch(/^[0-9A-F]{12}$/);

    // La portería del edificio lo encuentra; alguien de fuera, no.
    await entrarComo(GUARDIA);
    const { data: suya } = await supabase.rpc("estancia_por_codigo", { p_codigo: acceso!.codigo });
    await salir();
    expect(suya).toBe(visitaId);

    await entrarComo(AJENO);
    const { data: ajena } = await supabase.rpc("estancia_por_codigo", { p_codigo: acceso!.codigo });
    await salir();
    expect(ajena).toBeNull();
  });
});
