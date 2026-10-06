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
 * ----------------------------------------------------------------------------
 * Por qué no espera el resultado aquí
 * ----------------------------------------------------------------------------
 * La consulta tarda **alrededor de un minuto** y el identificador caduca a las
 * dos horas. Dejar la petición abierta un minuto es tener a alguien mirando una
 * rueda girar, y una función de servidor que espera así se queda sin tiempo.
 *
 * Se consulta unas pocas veces --respetando los cinco segundos que ellos
 * piden-- y si no ha terminado, se devuelve `pendiente` con el identificador.
 * La fila queda escrita con ese identificador, así que la respuesta se puede
 * recoger después sin volver a pagar. **Lo que falta para cerrarlo bien es su
 * webhook**, y está anotado.
 */
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  consultarResultado,
  lanzarConsulta,
  pedirToken,
  tipoDocumentoDeTusdatos,
} from "../_compartido/tusdatos.ts";
import { CORS, responderPreflight } from "../_compartido/cors.ts";

const json = (cuerpo: unknown, status: number) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

/** Cuántas veces se pregunta antes de rendirse y devolver `pendiente`. */
const INTENTOS = 8;
/** Lo que tusdatos pide entre peticiones. */
const ESPERA_MS = 5_000;

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

Deno.serve(async (req: Request) => {
  // El `OPTIONS` primero, siempre: sin esto lo que llega al navegador es un
  // «Failed to fetch» sin estado ni motivo. Pasó con las seis funciones.
  const previo = responderPreflight(req);
  if (previo) return previo;

  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  let cuerpo: { invitadoId?: string };
  try {
    cuerpo = await req.json();
  } catch {
    return json({ error: "Cuerpo inválido" }, 400);
  }
  if (!cuerpo.invitadoId) return json({ error: "Falta invitadoId" }, 400);

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

  const { data: esAnfitrion, error: errorPermiso } = await comoUsuario.rpc(
    "es_anfitrion_del_invitado",
    { p_invitado_id: cuerpo.invitadoId },
  );
  if (errorPermiso) return json({ error: errorPermiso.message }, 500);
  if (!esAnfitrion) {
    return json(
      { error: "Solo el anfitrión del alojamiento puede pedir la verificación" },
      403,
    );
  }

  const { data: invitado, error: errorInvitado } = await admin
    .from("invitado")
    .select("id, nombre, apellidos, documento_numero, tipo_documento")
    .eq("id", cuerpo.invitadoId)
    .maybeSingle();
  if (errorInvitado) return json({ error: errorInvitado.message }, 500);
  if (!invitado) return json({ error: "Ese invitado no existe" }, 404);

  /**
   * Anota la verificación, **y devuelve si pudo**.
   *
   * Lo segundo no es adorno. `anotar_verificacion` rechaza a quien ya tiene una
   * --«Ese huésped ya tiene una verificación»-- y también a la vivienda sin
   * suscripción o sin periodo abierto. La primera versión de esto hacía
   * `await anotar(...)` sin mirar el resultado, y la función respondía tan
   * contenta mientras **no se había escrito nada**: salió al probarla, porque
   * ese huésped ya tenía una de antes.
   *
   * Es la familia de «una limpieza que no comprueba si limpió no es una
   * limpieza», aplicada a una escritura.
   */
  const anotar = async (
    resultado: "pendiente" | "aprobada" | "rechazada" | "error_proveedor",
    proveedor: string,
    referencia: string | null,
    respuesta: unknown,
  ): Promise<string | null> => {
    const { error } = await admin.rpc("anotar_verificacion", {
      p_invitado_id: cuerpo.invitadoId,
      p_proveedor: proveedor,
      p_referencia: referencia,
      p_resultado: resultado,
      p_respuesta: respuesta,
    });
    return error ? error.message : null;
  };

  const usuario = Deno.env.get("TUSDATOS_USUARIO");
  const clave = Deno.env.get("TUSDATOS_CLAVE");
  const activo = Deno.env.get("TUSDATOS_ACTIVO") === "true";

  // --------------------------------------------------------------------------
  // Apagada: se anota y se dice por qué, sin salir a internet
  // --------------------------------------------------------------------------
  if (!usuario || !clave || !activo) {
    const motivo = !usuario || !clave
      ? "Todavía no hay credenciales de tusdatos"
      : "La verificación con tusdatos está desactivada a propósito (TUSDATOS_ACTIVO)";
    const noSeAnoto = await anotar("aprobada", "simulado", null, { motivo });
    return json({ consultado: false, motivo, anotada: !noSeAnoto, noSeAnoto }, 200);
  }

  const typedoc = tipoDocumentoDeTusdatos(invitado.tipo_documento);
  if (!typedoc || !invitado.documento_numero) {
    /*
      No se consulta y **no se aprueba**: decir «aprobada» porque no sabemos
      leer su documento sería afirmar que miramos cuando no miramos. Queda
      `error_proveedor` con el motivo, que es lo que de verdad pasó.
    */
    const motivo = !invitado.documento_numero
      ? "Esa persona no tiene número de documento registrado"
      : `tusdatos no acepta el tipo de documento «${invitado.tipo_documento}». ` +
        "Si es un PEP venezolano, hay que pedirle el PPT: el PEP dejó de valer en marzo de 2023.";
    const noSeAnoto = await anotar("error_proveedor", "tusdatos", null, { motivo });
    return json({ consultado: false, motivo, anotada: !noSeAnoto, noSeAnoto }, 200);
  }

  try {
    const token = await pedirToken({ usuario, clave });
    const jobid = await lanzarConsulta({
      token,
      doc: invitado.documento_numero,
      typedoc,
      nombre: `${invitado.nombre ?? ""} ${invitado.apellidos ?? ""}`.trim() || undefined,
    });

    /*
      La fila se escribe **antes** de preguntar por el resultado, con el
      identificador dentro. Si esto se cae a mitad, el crédito ya se gastó y lo
      único que lo hace recuperable es tener guardado el identificador.
    */
    const noSeAnoto = await anotar("pendiente", "tusdatos", jobid, { jobid });
    if (noSeAnoto) {
      /*
        Aquí ya se gastó un crédito. Si la fila no se pudo escribir --el huésped
        ya tenía una verificación, o la vivienda no tiene de dónde descontar--
        lo que **no** se puede hacer es callarlo: el identificador se devuelve
        para que la consulta se pueda recoger a mano antes de las dos horas.
      */
      return json(
        { consultado: true, estado: "sin_anotar", jobid, error: noSeAnoto },
        200,
      );
    }

    for (let i = 0; i < INTENTOS; i += 1) {
      await dormir(ESPERA_MS);
      const r = await consultarResultado(token, jobid);

      if (r.estado === "procesando") continue;

      if (r.estado === "error") {
        const fallo = await anotar("error_proveedor", "tusdatos", jobid, r.datos);
        return json({ consultado: true, estado: "error", jobid, noSeAnoto: fallo }, 200);
      }

      /*
        `hallazgos === null` es «terminó y no sabemos interpretarlo», y eso no
        se traduce a aprobada: se guarda la respuesta entera y se marca como
        error del proveedor para que alguien la mire. Aprobar por no entender
        es la peor de las tres opciones.
      */
      const resultado =
        r.hallazgos === null
          ? "error_proveedor"
          : r.hallazgos
            ? "rechazada"
            : "aprobada";
      const fallo = await anotar(resultado, "tusdatos", jobid, r.datos);
      return json({ consultado: true, estado: resultado, jobid, noSeAnoto: fallo }, 200);
    }

    // Se acabaron los intentos y sigue procesando. La fila queda en
    // `pendiente` con su identificador: se puede recoger después sin pagar
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
    const fallo = await anotar("error_proveedor", "tusdatos", null, { motivo });
    return json({ consultado: false, error: motivo, noSeAnoto: fallo }, 502);
  }
});
