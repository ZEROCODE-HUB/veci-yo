import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { enDias, entrarComo, isoEnDias, salir, servicio, supabase } from "./cliente";
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
 * La estancia es de una noche en la 102 y tiene que caer a 3 días o menos para
 * el aviso del preregistro. La noche se busca libre: la 102 tiene estancias
 * reales del cliente en estos días, y una fecha fija chocaba con ellas
 * (15/10/2026). Las entradas y salidas se escriben con la
 * clave de servicio (la portería no ve fechas lejanas, y aquí lo que importa
 * es el aviso, no quién marca).
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const ANFITRIONA = "vecino@veciyo.test";

const MARCA = "[prueba] el anfitrion se entera";

let visitaId = "";
let sofiaId = "";
/** En cuántos días llega: la primera noche libre de las próximas. */
let enCuantos = 1;

/** La primera noche libre de la 102 a 3 días o menos. */
async function nocheLibre(): Promise<number> {
  const { data } = await servicio
    .from("visita")
    .select("fecha_desde, fecha_hasta")
    .eq("unidad_id", U102)
    .eq("tipo", "huesped_temporal")
    .neq("estado", "cancelada")
    .is("deleted_at", null)
    .lte("fecha_desde", isoEnDias(4))
    .gte("fecha_hasta", isoEnDias(0));
  // Una noche está ocupada si cae entre la entrada (incluida) y la salida (no).
  const ocupada = (dia: string) =>
    (data ?? []).some((v) => v.fecha_desde <= dia && (dia < v.fecha_hasta || dia === v.fecha_desde));
  // Mañana primero, que es el caso de siempre; si no, los días siguientes.
  for (const d of [1, 2, 3, 0]) {
    if (!ocupada(isoEnDias(d)) && !ocupada(isoEnDias(d + 1))) return d;
  }
  throw new Error("La 102 no tiene ninguna noche libre en los próximos 3 días");
}
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
  enCuantos = await nocheLibre();
  sofiaId = await entrarComo(ANFITRIONA);
  visitaId = await crearVisita({
    condominioId: CONDOMINIO,
    unidadId: U102,
    tipo: "huesped_temporal",
    fechaDesde: enDias(enCuantos),
    fechaHasta: enDias(enCuantos + 1),
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
    expect(lista[0].mensaje).toMatch(
      enCuantos === 0 ? /llega hoy/ : enCuantos === 1 ? /llega mañana/ : new RegExp(`llega en ${enCuantos} días`),
    );
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
    expect(lista[0].mensaje).toMatch(/Queda 1 persona dentro/);
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
