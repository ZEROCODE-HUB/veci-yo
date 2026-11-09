import { describe, expect, it } from "vitest";
import { destinosDeLlamada, PORTERIA_DEL_EDIFICIO } from "./destinosDeLlamada";
import { llamadaPorInternet } from "./llamadaPorInternet";

describe("destinosDeLlamada", () => {
  it("sin porterías registradas, la portería sale igual (Correcciones fila 9)", () => {
    const destinos = destinosDeLlamada([], { numero: "+573001112233" });
    expect(destinos.map((d) => d.etiqueta)).toEqual(["Portería (guardia)", "Administración"]);
    expect(destinos[0].clave).toBe(PORTERIA_DEL_EDIFICIO);
    // Sin portería registrada no hay número que marcar: solo por la app.
    expect(destinos[0].numero).toBe("");
  });

  it("con porterías registradas, salen por su nombre y con su número", () => {
    const destinos = destinosDeLlamada(
      [{ id: "p1", nombre: "Portería norte", numero: "+5711" }],
      { numero: "" },
    );
    expect(destinos[0]).toEqual({ clave: "porteria:p1", etiqueta: "Portería norte", numero: "+5711" });
    expect(destinos).toHaveLength(2);
  });

  it("la portería sin registrar se llama por la app como cualquier portería", () => {
    expect(
      llamadaPorInternet({
        rolActivo: "propietario",
        destino: PORTERIA_DEL_EDIFICIO,
        unidadId: "",
        unidadActivaId: "u-102",
        condominioId: "c1",
      }),
    ).toEqual({ destino: "porteria", desdeUnidadId: "u-102" });
    expect(
      llamadaPorInternet({
        rolActivo: "administrador",
        destino: PORTERIA_DEL_EDIFICIO,
        unidadId: "",
        unidadActivaId: null,
        condominioId: "c1",
      }),
    ).toEqual({ destino: "porteria", condominioId: "c1" });
  });
});
