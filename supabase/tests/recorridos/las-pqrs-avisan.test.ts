import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio } from "./cliente";
import {
  cambiarEstadoReclamo,
  crearReclamo,
  obtenerReclamos,
  type NuevoReclamo,
} from "@/features/perfil/services/pqrs.repo";

/**
 * Recorrido: las PQRS avisan, y el anfitrión ve las de su huésped
 * (15/10/2026, hueco 14).
 *
 * En la 102: Sofía es la anfitriona, Rocío vive allí sin ser anfitriona y
 * Tomás es huésped. Marcela administra.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const SOFIA = "vecino@veciyo.test";
const ROCIO = "residente@veciyo.test";
const TOMAS = "nuevo.inquilino@veciyo.test";
const MARCELA = "admin@veciyo.test";
const GUILLERMO = "propietario@veciyo.test"; // de otra vivienda
const MARCA = "[prueba] pqrs avisan";

const ids: Record<string, string> = {};
const reclamos: string[] = [];

const datos = (titulo: string, extra: Partial<NuevoReclamo> = {}): NuevoReclamo => ({
  titulo: `${MARCA} ${titulo}`,
  descripcion: "Lo de siempre.",
  area: "condominio",
  tipo: "reclamo",
  destinatario: "Administrador",
  correo: "",
  telefono: "",
  codigoPais: "CO",
  medioContacto: "Correo",
  modelo: "",
  ...extra,
});

const abrir = async (correo: string, d: NuevoReclamo) => {
  await entrarComo(correo);
  const { id } = await crearReclamo({
    condominioId: CONDOMINIO,
    unidadId: U102,
    usuarioId: ids[correo],
    nombre: "Prueba",
    datos: d,
  });
  await salir();
  reclamos.push(id);
  return id;
};

const avisos = async (correo: string, reclamo: string) => {
  const { data } = await servicio
    .from("notificacion")
    .select("tipo")
    .eq("usuario_id", ids[correo])
    .eq("entidad_id", reclamo);
  return (data ?? []).map((n) => n.tipo);
};

/** Lo que ve la anfitriona en su pantalla de PQRS, de las de esta prueba. */
const loQueVeSofia = async () => {
  await entrarComo(SOFIA);
  const lista = await obtenerReclamos({ ambito: "anfitrion", usuarioId: ids[SOFIA], unidadId: U102 });
  await salir();
  return lista.map((r) => r.id).filter((id) => reclamos.includes(id));
};

beforeAll(async () => {
  for (const correo of [SOFIA, ROCIO, TOMAS, MARCELA, GUILLERMO]) {
    ids[correo] = await entrarComo(correo);
    await salir();
  }
  // Se trae su propio cero.
  await servicio.from("reclamo").delete().like("titulo", `${MARCA}%`);
});

afterAll(async () => {
  await salir();
  if (reclamos.length) {
    await servicio.from("notificacion").delete().in("entidad_id", reclamos);
    // `reclamo` no tiene política de DELETE: con la clave de servicio.
    const { error } = await servicio.from("reclamo").delete().in("id", reclamos);
    if (error) throw new Error(error.message);
  }
});

describe("una PQRS nueva", () => {
  it("le avisa a la administración, no a quien la creó", async () => {
    const id = await abrir(SOFIA, datos("gotera"));
    expect(await avisos(MARCELA, id)).toEqual(["reclamo_nuevo"]);
    expect(await avisos(SOFIA, id)).toEqual([]);
  });

  it("la de un huésped la ve su anfitriona, y le avisa", async () => {
    const id = await abrir(TOMAS, datos("ruido del vecino"));
    expect(await loQueVeSofia()).toContain(id);
    expect(await avisos(SOFIA, id)).toEqual(["reclamo_nuevo"]);
    // El dueño de otra vivienda, no.
    expect(await avisos(GUILLERMO, id)).toEqual([]);
  });

  it("la dirigida a «Propietario» la ve la anfitriona; la de una residente a la administración, no", async () => {
    const paraElla = await abrir(ROCIO, datos("para la duena", { destinatario: "Propietario" }));
    const paraLaAdmin = await abrir(ROCIO, datos("para la administracion"));
    const ve = await loQueVeSofia();
    expect(ve).toContain(paraElla);
    expect(ve).not.toContain(paraLaAdmin);
    expect(await avisos(SOFIA, paraElla)).toEqual(["reclamo_nuevo"]);
    expect(await avisos(SOFIA, paraLaAdmin)).toEqual([]);
  });

  it("una sobre la aplicación no le llega a nadie del edificio", async () => {
    const id = await abrir(TOMAS, datos("la app se cierra", { area: "aplicacion", tipo: "soporte", modelo: "Pixel 9" }));
    expect(await loQueVeSofia()).not.toContain(id);
    expect(await avisos(MARCELA, id)).toEqual([]);
    expect(await avisos(SOFIA, id)).toEqual([]);
  });
});

describe("la respuesta", () => {
  it("le avisa a quien la creó, y no a quien responde", async () => {
    const id = reclamos[0];
    await entrarComo(MARCELA);
    await cambiarEstadoReclamo({
      id,
      estado: "Resuelto",
      resolucion: "Ya vino el plomero.",
      usuarioId: ids[MARCELA],
    });
    await salir();

    expect(await avisos(SOFIA, id)).toEqual(["reclamo_respondido"]);
    expect(await avisos(MARCELA, id)).toEqual(["reclamo_nuevo"]);
  });
});
