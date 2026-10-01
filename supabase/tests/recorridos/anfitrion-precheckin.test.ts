import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, supabase } from "./cliente";
import {
  aceptarTerminosHuesped,
  comprarPaqueteVerificaciones,
  crearVisita,
  obtenerVisitas,
  reportarTraSire,
  verificarAntecedentes,
} from "@/features/visitas/services/visitas.repo";

/**
 * Recorrido: el precheckin visto desde el anfitrión.
 *
 * Es el flujo 4.2 del KT y la prioridad que marcó el cliente. Tres de sus
 * piezas tenían su tabla hecha y **nadie que la escribiera**: aceptar los
 * T&C con la excepción que el anfitrión puede marcar "asumiendo la
 * responsabilidad legal", la verificación de antecedentes, y la compra de un
 * paquete cuando se acaban las que trae la suscripción.
 *
 * Lo que añade este recorrido sobre las pruebas de política que ya existen:
 * recorre las funciones de la pantalla y comprueba **el mapeo de vuelta**. Ahí
 * hubo un defecto propio: `terminos_aprobado_por` es un `uuid`, y la pantalla
 * lo comparaba con el texto `"anfitrion"`, así que el distintivo de "aprobado
 * manualmente" no aparecía nunca.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const ANFITRIONA = "vecino@veciyo.test"; // Sofía, de la 102
const HUESPED = "nuevo.inquilino@veciyo.test";
const AJENO = "propietario@veciyo.test";
const ADMIN = "admin@veciyo.test";

const MARCA = "[prueba] recorrido precheckin";

let visitaId = "";
let invitadoId = "";

/** Lo que `consumo_verificaciones` dice ahora mismo de esta vivienda. */
async function consumo() {
  const { data } = await supabase.rpc("consumo_verificaciones", {
    p_unidad_id: U102,
  });
  return Array.isArray(data) ? data[0] : data;
}

beforeAll(async () => {
  await entrarComo(ANFITRIONA);
  visitaId = await crearVisita({
    condominioId: CONDOMINIO,
    unidadId: U102,
    // `crearVisita` recibe el valor de la base, no el de la pantalla: la
    // traduccion la hace `tipoHaciaBase` antes de llamarla.
    tipo: "huesped_temporal",
    profesion: MARCA,
    invitados: [{ nombre: "[prueba] huésped del precheckin" }],
  });
  const { data } = await supabase
    .from("invitado")
    .select("id")
    .eq("visita_id", visitaId)
    .single();
  invitadoId = data!.id;
});

afterAll(async () => {
  await salir();
  await entrarComo(ADMIN);
  if (invitadoId) {
    // Las verificaciones y los reportes retienen al invitado: se quitan antes.
    await supabase
      .from("verificacion_antecedentes")
      .delete()
      .eq("invitado_id", invitadoId);
    await supabase.from("reporte_tra").delete().eq("invitado_id", invitadoId);
  }
  await supabase
    .from("paquete_verificaciones")
    .delete()
    .eq("unidad_id", U102)
    .like("referencia", "%prueba%");
  if (visitaId) await supabase.from("visita").delete().eq("id", visitaId);
  await salir();
});

describe("el anfitrión recorre el precheckin", () => {
  it("marca la excepción de los T&C, y queda escrito quién la asumió", async () => {
    /*
      KT, flujo 4.2 paso 4: si el huésped no puede aceptar los términos
      --analfabetismo, discapacidad, sin lista cerrada de causales-- el
      anfitrión marca una excepción "asumiendo la responsabilidad legal". Por
      eso la columna guarda **quién**: sin eso, la excepción no tendría dueño.
    */
    await aceptarTerminosHuesped({ invitadoUuid: invitadoId, porExcepcion: true });

    const { data } = await supabase
      .from("invitado")
      .select("terminos_aceptados, terminos_excepcion, terminos_aprobado_por")
      .eq("id", invitadoId)
      .single();

    expect(data!.terminos_aceptados).toBe(true);
    expect(data!.terminos_excepcion).toBe(true);
    const { data: sesion } = await supabase.auth.getUser();
    expect(data!.terminos_aprobado_por).toBe(sesion.user!.id);
  });

  it("y la pantalla lo ve como aprobado por el anfitrión", async () => {
    /*
      El mapeo de vuelta, que es lo que fallaba: la columna es un `uuid` y la
      pantalla lo comparaba con el texto "anfitrion", así que el distintivo de
      "aprobado manualmente" no salía nunca. El repositorio traduce.
    */
    const visitas = await obtenerVisitas({ ambito: "unidad", unidadIds: [U102] });
    const invitado = visitas.find((v) => v.uuid === visitaId)!.invitados[0];
    expect(invitado.terminosExcepcion).toBe(true);
    expect(invitado.timeline?.terminosAprobadoPor).toBe("anfitrion");
  });

  it("y su lista es la de su vivienda, no la del edificio", async () => {
    /*
      El control que faltaba, y por el que este defecto vivio hasta que alguien
      recorrio la pantalla.

      `obtenerVisitas` no pedia ambito: traia **todo lo que RLS permitiera**. Para
      Sofia eso es solo su vivienda, asi que su recorrido pasaba igual. Pero
      Marcela administra el condominio y ademas es propietaria de la 301: al
      entrar como propietaria veia las visitas de las demas viviendas, y en la
      lista de la 301 aparecia una de la 205.

      Es la regla 8: la politica no filtra por rol activo porque no lo conoce. El
      caso positivo --«veo las mias»-- pasa igual con la consulta abierta de par
      en par; hace falta pedir explicitamente otra vivienda y comprobar que no
      viene.
    */
    const deLaVivienda = await obtenerVisitas({
      ambito: "unidad",
      unidadIds: [U102],
    });
    expect(deLaVivienda.length).toBeGreaterThan(0);
    expect(deLaVivienda.every((v) => v.depto === "102")).toBe(true);

    /*
      Y RLS sigue siendo el techo: Sofia puede pedir el edificio entero y no le
      llega nada ajeno, porque no administra el condominio. El ambito es lo que
      la aplicacion **pide**; la politica es lo que se **puede**.

      El contraste de verdad --ver mas de lo que toca-- solo se da en quien tiene
      los dos roles, y eso lo comprueba el recorrido de administracion.
    */
    const pidiendoElEdificio = await obtenerVisitas({
      ambito: "condominio",
      unidadIds: [],
    });
    expect(pidiendoElEdificio.every((v) => v.depto === "102")).toBe(true);
  });

  it("pide la verificación de antecedentes y el saldo baja en uno", async () => {
    const antes = await consumo();
    await verificarAntecedentes({ invitadoUuid: invitadoId });
    const despues = await consumo();
    expect(despues.suscritas_usadas).toBe(antes.suscritas_usadas + 1);
  });

  it("y queda marcada como simulada mientras no haya proveedor", async () => {
    /*
      R-68 sigue abierto --no se cerró qué proveedor de verificación se usa--.
      Que una verificación hecha sin proveedor **nunca** se confunda con una
      real no es una bandera de configuración que alguien pueda olvidar: es el
      dato de la fila.
    */
    const { data } = await supabase
      .from("verificacion_antecedentes")
      .select("proveedor, origen")
      .eq("invitado_id", invitadoId)
      .single();
    expect(data!.proveedor).toBe("simulado");
    expect(data!.origen).toBe("paquete_base");
  });

  it("no se repite sobre el mismo huésped", async () => {
    await expect(
      verificarAntecedentes({ invitadoUuid: invitadoId }),
    ).rejects.toThrow();
  });

  it("compra un paquete cuando se le acaban, con su importe y su moneda", async () => {
    const antes = await consumo();
    await comprarPaqueteVerificaciones({
      unidadId: U102,
      cantidad: 5,
      referencia: "[prueba] recorrido",
    });
    const despues = await consumo();
    expect(despues.suplementarias).toBe(antes.suplementarias + 5);

    const { data } = await supabase
      .from("paquete_verificaciones")
      .select("cantidad, monto, moneda, referencia")
      .eq("unidad_id", U102)
      .eq("referencia", "[prueba] recorrido")
      .single();
    expect(data!.cantidad).toBe(5);
    // Dinero con su moneda (regla 5): un importe sin moneda no dice nada.
    expect(Number(data!.monto)).toBeGreaterThan(0);
    expect(String(data!.moneda).trim()).toBeTruthy();
    /*
      Y la referencia se guarda. `p_referencia` se aceptaba desde que se
      escribio la funcion y **se tiraba**: la tabla no tenia la columna. El
      cobro ocurre fuera de la aplicacion, asi que esto es lo unico que permite
      casar la fila con el pago que la origino.
    */
    expect(data!.referencia).toBe("[prueba] recorrido");
  });

  it("no reporta el TRA de entrada antes de que el huésped haya entrado", async () => {
    /*
      KT: el TRA "solo puede reportarse una vez confirmado el ingreso real del
      huesped (no antes de la reserva)". Es un registro ante una autoridad
      diciendo que alguien se alojo; hacerlo antes seria declarar algo que no
      ha pasado. La base lo impide, y este caso lo fija.
    */
    await expect(
      reportarTraSire({ invitadoUuid: invitadoId, movimiento: "entrada" }),
    ).rejects.toThrow();
  });

  it("reporta el TRA de entrada y el de salida cuando portería confirma el paso", async () => {
    // Lo que hace la porteria: marcar la llegada y, despues, la salida.
    await supabase
      .from("invitado")
      .update({ llego: true, ingreso_en: new Date().toISOString() })
      .eq("id", invitadoId);
    await reportarTraSire({ invitadoUuid: invitadoId, movimiento: "entrada" });

    await supabase
      .from("invitado")
      .update({ salida_en: new Date().toISOString() })
      .eq("id", invitadoId);
    await reportarTraSire({ invitadoUuid: invitadoId, movimiento: "salida" });

    const { data } = await supabase
      .from("reporte_tra")
      .select("movimiento, rnt")
      .eq("invitado_id", invitadoId)
      .order("movimiento");
    expect(data!.map((r) => r.movimiento).sort()).toEqual([
      "entrada",
      "salida",
    ]);
    // El RNT lo pone la base desde el registro vigente: quien reporta no lo
    // teclea, y así no puede referenciar uno que no es.
    expect(data![0].rnt).toBeTruthy();
  });

  it("y nada de esto lo hace el dueño de otra vivienda", async () => {
    await salir();
    await entrarComo(AJENO);
    await expect(
      aceptarTerminosHuesped({ invitadoUuid: invitadoId, porExcepcion: true }),
    ).rejects.toThrow();
    await expect(
      comprarPaqueteVerificaciones({ unidadId: U102, cantidad: 5 }),
    ).rejects.toThrow();
    await salir();
    await entrarComo(ANFITRIONA);
  });

  it("ni el propio huésped se concede la excepción", async () => {
    // La excepción es del anfitrión porque es quien responde por ella.
    await salir();
    await entrarComo(HUESPED);
    await expect(
      aceptarTerminosHuesped({ invitadoUuid: invitadoId, porExcepcion: true }),
    ).rejects.toThrow();
    await salir();
    await entrarComo(ANFITRIONA);
  });
});
