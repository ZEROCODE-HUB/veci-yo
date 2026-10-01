import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  CONDOMINIO,
  CUENTA,
  UNIDAD,
  MARCA_PRUEBA,
  api,
  entrar,
  fueRechazada,
  type Sesion,
} from "./apoyo";

/**
 * El hueco mínimo entre dos reservas de la misma zona.
 *
 * `zona_comun.tiempo_min_entre_reservas` existe desde la primera migración, la
 * administración lo configura --con su campo, su validación y un valor por
 * defecto de 30 minutos para una zona nueva-- y **no lo aplicaba nadie**: ni un
 * disparador, ni una política, ni la pantalla al reservar. Se podía reservar la
 * parrilla de 10 a 12 y otra vez de 12 a 14, sin el hueco de limpieza que el
 * edificio había pedido.
 *
 * No se notaba porque las tres zonas que existen lo tienen en 0, pero el
 * formulario arranca en 30: la siguiente zona nacía con una regla muerta.
 *
 * **Se trae su propia zona.** Media docena de archivos eligen «la primera zona
 * que haya» y se llevan todos la misma, así que dos que coincidan en fecha y
 * hora se estorban; aquí además haría falta una zona con el hueco configurado,
 * y ponérselo a una compartida dejaría a los demás reservando contra una regla
 * que no esperan.
 */
const HUECO = 30;
const FECHA = "2027-05-20";

let marcela: Sesion;
let zona = "";
const creadas: string[] = [];

/** Pide una reserva y se queda con su id para retirarla al terminar. */
async function reservar(horaInicio: string, horaFin: string) {
  const alta = await api(marcela, "/rest/v1/reserva_zona", {
    metodo: "POST",
    cuerpo: {
      zona_id: zona,
      // La reserva cuelga de una vivienda: la politica de alta la exige.
      unidad_id: UNIDAD.u301,
      fecha: FECHA,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
      solicitada_por: marcela.usuarioId,
      comentarios: `${MARCA_PRUEBA} hueco`,
    },
  });

  const id = alta.datos?.[0]?.id;
  if (id) creadas.push(id);
  return alta;
}

beforeAll(async () => {
  marcela = await entrar(CUENTA.admin);

  const alta = await api(marcela, "/rest/v1/zona_comun", {
    metodo: "POST",
    cuerpo: {
      condominio_id: CONDOMINIO,
      nombre: `${MARCA_PRUEBA} Parrilla del hueco`,
      activa: true,
      cupos_simultaneos: 1,
      tiempo_min_entre_reservas: HUECO,
      requiere_aprobacion: false,
    },
  });

  expect(alta.estado, "la administración tiene que poder crear su zona").toBe(
    201,
  );
  zona = alta.datos[0].id;
});

afterAll(async () => {
  for (const id of creadas) {
    await api(marcela, `/rest/v1/reserva_zona?id=eq.${id}`, {
      metodo: "DELETE",
    });
  }
  if (zona) {
    await api(marcela, `/rest/v1/zona_comun?id=eq.${zona}`, {
      metodo: "DELETE",
    });
  }

  // Comprobando que se fue: una limpieza que no comprueba si limpió no es una
  // limpieza, y una zona huérfana se la llevaría el siguiente «primera zona
  // que haya».
  const quedan = await api(marcela, `/rest/v1/zona_comun?id=eq.${zona}`);
  expect(quedan.datos ?? []).toHaveLength(0);
});

describe("el hueco mínimo entre dos reservas", () => {
  it("la primera entra, que para eso está la zona", async () => {
    // El control positivo. Sin él, todo lo de abajo pasaría igual con la zona
    // cerrada a cal y canto.
    const alta = await reservar("10:00", "12:00");

    expect(alta.estado).toBe(201);
  });

  it("y la pegada detrás se rechaza", async () => {
    /*
      De 12:00 a 14:00 no se solapa --eso ya lo rechazaría el aforo-- pero deja
      cero minutos para limpiar. Es exactamente el caso que el edificio quería
      evitar y que nadie impedía.
    */
    const alta = await reservar("12:00", "14:00");

    expect(fueRechazada(alta)).toBe(true);
  });

  it("y la pegada delante también", async () => {
    // El hueco va en los dos sentidos: colarse justo antes deja igual de sucia
    // la zona para quien ya reservó.
    const alta = await reservar("08:00", "10:00");

    expect(fueRechazada(alta)).toBe(true);
  });

  it("con menos hueco del que pide la zona, tampoco", async () => {
    // 20 minutos cuando la zona pide 30.
    const alta = await reservar("12:20", "13:00");

    expect(fueRechazada(alta)).toBe(true);
  });

  it("y respetando el hueco, entra", async () => {
    /*
      El otro control positivo, y el que distingue «hay una regla» de «no se
      puede reservar dos veces». 12:30 deja los 30 minutos justos, y el borde
      cuenta como respetado: pedir 30 y rechazar a los 30 sería pedir 31.
    */
    const alta = await reservar("12:30", "14:00");

    expect(alta.estado).toBe(201);
  });

  it("mover una reserva encima de otra tampoco vale", async () => {
    /*
      La puerta de atrás. El disparador escucha también el `update`, porque en
      este proyecto ya se quedó una ventana así abierta: se arregló el alta y
      el cambio siguió aceptando lo que el alta rechazaba.
    */
    const movida = creadas[creadas.length - 1];
    const cambio = await api(marcela, `/rest/v1/reserva_zona?id=eq.${movida}`, {
      metodo: "PATCH",
      cuerpo: { hora_inicio: "12:00", hora_fin: "13:30" },
    });

    expect(fueRechazada(cambio)).toBe(true);
  });

  it("una reserva cancelada no reserva el hueco", async () => {
    /*
      Mismo criterio que el aforo: lo que ya no vale no ocupa. Si una cancelada
      siguiera bloqueando, la zona se iría quedando inservible sola.
    */
    const cancelada = creadas[0];
    await api(marcela, `/rest/v1/reserva_zona?id=eq.${cancelada}`, {
      metodo: "PATCH",
      cuerpo: { estado: "cancelada" },
    });

    /*
      De 09:00 a 10:00 queda pegada a la cancelada --que iba de 10:00 a 12:00--
      y lejos de la de las 12:30, que es la unica viva que queda. Si la
      cancelada contara, esto se rechazaria.

      La primera version de este caso pedia 12:00-12:20 y se rechazaba **con
      razon**: chocaba con la de las 12:30, que habia creado la propia prueba.
      El disparador estaba bien; el caso, mal.
    */
    const alta = await reservar("09:00", "10:00");

    expect(alta.estado).toBe(201);
  });
});
