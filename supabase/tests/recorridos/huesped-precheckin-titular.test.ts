import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { enDias, entrarComo, salir, supabase } from "./cliente";
import { crearVisita } from "@/features/visitas/services/visitas.repo";
import { abrirPrecheckin } from "@/features/visitas/services/precheckin.repo";
import { guardarFicha } from "../../../../veciyo-web/src/lib/precheckin";

/**
 * Recorrido: el huésped rellena su ficha **sobre una reserva que ya tiene su
 * nombre puesto**, que es como son todas las de verdad.
 *
 * Esto existe por un fallo que llegó al cliente el 02/10/2026: «No pudimos
 * guardar tus datos», y detrás un **409** de `guardar_precheckin`.
 *
 * La cadena era esta:
 *
 *   · `crearVisita` daba de alta a los invitados con `orden` 0, 1, 2… y no
 *     marcaba `es_titular`, que se quedaba en `false`;
 *   · `guardar_precheckin` buscaba la fila marcada, no la encontraba, e
 *     insertaba otra con `orden = 0`;
 *   · `invitado_orden_unico_por_visita` es `unique (visita_id, orden)` y esa
 *     posición ya estaba ocupada. Choque.
 *
 * O sea que fallaba en **toda reserva con al menos un invitado**. Y los
 * recorridos que ya había no lo veían por una sola razón: crean la visita con
 * `invitados: []`, y la pantalla nunca manda la lista vacía. La prueba era
 * verde porque probaba un caso que no ocurre.
 *
 * De ahí la forma de este archivo: lo que se monta aquí es **lo que manda la
 * pantalla**, no lo que es cómodo montar.
 */

const DIAS_A_LA_ENTRADA = 4;
const DIAS_A_LA_SALIDA = 8;

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const ANFITRIONA = "vecino@veciyo.test";

const MARCA = "[prueba] recorrido titular del precheckin";

/** Las visitas que crea este archivo, por su id, para retirarlas. */
const creadas: string[] = [];

async function reservaConInvitado(nombre: string) {
  const id = await crearVisita({
    condominioId: CONDOMINIO,
    unidadId: U102,
    tipo: "huesped_temporal",
    fechaDesde: enDias(DIAS_A_LA_ENTRADA),
    fechaHasta: enDias(DIAS_A_LA_SALIDA),
    anotacionesIngreso: MARCA,
    // Lo que manda la pantalla: el anfitrión pone el nombre al reservar.
    invitados: [{ nombre }],
  });
  creadas.push(id);
  return id;
}

beforeAll(async () => {
  await entrarComo(ANFITRIONA);
});

afterAll(async () => {
  await entrarComo(ANFITRIONA);
  for (const id of creadas) {
    const { error } = await supabase.from("visita").delete().eq("id", id);
    // Una limpieza que no comprueba si limpió no es una limpieza.
    if (error) throw new Error(`No se pudo retirar la visita ${id}: ${error.message}`);
  }
  await salir();
});

describe("el huésped rellena su ficha sobre la reserva que ya existe", () => {
  it("no choca: se queda con la fila que puso el anfitrión", async () => {
    /*
      El camino entero tal como lo recorre una reserva nueva.

      Al mutar la función para comprobar que estas pruebas sirven, **este caso
      sigue verde** y los dos de abajo se ponen rojos. No es que no cubra nada:
      es que el arreglo va por dos lados, y con `crearVisita` marcando ya al
      titular, por este camino la función nunca llega a la inserción que
      chocaba. Lo que vigila aquí es que siga habiendo **una sola fila** y que
      los datos caigan en ella.

      Los que reproducen el 409 son los dos siguientes.
    */
    const visitaId = await reservaConInvitado(`${MARCA} Carlos`);
    const { enlace } = await abrirPrecheckin(visitaId);
    const token = enlace.split("/access/")[1];
    await salir();

    // Sin sesión: es el huésped, que todavía no tiene cuenta.
    await expect(
      guardarFicha(token, {
        nombre: "[prueba] Carlos",
        apellidos: "Rojas",
        tipoDocumento: "cedula_ciudadania",
        documento: "[prueba]-10203040",
        correo: "carlos.prueba@veciyo.test",
      }, supabase),
    ).resolves.toBeTruthy();

    await entrarComo(ANFITRIONA);
    const { data } = await supabase
      .from("invitado")
      .select("id, orden, nombre, es_titular, documento_numero")
      .eq("visita_id", visitaId)
      .order("orden");

    // **Una sola fila**: la gracia del arreglo es que adopte, no que duplique.
    // Si volviera a insertar, aquí habría dos y el anfitrión vería a su
    // huésped por partida doble.
    expect(data).toHaveLength(1);
    expect(data![0].orden).toBe(0);
    expect(data![0].es_titular).toBe(true);
    // Y los datos cayeron en esa misma fila, no en una suelta.
    expect(data![0].documento_numero).toBe("[prueba]-10203040");
    expect(data![0].nombre).toBe("[prueba] Carlos");
  });

  it("y también en una reserva vieja, con el invitado sin marcar", async () => {
    /*
      Las reservas que ya estaban en la base se crearon **sin** `es_titular`,
      porque la aplicación no lo ponía. Arreglar solo el alta las dejaría rotas
      para siempre, y son justo las que el cliente tiene delante.

      Aquí se reproduce ese estado a mano: se desmarca el titular.
    */
    const visitaId = await reservaConInvitado(`${MARCA} Vieja`);
    await supabase
      .from("invitado")
      .update({ es_titular: false })
      .eq("visita_id", visitaId);

    // Control positivo del montaje: de verdad quedó sin titular.
    const { data: antes } = await supabase
      .from("invitado")
      .select("es_titular")
      .eq("visita_id", visitaId);
    expect(antes![0].es_titular).toBe(false);

    const { enlace } = await abrirPrecheckin(visitaId);
    const token = enlace.split("/access/")[1];
    await salir();

    await expect(
      guardarFicha(token, {
        nombre: "[prueba] Vieja",
        apellidos: "Prueba",
        tipoDocumento: "cedula_ciudadania",
        documento: "[prueba]-50607080",
        correo: "vieja.prueba@veciyo.test",
      }, supabase),
    ).resolves.toBeTruthy();

    await entrarComo(ANFITRIONA);
    const { data } = await supabase
      .from("invitado")
      .select("orden, es_titular, documento_numero")
      .eq("visita_id", visitaId);

    expect(data).toHaveLength(1);
    expect(data![0].es_titular).toBe(true);
    expect(data![0].documento_numero).toBe("[prueba]-50607080");
  });

  it("de una reserva de varios, el titular es el primero", async () => {
    /*
      En una reserva de cuatro personas, adoptar a cualquiera pondría el enlace,
      la cuenta y el correo a nombre de un acompañante. El primero de la lista
      es quien reserva.
    */
    const visitaId = await crearVisita({
      condominioId: CONDOMINIO,
      unidadId: U102,
      tipo: "huesped_temporal",
      fechaDesde: enDias(DIAS_A_LA_ENTRADA),
      fechaHasta: enDias(DIAS_A_LA_SALIDA),
      anotacionesIngreso: MARCA,
      invitados: [
        { nombre: `${MARCA} Quien reserva` },
        { nombre: `${MARCA} Acompanante` },
      ],
    });
    creadas.push(visitaId);

    await supabase
      .from("invitado")
      .update({ es_titular: false })
      .eq("visita_id", visitaId);

    const { enlace } = await abrirPrecheckin(visitaId);
    const token = enlace.split("/access/")[1];
    await salir();

    await guardarFicha(token, {
      nombre: "[prueba] Quien reserva",
      apellidos: "Prueba",
      tipoDocumento: "cedula_ciudadania",
      documento: "[prueba]-90807060",
      correo: "titular.prueba@veciyo.test",
    }, supabase);

    await entrarComo(ANFITRIONA);
    const { data } = await supabase
      .from("invitado")
      .select("orden, nombre, es_titular")
      .eq("visita_id", visitaId)
      .order("orden");

    expect(data).toHaveLength(2);
    expect(data![0].orden).toBe(0);
    expect(data![0].es_titular).toBe(true);
    expect(data![1].es_titular).toBe(false);
  });
});
