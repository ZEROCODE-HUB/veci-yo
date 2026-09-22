import { beforeAll, describe, expect, it } from "vitest";
import {
  CONDOMINIO,
  CUENTA,
  UNIDAD,
  api,
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

  it("lee la ficha de la vivienda sin ver el estado comercial del anfitrión", async () => {
    const tomas = await entrar(CUENTA.huesped);
    const sofia = await entrar(CUENTA.vecino);

    const ficha = await rpc(tomas, "ficha_alojamiento", {
      p_unidad_id: UNIDAD.u102,
    });
    expect(ficha.datos).toHaveLength(1);
    expect(ficha.datos[0].max_huespedes).toBeGreaterThan(0);
    // La funcion devuelve seis campos y ninguno dice si la suscripcion esta
    // activa, cuantas verificaciones quedan ni quien la verifico.
    expect(Object.keys(ficha.datos[0]).sort()).toEqual([
      "apto_ninos",
      "descripcion",
      "estacionamientos",
      "max_huespedes",
      "num_habitaciones",
      "permite_mascotas",
    ]);

    // La tabla de la que sale sigue cerrada para el.
    expect((await leer(tomas, "suscripcion_renta_corta?select=estado")).datos).toHaveLength(0);
    // Control positivo: la propietaria si la lee.
    expect((await leer(sofia, "suscripcion_renta_corta?select=estado")).datos.length).toBeGreaterThan(0);

    // Y solo la suya: la ficha de otra vivienda no.
    const ajena = await rpc(tomas, "ficha_alojamiento", { p_unidad_id: UNIDAD.u205 });
    expect(ajena.datos ?? []).toHaveLength(0);
  });

  it("sabe a quién llamar: los contactos de su vivienda, no los de otra", async () => {
    const tomas = await entrar(CUENTA.huesped);

    const contactos = await rpc(tomas, "contactos_de_unidad", {
      p_unidad_id: UNIDAD.u102,
    });
    expect(contactos.datos).toHaveLength(1);
    // Estos tres nombres estaban escritos a mano en el componente y eran los
    // mismos para cualquier vivienda.
    expect(contactos.datos[0].anfitrion_nombre).toBeTruthy();

    const ajenos = await rpc(tomas, "contactos_de_unidad", {
      p_unidad_id: UNIDAD.u101,
    });
    expect(ajenos.datos ?? []).toHaveLength(0);
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

  it("el huésped vencido no lee la ficha ni los contactos de la vivienda", async () => {
    const ramiro = await entrar(CUENTA.huespedVencido);
    const tomas = await entrar(CUENTA.huesped);

    expect((await rpc(ramiro, "ficha_alojamiento", { p_unidad_id: UNIDAD.u102 })).datos ?? [])
      .toHaveLength(0);
    expect((await rpc(ramiro, "contactos_de_unidad", { p_unidad_id: UNIDAD.u102 })).datos ?? [])
      .toHaveLength(0);
    // Control positivo: la misma vivienda responde a quien sí se aloja en ella.
    expect((await rpc(tomas, "ficha_alojamiento", { p_unidad_id: UNIDAD.u102 })).datos)
      .toHaveLength(1);
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

describe("dar de alta un huésped", () => {
  /**
   * El camino real: la anfitriona invita y la persona acepta. Ninguna de las
   * pruebas de arriba lo recorría —el huésped de prueba estaba sembrado con
   * SQL directo— y por ese hueco se coló una regresión: la restricción que
   * obliga al huésped a tener fecha de salida se añadió sin tocar
   * `aceptar_invitacion`, que insertaba la membresía sin fechas. Invitar a un
   * huésped fallaba justo al aceptar.
   */

  const CORREO_NUEVO = CUENTA.invitadoNuevo;

  /**
   * La prueba tiene que poder correrse dos veces seguidas, asi que primero
   * deshace lo que dejo la anterior. Lo hace Sofia, propietaria de la 102:
   * el propio huesped no puede borrar su membresia —no es miembro de la
   * unidad— y eso tambien es correcto.
   */
  beforeAll(async () => {
    const sofia = await entrar(CUENTA.vecino);
    const invitado = await entrar(CUENTA.invitadoNuevo);
    await api(sofia, `/rest/v1/membresia_unidad?usuario_id=eq.${invitado.usuarioId}`, {
      metodo: "DELETE",
    });
  });

  it("una invitación de huésped sin fecha de salida se rechaza al crearla", async () => {
    const sofia = await entrar(CUENTA.vecino);

    const sinFecha = await rpc(sofia, "crear_invitacion", {
      p_condominio_id: CONDOMINIO,
      p_ambito: "unidad",
      p_correo: CORREO_NUEVO,
      p_nombre: "Invitado de prueba",
      p_unidad_id: UNIDAD.u102,
      p_rol_unidad: "huesped_temporal",
    });
    expect(fueRechazada(sinFecha)).toBe(true);

    // Y con una estancia que ya terminó, tampoco: daría una membresía que no
    // deja ver nada.
    const yaPasada = await rpc(sofia, "crear_invitacion", {
      p_condominio_id: CONDOMINIO,
      p_ambito: "unidad",
      p_correo: CORREO_NUEVO,
      p_nombre: "Invitado de prueba",
      p_unidad_id: UNIDAD.u102,
      p_rol_unidad: "huesped_temporal",
      p_vigente_hasta: "2020-01-01",
    });
    expect(fueRechazada(yaPasada)).toBe(true);
  });

  it("con la estancia, la invitación se acepta y la membresía la conserva", async () => {
    const sofia = await entrar(CUENTA.vecino);
    const guillermo = await entrar(CUENTA.propietario);
    const invitado = await entrar(CUENTA.invitadoNuevo);

    const hasta = new Date();
    hasta.setDate(hasta.getDate() + 5);
    const vigenteHasta = hasta.toISOString().slice(0, 10);

    const creada = await rpc(sofia, "crear_invitacion", {
      p_condominio_id: CONDOMINIO,
      p_ambito: "unidad",
      p_correo: CORREO_NUEVO,
      p_nombre: "Invitado de prueba",
      p_unidad_id: UNIDAD.u102,
      p_rol_unidad: "huesped_temporal",
      p_vigente_desde: new Date().toISOString().slice(0, 10),
      p_vigente_hasta: vigenteHasta,
    });
    expect(creada.estado).toBe(200);
    const token = creada.datos[0].token;

    // El enlace no vale para cualquiera que lo tenga.
    const ajena = await rpc(guillermo, "aceptar_invitacion", { p_token: token });
    expect(fueRechazada(ajena)).toBe(true);

    const aceptada = await rpc(invitado, "aceptar_invitacion", { p_token: token });
    expect(aceptada.estado).toBe(200);

    // Y la estancia llegó hasta la membresía, que es lo que se perdía.
    const sesion = await entrar(CUENTA.invitadoNuevo);
    const membresia = await leer(
      sesion,
      "membresia_unidad?select=rol,vigente_hasta",
    );
    expect(membresia.datos).toHaveLength(1);
    expect(membresia.datos[0].rol).toBe("huesped_temporal");
    expect(membresia.datos[0].vigente_hasta).toBe(vigenteHasta);

    // Y ya ve la vivienda donde se aloja.
    expect((await leer(sesion, "unidad?select=codigo")).datos).toHaveLength(1);
  });
});

describe("antes de llegar", () => {
  /**
   * El huésped tiene tres estados, no dos, y el del medio es el que se había
   * pasado por alto: aceptó la invitación y todavía no ha llegado.
   *
   * Hasta 20260922201000 ese estado no veía absolutamente nada —ni la
   * dirección— porque todo colgaba de que la estancia estuviera vigente hoy.
   * Ahora el alojamiento se ve desde que se acepta y las credenciales de
   * entrada no: el libro dice dónde queda la llave.
   */

  it("ve dónde se va a alojar, pero no dónde está la llave", async () => {
    const nadia = await entrar(CUENTA.huespedFuturo);
    const tomas = await entrar(CUENTA.huesped);

    // Lo del alojamiento, sí.
    expect((await leer(nadia, "unidad?select=codigo")).datos).toHaveLength(1);
    expect((await leer(nadia, "torre?select=numero")).datos).toHaveLength(1);
    expect((await leer(nadia, "condominio?select=nombre")).datos).toHaveLength(1);
    expect((await leer(nadia, "zona_comun?select=id")).datos.length).toBeGreaterThan(0);
    expect((await rpc(nadia, "ficha_alojamiento", { p_unidad_id: UNIDAD.u102 })).datos)
      .toHaveLength(1);
    expect((await rpc(nadia, "contactos_de_unidad", { p_unidad_id: UNIDAD.u102 })).datos)
      .toHaveLength(1);

    // El libro del alojamiento, no: ahí está la instrucción de acceso.
    expect((await leer(nadia, "libro_huesped?select=id")).datos).toHaveLength(0);
    // Control positivo: el libro de esa misma vivienda existe y quien ya está
    // alojado lo lee. Sin esto, la prueba pasaría igual si no hubiera libro.
    expect((await leer(tomas, "libro_huesped?select=id")).datos).toHaveLength(1);
  });

  it("puede hablar con la portería antes de llegar", async () => {
    const nadia = await entrar(CUENTA.huespedFuturo);

    // Preguntar por el acceso antes de viajar es el caso normal, no la
    // excepción.
    const conversaciones = await leer(nadia, "conversacion?select=tipo");
    expect(conversaciones.datos.length).toBeGreaterThan(0);
  });

  it("reserva una zona solo para un día en que vaya a estar", async () => {
    const nadia = await entrar(CUENTA.huespedFuturo);

    const estancia = await leer(
      nadia,
      "membresia_unidad?select=vigente_desde,vigente_hasta",
    );
    const { vigente_desde: desde, vigente_hasta: hasta } = estancia.datos[0];

    const dentro = new Date(`${desde}T00:00:00Z`);
    dentro.setUTCDate(dentro.getUTCDate() + 1);

    const despues = new Date(`${hasta}T00:00:00Z`);
    despues.setUTCDate(despues.getUTCDate() + 5);

    const reserva = (fecha: string) => ({
      zona_id: "55555555-5555-5555-5555-555555555551",
      unidad_id: UNIDAD.u102,
      solicitada_por: nadia.usuarioId,
      fecha,
      hora_inicio: "10:00",
      hora_fin: "12:00",
    });

    // Reservar la piscina al organizar el viaje: eso es lo que se quiere.
    const valida = await insertar(
      nadia,
      "reserva_zona",
      reserva(dentro.toISOString().slice(0, 10)),
    );
    expect(valida.estado).toBe(201);

    // Para un día en que ya se habrá ido, no.
    const fuera = await insertar(
      nadia,
      "reserva_zona",
      reserva(despues.toISOString().slice(0, 10)),
    );
    expect(fueRechazada(fuera)).toBe(true);
  });
});
