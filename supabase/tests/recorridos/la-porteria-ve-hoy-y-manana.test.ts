import { deflateSync } from "node:zlib";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio, supabase } from "./cliente";
import { obtenerVisitas } from "@/features/visitas/services/visitas.repo";
import {
  obtenerTraficoDePorteria,
  subirFotoDePorteria,
  verificarEnPorteria,
} from "@/features/visitas/services/porteria.repo";

/**
 * Recorrido: la porteria ve hoy, mañana y a quien esta dentro. Nada mas.
 *
 * Decidido con el cliente el 09/10/2026, y **cerrado en la base**: hasta ese
 * dia el guardia leia todas las visitas del edificio, de cualquier fecha.
 *
 * Cinco visitas, una por cada lado de la regla:
 *
 *   · de ayer y sin entrar ............ fuera
 *   · de ayer y **dentro** ............ se ve (hay que poder darle salida)
 *   · de hoy .......................... se ve
 *   · de mañana ....................... se ve
 *   · de dentro de tres dias .......... fuera
 *
 * Y cada «no la ve» lleva al lado quien **si** la ve: sin eso, no ver nada
 * pasaria igual con la tabla vacia.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
// La 101: no tiene renta corta, asi que estas visitas no pisan a nadie.
const U101 = "44444444-4444-4444-4444-444444444441";
const GUARDIA = "guardia@veciyo.test";
const ADMIN = "admin@veciyo.test";
const DUENO_101 = "propietario@veciyo.test";
const VECINA_102 = "vecino@veciyo.test";

const MARCA = "[prueba] ventana de porteria";

type Clave = "ayer" | "dentro" | "hoy" | "manana" | "lejos";
const visita = {} as Record<Clave, string>;
const invitado = {} as Record<Clave, string>;
let guardiaId = "";
let diaLejos = "";

/** El dia de hoy **en el edificio**, que es con el que cuenta la regla. */
async function hoyEnElEdificio(): Promise<Date> {
  const { data: zona, error } = await servicio.rpc("zona_horaria_del_condominio", {
    p_condominio_id: CONDOMINIO,
  });
  if (error) throw new Error(error.message);
  const iso = new Intl.DateTimeFormat("en-CA", { timeZone: zona as string }).format(
    new Date(),
  );
  return new Date(`${iso}T00:00:00Z`);
}

function masDias(hoy: Date, dias: number): string {
  const d = new Date(hoy);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

async function abrir(clave: Clave, dia: string, documento: string) {
  const { data, error } = await servicio
    .from("visita")
    .insert({
      condominio_id: CONDOMINIO,
      unidad_id: U101,
      tipo: "amigos",
      fecha_desde: dia,
      fecha_hasta: dia,
      hora_estimada_llegada: "10:00",
      anotaciones_ingreso: MARCA,
    })
    .select("id")
    .single();
  if (error) throw new Error(`No se pudo abrir «${clave}»: ${error.message}`);
  visita[clave] = data.id;

  const { data: persona, error: e2 } = await servicio
    .from("invitado")
    .insert({
      visita_id: data.id,
      orden: 0,
      nombre: `${MARCA} ${clave}`,
      tipo_documento: "cedula_ciudadania",
      documento_numero: documento,
    })
    .select("id")
    .single();
  if (e2) throw new Error(`No se pudo apuntar a «${clave}»: ${e2.message}`);
  invitado[clave] = persona.id;
}

/**
 * Una imagen PNG de verdad, gris y lisa, hecha aqui: asi la prueba no depende
 * de un archivo suelto en el repositorio.
 */
function pngLiso(ancho: number, alto: number): string {
  const crcDe = (datos: Buffer) => {
    let c = ~0;
    for (const byte of datos) {
      c ^= byte;
      for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
    return ~c >>> 0;
  };
  const trozo = (tipo: string, datos: Buffer) => {
    const cabeza = Buffer.alloc(4);
    cabeza.writeUInt32BE(datos.length);
    const cuerpo = Buffer.concat([Buffer.from(tipo, "latin1"), datos]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crcDe(cuerpo));
    return Buffer.concat([cabeza, cuerpo, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(ancho, 0);
  ihdr.writeUInt32BE(alto, 4);
  ihdr.set([8, 2, 0, 0, 0], 8); // 8 bits, RGB
  const fila = Buffer.concat([Buffer.from([0]), Buffer.alloc(ancho * 3, 200)]);
  const pixeles = Buffer.concat(Array.from({ length: alto }, () => fila));
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    trozo("IHDR", ihdr),
    trozo("IDAT", deflateSync(pixeles)),
    trozo("IEND", Buffer.alloc(0)),
  ]).toString("base64");
}

async function retirarTodo() {
  const { data: viejas } = await servicio
    .from("visita")
    .select("id")
    .eq("anotaciones_ingreso", MARCA);
  const ids = (viejas ?? []).map((v) => v.id);
  if (ids.length === 0) return;

  const { data: personas } = await servicio
    .from("invitado")
    .select("id")
    .in("visita_id", ids);
  const quienes = (personas ?? []).map((p) => p.id);
  if (quienes.length > 0) {
    await servicio.from("verificacion_documento").delete().in("invitado_id", quienes);
  }
  for (const id of ids) {
    // Lo que haya subido la porteria lleva la hora en el nombre: se lista.
    const { data: suyos } = await servicio.storage.from("visitas").list(id);
    const rutas = (suyos ?? []).map((a) => `${id}/${a.name}`);
    if (rutas.length > 0) await servicio.storage.from("visitas").remove(rutas);
    await servicio.storage
      .from("visitas")
      .remove([`${id}/documento-frente-prueba.jpg`, `${id}/porteria-prueba.jpg`]);
  }
  const { error } = await servicio.from("visita").delete().in("id", ids);
  if (error) throw new Error(`No se pudo retirar: ${error.message}`);
}

beforeAll(async () => {
  // Lo que dejara una corrida que murio a medias, antes de contar nada.
  await retirarTodo();

  const hoy = await hoyEnElEdificio();
  diaLejos = masDias(hoy, 3);

  await abrir("ayer", masDias(hoy, -1), "1000000001");
  await abrir("dentro", masDias(hoy, -1), "1000000002");
  await abrir("hoy", masDias(hoy, 0), "1.000.000-003");
  await abrir("manana", masDias(hoy, 1), "1000000004");
  await abrir("lejos", diaLejos, "1000000005");

  // Entro ayer y no ha salido: el disparador pasa la visita a `ingresada`.
  const { error } = await servicio
    .from("invitado")
    .update({ llego: true, ingreso_en: new Date(Date.now() - 20 * 3600_000).toISOString() })
    .eq("id", invitado.dentro);
  if (error) throw new Error(error.message);

  const { error: e3 } = await servicio
    .from("vehiculo_visita")
    .insert({ visita_id: visita.lejos, placa: "LEJ999" });
  if (e3) throw new Error(e3.message);

  // Dos archivos en la visita de hoy: lo que subio el huesped y lo de la porteria.
  for (const nombre of ["documento-frente-prueba.jpg", "porteria-prueba.jpg"]) {
    const { error: e4 } = await servicio.storage
      .from("visitas")
      .upload(`${visita.hoy}/${nombre}`, new Blob(["prueba"], { type: "image/jpeg" }), {
        contentType: "image/jpeg",
        upsert: true,
      });
    if (e4) throw new Error(`No se pudo subir ${nombre}: ${e4.message}`);
  }
});

afterAll(async () => {
  await retirarTodo();
  await salir();
});

describe("lo que la porteria tiene en su lista", () => {
  it("por la aplicacion: hoy, mañana y quien esta dentro", async () => {
    guardiaId = await entrarComo(GUARDIA);
    const lista = await obtenerVisitas({ ambito: "condominio", unidadIds: [] });
    const mias = new Set(lista.map((v) => v.uuid));

    expect(mias.has(visita.hoy)).toBe(true);
    expect(mias.has(visita.manana)).toBe(true);
    expect(mias.has(visita.dentro)).toBe(true);

    expect(mias.has(visita.ayer)).toBe(false);
    expect(mias.has(visita.lejos)).toBe(false);
  });

  it("y pidiendolas una a una tampoco: no es un filtro de la pantalla", async () => {
    await entrarComo(GUARDIA);
    const { data, error } = await supabase
      .from("visita")
      .select("id")
      .in("id", Object.values(visita));
    expect(error).toBeNull();
    expect((data ?? []).map((v) => v.id).sort()).toEqual(
      [visita.dentro, visita.hoy, visita.manana].sort(),
    );
  });

  it("ni la gente ni los vehiculos de las que no ve", async () => {
    await entrarComo(GUARDIA);
    const { data: personas } = await supabase
      .from("invitado")
      .select("id")
      .in("id", Object.values(invitado));
    expect((personas ?? []).map((p) => p.id).sort()).toEqual(
      [invitado.dentro, invitado.hoy, invitado.manana].sort(),
    );

    const { data: coches } = await supabase
      .from("vehiculo_visita")
      .select("placa")
      .eq("visita_id", visita.lejos);
    expect(coches ?? []).toEqual([]);
  });

  it("la administracion si las ve todas", async () => {
    // El control: si nadie las viera, lo de arriba no probaria nada.
    await entrarComo(ADMIN);
    const { data } = await supabase
      .from("visita")
      .select("id")
      .in("id", Object.values(visita));
    expect(data ?? []).toHaveLength(5);
  });

  it("y el dueño de la vivienda ve la suya de dentro de tres dias, con su vehiculo", async () => {
    await entrarComo(DUENO_101);
    const lista = await obtenerVisitas({ ambito: "unidad", unidadIds: [U101] });
    const lejos = lista.find((v) => v.uuid === visita.lejos);
    expect(lejos?.vehiculos?.[0]?.placa).toBe("LEJ999");
  });
});

describe("el grafico mira mas dias, pero en numeros", () => {
  it("la porteria sabe cuantos vienen un dia que no puede listar", async () => {
    await entrarComo(GUARDIA);
    const franjas = await obtenerTraficoDePorteria(CONDOMINIO, diaLejos);

    const alasDiez = franjas.find((f) => f.movimiento === "ingreso" && f.hora === 10);
    expect(alasDiez?.personas).toBeGreaterThanOrEqual(1);
    expect(alasDiez?.conVehiculo).toBeGreaterThanOrEqual(1);
    // Numeros y nada mas: ni un nombre, ni un documento, ni un id.
    expect(Object.keys(franjas[0]).sort()).toEqual(
      ["conVehiculo", "esHuesped", "hora", "movimiento", "personas"].sort(),
    );
  });

  it("y una vecina no: el trafico del edificio no es suyo", async () => {
    await entrarComo(VECINA_102);
    await expect(obtenerTraficoDePorteria(CONDOMINIO, diaLejos)).rejects.toThrow(
      /personal del edificio/i,
    );
  });
});

describe("coincide: el numero que enseñan contra el que escribieron", () => {
  it("coincide aunque uno lleve puntos y el otro no, y queda quien lo miro", async () => {
    await entrarComo(GUARDIA);
    // En la ficha esta «1.000.000-003»; la porteria teclea solo los digitos.
    expect(await verificarEnPorteria(invitado.hoy, "1000000003")).toBe(true);

    const { data } = await servicio
      .from("verificacion_documento")
      .select("estado, verificado_por, verificado_en")
      .eq("invitado_id", invitado.hoy)
      .single();
    expect(data?.estado).toBe("verificado");
    expect(data?.verificado_por).toBe(guardiaId);
    expect(data?.verificado_en).toBeTruthy();
  });

  it("y otro numero no coincide", async () => {
    // Sin esta mitad, una funcion que dijera siempre que si pasaria la de arriba.
    await entrarComo(GUARDIA);
    expect(
      await verificarEnPorteria(invitado.manana, "9999999999", "trae otra cedula"),
    ).toBe(false);

    const { data } = await servicio
      .from("verificacion_documento")
      .select("estado, observaciones")
      .eq("invitado_id", invitado.manana)
      .single();
    expect(data?.estado).toBe("no_coincide");
    expect(data?.observaciones).toBe("trae otra cedula");
  });

  it("a quien no esta en su lista no lo puede verificar", async () => {
    await entrarComo(GUARDIA);
    await expect(verificarEnPorteria(invitado.lejos, "1000000005")).rejects.toThrow(
      /lista de la porteria/i,
    );
  });

  it("y quien no es guardia, a nadie", async () => {
    // El dueño de la vivienda **si** ve la visita: lo que no puede es firmar
    // como porteria que comprobo un documento.
    await entrarComo(DUENO_101);
    await expect(verificarEnPorteria(invitado.hoy, "1000000003")).rejects.toThrow(
      /lista de la porteria/i,
    );
  });
});

describe("la foto del documento del huesped no es de la porteria", () => {
  it("el guardia no la puede abrir, y la suya si", async () => {
    await entrarComo(GUARDIA);
    const delHuesped = await supabase.storage
      .from("visitas")
      .download(`${visita.hoy}/documento-frente-prueba.jpg`);
    expect(delHuesped.data).toBeNull();

    const laSuya = await supabase.storage
      .from("visitas")
      .download(`${visita.hoy}/porteria-prueba.jpg`);
    expect(laSuya.error).toBeNull();
    expect(await laSuya.data?.text()).toBe("prueba");
  });

  it("el dueño de la vivienda si abre la del huesped", async () => {
    await entrarComo(DUENO_101);
    const { data, error } = await supabase.storage
      .from("visitas")
      .download(`${visita.hoy}/documento-frente-prueba.jpg`);
    expect(error).toBeNull();
    expect(await data?.text()).toBe("prueba");
  });
});

describe("la foto que toma la porteria", () => {
  let ruta = "";

  it("se guarda con marca de agua: lo que queda no es lo que se mando", async () => {
    await entrarComo(GUARDIA);
    const enviada = pngLiso(400, 260);
    ruta = await subirFotoDePorteria(invitado.hoy, enviada);

    // En la carpeta de la visita y con el nombre que la separa de la del huesped.
    expect(ruta.startsWith(`${visita.hoy}/porteria-${invitado.hoy}-`)).toBe(true);

    const { data: fila } = await servicio
      .from("verificacion_documento")
      .select("documento_tomado_path, estado")
      .eq("invitado_id", invitado.hoy)
      .single();
    expect(fila?.documento_tomado_path).toBe(ruta);
    // Tomar la foto no cambia la verificacion: seguia verificado de antes.
    expect(fila?.estado).toBe("verificado");

    const { data, error } = await supabase.storage.from("visitas").download(ruta);
    expect(error).toBeNull();
    const bytes = Buffer.from(await data!.arrayBuffer());
    // Sale JPEG aunque entro PNG: es la imagen que hizo el servidor.
    expect([bytes[0], bytes[1]]).toEqual([0xff, 0xd8]);
    /*
      Y la marca esta: una foto gris lisa comprime a casi nada. Con el texto
      encima, repetido tres veces, pesa bastante mas.
    */
    expect(bytes.length).toBeGreaterThan(6000);
  });

  it("y el dueño de la vivienda la ve", async () => {
    await entrarComo(DUENO_101);
    const lista = await obtenerVisitas({ ambito: "unidad", unidadIds: [U101] });
    const persona = lista
      .find((v) => v.uuid === visita.hoy)
      ?.invitados?.find((i) => i.uuid === invitado.hoy);
    expect(persona?.fotoDePorteria).toBe(true);
    expect(persona?.documentos).toContain(ruta);

    const { error } = await supabase.storage.from("visitas").download(ruta);
    expect(error).toBeNull();
  });

  it("quien no es guardia no puede dejar una foto «de porteria»", async () => {
    await entrarComo(DUENO_101);
    await expect(subirFotoDePorteria(invitado.hoy, pngLiso(40, 40))).rejects.toThrow(
      /lista de la porteria/i,
    );
  });

  it("ni el guardia sobre alguien que no esta en su lista", async () => {
    await entrarComo(GUARDIA);
    await expect(subirFotoDePorteria(invitado.lejos, pngLiso(40, 40))).rejects.toThrow(
      /lista de la porteria/i,
    );
  });
});
