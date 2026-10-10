import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { enDias, entrarComo, salir, servicio, supabase, ventanaDe } from "./cliente";
import { crearVisita } from "@/features/visitas/services/visitas.repo";
import { abrirPrecheckin } from "@/features/visitas/services/precheckin.repo";
import {
  abrirEnlaceAcompanante,
  aceptarReglamento,
  aceptarTerminos,
  cerrarPrecheckin,
  guardarAcompanante,
  guardarFicha,
  listarAcompanantes,
} from "../../../../veciyo-web/src/lib/precheckin";

/** Sus fechas, lejos de las de los demas: ver `ventanaDe`. */
const V = ventanaDe("invitar-sin-sus-datos");

/**
 * Recorrido: invitar a alguien sin tener sus datos, y no cerrar con menos
 * gente de la que dice la reserva.
 *
 * Las dos salieron del mismo recorrido del cliente el 09/10/2026. Reservo para
 * cuatro, **en la base quedo una persona** --los acompañantes sin nombre no se
 * crean, los rellena el huesped-- y entonces:
 *
 *   · no tenia a quien mandarle nada, porque para emitir el enlace de alguien
 *     hay que crearlo antes y para crearlo hacian falta su nombre y su
 *     documento, que es lo que ese enlace sirve para conseguir;
 *   · y el preregistro **cerro igual**, porque todas las comprobaciones miran
 *     las fichas que existen y solo existia la suya.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const ANFITRIONA = "vecino@veciyo.test";

const MARCA = "[prueba] invitar sin datos";

let visitaId = "";
let token = "";

beforeAll(async () => {
  await entrarComo(ANFITRIONA);
  visitaId = await crearVisita({
    condominioId: CONDOMINIO,
    unidadId: U102,
    tipo: "huesped_temporal",
    fechaDesde: enDias(V + 5),
    fechaHasta: enDias(V + 9),
    anotacionesIngreso: MARCA,
    // Dos personas: el titular y alguien mas. Es lo que hace falta para que
    // el cierre tenga algo que echar en falta.
    huespedesPrevistos: 2,
    invitados: [{ nombre: `${MARCA} titular` }],
  });

  const { enlace } = await abrirPrecheckin(visitaId);
  token = enlace.split("/access/")[1];
  await salir();

  await guardarFicha(
    token,
    {
      nombre: "Oscar",
      apellidos: "Prueba",
      tipoDocumento: "cedula_ciudadania",
      documento: "[prueba]-77665544",
      correo: "oscar.invitar@veciyo.test",
    },
    supabase as never,
  );
  await aceptarTerminos(token, supabase as never);
  // Y las reglas del edificio, que el cierre exige desde el 09/10/2026.
  await aceptarReglamento(token, supabase as never);
});

afterAll(async () => {
  const { data: invitados } = await servicio
    .from("invitado")
    .select("id")
    .eq("visita_id", visitaId);
  const ids = (invitados ?? []).map((i) => i.id);
  if (ids.length > 0) {
    // Apuntan al invitado con RESTRICT, asi que una visita cerrada deja de
    // poderse borrar. Este archivo cierra una.
    await servicio.from("verificacion_antecedentes").delete().in("invitado_id", ids);
    await servicio.from("reporte_legal").delete().in("invitado_id", ids);
    await servicio.from("invitacion").delete().in("invitado_id", ids);
  }
  const { error } = await servicio.from("visita").delete().eq("id", visitaId);
  if (error) {
    throw new Error(`No se pudo retirar la visita ${visitaId}: ${error.message}`);
  }
  await salir();
});

describe("el titular invita a alguien de quien no sabe nada", () => {
  let amigoId = "";

  it("no cierra mientras falte gente de la reserva", async () => {
    /*
      El caso del cliente, tal cual: reserva para dos, una persona dentro, y
      todo lo suyo completo. Hasta hoy cerraba. El mensaje dice los dos
      numeros porque «faltan personas» no deja saber cuantas.
    */
    await expect(cerrarPrecheckin(token, supabase as never)).rejects.toThrow(
      /para 2 personas y hay 1/i,
    );
  });

  it("puede añadirlo sin nombre y sin documento", async () => {
    amigoId = await guardarAcompanante(token, { nombre: "" }, supabase as never);

    expect(amigoId).toBeTruthy();

    const { data: fila } = await servicio
      .from("invitado")
      .select("nombre, documento_numero")
      .eq("id", amigoId)
      .single();

    // Nace con un nombre que se entiende, no vacio: la lista del titular y la
    // porteria tienen que poder referirse a el.
    expect(fila?.nombre).toMatch(/^Acompañante \d+$/);
    expect(fila?.documento_numero).toBeNull();
  });

  it("y ya hay a quién mandarle su enlace", async () => {
    // Que es lo que no habia: sin fila no hay enlace, y sin enlace no hay
    // forma de que ponga sus datos.
    const suToken = await abrirEnlaceAcompanante(
      token,
      amigoId,
      supabase as never,
    );

    expect(suToken).toBeTruthy();
    expect(suToken.length).toBeGreaterThan(20);
  });

  it("la lista dice lo que le falta", async () => {
    const lista = await listarAcompanantes(token, supabase as never);
    const amigo = lista.find((p) => p.id === amigoId);

    expect(amigo?.tiene_documento).toBe(false);
    expect(amigo?.terminos_aceptados).toBe(false);
    expect(amigo?.tiene_enlace).toBe(true);
  });

  it("sigue sin cerrar: ahora están los dos, pero a uno le falta todo", async () => {
    /*
      El control de la primera: ya no falta gente --son dos de dos-- asi que
      si siguiera fallando por eso, el caso de arriba estaria pasando por el
      motivo equivocado. Falla por el documento, que es la comprobacion que
      ya existia.
    */
    /*
      Falla por los terminos y no por el documento: el cierre los comprueba en
      ese orden. Lo que importa del caso es **que ya no falla por la cuenta**,
      que es lo que se añadio hoy; cual de las comprobaciones viejas salta
      primero es un detalle de orden.
    */
    await expect(cerrarPrecheckin(token, supabase as never)).rejects.toThrow(
      /acepten los terminos|acepten los términos/i,
    );
  });

  it("y cierra cuando el otro completa lo suyo", async () => {
    // El positivo del todo: sin el, rechazar siempre pasaria los anteriores.
    await guardarAcompanante(
      token,
      {
        id: amigoId,
        nombre: "Amigo",
        apellidos: "Delgado",
        tipoDocumento: "cedula_ciudadania",
        documento: "[prueba]-11002233",
      },
      supabase as never,
    );

    const suToken = await abrirEnlaceAcompanante(
      token,
      amigoId,
      supabase as never,
    );
    const { aceptarMisTerminosAcompanante } = await import(
      "../../../../veciyo-web/src/lib/precheckin"
    );
    await aceptarMisTerminosAcompanante(suToken, supabase as never);
    // Y las reglas del edificio, que el cierre exige desde el 09/10/2026.
    await aceptarReglamento(suToken, supabase as never);

    /*
      El dominio se pasa a mano: los recorridos corren en Node, donde no hay
      `window.location`, y la funcion obliga a decirlo en vez de suponerlo.
    */
    await expect(
      cerrarPrecheckin(token, supabase as never, "https://veciyo.test"),
    ).resolves.toContain("/invitacion?token=");
  });
});
