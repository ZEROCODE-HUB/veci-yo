import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio } from "./cliente";
import { obtenerReglamento, subirReglamento } from "@/features/reglas/services/reglamentos.repo";

/**
 * Recorrido: subir el reglamento en un edificio nuevo (15/10/2026, hueco 25).
 *
 * Un edificio recién creado no tiene la fila del reglamento, así que subir el
 * archivo no apuntaba a ninguna parte: decía «guardado» y el archivo quedaba
 * suelto. Con Renata, que administra «Mirador del Este», que no tiene ninguno.
 */

const MIRADOR = "22222222-2222-2222-2222-222222222222";
const RENATA = "admin2@veciyo.test";
const PDF = {
  uri: "data:application/pdf;base64,JVBERi0xLjQKJSVFT0YK",
  nombre: "reglamento-de-prueba.pdf",
  tipoMime: "application/pdf",
};

let ruta = "";

beforeAll(async () => {
  // Se trae su propio cero: el edificio no debe tener reglamento de portería.
  await servicio.from("reglamento").delete().eq("condominio_id", MIRADOR).eq("tipo", "guardia_seguridad");
});

afterAll(async () => {
  await salir();
  if (ruta) await servicio.storage.from("reglamentos").remove([ruta]);
  const { error } = await servicio
    .from("reglamento")
    .delete()
    .eq("condominio_id", MIRADOR)
    .eq("tipo", "guardia_seguridad");
  if (error) throw new Error(error.message);
});

describe("el reglamento de un edificio nuevo", () => {
  it("al subir el archivo queda guardado y se puede descargar", async () => {
    await entrarComo(RENATA);
    ruta = await subirReglamento(MIRADOR, "guardia-seguridad", PDF);
    const reglamento = await obtenerReglamento(MIRADOR, "guardia-seguridad");
    await salir();
    expect(reglamento?.downloadable).toBe(true);
    expect(reglamento?.file).toBe(ruta);
    expect(reglamento?.title).toBe("Guardia de Seguridad");
  });
});
