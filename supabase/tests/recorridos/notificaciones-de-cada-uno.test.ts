import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, supabase } from "./cliente";
import {
  contarSinLeer,
  marcarNotificacionLeida,
  marcarTodasLeidas,
  obtenerNotificaciones,
} from "@/features/home/services/notificaciones.repo";
import { crearReserva, resolverReserva } from "@/features/zonas/services/zonas.repo";

/**
 * Recorrido: cada uno ve sus notificaciones y solo las suyas.
 *
 * `AGENTS.md` cuenta que la primera prueba de notificaciones **no detectó una
 * regresión**: comprobaba que "lo que veo es mío", y eso pasa igual con la
 * política abierta de par en par si resulta que soy el único con datos.
 *
 * Así que este recorrido empieza generando notificaciones **de dos personas
 * distintas** --aprobando una reserva de la 102 y otra de la 205, que avisan a
 * viviendas distintas-- y solo después pregunta qué ve cada cual. Sin datos
 * ajenos que filtrar, un caso negativo no dice nada.
 *
 * Las notificaciones no se insertan a mano: no hay política de alta, las crea
 * la base cuando pasa algo. Es lo correcto --una notificación es la
 * consecuencia de un hecho-- y obliga a provocar el hecho de verdad.
 */

const U102 = "44444444-4444-4444-4444-444444444443";
const U205 = "44444444-4444-4444-4444-444444444442";
const SOFIA = "vecino@veciyo.test"; // 102
const GUILLERMO = "propietario@veciyo.test"; // 101 y 205
const ADMIN = "admin@veciyo.test";

const MARCA = "[prueba] recorrido notificaciones";

let zonaId = "";
const reservas: string[] = [];

/**
 * Las notificaciones que Sofía tenía sin leer antes de empezar.
 *
 * El recorrido llama a `marcarTodasLeidas`, que es justo el gesto peligroso
 * que quiere probar --un `update` sin filtro de usuario-- y de paso le vacía
 * la bandeja: son **seiscientas**, acumuladas por la suite a lo largo de
 * meses. Se devuelven a no leídas al terminar.
 */
let sinLeerDeSofia: string[] = [];

function dia(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return [
    String(d.getDate()).padStart(2, "0"),
    String(d.getMonth() + 1).padStart(2, "0"),
    d.getFullYear(),
  ].join("/");
}

beforeAll(async () => {
  await entrarComo(ADMIN);
  const { data } = await supabase
    .from("zona_comun")
    .select("id")
    .eq("activa", true)
    .eq("permite_estancia_larga", true)
    .limit(1)
    .single();
  zonaId = data!.id;

  // Una reserva de cada vivienda, aprobadas: cada aprobación avisa a **su**
  // unidad, así que después hay notificaciones de dos personas distintas.
  await salir();
  await entrarComo(SOFIA);
  const deSofia = (await crearReserva({
    zonaId,
    unidadId: U102,
    fecha: dia(3),
    horaInicio: "08:00",
    horaFin: "09:00",
    comentarios: MARCA,
  })).id;
  reservas.push(deSofia);

  await salir();
  await entrarComo(GUILLERMO);
  const deGuillermo = (await crearReserva({
    zonaId,
    unidadId: U205,
    fecha: dia(3),
    horaInicio: "10:00",
    horaFin: "11:00",
    comentarios: MARCA,
  })).id;
  reservas.push(deGuillermo);

  await salir();
  await entrarComo(ADMIN);
  await resolverReserva(deSofia, "Aprobada");
  await resolverReserva(deGuillermo, "Aprobada");

  // La foto de la bandeja de Sofía, antes de que el recorrido la vacíe.
  await salir();
  await entrarComo(SOFIA);
  const { data: pendientes } = await supabase
    .from("notificacion")
    .select("id")
    .is("leida_en", null);
  sinLeerDeSofia = (pendientes ?? []).map((n) => n.id);
});

afterAll(async () => {
  await salir();
  await entrarComo(ADMIN);
  /*
    Las reservas se borran; las notificaciones **no se pueden borrar**, y no es
    un descuido: `notificacion` solo tiene políticas de lectura y de marcado.
    Una notificación es la constancia de que se avisó a alguien, igual que una
    invitación es la constancia de que se invitó. Quedan huérfanas apuntando a
    una reserva que ya no está --hay 451 así de toda la suite-- y se van en la
    purga previa a producción.

    Ojo: el `delete` respondía éxito. Se vio contando, no leyendo la respuesta.
  */
  for (const id of reservas) {
    await supabase.from("reserva_zona").delete().eq("id", id);
  }
  await salir();

  // Y la bandeja de Sofía vuelve como estaba: el recorrido probaba una
  // política, no tenía por qué dejarle seiscientas notificaciones leídas.
  await entrarComo(SOFIA);
  for (let i = 0; i < sinLeerDeSofia.length; i += 200) {
    await supabase
      .from("notificacion")
      .update({ leida_en: null })
      .in("id", sinLeerDeSofia.slice(i, i + 200));
  }
  await salir();
});

describe("las notificaciones", () => {
  it("Sofía recibe la suya", async () => {
    await salir();
    await entrarComo(SOFIA);
    const suyas = await obtenerNotificaciones();
    expect(suyas.some((n) => n.entidadId === reservas[0])).toBe(true);
  });

  it("y no ve la de Guillermo, que existe y es de otro", async () => {
    /*
      El caso que de verdad prueba algo. La notificación de Guillermo **está en
      la tabla** --se acaba de generar-- así que si la política se abriera,
      Sofía la vería. Sin ese dato ajeno, este caso pasaría con la política
      abierta de par en par.
    */
    const suyas = await obtenerNotificaciones();
    expect(suyas.some((n) => n.entidadId === reservas[1])).toBe(false);
  });

  it("la marca leída, y solo esa", async () => {
    const suyas = await obtenerNotificaciones();
    const mia = suyas.find((n) => n.entidadId === reservas[0])!;
    const sinLeerAntes = await contarSinLeer();

    await marcarNotificacionLeida(mia.id);

    const despues = await obtenerNotificaciones();
    expect(despues.find((n) => n.id === mia.id)?.leida).toBe(true);
    expect(await contarSinLeer()).toBe(sinLeerAntes - 1);
  });

  it("y marcar todas como leídas no toca las de nadie más", async () => {
    /*
      El ataque de verdad: `marcarTodasLeidas` es un `update` **sin filtro de
      usuario** --lo pone la política-- así que si la política se relajara, un
      vecino cualquiera borraría el punto de la campana a todo el edificio.

      No se puede comprobar mirando la fila ajena: la política es estricta
      hasta para la administración, y nadie lee la notificación de otro. Así
      que lo comprueba **Guillermo, en su sesión**, que es quien puede verla.
    */
    await marcarTodasLeidas();

    await salir();
    await entrarComo(GUILLERMO);
    const suyas = await obtenerNotificaciones();
    const suya = suyas.find((n) => n.entidadId === reservas[1]);
    // Existe --control positivo: sin esto, "sigue sin leer" podría significar
    // que nunca se creó-- y sigue sin leer.
    expect(suya).toBeDefined();
    expect(suya!.leida).toBe(false);
  });
});
