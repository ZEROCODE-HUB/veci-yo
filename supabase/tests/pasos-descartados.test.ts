import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CUENTA, entrar, insertar, leer, api, type Sesion } from "./apoyo";

/**
 * Los pasos que cada uno quita de su tarjeta de inicio (18/11/2026): son de
 * cada persona. Lo que quita Sofía no lo ve ni lo borra Guillermo.
 */
let sofia: Sesion;
let guillermo: Sesion;
const PASO = "prueba_paso";
const OTRO = "prueba_otro";

const limpiar = async () => {
  for (const s of [sofia, guillermo]) {
    const r = await api(s, `/rest/v1/paso_descartado?paso=in.(${PASO},${OTRO})`, { metodo: "DELETE" });
    expect(r.estado).toBeLessThan(300);
  }
};

beforeAll(async () => {
  [sofia, guillermo] = await Promise.all([entrar(CUENTA.vecino), entrar(CUENTA.propietario)]);
  await limpiar();
});
afterAll(limpiar);

describe("los pasos descartados", () => {
  it("son de cada uno", async () => {
    const alta = await insertar(sofia, "paso_descartado?select=paso", { paso: PASO });
    expect(alta.estado, alta.mensaje).toBe(201);
    const suyos = await leer<{ paso: string }[]>(sofia, `paso_descartado?select=paso&paso=eq.${PASO}`);
    expect(suyos.datos).toHaveLength(1);
    const ajenos = await leer<{ paso: string }[]>(guillermo, `paso_descartado?select=paso&paso=eq.${PASO}`);
    expect(ajenos.datos).toHaveLength(0);
  });

  it("nadie lo escribe a nombre de otro", async () => {
    const otro = await insertar(guillermo, "paso_descartado", { paso: OTRO, usuario_id: sofia.usuarioId });
    expect(otro.estado).toBeGreaterThanOrEqual(400);
  });
});
