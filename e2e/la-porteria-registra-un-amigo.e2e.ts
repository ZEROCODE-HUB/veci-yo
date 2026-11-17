import { expect, test } from "@playwright/test";
import { CONDOMINIO, CUENTA, UNIDAD, entrarComo, servicio, sinError } from "./apoyo";

/**
 * La portería registra a un amigo que llega sin documento (16/11/2026, pedido
 * del cliente: «Si es Amigo o Familiar no pide documento — depende de la regla
 * del edificio»).
 *
 * De punta a punta y por la pantalla: Inicio › Registrar › «Amigos -
 * Familiares», la vivienda, el nombre, quién aprobó, y Aceptar. Con la regla
 * del edificio apagada --que es como viene-- el documento sale «opcional» y la
 * visita queda dentro, a nombre del guardia.
 *
 * Sin la marca `[prueba` a propósito: la limpieza global de vitest barre esas
 * visitas, y esta se limpia aquí, por id.
 */

const MARCA = `E2E porteria amigo ${Date.now()}`;

/*
  El guardia de prueba trabaja unas horas sueltas: fuera de ellas la app solo
  le deja su perfil. Se le pone de turno todo el día mientras dura la prueba,
  como `deTurnoMientrasDure` en los recorridos, y se devuelve lo que hubiera.
*/
let turnoPuesto: string | null = null;
let turnoQueHabia: Record<string, unknown> | null = null;

test.beforeAll(async () => {
  sinError(
    "regla apagada",
    await servicio.from("condominio").update({ documento_amigos_obligatorio: false }).eq("id", CONDOMINIO),
  );
  const { data: usuarios } = await servicio.auth.admin.listUsers({ perPage: 1000 });
  const guardia = usuarios.users.find((u) => u.email === CUENTA.guardia);
  const membresia = sinError(
    "membresía del guardia",
    await servicio
      .from("membresia_condominio")
      .select("id")
      .eq("usuario_id", guardia?.id ?? "")
      .eq("condominio_id", CONDOMINIO)
      .eq("rol", "guardia")
      .single(),
  );
  const hoy = sinError("hoy", await servicio.rpc("hoy_en_el_edificio", { p_condominio_id: CONDOMINIO }));
  const { data: habia } = await servicio
    .from("turno_override")
    .select("*")
    .eq("membresia_id", membresia.id)
    .eq("fecha", hoy)
    .maybeSingle();
  if (habia) {
    turnoQueHabia = habia;
    sinError("apartar el turno de hoy", await servicio.from("turno_override").delete().eq("id", habia.id));
  }
  const puesto = sinError(
    "poner de turno",
    await servicio
      .from("turno_override")
      .insert({
        membresia_id: membresia.id,
        fecha: hoy,
        hora_inicio: "00:00",
        hora_fin: "23:59:59",
        motivo: "[prueba] de turno mientras dura la prueba",
      })
      .select("id")
      .single(),
  );
  turnoPuesto = puesto.id;
});

test.afterAll(async () => {
  if (turnoPuesto) {
    sinError("quitar el turno", await servicio.from("turno_override").delete().eq("id", turnoPuesto));
  }
  if (turnoQueHabia) {
    sinError("devolver el turno de antes", await servicio.from("turno_override").insert(turnoQueHabia));
  }
  const { data } = await servicio.from("visita").select("id").eq("anotaciones_ingreso", MARCA);
  for (const v of data ?? []) {
    await servicio.from("notificacion").delete().eq("entidad_id", v.id);
    await servicio.from("invitado").delete().eq("visita_id", v.id);
    sinError("borrar la visita", await servicio.from("visita").delete().eq("id", v.id));
  }
});

test("el guardia registra a un amigo sin documento", async ({ page }) => {
  const guardiaId = await entrarComo(page, CUENTA.guardia, "guardia");

  await page.getByText("Registrar", { exact: true }).first().click();
  // Solo las dos que le tocan.
  await expect(page.getByText("Amigos - Familiares").first()).toBeVisible();
  await expect(page.getByText("Profesional Temporal").first()).toBeVisible();
  await expect(page.getByText("Profesional Permanente")).toHaveCount(0);
  await page.getByText("Amigos - Familiares").first().click();

  await page.getByRole("button", { name: /^Torre \*:/ }).click();
  await page.getByRole("menuitem", { name: "Torre 1", exact: true }).click();
  await page.getByRole("button", { name: /^Depto \*:/ }).click();
  await page.getByRole("menuitem", { name: "101", exact: true }).click();

  await page.getByPlaceholder("Nombre completo").fill("Laura Gómez");
  // Con la regla del edificio apagada no se le pide.
  await expect(page.getByText("Documento (opcional)")).toBeVisible();
  await page.getByPlaceholder("Nombre de quien aprobó").fill("Guillermo");
  await page.getByPlaceholder(/Ej\.: ingresó con una maleta/).fill(MARCA);

  await page.getByText("Aceptar", { exact: true }).click();
  await expect(page.getByText("Visita registrada")).toBeVisible();

  const visita = sinError(
    "la visita",
    await servicio
      .from("visita")
      .select("id, estado, tipo, unidad_id, registrada_por, autorizada_por_nombre")
      .eq("anotaciones_ingreso", MARCA)
      .single(),
  );
  expect(visita).toMatchObject({
    estado: "ingresada",
    tipo: "amigos",
    unidad_id: UNIDAD.u101,
    registrada_por: guardiaId,
    autorizada_por_nombre: "Guillermo",
  });
  const gente = sinError(
    "la persona",
    await servicio.from("invitado").select("nombre, documento_numero, llego").eq("visita_id", visita.id),
  );
  expect(gente).toEqual([{ nombre: "Laura Gómez", documento_numero: null, llego: true }]);
});
