import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { enDias, entrarComo, salir, servicio, supabase, ventanaDe } from "./cliente";
import { crearVisita, obtenerVisitas } from "@/features/visitas/services/visitas.repo";
import { abrirPrecheckin } from "@/features/visitas/services/precheckin.repo";
import {
  abrirEnlaceAcompanante,
  aceptarReglamento,
  aceptarTerminos,
  cerrarPrecheckin,
  estadoDelPrecheckin,
  guardarAcompanante,
  guardarFicha,
  guardarHoras,
  guardarVehiculo,
  quitarVehiculo,
  reglamentoDeLaEstancia,
  vehiculosDelPrecheckin,
} from "../../../../veciyo-web/src/lib/precheckin";

/** Sus fechas, lejos de las de los demas: ver `ventanaDe`. */
const V = ventanaDe("la-ficha-del-huesped-se-completa");

/**
 * Recorrido: horas previstas, reglas del edificio y vehiculos con responsable.
 *
 * Las tres las pidio el cliente el 09/10/2026 y ninguna existia en el
 * preregistro:
 *
 *   · las horas tenian columna desde el primer dia y **nadie las escribia**;
 *   · las reglas del edificio solo se leian con sesion, que el huesped no
 *     tiene, y no se aceptaban en ningun sitio;
 *   · los vehiculos se anunciaban en la portada y no se pedian, y la tabla no
 *     decia de quien era cada uno.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const ANFITRIONA = "vecino@veciyo.test";

const MARCA = "[prueba] ficha completa";

let visitaId = "";
let otraVisitaId = "";
let token = "";
let titularId = "";
let amigoId = "";
let tokenAmigo = "";

async function retirar(id: string) {
  const { data: invitados } = await servicio
    .from("invitado")
    .select("id")
    .eq("visita_id", id);
  const ids = (invitados ?? []).map((i) => i.id);
  if (ids.length > 0) {
    await servicio.from("verificacion_antecedentes").delete().in("invitado_id", ids);
    await servicio.from("reporte_legal").delete().in("invitado_id", ids);
    await servicio.from("invitacion").delete().in("invitado_id", ids);
  }
  const { error } = await servicio.from("visita").delete().eq("id", id);
  if (error) throw new Error(`No se pudo retirar ${id}: ${error.message}`);
}

beforeAll(async () => {
  await entrarComo(ANFITRIONA);
  visitaId = await crearVisita({
    condominioId: CONDOMINIO,
    unidadId: U102,
    tipo: "huesped_temporal",
    fechaDesde: enDias(V),
    fechaHasta: enDias(V + 3),
    anotacionesIngreso: MARCA,
    huespedesPrevistos: 2,
    invitados: [{ nombre: `${MARCA} titular` }],
  });
  // Una segunda, solo para tener a mano un adulto que **no** es de la primera.
  otraVisitaId = await crearVisita({
    condominioId: CONDOMINIO,
    unidadId: U102,
    tipo: "huesped_temporal",
    fechaDesde: enDias(V + 10),
    fechaHasta: enDias(V + 12),
    anotacionesIngreso: MARCA,
    invitados: [{ nombre: `${MARCA} ajeno` }],
  });

  const { enlace } = await abrirPrecheckin(visitaId);
  token = enlace.split("/access/")[1];
  await salir();

  titularId = await guardarFicha(
    token,
    {
      nombre: "Oscar",
      apellidos: "Prueba",
      tipoDocumento: "cedula_ciudadania",
      documento: "[prueba]-44556677",
      correo: "oscar.ficha@veciyo.test",
    },
    supabase as never,
  );
  await aceptarTerminos(token, supabase as never);

  amigoId = await guardarAcompanante(
    token,
    {
      nombre: "Amigo",
      apellidos: "Delgado",
      tipoDocumento: "cedula_ciudadania",
      documento: "[prueba]-99001122",
    },
    supabase as never,
  );
  tokenAmigo = await abrirEnlaceAcompanante(token, amigoId, supabase as never);
  const { aceptarMisTerminosAcompanante } = await import(
    "../../../../veciyo-web/src/lib/precheckin"
  );
  await aceptarMisTerminosAcompanante(tokenAmigo, supabase as never);
});

afterAll(async () => {
  await retirar(visitaId);
  await retirar(otraVisitaId);
  await salir();
});

describe("las horas previstas", () => {
  it("las pone el titular y quedan en la estancia", async () => {
    await guardarHoras(token, { llegada: "15:30", salida: "11:00" }, supabase as never);

    const { data } = await servicio
      .from("visita")
      .select("hora_estimada_llegada, hora_estimada_salida")
      .eq("id", visitaId)
      .single();

    // Es lo que lee la porteria: la columna, no un estado de la pantalla.
    expect(data?.hora_estimada_llegada).toBe("15:30:00");
    expect(data?.hora_estimada_salida).toBe("11:00:00");
  });

  it("y al volver al enlace siguen ahi", async () => {
    const estado = await estadoDelPrecheckin(token, supabase as never);

    expect(estado.horaLlegada).toBe("15:30");
    expect(estado.horaSalida).toBe("11:00");
  });

  it("un acompañante no las cambia", async () => {
    // La hora es de la estancia, no de cada persona.
    await expect(
      guardarHoras(tokenAmigo, { llegada: "03:00", salida: "04:00" }, supabase as never),
    ).rejects.toThrow(/no vale o ya vencio/i);
  });
});

describe("las reglas del edificio", () => {
  it("se leen con el enlace, sin sesion", async () => {
    const reglas = await reglamentoDeLaEstancia(token, supabase as never);

    expect(reglas?.titulo).toBeTruthy();
    expect(reglas?.secciones.length).toBeGreaterThan(0);
  });

  it("sin aceptarlas no se cierra", async () => {
    /*
      Todo lo demas esta completo --dos de dos, terminos de los dos,
      documentos--, asi que si falla es por las reglas y por nada mas. El
      patron lo distingue de fallar por cualquier otra cosa.
    */
    await expect(
      cerrarPrecheckin(token, supabase as never, "https://veciyo.test"),
    ).rejects.toThrow(/reglas del edificio/i);
  });

  it("que las acepte el titular no vale por el otro adulto", async () => {
    await aceptarReglamento(token, supabase as never);

    const estado = await estadoDelPrecheckin(token, supabase as never);
    expect(estado.reglamentoAceptado).toBe(true);

    const { data } = await servicio
      .from("invitado")
      .select("reglamento_aceptado_en")
      .eq("id", amigoId)
      .single();
    expect(data?.reglamento_aceptado_en).toBeNull();

    await expect(
      cerrarPrecheckin(token, supabase as never, "https://veciyo.test"),
    ).rejects.toThrow(/reglas del edificio: Amigo/i);
  });
});

describe("los vehiculos", () => {
  let vehiculoId = "";

  it("se apuntan con su responsable, y la placa queda limpia", async () => {
    vehiculoId = await guardarVehiculo(
      token,
      { placa: "abc-123", tipo: "auto", marca: "Mazda", responsableId: titularId },
      supabase as never,
    );

    const lista = await vehiculosDelPrecheckin(token, supabase as never);
    const mio = lista.find((v) => v.id === vehiculoId);

    expect(mio?.placa).toBe("ABC123");
    expect(mio?.responsable_invitado_id).toBe(titularId);
    expect(mio?.responsable_nombre).toContain("Oscar");
  });

  it("y la aplicacion lo ensena: quien responde, y quien acepto las reglas", async () => {
    /*
      Que se guarde no es que se vea. Esto pasa por la consulta y el mapeo de
      la aplicacion, que es lo que leen la porteria y el anfitrion.
    */
    await entrarComo(ANFITRIONA);
    const visitas = await obtenerVisitas({ ambito: "unidad", unidadIds: [U102] });
    await salir();

    const esta = visitas.find((v) => v.uuid === visitaId);
    expect(esta?.vehiculos?.[0]?.responsable).toContain("Oscar");

    const titular = esta?.invitados?.find((i) => i.uuid === titularId);
    const amigo = esta?.invitados?.find((i) => i.uuid === amigoId);
    // Las dos mitades: sin la segunda, un `true` escrito a fuego pasaria igual.
    expect(titular?.reglasAceptadas).toBe(true);
    expect(amigo?.reglasAceptadas).toBe(false);
  });

  it("sin responsable no se guarda", async () => {
    await expect(
      guardarVehiculo(
        token,
        { placa: "XYZ987", responsableId: null as unknown as string },
        supabase as never,
      ),
    ).rejects.toThrow(/quien responde por el vehiculo/i);
  });

  it("el responsable tiene que ser de esta reserva", async () => {
    /*
      Un adulto que existe, pero en **otra** estancia. Lo para el disparador,
      que es donde tiene que estar: la tabla tambien se escribe desde la
      aplicacion.
    */
    const { data: ajeno } = await servicio
      .from("invitado")
      .select("id")
      .eq("visita_id", otraVisitaId)
      .limit(1)
      .single();

    await expect(
      guardarVehiculo(
        token,
        { placa: "XYZ987", responsableId: ajeno!.id },
        supabase as never,
      ),
    ).rejects.toThrow(/adulto de esta reserva/i);
  });

  it("y se puede quitar", async () => {
    await quitarVehiculo(token, vehiculoId, supabase as never);

    const lista = await vehiculosDelPrecheckin(token, supabase as never);
    expect(lista.map((v) => v.id)).not.toContain(vehiculoId);
  });
});

describe("y con todo en su sitio", () => {
  it("un vehiculo que apunto el anfitrion sin responsable no deja cerrar", async () => {
    /*
      El anfitrion puede apuntar una placa al reservar, cuando todavia no sabe
      quien viene: nace sin responsable. El cliente lo aclaro el 09/10/2026:
      lo completa el huesped en su preregistro, y sin eso no se cierra.

      Las reglas ya aceptadas por los dos, para que si falla sea por el
      vehiculo y por nada mas.
    */
    await aceptarReglamento(tokenAmigo, supabase as never);

    const { data: delAnfitrion, error } = await servicio
      .from("vehiculo_visita")
      .insert({ visita_id: visitaId, placa: "HOST99" })
      .select("id")
      .single();
    expect(error).toBeNull();

    await expect(
      cerrarPrecheckin(token, supabase as never, "https://veciyo.test"),
    ).rejects.toThrow(/quien responde por el vehiculo: HOST99/i);

    // Y el huesped lo completa desde su enlace, sobre el mismo vehiculo.
    const mismo = await guardarVehiculo(
      token,
      { id: delAnfitrion!.id, placa: "HOST99", responsableId: amigoId },
      supabase as never,
    );
    expect(mismo).toBe(delAnfitrion!.id);
  });

  it("cierra", async () => {
    // El positivo de los «no se cierra» de arriba: sin el, rechazar siempre
    // los pasaria todos.
    await expect(
      cerrarPrecheckin(token, supabase as never, "https://veciyo.test"),
    ).resolves.toContain("/invitacion?token=");
  });
});
