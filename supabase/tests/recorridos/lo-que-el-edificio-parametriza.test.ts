import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio, supabase } from "./cliente";
import {
  guardarLimitesRentaCorta,
  obtenerCondominio,
  actualizarCondominio,
  obtenerTerminosDelEdificio,
  publicarTerminosDelEdificio,
} from "@/features/administrador/services/condominio.repo";
import {
  crearTipologia,
  eliminarTipologia,
} from "@/features/administrador/services/arquitectura.repo";
import {
  eliminarPreguntaFrecuente,
  guardarPreguntaFrecuente,
} from "@/features/perfil/services/pqrs.repo";
import {
  guardarVencimientoRnt,
  obtenerLimites,
} from "@/features/propietario/services/suscripcion.repo";
import { obtenerZonas } from "@/features/zonas/services/zonas.repo";

/**
 * Lo que estaba en la base y nadie podía cambiar desde la aplicación
 * (16/10/2026, pestaña Parametrización).
 *
 * Cada bloque comprueba las dos mitades: que la administración lo escribe y
 * que surte efecto donde se usa, y que una vecina no puede escribirlo. Lo que
 * se restaura se guarda como fila cruda, con la clave de servicio.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const MARCELA = "admin@veciyo.test";
const SOFIA = "vecino@veciyo.test"; // propietaria de la 102
const ROCIO = "residente@veciyo.test"; // vive en la 102, no es la dueña
const MARCA = "[prueba] parametriza";

type FilaCondominio = { zona_horaria: string | null; moneda: string; horario_atencion: string | null };
let condominioAntes: FilaCondominio;
let limitesAntes: { estancia_minima_noches: number | null; capacidad_maxima: number | null } | null;
let terminosAntes: { id: string } | null;
let rntAntes: string | null = null;

beforeAll(async () => {
  const { data: c, error } = await servicio
    .from("condominio")
    .select("zona_horaria, moneda, horario_atencion")
    .eq("id", CONDOMINIO)
    .single();
  if (error) throw new Error(error.message);
  condominioAntes = c as FilaCondominio;

  const { data: l } = await servicio
    .from("limite_renta_corta_condominio")
    .select("estancia_minima_noches, capacidad_maxima")
    .eq("condominio_id", CONDOMINIO)
    .maybeSingle();
  limitesAntes = l;

  const { data: t } = await servicio
    .from("documento_legal")
    .select("id")
    .eq("condominio_id", CONDOMINIO)
    .eq("tipo", "terminos_condominio")
    .eq("vigente", true)
    .maybeSingle();
  terminosAntes = t;

  const { data: s } = await servicio
    .from("suscripcion_renta_corta")
    .select("rnt_vence_en")
    .eq("unidad_id", U102)
    .single();
  rntAntes = s?.rnt_vence_en ?? null;

  // Lo que dejara una corrida que murió a medias.
  await servicio.from("tipologia").delete().like("nombre", `${MARCA}%`);
  await servicio.from("pregunta_frecuente").delete().like("pregunta", `${MARCA}%`);
});

afterAll(async () => {
  await salir();
  const errores: string[] = [];
  const mirar = (r: { error: { message: string } | null }) => {
    if (r.error) errores.push(r.error.message);
  };

  mirar(await servicio.from("condominio").update(condominioAntes).eq("id", CONDOMINIO));

  if (limitesAntes) {
    mirar(
      await servicio
        .from("limite_renta_corta_condominio")
        .update(limitesAntes)
        .eq("condominio_id", CONDOMINIO),
    );
  } else {
    mirar(
      await servicio
        .from("limite_renta_corta_condominio")
        .delete()
        .eq("condominio_id", CONDOMINIO),
    );
  }

  // Los términos: se retiran las versiones de la prueba y vuelve la que había.
  mirar(
    await servicio
      .from("documento_legal")
      .delete()
      .eq("condominio_id", CONDOMINIO)
      .eq("tipo", "terminos_condominio")
      .like("titulo", `${MARCA}%`),
  );
  if (terminosAntes) {
    mirar(
      await servicio.from("documento_legal").update({ vigente: true }).eq("id", terminosAntes.id),
    );
  }

  mirar(
    await servicio
      .from("suscripcion_renta_corta")
      .update({ rnt_vence_en: rntAntes })
      .eq("unidad_id", U102),
  );
  mirar(await servicio.from("tipologia").delete().like("nombre", `${MARCA}%`));
  mirar(await servicio.from("pregunta_frecuente").delete().like("pregunta", `${MARCA}%`));

  if (errores.length) throw new Error(`La limpieza falló: ${errores.join(" | ")}`);
});

describe("la zona horaria la elige el edificio", () => {
  const zonaDeLaBase = async () => {
    const { data, error } = await supabase.rpc("zona_horaria_del_condominio", {
      p_condominio_id: CONDOMINIO,
    });
    if (error) throw new Error(error.message);
    return data as string;
  };

  it("la que guarda la administración es la que usan las reglas de «hoy»", async () => {
    await entrarComo(MARCELA);
    const leido = await obtenerCondominio(CONDOMINIO);
    await actualizarCondominio(CONDOMINIO, {
      ...leido!.valores,
      zonaHoraria: "America/Mexico_City",
    });
    expect(await zonaDeLaBase()).toBe("America/Mexico_City");
    await salir();
  });

  it("una zona que no existe no se guarda", async () => {
    await entrarComo(MARCELA);
    const leido = await obtenerCondominio(CONDOMINIO);
    await expect(
      actualizarCondominio(CONDOMINIO, { ...leido!.valores, zonaHoraria: "Marte/Base" }),
    ).rejects.toThrow(/no existe/);
    await salir();
  });

  it("la moneda y el horario de atención se leen como se guardaron", async () => {
    await entrarComo(MARCELA);
    const leido = await obtenerCondominio(CONDOMINIO);
    await actualizarCondominio(CONDOMINIO, {
      ...leido!.valores,
      moneda: "USD",
      horarioAtencion: `${MARCA} lunes a viernes`,
    });
    const otra = await obtenerCondominio(CONDOMINIO);
    expect(otra!.valores.moneda).toBe("USD");
    expect(otra!.valores.horarioAtencion).toBe(`${MARCA} lunes a viernes`);
    await salir();
  });
});

describe("los límites de renta corta del edificio", () => {
  it("los pone la administración y los ve el anfitrión", async () => {
    await entrarComo(MARCELA);
    await guardarLimitesRentaCorta(CONDOMINIO, { estanciaMinimaNoches: 3, capacidadMaxima: 5 });
    await salir();

    await entrarComo(SOFIA);
    const limites = await obtenerLimites(U102);
    await salir();
    expect(limites?.estanciaMinimaNoches).toBe(3);
    expect(limites?.capacidadMaxima).toBe(5);
  });

  it("una vecina no los puede cambiar", async () => {
    await entrarComo(SOFIA);
    await expect(
      guardarLimitesRentaCorta(CONDOMINIO, { estanciaMinimaNoches: 1, capacidadMaxima: 50 }),
    ).rejects.toThrow(/row-level security/);
    await salir();
  });
});

describe("los términos del edificio", () => {
  it("publicar deja una versión nueva y guarda la anterior", async () => {
    await entrarComo(MARCELA);
    const antes = await obtenerTerminosDelEdificio(CONDOMINIO);
    const version = await publicarTerminosDelEdificio(CONDOMINIO, `${MARCA} términos`, "Texto de prueba.");
    const ahora = await obtenerTerminosDelEdificio(CONDOMINIO);
    await salir();

    expect(version).toBe((antes?.version ?? 0) + 1);
    expect(ahora?.titulo).toBe(`${MARCA} términos`);
    if (terminosAntes) {
      const { data } = await servicio
        .from("documento_legal")
        .select("vigente")
        .eq("id", terminosAntes.id)
        .single();
      expect(data?.vigente).toBe(false);
    }
  });

  it("una vecina no los puede publicar", async () => {
    await entrarComo(SOFIA);
    await expect(
      publicarTerminosDelEdificio(CONDOMINIO, `${MARCA} ajenos`, "No."),
    ).rejects.toThrow(/Solo la administración/);
    await salir();
  });
});

describe("las tipologías y las preguntas frecuentes", () => {
  it("la administración crea una tipología, y una vecina no", async () => {
    await entrarComo(MARCELA);
    await crearTipologia(CONDOMINIO, {
      nombre: `${MARCA} Dúplex`,
      habitaciones: 3,
      banos: 2,
      metrosCuadrados: 110,
    });
    await salir();
    const { data } = await servicio
      .from("tipologia")
      .select("id, habitaciones")
      .eq("nombre", `${MARCA} Dúplex`)
      .single();
    expect(data?.habitaciones).toBe(3);

    await entrarComo(SOFIA);
    await expect(
      crearTipologia(CONDOMINIO, { nombre: `${MARCA} ajena`, habitaciones: 1, banos: 1, metrosCuadrados: null }),
    ).rejects.toThrow(/row-level security/);
    await salir();

    await entrarComo(MARCELA);
    await eliminarTipologia(data!.id);
    await salir();
    const { count } = await servicio
      .from("tipologia")
      .select("id", { count: "exact", head: true })
      .eq("id", data!.id);
    expect(count).toBe(0);
  });

  it("la administración escribe una pregunta frecuente, y una vecina no", async () => {
    await entrarComo(MARCELA);
    await guardarPreguntaFrecuente(CONDOMINIO, {
      categoria: "General",
      pregunta: `${MARCA} ¿A qué hora cierra la piscina?`,
      respuesta: "A las diez.",
      orden: 99,
    });
    await salir();

    // Lo lee un vecino, que es para quien se escribe.
    await entrarComo(SOFIA);
    const { data: vistas } = await supabase
      .from("pregunta_frecuente")
      .select("id")
      .like("pregunta", `${MARCA}%`);
    expect(vistas?.length).toBe(1);

    await expect(
      guardarPreguntaFrecuente(CONDOMINIO, {
        categoria: "General",
        pregunta: `${MARCA} ajena`,
        respuesta: "No.",
        orden: 100,
      }),
    ).rejects.toThrow(/row-level security/);
    await salir();

    await entrarComo(MARCELA);
    await eliminarPreguntaFrecuente(vistas![0].id);
    await salir();
  });
});

/*
  El formulario de una zona arranca con lo que lee `mapearGestionZona`, y al
  guardar escribe todo. Si un dato no se lee, guardar lo pisa con el valor por
  defecto: así se apagaba la aprobación de la piscina al editarla por otra
  cosa (16/10/2026). Se compara con la fila cruda.
*/
describe("la zona se abre con lo que tiene guardado", () => {
  it("la aprobación y el aforo de cada zona llegan al formulario", async () => {
    await entrarComo(MARCELA);
    const { gestion } = await obtenerZonas();
    await salir();
    const { data: filas } = await servicio
      .from("zona_comun")
      .select("id, requiere_aprobacion, capacidad_maxima, cupos_simultaneos")
      .eq("condominio_id", CONDOMINIO)
      .is("deleted_at", null);
    expect(filas!.some((f) => f.requiere_aprobacion)).toBe(true);
    for (const fila of filas!) {
      const zona = gestion[fila.id];
      expect(zona.requiereAprobacion).toBe(fila.requiere_aprobacion);
      expect(zona.capacidadMaxima).toBe(fila.capacidad_maxima ?? 0);
      expect(zona.cuposSimultaneos).toBe(fila.cupos_simultaneos);
    }
  });
});

describe("el vencimiento del RNT", () => {
  it("lo pone la dueña de la vivienda", async () => {
    await entrarComo(SOFIA);
    await guardarVencimientoRnt(U102, "2027-12-31");
    await salir();
    const { data } = await servicio
      .from("suscripcion_renta_corta")
      .select("rnt_vence_en")
      .eq("unidad_id", U102)
      .single();
    expect(data?.rnt_vence_en).toBe("2027-12-31");
  });

  it("y quien vive allí sin ser la dueña, no", async () => {
    // A Rocío la política ni le enseña la fila: el `update` no toca nada y
    // no da error. Lo que cuenta es que la fecha sigue siendo la de Sofía.
    await entrarComo(ROCIO);
    await guardarVencimientoRnt(U102, "2030-01-01").catch(() => undefined);
    await salir();
    const { data } = await servicio
      .from("suscripcion_renta_corta")
      .select("rnt_vence_en")
      .eq("unidad_id", U102)
      .single();
    expect(data?.rnt_vence_en).toBe("2027-12-31");
  });
});
