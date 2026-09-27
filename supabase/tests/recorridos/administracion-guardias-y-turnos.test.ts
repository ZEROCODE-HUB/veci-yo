import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, supabase } from "./cliente";
import {
  actualizarGuardia,
  darDeBajaGuardia,
  guardarOverride,
  guardarTurnos,
  obtenerSeguridad,
  quitarOverride,
} from "@/features/administrador/services/seguridad.repo";
import { obtenerVisitas } from "@/features/visitas/services/visitas.repo";
import { obtenerReservas } from "@/features/zonas/services/zonas.repo";
import { isOnShift } from "@/features/administrador/helpers/seguridad.helpers";
import { daysByIndex } from "@/features/administrador/types";

/**
 * Recorrido: la administración gestiona a la portería y su horario.
 *
 * Un guardia no es una tabla aparte: es una `membresia_condominio` con rol
 * `guardia`, y de esa misma fila cuelga todo lo que puede hacer. Por eso el
 * caso que más importa aquí no es el horario sino **la baja**: si dar de baja a
 * un guardia solo lo escondiera de la lista de la administración, seguiría
 * entrando a ver quién visita cada casa el día después de que lo echaran.
 *
 * Los turnos eran arrays embebidos con el día como texto libre --convivían
 * "Miércoles" con y sin tilde--. Ahora son tablas, con el día en entero ISO.
 *
 * Este recorrido escribe sobre **el guardia de verdad del condominio**, que ya
 * tiene su horario puesto: no hay otro con quien probar. Así que guarda las
 * filas crudas de todo lo que puede tocar --turnos, ajustes y su propio
 * `activo`-- y las devuelve con escrituras directas, no llamando a las
 * funciones que se están probando. Es la lección de las cuotas: restaurar de
 * menos deja estropeado un dato del cliente y la suite sigue verde.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
/*
  Los dias tal como los escribe la aplicacion, en el orden de `getDay()`. Se
  toma de ahi y no se copia: una segunda lista es lo que hizo convivir
  «Miercoles» con y sin tilde.
*/
const DIAS_ES = daysByIndex;
const ADMIN = "admin@veciyo.test";
const GUARDIA = "guardia@veciyo.test";
const VECINA = "vecino@veciyo.test";

/** Un día lejano, para no pisar ningún ajuste real de la portería. */
const DIA_LEJANO = "1990-03-15";

let membresiaId = "";
let turnosOriginales: any[] = [];
let overridesOriginales: any[] = [];

/** Devuelve el horario del guardia exactamente como estaba. */
async function restaurarHorario() {
  await supabase.from("turno_guardia").delete().eq("membresia_id", membresiaId);
  await supabase.from("turno_override").delete().eq("membresia_id", membresiaId);
  if (turnosOriginales.length) {
    await supabase.from("turno_guardia").insert(turnosOriginales);
  }
  if (overridesOriginales.length) {
    await supabase.from("turno_override").insert(overridesOriginales);
  }
  // `activo` siempre, pase lo que pase: un guardia que se queda dado de baja
  // por una corrida interrumpida deja sin portería al condominio entero.
  await supabase
    .from("membresia_condominio")
    .update({ activo: true })
    .eq("id", membresiaId);
}

beforeAll(async () => {
  await entrarComo(ADMIN);

  const { guardias } = await obtenerSeguridad(CONDOMINIO);
  expect(guardias.length).toBeGreaterThan(0);
  membresiaId = guardias[0].uuid!;

  const { data: t } = await supabase
    .from("turno_guardia")
    .select("*")
    .eq("membresia_id", membresiaId);
  turnosOriginales = t ?? [];

  const { data: o } = await supabase
    .from("turno_override")
    .select("*")
    .eq("membresia_id", membresiaId);
  overridesOriginales = o ?? [];
});

afterAll(async () => {
  await salir();
  await entrarComo(ADMIN);
  await restaurarHorario();

  /*
    Y se comprueba **contando**, que es lo unico que no miente.

    Este recorrido reescribe el horario entero cuatro veces --`guardarTurnos`
    borra e inserta--, asi que si la restauracion se quedara corta el horario de
    la porteria de prueba se iria degradando corrida a corrida sin que nada se
    pusiera rojo. Ya paso con las cuotas: la prueba de la carga masiva dejo
    pagadas viviendas que existen para estar en mora.
  */
  const { data: quedaron, error: errorAlContar } = await supabase
    .from("turno_guardia")
    .select("dia_semana, hora_inicio, hora_fin")
    .eq("membresia_id", membresiaId)
    .order("dia_semana");
  expect(errorAlContar).toBeNull();
  expect(quedaron ?? []).toHaveLength(turnosOriginales.length);

  const comoEstaba = turnosOriginales
    .map((t) => `${t.dia_semana} ${t.hora_inicio} ${t.hora_fin}`)
    .sort()
    .join(" | ");
  const comoQuedo = (quedaron ?? [])
    .map((t) => `${t.dia_semana} ${t.hora_inicio} ${t.hora_fin}`)
    .sort()
    .join(" | ");
  expect(comoQuedo).toBe(comoEstaba);

  await salir();
});

describe("la portería y su horario", () => {
  it("la administración fija el horario, y el día deja de ser texto", async () => {
    await guardarTurnos(membresiaId, [
      { dia: "Lunes", horaInicio: "06:00", horaFin: "14:00" },
      { dia: "Miércoles", horaInicio: "06:00", horaFin: "14:00" },
    ]);

    const { data } = await supabase
      .from("turno_guardia")
      .select("dia_semana, hora_inicio, hora_fin")
      .eq("membresia_id", membresiaId)
      .order("dia_semana");

    // Entero ISO, no "Miércoles": en el prototipo convivía con y sin tilde y
    // los dos eran días distintos.
    expect(data!.map((t) => t.dia_semana)).toEqual([1, 3]);
    expect(data![0].hora_inicio).toContain("06:00");
  });

  it("y vuelve con las dos horas separadas, listo para comparar", async () => {
    /*
      **La ida y la vuelta.** Lo de arriba comprueba que `guardarTurnos` escribe
      bien, y eso siempre estuvo bien; lo que estaba roto era la vuelta.

      `mapearGuardia` devolvia un solo campo con el rango ya compuesto --«06:00
      - 14:00»-- y las dos funciones que necesitaban las horas para saber si
      alguien estaba trabajando lo volvian a partir por « a », que es lo que
      escribia **el otro** mapeo de la misma tabla. Asi que `isOnShift` daba
      falso para todo el mundo y el borde verde de la lista no se encendia
      nunca.

      El typecheck no lo veia --los dos son `string`-- y este recorrido tampoco,
      porque solo miraba la base. Leer con la funcion que usa la pantalla es lo
      que lo habria dicho.
    */
    await guardarTurnos(membresiaId, [
      { dia: "Lunes", horaInicio: "06:00", horaFin: "14:00" },
    ]);

    const { guardias } = await obtenerSeguridad(CONDOMINIO);
    const guardia = guardias.find((g) => g.uuid === membresiaId);
    expect(guardia).toBeDefined();
    expect(guardia!.turnos).toHaveLength(1);

    const turno = guardia!.turnos[0];
    expect(turno.dia).toBe("Lunes");
    // Cada hora por su lado, y sin segundos: es lo que compara la pantalla.
    expect(turno.horaInicio).toBe("06:00");
    expect(turno.horaFin).toBe("14:00");
  });

  it("y el guardia en turno se reconoce desde lo que devuelve la consulta", async () => {
    /*
      El limite de seguridad de este recorrido es quien ve el horario; esto es
      lo otro que hacia falta: que el dato que llega sirva **para lo que la
      pantalla hace con el**. Se guarda un turno que cubre la hora de ahora
      mismo y se pregunta a la funcion de la pantalla.

      Sin esto, la consulta puede devolver algo con la forma correcta y aun asi
      inservible --que es justo lo que pasaba--.
    */
    const ahora = new Date();
    const dia = DIAS_ES[ahora.getDay()];
    const desde = `${String(ahora.getHours()).padStart(2, "0")}:00`;
    const hasta = `${String((ahora.getHours() + 1) % 24).padStart(2, "0")}:00`;

    await guardarTurnos(membresiaId, [
      { dia, horaInicio: desde, horaFin: hasta },
    ]);

    const { guardias } = await obtenerSeguridad(CONDOMINIO);
    const guardia = guardias.find((g) => g.uuid === membresiaId)!;
    expect(isOnShift(guardia)).toBe(true);

    // Y el control positivo por el otro lado: un turno que no cubre esta hora.
    await guardarTurnos(membresiaId, [
      { dia, horaInicio: "00:00", horaFin: "00:30" },
    ]);
    const segunda = await obtenerSeguridad(CONDOMINIO);
    const otra = segunda.guardias.find((g) => g.uuid === membresiaId)!;
    // A menos que la corrida caiga justo en esa media hora.
    if (ahora.getHours() !== 0 || ahora.getMinutes() >= 30) {
      expect(isOnShift(otra)).toBe(false);
    }
  });

  it("volver a guardar reemplaza el horario, no lo acumula", async () => {
    /*
      La pantalla edita el horario entero de una vez, así que guardar tiene que
      dejar exactamente lo que se ve. Si acumulara, cada visita a la pantalla
      añadiría turnos fantasma que nadie escribió.
    */
    await guardarTurnos(membresiaId, [
      { dia: "Viernes", horaInicio: "14:00", horaFin: "22:00" },
    ]);

    const { data } = await supabase
      .from("turno_guardia")
      .select("dia_semana")
      .eq("membresia_id", membresiaId);
    expect(data!.map((t) => t.dia_semana)).toEqual([5]);
  });

  it("el turno de noche cruza la medianoche, también el de un solo día", async () => {
    /*
      Un guardia de noche entra a las 22:00 y sale a las 06:00. El horario
      habitual lo admitía; el ajuste puntual lo rechazaba con un error de
      restricción, que es el turno más común que hay en una portería.
    */
    await guardarTurnos(membresiaId, [
      { dia: "Sábado", horaInicio: "22:00", horaFin: "06:00" },
    ]);

    await guardarOverride(
      membresiaId,
      DIA_LEJANO,
      "22:00",
      "06:00",
      "[prueba] noche",
    );

    const { data } = await supabase
      .from("turno_override")
      .select("hora_inicio, hora_fin, motivo")
      .eq("membresia_id", membresiaId)
      .eq("fecha", DIA_LEJANO)
      .single();
    expect(data!.hora_inicio).toContain("22:00");
    expect(data!.hora_fin).toContain("06:00");
  });

  it("un ajuste sin horas significa que ese día no trabaja", async () => {
    // Vuelve a guardar el mismo día: es un `update`, no un duplicado, porque
    // `(membresia_id, fecha)` es único.
    await guardarOverride(membresiaId, DIA_LEJANO, "", "", "[prueba] libra");

    const { data } = await supabase
      .from("turno_override")
      .select("id, hora_inicio, hora_fin")
      .eq("membresia_id", membresiaId)
      .eq("fecha", DIA_LEJANO);

    expect(data).toHaveLength(1);
    expect(data![0].hora_inicio).toBeNull();
    expect(data![0].hora_fin).toBeNull();

    // Y se puede quitar, que es volver al horario habitual de ese día.
    await quitarOverride(data![0].id);
    const { count } = await supabase
      .from("turno_override")
      .select("id", { count: "exact", head: true })
      .eq("membresia_id", membresiaId)
      .eq("fecha", DIA_LEJANO);
    expect(count).toBe(0);
  });

  it("media hora no significa nada, y la base no la guarda", async () => {
    /*
      El invariante que sí se sujeta, y que estaba escrito en el comentario de
      la tabla desde el principio: las dos horas o ninguna.
    */
    await expect(
      supabase
        .from("turno_override")
        .insert({
          membresia_id: membresiaId,
          fecha: DIA_LEJANO,
          hora_inicio: "22:00",
          hora_fin: null,
        })
        .throwOnError(),
    ).rejects.toThrow();
  });

  it("el guardia ve su horario pero no se lo cambia", async () => {
    await salir();
    await entrarComo(GUARDIA);

    const { data: suyos } = await supabase
      .from("turno_guardia")
      .select("dia_semana")
      .eq("membresia_id", membresiaId);
    // Control positivo: lo ve, así que el caso siguiente prueba algo.
    expect(suyos!.length).toBeGreaterThan(0);

    await expect(
      guardarOverride(membresiaId, DIA_LEJANO, "08:00", "12:00", "[prueba]"),
    ).rejects.toThrow();

    // "No lo veo" no es "no se creó": lo comprueba una sesión que sí puede ver.
    await salir();
    await entrarComo(ADMIN);
    const { count } = await supabase
      .from("turno_override")
      .select("id", { count: "exact", head: true })
      .eq("membresia_id", membresiaId)
      .eq("fecha", DIA_LEJANO);
    expect(count).toBe(0);
  });

  it("una vecina ni ve el horario de la portería ni lo toca", async () => {
    await salir();
    await entrarComo(VECINA);

    const { data } = await supabase
      .from("turno_guardia")
      .select("id")
      .eq("membresia_id", membresiaId);
    expect(data).toEqual([]);

    await expect(
      guardarTurnos(membresiaId, [
        { dia: "Domingo", horaInicio: "00:00", horaFin: "08:00" },
      ]),
    ).rejects.toThrow();

    await salir();
    await entrarComo(ADMIN);
  });

  it("dar de baja al guardia le quita el acceso, no solo lo esconde", async () => {
    /*
      El caso que de verdad importa. Un guardia ve las visitas de **todas** las
      viviendas del edificio: quién entra a cada casa y a qué hora. La baja es
      lógica --el historial de visitas sigue apuntando a quien las registró--
      así que si el permiso no mirara `activo`, alguien despedido seguiría
      viendo eso al día siguiente.
    */
    await salir();
    await entrarComo(GUARDIA);
    const antes = await obtenerVisitas({ ambito: "condominio", unidadIds: [] });
    // Control positivo: con el guardia de alta, ve las del edificio.
    expect(antes.length).toBeGreaterThan(0);

    await salir();
    await entrarComo(ADMIN);
    await darDeBajaGuardia(membresiaId);

    /*
      El alta vuelve en un `finally`. Si este caso falla a media baja, el
      guardia se queda sin acceso y los casos siguientes fallan por un motivo
      que no es el suyo: el síntoma aparece lejos de la causa, que es justo lo
      que costó media hora entender con las conversaciones.
    */
    try {
      await salir();
      await entrarComo(GUARDIA);
      const despues = await obtenerVisitas({ ambito: "condominio", unidadIds: [] });
      expect(despues).toEqual([]);

      await salir();
      await entrarComo(ADMIN);
      // Y deja de ofrecerse en la pantalla de seguridad.
      const { guardias } = await obtenerSeguridad(CONDOMINIO);
      expect(guardias.some((g) => g.uuid === membresiaId)).toBe(false);
    } finally {
      await salir();
      await entrarComo(ADMIN);
      await restaurarHorario();
    }
  });

  it("y los permisos de chat y llamadas se conceden desde la administración", async () => {
    /*
      `permisos` es un JSON en la membresía. La pantalla del guardia respeta la
      casilla; lo que se comprueba aquí es que **el dato cambia**, porque el
      defecto más repetido del proyecto era justo el contrario: la decisión
      vivía en la pantalla y la base no se enteraba.
    */
    const { data: antes } = await supabase
      .from("membresia_condominio")
      .select("permisos")
      .eq("id", membresiaId)
      .single();
    const original = (antes!.permisos ?? {}) as Record<string, unknown>;

    await actualizarGuardia(membresiaId, {
      permisoChat: true,
      permisoLlamadas: false,
    });

    const { guardias } = await obtenerSeguridad(CONDOMINIO);
    const guardia = guardias.find((g) => g.uuid === membresiaId)!;
    expect(guardia.permisoChat).toBe(true);
    expect(guardia.permisoLlamadas).toBe(false);

    // Y lo demás del JSON no se pierde por el camino.
    const { data: despues } = await supabase
      .from("membresia_condominio")
      .select("permisos")
      .eq("id", membresiaId)
      .single();
    for (const clave of Object.keys(original)) {
      if (clave === "chat" || clave === "llamadas") continue;
      expect((despues!.permisos as any)[clave]).toEqual(original[clave]);
    }

    // Escritura directa: la restauración no pasa por lo que se está probando.
    await supabase
      .from("membresia_condominio")
      .update({ permisos: original })
      .eq("id", membresiaId);
  });

  it("y quien administra el edificio y además vive en él ve solo lo suyo al elegir su rol de propietaria", async () => {
    /*
      Marcela administra el condominio **y** es propietaria de la 301. RLS le
      permite ver las visitas de todo el edificio, porque mira su identidad y no
      el rol con el que entró.

      `obtenerVisitas` no pedía ámbito: traía todo lo que la política dejara. Así
      que al entrar como propietaria de la 301 seguía viendo las visitas de las
      demás viviendas --en su lista aparecía una de la 205-- y elegir el rol no
      servía para nada. Salió recorriendo la pantalla; ninguna prueba lo veía,
      porque los recorridos de propietario usan a Sofía, que **solo** es
      propietaria, y para ella las dos consultas devuelven lo mismo.

      Es la regla 8 entera en un caso: RLS es el techo, no el filtro.
    */
    await salir();
    const marcelaId = await entrarComo(ADMIN);

    const { data: suyas } = await supabase
      .from("membresia_unidad")
      .select("unidad_id, unidad:unidad_id ( codigo )")
      .eq("usuario_id", marcelaId)
      .eq("rol", "propietario")
      .eq("activo", true);
    const unidadIds = (suyas ?? []).map((m) => m.unidad_id);
    // PostgREST devuelve la relacion como lista cuando no puede saber que es
    // uno a uno: se toma el primero, que es el unico que hay.
    const codigosPropios = (suyas ?? []).flatMap((m) =>
      (Array.isArray(m.unidad) ? m.unidad : [m.unidad]).map((u) => u?.codigo),
    );
    expect(unidadIds.length).toBeGreaterThan(0);

    // Como administradora: el edificio entero, que es lo que le toca.
    const delEdificio = await obtenerVisitas({
      ambito: "condominio",
      unidadIds: [],
    });
    const viviendasDelEdificio = new Set(delEdificio.map((v) => v.depto));
    expect(viviendasDelEdificio.size).toBeGreaterThan(1);

    // Como propietaria: solo las de su vivienda, aunque RLS le deje más.
    const deSuVivienda = await obtenerVisitas({ ambito: "unidad", unidadIds });
    expect(deSuVivienda.length).toBeLessThan(delEdificio.length);
    expect(
      deSuVivienda.every((v) => codigosPropios.includes(v.depto)),
    ).toBe(true);

    /*
      Y lo mismo con las reservas de zona, que tenían el defecto por duplicado:
      su lista traía once reservas de la 102 y la 205 y **ninguna** de la 301,
      que es la suya.
    */
    const reservasDelEdificio = await obtenerReservas({
      ambito: "condominio",
      unidadIds: [],
    });
    const reservasSuyas = await obtenerReservas({ ambito: "unidad", unidadIds });
    expect(reservasDelEdificio.length).toBeGreaterThan(reservasSuyas.length);
    expect(
      reservasSuyas.every((r) => codigosPropios.includes(r.depto)),
    ).toBe(true);
  });
});
