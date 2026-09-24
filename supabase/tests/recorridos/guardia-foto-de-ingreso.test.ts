import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, supabase } from "./cliente";
import {
  adjuntarFotosVisita,
  crearVisita,
  obtenerVisitas,
  urlFotoVisita,
} from "@/features/visitas/services/visitas.repo";

/**
 * Recorrido: la portería adjunta una foto al registrar un ingreso.
 *
 * El bucket privado `visitas` existe desde el primer día, con sus tres
 * políticas --alta, lectura y baja--, y `subirFotoVisita` y `urlFotoVisita`
 * están escritas. **No las llama nadie.** La pantalla mete en
 * `visita.fotos_ingreso` la URI que devuelve el selector de imágenes, que en
 * web es un `blob:` de la sesión del navegador: en cuanto se recarga la página
 * apunta a nada, y la consola del cliente lo mostró como
 * `net::ERR_FILE_NOT_FOUND`.
 *
 * Es el defecto de siempre --una función escrita y nunca conectada-- con
 * agravante: la foto de un ingreso es prueba de lo que pasó en la portería, y
 * se estaba perdiendo entera.
 *
 * Lo que este recorrido fija: lo que se guarda en la fila es una **ruta del
 * bucket**, el archivo está de verdad ahí, y se puede volver a ver.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const GUARDIA = "guardia@veciyo.test";
const ANFITRIONA = "vecino@veciyo.test";
const ADMIN = "admin@veciyo.test";

const MARCA = "[prueba] recorrido foto";

let visitaId = "";

/** Un JPEG mínimo de verdad, para que el bucket reciba bytes reales. */
function imagenDePrueba(): Blob {
  const bytes = Uint8Array.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
  ]);
  return new Blob([bytes], { type: "image/jpeg" });
}

beforeAll(async () => {
  await entrarComo(ANFITRIONA);
  visitaId = await crearVisita({
    condominioId: CONDOMINIO,
    unidadId: U102,
    tipo: "amigos",
    profesion: MARCA,
    invitados: [{ nombre: "[prueba] con foto" }],
  });
  await salir();
  await entrarComo(GUARDIA);
});

afterAll(async () => {
  await salir();
  await entrarComo(ADMIN);
  if (visitaId) {
    const { data } = await supabase
      .from("visita")
      .select("fotos_ingreso")
      .eq("id", visitaId)
      .maybeSingle();
    const rutas = (data?.fotos_ingreso ?? []).filter((r: string) =>
      r?.startsWith(visitaId),
    );
    if (rutas.length) await supabase.storage.from("visitas").remove(rutas);
    await supabase.from("visita").delete().eq("id", visitaId);
  }
  await salir();
});

describe("la foto de un ingreso", () => {
  it("el guardia la adjunta con una sola llamada", async () => {
    /*
      `adjuntarFotosVisita` es lo que llama la pantalla: recibe la URI que
      devuelve el selector de imágenes, la sube al bucket y deja la ruta en la
      fila. Antes no existía --la pantalla guardaba la URI tal cual-- y las dos
      funciones que sí existían no las llamaba nadie.
    */
    const uri = URL.createObjectURL(imagenDePrueba());
    const rutas = await adjuntarFotosVisita(visitaId, [uri], "ingreso");
    expect(rutas).toHaveLength(1);
    // La ruta empieza por el uuid de la visita: de ahí derivan las políticas
    // de Storage quién puede verla.
    expect(rutas[0].startsWith(`${visitaId}/`)).toBe(true);
  });

  it("y no pisa las que ya había", async () => {
    // Relee antes de escribir: dos guardias adjuntando a la vez no se borran
    // el trabajo el uno al otro.
    const uri = URL.createObjectURL(imagenDePrueba());
    const rutas = await adjuntarFotosVisita(visitaId, [uri], "ingreso");
    expect(rutas).toHaveLength(2);
  });

  it("y lo que queda en la fila es una ruta, no un `blob:`", async () => {
    /*
      El caso que describe el defecto. Una URI `blob:` vive solo en la pestaña
      que la creó: al recargar, la foto ya no existe y la prueba de lo que pasó
      en la portería se perdió.
    */
    const visitas = await obtenerVisitas();
    const mia = visitas.find((v) => v.uuid === visitaId)!;
    expect(mia.fotosIngreso).toHaveLength(2);
    const guardada = mia.fotosIngreso![0];
    expect(guardada.startsWith("blob:")).toBe(false);
    expect(guardada.startsWith("file:")).toBe(false);
    expect(guardada.startsWith(`${visitaId}/`)).toBe(true);
  });

  it("el archivo está de verdad en el bucket y se puede volver a ver", async () => {
    // Control de que la ruta no es una cadena bonita sin nada detrás.
    const visitas = await obtenerVisitas();
    const ruta = visitas.find((v) => v.uuid === visitaId)!.fotosIngreso![0];

    const url = await urlFotoVisita(ruta, 60);
    expect(url).toContain("/storage/v1/object/sign/visitas/");

    const respuesta = await fetch(url);
    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("content-type")).toContain("image");
  });

  it("y un vecino de otra vivienda no la ve", async () => {
    /*
      El control negativo: la foto de un ingreso dice quién entró en qué casa y
      a qué hora. Guillermo es propietario de la 101 y la 205, no de la 102.
    */
    const visitas = await obtenerVisitas();
    const ruta = visitas.find((v) => v.uuid === visitaId)!.fotosIngreso![0];
    await salir();
    await entrarComo("propietario@veciyo.test");

    const { error } = await supabase.storage.from("visitas").download(ruta);
    expect(error).not.toBeNull();

    await salir();
    await entrarComo(GUARDIA);
  });
});
