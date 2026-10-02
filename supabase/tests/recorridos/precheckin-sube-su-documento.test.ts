import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio, supabase } from "./cliente";
import { abrirPrecheckin } from "@/features/visitas/services/precheckin.repo";

/**
 * Recorrido: la foto del documento de quien todavía no tiene cuenta.
 *
 * El preregistro pedía una foto del documento, la pantalla avisaba de que era
 * opcional, y **no iba a ninguna parte**: el bucket `visitas` es privado, sus
 * políticas derivan de quién puede ver la visita, y quien hace el preregistro
 * no tiene sesión --por definición: todavía no es nadie en el sistema--.
 *
 * Se dejó opcional el 25/09/2026 para desbloquear la demo (REVISAR-A-OJO 31).
 * Esto es lo que faltaba: una función de servidor que **comprueba el enlace** y
 * sube con permisos de servidor, porque un enlace no es una sesión y no hay a
 * quién darle el permiso con una política.
 *
 * La prueba va contra la función desplegada, sin sesión ninguna --que es
 * exactamente la situación del huésped-- y comprueba las dos mitades: que lo
 * guarda cuando el enlace es bueno, y que no lo guarda cuando no lo es.
 */
const ANFITRIONA = "vecino@veciyo.test";
const UNIDAD_102 = "44444444-4444-4444-4444-444444444443";

/** Un PNG de un pixel, que es una imagen de verdad y pesa nada. */
const PNG_1PX =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

let visitaId = "";
let invitadoId = "";
let token = "";
let funcion = "";

/** Llama a la función como lo haría el navegador del huésped: sin sesión. */
async function subir(cuerpo: Record<string, unknown>) {
  const respuesta = await fetch(funcion, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
  return { estado: respuesta.status, datos: await respuesta.json() };
}

beforeAll(async () => {
  /*
    La URL sale del mismo cliente que usa el resto del arnés: `process.env` no
    la tiene --el arnés lee `.env.local` por su cuenta-- y fiarse de ella daba
    `undefined/functions/v1/...`.
  */
  funcion = `${(supabase as unknown as { supabaseUrl: string }).supabaseUrl}/functions/v1/subir-documento-precheckin`;

  await entrarComo(ANFITRIONA);

  const { data: visita, error } = await supabase
    .from("visita")
    .insert({
      condominio_id: "11111111-1111-1111-1111-111111111111",
      unidad_id: UNIDAD_102,
      tipo: "huesped_temporal",
      estado: "programada",
      fecha_desde: "2027-09-10",
      fecha_hasta: "2027-09-14",
    })
    .select("id")
    .single();
  if (error) throw error;
  visitaId = visita.id;

  const { data: invitado, error: errorInvitado } = await supabase
    .from("invitado")
    .insert({
      visita_id: visitaId,
      orden: 0,
      nombre: "[prueba] Documento",
      es_titular: true,
    })
    .select("id")
    .single();
  if (errorInvitado) throw errorInvitado;
  invitadoId = invitado.id;

  /*
    El enlace del preregistro, por el mismo camino que usa la anfitriona.
    Devuelve la URL entera --`.../access/<token>`-- porque es lo que ella copia
    y manda; el token es el último tramo.
  */
  const { enlace } = await abrirPrecheckin(visitaId);
  token = enlace.split("/").pop() ?? "";
  expect(token, "la anfitriona tiene que poder abrir el preregistro").toBeTruthy();

  await salir();
});

afterAll(async () => {
  await servicio.storage.from("visitas").remove([
    `${visitaId}/documento-frente-${invitadoId}.png`,
    `${visitaId}/documento-reverso-${invitadoId}.png`,
  ]);
  await servicio
    .from("verificacion_documento")
    .delete()
    .eq("invitado_id", invitadoId);
  await servicio.from("invitado").delete().eq("id", invitadoId);
  await servicio.from("visita").delete().eq("id", visitaId);

  // Una limpieza que no comprueba si limpió no es una limpieza.
  const { data } = await servicio
    .from("visita")
    .select("id")
    .eq("id", visitaId);
  expect(data ?? []).toHaveLength(0);
});

describe("el huésped sube la foto de su documento", () => {
  it("sin tener cuenta, con el enlace que le llegó", async () => {
    const r = await subir({
      token,
      imagenBase64: PNG_1PX,
      contentType: "image/png",
    });

    expect(r.estado).toBe(200);
    expect(r.datos.guardado).toBe(true);
    expect(r.datos.ruta).toBe(`${visitaId}/documento-frente-${invitadoId}.png`);
  });

  it("y queda en el bucket, no en la pantalla", async () => {
    /*
      Lo que fallaba antes: la pantalla se quedaba con la URI local del selector
      --un `blob:` de la pestaña-- y al recargar no apuntaba a nada. Aquí se
      comprueba contra el bucket, que es lo único que sobrevive.
    */
    const { data, error } = await servicio.storage
      .from("visitas")
      .download(`${visitaId}/documento-frente-${invitadoId}.png`);

    expect(error).toBeNull();
    expect(data!.size).toBeGreaterThan(0);
  });

  it("y la portería lo encuentra, pendiente de comparar", async () => {
    // Que es lo que el guardia abre al llegar la persona: el documento está,
    // nadie lo ha comparado todavía.
    const { data } = await servicio
      .from("verificacion_documento")
      .select("estado, documento_original_path")
      .eq("invitado_id", invitadoId)
      .single();

    expect(data!.estado).toBe("pendiente");
    expect(data!.documento_original_path).toBe(
      `${visitaId}/documento-frente-${invitadoId}.png`,
    );
  });

  it("y el reverso va a su propia columna, sin pisar el frente", async () => {
    /*
      Una cedula tiene datos por detras y la pantalla pide las dos caras. Hasta
      el 02/10/2026 no habia columna para el reverso, asi que guardar solo el
      frente habria dejado la segunda foto siendo un campo que se rellena y se
      tira --justo la familia que se esta cerrando--.

      Se suben por separado, que es como las saca una persona: una foto, luego
      la otra.
    */
    const r = await subir({
      token,
      imagenBase64: PNG_1PX,
      contentType: "image/png",
      cara: "reverso",
    });
    expect(r.estado).toBe(200);

    const { data } = await servicio
      .from("verificacion_documento")
      .select("documento_original_path, documento_reverso_path")
      .eq("invitado_id", invitadoId)
      .single();

    expect(data!.documento_reverso_path).toBe(
      `${visitaId}/documento-reverso-${invitadoId}.png`,
    );
    // Y el frente sigue donde estaba: la segunda subida no pisa a la primera.
    expect(data!.documento_original_path).toBe(
      `${visitaId}/documento-frente-${invitadoId}.png`,
    );
  });
});

describe("y lo que la función no acepta", () => {
  it("un enlace inventado", async () => {
    const r = await subir({
      token: "a".repeat(64),
      imagenBase64: PNG_1PX,
      contentType: "image/png",
    });

    expect(r.estado).toBe(403);
    // El mismo mensaje que para un enlace vencido: a quien no lo tiene bueno
    // no se le cuenta cuál de las dos cosas pasó.
    expect(String(r.datos.error)).toContain("no es válido");
  });

  it("algo que no es una imagen", async () => {
    const r = await subir({
      token,
      imagenBase64: PNG_1PX,
      contentType: "application/pdf",
    });

    expect(r.estado).toBe(400);
  });

  it("y una petición a medias", async () => {
    const r = await subir({ token });

    expect(r.estado).toBe(400);
  });
});
