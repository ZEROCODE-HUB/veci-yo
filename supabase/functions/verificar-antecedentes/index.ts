/**
 * verificar-antecedentes · la consulta de antecedentes de un huésped
 *
 * El KT la pone en manos del anfitrión: corre sin intervención del huésped y
 * sin que él la vea. Quién puede pedirla lo decide la base
 * (`es_anfitrion_del_invitado`), no esta función.
 *
 * ----------------------------------------------------------------------------
 * Nace apagada, y no es por prudencia abstracta
 * ----------------------------------------------------------------------------
 * **Cada consulta a tusdatos cuesta dinero del plan del cliente.** Su propia
 * documentación lo dice: «Cada petición realizada a este endpoint en producción
 * consume créditos sobre el plan adquirido».
 *
 * Y en este proyecto hay pruebas que crean huéspedes inventados y piden su
 * verificación. Con las credenciales puestas y sin interruptor, cada
 * `npm run test:rls` gastaría saldo de verdad. Es exactamente lo que pasó con
 * el token de la TRA, y la solución es la misma: **tener la credencial no es
 * querer usarla todavía**.
 *
 * Así que hacen falta tres cosas para que salga a internet, y si falta una se
 * anota `simulado` y se devuelve el motivo:
 *
 *   · `TUSDATOS_USUARIO` y `TUSDATOS_CLAVE`
 *   · y `TUSDATOS_ACTIVO = "true"`, puesto a mano.
 *
 * El cliente lo pidió así el 06/10/2026: «empieza a integrar, pero aún no
 * usaremos esa integración».
 *
 * `TUSDATOS_URL` dice contra qué ambiente. El de pruebas es gratis y responde
 * siempre lo mismo, así que lo que venga de ahí se anota como
 * `tusdatos-pruebas` y **nunca** como `tusdatos`: una verificación de mentira
 * no se confunde con una de verdad, igual que `simulado`.
 *
 * ----------------------------------------------------------------------------
 * El orden: primero la fila, después el dinero
 * ----------------------------------------------------------------------------
 * La fila se reserva **antes** de lanzar. Reservarla puede fallar --la vivienda
 * sin suscripción, o sin cupo-- y si eso pasara después de lanzar, el crédito
 * ya estaría gastado sin dónde anotarlo. La primera versión lo hacía al revés.
 *
 * ----------------------------------------------------------------------------
 * Por qué no espera el resultado aquí
 * ----------------------------------------------------------------------------
 * La consulta tarda **alrededor de un minuto** y el identificador caduca a las
 * dos horas. Se pregunta unas pocas veces --respetando los cinco segundos que
 * ellos piden-- y si no ha terminado, se devuelve `pendiente`.
 *
 * La fila queda con el identificador, así que **volver a llamar a esta función
 * recoge el resultado sin lanzar otra vez**, o sea sin pagar otra vez. Lo que
 * falta para no depender de esa segunda llamada es su aviso automático
 * (`individualCompleted`), que no se puede probar en su ambiente de pruebas.
 */
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  type Conexion,
  ConsultaRechazada,
  consultarResultado,
  esNivelDeRevision,
  fechaParaTusdatos,
  lanzarConsulta,
  pideFechaDeExpedicion,
  tipoDocumentoDeTusdatos,
  veredicto,
} from "../_compartido/tusdatos.ts";
import { ajustesDeTusdatos, fuentesObligatoriasDe } from "../_compartido/ajustesDeTusdatos.ts";
import { CORS, responderPreflight } from "../_compartido/cors.ts";
import { parametro, parametroEntero } from "../_compartido/parametros.ts";

const json = (cuerpo: unknown, status: number) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

/*
  Cuántas veces se pregunta antes de rendirse y devolver `pendiente`, y cuánto
  se espera entre una y otra (tusdatos pide cinco segundos), son parámetros de
  la base desde el 18/10/2026: `antecedentes_consulta_intentos` y
  `antecedentes_consulta_espera_segundos`. Preguntar no cuesta dinero; lanzar sí.
*/

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Anotado = "pendiente" | "aprobada" | "rechazada" | "error_proveedor";

Deno.serve(async (req: Request) => {
  // El `OPTIONS` primero, siempre: sin esto lo que llega al navegador es un
  // «Failed to fetch» sin estado ni motivo. Pasó con las seis funciones.
  const previo = responderPreflight(req);
  if (previo) return previo;

  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  let cuerpo: { invitadoId?: string; fechaExpedicion?: string };
  try {
    cuerpo = await req.json();
  } catch {
    return json({ error: "Cuerpo inválido" }, 400);
  }
  const invitadoId = cuerpo.invitadoId;
  if (!invitadoId) return json({ error: "Falta invitadoId" }, 400);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const servicio = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const autorizacion = req.headers.get("Authorization") ?? "";

  /*
    El permiso se comprueba **con la sesión de quien llama**, no con la clave
    de servicio: `verificar_antecedentes` exige ser el anfitrión del invitado.
    La clave de servicio se usa solo después, para leer el documento y anotar.
  */
  const comoUsuario = createClient(url, anon, {
    global: { headers: { Authorization: autorizacion } },
  });
  const admin = createClient(url, servicio);

  /*
    La base tambien la llama, con la clave de servicio: al cerrar el
    preregistro y desde el cron que recoge las pendientes (14/10/2026). Esa
    clave solo la tiene el servidor, asi que no hay anfitrion que comprobar.

    No se compara con `SUPABASE_SERVICE_ROLE_KEY` letra por letra: la
    plataforma le da a la funcion su clave en otro formato que la del Vault
    (ya paso en `sincronizar-calendario`). Se le pide a la base algo que solo
    el servicio puede pedir.
  */
  const { error: noEsServicio } = await comoUsuario.rpc("valor_configuracion", {
    p_clave: "calendario_intervalo_minutos",
  });
  const desdeLaBase = !noEsServicio;

  const { data: esAnfitrion, error: errorPermiso } = desdeLaBase
    ? { data: true, error: null }
    : await comoUsuario.rpc("es_anfitrion_del_invitado", {
      p_invitado_id: invitadoId,
    });
  if (errorPermiso) return json({ error: errorPermiso.message }, 500);
  if (!esAnfitrion) {
    return json(
      { error: "Solo el anfitrión del alojamiento puede pedir la verificación" },
      403,
    );
  }

  const { data: invitado, error: errorInvitado } = await admin
    .from("invitado")
    .select(
      "id, nombre, apellidos, documento_numero, tipo_documento, documento_fecha_expedicion, visita:visita_id ( condominio_id )",
    )
    .eq("id", invitadoId)
    .maybeSingle();
  if (errorInvitado) return json({ error: errorInvitado.message }, 500);
  if (!invitado) return json({ error: "Ese invitado no existe" }, 404);
  /*
    El edificio de la visita: el umbral de revisión es de ámbito edificio. Sin
    el esquema generado, supabase-js no sabe que la relación es de uno y la
    tipa como lista; PostgREST devuelve un objeto.
  */
  const condominioId =
    (invitado.visita as unknown as { condominio_id: string } | null)?.condominio_id ?? null;

  // Una fila por huésped: lo que ya haya decide casi todo lo que sigue.
  const { data: existente, error: errorExistente } = await admin
    .from("verificacion_antecedentes")
    .select("id, proveedor, resultado, referencia_externa")
    .eq("invitado_id", invitadoId)
    .maybeSingle();
  if (errorExistente) return json({ error: errorExistente.message }, 500);

  const usuario = Deno.env.get("TUSDATOS_USUARIO");
  const clave = Deno.env.get("TUSDATOS_CLAVE");
  let ajustes: Awaited<ReturnType<typeof ajustesDeTusdatos>>;
  try {
    ajustes = await ajustesDeTusdatos(admin);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
  const activo = ajustes.activo;

  // --------------------------------------------------------------------------
  // Apagada: se anota y se dice por qué, sin salir a internet
  // --------------------------------------------------------------------------
  if (!usuario || !clave || !activo) {
    const motivo = !usuario || !clave
      ? "Todavía no hay credenciales de tusdatos"
      : "La verificación con tusdatos está apagada en Panel › Ajustes (tusdatos_activo)";
    if (existente) {
      return json({ consultado: false, motivo, estado: existente.resultado, anotada: false }, 200);
    }
    /*
      Qué se anota sin consulta lo dice el parámetro
      `antecedentes_resultado_si_apagado`. Hasta el 18/10/2026 era «aprobada»
      escrito aquí: con el interruptor apagado todo huésped salía aprobado sin
      que nadie lo hubiera mirado. El cliente decidió que no: hoy vale
      `error_proveedor`, que lleva al anfitrión a revisarlo a mano como «no se
      pudo consultar». El proveedor sigue siendo `simulado`.
    */
    let resultadoSiApagado: string;
    try {
      resultadoSiApagado = await parametro(admin, "antecedentes_resultado_si_apagado");
    } catch (e) {
      return json({ error: e instanceof Error ? e.message : String(e) }, 500);
    }
    const { error } = await admin.rpc("anotar_verificacion", {
      p_invitado_id: invitadoId,
      p_proveedor: "simulado",
      p_referencia: null,
      p_resultado: resultadoSiApagado,
      p_respuesta: { motivo },
    });
    return json(
      {
        consultado: false,
        motivo,
        estado: resultadoSiApagado,
        anotada: !error,
        noSeAnoto: error?.message ?? null,
      },
      200,
    );
  }

  const conexion: Conexion = {
    base: ajustes.base,
    usuario,
    clave,
  };
  const proveedor = ajustes.ambiente === "pruebas" ? "tusdatos-pruebas" : "tusdatos";

  /**
   * Escribe sobre la fila del huésped, **y devuelve si pudo**.
   *
   * Lo segundo no es adorno: en Supabase el error no se lanza, se devuelve, y
   * un `await` que no lo mira responde tan contento sin haber escrito nada.
   */
  const resolver = async (
    resultado: Anotado,
    referencia: string | null,
    respuesta: unknown,
  ): Promise<string | null> => {
    const { error } = await admin.rpc("resolver_verificacion", {
      p_invitado_id: invitadoId,
      p_proveedor: proveedor,
      p_referencia: referencia,
      p_resultado: resultado,
      p_respuesta: respuesta,
    });
    return error ? error.message : null;
  };

  // Ya la tiene, y de este mismo proveedor: no se vuelve a pagar por ella.
  if (
    existente?.proveedor === proveedor &&
    (existente.resultado === "aprobada" || existente.resultado === "rechazada")
  ) {
    return json(
      { consultado: false, estado: existente.resultado, motivo: "Ese huésped ya estaba verificado" },
      200,
    );
  }

  /*
    Una `pendiente` de este proveedor con su identificador es una consulta
    **ya pagada** que no se llegó a recoger. Se pregunta por ella en vez de
    lanzar otra.
  */
  let jobid: string | null =
    existente?.proveedor === proveedor && existente.resultado === "pendiente"
      ? existente.referencia_externa
      : null;
  const recogida = jobid !== null;

  let intentos: number;
  let esperaMs: number;
  let nivelQuePideRevision: string;
  let fuentesObligatorias: string[];
  try {
    const [i, segundos, nivel, fuentes] = await Promise.all([
      parametroEntero(admin, "antecedentes_consulta_intentos"),
      parametroEntero(admin, "antecedentes_consulta_espera_segundos"),
      parametro(admin, "antecedentes_nivel_que_pide_revision", condominioId),
      fuentesObligatoriasDe(admin as unknown as Parameters<typeof fuentesObligatoriasDe>[0], condominioId),
    ]);
    intentos = i;
    esperaMs = segundos * 1000;
    nivelQuePideRevision = nivel;
    fuentesObligatorias = fuentes;
  } catch (e) {
    // Antes de lanzar: si no se pueden leer, no se gasta nada.
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
  if (!esNivelDeRevision(nivelQuePideRevision)) {
    return json(
      { error: `antecedentes_nivel_que_pide_revision no es un nivel válido: "${nivelQuePideRevision}"` },
      500,
    );
  }

  try {

    if (!jobid) {
      const typedoc = tipoDocumentoDeTusdatos(invitado.tipo_documento);
      /*
        La fecha sale de la base: la pide el preregistro desde el 14/10/2026.
        La del cuerpo queda solo para quien la llame sin ella guardada.
      */
      const fecha = fechaParaTusdatos(
        invitado.documento_fecha_expedicion ?? cuerpo.fechaExpedicion,
      );

      /*
        Lo que no se puede consultar **no se consulta ni se aprueba**, y
        tampoco gasta un cupo de la vivienda: se dice por qué y ya.
      */
      const impide = !invitado.documento_numero
        ? "Esa persona no tiene número de documento registrado"
        : !typedoc
          ? `tusdatos no acepta el tipo de documento «${invitado.tipo_documento}». ` +
            "Si es un PEP venezolano, hay que pedirle el PPT: el PEP dejó de valer en marzo de 2023."
          : pideFechaDeExpedicion(typedoc) && !fecha
            ? "Para cédula de extranjería y PPT, tusdatos exige la fecha de expedición del documento"
            : null;
      if (impide || !typedoc || !invitado.documento_numero) {
        return json({ consultado: false, motivo: impide, anotada: false, proveedor }, 200);
      }

      // Primero la fila. Si no hay de dónde descontarla, no se lanza nada.
      if (!existente) {
        const { error } = await admin.rpc("anotar_verificacion", {
          p_invitado_id: invitadoId,
          p_proveedor: proveedor,
          p_referencia: null,
          p_resultado: "pendiente",
          p_respuesta: { motivo: "Reservada antes de lanzar la consulta" },
        });
        if (error) {
          return json({ consultado: false, motivo: error.message, anotada: false }, 200);
        }
      }

      const lanzada = await lanzarConsulta(conexion, {
        doc: invitado.documento_numero,
        typedoc,
        nombre: `${invitado.nombre ?? ""} ${invitado.apellidos ?? ""}`.trim() || undefined,
        fechaExpedicion: fecha ?? undefined,
        referencia: `invitado:${invitadoId}`,
      });
      jobid = lanzada.jobid;

      // El identificador se guarda ya: es lo único que hace recuperable una
      // consulta pagada si esto se cae antes de terminar.
      const fallo = await resolver("pendiente", jobid, { jobid, validado: lanzada.validado });
      if (fallo) {
        return json({ consultado: true, estado: "sin_anotar", jobid, noSeAnoto: fallo }, 200);
      }
    }

    if (!jobid) throw new Error("No hay identificador de la consulta");

    for (let i = 0; i < intentos; i += 1) {
      // Una recogida pregunta de inmediato: lleva esperando desde la otra vez.
      if (i > 0 || !recogida) await dormir(esperaMs);

      const r = await consultarResultado(conexion, jobid);
      if (r.estado === "procesando") continue;

      const v = veredicto(r, nivelQuePideRevision, fuentesObligatorias);
      const fallo = await resolver(v.resultado, jobid, {
        motivo: v.motivo,
        nivel: r.nivel,
        reporteId: r.reporteId,
        fuentesConError: r.fuentesConError,
        validado: r.validado,
        resumen: r.datos,
      });
      return json(
        {
          consultado: true,
          estado: v.resultado,
          motivo: v.motivo,
          nivel: r.nivel,
          jobid,
          noSeAnoto: fallo,
        },
        200,
      );
    }

    // Se acabaron los intentos y sigue procesando. La fila queda en
    // `pendiente` con su identificador: volver a llamar la recoge sin pagar
    // otra vez, mientras no pasen dos horas.
    return json({ consultado: true, estado: "pendiente", jobid }, 200);
  } catch (e) {
    /*
      `e instanceof Error` es `false` para lo que devuelve Supabase --es un
      objeto plano-- pero aquí lo que llega son errores que lanzamos nosotros
      desde `tusdatos.ts`, que sí lo son. Se deja el `String(e)` de red por si
      acaso: un `catch` que pierde el motivo es el defecto que ya costó que
      nadie supiera por qué fallaba un preregistro.
    */
    const motivo = e instanceof Error ? e.message : String(e);
    const causa = e instanceof ConsultaRechazada ? e.motivo : "red";
    /*
      Si ya hay identificador, la consulta está lanzada y pagada: lo que falló
      fue preguntar por ella. Marcarla como error haría que la siguiente
      llamada lanzara --y pagara-- otra. Se queda en `pendiente`.
    */
    if (jobid) {
      return json({ consultado: true, estado: "pendiente", jobid, motivo, causa }, 200);
    }
    const fallo = await resolver("error_proveedor", null, { motivo, causa });
    return json(
      { consultado: false, estado: "error_proveedor", motivo, causa, noSeAnoto: fallo },
      // Que la persona prohíba la consulta no es un fallo del servidor.
      causa === "titular" ? 200 : 502,
    );
  }
});
