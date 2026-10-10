/**
 * sincronizar-calendario · trae las reservas del portal
 *
 * El anfitrión pega el enlace de su calendario de Airbnb en la configuración de
 * su alojamiento, y esto lo lee y crea las estancias.
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
 * **el permiso se comprueba antes y aparte**: `calendario_de_unidad` lo
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

const json = (cuerpo: unknown, status: number) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

/** Nombre del titular mientras el huésped no ha llenado su ficha. */
const SIN_NOMBRE = "Huésped por confirmar";

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

  let fila: { url: string | null; condominio_id: string } | undefined;

  if (esElCron) {
    const { data } = await admin
      .from("suscripcion_renta_corta")
      .select("ical_url, estado, unidad:unidad_id ( condominio_id )")
      .eq("unidad_id", cuerpo.unidadId)
      .maybeSingle();
    const unidad = data?.unidad as { condominio_id: string } | null | undefined;
    // Una renta corta dada de baja ya no importa reservas, la pida quien la pida.
    if (data && data.estado === "activa" && unidad) {
      fila = { url: data.ical_url, condominio_id: unidad.condominio_id };
    }
  } else {
    const { data: config, error: errorConfig } = await comoLaPersona.rpc(
      "calendario_de_unidad",
      { p_unidad_id: cuerpo.unidadId },
    );
    if (errorConfig) return json({ error: errorConfig.message }, 403);
    fila = config?.[0];
  }

  if (!fila?.url) {
    return json(
      { error: "Esta vivienda no tiene ningún calendario conectado" },
      400,
    );
  }
  const condominioId = fila.condominio_id;
  const urlDelCalendario = fila.url;

  /** Deja dicho por qué falló, para que el anfitrión lo vea en su pantalla. */
  const anotarError = async (motivo: string) => {
    await admin
      .from("suscripcion_renta_corta")
      .update({ ical_error: motivo })
      .eq("unidad_id", cuerpo.unidadId);
  };

  let texto: string;
  try {
    /*
      Con tiempo máximo: un portal que no responde no puede dejar colgada la
      función hasta que la plataforma la mate, porque entonces no se llega a
      anotar el motivo y el anfitrión no ve nada.
    */
    const respuesta = await fetch(urlDelCalendario, {
      signal: AbortSignal.timeout(20_000),
      headers: { "User-Agent": "Veciyo/1.0" },
    });
    if (!respuesta.ok) {
      const motivo = `El portal respondió ${respuesta.status} al pedir el calendario`;
      await anotarError(motivo);
      return json({ error: motivo }, 502);
    }
    texto = await respuesta.text();
  } catch (error) {
    const motivo =
      error instanceof Error && error.name === "TimeoutError"
        ? "El portal tardó demasiado en responder"
        : "No se pudo abrir el enlace del calendario";
    await anotarError(motivo);
    return json({ error: motivo }, 502);
  }

  const reservas = leerCalendario(texto);

  /*
    Un calendario que de pronto no tiene ni un evento suele ser un enlace que
    caduco o que apunta a otra cosa, no un anfitrion sin reservas. Se avisa y no
    se toca nada: borrar estancias porque una lectura vino vacia seria peor.
  */
  if (reservas.length === 0) {
    await admin
      .from("suscripcion_renta_corta")
      .update({
        ical_sincronizado_en: new Date().toISOString(),
        ical_error: "El calendario se leyó bien pero no traía ninguna reserva",
      })
      .eq("unidad_id", cuerpo.unidadId);
    return json({ leidas: 0, nuevas: 0, actualizadas: 0 }, 200);
  }

  const hoy = new Date().toISOString().slice(0, 10);
  let nuevas = 0;
  let actualizadas = 0;
  const problemas: string[] = [];

  for (const reserva of reservas) {
    // Lo que ya termino no se importa: no hay a quien dejar entrar.
    if (reserva.hasta < hoy) continue;

    const { data: existente } = await admin
      .from("visita")
      .select("id, fecha_desde, fecha_hasta, telefono_ultimos4")
      .eq("unidad_id", cuerpo.unidadId)
      .eq("calendario_uid", reserva.uid)
      .maybeSingle();

    if (existente) {
      /*
        Las fechas de una reserva cambian: el huesped alarga, el anfitrion
        corrige. Se actualizan; lo que el huesped ya lleno no se toca.
      */
      if (
        existente.fecha_desde !== reserva.desde ||
        existente.fecha_hasta !== reserva.hasta ||
        // Las que se importaron antes de leer el telefono se completan aqui.
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
        if (error) problemas.push(`${reserva.codigo ?? reserva.uid}: ${error.message}`);
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
        codigo_reserva: reserva.codigo,
        calendario_uid: reserva.uid,
        calendario_url: reserva.url,
        telefono_ultimos4: reserva.ultimos4,
      })
      .select("id")
      .single();

    if (errorVisita) {
      problemas.push(`${reserva.codigo ?? reserva.uid}: ${errorVisita.message}`);
      continue;
    }

    /*
      El titular, desde el primer momento y marcado.

      Airbnb no manda el nombre, asi que entra en blanco y el huesped lo
      rellena al abrir su enlace. Lo que **no** puede pasar es que la estancia
      exista sin esta fila: `guardar_precheckin` la busca, y el dia que no la
      encontro intento crear otra y choco contra el orden unico. Ese fue el 409
      que vio el cliente el 02/10/2026.
    */
    const { error: errorTitular } = await admin.from("invitado").insert({
      visita_id: visita.id,
      orden: 0,
      nombre: reserva.codigo ? `${SIN_NOMBRE} (${reserva.codigo})` : SIN_NOMBRE,
      es_titular: true,
    });

    if (errorTitular) {
      // Sin titular la estancia no sirve para nada, asi que no se deja a medias.
      await admin.from("visita").delete().eq("id", visita.id);
      problemas.push(`${reserva.codigo ?? reserva.uid}: ${errorTitular.message}`);
      continue;
    }

    nuevas += 1;
  }

  await admin
    .from("suscripcion_renta_corta")
    .update({
      ical_sincronizado_en: new Date().toISOString(),
      ical_error: problemas.length > 0 ? problemas.join(" · ") : null,
    })
    .eq("unidad_id", cuerpo.unidadId);

  return json(
    { leidas: reservas.length, nuevas, actualizadas, problemas },
    200,
  );
});
