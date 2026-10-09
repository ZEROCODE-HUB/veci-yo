import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CLAVE, URL, enDias, entrarComo, salir, servicio, supabase } from "./cliente";
import { crearVisita } from "@/features/visitas/services/visitas.repo";
import { abrirPrecheckin } from "@/features/visitas/services/precheckin.repo";
import {
  abrirEnlaceAcompanante,
  adultosParaAcompanante,
  guardarAcompanante,
  guardarFicha,
  guardarMenorAcompanante,
  menoresACargo,
  quitarMenorAcompanante,
} from "../../../../veciyo-web/src/lib/precheckin";

/**
 * Recorrido: un acompañante trae a sus propios menores.
 *
 * Un menor **no tiene enlace propio** --no puede aceptar terminos, asi que no
 * se le emite-- de modo que alguien tiene que llenar su ficha, y hasta el
 * 09/10/2026 ese alguien solo podia ser el titular. Acababa tecleando el
 * documento de un hijo ajeno que no tiene, y declarando un parentesco que no
 * le consta.
 *
 * El cliente lo planteo con un ejemplo: «yo no soy el tutor del menor, estoy
 * rellenando el formulario, y mi amigo si lo es, y quiero que el llene el suyo
 * y el de su hijo». Y una decision suya, explicita: **el responsable lo elige
 * quien añade al menor**, no se fuerza a que sea el.
 *
 * Lo que se comprueba aqui son los limites, que es donde esto se puede torcer:
 * que el enlace de un acompañante no se convierta en el del titular, que no se
 * cuele un adulto por esta puerta, y que nadie toque los menores de otro.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const ANFITRIONA = "vecino@veciyo.test";

const MARCA = "[prueba] menores del acompanante";

let visitaId = "";
/** El enlace de la estancia, el del titular. */
let token = "";
/** El enlace propio del amigo, que es quien trae al niño. */
let tokenAmigo = "";
let amigoId = "";
let titularId = "";

beforeAll(async () => {
  await entrarComo(ANFITRIONA);
  visitaId = await crearVisita({
    condominioId: CONDOMINIO,
    unidadId: U102,
    tipo: "huesped_temporal",
    fechaDesde: enDias(5),
    fechaHasta: enDias(9),
    anotacionesIngreso: MARCA,
    /*
      Sin tope de reserva a proposito: el aforo de la 102 son cuatro, y lo que
      este archivo comprueba no es el cupo --eso tiene el suyo-- sino quien
      puede añadir a quien. Un tope de dos dejaria los casos de abajo chocando
      contra el limite por el motivo equivocado.
    */
    huespedesPrevistos: 4,
    invitados: [{ nombre: `${MARCA} titular` }],
  });

  const { enlace } = await abrirPrecheckin(visitaId);
  token = enlace.split("/access/")[1];
  await salir();

  await guardarFicha(
    token,
    {
      nombre: "Oscar",
      apellidos: "Prueba",
      tipoDocumento: "cedula_ciudadania",
      documento: "[prueba]-99887766",
      correo: "oscar.menores@veciyo.test",
    },
    supabase as never,
  );

  // El amigo, que el titular añade y que despues entra por su enlace.
  amigoId = await guardarAcompanante(
    token,
    {
      nombre: "Amigo",
      apellidos: "Delgado",
      tipoDocumento: "cedula_ciudadania",
      documento: "[prueba]-55443322",
      correo: "amigo.menores@veciyo.test",
    },
    supabase as never,
  );
  /*
    Devuelve **el token**, no una url: la direccion la compone la pantalla con
    su propio origen. Partirlo por `/access/acompanante/` daba `undefined`, y
    entonces supabase-js borra la clave al serializar --`JSON.stringify` tira
    los `undefined`-- asi que PostgREST respondia «no encuentro la funcion sin
    parametros». Parece caché de esquema y es un argumento que no llego.
  */
  tokenAmigo = await abrirEnlaceAcompanante(token, amigoId, supabase as never);

  const { data: filas } = await servicio
    .from("invitado")
    .select("id")
    .eq("visita_id", visitaId)
    .eq("es_titular", true);
  titularId = filas?.[0]?.id ?? "";
});

/**
 * Retira la visita y lo que la sujeta.
 *
 * `verificacion_antecedentes` apunta al invitado con RESTRICT, asi que una
 * visita cerrada deja de poderse borrar. Este archivo no cierra ninguna, pero
 * la limpieza se escribe igual: ya mordio dos veces por no hacerlo.
 */
afterAll(async () => {
  const { data: invitados } = await servicio
    .from("invitado")
    .select("id")
    .eq("visita_id", visitaId);
  const ids = (invitados ?? []).map((i) => i.id);
  if (ids.length > 0) {
    await servicio.from("verificacion_antecedentes").delete().in("invitado_id", ids);
    await servicio.from("reporte_legal").delete().in("invitado_id", ids);
  }
  const { error } = await servicio.from("visita").delete().eq("id", visitaId);
  if (error) {
    throw new Error(`No se pudo retirar la visita ${visitaId}: ${error.message}`);
  }
  await salir();
});

describe("el amigo trae a su hijo desde su propio enlace", () => {
  let hijoId = "";

  it("ve a los adultos de la reserva y sabe cuál es él", async () => {
    const adultos = await adultosParaAcompanante(tokenAmigo, supabase as never);

    const yo = adultos.find((a) => a.soy_yo);
    expect(yo?.id).toBe(amigoId);
    // Y ve al titular, que es a quien podria poner de responsable en su lugar.
    expect(adultos.map((a) => a.id)).toContain(titularId);
  });

  it("lo añade eligiéndose a sí mismo como responsable", async () => {
    hijoId = await guardarMenorAcompanante(
      tokenAmigo,
      {
        nombre: `${MARCA} Hijo`,
        apellidos: "Delgado",
        tipoDocumento: "registro_civil",
        documento: "[prueba]-RC1234",
        fechaNacimiento: "2018-04-10",
        responsableId: amigoId,
        parentesco: "padre",
      },
      supabase as never,
    );

    expect(hijoId).toBeTruthy();

    const { data: fila } = await servicio
      .from("invitado")
      .select("es_menor, responsable_id, parentesco, documento_numero")
      .eq("id", hijoId)
      .single();

    // Que es menor lo decide la base con la fecha, no quien lo manda.
    expect(fila?.es_menor).toBe(true);
    expect(fila?.responsable_id).toBe(amigoId);
    expect(fila?.parentesco).toBe("padre");
    // Y su documento se guarda: el ministerio lo pide por cada persona.
    expect(fila?.documento_numero).toBe("[prueba]-RC1234");
  });

  it("y lo ve en su lista", async () => {
    const mios = await menoresACargo(tokenAmigo, supabase as never);

    expect(mios.map((m) => m.id)).toContain(hijoId);
    // Todavia sin foto: eso es lo que la pantalla le va a pedir.
    expect(mios.find((m) => m.id === hijoId)?.tiene_documento).toBe(false);
  });

  it("un adulto no entra por esta puerta", async () => {
    /*
      Es la puerta de atras que hay que cerrar: un adulto tiene que llenar sus
      datos y **aceptar sus terminos**, y eso nadie lo puede hacer por el. Si
      se colara como «menor» con fecha de adulto, entraria sin aceptar nada.
    */
    await expect(
      guardarMenorAcompanante(
        tokenAmigo,
        {
          nombre: `${MARCA} Adulto`,
          fechaNacimiento: "1990-01-01",
          responsableId: amigoId,
          parentesco: "otro",
        },
        supabase as never,
      ),
    ).rejects.toThrow(/mayor de edad|adulto/i);
  });

  it("el responsable tiene que ser alguien de esta reserva", async () => {
    // Si no, un niño quedaria a cargo de alguien que no viene.
    await expect(
      guardarMenorAcompanante(
        tokenAmigo,
        {
          nombre: `${MARCA} Ajeno`,
          fechaNacimiento: "2019-06-01",
          responsableId: "00000000-0000-0000-0000-000000000000",
          parentesco: "padre",
        },
        supabase as never,
      ),
    ).rejects.toThrow(/adulto de esta reserva/i);
  });

  it("puede ponerle de responsable al titular, si es quien responde", async () => {
    /*
      **El responsable lo elige el**, decision del cliente del 09/10/2026: no
      se fuerza a que sea quien añade. Y al hacerlo el menor sale de su lista,
      porque quien responde por un niño es quien tiene que verlo.
    */
    const otroId = await guardarMenorAcompanante(
      tokenAmigo,
      {
        nombre: `${MARCA} Sobrina`,
        fechaNacimiento: "2017-02-20",
        responsableId: titularId,
        parentesco: "tutor_legal",
      },
      supabase as never,
    );

    const { data: fila } = await servicio
      .from("invitado")
      .select("responsable_id")
      .eq("id", otroId)
      .single();
    expect(fila?.responsable_id).toBe(titularId);

    const mios = await menoresACargo(tokenAmigo, supabase as never);
    expect(mios.map((m) => m.id)).not.toContain(otroId);
  });

  it("no puede quitar un menor que no está a su cargo", async () => {
    const { data: sobrina } = await servicio
      .from("invitado")
      .select("id")
      .eq("visita_id", visitaId)
      .eq("responsable_id", titularId)
      .eq("es_menor", true)
      .limit(1)
      .single();

    await expect(
      quitarMenorAcompanante(tokenAmigo, sobrina!.id, supabase as never),
    ).rejects.toThrow(/no esta a tu cargo|no está a tu cargo/i);
  });

  it("pero sí el suyo", async () => {
    // El control positivo del caso de arriba: sin el, rechazar **siempre**
    // pasaria igual de verde.
    await quitarMenorAcompanante(tokenAmigo, hijoId, supabase as never);

    const mios = await menoresACargo(tokenAmigo, supabase as never);
    expect(mios.map((m) => m.id)).not.toContain(hijoId);
  });

  it("su enlace no sirve para lo que es del titular", async () => {
    /*
      Lo que separa las dos credenciales. Las funciones del titular buscan el
      token en `visita`; el del acompañante vive en `invitado`, asi que no
      casa. Si algun dia se «arreglara» para aceptar los dos, el enlace de un
      acompañante pasaria a poder listar y quitar a todo el mundo.

      Se llama por HTTP y no por `supabase.rpc`: el cliente tipado no conoce
      estas funciones --no estan en el esquema generado, que solo trae las de
      la aplicacion-- y `as never` borra los argumentos, con lo que PostgREST
      responde «sin parametros» y el caso pasaria por el motivo equivocado.
    */
    const respuesta = await fetch(
      `${URL}/rest/v1/rpc/adultos_de_la_estancia`,
      {
        method: "POST",
        headers: { apikey: CLAVE, "Content-Type": "application/json" },
        body: JSON.stringify({ p_token: tokenAmigo }),
      },
    );
    const cuerpo = (await respuesta.json()) as { message?: string };

    expect(respuesta.ok).toBe(false);
    expect(cuerpo.message ?? "").toMatch(/no vale o ya vencio/i);
  });

  it("y el del titular sí, que es el control", async () => {
    // Sin esto, el caso de arriba pasaria igual si la funcion estuviera rota
    // y rechazara cualquier token.
    const respuesta = await fetch(
      `${URL}/rest/v1/rpc/adultos_de_la_estancia`,
      {
        method: "POST",
        headers: { apikey: CLAVE, "Content-Type": "application/json" },
        body: JSON.stringify({ p_token: token }),
      },
    );

    expect(respuesta.ok).toBe(true);
  });
});
