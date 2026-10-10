import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { enDias, entrarComo, salir, servicio, supabase, ventanaDe } from "./cliente";
import { crearVisita } from "@/features/visitas/services/visitas.repo";
import { abrirPrecheckin } from "@/features/visitas/services/precheckin.repo";
import {
  aceptarReglamento,
  aceptarTerminos,
  guardarAcompanante,
  guardarFicha,
} from "../../../../veciyo-web/src/lib/precheckin";

/** Sus fechas, lejos de las de los demas: ver `ventanaDe`. */
const V = ventanaDe("cada-acompanante-acepta-lo-suyo");

/**
 * Recorrido: cada acompañante adulto acepta **sus propios** términos.
 *
 * Hasta el 03/10/2026 los aceptaba el titular por todos, sin saberlo: la
 * función hacía `update ... where visita_id = X and es_titular`, así que marcaba
 * una sola fila. Y `cerrar_precheckin` comprobaba solo al titular, de modo que
 * un preregistro se cerraba con cuatro acompañantes que no habían aceptado nada
 * y cuyos datos había tecleado otra persona.
 *
 * Aceptar unas condiciones en nombre de otro adulto no vale. El titular puede
 * llenarle los datos —eso se mantiene, lo pidió el cliente— pero los términos
 * no.
 *
 * Los menores quedan fuera: no se les pide documento ni aceptación. Por ellos
 * responde quien les acompaña.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const ANFITRIONA = "vecino@veciyo.test";

const MARCA = "[prueba] acompanantes y terminos";

let visitaId = "";
let token = "";

/** Llama a una función del flujo del huésped sin sesión, por su token. */
async function rpc(nombre: string, argumentos: Record<string, unknown>) {
  return supabase.rpc(nombre as never, argumentos as never);
}

beforeAll(async () => {
  await entrarComo(ANFITRIONA);
  visitaId = await crearVisita({
    condominioId: CONDOMINIO,
    unidadId: U102,
    tipo: "huesped_temporal",
    fechaDesde: enDias(V + 5),
    fechaHasta: enDias(V + 9),
    anotacionesIngreso: MARCA,
    invitados: [{ nombre: `${MARCA} titular` }],
  });

  const { enlace } = await abrirPrecheckin(visitaId);
  token = enlace.split("/access/")[1];
  await salir();

  // El titular llena lo suyo y acepta.
  await guardarFicha(
    token,
    {
      nombre: "Camila",
      apellidos: "Rojas",
      tipoDocumento: "cedula_ciudadania",
      documento: "[prueba]-11223344",
      correo: "camila.acomp@veciyo.test",
    },
    supabase as never,
  );
  await aceptarTerminos(token, supabase as never);
  // Y las reglas del edificio, que el cierre exige desde el 09/10/2026.
  await aceptarReglamento(token, supabase as never);
});

/**
 * Retira una visita y lo que la sujeta.
 *
 * `verificacion_antecedentes` apunta al invitado con **RESTRICT** --es
 * constancia de un hecho y de un cobro-- y `cerrar_precheckin` la dispara. O
 * sea que **desde que una reserva se cierra, deja de poderse borrar**, y este
 * archivo cierra dos. Ya esta documentado en AGENTS.md y aun asi volvio a
 * morder: una limpieza que no comprueba su propio error no es una limpieza.
 */
async function retirar(id: string) {
  const { data: invitados } = await servicio
    .from("invitado")
    .select("id")
    .eq("visita_id", id);

  const ids = (invitados ?? []).map((i) => i.id);
  if (ids.length > 0) {
    await servicio.from("verificacion_antecedentes").delete().in("invitado_id", ids);
    await servicio.from("reporte_legal").delete().in("invitado_id", ids);
  }
  // La invitacion que emite el cierre tambien cuelga de la visita.
  await servicio.from("invitacion").delete().eq("unidad_id", U102).eq("rol_unidad", "huesped_temporal").in("invitado_id", ids);

  const { error } = await servicio.from("visita").delete().eq("id", id);
  if (error) throw new Error(`No se pudo retirar la visita ${id}: ${error.message}`);
}

afterAll(async () => {
  await retirar(visitaId);
  await salir();
});

describe("el titular llena los datos de otro adulto", () => {
  let acompananteId = "";

  it("puede hacerlo: eso no cambia", async () => {
    /*
      El cliente lo pidió explícitamente —«el inquilino líder llena de todos, o
      delega»— así que esto se conserva. Lo que no puede hacer por otro es
      aceptar.
    */
    const id = await guardarAcompanante(
      token,
      {
        nombre: "Bruno",
        apellidos: "Salas",
        tipoDocumento: "pasaporte",
        documento: "[prueba]-XP5566",
        correo: "bruno.acomp@veciyo.test",
        esMenor: false,
      },
      supabase as never,
    );
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    acompananteId = id;
  });

  it("pero el preregistro NO se cierra: Bruno no ha aceptado nada", async () => {
    /*
      Este es el caso que antes pasaba en silencio. Y el mensaje tiene que
      **nombrar** a quien falta: con cuatro acompañantes, un «falta alguien»
      obliga al titular a adivinar a quién llamar.
    */
    const { error } = await rpc("cerrar_precheckin", { p_token: token });

    expect(error).not.toBeNull();
    expect(error!.message).toContain("Bruno");
    expect(error!.message).toContain("terminos");
  });

  it("y nadie puede aceptar por él: hace falta su propio enlace", async () => {
    /*
      El enlace del titular acepta los términos del titular. Si sirviera para
      los demás, la firma de cada adulto valdría lo mismo que un clic ajeno.
    */
    await aceptarTerminos(token, supabase as never);
    // Y las reglas del edificio, que el cierre exige desde el 09/10/2026.
    await aceptarReglamento(token, supabase as never);

    const { data } = await servicio
      .from("invitado")
      .select("terminos_aceptados")
      .eq("id", acompananteId)
      .single();
    expect(data!.terminos_aceptados).toBe(false);
  });

  it("con su enlace, él sí acepta, y queda con fecha", async () => {
    const { data: emitido, error: errorEnlace } = await rpc(
      "abrir_precheckin_acompanante",
      { p_token: token, p_acompanante_id: acompananteId },
    );
    expect(errorEnlace).toBeNull();

    const suyo = emitido as unknown as string;
    expect(suyo).toMatch(/^[0-9a-f]{64}$/);

    const { error } = await rpc("aceptar_terminos_acompanante", { p_token: suyo });
    await aceptarReglamento(suyo, supabase as never);
    expect(error).toBeNull();

    const { data } = await servicio
      .from("invitado")
      .select("terminos_aceptados, terminos_aceptados_en, auto_registro")
      .eq("id", acompananteId)
      .single();

    expect(data!.terminos_aceptados).toBe(true);
    /*
      Con fecha. Un «acepto» con valor legal sin sello temporal no sirve de
      constancia el día que alguien pregunte cuándo fue.
    */
    expect(data!.terminos_aceptados_en).not.toBeNull();
    expect(data!.auto_registro).toBe(true);
  });

  it("y ahora sí se cierra", async () => {
    const { data, error } = await rpc("cerrar_precheckin", { p_token: token });
    expect(error).toBeNull();
    // Devuelve el acceso del titular a la aplicación, una sola vez.
    expect(data as unknown as string).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("el enlace de un acompañante", () => {
  it("no sirve para emitir el de alguien de otra reserva", async () => {
    /*
      Sin esta comprobación, quien tuviera un enlace válido podría emitir
      credenciales sobre invitados de cualquier otra estancia pasando un uuid.
    */
    const { data: ajeno } = await servicio
      .from("invitado")
      .select("id")
      .neq("visita_id", visitaId)
      .limit(1)
      .single();

    const { error } = await rpc("abrir_precheckin_acompanante", {
      p_token: token,
      p_acompanante_id: ajeno!.id,
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain("no esta en esta reserva");
  });

  it("y uno inventado no abre la ficha de nadie", async () => {
    const { data } = await rpc("consultar_precheckin_acompanante", {
      p_token: "no-soy-un-token",
    });
    expect(data).toEqual([]);
  });
});

describe("un menor", () => {
  it("no impide cerrar aunque no acepte nada", async () => {
    /*
      A un menor no se le pide documento propio ni se le hace aceptar términos:
      por él responde quien le acompaña. Si contara como adulto, ninguna familia
      podría terminar su preregistro.

      Se monta sobre una reserva nueva porque la anterior ya está cerrada.
    */
    await entrarComo(ANFITRIONA);
    const otra = await crearVisita({
      condominioId: CONDOMINIO,
      unidadId: U102,
      tipo: "huesped_temporal",
      fechaDesde: enDias(V + 12),
      fechaHasta: enDias(V + 15),
      anotacionesIngreso: MARCA,
      invitados: [{ nombre: `${MARCA} madre` }],
    });
    const { enlace } = await abrirPrecheckin(otra);
    const suToken = enlace.split("/access/")[1];
    await salir();

    await guardarFicha(
      suToken,
      {
        nombre: "Marcela",
        apellidos: "Sierra",
        tipoDocumento: "cedula_ciudadania",
        documento: "[prueba]-99887766",
        correo: "marcela.menor@veciyo.test",
      },
      supabase as never,
    );
    await aceptarTerminos(suToken, supabase as never);
    // Y las reglas del edificio, que el cierre exige desde el 09/10/2026.
    await aceptarReglamento(suToken, supabase as never);

    /*
      Con su madre puesta como responsable. Desde el 03/10/2026 un menor
      **tampoco** pasa sin que alguien responda por el --lo pidio el cliente--
      asi que este caso dejo de poder montarse sin eso, y se puso rojo. No
      estaba mal: documentaba lo que habia.

      Lo que sigue comprobando es lo suyo: que a un menor **no se le exigen
      terminos ni documento**. Si contara como adulto, ninguna familia podria
      terminar su preregistro.
    */
    const { data: titular } = await servicio
      .from("invitado")
      .select("id")
      .eq("visita_id", otra)
      .eq("es_titular", true)
      .single();

    await guardarAcompanante(
      suToken,
      {
        nombre: "Hijo",
        apellidos: "Sierra",
        esMenor: true,
        responsableId: titular!.id,
        parentesco: "madre",
      },
      supabase as never,
    );

    const { error } = await rpc("cerrar_precheckin", { p_token: suToken });
    expect(error).toBeNull();

    await retirar(otra);
  });
});
