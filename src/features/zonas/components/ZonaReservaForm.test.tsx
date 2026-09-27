import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ZonaComunConfig } from "@/stores/zonas-store";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { textoCompleto } from "@/pruebas/texto";

/**
 * El formulario de reserva de una zona común.
 *
 * Es la pantalla con más reglas nuevas de esta noche y la que menos guardado
 * estaba: se podía reservar sin elegir lavadora, el botón se apagaba sin
 * decir por qué, «Departamento» era un campo de texto libre, había un
 * interruptor que no hacía nada y unos términos que no había forma de leer.
 * Todo eso es **lo que se pinta**, así que ninguna prueba de función pura lo
 * veía.
 */
const agregarReserva = vi.fn();

/*
  El formulario recibe `zona` por prop pero saca su configuracion --horarios,
  aforo, importes, reglamento-- de `zonasComunesConfig`, que es el store. Con
  el mapa vacio la hora sale «Sin hora» aunque venga en la URL. Lo descubri
  con el doble mal puesto, y se conserva la nota porque el acoplamiento no es
  evidente leyendo la firma del componente.
*/
let configDeZonas: Record<string, unknown> = {};

vi.mock("../hooks/useZonas", () => ({
  useZonas: () => ({ agregarReserva, zonasComunesConfig: configDeZonas }),
  OCUPACION_QUERY_KEY: ["ocupacion-zona"],
}));
vi.mock("@/shared/hooks", () => ({
  useUnidadesDisponibles: () => ({ resolverUnidad: () => ({ unidadId: "u1" }) }),
}));
vi.mock("@/stores/ui-store", () => ({ useUIStore: () => vi.fn() }));
vi.mock("@/features/huesped/hooks/useMiAlojamiento", () => ({
  useMiAlojamiento: () => ({ config: { maxHuespedes: 5 } }),
}));
// La ocupación de la zona: sin reservas, todas las lavadoras libres.
vi.mock("@tanstack/react-query", () => ({ useQuery: () => ({ data: [] }) }));

const { ZonaReservaForm } = await import("./ZonaReservaForm");

/*
  Las dos zonas de prueba, con el tipo de la configuracion que el componente
  recibe. Estaban con `as any`, asi que un campo mal escrito aqui --o uno que la
  configuracion real ya no tiene-- pasaba sin que nada lo dijera, y la prueba
  seguia verde comprobando algo que la aplicacion no puede producir.
*/
type ZonaDePrueba = Partial<ZonaComunConfig> &
  Pick<ZonaComunConfig, "id" | "nombre">;

const lavanderia = {
  id: "z1",
  nombre: "Lavanderia",
  emoji: "🧺",
  total: 4,
  capacidadMaxima: 4,
  duracionMaximaMin: 60,
  horariosDisponibles: ["06:00 - 07:00", "07:00 - 08:00"],
  reglas: "No dejar la ropa dentro más de una hora.",
} satisfies ZonaDePrueba;

const piscina = {
  id: "z2",
  nombre: "Piscina",
  emoji: "🏊",
  total: 1,
  capacidadMaxima: 20,
  duracionMaximaMin: 120,
  horariosDisponibles: ["08:00 - 10:00"],
  costoReserva: 30000,
  costoLimpieza: 20000,
  montoGarantia: 50000,
  moneda: "COP",
  reglas: "",
} satisfies ZonaDePrueba;

const pintar = (zona: ZonaDePrueba, extra: Record<string, unknown> = {}) => {
  configDeZonas = { [zona.id]: zona };
  return render(
    <ZonaReservaForm
      zona={zona as never}
      rol="huesped-temporal"
      initialHour="06:00"
      initialDate={DIA_DE_LA_RESERVA}
      initialDepartment="102"
      onSuccess={() => {}}
      {...extra}
    />,
  );
};

/*
  El reloj, fijado al dia que el formulario recibe como fecha elegida.

  La prueba esperaba «Hoy, viernes 25 de septiembre» con la fecha escrita a
  fuego, asi que el 27 de septiembre se puso roja sola: el componente dice
  «Hoy» comparando con el dia de verdad. Una prueba que depende del calendario
  falla un dia cualquiera y parece que la rompio el ultimo cambio.
*/
const DIA_DE_LA_RESERVA = "2026-09-25T10:00:00.000Z";

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date(DIA_DE_LA_RESERVA));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("el formulario de reserva", () => {
  it("enseña el día y la hora en vez de volver a preguntarlos", () => {
    /*
      Habia un calendario de mes entero y dos desplegables --hora y
      duracion--, repitiendo lo que se acababa de elegir en la grilla. A ancho
      de telefono el calendario tapaba la hora, y por eso parecia que no se
      habia elegido nada.
    */
    pintar(lavanderia);
    expect(
      screen.getByText(textoCompleto("Hoy, viernes 25 de septiembre")),
    ).toBeDefined();
    expect(screen.getByText(textoCompleto("06:00 - 07:00"))).toBeDefined();
    expect(screen.queryByText(/Seleccione hora de reserva/)).toBeNull();
    expect(screen.queryByText(/Duración/)).toBeNull();
  });

  it("«Solo yo» viene puesto, que es lo que se reserva casi siempre", () => {
    pintar(lavanderia);
    expect(screen.getByText(textoCompleto("Solo yo"))).toBeDefined();
    expect(screen.getByText(/¿Cuántas personas van contigo\?/)).toBeDefined();
  });

  it("el departamento se enseña, no se escribe", () => {
    /*
      Era un campo de texto libre, y para un huesped escribir el numero del
      vecino no reserva nada: devuelve un error de permisos de la base.
    */
    pintar(lavanderia);
    expect(screen.getByText(textoCompleto("Departamento 102"))).toBeDefined();
    expect(screen.queryByDisplayValue("102")).toBeNull();
  });

  it("no hay ningún interruptor de cargar a la cuota", () => {
    // No se leia en ningun sitio, y le salia a quien no paga cuota.
    pintar(lavanderia);
    expect(screen.queryByText(/cuota de mantenimiento/)).toBeNull();
  });

  it("dice qué falta en vez de apagarse sin explicar", async () => {
    pintar(lavanderia);
    expect(
      screen.getByText(
        textoCompleto("Falta elegir el número y aceptar el reglamento."),
      ),
    ).toBeDefined();
  });

  it("y el número deja de faltar al elegirlo", async () => {
    pintar(lavanderia);
    await userEvent.click(screen.getByText(textoCompleto("Seleccione...")));
    await userEvent.click(screen.getByText(textoCompleto("Lavanderia N°2")));

    expect(
      screen.getByText(textoCompleto("Falta aceptar el reglamento.")),
    ).toBeDefined();
  });

  it("en una zona de un solo puesto no se pide número", () => {
    // La piscina es una: no hay nada que elegir y no puede faltar.
    pintar(piscina, { initialHour: "08:00" });
    expect(screen.queryByText(/N° de Piscina/)).toBeNull();
    expect(
      screen.getByText(textoCompleto("Falta aceptar el reglamento.")),
    ).toBeDefined();
  });

  it("los importes se llaman igual que en la pantalla donde se escriben", () => {
    /*
      La administracion rellena «Costo de reserva» y aqui se leia «Costo:
      30.000 por persona». Marcela pone 30.000 por la piscina y Tomas entiende
      30.000 por cabeza: con cuatro, cuatro veces el precio. Y el costo de
      limpieza se configuraba y no se enseñaba a quien lo paga.
    */
    pintar(piscina, { initialHour: "08:00" });
    expect(screen.getByText(/Costo de reserva/)).toBeDefined();
    expect(screen.getByText(/Costo de limpieza/)).toBeDefined();
    expect(screen.getByText(/Monto de garantía/)).toBeDefined();
    expect(screen.queryByText(/por persona/)).toBeNull();
  });

  it("el reglamento se puede leer antes de aceptarlo", async () => {
    // Se exigia aceptar algo que no habia forma de abrir.
    pintar(lavanderia);
    await userEvent.click(
      screen.getByText(textoCompleto("Leer el reglamento de Lavanderia")),
    );
    expect(
      screen.getByText(/No dejar la ropa dentro más de una hora/),
    ).toBeDefined();
  });

  it("y si no hay reglamento publicado, lo dice", async () => {
    pintar(piscina, { initialHour: "08:00" });
    await userEvent.click(
      screen.getByText(textoCompleto("Leer el reglamento de Piscina")),
    );
    expect(
      screen.getByText(/todavía no ha publicado el reglamento/),
    ).toBeDefined();
  });
});

describe("cómo se paga una zona de pago", () => {
  it("dice qué hacer con las tres cifras, no solo cuánto son", async () => {
    /*
      El cliente lo preguntó tal cual --«¿cómo hace el huésped para pagar
      eso?»-- y la respuesta era que no podía: veía tres importes sueltos y
      ninguna indicación (R-27). Un huésped temporal además no tiene cuota de
      mantenimiento donde cargarlo: se va en cinco días.

      Lo que dice ahora es lo que decidió el KT en el flujo 4.4: el pago va
      fuera de la aplicación, el comprobante por el chat con administración, y
      la administración aprueba a mano.
    */
    pintar(piscina);

    expect(
      await screen.findByText(/pago se hace fuera de la aplicación/i),
    ).toBeDefined();
    expect(screen.getByText(/comprobante por el chat/i)).toBeDefined();
    expect(screen.getByText(/garantía se devuelve/i)).toBeDefined();
  });

  it("y una zona gratuita no dice nada de pagos", async () => {
    // El control: si el aviso se pintara siempre, aparecería en la lavandería,
    // que no cuesta nada, y sería ruido que además confunde.
    pintar({
      ...piscina,
      id: "z3",
      nombre: "Lavandería",
      costoReserva: 0,
      costoLimpieza: 0,
      montoGarantia: 0,
    });

    expect(screen.queryByText(/pago se hace fuera/i)).toBeNull();
  });
});
