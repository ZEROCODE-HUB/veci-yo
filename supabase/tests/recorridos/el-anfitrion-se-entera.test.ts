import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { enDias, entrarComo, salir, servicio, supabase } from "./cliente";
import { crearVisita } from "@/features/visitas/services/visitas.repo";
import { obtenerAvisosDeEstancia } from "@/features/home/services/notificaciones.repo";

/**
 * Recorrido: el anfitrión se entera de lo que pasa con sus huéspedes
 * (14/10/2026).
 *
 * Lo pidió la responsable de producto: salidas parciales, la salida del
 * último, el preregistro pendiente a pocos días; en el inicio del anfitrión y
 * configurables uno por uno en Perfil › Avisos.
 *
 * La estancia es de mañana a pasado en la 102: tiene que caer a 3 días o menos
 * para el aviso del preregistro. Las entradas y salidas se escriben con la
 * clave de servicio (la portería no ve fechas lejanas, y aquí lo que importa
 * es el aviso, no quién marca).
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const ANFITRIONA = "vecino@veciyo.test";

const MARCA = "[prueba] el anfitrion se entera";

let visitaId = "";
let sofiaId = "";
const ids: string[] = [];

async function avisos(tipo: string) {
  const { data } = await servicio
    .from("notificacion")
    .select("usuario_id, mensaje")
    .eq("entidad_id", visitaId)
    .eq("tipo", tipo);
  return data ?? [];
}

beforeAll(async () => {
  sofiaId = await entrarComo(ANFITRIONA);
  visitaId = await crearVisita({
    condominioId: CONDOMINIO,
    unidadId: U102,
    tipo: "huesped_temporal",
    fechaDesde: enDias(1),
    fechaHasta: enDias(2),
    anotacionesIngreso: MARCA,
    invitados: [
      { nombre: `${MARCA} uno`, documentoNumero: "900401", tipoDocumento: "cedula_ciudadania" },
      { nombre: `${MARCA} dos`, documentoNumero: "900402", tipoDocumento: "cedula_ciudadania" },
    ],
  });
  await salir();
  const { data } = await servicio.from("invitado").select("id").eq("visita_id", visitaId).order("orden");
  ids.push(...(data ?? []).map((i) => i.id));
});

afterAll(async () => {
  await servicio.from("preferencia_aviso").delete().eq("usuario_id", sofiaId).eq("motivo", "huesped_salida_parcial");
  await servicio.from("notificacion").delete().eq("entidad_id", visitaId);
  if (visitaId) {
    const { error } = await servicio.from("visita").delete().eq("id", visitaId);
    expect(error).toBeNull();
  }
});

describe("el preregistro pendiente", () => {
  it("a 3 días o menos se le avisa una vez", async () => {
    await servicio.rpc("avisar_preregistros_incompletos");
    await servicio.rpc("avisar_preregistros_incompletos");
    const lista = await avisos("preregistro_incompleto");
    expect(lista.filter((a) => a.usuario_id === sofiaId)).toHaveLength(1);
    expect(lista[0].mensaje).toMatch(/llega mañana/);
  });
});

describe("las salidas", () => {
  beforeAll(async () => {
    const ahora = new Date().toISOString();
    for (const id of ids) {
      await servicio.from("invitado").update({ llego: true, ingreso_en: ahora }).eq("id", id);
    }
  });

  it("si sale uno y queda otro, es una salida parcial", async () => {
    await servicio.from("invitado").update({ salida_en: new Date().toISOString() }).eq("id", ids[0]);
    const lista = await avisos("huesped_salida_parcial");
    expect(lista.map((a) => a.usuario_id)).toContain(sofiaId);
    expect(lista[0].mensaje).toMatch(/Quedan 1 persona dentro/);
    expect(await avisos("huesped_salida")).toHaveLength(0);
  });

  it("y cuando sale el último, la estancia queda completa", async () => {
    await servicio.from("invitado").update({ salida_en: new Date().toISOString() }).eq("id", ids[1]);
    expect((await avisos("huesped_salida")).map((a) => a.usuario_id)).toContain(sofiaId);
  });

  it("lo ve en su inicio", async () => {
    await entrarComo(ANFITRIONA);
    const enElInicio = await obtenerAvisosDeEstancia(20);
    await salir();
    expect(enElInicio.some((a) => a.titulo === "Salieron todos: estancia completa")).toBe(true);
  });
});

describe("se apaga uno por uno", () => {
  it("con la salida parcial apagada, no le llega", async () => {
    await entrarComo(ANFITRIONA);
    const { error } = await supabase.rpc("guardar_aviso", {
      p_motivo: "huesped_salida_parcial",
      p_por_app: false,
      p_por_correo: false,
      p_por_whatsapp: false,
    });
    await salir();
    expect(error).toBeNull();

    await servicio.from("notificacion").delete().eq("entidad_id", visitaId).eq("tipo", "huesped_salida_parcial");
    // Vuelven a entrar los dos y sale uno: sería una salida parcial.
    for (const id of ids) {
      await servicio.from("invitado").update({ salida_en: null }).eq("id", id);
    }
    await servicio.from("invitado").update({ salida_en: new Date().toISOString() }).eq("id", ids[0]);
    expect(await avisos("huesped_salida_parcial")).toHaveLength(0);
  });
});
