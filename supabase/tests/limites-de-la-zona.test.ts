import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  CLAVE_SERVICIO,
  CUENTA,
  MARCA_PRUEBA,
  UNIDAD,
  URL,
  api,
  crearZonaDePrueba,
  entrar,
  fechaEnDias,
  leer,
  type Sesion,
} from "./apoyo";

/**
 * Los límites de una zona común (18/11/2026, pedido del cliente): personas
 * por reserva, cuántas reservas por delante, con cuánta anticipación, la
 * bitácora de cada reserva y la lista de las que se cancelan solas. Cada
 * rechazo con su control positivo, sobre una zona de usar y tirar.
 */
let sofia: Sesion; // 102
let marcela: Sesion; // administradora
let zona: { id: string; retirar: () => Promise<void> };

const servicio = (ruta: string, opciones: RequestInit = {}) =>
  fetch(`${URL}/rest/v1/${ruta}`, {
    ...opciones,
    headers: {
      apikey: CLAVE_SERVICIO,
      Authorization: `Bearer ${CLAVE_SERVICIO}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
  });

const reservar = (dias: number, desde: string, hasta: string, acompanantes = 0) =>
  api(sofia, "/rest/v1/reserva_zona?select=id", {
    metodo: "POST",
    cuerpo: {
      zona_id: zona.id,
      unidad_id: UNIDAD.u102,
      fecha: fechaEnDias(dias),
      hora_inicio: desde,
      hora_fin: hasta,
      acompanantes,
      solicitada_por: sofia.usuarioId,
      comentarios: `${MARCA_PRUEBA} límites`,
    },
  });

beforeAll(async () => {
  [sofia, marcela] = await Promise.all([entrar(CUENTA.vecino), entrar(CUENTA.admin)]);
  zona = await crearZonaDePrueba(marcela, {
    horario_apertura: "06:00",
    horario_cierre: "22:00",
    dias_habilitados: [0, 1, 2, 3, 4, 5, 6],
    cupos_simultaneos: 3,
    capacidad_maxima: 30,
    personas_por_reserva: 4,
    reservas_activas_maximas: 1,
    limite_reservas_por: "vivienda",
    anticipacion_minima_horas: 48,
    requiere_aprobacion: false,
  });
}, 60_000);

afterAll(async () => {
  // Sus avisos antes: `notificacion.entidad_id` no es clave foránea.
  const r = await servicio(`reserva_zona?select=id&zona_id=eq.${zona.id}`);
  const ids = ((await r.json()) as { id: string }[]).map((f) => f.id);
  if (ids.length) {
    const b = await servicio(`notificacion?entidad_id=in.(${ids.join(",")})`, { method: "DELETE" });
    expect(b.ok, await b.text()).toBe(true);
  }
  await zona.retirar();
});

describe("los límites de una zona común", () => {
  it("no se reserva sin la anticipación pedida; con ella, sí", async () => {
    const manana = await reservar(1, "10:00", "11:00");
    expect(manana.mensaje).toMatch(/al menos 48 horas de anticipación/);
    const enCinco = await reservar(5, "10:00", "11:00");
    expect(enCinco.estado, enCinco.mensaje).toBe(201);
  });

  it("con una reserva por delante, la vivienda no hace otra", async () => {
    const otra = await reservar(6, "10:00", "11:00");
    expect(otra.mensaje).toMatch(/Puedes editar la que tienes/);
  });

  it("en una reserva caben como máximo las personas que diga la zona", async () => {
    const [fila] = (await leer<{ id: string }[]>(sofia, `reserva_zona?select=id&zona_id=eq.${zona.id}`)).datos;
    const demasiadas = await api(sofia, `/rest/v1/reserva_zona?id=eq.${fila.id}`, {
      metodo: "PATCH",
      cuerpo: { acompanantes: 4 },
    });
    expect(demasiadas.mensaje).toMatch(/caben como máximo 4 personas/);
    const bien = await api(sofia, `/rest/v1/reserva_zona?id=eq.${fila.id}`, {
      metodo: "PATCH",
      cuerpo: { acompanantes: 3 },
    });
    expect(bien.estado, bien.mensaje).toBe(200);
  });

  it("la bitácora anota quién la creó y quién la editó", async () => {
    const [fila] = (await leer<{ id: string }[]>(sofia, `reserva_zona?select=id&zona_id=eq.${zona.id}`)).datos;
    const acciones = await leer<{ accion: string; hecha_por: string }[]>(
      marcela,
      `reserva_zona_accion?select=accion,hecha_por&reserva_id=eq.${fila.id}&order=created_at`,
    );
    expect(acciones.datos.map((a) => a.accion)).toEqual(["creada", "editada"]);
    expect(acciones.datos.every((a) => a.hecha_por === sofia.usuarioId)).toBe(true);
  });

  it("una pendiente con costo y sin adjunto pasado el plazo se cancela sola", async () => {
    // Otra zona: con costo, aprobación y plazo de 1 hora.
    const conCosto = await crearZonaDePrueba(marcela, {
      horario_apertura: "06:00",
      horario_cierre: "22:00",
      dias_habilitados: [0, 1, 2, 3, 4, 5, 6],
      cupos_simultaneos: 3,
      requiere_aprobacion: true,
      costo_reserva: 10,
      plazo_adjunto_horas: 1,
    });
    try {
      const alta = await api(sofia, "/rest/v1/reserva_zona?select=id", {
        metodo: "POST",
        cuerpo: {
          zona_id: conCosto.id,
          unidad_id: UNIDAD.u102,
          fecha: fechaEnDias(7),
          hora_inicio: "10:00",
          hora_fin: "11:00",
          solicitada_por: sofia.usuarioId,
          comentarios: `${MARCA_PRUEBA} plazo`,
        },
      });
      expect(alta.estado, alta.mensaje).toBe(201);
      const id = alta.datos[0].id as string;
      // Recién hecha: no está para cancelar.
      const antes = await (await servicio("rpc/reservas_por_cancelar", { method: "POST", body: "{}" })).json();
      expect((antes as { reserva_id: string }[]).map((r) => r.reserva_id)).not.toContain(id);
      // Hecha hace dos horas: sí, por falta de adjunto.
      await servicio(`reserva_zona?id=eq.${id}`, {
        method: "PATCH",
        body: JSON.stringify({ created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString() }),
      });
      const despues = (await (await servicio("rpc/reservas_por_cancelar", { method: "POST", body: "{}" })).json()) as {
        reserva_id: string;
        motivo: string;
      }[];
      expect(despues.find((r) => r.reserva_id === id)?.motivo).toBe("sin_adjunto");
    } finally {
      const r = await servicio(`reserva_zona?select=id&zona_id=eq.${conCosto.id}`);
      const ids = ((await r.json()) as { id: string }[]).map((f) => f.id);
      if (ids.length) await servicio(`notificacion?entidad_id=in.(${ids.join(",")})`, { method: "DELETE" });
      await conCosto.retirar();
    }
  });
});
