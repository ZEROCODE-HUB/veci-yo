import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, supabase } from "./cliente";
import {
  adjuntarAReclamo,
  cambiarEstadoReclamo,
  crearReclamo,
  obtenerAdjuntos,
  obtenerReclamos,
} from "@/features/perfil/services/pqrs.repo";

/**
 * Recorrido: un vecino abre una PQRS, adjunta algo, y la administración la
 * resuelve.
 *
 * Tiene una costura que merece prueba: **el adjunto no puede subirse antes de
 * que exista la fila**. La política del bucket comprueba que quien sube puede
 * ver el reclamo, así que el orden importa, y si alguien lo invierte el
 * archivo se rechaza sin decir por qué.
 *
 * Y si la fila del adjunto no entra, el archivo se borra del bucket: un
 * archivo que nadie puede ver ni referenciar es basura que se acumula en un
 * sitio privado.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const VECINA = "vecino@veciyo.test"; // Sofía, de la 102
const ADMIN = "admin@veciyo.test";
const AJENO = "propietario@veciyo.test";

const MARCA = "[prueba] recorrido pqrs";

let reclamoId = "";
let vecinaId = "";

function archivoDePrueba() {
  const bytes = Uint8Array.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
  ]);
  return {
    uri: URL.createObjectURL(new Blob([bytes], { type: "image/jpeg" })),
    nombre: "[prueba] foto.jpg",
    tipoMime: "image/jpeg",
    tamanoBytes: bytes.length,
  };
}

beforeAll(async () => {
  vecinaId = await entrarComo(VECINA);
});

afterAll(async () => {
  await salir();
  await entrarComo(ADMIN);
  if (reclamoId) {
    const { data } = await supabase
      .from("adjunto_reclamo")
      .select("ruta")
      .eq("reclamo_id", reclamoId);
    const rutas = (data ?? []).map((a) => a.ruta);
    if (rutas.length) await supabase.storage.from("pqrs").remove(rutas);
    await supabase.from("adjunto_reclamo").delete().eq("reclamo_id", reclamoId);
    await supabase.from("reclamo").delete().eq("id", reclamoId);
  }
  await salir();
});

describe("una PQRS", () => {
  it("la vecina la abre y nace pendiente", async () => {
    const creado = await crearReclamo({
      condominioId: CONDOMINIO,
      unidadId: U102,
      usuarioId: vecinaId,
      nombre: "Sofía",
      datos: {
        titulo: `${MARCA} — gotera en el pasillo`,
        descripcion: "Lleva dos semanas.",
        area: "Condominio",
        tipo: "Reclamo",
        destinatario: "Administrador",
        correo: "vecino@veciyo.test",
        telefono: "+57 310 5550000",
        medioContacto: "Correo",
        modelo: "",
      },
    });
    /*
      Devuelve el id, el **numero visible** que asigno la base y el area ya
      traducida: es lo que la pantalla enseña al confirmar. Un numero adivinado
      antes de escribir seria distinto del que quedo en la fila.
    */
    reclamoId = creado.id;
    expect(reclamoId).toBeTruthy();
    expect(creado.numero).toBeTruthy();
    expect(creado.adjuntosFallidos).toBe(0);

    const { data } = await supabase
      .from("reclamo")
      .select("estado, resuelto_por, resuelto_en")
      .eq("id", reclamoId)
      .single();
    expect(data!.estado).toBe("pendiente");
    // Nace sin resolver: quien resuelve y cuándo se escriben al resolver, no
    // antes.
    expect(data!.resuelto_por).toBeNull();
    expect(data!.resuelto_en).toBeNull();
  });

  it("le cuelga un adjunto, que acaba en el bucket privado", async () => {
    /*
      El adjunto va **después** de la fila: la política del bucket comprueba
      que quien sube puede ver el reclamo, así que sin fila no hay permiso.
    */
    await adjuntarAReclamo({
      reclamoId,
      archivo: archivoDePrueba(),
      usuarioId: vecinaId,
    });

    const adjuntos = await obtenerAdjuntos(reclamoId);
    expect(adjuntos).toHaveLength(1);
    // `nombre` es el nombre visible: en el bucket va uno generado, para que dos
    // personas que suban "foto.jpg" a la misma PQRS no se pisen.
    expect(adjuntos[0].nombre).toContain("foto");

    // Y el archivo está de verdad ahí, no solo la fila que lo menciona.
    const { data, error } = await supabase.storage
      .from("pqrs")
      .download(adjuntos[0].ruta);
    expect(error).toBeNull();
    expect(data!.size).toBeGreaterThan(0);
  });

  it("la ve en su lista", async () => {
    const reclamos = await obtenerReclamos({
      ambito: "propias",
      usuarioId: vecinaId,
    });
    expect(reclamos.some((r) => r.id === reclamoId)).toBe(true);
  });

  it("la administración la resuelve, y queda quién y cuándo", async () => {
    await salir();
    const adminId = await entrarComo(ADMIN);

    await cambiarEstadoReclamo({
      id: reclamoId,
      estado: "Resuelto",
      resolucion: "[prueba] se selló la junta",
      usuarioId: adminId,
    });

    const { data } = await supabase
      .from("reclamo")
      .select("estado, resolucion, resuelto_por, resuelto_en")
      .eq("id", reclamoId)
      .single();

    expect(data!.estado).toBe("resuelto");
    expect(data!.resolucion).toContain("junta");
    // La restricción `reclamo_resuelto_con_actor` exige los dos al resolver:
    // una PQRS resuelta por nadie no se puede reclamar.
    expect(data!.resuelto_por).toBe(adminId);
    expect(data!.resuelto_en).not.toBeNull();
  });

  it("pero un vecino de otra vivienda ni la ve ni la toca", async () => {
    await salir();
    const ajenoId = await entrarComo(AJENO);

    const suyos = await obtenerReclamos({
      ambito: "propias",
      usuarioId: ajenoId,
    });
    expect(suyos.some((r) => r.id === reclamoId)).toBe(false);

    // Y tampoco puede descargar el adjunto, que es donde suele estar la foto
    // de algo que pasó dentro de una casa.
    await salir();
    await entrarComo(ADMIN);
    const adjuntos = await obtenerAdjuntos(reclamoId);
    const ruta = adjuntos[0].ruta;

    await salir();
    await entrarComo(AJENO);
    const { error } = await supabase.storage.from("pqrs").download(ruta);
    expect(error).not.toBeNull();
  });
});
