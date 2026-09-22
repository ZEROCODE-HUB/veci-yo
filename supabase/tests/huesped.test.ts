import { describe, expect, it } from "vitest";
import {
  CUENTA,
  UNIDAD,
  entrar,
  fueRechazada,
  insertar,
  leer,
  rpc,
} from "./apoyo";

/**
 * Huésped temporal.
 *
 * Es el rol con las reglas más delicadas del producto, por dos motivos que
 * ningún otro rol tiene:
 *
 *  1. **Caduca.** Lo que ve hoy deja de verlo cuando termina la estancia, y no
 *     porque alguien se acuerde de desactivarlo: la membresía sigue activa y
 *     lo único que cambia es la fecha.
 *  2. **Está de paso.** No es un vecino: no vota, no entra al cuadro de honor,
 *     no lee la correspondencia ni las PQRS del propietario de la vivienda
 *     donde se aloja.
 *
 * Los dos se rompieron durante el desarrollo y no se notó hasta recorrer el
 * flujo con una sesión real. De ahí estas pruebas.
 *
 * Todos los casos negativos se acompañan de un control positivo: que alguien
 * *sí* tenga el dato que el huésped no debe ver. Sin eso, la prueba pasaría
 * igual con la política abierta de par en par si resultara que no hay nada que
 * ver (ver `AGENTS.md`, regla 10).
 */

describe("lo que el huésped sí necesita", () => {
  it("sabe dónde se aloja: su unidad, su torre y el nombre del edificio", async () => {
    const tomas = await entrar(CUENTA.huesped);

    const membresia = await leer(
      tomas,
      "membresia_unidad?select=rol,unidad:unidad_id(codigo,torre:torre_id(numero),condominio:condominio_id(nombre))",
    );

    expect(membresia.estado).toBe(200);
    expect(membresia.datos).toHaveLength(1);
    expect(membresia.datos[0].rol).toBe("huesped_temporal");
    // El join tiene que traer datos. Cuando `es_miembro_condominio` dejó de
    // incluir al huésped, esto volvía `null` y la cabecera de la app mostraba
    // "Torre 0 ·", sin número ni código: literalmente no sabía a qué puerta ir.
    expect(membresia.datos[0].unidad?.codigo).toBe("102");
    expect(membresia.datos[0].unidad?.torre?.numero).toBe(1);
    expect(membresia.datos[0].unidad?.condominio?.nombre).toBeTruthy();
  });

  it("ve solo su vivienda y solo su torre, no las del resto", async () => {
    const tomas = await entrar(CUENTA.huesped);
    const marcela = await entrar(CUENTA.admin);

    const suyas = await leer(tomas, "unidad?select=codigo");
    expect(suyas.datos.map((u: any) => u.codigo)).toEqual(["102"]);

    // Control positivo: hay más unidades y más torres que ver.
    const todas = await leer(marcela, "unidad?select=codigo");
    expect(todas.datos.length).toBeGreaterThan(1);

    const torres = await leer(tomas, "torre?select=numero");
    expect(torres.datos.map((t: any) => t.numero)).toEqual([1]);
    const todasLasTorres = await leer(marcela, "torre?select=numero");
    expect(todasLasTorres.datos.length).toBeGreaterThan(1);
  });

  it("lee el libro del alojamiento, pero no las contraseñas", async () => {
    const tomas = await entrar(CUENTA.huesped);

    const libro = await leer(tomas, "libro_huesped?select=*");
    expect(libro.datos).toHaveLength(1);
    expect(libro.datos[0].wifi_nombre).toBeTruthy();
    expect(libro.datos[0].instrucciones).toBeTruthy();

    // Las credenciales de acceso físico viven en Vault. Si algún día salieran
    // por aquí, bastaría con mirar la respuesta de la API.
    expect(libro.datos[0].wifi_password_secret).toBeNull();
    expect(libro.datos[0].puerta_password_secret).toBeNull();
  });

  it("puede hablar con la portería", async () => {
    const tomas = await entrar(CUENTA.huesped);

    const conversaciones = await leer(tomas, "conversacion?select=tipo,area");
    expect(conversaciones.datos.length).toBeGreaterThan(0);
    // Solo hilos de área de su vivienda; nada de grupos del edificio.
    for (const fila of conversaciones.datos) {
      expect(fila.tipo).toBe("area");
    }
  });

  it("ve las zonas comunes y las preguntas frecuentes del edificio", async () => {
    const tomas = await entrar(CUENTA.huesped);

    const zonas = await leer(tomas, "zona_comun?select=nombre");
    expect(zonas.datos.length).toBeGreaterThan(0);

    const faq = await leer(tomas, "pregunta_frecuente?select=pregunta");
    expect(faq.datos.length).toBeGreaterThan(0);
  });
});

describe("lo que el huésped no es", () => {
  it("no entra al cuadro de honor ni ve los anuncios y votaciones", async () => {
    const tomas = await entrar(CUENTA.huesped);
    const marcela = await entrar(CUENTA.admin);

    const anuncios = await leer(tomas, "publicacion?select=titulo");
    expect(anuncios.datos).toHaveLength(0);
    // Control positivo: hay publicaciones que ver.
    const losDeMarcela = await leer(marcela, "publicacion?select=titulo");
    expect(losDeMarcela.datos.length).toBeGreaterThan(0);

    const cuadro = await rpc(tomas, "cuadro_honor", {
      p_condominio_id: "11111111-1111-1111-1111-111111111111",
    });
    expect(cuadro.datos ?? []).toHaveLength(0);
  });

  it("no lee la correspondencia ni las PQRS del propietario de su vivienda", async () => {
    const tomas = await entrar(CUENTA.huesped);
    const guillermo = await entrar(CUENTA.propietario);

    const correo = await leer(tomas, "correspondencia?select=id");
    expect(correo.datos).toHaveLength(0);

    // Todas las PQRS que ve son suyas, ninguna ajena.
    const ajenas = await leer(
      tomas,
      `reclamo?select=id&creado_por=neq.${tomas.usuarioId}`,
    );
    expect(ajenas.datos).toHaveLength(0);
    // Control positivo: Guillermo tiene PQRS abiertas.
    const deGuillermo = await leer(guillermo, "reclamo?select=id");
    expect(deGuillermo.datos.length).toBeGreaterThan(0);
  });

  it("no ve los vehículos ni las cuotas de los residentes", async () => {
    const tomas = await entrar(CUENTA.huesped);
    const marcela = await entrar(CUENTA.admin);

    expect((await leer(tomas, "vehiculo_residente?select=placa")).datos).toHaveLength(0);
    expect((await leer(tomas, "cuota_administracion?select=id")).datos).toHaveLength(0);

    const placas = await leer(marcela, "vehiculo_residente?select=placa");
    expect(placas.datos.length).toBeGreaterThan(0);
  });

  it("no puede registrar una visita firmada por otra persona", async () => {
    const tomas = await entrar(CUENTA.huesped);
    const guillermo = await entrar(CUENTA.propietario);

    const suplantada = await insertar(tomas, "visita", {
      unidad_id: UNIDAD.u102,
      registrada_por: guillermo.usuarioId,
      tipo: "amigos",
      fecha: "2026-10-01",
      hora_inicio: "18:00",
      estado: "programada",
    });
    expect(fueRechazada(suplantada)).toBe(true);
  });
});

describe("la estancia caduca", () => {
  /**
   * Ramiro tiene exactamente la misma membresía que Tomás sobre la misma
   * vivienda —activa, con `puede_acceder`— y lo único distinto es que sus
   * fechas ya pasaron. Cada caso de aquí es el mismo que uno de arriba, con
   * el resultado contrario: eso es lo que prueba que quien decide es la fecha
   * y no otra cosa.
   */

  it("el huésped vencido no ve la vivienda donde estuvo", async () => {
    const ramiro = await entrar(CUENTA.huespedVencido);

    expect((await leer(ramiro, "unidad?select=codigo")).datos).toHaveLength(0);
    expect((await leer(ramiro, "torre?select=numero")).datos).toHaveLength(0);
    expect((await leer(ramiro, "condominio?select=nombre")).datos).toHaveLength(0);
  });

  it("el huésped vencido no lee el libro del alojamiento", async () => {
    const ramiro = await entrar(CUENTA.huespedVencido);
    const tomas = await entrar(CUENTA.huesped);

    expect((await leer(ramiro, "libro_huesped?select=id")).datos).toHaveLength(0);
    // Control positivo: el libro de esa misma vivienda existe y se lee.
    expect((await leer(tomas, "libro_huesped?select=id")).datos).toHaveLength(1);
  });

  it("el huésped vencido no ve las zonas comunes ni puede reservar", async () => {
    const ramiro = await entrar(CUENTA.huespedVencido);

    expect((await leer(ramiro, "zona_comun?select=id")).datos).toHaveLength(0);

    const reserva = await insertar(ramiro, "reserva_zona", {
      zona_id: "55555555-5555-5555-5555-555555555551",
      unidad_id: UNIDAD.u102,
      solicitada_por: ramiro.usuarioId,
      fecha: "2026-10-05",
      hora_inicio: "10:00",
      hora_fin: "11:00",
    });
    expect(fueRechazada(reserva)).toBe(true);
  });
});

describe("reservas del huésped", () => {
  it("reserva una zona abierta, a su nombre, y no la del anfitrión", async () => {
    const tomas = await entrar(CUENTA.huesped);

    const abierta = await leer(
      tomas,
      "zona_comun?select=id,nombre&restringida_huesped=is.false&limit=1",
    );
    expect(abierta.datos.length).toBe(1);

    const alta = await insertar(tomas, "reserva_zona?select=id,solicitada_por", {
      zona_id: abierta.datos[0].id,
      unidad_id: UNIDAD.u102,
      solicitada_por: tomas.usuarioId,
      fecha: "2026-11-15",
      hora_inicio: "10:00",
      hora_fin: "12:00",
    });
    expect(alta.estado).toBe(201);

    // Solo ve las suyas. Las del propietario de la 102 no son asunto suyo.
    const suyas = await leer(tomas, "reserva_zona?select=solicitada_por");
    expect(suyas.datos.length).toBeGreaterThan(0);
    for (const fila of suyas.datos) {
      expect(fila.solicitada_por).toBe(tomas.usuarioId);
    }
  });

  it("no reserva una zona que le está vedada", async () => {
    const tomas = await entrar(CUENTA.huesped);
    const marcela = await entrar(CUENTA.admin);

    const vedada = await leer(
      marcela,
      "zona_comun?select=id,nombre&restringida_huesped=is.true&limit=1",
    );
    // Control positivo: si nadie marcó ninguna zona como restringida, esta
    // prueba no comprueba nada. Mejor que falle y se vea.
    expect(vedada.datos.length).toBe(1);

    const intento = await insertar(tomas, "reserva_zona", {
      zona_id: vedada.datos[0].id,
      unidad_id: UNIDAD.u102,
      solicitada_por: tomas.usuarioId,
      fecha: "2026-11-16",
      hora_inicio: "10:00",
      hora_fin: "12:00",
    });
    expect(fueRechazada(intento)).toBe(true);
  });

  it("no reserva a nombre de otra persona", async () => {
    const tomas = await entrar(CUENTA.huesped);
    const guillermo = await entrar(CUENTA.propietario);

    const intento = await insertar(tomas, "reserva_zona", {
      zona_id: "55555555-5555-5555-5555-555555555551",
      unidad_id: UNIDAD.u102,
      solicitada_por: guillermo.usuarioId,
      fecha: "2026-11-17",
      hora_inicio: "10:00",
      hora_fin: "12:00",
    });
    expect(fueRechazada(intento)).toBe(true);
  });
});
