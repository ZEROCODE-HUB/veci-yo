import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, isoEnDias, salir, servicio } from "./cliente";
import { obtenerZonas } from "@/features/zonas/services/zonas.repo";

/**
 * Recorrido: el huésped ve los cierres de las zonas (15/10/2026, hueco 19).
 *
 * La zona la veía, sus cierres no: la grilla le ofrecía franjas de un día
 * cerrado y la base se las rechazaba al reservar. Se comprueba por la función
 * con que la pantalla carga las zonas, que es donde se perdían.
 */

const PISCINA = "55555555-5555-5555-5555-555555555551";
const HUESPED = "nuevo.inquilino@veciyo.test"; // Tomás, alojado en la 102
const VECINA = "vecino@veciyo.test"; // Sofía, 102
const MARCA = "[prueba] cierre que ve el huesped";
// La columna es `date`: va en ISO (`enDias` da «dd/MM/yyyy», el del formulario).
const FECHA = isoEnDias(200);

const cierresQueVe = async (cuenta: string) => {
  await entrarComo(cuenta);
  const { config } = await obtenerZonas();
  await salir();
  return (config[PISCINA]?.fechasEspeciales ?? []).filter((f) => f.motivo === MARCA);
};

beforeAll(async () => {
  // Se trae su propio cero: una corrida interrumpida pudo dejar el suyo.
  await servicio.from("zona_fecha_especial").delete().eq("motivo", MARCA);
  const { error } = await servicio
    .from("zona_fecha_especial")
    .insert({ zona_id: PISCINA, fecha: FECHA, tipo: "cerrada", motivo: MARCA });
  if (error) throw new Error(error.message);
});

afterAll(async () => {
  const { error } = await servicio.from("zona_fecha_especial").delete().eq("motivo", MARCA);
  if (error) throw new Error(error.message);
});

describe("los cierres de una zona", () => {
  it("los ve el huésped alojado", async () => {
    const cierres = await cierresQueVe(HUESPED);
    expect(cierres).toHaveLength(1);
    expect(cierres[0].tipo).toBe("cerrada");
  });

  it("y los sigue viendo un vecino", async () => {
    // El control: sin él, el caso de arriba pasaría igual si la fila no existiera
    // para nadie.
    expect(await cierresQueVe(VECINA)).toHaveLength(1);
  });

  it("pero no alguien de otro edificio", async () => {
    expect(await cierresQueVe("vecino2@veciyo.test")).toHaveLength(0);
  });
});
