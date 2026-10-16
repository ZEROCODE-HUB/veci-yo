import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio, supabase } from "./cliente";
import {
  crearCorrespondencia,
  obtenerCorrespondencia,
} from "@/features/correspondencia/services/correspondencia.repo";

/**
 * Recorrido: el paquete del huésped (15/10/2026, hueco 17).
 *
 * Tomás está alojado en la 102. Se le pone una ficha de huésped con documento
 * en la estancia de hoy, y la portería registra paquetes: uno a su nombre, uno
 * con su documento escrito con puntos, uno sin destinatario. Le llega el aviso
 * y ve solo los suyos; los de la vivienda, no.
 *
 * La ficha no lleva la marca `[prueba]`: el barrido global borra la visita
 * entera de un invitado marcado, y esta visita es de las que el cliente usa.
 * Se borra por su id.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const GUARDIA = "guardia@veciyo.test";
const TOMAS = "nuevo.inquilino@veciyo.test";
const SOFIA = "vecino@veciyo.test";
const LAURA = "laura.invitada@veciyo.test"; // también huésped de la 102
const MARCA = "[prueba] paquete del huesped";
const DOCUMENTO = "55501234";

let tomasId = "";
let lauraId = "";
let fichaId = "";
const paquetes: string[] = [];

const registrar = async (datos: { nombre?: string; documento?: string }) => {
  await entrarComo(GUARDIA);
  const id = await crearCorrespondencia({
    condominioId: CONDOMINIO,
    unidadId: U102,
    empresa: MARCA,
    destinatarioNombre: datos.nombre,
    destinatarioDocumento: datos.documento,
  });
  await salir();
  paquetes.push(id);
  return id;
};

const losQueVe = async (correo: string) => {
  await entrarComo(correo);
  const lista = await obtenerCorrespondencia({ ambito: "unidad", unidadIds: [U102] });
  await salir();
  return lista.map((p) => p.uuid ?? "").filter((id) => paquetes.includes(id));
};

const avisos = async (usuarioId: string, paquete: string) => {
  const { data } = await servicio
    .from("notificacion")
    .select("titulo")
    .eq("usuario_id", usuarioId)
    .eq("entidad_id", paquete);
  return (data ?? []).map((n) => n.titulo);
};

beforeAll(async () => {
  tomasId = await entrarComo(TOMAS);
  await salir();
  lauraId = await entrarComo(LAURA);
  await salir();

  // La estancia de hoy en la 102, la que haya.
  const { data: v } = await servicio
    .from("visita")
    .select("id")
    .eq("unidad_id", U102)
    .eq("tipo", "huesped_temporal")
    .is("deleted_at", null)
    .lte("fecha_desde", new Date().toISOString().slice(0, 10))
    .gte("fecha_hasta", new Date().toISOString().slice(0, 10))
    .limit(1)
    .single();

  const { data: f, error } = await servicio
    .from("invitado")
    .insert({
      visita_id: v!.id,
      nombre: "Tomás",
      apellidos: "Paquete Prueba",
      tipo_documento: "cedula_ciudadania",
      documento_numero: DOCUMENTO,
      usuario_id: tomasId,
      orden: 99,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  fichaId = f!.id;
});

afterAll(async () => {
  await salir();
  if (paquetes.length) {
    await servicio.from("notificacion").delete().in("entidad_id", paquetes);
    const { error } = await servicio.from("correspondencia").delete().in("id", paquetes);
    if (error) throw new Error(error.message);
  }
  if (fichaId) {
    const { error } = await servicio.from("invitado").delete().eq("id", fichaId);
    if (error) throw new Error(error.message);
  }
});

describe("un paquete para el huésped de la 102", () => {
  it("con su documento (escrito con puntos), le llega el aviso y lo ve", async () => {
    const id = await registrar({ documento: "55.501.234" });
    expect(await avisos(tomasId, id)).toEqual(["Te llegó un paquete"]);
    expect(await losQueVe(TOMAS)).toContain(id);
  });

  it("con su nombre completo, igual", async () => {
    const id = await registrar({ nombre: "  tomás   paquete prueba " });
    expect(await avisos(tomasId, id)).toEqual(["Te llegó un paquete"]);
    expect(await losQueVe(TOMAS)).toContain(id);
  });

  it("uno de la vivienda, sin destinatario, ni le avisa ni lo ve; la dueña sí", async () => {
    const id = await registrar({});
    expect(await avisos(tomasId, id)).toEqual([]);
    expect(await losQueVe(TOMAS)).not.toContain(id);
    // El control: el paquete existe y la dueña lo ve.
    expect(await losQueVe(SOFIA)).toContain(id);
  });

  it("otra huésped de la misma vivienda no ve el de Tomás", async () => {
    const deTomas = paquetes[0];
    expect(await losQueVe(LAURA)).not.toContain(deTomas);
    expect(await avisos(lauraId, deTomas)).toEqual([]);
  });

  it("y nadie lo pone a nombre de otro llamando a la API: lo decide la base", async () => {
    await entrarComo(GUARDIA);
    const { data, error } = await supabase
      .from("correspondencia")
      .insert({ condominio_id: CONDOMINIO, unidad_id: U102, empresa: MARCA, huesped_id: lauraId })
      .select("id, huesped_id")
      .single();
    await salir();
    expect(error).toBeNull();
    paquetes.push(data!.id);
    expect(data!.huesped_id).toBeNull();
  });
});
