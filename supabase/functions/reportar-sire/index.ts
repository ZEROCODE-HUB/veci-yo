/**
 * reportar-sire · el reporte de extranjeros a Migración Colombia
 *
 * ----------------------------------------------------------------------------
 * Esto NO envía nada, y no es un olvido
 * ----------------------------------------------------------------------------
 * **SIRE no tiene API.** Es un portal; la única forma de automatizarlo es
 * generar un archivo plano y subirlo a mano. Y el formato exacto está en un
 * instructivo que solo se descarga desde dentro del portal, con una cuenta ya
 * creada.
 *
 * Así que lo que hace esto es lo único honesto que se puede hacer hoy:
 *
 *   · decide **a quién hay que reportar** —extranjeros, y solo si el edificio
 *     está en Colombia—, que eso sí está en el ABC público;
 *   · dice **qué falta** de cada uno para poder reportarlo;
 *   · y arma un **borrador del archivo**, marcado como provisional dentro.
 *
 * Lo que no hace es llamarle «enviado» a nada. El día que llegue el instructivo,
 * lo que cambia es el orden de las columnas; a quién y con qué datos ya está.
 *
 * Las multas por no reportar van de 5 a 131 millones de pesos, así que lo que
 * de verdad vale de esto hoy es la primera parte: **saber a quién le falta algo
 * antes de que llegue**.
 */
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  archivoSire,
  loQueFaltaSire,
  quienNecesitaSire,
  type Momento,
  type PersonaSire,
} from "../_compartido/sire.ts";
import { CORS, responderPreflight } from "../_compartido/cors.ts";

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

  let peticion: { visitaId?: string; momento?: Momento };
  try {
    peticion = await req.json();
  } catch {
    return json({ error: "Cuerpo inválido" }, 400);
  }
  if (!peticion.visitaId) return json({ error: "Falta visitaId" }, 400);

  const momento: Momento = peticion.momento === "salida" ? "salida" : "entrada";

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const servicio = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const comoLaPersona = createClient(url, anon, {
    global: { headers: { Authorization: autorizacion } },
    auth: { persistSession: false },
  });

  const { data, error } = await comoLaPersona.rpc("datos_para_el_sire", {
    p_visita_id: peticion.visitaId,
  });
  if (error) return json({ error: error.message }, 403);

  const filas = (data ?? []) as Array<{
    invitado_id: string;
    nombres: string;
    apellidos: string | null;
    tipo_documento: string | null;
    documento: string | null;
    fecha_nacimiento: string | null;
    nacionalidad: string | null;
    direccion_en_colombia: string;
    pais_del_alojamiento: string;
    check_in: string;
    check_out: string;
  }>;

  if (filas.length === 0) {
    return json({ error: "Esa estancia no tiene huéspedes" }, 400);
  }

  const pais = filas[0].pais_del_alojamiento;
  const fecha = momento === "entrada" ? filas[0].check_in : filas[0].check_out;

  const personas: Array<PersonaSire & { invitadoId: string }> = filas.map((f) => ({
    invitadoId: f.invitado_id,
    nombres: f.nombres,
    apellidos: f.apellidos,
    tipoDocumento: f.tipo_documento,
    documento: f.documento,
    fechaNacimiento: f.fecha_nacimiento,
    nacionalidad: f.nacionalidad,
    direccionEnColombia: f.direccion_en_colombia,
  }));

  const { reportables, sinNacionalidad } = quienNecesitaSire(personas, pais);

  /*
    Un edificio fuera de Colombia no reporta al SIRE. Se dice, en vez de
    devolver un archivo vacío que parecería que algo salió mal.
  */
  if (pais?.toUpperCase() !== "CO") {
    return json(
      {
        aplica: false,
        motivo: "El SIRE es de Colombia y este alojamiento no está allí",
      },
      200,
    );
  }

  /*
    A quien no dijo su nacionalidad no se le adivina: suponerla por el tipo de
    documento es falso --un colombiano puede entrar con pasaporte-- y
    equivocarse es o no reportar a quien tocaba, o meter a un nacional en un
    registro de extranjeros. Se señala para que el anfitrión se lo pregunte.
  */
  const avisos = sinNacionalidad.map(
    (p) => `${p.nombres}: falta su nacionalidad, así que no se sabe si hay que reportarlo`,
  );

  if (reportables.length === 0) {
    return json(
      {
        aplica: true,
        reportables: 0,
        avisos,
        motivo:
          avisos.length > 0
            ? "No hay nadie que reportar con los datos que hay"
            : "Ningún huésped de esta estancia es extranjero",
      },
      200,
    );
  }

  const faltas = reportables
    .map((p) => ({ nombre: p.nombres, falta: loQueFaltaSire(p) }))
    .filter((f) => f.falta.length > 0);

  if (faltas.length > 0) {
    return json(
      {
        aplica: true,
        error: "Falta información de algún huésped extranjero",
        faltas,
        avisos,
      },
      400,
    );
  }

  const archivo = archivoSire(reportables, momento, fecha);
  const admin = createClient(url, servicio, { auth: { persistSession: false } });

  /*
    Queda la constancia, con el borrador dentro. `simulado` y no `enviado`: esto
    no ha salido a ningún sitio, y el día que alguien pregunte qué se reportó, la
    diferencia es todo.
  */
  for (const persona of reportables) {
    await admin.from("reporte_legal").upsert(
      {
        invitado_id: (persona as PersonaSire & { invitadoId: string }).invitadoId,
        tipo: "sire",
        momento,
        estado: "simulado",
        enviado: { linea: archivo.split("\n").find((l) => l.includes(persona.documento ?? "")) },
        error_detalle: null,
      },
      { onConflict: "invitado_id,tipo,momento" },
    );
  }

  return json(
    {
      aplica: true,
      enviado: false,
      motivo:
        "El SIRE no tiene API: esto es el borrador del archivo, pendiente del formato oficial",
      reportables: reportables.length,
      avisos,
      archivo,
    },
    200,
  );
});
