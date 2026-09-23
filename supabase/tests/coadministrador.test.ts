import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  api,
  CONDOMINIO,
  CUENTA,
  entrar,
  fueRechazada,
  insertar,
  leer,
  MARCA_PRUEBA,
  rpc,
  UNIDAD,
  type Sesion,
} from "./apoyo";

/**
 * Los permisos del coadministrador.
 *
 * La pantalla ofrece ocho interruptores con su descripción y los guarda en
 * `membresia_condominio.permisos`, un `jsonb`. **No los miraba nadie**: se
 * enumeraron las 104 políticas y las 73 funciones y salía cero.
 *
 * Y lo de detrás era peor que un interruptor decorativo, porque
 * `es_admin_condominio` incluye al coadministrador y esa función sostiene
 * **31 políticas**: dar de alta a alguien como coadministrador con un solo
 * permiso marcado le concedía la administración completa del edificio.
 *
 * Era la séptima vez que aparece la misma forma —la decisión vive en la
 * pantalla y no en el dato— pero esta vivía en un `jsonb`, así que la
 * enumeración de columnas booleanas no podía verla.
 */

let marcela: Sesion;
let coadmin: Sesion;

/** La membresía de coadministrador que crean estas pruebas. */
let membresiaId = "";

async function permisos(valores: Record<string, boolean>) {
  const respuesta = await api(
    marcela,
    `/rest/v1/membresia_condominio?id=eq.${membresiaId}`,
    { metodo: "PATCH", cuerpo: { permisos: valores } },
  );
  expect(respuesta.estado).toBe(200);
}

beforeAll(async () => {
  [marcela, coadmin] = await Promise.all([
    entrar(CUENTA.admin),
    entrar(CUENTA.propietarioNuevo),
  ]);

  await api(
    marcela,
    `/rest/v1/membresia_condominio?usuario_id=eq.${coadmin.usuarioId}`,
    { metodo: "DELETE" },
  );

  const alta = await insertar(marcela, "membresia_condominio?select=id", {
    condominio_id: CONDOMINIO,
    usuario_id: coadmin.usuarioId,
    rol: "coadministrador",
    permisos: {},
  });
  expect(alta.estado).toBe(201);
  membresiaId = alta.datos[0].id;
});

afterAll(async () => {
  await api(
    marcela,
    `/rest/v1/porteria?nombre=like.${encodeURIComponent(MARCA_PRUEBA + "%")}`,
    { metodo: "DELETE" },
  );
  await api(marcela, `/rest/v1/membresia_condominio?id=eq.${membresiaId}`, {
    metodo: "DELETE",
  });
});

describe("gestionar seguridad", () => {
  it("con el permiso puesto, crea una portería", async () => {
    await permisos({ modificarSeguridad: true });

    const alta = await insertar(coadmin, "porteria?select=id", {
      condominio_id: CONDOMINIO,
      nombre: `${MARCA_PRUEBA} garita`,
      tipo: "entrada_principal",
    });
    expect(alta.estado).toBe(201);

    await api(marcela, `/rest/v1/porteria?id=eq.${alta.datos[0].id}`, {
      metodo: "DELETE",
    });
  });

  it("sin el permiso, no", async () => {
    await permisos({ modificarSeguridad: false });

    const intento = await api(coadmin, "/rest/v1/porteria", {
      metodo: "POST",
      prefer: "return=minimal",
      cuerpo: {
        condominio_id: CONDOMINIO,
        nombre: `${MARCA_PRUEBA} sin permiso`,
        tipo: "entrada_principal",
      },
    });
    expect(fueRechazada(intento)).toBe(true);

    const existe = await leer(
      marcela,
      `porteria?nombre=like.${encodeURIComponent(MARCA_PRUEBA + " sin permiso")}&select=id`,
    );
    expect(existe.datos).toHaveLength(0);
  });

  it("y tampoco toca los turnos de nadie", async () => {
    await permisos({ modificarSeguridad: false });

    const guardia = await leer(
      marcela,
      `membresia_condominio?rol=eq.guardia&condominio_id=eq.${CONDOMINIO}&select=id`,
    );
    const intento = await api(coadmin, "/rest/v1/turno_guardia", {
      metodo: "POST",
      prefer: "return=minimal",
      cuerpo: {
        membresia_id: guardia.datos[0].id,
        dia_semana: 0,
        hora_inicio: "01:00",
        hora_fin: "02:00",
      },
    });
    expect(fueRechazada(intento)).toBe(true);
  });
});

describe("gestionar residentes", () => {
  it("sin el permiso no invita a una vivienda", async () => {
    await permisos({ actualizarResidentes: false });

    const intento = await rpc(coadmin, "crear_invitacion", {
      p_condominio_id: CONDOMINIO,
      p_ambito: "unidad",
      p_correo: CUENTA.invitadoNuevo,
      p_nombre: `${MARCA_PRUEBA} sin permiso`,
      p_unidad_id: UNIDAD.u101,
      p_rol_unidad: "residente",
    });
    expect(fueRechazada(intento)).toBe(true);
  });

  it("con el permiso, sí", async () => {
    await permisos({ actualizarResidentes: true });

    const creada = await rpc(coadmin, "crear_invitacion", {
      p_condominio_id: CONDOMINIO,
      p_ambito: "unidad",
      p_correo: CUENTA.invitadoNuevo,
      p_nombre: `${MARCA_PRUEBA} con permiso`,
      p_unidad_id: UNIDAD.u101,
      p_rol_unidad: "residente",
    });
    expect(creada.estado).toBe(200);

    await api(
      marcela,
      `/rest/v1/invitacion?id=eq.${creada.datos[0].invitacion_id}`,
      { metodo: "PATCH", cuerpo: { estado: "revocada" } },
    );
  });
});

describe("lo que el permiso no alcanza", () => {
  it("sin ningún permiso, sigue viendo el edificio", async () => {
    /*
      El control positivo: un coadministrador sin permisos **no** queda fuera
      del panel. Lo que se sujeta es lo que escribe, no lo que ve; si esta
      prueba se pusiera roja, el cambio habría dejado a alguien sin su propia
      pantalla.
    */
    await permisos({
      modificarSeguridad: false,
      actualizarResidentes: false,
      contestarChat: false,
      modificarCuadroHonor: false,
    });

    const torres = await leer(coadmin, "torre?select=id");
    expect(torres.datos.length).toBeGreaterThan(0);

    const porterias = await leer(coadmin, "porteria?select=id");
    expect(porterias.datos.length).toBeGreaterThan(0);
  });

  it("una clave ausente no quita nada", async () => {
    /*
      Las membresías que ya existen tienen `permisos = {}`. Si eso valiera
      "prohibido", la migración habría dejado a los coadministradores de un
      edificio real sin su panel de un día para otro.
    */
    await permisos({});

    const alta = await insertar(coadmin, "porteria?select=id", {
      condominio_id: CONDOMINIO,
      nombre: `${MARCA_PRUEBA} clave ausente`,
      tipo: "entrada_principal",
    });
    expect(alta.estado).toBe(201);

    await api(marcela, `/rest/v1/porteria?id=eq.${alta.datos[0].id}`, {
      metodo: "DELETE",
    });
  });

  it("la administración no se ve afectada por ningún permiso", async () => {
    // Marcela es administradora: `puede_coadmin` le dice que sí a todo.
    const puede = await rpc(marcela, "puede_coadmin", {
      p_condominio_id: CONDOMINIO,
      p_clave: "modificarSeguridad",
    });
    expect(puede.datos).toBe(true);
  });
});
