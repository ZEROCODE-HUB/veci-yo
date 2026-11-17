import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ReglaArchivoCard } from "./ReglaArchivoCard";

/**
 * El reglamento subido se ve (17/11/2026): antes quedaba la palabra
 * «Reglamento» y un icono de descarga diminuto, porque se pintaba el texto
 * por secciones, que con un archivo está vacío.
 */
describe("el reglamento subido como archivo", () => {
  it("enseña el título, el nombre del archivo, el tipo, la fecha y un botón para verlo", () => {
    const onVer = vi.fn();
    render(
      <ReglaArchivoCard
        titulo="Residente Permanente"
        ruta="cond/1794934218042-b1sow81762r.pdf"
        nombre="Reglamento interno 2026.pdf"
        subidoEn={new Date(2026, 10, 17, 11, 50)}
        abriendo={false}
        onVer={onVer}
        puedeReemplazar={false}
        onReemplazar={() => {}}
      />,
    );
    expect(screen.getByText("Reglamento · Residente Permanente")).toBeDefined();
    expect(screen.getByText("Reglamento interno 2026.pdf")).toBeDefined();
    expect(screen.getByText("PDF · subido el 17/11/2026")).toBeDefined();
    expect(screen.queryByText("Reemplazar archivo")).toBeNull();
    fireEvent.click(screen.getByText("Ver documento"));
    expect(onVer).toHaveBeenCalledTimes(1);
  });

  it("un Word subido antes de guardar su nombre dice qué es, no la ruta; la administración puede reemplazarlo", () => {
    render(
      <ReglaArchivoCard
        titulo="Huéspedes Temporales"
        ruta="cond/abc.docx"
        nombre={null}
        subidoEn={null}
        abriendo={false}
        onVer={() => {}}
        puedeReemplazar
        onReemplazar={() => {}}
      />,
    );
    expect(screen.getByText("Reglamento (Word)")).toBeDefined();
    expect(screen.queryByText(/abc\.docx/)).toBeNull();
    expect(screen.getByText("Reemplazar archivo")).toBeDefined();
  });
});
