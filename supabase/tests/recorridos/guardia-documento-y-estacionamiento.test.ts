import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, supabase } from "./cliente";
import {
  crearVisita,
  marcarLlegadaInvitado,
  obtenerVisitas,
  registrarHoraInvitado,
  verificarDocumentoInvitado,
} from "@/features/visitas/services/visitas.repo";

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
    await verificarDocumentoInvitado(invitadoId);

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
    const visitas = await obtenerVisitas();
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
