import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio } from "./cliente";
import { aceptarInvitacion } from "@/shared/services/invitaciones";
import {
  invitarCoadministrador,
  obtenerCoadministradores,
} from "@/features/administrador/services/coadministradores.repo";

/**
 * Recorrido: lo que se escribe al invitar a un coadministrador llega.
 *
 * La pantalla pide nombre, correo y **celular**. El celular se perdía:
 * `invitacion` no tenía columna para el teléfono de quien se invita --solo para
 * el de su contacto de emergencia-- así que el número se quedaba en el
 * formulario. Estaba anotado en REVISAR-A-OJO (155) desde el 05/10/2026 y la
 * pantalla lo avisaba, que es lo único honesto que se podía hacer entonces.
 *
 * Al arreglarlo apareció uno peor en la misma línea: `aceptar_invitacion`, en
 * la rama de condominio, insertaba la membresía **sin el nombre**. O sea que la
 * administración escribe «Rosa Delgado», Rosa acepta, y la lista enseña
 * **«Sin nombre»** --ese literal está en el repositorio, como valor por
 * defecto--. La rama de unidad sí lo ponía.
 *
 * La prueba recorre las dos mitades, que es lo que importa: **invitar** y
 * **aceptar**. Comprobar solo que la invitación guarda el número no diría nada
 * del defecto del nombre, que vive en la otra punta.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const ADMIN = "admin@veciyo.test";
/** Una cuenta sin ningún rol en ningún edificio. */
const SIN_ROL = "invitado.prueba@veciyo.test";

const MARCA = "[prueba] coadmin con telefono";

let invitacionId = "";
let membresiaId = "";
let sinRolId = "";

beforeAll(async () => {
  await entrarComo(ADMIN);

  /*
    Una prueba que cuenta se trae su propio cero: una corrida anterior que
    muriera a mitad deja su invitación y su membresía, y entonces el
    `invitarCoadministrador` de abajo choca o la cuenta sale distinta.
  */
  await servicio.from("invitacion").delete().like("nombre", `${MARCA}%`);
  await servicio.from("membresia_condominio").delete().like("nombre", `${MARCA}%`);

  await salir();
  sinRolId = await entrarComo(SIN_ROL);
  await salir();
  await entrarComo(ADMIN);

  /*
    Y la membresía que esa cuenta pudiera arrastrar de una corrida anterior,
    buscada por lo que de verdad la identifica --quién y dónde-- y no por el
    nombre, que es justo lo que esta prueba comprueba que se escribe.
  */
  await servicio
    .from("membresia_condominio")
    .delete()
    .eq("condominio_id", CONDOMINIO)
    .eq("usuario_id", sinRolId)
    .eq("rol", "coadministrador");
});

afterAll(async () => {
  await salir();
  if (membresiaId) {
    const { error } = await servicio
      .from("membresia_condominio")
      .delete()
      .eq("id", membresiaId);
    expect(error).toBeNull();
  }
  if (invitacionId) {
    // `invitacion` no tiene política de DELETE a propósito --es constancia de
    // un hecho-- así que esto va con la clave de servicio.
    const { error } = await servicio.from("invitacion").delete().eq("id", invitacionId);
    expect(error).toBeNull();
  }
});

describe("el celular que se escribe al invitar", () => {
  let enlace: string | null = null;

  it("viaja con la invitación, con su país", async () => {
    const creada = await invitarCoadministrador({
      condominioId: CONDOMINIO,
      nombre: MARCA,
      apellido: "Delgado",
      correo: SIN_ROL,
      celular: "3105557788",
      codigoPais: "CO",
    });
    invitacionId = creada.invitacionId;
    enlace = creada.enlace;

    const { data } = await servicio
      .from("invitacion")
      .select("nombre, telefono, codigo_pais, rol_condominio")
      .eq("id", invitacionId)
      .single();

    expect(data!.telefono).toBe("3105557788");
    expect(data!.codigo_pais).toBe("CO");
    expect(data!.nombre).toBe(`${MARCA} Delgado`);
    expect(data!.rol_condominio).toBe("coadministrador");
  });

  it("y llega a la membresía al aceptar, con el nombre", async () => {
    /*
      El enlace solo existe una vez: en la base vive su sha256. Mientras el
      envío de correo esté apagado, `crearInvitacion` lo devuelve para poder
      recorrer el flujo, que es exactamente lo que se hace aquí.
    */
    expect(enlace, "sin enlace no se puede aceptar").toBeTruthy();
    const token = new URL(enlace!).searchParams.get("token");
    expect(token).toBeTruthy();

    await salir();
    try {
      await entrarComo(SIN_ROL);
      membresiaId = await aceptarInvitacion(token!);
    } finally {
      await salir();
      await entrarComo(ADMIN);
    }

    const { data } = await servicio
      .from("membresia_condominio")
      .select("nombre, telefono, codigo_pais, rol, activo")
      .eq("id", membresiaId)
      .single();

    // El nombre: esto es lo que daba «Sin nombre» en la lista.
    expect(data!.nombre).toBe(`${MARCA} Delgado`);
    expect(data!.telefono).toBe("3105557788");
    expect(data!.codigo_pais).toBe("CO");
    expect(data!.rol).toBe("coadministrador");
    expect(data!.activo).toBe(true);
  });

  it("y la pantalla lo vuelve a leer", async () => {
    /*
      El control que hace que lo de arriba signifique algo: comprobar que se
      escribe no es comprobar que se ve. Ya pasó con el número de lavadora, que
      se guardaba bien y no aparecía en ninguna de las cuatro pantallas.
    */
    const lista = await obtenerCoadministradores(CONDOMINIO);
    const nuestro = lista.find((c) => c.uuid === membresiaId);

    expect(nuestro, "el coadministrador recién aceptado no sale en la lista").toBeTruthy();
    expect(nuestro!.nombre).toBe(`${MARCA} Delgado`);
    expect(nuestro!.nombre).not.toBe("Sin nombre");
    expect(nuestro!.celular).toBe("3105557788");
    expect(nuestro!.codigoPais).toBe("CO");
    expect(nuestro!.esInvitacion).toBe(false);
  });
});
