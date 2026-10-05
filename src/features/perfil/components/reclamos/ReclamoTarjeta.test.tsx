import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { textoCompleto } from "@/pruebas/texto";
import type { Reclamo } from "../../services";
import { ReclamoTarjeta } from "./ReclamoTarjeta";

/**
 * La tarjeta de una PQRS en la lista.
 *
 * Esta pantalla la lee la administración con el ámbito `condominio`, o sea
 * todas las del edificio. Decía el nombre de quien la abrió y **no de qué
 * vivienda**: una queja de ruido o una fuga obligaba a abrir la ficha para
 * saber a dónde ir. El dato estaba en `reclamo.unidad_id` desde la primera
 * migración y la consulta no lo pedía.
 *
 * Es el caso que el cliente describió el 02/10/2026 --«el depto junto al
 * nombre, casi en todo lado»-- y de los que quedaban, el que más se nota.
 */
const reclamo = (parcial: Partial<Reclamo> = {}): Reclamo => ({
  id: "r1",
  numero: "0952",
  nombre: "Sofia Martinez",
  unidad: "102",
  titulo: "Ruido en el pasillo",
  descripcion: "",
  area: "Condominio",
  tipo: "Queja",
  estado: "Pendiente",
  fechaCreacion: "01/10/2026",
  fechaRevision: "",
  ...parcial,
});

describe("la tarjeta de una PQRS", () => {
  it("dice quién la abrió y de qué depto", () => {
    render(<ReclamoTarjeta reclamo={reclamo()} onPress={() => {}} />);

    screen.getByText(textoCompleto("Sofia Martinez"));
    screen.getByLabelText("Departamento 102");
  });

  it("y sin depto no pinta una etiqueta vacía", () => {
    /*
      `unidad_id` es nullable: una PQRS sobre la propia aplicación la puede
      abrir quien no vive en el edificio. Una etiqueta en blanco al lado del
      nombre se lee como un dato que falta.
    */
    render(<ReclamoTarjeta reclamo={reclamo({ unidad: null })} onPress={() => {}} />);

    screen.getByText(textoCompleto("Sofia Martinez"));
    expect(screen.queryByLabelText(/^Departamento/)).toBeNull();
  });
});
