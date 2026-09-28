import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, supabase } from "./cliente";
import {
  guardarAlojamiento,
  obtenerAlojamiento,
  type Alojamiento,
} from "@/features/propietario/services/suscripcion.repo";
import { obtenerUnidadesRentaCorta } from "@/features/reglas/services/rentaCorta.repo";

/**
 * Recorrido: el anfitrión configura el alojamiento y lo vuelve a abrir.
 *
 * Es un viaje de ida y vuelta, y lo que comprueba es que **nada se pierde ni
 * se deforma por el camino**: veintidós campos que la pantalla escribe, la
 * base guarda a su manera --enums, booleanos, secretos en Vault-- y el
 * formulario tiene que volver a leer iguales.
 *
 * Ahí vivía el defecto de la política de mascotas: la base guarda
 * `permite_mascotas`, un booleano, y el camino de ida lo convertía en el texto
 * `"no-permitidas"` mientras el de vuelta esperaba otra cosa. Un round trip lo
 * habría cazado el primer día.
 *
 * Las contraseñas son la excepción deliberada: se escriben y **no se releen**
 * --viven cifradas en Vault y solo salen por `credenciales_alojamiento`--, así
 * que el formulario las recibe vacías. Eso no es pérdida, es diseño, y el
 * recorrido lo fija para que nadie lo "arregle".
 */

const U102 = "44444444-4444-4444-4444-444444444443";
const ANFITRIONA = "vecino@veciyo.test";
const AJENO = "propietario@veciyo.test"; // Guillermo: 101 y 205, no la 102
const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const ADMIN = "admin@veciyo.test"; // Marcela, administradora

/**
 * La fila tal cual está en la base, no lo que devuelve el repositorio.
 *
 * La restauración **no puede pasar por las funciones de la app**: si se está
 * mutando una de ellas para comprobar que la prueba la detecta, el `afterAll`
 * escribe con el código roto y deja la configuración mal. Pasó: una mutación
 * forzó `ocultar_numero` a `false`, la restauración lo escribió así, y tres
 * casos de `conversaciones.test.ts` se pusieron rojos por un dato que este
 * recorrido había estropeado.
 */
let filaOriginal: Record<string, unknown> | null = null;

/**
 * Y el libro, por lo mismo.
 *
 * Solo se devolvia la suscripcion. El libro se quedaba con el wifi, las
 * instrucciones y las notas de la prueba --todas con el prefijo `[prueba]`--
 * escritas encima de las del anfitrion, y ahi seguian: la limpieza global
 * barre filas enteras por prefijo, no columnas dentro de una fila que tiene
 * que seguir existiendo. Se descubrio mirando la pantalla de Sofia y
 * encontrando su alojamiento vestido de prueba.
 */
let libroOriginal: Record<string, unknown> | null = null;

/** Un valor distinto del que hay, para que "se guardó" no pase por casualidad. */
const configuracion: Alojamiento = {
  descripcion: "[prueba] Dos habitaciones y una terraza",
  numHabitaciones: 3,
  maxHuespedes: 5,
  estacionamientos: 2,
  estanciaMinima: 3,
  permiteMascotas: true,
  aptoNinos: false,
  visitasDeHuespedes: "aprobar-cada-uno",
  rnt: "RNT-102-2026",
  publicadoAirbnb: true,
  publicadoBooking: false,
  otrasPlataformas: "[prueba] Vrbo",
  pms: "[prueba] Guesty",
  icalUrl: "https://ejemplo.test/calendario.ics",
  tieneAntirruido: true,
  tieneNoFumar: false,
  tieneSensor: true,
  ocultarNumero: true,
  ocultarContacto: true,
  wifiNombre: "[prueba] VeciYo-102",
  wifiPassword: "clave-wifi-de-prueba",
  puertaPassword: "4321",
  instrucciones: "[prueba] La puerta es la segunda a la derecha.",
  notas: "[prueba] Cubo de basura los martes.",
};

beforeAll(async () => {
  await entrarComo(ANFITRIONA);
  const { data } = await supabase
    .from("suscripcion_renta_corta")
    .select("*")
    .eq("unidad_id", U102)
    .single();
  filaOriginal = data as Record<string, unknown>;

  /*
    Si lo que se guarda para restaurar **ya viene marcado**, una corrida
    anterior no llego a restaurar y esta esta a punto de perpetuarlo: el
    `afterAll` devolveria la fila sucia y el proximo `beforeAll` la leeria como
    si fuera la buena. Asi se quedo la 102 con una descripcion `[prueba]` a la
    vista del cliente, y ninguna prueba se puso roja.

    Se falla aqui, que es donde se ve la causa, en vez de dentro de un caso.
  */
  const descripcion = String(filaOriginal?.descripcion ?? "");
  if (descripcion.startsWith("[prueba")) {
    throw new Error(
      "La configuracion de la 102 ya trae datos de prueba: una corrida " +
        "anterior no restauro. Hay que devolverla a mano antes de seguir, o " +
        "esta corrida la deja igual.",
    );
  }

  const { data: libro } = await supabase
    .from("libro_huesped")
    .select("wifi_nombre, instrucciones, notas")
    .eq("unidad_id", U102)
    .maybeSingle();
  libroOriginal = libro as Record<string, unknown> | null;
});

afterAll(async () => {
  // Se devuelve la fila entera, por escritura directa. Este alojamiento lo
  // usan otros recorridos y `conversaciones.test.ts`.
  if (filaOriginal) {
    const { id, unidad_id, created_at, updated_at, ...campos } = filaOriginal as any;
    await supabase
      .from("suscripcion_renta_corta")
      .update(campos)
      .eq("unidad_id", U102);
  }
  if (libroOriginal) {
    await supabase
      .from("libro_huesped")
      .update(libroOriginal)
      .eq("unidad_id", U102);
  }
  await salir();
});

describe("la configuración del alojamiento", () => {
  it("vuelve igual de la base, campo por campo", async () => {
    await guardarAlojamiento(U102, configuracion);
    const leido = await obtenerAlojamiento(U102);
    expect(leido).not.toBeNull();

    // Se comparan todos menos las contraseñas, que no se releen a propósito.
    const { wifiPassword, puertaPassword, ...esperado } = configuracion;
    for (const [campo, valor] of Object.entries(esperado)) {
      expect(
        { campo, valor: (leido as any)[campo] },
        `el campo ${campo} no volvió igual`,
      ).toEqual({ campo, valor });
    }
  });

  it("y el booleano de mascotas sigue siendo un booleano", async () => {
    /*
      El defecto que hubo: la base guarda `permite_mascotas`, y el camino de
      ida lo convertía en el texto "no-permitidas" --con guion, que acabó
      viéndose en la pantalla-- mientras el de vuelta esperaba otra cosa. Tres
      variantes del mismo valor para una columna que es `boolean`.
    */
    const leido = await obtenerAlojamiento(U102);
    expect(typeof leido!.permiteMascotas).toBe("boolean");
    expect(leido!.permiteMascotas).toBe(true);

    await guardarAlojamiento(U102, {
      ...configuracion,
      permiteMascotas: false,
    });
    const otra = await obtenerAlojamiento(U102);
    expect(otra!.permiteMascotas).toBe(false);
  });

  it("las contraseñas no se releen: viven en Vault", async () => {
    // Que vuelvan vacías es lo correcto. Si algún día volvieran con su valor,
    // significaría que alguien las sacó del Vault para rellenar un formulario.
    const leido = await obtenerAlojamiento(U102);
    expect(leido!.wifiPassword ?? "").toBe("");
    expect(leido!.puertaPassword ?? "").toBe("");
  });

  it("y el dueño de otra vivienda no puede configurar esta", async () => {
    await salir();
    await entrarComo(AJENO);
    await expect(
      guardarAlojamiento(U102, { ...configuracion, maxHuespedes: 99 }),
    ).rejects.toThrow();
    await salir();
    await entrarComo(ANFITRIONA);

    // Control: no solo fallo la llamada, tampoco cambio el dato.
    const leido = await obtenerAlojamiento(U102);
    expect(leido!.maxHuespedes).not.toBe(99);
  });

  it("y al ocultar el contacto, el teléfono deja de salir para los vecinos", async () => {
    /*
      `ocultar_contacto` existe desde 20260922130000 y la base la respeta en
      las tres funciones que listan la renta corta. Lo que faltaba era poder
      encenderla: `guardar_alojamiento` no recibía el parámetro, así que la
      columna se quedaba en su `default false` para siempre.

      El caso pide el teléfono **explícitamente** con las dos banderas y desde
      dos roles, porque "no lo veo" se cumple igual con la protección apagada
      si resulta que esa vivienda no tenía teléfono puesto.
    */
    await guardarAlojamiento(U102, { ...configuracion, ocultarContacto: false });

    await salir();
    await entrarComo(AJENO);
    const conTelefono = await obtenerUnidadesRentaCorta({
      condominioId: CONDOMINIO,
      comoPersonal: false,
    });
    const antes = conTelefono.find((u) => u.id === U102);
    expect(antes, "la 102 tiene que estar en la lista").toBeDefined();
    const suyo = (u: typeof antes) => u!.telAnfitrion ?? u!.telPropietario;
    // Control positivo: apagada, el vecino sí ve el teléfono de la vivienda.
    expect(suyo(antes)).toBeTruthy();

    await salir();
    await entrarComo(ANFITRIONA);
    await guardarAlojamiento(U102, { ...configuracion, ocultarContacto: true });

    await salir();
    await entrarComo(AJENO);
    const ocultos = await obtenerUnidadesRentaCorta({
      condominioId: CONDOMINIO,
      comoPersonal: false,
    });
    const despues = ocultos.find((u) => u.id === U102);
    expect(despues, "la vivienda sigue en la lista, sin teléfono").toBeDefined();
    expect(despues!.telAnfitrion).toBeUndefined();
    expect(despues!.telPropietario).toBeUndefined();

    /*
      El del administrador **del condominio** no se esconde, y es deliberado:
      la columna dice «oculta los teléfonos del anfitrión y del propietario», y
      al administrador es a quien un vecino tiene que poder llamar para
      quejarse justamente de esa vivienda. Queda fijado para que no se
      «arregle» de más.
    */
    expect(despues!.telAdmin).toBeTruthy();

    /*
      Y la administración lo sigue viendo: la bandera esconde el teléfono de
      los vecinos, no del condominio, que tiene que poder llamar.
    */
    await salir();
    await entrarComo(ADMIN);
    const comoPersonal = await obtenerUnidadesRentaCorta({
      condominioId: CONDOMINIO,
      comoPersonal: true,
    });
    const paraElPersonal = comoPersonal.find((u) => u.id === U102);
    expect(suyo(paraElPersonal)).toBeTruthy();

    await salir();
    await entrarComo(ANFITRIONA);
  });
});
