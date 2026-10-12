import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio, supabase } from "./cliente";
import {
  cambiarEstadoCorrespondencia,
  crearCorrespondencia,
  obtenerCorrespondencia,
  obtenerPermisosDeEntrega,
  registrarCorrespondencia,
  reportarIncidencia,
  urlsDeFotos,
} from "@/features/correspondencia/services/correspondencia.repo";
import { sinEntregaEnPuerta } from "@/features/correspondencia/helpers/destinos";

/**
 * Recorrido: lo que la pantalla de «Agregar correspondencia» decía hacer y no
 * hacía. Lo revisó el cliente campo por campo el 12/10/2026:
 *
 *  · se marcaban varios departamentos y se registraba **uno**;
 *  · las fotos no se guardaban en ningún sitio --y las de una incidencia se
 *    guardaban como la dirección del archivo en el teléfono de quien las tomó--;
 *  · «Entrega en puerta» se ofrecía siempre, y el motivo del rechazo llegaba
 *    al final.
 *
 * Crea lo suyo, con su marca, y se lo lleva: filas, avisos y archivos.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U101 = "44444444-4444-4444-4444-444444444441";
const U102 = "44444444-4444-4444-4444-444444444443";
const U205 = "44444444-4444-4444-4444-444444444442";
const GUARDIA = "guardia@veciyo.test";
const VECINA = "vecino@veciyo.test"; // Sofía, de la 102
const AJENO = "propietario@veciyo.test"; // Guillermo: 101 y 205

// Propia de este archivo: la limpieza borra por ella y no puede llevarse nada
// de otro recorrido.
const MARCA = "[prueba] correspondencia con fotos";
const EMPRESA = "[prueba] fotos y varias viviendas";

/** Un PNG de un píxel. En Node `fetch` sabe leer un `data:`. */
const FOTO = {
  uri: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  nombre: "foto.png",
  tipoMime: "image/png",
};

const unidadDe = (unidadId: string, codigo: string) => ({
  unidadId,
  condominioId: CONDOMINIO,
  codigo,
  piso: 1,
  torreNumero: 1,
  torreNombre: "",
  torre: "Torre 1",
});

async function limpiar() {
  const { data: filas } = await servicio
    .from("correspondencia")
    .select("id, fotos")
    .eq("descripcion", MARCA);
  const ids = (filas ?? []).map((f) => f.id as string);
  if (ids.length === 0) return;

  /*
    Los archivos se buscan en la carpeta, no en lo que dicen las filas: una
    subida cuya fila no llegó a escribirse --pasa al mutar la política-- deja
    un archivo que ninguna fila nombra.
  */
  for (const id of ids) {
    const { data: archivos } = await servicio.storage
      .from("correspondencia")
      .list(id);
    const rutas = (archivos ?? []).map((a) => `${id}/${a.name}`);
    if (rutas.length > 0) {
      await servicio.storage.from("correspondencia").remove(rutas);
    }
  }
  // Registrar avisa a la vivienda, y el aviso no cuelga de la fila por FK.
  await servicio.from("notificacion").delete().in("entidad_id", ids);
  const { error } = await servicio.from("correspondencia").delete().in("id", ids);
  expect(error).toBeNull();
}

async function idsCon(descripcion: string) {
  const { data } = await servicio
    .from("correspondencia")
    .select("id, unidad_id, fotos, condicion")
    .eq("descripcion", descripcion);
  return data ?? [];
}

beforeAll(async () => {
  // Una corrida que murió a medias deja las suyas: este archivo cuenta filas.
  await limpiar();
  await entrarComo(GUARDIA);
});

afterAll(async () => {
  await salir();
  await limpiar();
});

describe("un envío para varias viviendas", () => {
  it("deja una fila por vivienda, no solo la primera", async () => {
    const resultado = await registrarCorrespondencia(
      [U101, U205].map((unidadId) => ({
        condominioId: CONDOMINIO,
        unidadId,
        empresa: EMPRESA,
        descripcion: MARCA,
      })),
    );

    expect(resultado.fallidas).toHaveLength(0);
    expect(resultado.registradas).toEqual([U101, U205]);

    const filas = await idsCon(MARCA);
    expect(filas.map((f) => f.unidad_id).sort()).toEqual([U101, U205].sort());
  });

  it("si una vivienda lo rechaza, las demás se registran y se dice cuál no", async () => {
    /*
      La 102 no tiene autorizada la entrega en puerta. Se comprueba aquí, y no
      se da por supuesto: si alguien se la concede, este caso tiene que
      decirlo en vez de ponerse rojo por otra cosa.
    */
    const permisos = await obtenerPermisosDeEntrega();
    const vedadas = sinEntregaEnPuerta(permisos, [unidadDe(U102, "102")]);
    expect(vedadas.map((u) => u.unidadId)).toEqual([U102]);

    const antes = (await idsCon(MARCA)).length;
    const resultado = await registrarCorrespondencia([
      {
        condominioId: CONDOMINIO,
        unidadId: U102,
        empresa: EMPRESA,
        descripcion: MARCA,
        entregaEnPuerta: true,
      },
      {
        condominioId: CONDOMINIO,
        unidadId: U101,
        empresa: EMPRESA,
        descripcion: MARCA,
      },
    ]);

    expect(resultado.registradas).toEqual([U101]);
    expect(resultado.fallidas.map((f) => f.unidadId)).toEqual([U102]);
    // El motivo viaja entero: es lo que la pantalla le enseña a la portería.
    expect(
      (resultado.fallidas[0].error as { message: string }).message,
    ).toMatch(/entrega en puerta/i);
    expect((await idsCon(MARCA)).length).toBe(antes + 1);
  });

  it("lo que la pantalla avisa coincide con lo que la base rechaza", async () => {
    // La otra mitad: sin el interruptor, la misma vivienda sí lo acepta.
    const resultado = await registrarCorrespondencia([
      {
        condominioId: CONDOMINIO,
        unidadId: U102,
        empresa: EMPRESA,
        descripcion: `${MARCA} sin puerta`,
        entregaEnPuerta: false,
      },
    ]);
    expect(resultado.fallidas).toHaveLength(0);

    const [fila] = await idsCon(`${MARCA} sin puerta`);
    await servicio.from("notificacion").delete().eq("entidad_id", fila.id);
    await servicio.from("correspondencia").delete().eq("id", fila.id);
  });
});

describe("las fotos de un envío", () => {
  let envio = "";
  let rutas: string[] = [];

  it("se suben, y la fila guarda su ruta en el bucket", async () => {
    envio = await crearCorrespondencia({
      condominioId: CONDOMINIO,
      unidadId: U102,
      empresa: EMPRESA,
      descripcion: MARCA,
      instrucciones: "[prueba] dejar en recepción",
      fotos: [FOTO],
    });

    const { data } = await servicio
      .from("correspondencia")
      .select("fotos, instrucciones")
      .eq("id", envio)
      .single();
    rutas = data!.fotos as string[];

    expect(rutas).toHaveLength(1);
    // Una ruta del bucket, en la carpeta del envío: no una dirección local.
    expect(rutas[0].startsWith(`${envio}/`)).toBe(true);
    expect(data!.instrucciones).toContain("recepción");
  });

  it("la portería que la subió la ve", async () => {
    expect(await urlsDeFotos(rutas)).toHaveLength(1);
  });

  it("la vecina de esa vivienda la ve, y le llega en su lista", async () => {
    await salir();
    await entrarComo(VECINA);

    const items = await obtenerCorrespondencia({
      ambito: "unidad",
      unidadIds: [U102],
    });
    const suyo = items.find((i) => i.uuid === envio);
    expect(suyo?.fotos).toEqual(rutas);
    expect(suyo?.instrucciones).toContain("recepción");

    const urls = await urlsDeFotos(rutas);
    expect(urls).toHaveLength(1);
    // Y la dirección abre de verdad el archivo.
    const respuesta = await fetch(urls[0]);
    expect(respuesta.status).toBe(200);
  });

  it("quien no vive ahí no la ve ni puede colgarle otra", async () => {
    // Una foto de un paquete dice quién te compra qué.
    await salir();
    await entrarComo(AJENO);

    expect(await urlsDeFotos(rutas)).toHaveLength(0);

    const { error } = await supabase.storage
      .from("correspondencia")
      .upload(`${envio}/intruso.png`, new Uint8Array([1, 2, 3]), {
        contentType: "image/png",
      });
    expect(error).not.toBeNull();

    await salir();
    await entrarComo(GUARDIA);
  });

  it("las de una incidencia también se suben, y corrigen el estado en que llegó", async () => {
    await reportarIncidencia(envio, `${MARCA} — llegó mojado`, [FOTO], "Mal estado");

    const { data } = await servicio
      .from("incidencia_correspondencia")
      .select("fotos")
      .eq("correspondencia_id", envio)
      .single();
    const deLaIncidencia = data!.fotos as string[];
    expect(deLaIncidencia).toHaveLength(1);
    expect(deLaIncidencia[0].startsWith(`${envio}/`)).toBe(true);
    expect(await urlsDeFotos(deLaIncidencia)).toHaveLength(1);

    const { data: fila } = await servicio
      .from("correspondencia")
      .select("condicion")
      .eq("id", envio)
      .single();
    expect(fila!.condicion).toBe("mal_estado");
  });

  it("una dirección local de antes no se pide al bucket", async () => {
    expect(await urlsDeFotos(["blob:http://localhost/abc", "file:///x.jpg"])).toEqual(
      [],
    );
  });
});

describe("una entrega marcada por error", () => {
  it("al deshacerla, el envío deja de decir a quién y cuándo se entregó", async () => {
    const id = await crearCorrespondencia({
      condominioId: CONDOMINIO,
      unidadId: U101,
      empresa: EMPRESA,
      descripcion: MARCA,
    });

    await cambiarEstadoCorrespondencia(id, "Entregado", {
      entregadoA: "[prueba] quien no era",
    });
    const entregado = await servicio
      .from("correspondencia")
      .select("estado, entregada_en, entregada_a")
      .eq("id", id)
      .single();
    // El control: de verdad quedó entregado, con su nombre.
    expect(entregado.data!.estado).toBe("entregado");
    expect(entregado.data!.entregada_a).toContain("quien no era");

    await cambiarEstadoCorrespondencia(id, "En Portería");
    const devuelto = await servicio
      .from("correspondencia")
      .select("estado, entregada_en, entregada_a")
      .eq("id", id)
      .single();
    expect(devuelto.data!.estado).toBe("en_porteria");
    expect(devuelto.data!.entregada_en).toBeNull();
    expect(devuelto.data!.entregada_a).toBeNull();
  });
});
