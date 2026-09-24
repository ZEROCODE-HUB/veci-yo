import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, supabase } from "./cliente";
import { obtenerLibroHuesped } from "@/features/huesped/services/huesped.service";
import {
  guardarAlojamiento,
  obtenerAlojamiento,
} from "@/features/propietario/services/suscripcion.repo";

/**
 * Recorrido: el libro del alojamiento --wifi, clave de la puerta, instrucciones--.
 *
 * Es el dato más sensible que toca un huésped: la clave de la puerta de una
 * vivienda ajena. Y `obtenerLibroHuesped` lo trae en **dos pasos**: la ficha
 * sale de `libro_huesped` y las contraseñas de `credenciales_alojamiento`, que
 * las descifra del Vault. La decisión de seguridad vive en medio de la costura,
 * y una prueba de política por separado no la recorre entera.
 *
 * Los tres estados de una estancia son lo que hace comprobable la regla, y por
 * eso existen tres cuentas sobre la misma vivienda:
 *
 *   · Tomás  está **alojado**            → ficha y claves
 *   · Nadia  tiene reserva pero **no ha llegado** → ficha, y las claves no
 *   · Ramiro **ya se fue**               → nada
 *
 * Sin Nadia, una política que confundiera "tiene reserva" con "está dentro"
 * pasaría igual: es la diferencia entre `es_huesped_con_reserva` y
 * `es_huesped_alojado`.
 */

const U102 = "44444444-4444-4444-4444-444444444443";
const ALOJADO = "nuevo.inquilino@veciyo.test";
const FUTURO = "huesped.futuro@veciyo.test";
const VENCIDO = "huesped.pasado@veciyo.test";
const ANFITRIONA = "vecino@veciyo.test";

const CLAVE_WIFI = "clave-wifi-de-prueba";
const CLAVE_PUERTA = "4321";

beforeAll(async () => {
  /*
    La anfitriona deja el libro con claves, usando **la misma funcion que la
    pantalla** --`guardarAlojamiento`--, que las mete en Vault. Si el wifi no
    tuviera clave, el caso de "no la ve" pasaria por la razon equivocada.

    Se lee antes lo guardado y se vuelve a escribir encima, para no pisar la
    configuracion del alojamiento con valores inventados: lo unico que este
    recorrido necesita cambiar son las dos contraseñas.
  */
  await entrarComo(ANFITRIONA);
  const previo = await obtenerAlojamiento(U102);
  await guardarAlojamiento(U102, {
    ...previo,
    wifiNombre: previo?.wifiNombre || "[prueba] VeciYo-102",
    wifiPassword: CLAVE_WIFI,
    puertaPassword: CLAVE_PUERTA,
  } as Parameters<typeof guardarAlojamiento>[1]);
  await salir();
});

afterAll(async () => {
  await salir();
});

describe("el libro del alojamiento", () => {
  it("la anfitriona lo ve entero, claves incluidas", async () => {
    // Control positivo: sin esto, un "no lo ve" podria significar solo que el
    // libro no existe.
    await entrarComo(ANFITRIONA);
    const libro = await obtenerLibroHuesped(U102);
    expect(libro).not.toBeNull();
    expect(libro!.wifiPassword).toBeTruthy();
    expect(libro!.doorPassword).toBeTruthy();
    await salir();
  });

  it("el huésped alojado lo ve, con la clave del wifi y la de la puerta", async () => {
    await entrarComo(ALOJADO);
    const libro = await obtenerLibroHuesped(U102);
    expect(libro).not.toBeNull();
    expect(libro!.wifiName).toBeTruthy();
    expect(libro!.wifiPassword).toBe(CLAVE_WIFI);
    expect(libro!.doorPassword).toBe(CLAVE_PUERTA);

    // Control del mismo RPC que el caso de abajo interroga: si no devolviera
    // nada nunca, aquel "null" no probaria nada.
    const directo = await supabase.rpc("credenciales_alojamiento", {
      p_unidad_id: U102,
    });
    const claves = Array.isArray(directo.data) ? directo.data[0] : directo.data;
    expect(claves?.puerta_password).toBe(CLAVE_PUERTA);
    await salir();
  });

  it("el que todavía no ha llegado no recibe las claves", async () => {
    /*
      El caso que distingue una política correcta de una que solo comprueba la
      pertenencia: Nadia tiene reserva --empieza dentro de unos días-- y la
      clave de la puerta no es suya hasta el día de entrada.

      Se pregunta a `credenciales_alojamiento` **directamente**, no solo a
      través de `obtenerLibroHuesped`. Escrita solo contra el repositorio, esta
      prueba pasaba por la razón equivocada: la política de `libro_huesped` le
      oculta la ficha, la función sale por su `if (!data) return null` y nunca
      llega a pedir las claves. Con la función relajada a
      `es_huesped_con_reserva` el recorrido seguía verde **mientras el RPC
      entregaba la contraseña de la puerta**.

      Son dos defensas y hay que comprobarlas por separado: el RPC es público y
      cualquiera puede llamarlo sin pasar por la ficha.
    */
    await entrarComo(FUTURO);

    const directo = await supabase.rpc("credenciales_alojamiento", {
      p_unidad_id: U102,
    });
    const claves = Array.isArray(directo.data) ? directo.data[0] : directo.data;
    expect(claves?.wifi_password ?? null).toBeNull();
    expect(claves?.puerta_password ?? null).toBeNull();

    const libro = await obtenerLibroHuesped(U102);
    expect(libro?.wifiPassword).toBeUndefined();
    expect(libro?.doorPassword).toBeUndefined();
    await salir();
  });

  it("y el que ya se fue no ve nada", async () => {
    // Su membresía sigue activa: lo único distinto es la fecha.
    await entrarComo(VENCIDO);
    const libro = await obtenerLibroHuesped(U102);
    const sinNada =
      libro === null ||
      (!libro.wifiPassword && !libro.doorPassword && !libro.wifiName);
    expect(sinNada).toBe(true);
    await salir();
  });
});
