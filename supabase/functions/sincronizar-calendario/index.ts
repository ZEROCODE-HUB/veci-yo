/**
 * sincronizar-calendario · trae las reservas del portal
 *
 * El anfitrión pega los enlaces de sus calendarios (Airbnb, Booking u otra) en
 * la configuración de su alojamiento, y esto los lee y crea las estancias.
 *
 * Lo que entra por aquí es **la mitad de una reserva**: fechas, el código y un
 * identificador. Airbnb no manda el nombre del huésped, ni su correo, ni
 * cuántas personas son —lo quitó en 2019—. La otra mitad la pone el anfitrión
 * (cuántos adultos, cuántos niños, vehículos) y el huésped en su preregistro.
 *
 * Por eso cada estancia importada nace con **un titular sin nombre todavía**:
 * la fila existe desde el principio, marcada, y el huésped la rellena cuando
 * abre su enlace. No es un detalle: `guardar_precheckin` busca a ese titular, y
 * el día que no lo encontró el preregistro falló con un 409 en toda reserva del
 * producto.
 *
 * Corre con la clave de servicio porque escribe sobre varias viviendas, así que
 * **el permiso se comprueba antes y aparte**: `calendarios_de_unidad` lo
 * responde con la sesión de quien llama, no con la del servicio.
 *
 * Desde el 09/10/2026 también la llama **el cron**, cada cierto tiempo, para
 * que una reserva exista sin que nadie pulse nada. El cron no tiene sesión de
 * persona: se identifica con la clave de servicio, que solo vive en el Vault
 * de la base y en los secretos de esta función.
 */
import { createClient } from "jsr:@supabase/supabase-js@2";
import { leerCalendario } from "../_compartido/ical.ts";
import { CORS, responderPreflight } from "../_compartido/cors.ts";
import { parametro, parametroEntero } from "../_compartido/parametros.ts";

const json = (cuerpo: unknown, status: number) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

Deno.serve(async (req: Request) => {
  /*
    El `OPTIONS` primero. La aplicacion corre hoy **en el navegador**, y
    `functions.invoke` manda `authorization` y `content-type`, asi que el
    navegador pregunta antes de llamar. Sin esto la respuesta es 405 sin
    cabeceras y lo que llega al codigo es `Failed to fetch`.

    Los recorridos no lo veian porque corren en Node, donde no hay preflight.
  */
  const previo = responderPreflight(req);
  if (previo) return previo;

  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const autorizacion = req.headers.get("Authorization");
  if (!autorizacion) return json({ error: "Falta la sesión" }, 401);

  let cuerpo: { unidadId?: string; desdeElCron?: boolean };
  try {
    cuerpo = await req.json();
  } catch {
    return json({ error: "Cuerpo inválido" }, 400);
  }
  if (!cuerpo.unidadId) return json({ error: "Falta unidadId" }, 400);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const servicio = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  /*
    Con la sesión de quien llama: es lo que decide si puede tocar esa vivienda.
    Si esto se hiciera con la clave de servicio, cualquiera con una cuenta
    podría sincronizar el calendario de un vecino.
  */
  const comoLaPersona = createClient(url, anon, {
    global: { headers: { Authorization: autorizacion } },
    auth: { persistSession: false },
  });

  const admin = createClient(url, servicio, { auth: { persistSession: false } });

  /*
    El cron. `desdeElCron` lo puede escribir cualquiera en el cuerpo, asi que
    no vale por si solo: se comprueba que la credencial que trae **es de
    servicio**, pidiendole a la base algo que solo el servicio puede pedir
    --`valor_configuracion`, que no esta concedida a nadie mas--. Con cualquier
    otra credencial se sigue el camino de siempre, que pregunta si esa persona
    manda en la vivienda.

    La primera version comparaba la credencial con el secreto de esta funcion,
    letra por letra. No coinciden: la plataforma le da a la funcion su clave en
    otro formato que la que guarda el Vault. El cron habria recibido un 403 en
    cada pasada, y lo delato la prueba que llama como el.
  */
  let esElCron = false;
  if (cuerpo.desdeElCron === true) {
    const { error: noEsServicio } = await comoLaPersona.rpc("valor_configuracion", {
      p_clave: "calendario_intervalo_minutos",
    });
    esElCron = !noEsServicio;
  }

  /*
    Los calendarios de la vivienda, uno por plataforma (desde el 21/10/2026;
    antes había un solo enlace, el de Airbnb). Quien los pide sin ser el cron
    los pide con su sesión: `calendarios_de_unidad` responde solo a quien
    puede configurar ese alojamiento.
  */
  type Calendario = { plataforma: "airbnb" | "booking" | "otra"; url: string };
  let calendarios: Calendario[] = [];
  let condominioId: string | null = null;

  if (esElCron) {
    const { data: suscripcion } = await admin
      .from("suscripcion_renta_corta")
      .select("estado, unidad:unidad_id ( condominio_id )")
      .eq("unidad_id", cuerpo.unidadId)
      .maybeSingle();
    const unidad = suscripcion?.unidad as { condominio_id: string } | null | undefined;
    // Una renta corta dada de baja ya no importa reservas, la pida quien la pida.
    if (suscripcion && suscripcion.estado === "activa" && unidad) {
      condominioId = unidad.condominio_id;
      const { data } = await admin
        .from("calendario_vivienda")
        .select("plataforma, url")
        .eq("unidad_id", cuerpo.unidadId);
      calendarios = (data ?? []) as Calendario[];
    }
  } else {
    const { data, error: errorConfig } = await comoLaPersona.rpc(
      "calendarios_de_unidad",
      { p_unidad_id: cuerpo.unidadId },
    );
    if (errorConfig) return json({ error: errorConfig.message }, 403);
    calendarios = (data ?? []).map((c: { plataforma: string; url: string }) => ({
      plataforma: c.plataforma as Calendario["plataforma"],
      url: c.url,
    }));
    condominioId = data?.[0]?.condominio_id ?? null;
  }

  if (!calendarios.length || !condominioId) {
    return json(
      { error: "Esta vivienda no tiene ningún calendario conectado" },
      400,
    );
  }

  /*
    Dos valores de la base (hasta el 18/10/2026 escritos aquí):
      · `titular_provisional_nombre`: el nombre del titular mientras el huésped
        no ha llenado su ficha. La web del preregistro lee el mismo parámetro
        para reconocerlo y no enseñarlo como un nombre de verdad; si cada lado
        tuviera el suyo, el día que uno cambiara la web dejaría de reconocerlo.
      · `calendario_espera_segundos`: cuánto se espera al portal.
  */
  let sinNombre: string;
  let esperaSegundos: number;
  try {
    [sinNombre, esperaSegundos] = await Promise.all([
      parametro(admin, "titular_provisional_nombre"),
      parametroEntero(admin, "calendario_espera_segundos"),
    ]);
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "No se pudieron leer los parámetros" },
      502,
    );
  }

  // El día del edificio de la vivienda: con el de Londres (`toISOString`), de 7
  // de la noche a medianoche en Colombia una reserva que sale hoy ya «había
  // terminado» y no se leía (25/10/2026).
  const { data: hoyDelEdificio, error: errorHoy } = await admin.rpc("hoy_en_la_unidad", {
    p_unidad_id: cuerpo.unidadId,
  });
  if (errorHoy || !hoyDelEdificio) {
    return json({ error: errorHoy?.message ?? "No se pudo saber qué día es en el edificio" }, 502);
  }
  const hoy = String(hoyDelEdificio);
  let leidas = 0;
  let nuevas = 0;
  let actualizadas = 0;
  const problemas: string[] = [];
  const NOMBRE = { airbnb: "Airbnb", booking: "Booking", otra: "Otra plataforma" } as const;

  /** Lee un calendario, crea o corrige sus estancias y deja dicho cómo le fue. */
  const leerUno = async (cal: Calendario) => {
    const anotar = (cambios: { sincronizado_en?: string; error: string | null }) =>
      admin
        .from("calendario_vivienda")
        .update(cambios)
        .eq("unidad_id", cuerpo.unidadId)
        .eq("plataforma", cal.plataforma);

    let texto: string;
    try {
      /*
        Con tiempo máximo: un portal que no responde no puede dejar colgada la
        función hasta que la plataforma la mate, porque entonces no se llega a
        anotar el motivo y el anfitrión no ve nada.
      */
      const respuesta = await fetch(cal.url, {
        signal: AbortSignal.timeout(esperaSegundos * 1000),
        headers: { "User-Agent": "Veciyo/1.0" },
      });
      if (!respuesta.ok) {
        const motivo = `El portal respondió ${respuesta.status} al pedir el calendario`;
        await anotar({ error: motivo });
        problemas.push(`${NOMBRE[cal.plataforma]}: ${motivo}`);
        return;
      }
      texto = await respuesta.text();
    } catch (error) {
      const motivo =
        error instanceof Error && error.name === "TimeoutError"
          ? "El portal tardó demasiado en responder"
          : "No se pudo abrir el enlace del calendario";
      await anotar({ error: motivo });
      problemas.push(`${NOMBRE[cal.plataforma]}: ${motivo}`);
      return;
    }

    const reservas = leerCalendario(texto, cal.plataforma);
    leidas += reservas.length;
    const propios: string[] = [];

    /*
      Un calendario que de pronto no tiene ni un evento puede ser un enlace que
      caducó, o simplemente una vivienda sin reservas (el de Booking de pruebas
      está así). Se dice y no se toca nada: borrar estancias porque una lectura
      vino vacía sería peor.
    */
    if (reservas.length === 0) {
      await anotar({
        sincronizado_en: new Date().toISOString(),
        error: "El calendario se leyó bien pero no traía ninguna reserva",
      });
      return;
    }

    for (const reserva of reservas) {
      // Lo que ya terminó no se importa: no hay a quién dejar entrar.
      if (reserva.hasta < hoy) continue;

      const { data: existente } = await admin
        .from("visita")
        .select("id, fecha_desde, fecha_hasta, telefono_ultimos4")
        .eq("unidad_id", cuerpo.unidadId)
        .eq("calendario_uid", reserva.uid)
        .maybeSingle();

      if (existente) {
        /*
          Las fechas de una reserva cambian: el huésped alarga, el anfitrión
          corrige. Se actualizan; lo que el huésped ya llenó no se toca.
        */
        if (
          existente.fecha_desde !== reserva.desde ||
          existente.fecha_hasta !== reserva.hasta ||
          // Las que se importaron antes de leer el teléfono se completan aquí.
          (reserva.ultimos4 && existente.telefono_ultimos4 !== reserva.ultimos4)
        ) {
          const { error } = await admin
            .from("visita")
            .update({
              fecha_desde: reserva.desde,
              fecha_hasta: reserva.hasta,
              telefono_ultimos4: reserva.ultimos4 ?? existente.telefono_ultimos4,
            })
            .eq("id", existente.id);
          if (error) propios.push(`${reserva.codigo ?? reserva.uid}: ${error.message}`);
          else actualizadas += 1;
        }
        continue;
      }

      const { data: visita, error: errorVisita } = await admin
        .from("visita")
        .insert({
          condominio_id: condominioId,
          unidad_id: cuerpo.unidadId,
          tipo: "huesped_temporal",
          estado: "programada",
          fecha_desde: reserva.desde,
          fecha_hasta: reserva.hasta,
          origen: "calendario",
          // La plataforma del calendario, que Booking no deja deducir de ningún enlace.
          plataforma: cal.plataforma,
          codigo_reserva: reserva.codigo,
          calendario_uid: reserva.uid,
          calendario_url: reserva.url,
          telefono_ultimos4: reserva.ultimos4,
        })
        .select("id")
        .single();

      if (errorVisita) {
        propios.push(`${reserva.codigo ?? reserva.uid}: ${errorVisita.message}`);
        continue;
      }

      /*
        El titular, desde el primer momento y marcado.

        Las plataformas no mandan el nombre, así que entra en blanco y el
        huésped lo rellena al abrir su enlace. Lo que **no** puede pasar es que
        la estancia exista sin esta fila: `guardar_precheckin` la busca, y el día
        que no la encontró intentó crear otra y chocó contra el orden único. Ese
        fue el 409 que vio el cliente el 02/10/2026.
      */
      const { error: errorTitular } = await admin.from("invitado").insert({
        visita_id: visita.id,
        orden: 0,
        nombre: reserva.codigo ? `${sinNombre} (${reserva.codigo})` : sinNombre,
        es_titular: true,
      });

      if (errorTitular) {
        // Sin titular la estancia no sirve para nada, así que no se deja a medias.
        await admin.from("visita").delete().eq("id", visita.id);
        propios.push(`${reserva.codigo ?? reserva.uid}: ${errorTitular.message}`);
        continue;
      }

      nuevas += 1;
    }

    await anotar({
      sincronizado_en: new Date().toISOString(),
      error: propios.length > 0 ? propios.join(" · ") : null,
    });
    problemas.push(...propios.map((p) => `${NOMBRE[cal.plataforma]}: ${p}`));
  };

  // Uno detrás de otro: dos calendarios a la vez podrían crear la misma estancia.
  for (const cal of calendarios) await leerUno(cal);

  // La pasada de la vivienda, para el cron (que mira cuándo fue la última).
  await admin
    .from("suscripcion_renta_corta")
    .update({
      ical_sincronizado_en: new Date().toISOString(),
      ical_error: problemas.length > 0 ? problemas.join(" · ") : null,
    })
    .eq("unidad_id", cuerpo.unidadId);

  return json({ leidas, nuevas, actualizadas, problemas }, 200);
});
