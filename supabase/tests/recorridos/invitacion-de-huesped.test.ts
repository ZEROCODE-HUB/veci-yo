import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, supabase } from "./cliente";
import { invitarAUnidad } from "@/features/propietario/services/invitacionesUnidad.repo";
import {
  aceptarInvitacion,
  consultarInvitacion,
} from "@/shared/services/invitaciones";

/**
 * Recorrido: el anfitrión invita a un huésped y el huésped entra.
 *
 * Es la puerta de todo el flujo de huésped temporal y cruza dos roles: la
 * invitación la emite el anfitrión, y quien la acepta es otra persona con otra
 * sesión. Entre las dos hay un token, que es lo único que viaja.
 *
 * El envío del correo **está apagado a propósito** mientras se prueba, así que
 * aquí el token se lee de la fila, que es lo que hace el cliente a mano cuando
 * recorre el flujo.
 *
 * Lo que fija: que la invitación nace con su vigencia, que se puede consultar
 * **sin sesión** --es lo que abre el enlace del correo--, que aceptarla crea
 * una membresía de verdad con las fechas de la invitación, y que no la acepta
 * cualquiera que tenga el token.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const ANFITRIONA = "vecino@veciyo.test"; // Sofía, de la 102
const INVITADO = "invitado.prueba@veciyo.test"; // sin ninguna membresía
const AJENO = "propietario@veciyo.test";
const ADMIN = "admin@veciyo.test";

/** Una fecha en el formato que guarda la base. */
function dia(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

const DESDE = dia(1);
const HASTA = dia(9);

let invitacionId = "";
let token = "";

beforeAll(async () => {
  // La cuenta del invitado tiene que empezar sin membresía en la 102, o
  // "ahora la tiene" no probaría nada. Se limpia lo que dejaran otras
  // corridas.
  await entrarComo(ADMIN);
  const { data: invitadoUser } = await supabase
    .from("perfil")
    .select("id")
    .eq("id", (await supabase.auth.getUser()).data.user!.id);
  void invitadoUser;
  await supabase
    .from("invitacion")
    .delete()
    .eq("correo", INVITADO)
    .eq("estado", "pendiente");
  await salir();

  await entrarComo(ANFITRIONA);
});

afterAll(async () => {
  await salir();
  await entrarComo(ADMIN);
  /*
    La invitación **no se borra, y no por descuido**: `invitacion` no tiene
    política de borrado, a propósito. Una invitación es un hecho que ocurrió
    --se revoca, no se elimina-- porque si no, no habría forma de saber a quién
    se invitó.

    Ojo con esto al limpiar: un `.delete()` sin política devuelve éxito y no
    borra nada. Se descubrió contando filas, no leyendo la respuesta.

    Las de prueba se acumulan, igual que las del resto de la suite, y se van en
    la purga previa a producción.
  */

  // La membresía sí se retira: la cuenta debe volver a quedarse sin ninguna,
  // que es justo para lo que existe.
  const { data: usuario } = await supabase
    .from("membresia_unidad")
    .select("id")
    .eq("unidad_id", U102)
    .eq("rol", "huesped_temporal")
    .eq("vigente_desde", DESDE);
  for (const fila of usuario ?? []) {
    await supabase.from("membresia_unidad").delete().eq("id", fila.id);
  }
  await salir();
});

describe("la invitación de un huésped", () => {
  it("el anfitrión la emite con su vigencia", async () => {
    /*
      Para un huésped temporal las fechas son obligatorias: la base lo exige,
      porque una estancia sin principio ni fin no caduca, y de la caducidad
      dependen el libro del alojamiento y las reservas.
    */
    const creada = await invitarAUnidad({
      condominioId: CONDOMINIO,
      unidadId: U102,
      rol: "huesped_temporal",
      nombre: "[prueba] invitado del recorrido",
      correo: INVITADO,
      vigenteDesde: DESDE,
      vigenteHasta: HASTA,
    });
    invitacionId = creada.invitacionId;
    expect(invitacionId).toBeTruthy();

    /*
      El token en claro **solo existe en este momento**: la tabla guarda
      `token_hash` y nada mas. Se devuelve una vez, para el correo, y no se
      puede volver a leer ni siendo el anfitrion. Eso es lo correcto --un
      token recuperable seria una contraseña guardada en claro-- y por eso el
      recorrido lo captura aqui.

      Como el envio de correo esta apagado, `enlace` trae el token; con el
      correo encendido vendria `null` y habria que leerlo de la bandeja.
    */
    expect(creada.correoEnviado).toBe(false);
    token = new URL(creada.enlace!).searchParams.get("token")!;
    expect(token).toBeTruthy();

    const { data } = await supabase
      .from("invitacion")
      .select("estado, vigente_desde, vigente_hasta, correo")
      .eq("id", invitacionId)
      .single();
    expect(data!.estado).toBe("pendiente");
    expect(data!.vigente_desde).toBe(DESDE);
    expect(data!.vigente_hasta).toBe(HASTA);
  });

  it("sin fechas, una invitación de huésped no se emite", async () => {
    // El control que hace comprobable lo de arriba.
    await expect(
      invitarAUnidad({
        condominioId: CONDOMINIO,
        unidadId: U102,
        rol: "huesped_temporal",
        nombre: "[prueba] sin fechas",
        correo: "otro.invitado@veciyo.test",
      }),
    ).rejects.toThrow();
  });

  it("se puede consultar sin sesión: es lo que abre el enlace", async () => {
    /*
      Quien recibe el correo todavía no tiene cuenta. Si consultar exigiera
      sesión, el enlace no serviría para nada.
    */
    await salir();
    const detalle = await consultarInvitacion(token);
    expect(detalle).not.toBeNull();
    expect(detalle!.correo).toBe(INVITADO);
    expect(detalle!.vigente).toBe(true);
    // Y no filtra más de la cuenta: dice la vivienda, no quién vive en ella.
    expect(detalle!.unidad).toBeTruthy();
  });

  it("no la acepta alguien con otro correo, aunque tenga el token", async () => {
    /*
      El token viaja por correo y puede acabar en cualquier parte. Lo que ata
      la invitación a su destinatario es el correo de la sesión, no el token.
    */
    await entrarComo(AJENO);
    await expect(aceptarInvitacion(token)).rejects.toThrow();
    await salir();
  });

  it("el invitado la acepta y queda con membresía vigente", async () => {
    await entrarComo(INVITADO);
    // Devuelve el id de la **membresía** que acaba de crear, no el de la
    // unidad: es la fila nueva, que es lo que tiene sentido devolver.
    const membresiaId = await aceptarInvitacion(token);
    expect(membresiaId).toBeTruthy();

    const { data: sesion } = await supabase.auth.getUser();
    const { data } = await supabase
      .from("membresia_unidad")
      .select("rol, activo, vigente_desde, vigente_hasta")
      .eq("unidad_id", U102)
      .eq("usuario_id", sesion.user!.id)
      .single();

    expect(data!.rol).toBe("huesped_temporal");
    expect(data!.activo).toBe(true);
    // Las fechas son las de la invitación, no las de hoy: la estancia la fijó
    // el anfitrión al invitar.
    expect(data!.vigente_desde).toBe(DESDE);
    expect(data!.vigente_hasta).toBe(HASTA);
  });

  it("y la invitación queda aceptada, no borrada", async () => {
    /*
      Se lee como administración: el invitado **no ve la invitación** una vez
      aceptada --la política la enseña a quien invitó y a la administración--,
      y leerla con su sesión devolvería `null`, que se confundiría con "no
      existe".
    */
    await salir();
    await entrarComo(ADMIN);
    const { data } = await supabase
      .from("invitacion")
      .select("estado")
      .eq("id", invitacionId)
      .single();
    expect(data!.estado).toBe("aceptada");
    await salir();
  });

  it("no se acepta dos veces", async () => {
    await entrarComo(INVITADO);
    await expect(aceptarInvitacion(token)).rejects.toThrow();
    await salir();
  });
});
