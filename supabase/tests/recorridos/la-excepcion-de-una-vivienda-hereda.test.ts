import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio } from "./cliente";
import {
  guardarPermisosDeUnidad,
  obtenerPermisos,
  permisosDeUnidad,
  volverALaReglaDelEdificio,
} from "@/features/administrador/services/permisos.repo";

/**
 * La excepción de una vivienda guarda solo lo que difiere del edificio
 * (17/10/2026).
 *
 * Hasta ese día `guardarPermisosDeUnidad` escribía **todos** los campos con lo
 * que el formulario enseñaba, así que una vivienda guardada una vez quedaba
 * congelada: `permisos_de_unidad` combina con `coalesce` y un valor escrito
 * gana siempre, aunque el edificio cambie después. La pantalla decía «lo que
 * dejes sin tocar sigue la regla del edificio».
 *
 * La herencia en sí --que un NULL toma el valor del edificio-- ya la comprueba
 * `permisos.test.ts` («una excepción vacía hereda»). Lo que faltaba es que la
 * app **escriba** NULL, y eso se mira aquí en la fila cruda, pasando por la
 * misma función que la pantalla. Así no hace falta tocar la regla del edificio,
 * que la cambian a la vez otros archivos.
 *
 * Se usa la 301 (la de Marcela), donde ninguna otra prueba pone excepción.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U301 = "44444444-4444-4444-4444-444444444444";
// El valor actual de `permitir_si_no_configurado`.
const SI_NO_CONFIGURADO = true;
const MARCELA = "admin@veciyo.test";

let filaAntes: Record<string, unknown> | null = null;

const filaCruda = async () => {
  const { data, error } = await servicio
    .from("permiso_vivienda")
    .select("*")
    .eq("unidad_id", U301)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as Record<string, unknown> | null;
};

beforeAll(async () => {
  filaAntes = await filaCruda();
  await entrarComo(MARCELA);
});

afterAll(async () => {
  await salir();
  // Se devuelve la fila cruda, o se borra si no había: la restauración no pasa
  // por el código que se prueba.
  if (filaAntes) {
    const { id, unidad_id, created_at, updated_at, ...campos } = filaAntes;
    void id; void unidad_id; void created_at; void updated_at;
    const { error } = await servicio.from("permiso_vivienda").update(campos).eq("unidad_id", U301);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await servicio.from("permiso_vivienda").delete().eq("unidad_id", U301);
    if (error) throw new Error(error.message);
  }
});

describe("la excepción de una vivienda", () => {
  it("guarda solo el campo que cambió; el resto queda en blanco para heredar", async () => {
    const delEdificio = await obtenerPermisos(CONDOMINIO, SI_NO_CONFIGURADO);
    expect(delEdificio, "el edificio tiene su regla").not.toBeNull();

    // Lo que la pantalla manda: lo que ve (la regla del edificio) con un solo
    // cambio, las mascotas de la estancia corta al revés.
    const visto = await permisosDeUnidad(U301, SI_NO_CONFIGURADO);
    const mascotas = !visto!.estanciaCorta.permiteMascotas;
    await guardarPermisosDeUnidad(CONDOMINIO, U301, {
      ...visto!,
      estanciaCorta: { ...visto!.estanciaCorta, permiteMascotas: mascotas },
    }, SI_NO_CONFIGURADO);

    const fila = await filaCruda();
    expect(fila?.corta_permite_mascotas).toBe(mascotas);
    // Lo que no se tocó no se escribe: si se escribiera, la vivienda dejaría
    // de seguir al edificio en eso.
    expect(fila?.corta_permite_visitas).toBeNull();
    expect(fila?.corta_permite_ninos).toBeNull();
    expect(fila?.entrega_directa).toBeNull();
    expect(fila?.huespedes_temporales).toBeNull();
    expect(fila?.larga_permite_cocheras).toBeNull();

    // Y lo que se ve combinado sigue siendo lo pedido.
    const combinado = await permisosDeUnidad(U301, SI_NO_CONFIGURADO);
    expect(combinado?.estanciaCorta.permiteMascotas).toBe(mascotas);
  });

  it("«Volver a la regla del edificio» deja la excepción vacía", async () => {
    await volverALaReglaDelEdificio(CONDOMINIO, U301);
    const fila = await filaCruda();
    expect(fila?.corta_permite_mascotas).toBeNull();
    expect(fila?.entrega_directa).toBeNull();

    const delEdificio = await obtenerPermisos(CONDOMINIO, SI_NO_CONFIGURADO);
    const combinado = await permisosDeUnidad(U301, SI_NO_CONFIGURADO);
    expect(combinado?.estanciaCorta.permiteMascotas).toBe(
      delEdificio?.estanciaCorta.permiteMascotas,
    );
  });
});
