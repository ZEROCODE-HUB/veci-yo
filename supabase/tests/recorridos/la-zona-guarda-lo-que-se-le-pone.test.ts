import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio } from "./cliente";
import {
  actualizarZona,
  IMAGEN_ZONA,
  obtenerZonas,
  subirImagenDeZona,
  urlImagenDeZona,
} from "@/features/zonas/services/zonas.repo";

/**
 * Recorrido: una zona guarda lo que se le pone.
 *
 * Tres cosas que el formulario del administrador pintaba y que **no llegaban a
 * la base**, encontradas el 03/10/2026 contando cuántos campos del formulario
 * no aparecían en el guardado:
 *
 *   · `permiteCorta` y `permiteLarga` —arreglados en el repositorio días
 *     antes, con su comentario diciendo «se podían cambiar y no se guardaban
 *     nunca», y la pantalla seguía sin pasarlos. La cadena de tres eslabones
 *     rota en el último, otra vez;
 *   · las condiciones de aprobación, recién añadidas;
 *   · el icono elegido de la galería.
 *
 * Y la imagen, que es peor: `imagen_path` se leía, nadie la escribía, y **no
 * existía ni el bucket**. El administrador subía una foto, la veía en la vista
 * previa, guardaba, y al volver no estaba.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const ADMIN = "admin@veciyo.test";
const VECINA = "vecino@veciyo.test";

let zonaId = "";
let comoEstaba: Record<string, unknown> | null = null;

beforeAll(async () => {
  await entrarComo(ADMIN);

  /*
    Una zona que de verdad exista, y se guarda su fila cruda para devolverla.
    Se elige la de más cupos y no «la primera que haya»: las de un solo cupo
    las pelean media docena de archivos en paralelo.
  */
  const { data } = await servicio
    .from("zona_comun")
    .select("*")
    .eq("condominio_id", CONDOMINIO)
    .is("deleted_at", null)
    .order("cupos_simultaneos", { ascending: false })
    .limit(1)
    .single();

  zonaId = data!.id;
  comoEstaba = data as Record<string, unknown>;
});

afterAll(async () => {
  if (comoEstaba) {
    await servicio
      .from("zona_comun")
      .update({
        permite_estancia_corta: comoEstaba.permite_estancia_corta,
        permite_estancia_larga: comoEstaba.permite_estancia_larga,
        requiere_aprobacion: comoEstaba.requiere_aprobacion,
        condiciones_aprobacion: comoEstaba.condiciones_aprobacion,
        emoji: comoEstaba.emoji,
        imagen_path: comoEstaba.imagen_path,
      })
      .eq("id", zonaId);
  }
  await salir();
});

/** La fila cruda, que es lo único que no miente sobre si se guardó. */
async function enLaBase() {
  const { data } = await servicio
    .from("zona_comun")
    .select(
      "permite_estancia_corta, permite_estancia_larga, requiere_aprobacion, condiciones_aprobacion, emoji, imagen_path",
    )
    .eq("id", zonaId)
    .single();
  return data!;
}

describe("lo que el formulario pinta, la base lo guarda", () => {
  it("las condiciones de aprobación", async () => {
    await actualizarZona(zonaId, {
      requiereAprobacion: true,
      condicionesAprobacion: "Avisar con una semana y pagar la garantía antes",
    });

    const fila = await enLaBase();
    expect(fila.condiciones_aprobacion).toContain("una semana");
  });

  it("y se borran solas si la zona deja de requerir aprobación", async () => {
    /*
      Unas condiciones de aprobación en una zona que se confirma sola serían un
      texto que nadie va a leer: la casilla decorativa de siempre, con forma de
      párrafo. La base lo rechaza con un `check`, así que el repositorio las
      manda a null.
    */
    await actualizarZona(zonaId, {
      requiereAprobacion: false,
      condicionesAprobacion: "Esto no debería quedar",
    });

    const fila = await enLaBase();
    expect(fila.condiciones_aprobacion).toBeNull();
  });

  it("el icono elegido de la galería", async () => {
    await actualizarZona(zonaId, { emoji: "coworking" });
    expect((await enLaBase()).emoji).toBe("coworking");
  });

  it("y los dos permisos de estancia, que no llegaban", async () => {
    await actualizarZona(zonaId, { permiteCorta: false, permiteLarga: true });

    const fila = await enLaBase();
    expect(fila.permite_estancia_corta).toBe(false);
    expect(fila.permite_estancia_larga).toBe(true);
  });

  it("y la pantalla lo vuelve a leer", async () => {
    /*
      El control que hace que lo de arriba signifique algo: comprobar que se
      escribe no es comprobar que se ve. Ya pasó con el número de lavadora, que
      se guardaba bien y no aparecía en ninguna de las cuatro pantallas.
    */
    const zonas = await obtenerZonas();
    const zona = zonas.gestion[zonaId];

    expect(zona).toBeTruthy();
    expect(zona.emoji).toBe("coworking");
    expect(zona.permiteCorta).toBe(false);
  });
});

describe("la foto de la zona", () => {
  const unPng = () =>
    // Un PNG de 1x1, que es lo mínimo que el bucket acepta como imagen.
    Uint8Array.from(
      atob(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      ),
      (c) => c.charCodeAt(0),
    );

  it("se sube y queda su ruta en la fila", async () => {
    const ruta = await subirImagenDeZona(
      zonaId,
      new Blob([unPng()], { type: "image/png" }),
      "image/png",
    );

    expect(ruta.startsWith(`${zonaId}/`)).toBe(true);
    expect((await enLaBase()).imagen_path).toBe(ruta);
  });

  it("y se puede volver a ver", async () => {
    const fila = await enLaBase();
    const url = await urlImagenDeZona(fila.imagen_path!);
    expect(url).toContain("token=");
  });

  it("un formato que el bucket no admite se rechaza antes de subir nada", async () => {
    /*
      Antes, con `mediaTypes: ["images"]`, un HEIC del carrete de un iPhone
      pasaba el selector y moría contra el servidor con un error que no
      explicaba nada.
    */
    await expect(
      subirImagenDeZona(zonaId, new Blob(["x"], { type: "image/heic" }), "image/heic"),
    ).rejects.toThrow(/JPG, PNG o WEBP/i);
  });

  it("y una demasiado grande, también", async () => {
    const grande = new Uint8Array((IMAGEN_ZONA.topeMb + 1) * 1024 * 1024);
    await expect(
      subirImagenDeZona(zonaId, new Blob([grande], { type: "image/png" }), "image/png"),
    ).rejects.toThrow(new RegExp(`${IMAGEN_ZONA.topeMb} MB`));
  });

  it("y un vecino no puede cambiarla", async () => {
    /*
      El bucket es privado y su política de alta cuelga de
      `puede_configurar_zona`. Sin este caso, «se sube» pasaría igual con el
      bucket abierto de par en par.
    */
    await salir();
    try {
      await entrarComo(VECINA);
      await expect(
        subirImagenDeZona(
          zonaId,
          new Blob([unPng()], { type: "image/png" }),
          "image/png",
        ),
      ).rejects.toThrow();
    } finally {
      await salir();
      await entrarComo(ADMIN);
    }
  });
});
