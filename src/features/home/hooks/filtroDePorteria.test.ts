import { describe, expect, it } from "vitest";
import type { Conversation } from "@/shared/types";
import { pasaElFiltroDePorteria } from "./filtroDePorteria";

/**
 * Qué ve la portería con cada pestaña.
 *
 * Salió repasando el chat en el navegador el 06/10/2026 con las tres cuentas.
 * El filtro decidía **leyendo el título** de la conversación —
 * `nombre.startsWith("Seguridad")`, `nombre.includes(filtroDepto)`— y eso tiene
 * dos consecuencias que no se ven mirando la pantalla un día cualquiera:
 *
 *   · el día que la etiqueta cambie, la pestaña se vacía sola y sin error;
 *   · y el depto «101» casa con «1012», porque `includes` no sabe de límites.
 *
 * Los dos casos están abajo, y los dos se ponen rojos al volver a la versión
 * que leía el título. `area` y `unidadCodigo` venían en la fila desde el primer
 * día: el mapeo los tiraba al componer la etiqueta.
 */

const conversacion = (parcial: Partial<Conversation>): Conversation =>
  ({
    id: "c1",
    tipo: "individual",
    nombre: "Conversación",
    ultimoMensaje: "",
    ultimaHora: "",
    ultimaFecha: "",
    avatarEmoji: "",
    noLeidos: 0,
    ...parcial,
  }) as Conversation;

describe("el filtro de la portería", () => {
  it("la pestaña de seguridad trae los hilos de seguridad", () => {
    const hilo = conversacion({ area: "seguridad", nombre: "Seguridad · Dpto 301" });
    expect(pasaElFiltroDePorteria(hilo, { tabActiva: "seguridad" })).toBe(true);
    expect(pasaElFiltroDePorteria(hilo, { tabActiva: "admin" })).toBe(false);
    expect(pasaElFiltroDePorteria(hilo, { tabActiva: "torres" })).toBe(false);
  });

  it("y no los de administración, que son de otra gente", () => {
    const hilo = conversacion({
      area: "administracion",
      nombre: "Administración · Dpto 205",
    });
    expect(pasaElFiltroDePorteria(hilo, { tabActiva: "admin" })).toBe(true);
    expect(pasaElFiltroDePorteria(hilo, { tabActiva: "seguridad" })).toBe(false);
  });

  it("decide por el área, no por cómo se llame el hilo", () => {
    /*
      El caso que lo delata: el área es la de siempre y la etiqueta cambió.
      Con la versión que leía el título, esto devolvía `false` y la pestaña de
      seguridad aparecía vacía sin que nadie supiera por qué.
    */
    const renombrado = conversacion({
      area: "seguridad",
      nombre: "Portería · Dpto 301",
    });
    expect(pasaElFiltroDePorteria(renombrado, { tabActiva: "seguridad" })).toBe(
      true,
    );

    // Y al revés: un hilo que **se llame** «Seguridad» sin serlo no se cuela.
    const impostor = conversacion({ area: null, nombre: "Seguridad del barrio" });
    expect(pasaElFiltroDePorteria(impostor, { tabActiva: "seguridad" })).toBe(
      false,
    );
  });

  it("el depto se compara entero, no por si aparece en el texto", () => {
    /*
      `nombre.includes("101")` casa con «Dpto 1012». Son dos viviendas
      distintas y la portería acabaría escribiéndole a la que no es.
    */
    const otro = conversacion({
      area: null,
      unidadCodigo: "1012",
      nombre: "Dpto 1012",
    });
    expect(
      pasaElFiltroDePorteria(otro, { tabActiva: "torres", filtroDepto: "101" }),
    ).toBe(false);

    const suyo = conversacion({ area: null, unidadCodigo: "101", nombre: "Dpto 101" });
    expect(
      pasaElFiltroDePorteria(suyo, { tabActiva: "torres", filtroDepto: "101" }),
    ).toBe(true);
  });

  it("la pestaña de torres deja fuera los hilos de área", () => {
    // Si no, los mismos hilos saldrían en las tres pestañas y el filtro no
    // filtraría nada.
    const seguridad = conversacion({ area: "seguridad", nombre: "Seguridad · Dpto 301" });
    const admin = conversacion({ area: "administracion", nombre: "Administración · Dpto 205" });
    const vecinal = conversacion({ area: null, unidadCodigo: "401", nombre: "Dpto 401" });

    expect(pasaElFiltroDePorteria(seguridad, { tabActiva: "torres" })).toBe(false);
    expect(pasaElFiltroDePorteria(admin, { tabActiva: "torres" })).toBe(false);
    expect(pasaElFiltroDePorteria(vecinal, { tabActiva: "torres" })).toBe(true);
  });
});
