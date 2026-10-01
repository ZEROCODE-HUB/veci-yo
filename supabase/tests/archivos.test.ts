import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  api,
  borrarArchivo,
  CONDOMINIO,
  CUENTA,
  descargarArchivo,
  entrar,
  insertar,
  leer,
  MARCA_PRUEBA,
  subirArchivo,
  subirDocumento,
  UNIDAD,
  type Sesion,
} from "./apoyo";

/**
 * Los tres buckets privados.
 *
 * Guardan lo más delicado del producto —fotos del documento de identidad de
 * quien entra, y comprobantes de pago con datos bancarios— y no tenían
 * ninguna prueba.
 *
 * La migración de los comprobantes decía por qué el bucket es privado: *"un
 * comprobante de pago lleva datos bancarios"*. Y a continuación definía quién
 * puede verlo como `puede_operar_unidad`, que incluye a todo el personal del
 * condominio: la portería veía la transferencia bancaria de cualquier vecino.
 */

let guillermo: Sesion;
let marcela: Sesion;
let guardia: Sesion;
let sofia: Sesion;

let reservaId = "";
let visitaId = "";

beforeAll(async () => {
  [guillermo, marcela, guardia, sofia] = await Promise.all([
    entrar(CUENTA.propietario),
    entrar(CUENTA.admin),
    entrar(CUENTA.guardia),
    entrar(CUENTA.vecino),
  ]);

  const zona = await leer(
    guillermo,
    "zona_comun?select=id&activa=is.true&permite_estancia_larga=is.true&requiere_aprobacion=is.true&limit=1",
  );
  const reserva = await insertar(guillermo, "reserva_zona?select=id", {
    zona_id: zona.datos[0].id,
    unidad_id: UNIDAD.u101,
    solicitada_por: guillermo.usuarioId,
    fecha: "2027-04-20",
    hora_inicio: "10:00",
    hora_fin: "12:00",
    comentarios: MARCA_PRUEBA,
  });
  reservaId = reserva.datos[0].id;

  const visita = await insertar(guardia, "visita?select=id", {
    condominio_id: CONDOMINIO,
    unidad_id: UNIDAD.u101,
    tipo: "amigos",
    registrada_por: guardia.usuarioId,
    fecha_desde: "2027-04-20",
    fecha_hasta: "2027-04-20",
    anotaciones_ingreso: MARCA_PRUEBA,
  });
  visitaId = visita.datos[0].id;
});

afterAll(async () => {
  await borrarArchivo(guillermo, "reservas", `${reservaId}/comprobante.png`);
  await borrarArchivo(guardia, "visitas", `${visitaId}/documento.png`);
  await api(marcela, `/rest/v1/reserva_zona?id=eq.${reservaId}`, {
    metodo: "DELETE",
  });
  await api(marcela, `/rest/v1/visita?id=eq.${visitaId}`, { metodo: "DELETE" });
});

describe("el comprobante de pago", () => {
  it("quien reservó lo sube", async () => {
    const subida = await subirArchivo(
      guillermo,
      "reservas",
      `${reservaId}/comprobante.png`,
      "transferencia 1234-5678 por 120000 COP",
    );
    expect(subida.estado).toBeLessThan(300);
  });

  it("y lo vuelve a leer", async () => {
    const bajada = await descargarArchivo(
      guillermo,
      "reservas",
      `${reservaId}/comprobante.png`,
    );
    expect(bajada.estado).toBe(200);
    expect(bajada.datos).toContain("1234-5678");
  });

  it("la administración también: es quien aprueba a mano", async () => {
    const bajada = await descargarArchivo(
      marcela,
      "reservas",
      `${reservaId}/comprobante.png`,
    );
    expect(bajada.estado).toBe(200);
  });

  it("**la portería no**: lleva datos bancarios", async () => {
    const bajada = await descargarArchivo(
      guardia,
      "reservas",
      `${reservaId}/comprobante.png`,
    );
    expect(bajada.estado).toBeGreaterThanOrEqual(400);
    expect(bajada.datos).not.toContain("1234-5678");
  });

  it("y un vecino de otra vivienda tampoco", async () => {
    const bajada = await descargarArchivo(
      sofia,
      "reservas",
      `${reservaId}/comprobante.png`,
    );
    expect(bajada.estado).toBeGreaterThanOrEqual(400);
  });
});

describe("la foto del documento", () => {
  it("la portería la sube: es quien está en la puerta", async () => {
    const subida = await subirArchivo(
      guardia,
      "visitas",
      `${visitaId}/documento.png`,
      "foto del documento",
    );
    expect(subida.estado).toBeLessThan(300);
  });

  it("y la vivienda visitada la ve", async () => {
    const bajada = await descargarArchivo(
      guillermo,
      "visitas",
      `${visitaId}/documento.png`,
    );
    expect(bajada.estado).toBe(200);
  });

  it("una vivienda ajena no", async () => {
    const bajada = await descargarArchivo(
      sofia,
      "visitas",
      `${visitaId}/documento.png`,
    );
    expect(bajada.estado).toBeGreaterThanOrEqual(400);
  });

  it("no la borra quien no la subió", async () => {
    /*
      Es la constancia de quién entró al edificio. Quien saca una foto mal
      tiene que poder repetirla —borra la suya— pero un residente no borra la
      que tomó la portería.
    */
    await borrarArchivo(guillermo, "visitas", `${visitaId}/documento.png`);

    const sigue = await descargarArchivo(
      guardia,
      "visitas",
      `${visitaId}/documento.png`,
    );
    expect(sigue.estado).toBe(200);
  });

  it("pero quien la subió sí", async () => {
    // Control positivo del caso anterior.
    const borrada = await borrarArchivo(
      guardia,
      "visitas",
      `${visitaId}/documento.png`,
    );
    expect(borrada.estado).toBeLessThan(300);
  });
});

/**
 * El PDF del reglamento (R-52).
 *
 * `reglamento.archivo_path` existía desde el primer día y estaba vacía en
 * todos los condominios porque **nadie subía nada**: "Elegir archivo" no tenía
 * más acción que cerrar el modal, y el botón de descarga abría un cartel con
 * el nombre de un PDF que no existía en ningún sitio.
 *
 * No es un adorno: el reglamento de renta corta es el que el RNT exige poder
 * presentar, y R-51 dice que el texto sembrado —un contrato de arrendamiento a
 * veinte años— no sirve para una estancia de cuatro noches. Que el cliente
 * pueda reemplazarlo sin tocar código era justo lo que faltaba.
 */
describe("el PDF del reglamento", () => {
  const ruta = `${CONDOMINIO}/prueba-reglamento.pdf`;

  afterAll(async () => {
    await borrarArchivo(marcela, "reglamentos", ruta);
    // Mientras la política está relajada a propósito para comprobar que estas
    // pruebas la detectan, el caso del intruso **sube de verdad**. Si no se
    // retira, el archivo sobrevive a la mutación.
    await borrarArchivo(marcela, "reglamentos", `${CONDOMINIO}/intruso.pdf`);
  });

  it("lo sube la administración", async () => {
    const subida = await subirDocumento(
      marcela,
      "reglamentos",
      ruta,
      MARCA_PRUEBA,
    );
    expect(subida.estado).toBe(200);
  });

  it("y lo lee cualquiera que viva en el edificio", async () => {
    const delPropietario = await descargarArchivo(
      guillermo,
      "reglamentos",
      ruta,
    );
    expect(delPropietario.estado).toBe(200);
    expect(delPropietario.datos).toContain(MARCA_PRUEBA);

    // También el huésped: el reglamento de renta corta es justamente el suyo.
    const tomas = await entrar(CUENTA.huesped);
    const delHuesped = await descargarArchivo(tomas, "reglamentos", ruta);
    expect(delHuesped.estado).toBe(200);
  });

  it("pero no lo sube un residente cualquiera", async () => {
    /*
      El caso que importa: el reglamento del edificio lo pone la
      administración. La pantalla ofrecía el botón a todo el que no fuera
      huésped temporal —o sea a cualquier residente—, así que sin esta política
      un vecino podría reemplazar el reglamento del condominio.
    */
    const intento = await subirDocumento(
      guillermo,
      "reglamentos",
      `${CONDOMINIO}/intruso.pdf`,
      MARCA_PRUEBA,
    );
    expect(intento.estado).toBe(400);

    const existe = await descargarArchivo(
      marcela,
      "reglamentos",
      `${CONDOMINIO}/intruso.pdf`,
    );
    expect(existe.estado).not.toBe(200);
  });

  it("ni lo borra", async () => {
    const intento = await borrarArchivo(guillermo, "reglamentos", ruta);
    expect(intento.estado).not.toBe(200);

    // Control: sigue ahí.
    const sigue = await descargarArchivo(marcela, "reglamentos", ruta);
    expect(sigue.estado).toBe(200);
  });

  it("y la fila apunta a la ruta, que es lo que enciende la descarga", async () => {
    const puesta = await api(
      marcela,
      `/rest/v1/reglamento?condominio_id=eq.${CONDOMINIO}&tipo=eq.huesped_temporal&vigente=is.true`,
      { metodo: "PATCH", cuerpo: { archivo_path: ruta } },
    );
    expect(puesta.estado).toBe(200);

    const leida = await leer(
      guillermo,
      `reglamento?select=archivo_path&condominio_id=eq.${CONDOMINIO}&tipo=eq.huesped_temporal`,
    );
    expect(leida.datos[0].archivo_path).toBe(ruta);

    // Se deja como estaba: sin ruta, la pantalla no ofrece descarga.
    await api(
      marcela,
      `/rest/v1/reglamento?condominio_id=eq.${CONDOMINIO}&tipo=eq.huesped_temporal`,
      { metodo: "PATCH", cuerpo: { archivo_path: null } },
    );
  });
});
