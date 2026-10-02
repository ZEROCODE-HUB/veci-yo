import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, supabase } from "./cliente";
import {
  crearVisita,
  marcarLlegadaInvitado,
  obtenerVisitas,
  registrarHoraInvitado,
  verificarDocumentoInvitado,
} from "@/features/visitas/services/visitas.repo";
import { obtenerVerificacionDeDocumento } from "@/features/administrador/services/condominio.repo";

/**
 * Recorrido: lo que hace la portería en la puerta.
 *
 * Verificar el documento de quien entra y darle un cupo de visita. Son las dos
 * acciones que quedan del bloque de portería.
 *
 * El cupo tiene una segunda mitad que nadie hacía: **soltarlo**. Asignar
 * escribe en `asignacion_estacionamiento`, pero ninguna pantalla libera, y
 * `liberarEstacionamiento` estaba escrita sin que la llamara nadie. Un cupo
 * asignado se quedaba ocupado para siempre: al décimo visitante, el condominio
 * se queda sin estacionamientos aunque no haya nadie dentro.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const GUARDIA = "guardia@veciyo.test";
const ANFITRIONA = "vecino@veciyo.test";
const ADMIN = "admin@veciyo.test";

const MARCA = "[prueba] recorrido puerta";

let visitaId = "";
let invitadoId = "";
let cupoId = "";

/** Si el cupo está ocupado ahora mismo, y por quién. */
async function ocupacionDelCupo() {
  const { data } = await supabase
    .from("asignacion_estacionamiento")
    .select("visita_id, liberado_en")
    .eq("estacionamiento_id", cupoId)
    .is("liberado_en", null);
  return data ?? [];
}

beforeAll(async () => {
  await entrarComo(ANFITRIONA);
  visitaId = await crearVisita({
    condominioId: CONDOMINIO,
    unidadId: U102,
    tipo: "amigos",
    profesion: MARCA,
    instruccionDocumento: "verificar",
    invitados: [{ nombre: "[prueba] en la puerta", documentoNumero: "13718465" }],
  });
  const { data } = await supabase
    .from("invitado")
    .select("id")
    .eq("visita_id", visitaId)
    .single();
  invitadoId = data!.id;

  await salir();
  await entrarComo(GUARDIA);

  /*
    El condominio de prueba tiene **un** estacionamiento de visita, y lo ocupa
    una reserva que el cliente dejo a medias probando a mano. El recorrido se
    trae el suyo en vez de disputarselo: asi no depende de lo que haya ni
    estropea lo que otro estaba mirando.
  */
  await salir();
  await entrarComo(ADMIN);
  /*
    El codigo lleva la hora: `(condominio_id, codigo)` es unico, asi que un
    cupo que sobreviviera a una corrida interrumpida haria fallar **todas** las
    siguientes en el `beforeAll`, y el sintoma --"no se pudo leer el id"-- no
    se parece en nada a la causa. Paso: una corrida quedo a medias y dejo
    nueve archivos en rojo hasta que aparecio la fila huerfana.
  */
  const { data: creado, error: errorCupo } = await supabase
    .from("estacionamiento")
    .insert({
      condominio_id: CONDOMINIO,
      codigo: `[prueba] V-REC ${Date.now()}`,
      tipo: "visitante",
      ubicacion: "[prueba] recorrido",
    })
    .select("id")
    .single();
  if (errorCupo) throw errorCupo;
  cupoId = creado!.id;
  await salir();
  await entrarComo(GUARDIA);
});

afterAll(async () => {
  await salir();
  await entrarComo(ADMIN);
  if (cupoId) {
    await supabase
      .from("asignacion_estacionamiento")
      .delete()
      .eq("visita_id", visitaId);
  }
  if (invitadoId) {
    await supabase
      .from("verificacion_documento")
      .delete()
      .eq("invitado_id", invitadoId);
  }
  if (visitaId) await supabase.from("visita").delete().eq("id", visitaId);
  if (cupoId) await supabase.from("estacionamiento").delete().eq("id", cupoId);
  await salir();
});

describe("la portería en la puerta", () => {
  it("verifica el documento, y queda quién lo verificó", async () => {
    await verificarDocumentoInvitado(invitadoId, true);

    const { data } = await supabase
      .from("verificacion_documento")
      .select("estado, verificado_por, verificado_en")
      .eq("invitado_id", invitadoId)
      .single();

    expect(data!.estado).toBe("verificado");
    // Quién verificó es una FK real, no un nombre tecleado (regla 2): es lo
    // que permite auditar quién dejó entrar a alguien.
    const { data: sesion } = await supabase.auth.getUser();
    expect(data!.verificado_por).toBe(sesion.user!.id);
    expect(data!.verificado_en).not.toBeNull();
  });

  it("y la pantalla lo ve verificado", async () => {
    const visitas = await obtenerVisitas({ ambito: "condominio", unidadIds: [] });
    const invitado = visitas.find((v) => v.uuid === visitaId)!.invitados[0];
    expect(invitado.ciVerificado).toBe(true);
  });

  it("asigna un cupo de visita y queda ocupado", async () => {
    await supabase.from("asignacion_estacionamiento").insert({
      estacionamiento_id: cupoId,
      visita_id: visitaId,
    });
    const ocupado = await ocupacionDelCupo();
    expect(ocupado).toHaveLength(1);
    expect(ocupado[0].visita_id).toBe(visitaId);
  });

  it("y al terminar la visita el cupo se suelta", async () => {
    /*
      La mitad que faltaba. Un cupo de visita se presta mientras dura la
      visita; si nadie lo suelta, al décimo visitante el condominio se queda
      sin estacionamientos aunque no haya nadie dentro.

      Se libera solo, al terminar la visita, porque es cuando de verdad queda
      libre: pedirle al guardia que se acuerde de soltarlo es pedirle que haga
      el trabajo de la base.
    */
    await marcarLlegadaInvitado(invitadoId, true);
    await registrarHoraInvitado(invitadoId, "salida", "19:30");

    const { data: visita } = await supabase
      .from("visita")
      .select("estado")
      .eq("id", visitaId)
      .single();
    expect(visita!.estado).toBe("finalizada");

    expect(await ocupacionDelCupo()).toHaveLength(0);
  });

  it("pero mientras la visita sigue dentro, el cupo no se suelta", async () => {
    // Control: si se liberara siempre, el caso de arriba pasaría sin probar
    // nada.
    await registrarHoraInvitado(invitadoId, "salida", "");
    await supabase.from("asignacion_estacionamiento").insert({
      estacionamiento_id: cupoId,
      visita_id: visitaId,
    });
    await marcarLlegadaInvitado(invitadoId, true);

    const { data: visita } = await supabase
      .from("visita")
      .select("estado")
      .eq("id", visitaId)
      .single();
    expect(visita!.estado).toBe("ingresada");
    expect(await ocupacionDelCupo()).toHaveLength(1);
  });
});

describe("quién decide si se verifica el documento", () => {
  /*
    Lo decide **el edificio**, por decisión del cliente del 29/09/2026. Antes lo
    cableaba el formulario por el tipo de visita --amigos nunca-- mientras a
    quien invitaba se le pedía el tipo y el número de documento y se le decía que
    su invitado lo presentara en portería: una comprobación prometida que nadie
    hacía. Punto 66 de `REVISAR-A-OJO.md`.

    El caso apaga la bandera del condominio, comprueba que lo que la aplicación
    manda cambia, y la devuelve.
  */
  let original = true;

  beforeAll(async () => {
    await entrarComo(ADMIN);
    const { data } = await supabase
      .from("condominio")
      .select("verificar_documento_visitas")
      .eq("id", CONDOMINIO)
      .single();
    original = data?.verificar_documento_visitas ?? true;
  });

  afterAll(async () => {
    await entrarComo(ADMIN);
    await supabase
      .from("condominio")
      .update({ verificar_documento_visitas: original })
      .eq("id", CONDOMINIO);
    await salir();
  });

  it("con la bandera encendida, la instrucción es verificar", async () => {
    await entrarComo(ADMIN);
    await supabase
      .from("condominio")
      .update({ verificar_documento_visitas: true })
      .eq("id", CONDOMINIO);
    const leido = await obtenerVerificacionDeDocumento(CONDOMINIO);
    expect(leido).toBe(true);
    await salir();
  });

  it("y apagada, la portería no la pide", async () => {
    await entrarComo(ADMIN);
    await supabase
      .from("condominio")
      .update({ verificar_documento_visitas: false })
      .eq("id", CONDOMINIO);
    expect(await obtenerVerificacionDeDocumento(CONDOMINIO)).toBe(false);
    await salir();
  });

  it("pero un residente no puede cambiarla: es del edificio", async () => {
    await entrarComo(ADMIN);
    await supabase
      .from("condominio")
      .update({ verificar_documento_visitas: true })
      .eq("id", CONDOMINIO);
    await salir();

    // Sofía es propietaria, no administración.
    await entrarComo("vecino@veciyo.test");
    await supabase
      .from("condominio")
      .update({ verificar_documento_visitas: false })
      .eq("id", CONDOMINIO);
    // El `update` no da error: la política simplemente no deja ninguna fila.
    expect(await obtenerVerificacionDeDocumento(CONDOMINIO)).toBe(true);
    await salir();
  });
});

/**
 * Y el desenlace que faltaba: el documento **no** coincide.
 *
 * `verificarDocumentoInvitado` escribía «verificado» a fuego, así que había un
 * solo botón y un solo final. Lo llamativo es que la pantalla sí detectaba el
 * desajuste --el guardia teclea el número y sale «no coincide con el
 * registrado»-- y ahí moría: sin constancia, y la persona entraba igual.
 *
 * Decidido con el cliente el 02/10/2026: «si no coincide no lo deja entrar y ya
 * pues». Lo impide la base, no la pantalla, porque marcar la llegada se puede
 * pedir por la API sin pasar por ninguna pantalla.
 */
describe("cuando el documento no coincide", () => {
  beforeAll(async () => {
    // Los bloques de arriba terminan sin nadie dentro, y sin sesion no se ve
    // ninguna fila: un `select` devuelve vacio y un `update` no toca nada, los
    // dos **sin error**.
    await entrarComo(GUARDIA);

    /*
      Los casos de arriba ya dejaron entrar a esta persona, y marcar
      «no coincide» sobre alguien que ya entró está prohibido a propósito. Se
      deshace la llegada primero, que es lo que hace el guardia cuando se
      equivoca de fila: el interruptor de la pantalla va en los dos sentidos.
    */
    const { error } = await supabase
      .from("invitado")
      .update({ llego: false, ingreso_en: null })
      .eq("id", invitadoId);
    expect(error).toBeNull();

    /*
      Y comprobando que de verdad se deshizo. Un `update` que no encuentra la
      fila --porque la politica no la deja ver-- responde **sin error y sin
      tocar nada**, y entonces el caso de abajo falla diciendo otra cosa. Me
      paso: la primera version se fiaba del `error` nulo.
    */
    const { data } = await supabase
      .from("invitado")
      .select("llego")
      .eq("id", invitadoId)
      .single();
    expect(data!.llego, "la llegada tiene que quedar deshecha").toBe(false);
  });

  it("queda anotado como lo que es", async () => {
    await verificarDocumentoInvitado(invitadoId, false);

    const { data } = await supabase
      .from("verificacion_documento")
      .select("estado")
      .eq("invitado_id", invitadoId)
      .single();

    expect(data!.estado).toBe("no_coincide");
  });

  it("y entonces no se le puede registrar el ingreso", async () => {
    const { error } = await supabase
      .from("invitado")
      .update({ llego: true, ingreso_en: new Date().toISOString() })
      .eq("id", invitadoId);

    expect(error, "la base tiene que rechazarlo").toBeTruthy();
    expect(error!.message).toContain("no coincide");

    // Y lo que de verdad importa: que no haya entrado.
    const { data } = await supabase
      .from("invitado")
      .select("llego, ingreso_en")
      .eq("id", invitadoId)
      .single();
    expect(data!.llego).toBe(false);
    expect(data!.ingreso_en).toBeNull();
  });

  it("si se vuelve a mirar y sí coincide, entra", async () => {
    /*
      El control positivo, y el caso real: un apellido mal escrito en el
      preregistro no puede dejar a alguien en la calle para siempre. Volver a
      verificar reabre la puerta.
    */
    await verificarDocumentoInvitado(invitadoId, true);

    const { error } = await supabase
      .from("invitado")
      .update({ llego: true, ingreso_en: new Date().toISOString() })
      .eq("id", invitadoId);

    expect(error).toBeNull();
  });

  it("y ya dentro, no se le marca «no coincide» por detrás", async () => {
    /*
      Sin esto, el orden de las dos escrituras decidiría el resultado: alguien
      podría quedar dentro con el documento marcado como falso y nadie se
      enteraría. Un desajuste descubierto después es una incidencia que se
      trata en persona, no un cambio de casilla.
    */
    await expect(
      verificarDocumentoInvitado(invitadoId, false),
    ).rejects.toThrow();
  });

  afterAll(async () => {
    // Se deja como estaba: coincide y dentro, que es como lo dejaron los casos
    // de arriba. El `afterAll` del archivo borra la visita entera despues.
    await verificarDocumentoInvitado(invitadoId, true);
    await salir();
  });
});
