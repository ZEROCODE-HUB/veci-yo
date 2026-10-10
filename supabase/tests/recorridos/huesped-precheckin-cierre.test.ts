import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { enDias, entrarComo, isoEnDias, salir, servicio, supabase, ventanaDe } from "./cliente";
import { crearVisita } from "@/features/visitas/services/visitas.repo";
import {
  abrirPrecheckin,
  reemitirAccesoHuesped,
} from "@/features/visitas/services/precheckin.repo";
/*
  El flujo del huesped vive **una sola vez**, en la web: es ella quien lo
  ejecuta de verdad --sin cuenta, con el enlace que le llego-- y la copia
  que habia en este repositorio no la corria nadie en produccion. Lo que se
  prueba aqui es, ahora si, lo que el huesped recorre.
*/
import {
  aceptarReglamento,
  aceptarTerminos as aceptarTerminosPrecheckin,
  cerrarPrecheckin,
  guardarFicha as guardarPrecheckin,
} from "../../../../veciyo-web/src/lib/precheckin";
import { aceptarInvitacion } from "@/shared/services/invitaciones";

/** Sus fechas, lejos de las de los demas: ver `ventanaDe`. */
const V = ventanaDe("huesped-precheckin-cierre");

/**
 * Recorrido: de la reserva a la cuenta, sin que nadie toque la base a mano.
 *
 * Es el circulo que estaba abierto (R-26). Habia **dos** formas de ser huesped
 * temporal que no se conocian entre si: una membresia nacida de una invitacion
 * por correo, que daba acceso y no guardaba documento, y un invitado de una
 * visita, que guardaba documento y no daba acceso.
 *
 * En la 102 eso ya habia pasado de verdad: Carlos Rojas estaba reportado a la
 * autoridad y no tenia acceso, y Tomas tenia las llaves y no estaba reportado.
 *
 * Lo que se comprueba aqui es que ahora **es la misma persona**: que la cuenta
 * sale de la estancia, con sus fechas, y que al aceptarla queda apuntando al
 * invitado del que salio.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const ANFITRIONA = "vecino@veciyo.test";
/** Guillermo: dueno de OTRAS dos viviendas del mismo edificio. */
const AJENO = "propietario@veciyo.test";
/** Cuenta sin ninguna membresia; las pruebas la limpian en cada corrida. */
const HUESPED_NUEVO = "invitado.prueba@veciyo.test";

const MARCA = "[prueba] recorrido cierre de precheckin";

let visitaId = "";
let token = "";
/** El acceso que emite el cierre. Solo existe en claro esta vez. */
let tokenAcceso = "";
/*
  Las invitaciones se buscan por este id y no por el correo: esa cuenta de
  prueba arrastra 456 invitaciones de corridas viejas (R-7), asi que un
  `.eq("correo", ...)` devuelve 456 filas y `.single()` falla. `invitado_id`
  es lo unico que identifica a ESTA estancia.
*/
let titularId = "";

const ficha = {
  /*
    Marcado para que `limpieza-global` pueda barrerlo. `cerrar_precheckin` crea
    la invitacion con **el nombre de esta ficha**, y sin marca no la alcanzaba
    nadie: una por corrida, que es como se juntaron 456 en su dia.
  */
  nombre: "[prueba] Camila",
  apellidos: "Restrepo Ávila",
  tipoDocumento: "cedula_ciudadania" as const,
  documento: "1020304050",
  correo: HUESPED_NUEVO,
  telefono: "310 555 4433",
  direccion: "Calle 93 #11-27, Bogotá",
  motivo: "turismo" as const,
};

/**
 * Deja la cuenta de prueba como estaba.
 *
 * Se llama **antes y despues**. Antes, porque si arrastrara la membresia de la
 * corrida anterior `aceptar_invitacion` fallaria por duplicado y pareceria un
 * fallo del flujo. Y despues, porque `invitacion-de-huesped.test.ts` usa esta
 * misma cuenta: al dejarle una membresia puesta, esa prueba se ponia roja y el
 * fallo solo aparecia al correr la suite entera, nunca en el archivo solo.
 *
 * Es el mismo error que ya costo caro en este proyecto --una prueba que no
 * restaura lo que toca-- y se nota igual de tarde.
 */
async function limpiarHuesped() {
  const uid = await entrarComo(HUESPED_NUEVO);
  await salir();

  await entrarComo(ANFITRIONA);
  await supabase
    .from("membresia_unidad")
    .delete()
    .eq("usuario_id", uid)
    .eq("unidad_id", U102);
  await salir();
}

/** La estancia de la prueba: dentro de unos dias, y de cuatro noches. */
const DIAS_A_LA_ENTRADA = V + 4;
const DIAS_A_LA_SALIDA = V + 8;

beforeAll(async () => {
  await limpiarHuesped();

  await entrarComo(ANFITRIONA);
  visitaId = await crearVisita({
    condominioId: CONDOMINIO,
    unidadId: U102,
    tipo: "huesped_temporal",
    /*
      Relativas a hoy y no escritas a fuego. Eran «01/10/2026» y «05/10/2026»,
      que el 27/09/2026 estaban a cuatro dias: en cuanto el calendario las pasa,
      el disparador que impide crear una visita en el pasado las rechaza y este
      recorrido se cae en su `beforeAll`.
    */
    fechaDesde: enDias(DIAS_A_LA_ENTRADA),
    fechaHasta: enDias(DIAS_A_LA_SALIDA),
    anotacionesIngreso: MARCA,
    invitados: [{ nombre: `${MARCA} titular` }],
  });
  token = (await abrirPrecheckin(visitaId)).enlace.split("/access/")[1];
  await salir();
});

afterAll(async () => {
  /*
    La verificacion de antecedentes se retira antes, y con la escoba.

    `verificacion_antecedentes` apunta al invitado con RESTRICT, asi que desde
    que el cierre la dispara la visita **deja de poderse borrar**. La base
    tiene razon --una verificacion es constancia de un hecho y de un cobro, no
    desaparece porque alguien borre una reserva--; lo que estaba mal era esta
    limpieza, que no comprobaba su propio error y se iba dejando una visita
    por corrida. Cuando fui a mirar habia diez.

    Se usa `servicio` porque ninguna politica permite esa baja, que es
    exactamente el caso para el que existe: en `afterAll`, sobre filas que
    este recorrido creo, y por `id`.
  */
  const { data: invitados } = await servicio
    .from("invitado")
    .select("id")
    .eq("visita_id", visitaId);

  for (const invitado of invitados ?? []) {
    await servicio
      .from("verificacion_antecedentes")
      .delete()
      .eq("invitado_id", invitado.id);
  }

  await entrarComo(ANFITRIONA);
  const { error } = await supabase.from("visita").delete().eq("id", visitaId);
  await salir();
  // Se mira: una limpieza que no comprueba si limpio no es una limpieza.
  expect(error).toBeNull();

  await limpiarHuesped();
});

describe("cerrar el preregistro", () => {
  it("no se cierra sin documento ni sin términos", async () => {
    /*
      Los dos controles negativos van primero. Sin ellos, el caso de exito de
      abajo pasaria igual con la funcion vacia, y lo que se estaria emitiendo
      es una llave del edificio a nombre de nadie.
    */
    await expect(cerrarPrecheckin(token, supabase)).rejects.toThrow(/datos|documento/i);

    titularId = await guardarPrecheckin(token, ficha, supabase);
    await expect(cerrarPrecheckin(token, supabase)).rejects.toThrow(/t[eé]rminos/i);
  });

  it("y con la ficha completa emite el acceso del huésped", async () => {
    await aceptarTerminosPrecheckin(token, supabase);
    // Y las reglas del edificio, que el cierre exige desde el 09/10/2026.
    await aceptarReglamento(token, supabase);

    /*
      El dominio se pasa, no se adivina. Las dos copias de este módulo lo
      armaban distinto --la web con el del navegador, la de la aplicación con
      el configurado-- y nadie lo vio porque la segunda no la ejecutaba nadie.
      Fuera del navegador hay que decirlo, y eso es lo que lo cierra.
    */
    const enlace = await cerrarPrecheckin(token, supabase, "https://ejemplo");
    tokenAcceso = enlace.split("token=")[1];

    expect(enlace).toMatch(/^https:\/\/ejemplo\/invitacion\?token=[0-9a-f]{64}$/);
  });

  it("el acceso vence con la estancia, no a los siete días", async () => {
    /*
      Una invitacion normal dura una semana. Esta no puede: un acceso que
      sobrevive a la salida del huesped es una llave que se queda fuera. Y al
      reves, tampoco puede caducar antes de que termine la estadia.
    */
    await entrarComo(ANFITRIONA);
    const { data } = await supabase
      .from("invitacion")
      .select("rol_unidad, vigente_desde, vigente_hasta, expira_en, invitado_id")
      .eq("invitado_id", titularId)
      .single();
    await salir();

    expect(data!.rol_unidad).toBe("huesped_temporal");
    expect(data!.vigente_desde).toBe(isoEnDias(DIAS_A_LA_ENTRADA));
    expect(data!.vigente_hasta).toBe(isoEnDias(DIAS_A_LA_SALIDA));
    // La invitacion caduca el dia siguiente a la salida.
    expect(data!.expira_en.slice(0, 10)).toBe(isoEnDias(DIAS_A_LA_SALIDA + 1));
    // Y queda dicho de qué huésped salió, sin casar por correo.
    expect(data!.invitado_id).toBeTruthy();
  });

  it("cerrar dos veces no emite dos accesos", async () => {
    // Volver atrás en el navegador y pulsar otra vez es lo normal, no una
    // excepción. Dos invitaciones vivas serían dos llaves para una estancia.
    await expect(cerrarPrecheckin(token, supabase)).rejects.toThrow(/ya estaba cerrado/i);

    await entrarComo(ANFITRIONA);
    const { data } = await supabase
      .from("invitacion")
      .select("id")
      .eq("invitado_id", titularId);
    await salir();

    expect(data).toHaveLength(1);
  });

  it("la verificación de antecedentes corre sola, sin que nadie la pida", async () => {
    /*
      El KT: "corre automaticamente en este paso, sin intervencion del
      Anfitrion ni visibilidad para el huesped". Queda marcada como `simulado`
      porque no hay proveedor contratado, y eso vive en el dato y no en una
      bandera de configuracion que alguien pueda olvidar.
    */
    await entrarComo(ANFITRIONA);
    const { data } = await supabase
      .from("invitado")
      .select("id, precheckin_completado_en, verificacion:verificacion_antecedentes(resultado, proveedor)")
      .eq("visita_id", visitaId)
      .single();
    await salir();

    expect(data!.precheckin_completado_en).toBeTruthy();
    // PostgREST devuelve un objeto y no un array: la relacion es uno a uno.
    const verificacion = data!.verificacion as unknown as {
      resultado: string;
      proveedor: string;
    } | null;
    expect(verificacion).not.toBeNull();
    expect(verificacion!.resultado).toBe("aprobada");
    /*
      `simulado` porque no hay proveedor contratado, y eso vive en el dato y
      no en una bandera de configuracion que alguien pueda olvidar: una
      verificacion simulada no se confunde nunca con una de verdad.
    */
    expect(verificacion!.proveedor).toBe("simulado");
  });

  it("y si no hubiera podido correr, diría por qué", async () => {
    /*
      El aviso existe porque tragarse la excepcion en silencio ya escondio un
      fallo de verdad: `consumo_verificaciones` filtra por `auth.uid()`, en el
      precheckin no hay sesion, devolvia vacio y se leia como "esta vivienda
      no tiene suscripcion". El paso se quedaba en gris y nadie sabia por que.

      Aqui si corrio, asi que el aviso tiene que estar **vacio**. Si algun dia
      no corre, este campo es donde el anfitrion --el unico que puede comprar
      un paquete-- se entera de que hace falta.
    */
    await entrarComo(ANFITRIONA);
    const { data } = await supabase
      .from("visita")
      .select("precheckin_aviso")
      .eq("id", visitaId)
      .single();
    await salir();

    expect(data!.precheckin_aviso).toBeNull();
  });
});

describe("volver a mandar el acceso", () => {
  /*
    Lo encontro la demo del 25/09/2026. El acceso se ensena UNA vez al cerrar
    el preregistro --en la base solo vive su sha256-- y quien lo vio cerro la
    pantalla sin copiarlo. Ni el huesped podia entrar ni el anfitrion
    reenviarselo: hubo que emitirlo a mano contra la base.
  */
  it("no lo reenvía cualquiera", async () => {
    // Guillermo es dueno de OTRAS dos viviendas del mismo edificio.
    await entrarComo(AJENO);
    await expect(reemitirAccesoHuesped(visitaId)).rejects.toThrow(/permiso/i);
    await salir();
  });

  it("y el anfitrión sí, sobre la invitación que ya existe", async () => {
    await entrarComo(ANFITRIONA);
    const { enlace } = await reemitirAccesoHuesped(visitaId);
    expect(enlace).toMatch(/\/invitacion\?token=[0-9a-f]{64}$/);

    // Una sola invitación, no dos: dos llaves vivas para una estancia serían
    // dos formas de entrar, y cerrar una no cerraría la otra.
    const { data } = await supabase
      .from("invitacion")
      .select("id")
      .eq("invitado_id", titularId);
    await salir();
    expect(data).toHaveLength(1);

    tokenAcceso = enlace.split("token=")[1];
  });

  it("y el enlace viejo deja de valer", async () => {
    await entrarComo(ANFITRIONA);
    const viejo = tokenAcceso;
    const { enlace } = await reemitirAccesoHuesped(visitaId);
    await salir();

    const nuevo = enlace.split("token=")[1];
    expect(nuevo).not.toBe(viejo);

    await entrarComo(HUESPED_NUEVO);
    await expect(aceptarInvitacion(viejo)).rejects.toThrow();
    await salir();

    tokenAcceso = nuevo;
  });
});

describe("y la cuenta queda apuntando a la persona", () => {
  it("al aceptarlo, el invitado y el usuario son el mismo", async () => {
    /*
      Este es el punto entero de R-26. Antes la estancia y la cuenta eran dos
      filas sin ningun hilo entre ellas, asi que no habia forma de saber si
      quien tiene las llaves es quien esta reportado a la autoridad.
    */
    const uid = await entrarComo(HUESPED_NUEVO);
    const membresiaId = await aceptarInvitacion(tokenAcceso);
    expect(membresiaId).toBeTruthy();
    await salir();

    await entrarComo(ANFITRIONA);
    const { data } = await supabase
      .from("invitado")
      .select("usuario_id, nombre, documento_numero")
      .eq("visita_id", visitaId)
      .single();
    await salir();

    expect(data!.usuario_id).toBe(uid);
    expect(data!.documento_numero).toBe("1020304050");
  });

  it("y la estancia de la cuenta es la de la reserva", async () => {
    // No "un huesped hasta 2030": las fechas salen de la reserva, asi que el
    // acceso se apaga solo cuando el huesped se va.
    const uid = await entrarComo(HUESPED_NUEVO);
    await salir();

    await entrarComo(ANFITRIONA);
    const { data } = await supabase
      .from("membresia_unidad")
      .select("rol, vigente_desde, vigente_hasta, activo")
      .eq("usuario_id", uid)
      .eq("unidad_id", U102)
      .single();
    await salir();

    expect(data!.rol).toBe("huesped_temporal");
    expect(data!.vigente_desde).toBe(isoEnDias(DIAS_A_LA_ENTRADA));
    expect(data!.vigente_hasta).toBe(isoEnDias(DIAS_A_LA_SALIDA));
  });
});
