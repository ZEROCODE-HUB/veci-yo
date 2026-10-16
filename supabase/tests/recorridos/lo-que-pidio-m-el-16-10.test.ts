import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { enDias, entrarComo, isoEnDias, salir, servicio, supabase, ventanaDe } from "./cliente";
import {
  crearVisita,
  guardarClavePuertaEstancia,
  obtenerClavePuertaEstancia,
  obtenerHistorialDeLaEstancia,
} from "@/features/visitas/services/visitas.repo";
import { abrirPrecheckin } from "@/features/visitas/services/precheckin.repo";

/** Sus fechas, lejos de las de los demás: ver `ventanaDe`. */
const V = ventanaDe("lo-que-pidio-m-el-16-10");

/**
 * Recorrido: lo que pidió la responsable de producto el 16/10/2026 y toca la
 * base (docs/CORRECCIONES-16.10.md).
 *
 *   · el enlace dice el máximo de personas del edificio;
 *   · el acompañante escribe dirección y motivo, y la pantalla sabe si ya
 *     subió las fotos de su documento;
 *   · la reserva dice de qué plataforma viene;
 *   · cada reserva tiene su clave de puerta, que solo ven el anfitrión y el
 *     huésped de esa reserva, y este solo dentro de sus fechas;
 *   · el historial de la estancia, para el anfitrión y el personal;
 *   · «aprobada» espera a que no quede nada por decidir.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const U205 = "44444444-4444-4444-4444-444444444442";
const ANFITRIONA = "vecino@veciyo.test"; // Sofía, de la 102
const DUENO_205 = "propietario@veciyo.test"; // Guillermo, de la 101 y la 205
const GUARDIA = "guardia@veciyo.test";
const HUESPED = "nuevo.inquilino@veciyo.test"; // Tomás, con cuenta

const MARCA = "[prueba] m 16-10";

let futura = "";
let titular = "";
let acompanante = "";
let token = "";
let deHoy = "";
let limiteAntes: { id: string; capacidad_maxima: number | null } | null = null;
let limiteCreado = false;

async function retirar(visitaId: string) {
  if (!visitaId) return;
  const { data } = await servicio.from("invitado").select("id").eq("visita_id", visitaId);
  const ids = (data ?? []).map((i) => i.id);
  if (ids.length > 0) {
    await servicio.from("verificacion_antecedentes").delete().in("invitado_id", ids);
    await servicio.from("verificacion_documento").delete().in("invitado_id", ids);
  }
  await servicio.from("reclamo").delete().eq("visita_id", visitaId);
  await servicio.from("notificacion").delete().eq("entidad_id", visitaId);
  const { error } = await servicio.from("visita").delete().eq("id", visitaId);
  if (error) throw new Error(`No se pudo retirar ${visitaId}: ${error.message}`);
}

beforeAll(async () => {
  await servicio.from("visita").delete().eq("anotaciones_ingreso", MARCA);

  await entrarComo(ANFITRIONA);
  futura = await crearVisita({
    condominioId: CONDOMINIO,
    unidadId: U102,
    tipo: "huesped_temporal",
    fechaDesde: enDias(V + 2),
    fechaHasta: enDias(V + 4),
    anotacionesIngreso: MARCA,
    plataforma: "booking",
    invitados: [
      { nombre: `${MARCA} titular`, documentoNumero: "910001", tipoDocumento: "cedula_ciudadania" },
      { nombre: `${MARCA} acompañante`, documentoNumero: "910002", tipoDocumento: "cedula_ciudadania" },
    ],
  });
  const { data } = await supabase
    .from("invitado")
    .select("id, nombre, es_titular")
    .eq("visita_id", futura);
  titular = data!.find((i) => i.es_titular)!.id;
  acompanante = data!.find((i) => !i.es_titular)!.id;
  token = (await abrirPrecheckin(futura)).enlace.split("/").pop()!;
}, 60_000);

afterAll(async () => {
  await retirar(futura);
  await retirar(deHoy);
  if (limiteCreado) {
    await servicio.from("limite_renta_corta_condominio").delete().eq("condominio_id", CONDOMINIO);
  } else if (limiteAntes) {
    await servicio
      .from("limite_renta_corta_condominio")
      .update({ capacidad_maxima: limiteAntes.capacidad_maxima })
      .eq("id", limiteAntes.id);
  }
  await salir();
});

describe("el enlace dice el máximo del edificio", () => {
  it("lo que fija el edificio llega a quien abre el enlace, sin sesión", async () => {
    const { data: antes } = await servicio
      .from("limite_renta_corta_condominio")
      .select("id, capacidad_maxima")
      .eq("condominio_id", CONDOMINIO)
      .maybeSingle();
    if (antes) {
      limiteAntes = antes;
      await servicio.from("limite_renta_corta_condominio").update({ capacidad_maxima: 7 }).eq("id", antes.id);
    } else {
      limiteCreado = true;
      await servicio
        .from("limite_renta_corta_condominio")
        .insert({ condominio_id: CONDOMINIO, capacidad_maxima: 7 });
    }
    await salir();
    const { data, error } = await supabase.rpc("consultar_precheckin", { p_token: token });
    expect(error).toBeNull();
    const fila = Array.isArray(data) ? data[0] : data;
    expect(fila.max_huespedes_edificio).toBe(7);
  });
});

describe("el acompañante llena lo mismo que el titular", () => {
  let suyo = "";

  beforeAll(async () => {
    await salir();
    const { data, error } = await supabase.rpc("abrir_precheckin_acompanante", {
      p_token: token,
      p_acompanante_id: acompanante,
    });
    if (error) throw new Error(error.message);
    suyo = String(data);
  });

  it("escribe su dirección y su motivo con su enlace", async () => {
    const { error } = await supabase.rpc("guardar_direccion_y_motivo_acompanante", {
      p_token: suyo,
      p_direccion: `${MARCA} Calle 1`,
      p_motivo: "turismo",
    });
    expect(error).toBeNull();
    const { data } = await servicio
      .from("invitado")
      .select("direccion, motivo")
      .eq("id", acompanante)
      .single();
    expect(data).toEqual({ direccion: `${MARCA} Calle 1`, motivo: "turismo" });
    // Y la del titular no se tocó.
    const { data: delTitular } = await servicio
      .from("invitado")
      .select("direccion")
      .eq("id", titular)
      .single();
    expect(delTitular!.direccion).not.toBe(`${MARCA} Calle 1`);
  });

  it("y la pantalla sabe si ya subió las dos caras", async () => {
    const leer = async () => {
      const { data } = await supabase.rpc("fotos_de_mi_documento", { p_token: suyo });
      return Array.isArray(data) ? data[0] : data;
    };
    expect(await leer()).toMatchObject({ frente: false, reverso: false, motivo: "turismo" });

    await servicio.from("verificacion_documento").upsert(
      {
        invitado_id: acompanante,
        documento_original_path: `${futura}/documento-frente-${acompanante}.png`,
      },
      { onConflict: "invitado_id" },
    );
    expect(await leer()).toMatchObject({ frente: true, reverso: false });
  });

  it("un enlace inventado no escribe nada", async () => {
    const { error } = await supabase.rpc("guardar_direccion_y_motivo_acompanante", {
      p_token: "no-vale",
      p_direccion: "x",
    });
    expect(error?.message).toMatch(/no vale/i);
  });
});

describe("la reserva dice de qué plataforma viene", () => {
  it("la que se elige a mano se guarda", async () => {
    const { data } = await servicio.from("visita").select("plataforma, origen").eq("id", futura).single();
    expect(data).toEqual({ plataforma: "booking", origen: "veciyo" });
  });

  it("del calendario, la deduce la base por la dirección", async () => {
    const { data, error } = await servicio
      .from("visita")
      .insert({
        condominio_id: CONDOMINIO,
        unidad_id: U102,
        tipo: "huesped_temporal",
        estado: "programada",
        fecha_desde: isoEnDias(V + 10),
        fecha_hasta: isoEnDias(V + 11),
        origen: "calendario",
        calendario_url: "https://www.airbnb.com/hosting/reservations/details/HMPRUEBA",
        anotaciones_ingreso: MARCA,
      })
      .select("id, plataforma")
      .single();
    expect(error).toBeNull();
    expect(data!.plataforma).toBe("airbnb");
    await retirar(data!.id);
  });

  it("y a mano sin decirlo, es directa", async () => {
    const { data } = await servicio
      .from("visita")
      .insert({
        condominio_id: CONDOMINIO,
        unidad_id: U102,
        tipo: "huesped_temporal",
        estado: "programada",
        fecha_desde: isoEnDias(V + 14),
        fecha_hasta: isoEnDias(V + 15),
        anotaciones_ingreso: MARCA,
      })
      .select("id, plataforma")
      .single();
    expect(data!.plataforma).toBe("directo");
    await retirar(data!.id);
  });
});

describe("cada reserva tiene su clave de puerta", () => {
  beforeAll(async () => {
    /*
      Una estancia de hoy en la 205, de Guillermo, con Tomás enlazado: es la
      única forma de comprobar el lado bueno del huésped («dentro de sus
      fechas»). La 205 no la usa nadie hoy; el recordatorio empieza mañana.
    */
    const tomas = await entrarComo(HUESPED);
    await salir();
    const { data, error } = await servicio
      .from("visita")
      .insert({
        condominio_id: CONDOMINIO,
        unidad_id: U205,
        tipo: "huesped_temporal",
        estado: "programada",
        fecha_desde: isoEnDias(0),
        fecha_hasta: isoEnDias(1),
        anotaciones_ingreso: MARCA,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    deHoy = data.id;
    const { error: e2 } = await servicio.from("invitado").insert({
      visita_id: deHoy,
      nombre: `${MARCA} Tomás`,
      es_titular: true,
      usuario_id: tomas,
    });
    if (e2) throw new Error(e2.message);
  });

  it("el anfitrión la pone y la vuelve a leer", async () => {
    await entrarComo(DUENO_205);
    await guardarClavePuertaEstancia(deHoy, "4821#");
    expect(await obtenerClavePuertaEstancia(deHoy)).toBe("4821#");
  });

  it("el huésped de esa reserva la ve en su alojamiento, hoy", async () => {
    await salir();
    await entrarComo(HUESPED);
    expect(await obtenerClavePuertaEstancia(deHoy)).toBe("4821#");
    const { data } = await supabase.rpc("clave_puerta_de_mi_estancia", { p_unidad_id: U205 });
    expect(data).toBe("4821#");
  });

  it("la portería y otra vecina, no", async () => {
    await salir();
    await entrarComo(GUARDIA);
    expect(await obtenerClavePuertaEstancia(deHoy)).toBeNull();
    await salir();
    await entrarComo(ANFITRIONA);
    expect(await obtenerClavePuertaEstancia(deHoy)).toBeNull();
  });

  it("y nadie más que el anfitrión la cambia", async () => {
    await expect(guardarClavePuertaEstancia(deHoy, "0000")).rejects.toThrow(/anfitrion/i);
    await salir();
    await entrarComo(DUENO_205);
    expect(await obtenerClavePuertaEstancia(deHoy)).toBe("4821#");
  });

  it("antes de sus fechas, el huésped tampoco la ve", async () => {
    await entrarComo(ANFITRIONA);
    await guardarClavePuertaEstancia(futura, "1111");
    const { error } = await servicio.from("invitado").update({ usuario_id: null }).eq("id", titular);
    expect(error).toBeNull();
    const tomas = await entrarComo(HUESPED);
    await servicio.from("invitado").update({ usuario_id: tomas }).eq("id", titular);
    expect(await obtenerClavePuertaEstancia(futura)).toBeNull();
    await servicio.from("invitado").update({ usuario_id: null }).eq("id", titular);
  });
});

describe("el historial de la estancia", () => {
  it("el anfitrión ve las entradas y las PQRS de la estancia", async () => {
    await servicio
      .from("invitado")
      .update({ ingreso_en: new Date().toISOString() })
      .eq("visita_id", deHoy);
    await salir();
    await entrarComo(GUARDIA);
    const { error } = await supabase.from("reclamo").insert({
      condominio_id: CONDOMINIO,
      creado_por: (await supabase.auth.getUser()).data.user!.id,
      tipo: "queja",
      categoria: "convivencia",
      titulo: MARCA,
      descripcion: MARCA,
      unidad_denunciada: U205,
      visita_id: deHoy,
    });
    expect(error).toBeNull();

    await salir();
    await entrarComo(DUENO_205);
    const historial = await obtenerHistorialDeLaEstancia(deHoy);
    expect(historial.some((m) => m.tipo === "entrada")).toBe(true);
    expect(historial.some((m) => m.tipo === "pqrs" && m.titulo.includes(MARCA))).toBe(true);
  });

  it("una vecina de otra vivienda no", async () => {
    await salir();
    await entrarComo(ANFITRIONA);
    await expect(obtenerHistorialDeLaEstancia(deHoy)).rejects.toThrow(/historial/i);
  });
});

describe("aprobada espera a que no quede nada por decidir", () => {
  it("sin cerrar, no; cerrada y limpia, sí; con una revisión pendiente, no", async () => {
    const aprobada = async () => {
      const { data } = await servicio.rpc("estancia_aprobada", { p_visita_id: futura });
      return data;
    };
    expect(await aprobada()).toBe(false);

    await servicio
      .from("visita")
      .update({ precheckin_completado_en: new Date().toISOString() })
      .eq("id", futura);
    // Cerrada pero sin las consultas hechas: todavía no (así salía el aviso
    // antes de tiempo, visto en el recorrido del 16/10/2026).
    expect(await aprobada()).toBe(false);

    for (const id of [titular, acompanante]) {
      const { error } = await servicio.rpc("anotar_verificacion", {
        p_invitado_id: id,
        p_proveedor: "tusdatos-pruebas",
        p_referencia: null,
        p_resultado: "aprobada",
        p_respuesta: { nivel: "bajo" },
      });
      if (error) throw new Error(error.message);
    }
    expect(await aprobada()).toBe(true);
    // Y quedó avisada, una vez (los correos de prueba no salen: se filtran).
    const { data: avisada } = await servicio
      .from("visita")
      .select("ingreso_aprobado_avisado_en")
      .eq("id", futura)
      .single();
    expect(avisada!.ingreso_aprobado_avisado_en).not.toBeNull();

    await servicio
      .from("invitado")
      .update({
        incapacidad_declarado_por_invitado_id: titular,
        incapacidad_motivo: MARCA,
        incapacidad_declaracion: MARCA,
        incapacidad_declarado_en: new Date().toISOString(),
      })
      .eq("id", acompanante);
    expect(await aprobada()).toBe(false);
  });
});

describe("la portería sabe que falta el anfitrión, sin el motivo", () => {
  it("con una consulta que pide revisión, la estancia de hoy sale marcada", async () => {
    const { data: persona } = await servicio
      .from("invitado")
      .select("id")
      .eq("visita_id", deHoy)
      .single();
    // Una incapacidad declarada también pide la decisión del anfitrión, y no
    // gasta verificaciones de la suscripción de la 205.
    const { error } = await servicio
      .from("invitado")
      .update({
        incapacidad_declarado_por_invitado_id: persona!.id,
        incapacidad_motivo: MARCA,
        incapacidad_declaracion: MARCA,
        incapacidad_declarado_en: new Date().toISOString(),
      })
      .eq("id", persona!.id);
    if (error) throw new Error(error.message);

    await salir();
    await entrarComo(GUARDIA);
    const { data: marcadas } = await supabase.rpc("estancias_que_esperan_al_anfitrion", {
      p_visitas: [deHoy],
    });
    expect(marcadas).toEqual([deHoy]);
  });

  it("de una estancia que no puede ver, no responde nada", async () => {
    await salir();
    await entrarComo(ANFITRIONA);
    const { data } = await supabase.rpc("estancias_que_esperan_al_anfitrion", {
      p_visitas: [deHoy],
    });
    expect(data ?? []).toEqual([]);
  });
});
