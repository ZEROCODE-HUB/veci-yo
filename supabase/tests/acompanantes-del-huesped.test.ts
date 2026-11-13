import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  CLAVE_SERVICIO,
  CUENTA,
  URL,
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
let ramiro: Sesion;  // huésped de la 102 con la estancia ya vencida

let zonaId = "";
let reservaId = "";

beforeAll(async () => {
  [tomas, laura, ramiro] = await Promise.all([
    entrar(CUENTA.huesped),
    entrar(CUENTA.laura),
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
  /*
    Con la clave de servicio: la anfitriona ya no puede borrar la reserva de su
    huésped, y el 11/11/2026 se vio que quedaba una por corrida ocupando el
    único cupo de la piscina. Una limpieza que no comprueba si limpió no es una
    limpieza.
  */
  if (reservaId) {
    const r = await fetch(`${URL}/rest/v1/reserva_zona?id=eq.${reservaId}`, {
      method: "DELETE",
      headers: { apikey: CLAVE_SERVICIO, Authorization: `Bearer ${CLAVE_SERVICIO}` },
    });
    if (!r.ok) throw new Error(`No se pudo retirar la reserva: ${r.status} ${await r.text()}`);
  }
});

describe("los acompañantes de la reserva de un huésped", () => {
  /*
    «Los apunta él mismo» y «los vuelve a leer» se fueron el 11/11/2026: desde
    el 27/10 (hueco 42) un huésped solo apunta a la gente de su estancia, y
    Tomás aquí no tiene ninguna, así que cualquier nombre se rechaza --que es
    lo correcto--. El camino bueno, con una estancia y su acompañante, lo
    recorre `recorridos/el-huesped-no-mete-gente-de-fuera.test.ts`. Aquí
    queda lo que sigue valiendo: que otro huésped no se mete en la reserva.
  */
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
