import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  enDias,
  entrarComo,
  isoEnDias,
  salir,
  supabase,
} from "./cliente";
import { crearVisita } from "@/features/visitas/services/visitas.repo";
import {
  abrirPrecheckin,
} from "@/features/visitas/services/precheckin.repo";
/*
  El flujo del huesped vive **una sola vez**, en la web: es ella quien lo
  ejecuta de verdad --sin cuenta, con el enlace que le llego-- y la copia
  que habia en este repositorio no la corria nadie en produccion. Lo que se
  prueba aqui es, ahora si, lo que el huesped recorre.
*/
import {
  aceptarTerminos as aceptarTerminosPrecheckin,
  consultarPrecheckin,
  guardarFicha as guardarPrecheckin,
} from "../../../../veciyo-web/src/lib/precheckin";

/**
 * Recorrido: el enlace de precheckin, que hasta ahora no existía.
 *
 * El timeline del huésped tenía un primer paso —«🔗 Link de preregistro
 * enviado»— **cableado a `true`**: se pintaba en verde para todo el mundo,
 * siempre, porque lo que comprobaba era que existiera la fila del invitado.
 * No había ningún enlace que enviar ni forma de que el huésped rellenara nada.
 *
 * Aquí se comprueba lo que de verdad importa de un enlace que se le pasa a
 * alguien de fuera del edificio:
 *   · que lo pueda abrir **sin sesión**, porque el huésped todavía no tiene;
 *   · que no enseñe más de la cuenta a quien lo tenga;
 *   · que no lo pueda generar cualquiera;
 *   · y que el token viejo deje de valer al pedir uno nuevo.
 */

/** La estancia de la prueba: dentro de unos dias, y de cuatro noches. */
const DIAS_A_LA_ENTRADA = 4;
const DIAS_A_LA_SALIDA = 8;

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const ANFITRIONA = "vecino@veciyo.test"; // Sofía, de la 102
const AJENO = "propietario@veciyo.test"; // Guillermo, de la 101 y la 205

/** La limpieza global borra por esta marca; ver `limpieza-global.ts`. */
const MARCA = "[prueba] recorrido enlace de precheckin";

let visitaId = "";

beforeAll(async () => {
  await entrarComo(ANFITRIONA);
  visitaId = await crearVisita({
    condominioId: CONDOMINIO,
    unidadId: U102,
    tipo: "huesped_temporal",
    // Relativas a hoy: escritas a fuego caducan y el disparador de «no en el
    // pasado» tumba el `beforeAll` sin decir que es por la fecha.
    fechaDesde: enDias(DIAS_A_LA_ENTRADA),
    fechaHasta: enDias(DIAS_A_LA_SALIDA),
    anotacionesIngreso: MARCA,
    invitados: [],
  });
});

afterAll(async () => {
  await entrarComo(ANFITRIONA);
  await supabase.from("visita").delete().eq("id", visitaId);
  await salir();
});

describe("abrir el enlace de precheckin", () => {
  it("solo lo abre quien gestiona la vivienda", async () => {
    /*
      El control negativo va primero: si `abrir_precheckin` no comprobara
      nada, el caso de abajo pasaria igual y esta prueba seria lo unico que
      lo notaria. Guillermo es dueño de OTRAS dos viviendas, asi que tiene
      sesion y permisos de sobra en el edificio: lo que no tiene es esta.
    */
    await entrarComo(AJENO);
    await expect(abrirPrecheckin(visitaId)).rejects.toThrow(/permiso/i);
  });

  it("y devuelve un enlace que lleva al precheckin", async () => {
    await entrarComo(ANFITRIONA);
    const { enlace, correoEnviado } = await abrirPrecheckin(visitaId);

    expect(enlace).toMatch(/\/access\/[0-9a-f]{64}$/);
    // Con el envío apagado el enlace vuelve para poder pasarlo a mano.
    expect(correoEnviado).toBe(false);
  });

  it("el token no se guarda en claro", async () => {
    /*
      Lo unico que hay en la tabla es el sha256. Se comprueba de verdad y no
      "por diseño": una columna que guardara el token tal cual convertiria un
      volcado de la base en una llave para entrar a los datos de cada reserva.
    */
    await entrarComo(ANFITRIONA);
    const { enlace } = await abrirPrecheckin(visitaId);
    const token = enlace.split("/access/")[1];

    const { data } = await supabase
      .from("visita")
      .select("precheckin_token_hash, precheckin_expira_en")
      .eq("id", visitaId)
      .single();

    expect(data?.precheckin_token_hash).toBeTruthy();
    expect(data?.precheckin_token_hash).not.toBe(token);
    expect(data?.precheckin_expira_en).toBeTruthy();
  });

  it("pedir uno nuevo invalida el anterior", async () => {
    await entrarComo(ANFITRIONA);
    const primero = (await abrirPrecheckin(visitaId)).enlace.split("/access/")[1];
    const segundo = (await abrirPrecheckin(visitaId)).enlace.split("/access/")[1];

    expect(segundo).not.toBe(primero);
    await salir();
    expect(await consultarPrecheckin(primero, supabase)).toBeNull();
    expect(await consultarPrecheckin(segundo, supabase)).not.toBeNull();
  });
});

describe("leerlo desde fuera", () => {
  let token = "";

  beforeAll(async () => {
    await entrarComo(ANFITRIONA);
    token = (await abrirPrecheckin(visitaId)).enlace.split("/access/")[1];
    // Sin sesión a partir de aquí: es la situación real del huésped, que
    // todavía no tiene cuenta. Si algo de esto necesitara una, el flujo
    // entero sería imposible.
    await salir();
  });

  it("se abre sin sesión y dice de qué reserva es", async () => {
    const detalle = await consultarPrecheckin(token, supabase);

    expect(detalle).not.toBeNull();
    expect(detalle!.unidad).toBe("102");
    // La web los nombra como la base --`fecha_desde`-- y la copia de la
    // aplicación los pasaba a camello. Otra divergencia que nadie veía.
    expect(detalle!.fecha_desde).toBe(isoEnDias(DIAS_A_LA_ENTRADA));
    expect(detalle!.fecha_hasta).toBe(isoEnDias(DIAS_A_LA_SALIDA));
    expect(detalle!.vigente).toBe(true);
    expect(detalle!.completado).toBe(false);
  });

  it("dice de quién es el enlace, por el nombre de pila", async () => {
    // Para que el huésped reconozca a quien le alquiló. El apellido y el
    // correo de la anfitriona no hacen falta para eso, así que no salen.
    const detalle = await consultarPrecheckin(token, supabase);

    // Sin tilde: así está el perfil en la base --«Sofia»--, aunque la app la
    // llame «Sofía Martínez» por todas partes. Es un dato de prueba mal
    // cargado, no un fallo de esta función; queda anotado en R-28.
    expect(detalle!.anfitrion).toBe("Sofia");
    expect(JSON.stringify(detalle)).not.toMatch(/@veciyo\.test/);
  });

  it("un token inventado no devuelve nada, ni un error que lo confirme", async () => {
    // Ni "no existe" ni "caducado": la misma respuesta vacía para los dos, o
    // el enlace se convierte en una forma de averiguar qué reservas hay.
    expect(await consultarPrecheckin("a".repeat(64), supabase)).toBeNull();
    expect(await consultarPrecheckin("", supabase)).toBeNull();
  });

  it("y sin el token no se puede leer la estancia por la puerta de al lado", async () => {
    /*
      El enlace no puede ser un atajo a la tabla. Sin sesión, `visita` está
      cerrada por RLS --sus cuatro políticas son de `authenticated`--, así que
      lo único que abre la puerta es la función `security definer`.
    */
    const { data } = await supabase
      .from("visita")
      .select("id")
      .eq("id", visitaId);

    expect(data ?? []).toHaveLength(0);
  });
});

describe("llenar la ficha desde el enlace", () => {
  let token = "";

  beforeAll(async () => {
    await entrarComo(ANFITRIONA);
    token = (await abrirPrecheckin(visitaId)).enlace.split("/access/")[1];
    await salir();
  });

  const ficha = {
    nombre: "Camila",
    apellidos: "Restrepo Ávila",
    tipoDocumento: "cedula_ciudadania" as const,
    documento: "1020304050",
    correo: "Camila.Restrepo@Ejemplo.test",
    telefono: "310 555 4433",
    direccion: "Calle 93 #11-27, Bogotá",
    motivo: "turismo" as const,
  };

  it("la escribe sin sesión, que es la situación real del huésped", async () => {
    const invitadoId = await guardarPrecheckin(token, ficha, supabase);
    expect(invitadoId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("y llamarla dos veces corrige, no duplica", async () => {
    /*
      El anfitrion pudo dejar la fila creada al reservar, y el huesped puede
      equivocarse y volver atras. Si cada envio creara una fila, la porteria
      veria tres Camilas y ninguna forma de saber cual vale.
    */
    const primero = await guardarPrecheckin(token, ficha, supabase);
    const segundo = await guardarPrecheckin(token, {
      ...ficha,
      documento: "1020304099",
    }, supabase);

    expect(segundo).toBe(primero);

    await entrarComo(ANFITRIONA);
    const { data } = await supabase
      .from("invitado")
      .select("nombre, apellidos, documento_numero, correo, telefono, motivo")
      .eq("visita_id", visitaId);
    await salir();

    expect(data).toHaveLength(1);
    expect(data![0].documento_numero).toBe("1020304099");
    expect(data![0].apellidos).toBe("Restrepo Ávila");
    // El correo se normaliza en la base, no en la pantalla: es la única de
    // las dos por la que pasan todos los caminos.
    expect(data![0].correo).toBe("camila.restrepo@ejemplo.test");
    expect(data![0].motivo).toBe("turismo");
  });

  it("no acepta una ficha sin documento ni con un correo que no lo es", async () => {
    await expect(
      guardarPrecheckin(token, { ...ficha, documento: "   " }, supabase),
    ).rejects.toThrow(/documento/i);
    await expect(
      guardarPrecheckin(token, { ...ficha, correo: "camila" }, supabase),
    ).rejects.toThrow(/correo/i);
  });

  it("y con un enlace inventado no escribe nada", async () => {
    // El control que importa: si esto pasara, cualquiera podria escribir en
    // la reserva de cualquiera sin siquiera tener cuenta.
    await expect(
      guardarPrecheckin("b".repeat(64), ficha, supabase),
    ).rejects.toThrow(/enlace/i);
  });

  it("los términos los acepta el huésped, y eso queda dicho", async () => {
    await guardarPrecheckin(token, ficha, supabase);
    await aceptarTerminosPrecheckin(token, supabase);

    await entrarComo(ANFITRIONA);
    const { data } = await supabase
      .from("invitado")
      .select("terminos_aceptados, terminos_aprobado_por")
      .eq("visita_id", visitaId)
      .single();
    await salir();

    expect(data!.terminos_aceptados).toBe(true);
    /*
      Vacio a proposito. Se rellena solo cuando el anfitrion los aprueba por
      excepcion --"asumiendo la responsabilidad legal", dice el KT--, y es lo
      unico que distingue "los acepto" de "se los aprobaron".
    */
    expect(data!.terminos_aprobado_por).toBeNull();
  });
});
