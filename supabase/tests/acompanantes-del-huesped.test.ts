import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  api,
  CUENTA,
  UNIDAD,
  entrar,
  fechaEnDias,
  fueRechazada,
  insertar,
  leer,
  type Sesion,
} from "./apoyo";

/**
 * El huésped apunta a quien va con él a una zona común.
 *
 * La migración 20260922197000 le concedió reservar una zona que no le esté
 * vedada, y funcionaba: la reserva entraba. Pero no se toco
 * `participante_reserva`, cuya única política se apoya en
 * `puede_operar_unidad`, que excluye al huésped a propósito. Resultado: la
 * reserva se creaba y los acompañantes devolvían 403 a mitad del guardado.
 *
 * Es el caso que estas pruebas no cubrían: había una para reservar y ninguna
 * para lo que cuelga de la reserva.
 */

/** Dentro de unos dias: escrita a fuego caduca y el disparador la rechaza. */
const FECHA_DE_LA_RESERVA = fechaEnDias(8);

let tomas: Sesion;   // huésped de la 102, estancia vigente hasta 2030
let laura: Sesion;   // huésped de la misma 102: el control negativo
let sofia: Sesion;   // la anfitriona, para limpiar
let ramiro: Sesion;  // huésped de la 102 con la estancia ya vencida

let zonaId = "";
let reservaId = "";

beforeAll(async () => {
  [tomas, laura, sofia, ramiro] = await Promise.all([
    entrar(CUENTA.huesped),
    entrar(CUENTA.laura),
    entrar(CUENTA.vecino),
    entrar(CUENTA.huespedVencido),
  ]);

  // Una zona que admita estancia corta: es lo que exige `reserva_zona_huesped_alta`.
  const zonas = await leer(
    tomas,
    "zona_comun?select=id,nombre&activa=is.true&permite_estancia_corta=is.true&limit=1",
  );
  expect(zonas.datos.length).toBeGreaterThan(0);
  zonaId = zonas.datos[0].id;

  const reserva = await insertar(tomas, "reserva_zona?select=id", {
    zona_id: zonaId,
    unidad_id: UNIDAD.u102,
    solicitada_por: tomas.usuarioId,
    fecha: FECHA_DE_LA_RESERVA,
    hora_inicio: "09:00",
    hora_fin: "10:00",
  });
  expect(reserva.estado).toBe(201);
  reservaId = reserva.datos[0].id;
});

afterAll(async () => {
  if (reservaId) {
    await api(sofia, `/rest/v1/reserva_zona?id=eq.${reservaId}`, {
      metodo: "DELETE",
    });
  }
});

describe("los acompañantes de la reserva de un huésped", () => {
  it("los apunta él mismo", async () => {
    const alta = await insertar(tomas, "participante_reserva?select=id,nombre", {
      reserva_id: reservaId,
      nombre: "[prueba] acompañante",
      tipo: "residente",
    });
    // Antes de la política esto devolvía 403 y la reserva quedaba a medias.
    expect(alta.estado).toBe(201);
  });

  it("y los vuelve a leer", async () => {
    const lista = await leer(
      tomas,
      `participante_reserva?select=id,nombre&reserva_id=eq.${reservaId}`,
    );
    expect(lista.datos.length).toBeGreaterThan(0);
  });

  it("pero otro huésped de la misma vivienda no se mete en su reserva", async () => {
    /*
      El control negativo que importa: Laura es huésped de **esta misma
      unidad**, así que una política que solo preguntara "¿perteneces a la
      102?" la dejaría pasar. La reserva es personal, no de la vivienda.
    */
    const intento = await insertar(laura, "participante_reserva", {
      reserva_id: reservaId,
      nombre: "[prueba] ajeno",
      tipo: "residente",
    });
    expect(fueRechazada(intento)).toBe(true);
  });

  it("ni lo ve", async () => {
    const lista = await leer(
      laura,
      `participante_reserva?select=id&reserva_id=eq.${reservaId}`,
    );
    expect(lista.datos).toHaveLength(0);
  });

  it("y un huésped con la estancia vencida tampoco reserva", async () => {
    // Control positivo del mismo camino: lo único distinto es la fecha.
    const intento = await insertar(ramiro, "reserva_zona", {
      zona_id: zonaId,
      unidad_id: UNIDAD.u102,
      solicitada_por: ramiro.usuarioId,
      fecha: FECHA_DE_LA_RESERVA,
      hora_inicio: "11:00",
      hora_fin: "12:00",
    });
    expect(fueRechazada(intento)).toBe(true);
  });
});
