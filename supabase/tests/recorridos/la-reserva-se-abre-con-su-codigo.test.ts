import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { isoEnDias, salir, servicio, supabase, ventanaDe } from "./cliente";
import {
  abrirPrecheckinPorReserva,
  consultarPrecheckin,
} from "../../../../veciyo-web/src/lib/precheckin";

/**
 * Recorrido: el huesped abre su preregistro con el codigo de su reserva.
 *
 * Es la puerta de quien llega desde el mensaje automatico de Airbnb
 * (`/r/HMABCD1234`). Decidido con el cliente el 09/10/2026: el codigo solo no
 * basta --viaja en correos y capturas--, asi que se piden ademas los ultimos
 * cuatro digitos del telefono con el que se reservo, y los intentos se cuentan.
 *
 * Todo sin sesion: quien entra por aqui todavia no es nadie en el sistema.
 */

const V = ventanaDe("la-reserva-se-abre-con-su-codigo");

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
// La 205: tiene renta corta y nadie mas le abre estancias en estas fechas.
const U205 = "44444444-4444-4444-4444-444444444442";
const MARCA = "[prueba] abrir con el codigo";

// Unicos por corrida: el codigo es unico entre las estancias vivas.
const sufijo = Math.random().toString(36).slice(2, 8).toUpperCase();
const CODIGO = `PRUEBA${sufijo}`;
const CODIGO_SIN_TELEFONO = `PRUEBB${sufijo}`;
const DIGITOS = "2959";

let visitaId = "";
let sinTelefonoId = "";

async function abrir(dias: number, codigo: string, ultimos4: string | null) {
  const { data, error } = await servicio
    .from("visita")
    .insert({
      condominio_id: CONDOMINIO,
      unidad_id: U205,
      tipo: "huesped_temporal",
      origen: "calendario",
      fecha_desde: isoEnDias(V + dias),
      fecha_hasta: isoEnDias(V + dias + 2),
      codigo_reserva: codigo,
      telefono_ultimos4: ultimos4,
      anotaciones_ingreso: MARCA,
    })
    .select("id")
    .single();
  if (error) throw new Error(`No se pudo abrir ${codigo}: ${error.message}`);

  const { error: e2 } = await servicio.from("invitado").insert({
    visita_id: data.id,
    orden: 0,
    nombre: `Huésped por confirmar (${codigo})`,
    es_titular: true,
  });
  if (e2) throw new Error(e2.message);
  return data.id as string;
}

async function intentos() {
  const { data } = await servicio
    .from("visita")
    .select("intentos_apertura, apertura_bloqueada_hasta")
    .eq("id", visitaId)
    .single();
  return data!;
}

async function retirar() {
  const { data } = await servicio
    .from("visita")
    .select("id")
    .eq("unidad_id", U205)
    .eq("anotaciones_ingreso", MARCA);
  const ids = (data ?? []).map((v) => v.id);
  if (ids.length === 0) return;
  const { error } = await servicio.from("visita").delete().in("id", ids);
  if (error) throw new Error(`No se pudo retirar: ${error.message}`);
}

beforeAll(async () => {
  await salir();
  await retirar();
  visitaId = await abrir(0, CODIGO, DIGITOS);
  sinTelefonoId = await abrir(5, CODIGO_SIN_TELEFONO, null);
});

afterAll(async () => {
  await retirar();
});

describe("abrir con el codigo de la reserva", () => {
  it("un codigo que no existe dice «preparando», no «no existe»", async () => {
    // La misma respuesta que una reserva que todavia no llego del calendario:
    // asi esto no sirve para averiguar que codigos hay.
    const r = await abrirPrecheckinPorReserva("NOEXISTE999", DIGITOS, supabase as never);
    expect(r).toEqual({ estado: "preparando", token: null });
  });

  it("el codigo solo no abre: con otros digitos no entra", async () => {
    const r = await abrirPrecheckinPorReserva(CODIGO, "0000", supabase as never);
    expect(r).toEqual({ estado: "ultimos4_incorrectos", token: null });
    expect((await intentos()).intentos_apertura).toBe(1);
  });

  it("con sus digitos entra, y el enlace que recibe funciona", async () => {
    // En minusculas y con espacios: el huesped lo teclea como le sale.
    const r = await abrirPrecheckinPorReserva(
      ` ${CODIGO.toLowerCase()} `,
      DIGITOS,
      supabase as never,
    );
    expect(r.estado).toBe("listo");
    expect(r.token).toMatch(/^[0-9a-f]{64}$/);

    const estancia = await consultarPrecheckin(r.token!, supabase as never);
    expect(estancia?.vigente).toBe(true);
    // Acertar pone la cuenta a cero.
    expect((await intentos()).intentos_apertura).toBe(0);
  });

  it("en la base no queda el enlace en claro", async () => {
    const r = await abrirPrecheckinPorReserva(CODIGO, DIGITOS, supabase as never);
    const { data } = await servicio
      .from("visita")
      .select("precheckin_token_hash")
      .eq("id", visitaId)
      .single();
    expect(data!.precheckin_token_hash).toBeTruthy();
    expect(data!.precheckin_token_hash).not.toBe(r.token);
  });
});

describe("los intentos se cuentan", () => {
  it("al quinto fallo seguido se bloquea, y ni con los digitos buenos entra", async () => {
    for (let i = 0; i < 4; i++) {
      const r = await abrirPrecheckinPorReserva(CODIGO, "1111", supabase as never);
      expect(r.estado).toBe("ultimos4_incorrectos");
    }
    const quinto = await abrirPrecheckinPorReserva(CODIGO, "1111", supabase as never);
    expect(quinto.estado).toBe("bloqueado");

    const conLosBuenos = await abrirPrecheckinPorReserva(CODIGO, DIGITOS, supabase as never);
    expect(conLosBuenos).toEqual({ estado: "bloqueado", token: null });
  });

  it("pasado el bloqueo, vuelve a entrar", async () => {
    // El control: bloqueada para siempre pasaria el caso de arriba.
    const { error } = await servicio
      .from("visita")
      .update({ apertura_bloqueada_hasta: new Date(Date.now() - 60_000).toISOString() })
      .eq("id", visitaId);
    expect(error).toBeNull();

    const r = await abrirPrecheckinPorReserva(CODIGO, DIGITOS, supabase as never);
    expect(r.estado).toBe("listo");
  });
});

describe("lo que no se abre por aqui", () => {
  it("una reserva sin los digitos guardados: el codigo solo no basta", async () => {
    const r = await abrirPrecheckinPorReserva(CODIGO_SIN_TELEFONO, "", supabase as never);
    expect(r).toEqual({ estado: "sin_telefono", token: null });

    const { data } = await servicio
      .from("visita")
      .select("precheckin_token_hash")
      .eq("id", sinTelefonoId)
      .single();
    expect(data!.precheckin_token_hash).toBeNull();
  });

  it("un preregistro ya cerrado no emite otro enlace", async () => {
    await servicio
      .from("visita")
      .update({ precheckin_completado_en: new Date().toISOString() })
      .eq("id", visitaId);

    const r = await abrirPrecheckinPorReserva(CODIGO, DIGITOS, supabase as never);
    expect(r).toEqual({ estado: "cerrado", token: null });

    await servicio
      .from("visita")
      .update({ precheckin_completado_en: null })
      .eq("id", visitaId);
  });

  it("ni una reserva cancelada", async () => {
    await servicio.from("visita").update({ estado: "cancelada" }).eq("id", visitaId);
    const r = await abrirPrecheckinPorReserva(CODIGO, DIGITOS, supabase as never);
    expect(r.estado).toBe("preparando");
  });
});
