import { describe, expect, it } from "vitest";
import { crearPermisosIniciales, permitido } from "./permisosSinDecidir";

// El valor actual de `permitir_si_no_configurado` en la base.
const SI_NO_CONFIGURADO = true;
const PERMISOS_INICIALES = crearPermisosIniciales(SI_NO_CONFIGURADO);

/**
 * Que la pantalla y la base digan lo mismo sobre "nadie lo ha decidido".
 *
 * Son dos sitios que responden a la misma pregunta: ¿qué pasa con un permiso
 * que nadie ha tocado? La base lo guarda como NULL y `permitido()` lo traduce
 * a permitido --un condominio que no ha dicho nada no está prohibiendo nada--.
 * El formulario, cuando **no hay fila ninguna**, arranca de
 * `PERMISOS_INICIALES`.
 *
 * Decían lo contrario. Cada uno era coherente consigo mismo, que es como este
 * defecto pasa desapercibido, y la consecuencia caía justo en el trabajo del
 * administrador: en un edificio recién dado de alta no hay fila, así que el
 * formulario salía con todo prohibido y pulsar «Guardar» sin tocar nada
 * apagaba la renta corta del condominio entero.
 *
 * Esta prueba no comprueba un valor concreto: comprueba que **los dos digan
 * lo mismo**. Si mañana se decide que sin decidir se prohíbe, hay que
 * cambiarlo en los dos sitios o esto se pone rojo.
 */
describe("un permiso que nadie ha decidido", () => {
  it("vale lo que diga el parámetro", () => {
    expect(permitido(null, SI_NO_CONFIGURADO)).toBe(true);
    expect(permitido(undefined, SI_NO_CONFIGURADO)).toBe(true);
    expect(permitido(null, false)).toBe(false);
  });

  it("y una decisión escrita se respeta, en los dos sentidos", () => {
    // El control positivo: si `permitido` devolviera siempre `true`, el caso
    // de arriba pasaría igual y no estaría comprobando nada.
    expect(permitido(false, SI_NO_CONFIGURADO)).toBe(false);
    expect(permitido(true, false)).toBe(true);
  });

  it("y el formulario de un edificio sin configurar empieza igual", () => {
    const sinDecidir = permitido(null, SI_NO_CONFIGURADO);

    expect(PERMISOS_INICIALES.entregaDirecta).toBe(sinDecidir);
    expect(PERMISOS_INICIALES.huespedesTemporales).toBe(sinDecidir);

    for (const estancia of [
      PERMISOS_INICIALES.estanciaCorta,
      PERMISOS_INICIALES.estanciaLarga,
    ]) {
      expect(estancia.permiteVisitas).toBe(sinDecidir);
      expect(estancia.permiteHuespedNinos).toBe(sinDecidir);
      expect(estancia.permiteMascotas).toBe(sinDecidir);
      expect(estancia.permiteCocherasVisit).toBe(sinDecidir);
    }
  });

  it("y no trae un tope de estancia que nadie puso", () => {
    /*
      `estanciaMaxima: 3` estaba escrito en el formulario inicial. Los numeros
      son advertencia y no bloqueo --KT, flujo 4.1 paso 5-- pero una
      advertencia inventada es igual de mala: le diria al propietario que su
      edificio limita las estancias a tres dias cuando nadie lo ha dicho.
    */
    expect(PERMISOS_INICIALES.estanciaCorta.estanciaMaxima).toBeNull();
    expect(PERMISOS_INICIALES.estanciaLarga.estanciaMaxima).toBeNull();
  });
});
