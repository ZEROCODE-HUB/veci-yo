import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { UbicacionCard } from "./UbicacionCard";

/**
 * La tarjeta de una vivienda en «Mis viviendas».
 *
 * Llevaba un lápiz y una papelera. Los dos llamaban a un servicio del
 * prototipo que esperaba 150 ms y escribía en un almacén de memoria: la
 * papelera borraba de la lista la vivienda donde uno vive, decía «Ubicación
 * eliminada», y al recargar volvía a estar. Comprobado el 01/10/2026 en la
 * aplicación desplegada, entrando como Sofía.
 *
 * Y aparte de fingir, ninguna de las dos acciones le corresponde a un
 * residente: una vivienda la da de alta la administración y uno entra a ella
 * por invitación.
 *
 * Se buscan por su nombre accesible, que es como los encontraría alguien que
 * navega con lector de pantalla y lo único que tenían: son botones de solo
 * icono.
 */
const VIVIENDA = {
  id: 1,
  direccion: "Las Barranqueras 246",
  alias: "Torre 1 · 102",
  favorito: true,
};

describe("la tarjeta de una vivienda", () => {
  it("no ofrece editarla ni eliminarla", () => {
    render(
      <UbicacionCard
        ubicacion={VIVIENDA}
        esGuardia={false}
        onFavorito={() => {}}
      />,
    );

    expect(screen.queryByLabelText("Editar esta vivienda")).toBeNull();
    expect(screen.queryByLabelText("Eliminar esta vivienda")).toBeNull();
  });

  it("enseña el edificio y la vivienda, y deja cambiar de una a otra", () => {
    /*
      El control positivo. Sin él, la prueba de arriba pasaría igual con la
      tarjeta entera en blanco, que es la forma clásica de un caso negativo que
      no comprueba nada.

      La segunda línea decía «Alias: Torre 1 · 102». No es un alias --nadie lo
      escribió, lo compone `sesion.ts` con la torre y el código--: la etiqueta
      venía del prototipo, donde esto era una libreta de direcciones personales
      y uno les ponía el mote que quería.
    */
    render(
      <UbicacionCard
        ubicacion={VIVIENDA}
        esGuardia={false}
        onFavorito={() => {}}
      />,
    );

    expect(screen.getByText("Las Barranqueras 246")).toBeDefined();
    expect(screen.getByText("Torre 1 · 102")).toBeDefined();
    expect(screen.queryByText("Alias: Torre 1 · 102")).toBeNull();
    expect(
      screen.getByLabelText("Esta es la vivienda que estás viendo"),
    ).toBeDefined();
  });
});

/**
 * El apodo: cómo llama esta persona a su vivienda.
 *
 * Es lo que la tarjeta prometía desde el prototipo --«Alias: Torre 1 · 102»,
 * sobre un texto que compone la aplicación-- y nunca existió. Ahora se guarda
 * en `membresia_unidad.apodo`, que es de cada persona: quien comparta la casa
 * puede llamarla de otra forma.
 */
describe("cuando la vivienda tiene nombre puesto", () => {
  it("se lee el nombre en vez de la torre y el número", () => {
    render(
      <UbicacionCard
        ubicacion={{ ...VIVIENDA, apodo: "La playa" }}
        esGuardia={false}
        onFavorito={() => {}}
        onPonerNombre={() => {}}
      />,
    );

    expect(screen.getByText("La playa")).toBeDefined();
    expect(screen.queryByText("Torre 1 · 102")).toBeNull();
    // El edificio sigue estando: el nombre sustituye a la vivienda, no al sitio.
    expect(screen.getByText("Las Barranqueras 246")).toBeDefined();
    expect(
      screen.getByLabelText("Cambiar el nombre que le diste"),
    ).toBeDefined();
  });

  it("y sin nombre puesto, el lápiz invita a ponerlo", () => {
    render(
      <UbicacionCard
        ubicacion={VIVIENDA}
        esGuardia={false}
        onFavorito={() => {}}
        onPonerNombre={() => {}}
      />,
    );

    expect(screen.getByText("Torre 1 · 102")).toBeDefined();
    expect(screen.getByLabelText("Ponle nombre")).toBeDefined();
  });

  it("un nombre en blanco no cuenta como nombre", () => {
    /*
      La base no deja guardar uno vacío --lo sujeta un `check`-- pero el valor
      llega aquí desde la sesión, y sin esto la segunda línea quedaría muda.
    */
    render(
      <UbicacionCard
        ubicacion={{ ...VIVIENDA, apodo: "   " }}
        esGuardia={false}
        onFavorito={() => {}}
        onPonerNombre={() => {}}
      />,
    );

    expect(screen.getByText("Torre 1 · 102")).toBeDefined();
    expect(screen.getByLabelText("Ponle nombre")).toBeDefined();
  });

  it("a la portería no se le ofrece: el edificio no es una vivienda suya", () => {
    render(
      <UbicacionCard
        ubicacion={VIVIENDA}
        esGuardia
        onFavorito={() => {}}
      />,
    );

    expect(screen.queryByLabelText("Ponle nombre")).toBeNull();
  });
});
