import { describe, expect, it } from "vitest";
import type { Anuncio } from "../../types/anuncios";
import { desdeElAnuncio } from "./desdeElAnuncio";

/**
 * El anuncio que ya existe, puesto en el formulario para corregirlo.
 *
 * Corregir un anuncio no se podía: `publicacion` tiene política de UPDATE desde
 * el primer día y ninguna pantalla la usaba. Al construirlo, lo que importa es
 * que **no se pierda nada** al abrir el formulario: un campo que no se rellena
 * se guarda vacío, y eso en un anuncio ya publicado es peor que no poder
 * corregirlo.
 *
 * El caso de las fechas es el que justifica que esto se pruebe aparte. La
 * primera versión las leía de `fechaPublicada`, que es la **formateada**
 * --`dd/mm/aaaa`, porque es lo que se pinta en la tarjeta-- y `parseFechaIso`
 * espera `aaaa-mm-dd`: devolvía `null`, el formulario abría sin fechas, y el
 * esquema --que las exige-- no dejaba guardar. Corregir habría sido imposible
 * por un separador.
 */
const anuncio = (parcial: Partial<Anuncio> = {}): Anuncio => ({
  uuid: "p1",
  id: 1,
  categoria: "Mantenimiento",
  titulo: "Corte de agua el jueves",
  descripcion: "De 8 a 12",
  fechaPublicada: "02/10/2026",
  fechaFinalizacion: "09/10/2026",
  fechaCorta: "02/10/2026",
  publicadaDesdeIso: "2026-10-02T05:00:00+00:00",
  publicadaHastaIso: "2026-10-09T05:00:00+00:00",
  votacion: false,
  paraPropietarios: true,
  paraResidentes: true,
  paraHuespedes: false,
  avisar: true,
  ...parcial,
});

describe("un anuncio puesto en el formulario", () => {
  it("no pierde ningún campo", () => {
    const valores = desdeElAnuncio(anuncio());

    expect(valores.tipo).toBe("Anuncio");
    expect(valores.titulo).toBe("Corte de agua el jueves");
    expect(valores.descripcion).toBe("De 8 a 12");
    expect(valores.categoria).toBe("Mantenimiento");
    expect(valores.paraPropietarios).toBe(true);
    expect(valores.paraResidentes).toBe(true);
    expect(valores.paraHuespedes).toBe(false);
    expect(valores.avisar).toBe(true);
  });

  it("y las fechas llegan, que es lo que se rompió", () => {
    const valores = desdeElAnuncio(anuncio());

    expect(valores.fechaPublicada).toBeInstanceOf(Date);
    expect(valores.fechaPublicada!.getFullYear()).toBe(2026);
    expect(valores.fechaPublicada!.getMonth()).toBe(9); // octubre
    expect(valores.fechaPublicada!.getDate()).toBe(2);

    expect(valores.fechaFinalizacion).toBeInstanceOf(Date);
    expect(valores.fechaFinalizacion!.getDate()).toBe(9);
  });

  it("sin fecha de finalización, queda vacía y no inventa una", () => {
    const valores = desdeElAnuncio(
      anuncio({ fechaFinalizacion: "", publicadaHastaIso: null }),
    );
    expect(valores.fechaFinalizacion).toBeNull();
  });

  it("una encuesta llega como encuesta, con sus opciones y su umbral", () => {
    const valores = desdeElAnuncio(
      anuncio({
        votacion: true,
        opcionesVotacion: ["Sí", "No", "Me da igual"],
        umbral: 12,
        votacionMultiple: true,
        ocultarResultados: true,
      }),
    );

    expect(valores.tipo).toBe("Encuesta");
    expect(valores.opcionesVotacion).toEqual([
      { valor: "Sí" },
      { valor: "No" },
      { valor: "Me da igual" },
    ]);
    expect(valores.umbral).toBe("12");
    expect(valores.votacionMultiple).toBe(true);
    expect(valores.ocultarResultados).toBe(true);
  });

  it("una encuesta sin opciones trae dos vacías, que es lo que pide el esquema", () => {
    // `anuncioSchema` exige al menos dos: con una lista vacía el formulario no
    // se podría ni abrir sin romper la validación.
    const valores = desdeElAnuncio(anuncio({ votacion: true }));
    expect(valores.opcionesVotacion).toHaveLength(2);
  });

  it("si no se quiso avisar, se hereda; y avisar del cambio arranca apagado", () => {
    /*
      Avisar de la corrección de algo de lo que nadie supo sería anunciarlo por
      la puerta de atrás. Y `avisarDelCambio` se pide cada vez: no se arrastra.
    */
    const valores = desdeElAnuncio(anuncio({ avisar: false }));
    expect(valores.avisar).toBe(false);
    expect(valores.avisarDelCambio).toBe(false);
  });
});
