import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { retirarEstancia, enDias, entrarComo, salir, servicio, supabase, ventanaDe } from "./cliente";
import { crearVisita } from "@/features/visitas/services/visitas.repo";
import { abrirPrecheckin } from "@/features/visitas/services/precheckin.repo";
import {
  aceptarReglamento,
  aceptarTerminos,
  cerrarPrecheckin,
  guardarAcompanante,
  guardarFicha,
  guardarVehiculo,
} from "../../../../veciyo-web/src/lib/precheckin";

/**
 * Recorrido: el anfitrión no dice cuántos vienen, y lo dice el huésped
 * (15/10/2026).
 *
 * El cliente pidió que el número de personas y menores sea opcional: si el
 * anfitrión lo deja en blanco, el huésped pone en su preregistro a quienes
 * vienen —adultos, menores y vehículos— y el único tope es el aforo del
 * alojamiento. Y, «por ahora», con el preregistro cerrado no se añade a nadie
 * más.
 */

const V = ventanaDe("con-el-preregistro-cerrado-nadie-mas");

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const ANFITRIONA = "vecino@veciyo.test";
const MARCA = "[prueba] cerrado nadie mas";

let visitaId = "";
let token = "";
let titularId = "";

beforeAll(async () => {
  await entrarComo(ANFITRIONA);
  // Sin `huespedesPrevistos` ni `menoresPrevistos`: lo que hace la pantalla
  // del anfitrión cuando no marca «Sé cuántas personas vienen».
  visitaId = await crearVisita({
    condominioId: CONDOMINIO,
    unidadId: U102,
    tipo: "huesped_temporal",
    fechaDesde: enDias(V),
    fechaHasta: enDias(V + 3),
    anotacionesIngreso: MARCA,
    invitados: [{ nombre: `${MARCA} titular` }],
  });
  token = (await abrirPrecheckin(visitaId)).enlace.split("/access/")[1];
  await salir();

  titularId = await guardarFicha(
    token,
    {
      nombre: "Marta",
      apellidos: "Prueba",
      tipoDocumento: "cedula_ciudadania",
      documento: "9930405060",
      correo: "marta.cerrado@veciyo.test",
    },
    supabase as never,
  );
  await aceptarTerminos(token, supabase as never);
  await aceptarReglamento(token, supabase as never);
});

afterAll(async () => {
  const { data: invitados } = await servicio.from("invitado").select("id").eq("visita_id", visitaId);
  const ids = (invitados ?? []).map((i) => i.id);
  if (ids.length > 0) {
    await servicio.from("reporte_legal").delete().in("invitado_id", ids);
    await servicio.from("invitacion").delete().in("invitado_id", ids);
  }
  const { error } = await retirarEstancia(visitaId);
  if (error) throw new Error(`No se pudo retirar ${visitaId}: ${error.message}`);
  await salir();
});

describe("sin número del anfitrión", () => {
  it("la reserva no trae tope propio: manda el aforo del alojamiento", async () => {
    const { data } = await supabase.rpc("consultar_precheckin", { p_token: token });
    const estancia = (Array.isArray(data) ? data[0] : data)!;
    expect(estancia.huespedes_previstos).toBeNull();
    expect(estancia.menores_previstos).toBeNull();
    expect(estancia.max_huespedes as number).toBeGreaterThan(1);
  });

  it("el huésped pone a un menor y un vehículo, y cierra", async () => {
    await guardarAcompanante(
      token,
      {
        nombre: "Tomas",
        apellidos: "Prueba",
        esMenor: true,
        fechaNacimiento: "2019-04-04",
        tipoDocumento: "registro_civil",
        documento: "991122",
        responsableId: titularId,
        parentesco: "madre",
      },
      supabase as never,
    );
    await guardarVehiculo(token, { placa: "PRB123", responsableId: titularId }, supabase as never);
    await cerrarPrecheckin(token, supabase as never, "https://veciyo.test");

    const { data } = await servicio
      .from("visita")
      .select("precheckin_completado_en")
      .eq("id", visitaId)
      .single();
    expect(data!.precheckin_completado_en).not.toBeNull();
  });
});

describe("con el preregistro cerrado", () => {
  it("no se añade otro adulto", async () => {
    await expect(
      guardarAcompanante(
        token,
        { nombre: "Tarde", tipoDocumento: "cedula_ciudadania", documento: "990999" },
        supabase as never,
      ),
    ).rejects.toThrow(/cerrad|no vale|vencio/i);
  });

  it("ni otro menor", async () => {
    await expect(
      guardarAcompanante(
        token,
        {
          nombre: "Otra",
          esMenor: true,
          fechaNacimiento: "2020-01-01",
          responsableId: titularId,
          parentesco: "madre",
        },
        supabase as never,
      ),
    ).rejects.toThrow(/cerrad|no vale|vencio/i);
  });

  it("ni otro vehículo", async () => {
    await expect(
      guardarVehiculo(token, { placa: "PRB999", responsableId: titularId }, supabase as never),
    ).rejects.toThrow(/cerrad|no vale|vencio/i);
  });

  it("y la reserva sigue con las mismas dos personas", async () => {
    const { count } = await servicio
      .from("invitado")
      .select("id", { count: "exact", head: true })
      .eq("visita_id", visitaId);
    expect(count).toBe(2);
  });
});
