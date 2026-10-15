import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { enDias, entrarComo, salir, servicio } from "./cliente";
import { crearVisita } from "@/features/visitas/services/visitas.repo";

/**
 * Recorrido: «Tu visita ingresó» le llega a quien le toca (15/10/2026).
 *
 * Recorriendo la portería, la entrada de una huésped a la 102 avisó a seis
 * personas: la anfitriona y cinco huéspedes de la 102, uno de agosto y otro de
 * 2030. Un huésped no tiene por qué enterarse de quién llega a la casa, y uno
 * que ya se fue, menos.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const MARCA = "[prueba] aviso de ingreso a quien toca";

let visitaId = "";
let invitadoId = "";

async function avisadosDe(visita: string): Promise<string[]> {
  const { data } = await servicio
    .from("notificacion")
    .select("usuario_id")
    .eq("entidad_id", visita)
    .eq("tipo", "visita_ingreso");
  const ids = (data ?? []).map((n) => n.usuario_id as string);
  const correos: string[] = [];
  for (const id of ids) {
    const { data: u } = await servicio.auth.admin.getUserById(id);
    if (u.user?.email) correos.push(u.user.email);
  }
  return correos.sort();
}

beforeAll(async () => {
  await entrarComo("vecino@veciyo.test");
  visitaId = await crearVisita({
    condominioId: CONDOMINIO,
    unidadId: U102,
    tipo: "amigos",
    fechaDesde: enDias(0),
    fechaHasta: enDias(0),
    anotacionesIngreso: MARCA,
    invitados: [{ nombre: `${MARCA} amiga` }],
  });
  await salir();
  const { data } = await servicio.from("invitado").select("id").eq("visita_id", visitaId).single();
  invitadoId = data!.id;
  // Lo que hace la portería al marcar la llegada.
  const { error } = await servicio
    .from("invitado")
    .update({ ingreso_en: new Date().toISOString() })
    .eq("id", invitadoId);
  if (error) throw error;
});

afterAll(async () => {
  await servicio.from("notificacion").delete().eq("entidad_id", visitaId);
  await servicio.from("invitado").delete().eq("visita_id", visitaId);
  await servicio.from("visita").delete().eq("id", visitaId);
});

describe("una visita de Sofía entra a la 102", () => {
  it("se avisa a Sofía", async () => {
    expect(await avisadosDe(visitaId)).toContain("vecino@veciyo.test");
  });

  it("no a los huéspedes de la 102, ni pasados, ni futuros, ni actuales", async () => {
    const avisados = await avisadosDe(visitaId);
    for (const huesped of [
      "huesped.pasado@veciyo.test",
      "huesped.futuro@veciyo.test",
      "laura.invitada@veciyo.test",
      "nuevo.inquilino@veciyo.test",
      "marie.prueba@veciyo.test",
    ]) {
      expect(avisados).not.toContain(huesped);
    }
  });
});
