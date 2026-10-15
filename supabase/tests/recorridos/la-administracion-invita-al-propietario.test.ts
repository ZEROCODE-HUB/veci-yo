import { afterAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio } from "./cliente";
import { invitarAUnidad } from "@/features/propietario/services/invitacionesUnidad.repo";

/**
 * Recorrido: la administración invita al propietario de una vivienda
 * (15/10/2026).
 *
 * La pantalla nueva vive en la ficha de cada vivienda del directorio. Aquí se
 * comprueba con la misma función que usa: la administración invita al dueño de
 * una vivienda que **no es suya**, y una vecina no puede invitar a un dueño ni
 * siquiera a su propia vivienda (KT 4.3: al propietario lo registra la
 * administración).
 */
const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const ADMIN = "admin@veciyo.test"; // Marcela: administra; es dueña de la 301, no de la 102
const VECINA = "vecino@veciyo.test"; // Sofía, de la 102
const MARCA = "[prueba] invita al propietario";

afterAll(async () => {
  await salir();
  await servicio.from("invitacion").delete().like("nombre", `${MARCA}%`);
});

describe("invitar al dueño de una vivienda", () => {
  it("la administración puede, aunque la vivienda no sea suya", async () => {
    await entrarComo(ADMIN);
    const creada = await invitarAUnidad({
      condominioId: CONDOMINIO,
      unidadId: U102,
      rol: "propietario",
      nombre: `${MARCA} admin`,
      correo: "propietario.nuevo.prueba@veciyo.test",
    });
    await salir();
    const { data } = await servicio
      .from("invitacion")
      .select("rol_unidad, unidad_id")
      .eq("id", creada.invitacionId)
      .single();
    expect(data).toEqual({ rol_unidad: "propietario", unidad_id: U102 });
  });

  it("una vecina no, ni en su propia vivienda", async () => {
    await entrarComo(VECINA);
    await expect(
      invitarAUnidad({
        condominioId: CONDOMINIO,
        unidadId: U102,
        rol: "propietario",
        nombre: `${MARCA} vecina`,
        correo: "otro.dueno.prueba@veciyo.test",
      }),
    ).rejects.toThrow(/Solo la administracion puede registrar al propietario/);
    await salir();
  });
});
