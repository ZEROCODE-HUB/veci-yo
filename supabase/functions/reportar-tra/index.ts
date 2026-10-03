/**
 * reportar-tra · manda la Tarjeta de Registro de Alojamiento al MinCIT
 *
 * Resolución 409 de 2022. El huésped principal va a `/one/` y devuelve un
 * `code`; cada acompañante va a `/two/` llevando ese `code` como `padre`.
 *
 * ----------------------------------------------------------------------------
 * Modo prueba
 * ----------------------------------------------------------------------------
 * **Sin token no se sale a internet: se arma el reporte y se devuelve entero.**
 * Es la misma decisión que `enviar-correo` toma con el SMTP, y por el mismo
 * motivo: el token de la TRA lo saca cada anfitrión con su RNT, y hasta que
 * exista uno el flujo tiene que poder recorrerse de principio a fin.
 *
 * Lo que se habría mandado queda guardado en `reporte_legal` con estado
 * `simulado`, así que se puede mirar exactamente qué iba a recibir el
 * ministerio. No es un doble: es el cuerpo de verdad, armado por el mismo
 * código, al que solo le falta salir.
 *
 * ----------------------------------------------------------------------------
 * Lo que no hace, a propósito
 * ----------------------------------------------------------------------------
 * No reintenta solo. Un reporte al Estado que se repite sin que nadie lo mire
 * puede acabar declarando dos veces la misma estancia, y deshacer eso no se
 * hace por API. Si falla, queda el error escrito y el anfitrión vuelve a
 * pulsar.
 */
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  cuerpoAcompanante,
  cuerpoPrincipal,
  loQueFalta,
  TRA_ACOMPANANTE,
  TRA_PRINCIPAL,
} from "../_compartido/tra.ts";

const json = (cuerpo: unknown, status: number) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const autorizacion = req.headers.get("Authorization");
  if (!autorizacion) return json({ error: "Falta la sesión" }, 401);

  let peticion: { visitaId?: string };
  try {
    peticion = await req.json();
  } catch {
    return json({ error: "Cuerpo inválido" }, 400);
  }
  if (!peticion.visitaId) return json({ error: "Falta visitaId" }, 400);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const servicio = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  /*
    Con la sesión de quien llama: es lo que decide si puede reportar esta
    estancia. La RPC comprueba que mande en la vivienda y devuelve, de paso,
    todo lo que el reporte necesita.
  */
  const comoLaPersona = createClient(url, anon, {
    global: { headers: { Authorization: autorizacion } },
    auth: { persistSession: false },
  });

  const { data: datos, error: errorDatos } = await comoLaPersona.rpc(
    "datos_para_la_tra",
    { p_visita_id: peticion.visitaId },
  );
  if (errorDatos) return json({ error: errorDatos.message }, 403);

  const filas = (datos ?? []) as Array<{
    invitado_id: string;
    es_titular: boolean;
    nombres: string;
    apellidos: string | null;
    tipo_documento: string | null;
    documento: string | null;
    ciudad_residencia: string | null;
    ciudad_procedencia: string | null;
    numero_habitacion: string;
    check_in: string;
    check_out: string;
    motivo: string | null;
    tipo_acomodacion: string;
    costo: number | null;
    nombre_establecimiento: string;
    rnt: string | null;
    tiene_token: boolean;
  }>;

  if (filas.length === 0) {
    return json({ error: "Esa estancia no tiene huéspedes que reportar" }, 400);
  }

  const titular = filas.find((f) => f.es_titular);
  if (!titular) {
    return json({ error: "Esa estancia no tiene un huésped principal" }, 400);
  }
  const acompanantes = filas.filter((f) => !f.es_titular);

  const estancia = {
    numeroHabitacion: titular.numero_habitacion,
    checkIn: titular.check_in,
    checkOut: titular.check_out,
    motivo: titular.motivo,
    numeroAcompanantes: acompanantes.length,
    tipoAcomodacion: titular.tipo_acomodacion,
    costo: titular.costo,
    nombreEstablecimiento: titular.nombre_establecimiento,
    rnt: titular.rnt,
  };

  const persona = (f: typeof titular) => ({
    nombres: f.nombres,
    apellidos: f.apellidos,
    tipoDocumento: f.tipo_documento,
    documento: f.documento,
    ciudadResidencia: f.ciudad_residencia,
    ciudadProcedencia: f.ciudad_procedencia,
  });

  /*
    Lo que falta se comprueba **antes** de salir a internet, y entero: el error
    del ministerio no distingue qué campo está mal, así que descubrirlo de uno
    en uno serían cinco viajes para cinco faltas.
  */
  const faltan = loQueFalta(persona(titular), estancia);
  if (faltan.length > 0) {
    return json(
      {
        error: `Antes de reportar al ministerio falta: ${faltan.join(", ")}.`,
        faltan,
      },
      400,
    );
  }

  const cuerpoDelTitular = cuerpoPrincipal(persona(titular), estancia);
  const admin = createClient(url, servicio, { auth: { persistSession: false } });

  /** Deja constancia de lo que se mandó y de cómo fue. */
  const anotar = async (
    invitadoId: string,
    estado: string,
    enviado: unknown,
    respuesta: unknown,
    error: string | null,
  ) => {
    await admin.from("reporte_legal").upsert(
      {
        invitado_id: invitadoId,
        tipo: "tra",
        momento: "entrada",
        estado,
        rnt_referencia: titular.rnt,
        enviado,
        respuesta,
        error_detalle: error,
        enviado_en: estado === "enviado" ? new Date().toISOString() : null,
      },
      { onConflict: "invitado_id,tipo,momento" },
    );
  };

  // ------------------------------------------------------------------------
  // Sin token: se arma, se guarda y se devuelve. No se sale a internet.
  // ------------------------------------------------------------------------
  if (!titular.tiene_token) {
    await anotar(titular.invitado_id, "simulado", cuerpoDelTitular, null, null);

    const cuerposAcompanantes = acompanantes.map((a) =>
      cuerpoAcompanante(persona(a), estancia, 0),
    );
    for (const [i, a] of acompanantes.entries()) {
      await anotar(a.invitado_id, "simulado", cuerposAcompanantes[i], null, null);
    }

    return json(
      {
        enviado: false,
        motivo: "Todavía no hay token del ministerio para este alojamiento",
        principal: cuerpoDelTitular,
        acompanantes: cuerposAcompanantes,
      },
      200,
    );
  }

  // ------------------------------------------------------------------------
  // Con token: el principal primero, porque su `code` agrupa a los demás.
  // ------------------------------------------------------------------------
  const { data: token, error: errorToken } = await admin.rpc("token_tra_de_visita", {
    p_visita_id: peticion.visitaId,
  });
  if (errorToken || !token) {
    return json({ error: "No se pudo leer el token del alojamiento" }, 500);
  }

  let code: number;
  try {
    const respuesta = await fetch(TRA_PRINCIPAL, {
      method: "POST",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cuerpoDelTitular),
      signal: AbortSignal.timeout(30_000),
    });

    const texto = await respuesta.text();
    let cuerpo: Record<string, unknown> = {};
    try {
      cuerpo = JSON.parse(texto);
    } catch {
      cuerpo = { crudo: texto };
    }

    if (!respuesta.ok) {
      await anotar(
        titular.invitado_id,
        "error",
        cuerpoDelTitular,
        cuerpo,
        `El ministerio respondió ${respuesta.status}`,
      );
      return json(
        { error: `El ministerio rechazó el reporte (${respuesta.status})`, respuesta: cuerpo },
        502,
      );
    }

    /*
      El `code` es lo que agrupa a los acompañantes con su titular. Si no viene,
      no se sigue: mandarlos sin `padre` los declararía como estancias sueltas,
      y eso no se deshace por API.
    */
    const devuelto = Number(cuerpo.code ?? cuerpo.Code ?? NaN);
    if (!Number.isFinite(devuelto)) {
      await anotar(
        titular.invitado_id,
        "error",
        cuerpoDelTitular,
        cuerpo,
        "El ministerio aceptó el reporte pero no devolvió el código que agrupa a los acompañantes",
      );
      return json(
        { error: "El ministerio no devolvió el código del huésped principal", respuesta: cuerpo },
        502,
      );
    }

    code = devuelto;
    await anotar(titular.invitado_id, "enviado", cuerpoDelTitular, cuerpo, null);
  } catch (error) {
    const motivo =
      error instanceof Error && error.name === "TimeoutError"
        ? "El ministerio tardó demasiado en responder"
        : "No se pudo hablar con el ministerio";
    await anotar(titular.invitado_id, "error", cuerpoDelTitular, null, motivo);
    return json({ error: motivo }, 502);
  }

  const problemas: string[] = [];
  for (const acompanante of acompanantes) {
    const cuerpo = cuerpoAcompanante(persona(acompanante), estancia, code);
    try {
      const respuesta = await fetch(TRA_ACOMPANANTE, {
        method: "POST",
        headers: {
          Authorization: `token ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cuerpo),
        signal: AbortSignal.timeout(30_000),
      });
      const texto = await respuesta.text();

      if (!respuesta.ok) {
        problemas.push(`${acompanante.nombres}: el ministerio respondió ${respuesta.status}`);
        await anotar(acompanante.invitado_id, "error", cuerpo, { crudo: texto }, `HTTP ${respuesta.status}`);
        continue;
      }
      await anotar(acompanante.invitado_id, "enviado", cuerpo, { crudo: texto }, null);
    } catch {
      problemas.push(`${acompanante.nombres}: no se pudo mandar`);
      await anotar(acompanante.invitado_id, "error", cuerpo, null, "No se pudo hablar con el ministerio");
    }
  }

  return json({ enviado: true, code, acompanantes: acompanantes.length, problemas }, 200);
});
