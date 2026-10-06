import { describe, expect, it } from "vitest";
import { useUbicacionStore } from "./ubicacion-store";

/**
 * Con qué arranca la aplicación antes de saber nada.
 *
 * Arrancaba con **dos casas inventadas** —«Casa Amorcito» en Miraflores y «Casa
 * Mamá» en Cusco—, puestas como estado inicial del almacén. No eran solo de las
 * pantallas de demostración que las usaban: eran lo que veía **todo el mundo**
 * al abrir la aplicación, durante el parpadeo anterior a que llegaran las
 * viviendas de verdad. Y si esa carga fallaba, se quedaban ahí.
 *
 * El cliente lo zanjó el 06/10/2026: «sobre esos estados iniciales no debe
 * pasar».
 *
 * Esto no se puede dejar a la vigilancia de nadie, porque el síntoma dura un
 * parpadeo y la pantalla se ve bien: una casa con su nombre y su dirección.
 */

describe("el almacén de viviendas", () => {
  it("arranca vacío y sabiendo que no sabe", () => {
    const inicial = useUbicacionStore.getState();
    expect(inicial.ubicaciones).toEqual([]);
    /*
      Las dos mitades. Vacío **y** `cargadas: false`, porque una lista vacía
      sola no distingue «no tienes ninguna vivienda» de «todavía no han
      llegado», y la pantalla enseña cosas distintas en cada caso.
    */
    expect(inicial.cargadas).toBe(false);
  });

  it("y no trae ninguna casa de mentira", () => {
    /*
      El caso que de verdad guarda la puerta: si alguien vuelve a sembrar datos
      de ejemplo en el estado inicial, esto se pone rojo diciendo cuáles.
    */
    const alias = useUbicacionStore.getState().ubicaciones.map((u) => u.alias);
    expect(alias).toEqual([]);
  });

  it("al llegar las de verdad, queda dicho que ya se sabe", () => {
    useUbicacionStore.getState().setUbicaciones([
      { id: 1, direccion: "Torre 1 · 102", alias: "Mi casa", favorito: true },
    ]);
    expect(useUbicacionStore.getState().cargadas).toBe(true);
    expect(useUbicacionStore.getState().ubicaciones).toHaveLength(1);
  });

  it("y con una lista vacía también: no tener vivienda es saberlo", () => {
    /*
      La otra cara del problema. Si `cargadas` solo se encendiera con datos,
      alguien sin ninguna vivienda se quedaría mirando «Cargando…» para
      siempre.
    */
    useUbicacionStore.getState().setUbicaciones([]);
    expect(useUbicacionStore.getState().cargadas).toBe(true);
    expect(useUbicacionStore.getState().ubicaciones).toEqual([]);
  });
});
