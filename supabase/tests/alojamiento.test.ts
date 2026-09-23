import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  api,
  CUENTA,
  UNIDAD,
  entrar,
  fueRechazada,
  leer,
  rpc,
  type Sesion,
} from "./apoyo";

/**
 * "Guardar configuración".
 *
 * El botón de la pantalla más larga del producto hacía esto:
 *
 *   const handleGuardar = () => {
 *     addToast("Configuración guardada exitosamente", "success");
 *     navigation.goBack();
 *   };
 *
 * Nada. Se anunciaba el éxito y se tiraba todo: aforo, mínimo de noches,
 * descripción, plataformas, RNT y el libro del alojamiento con el wifi y la
 * clave de la puerta, que es justo lo que un huésped viene a buscar.
 *
 * La 102 es la vivienda con suscripción activa: la gestiona Sofía, Tomás está
 * alojado y Nadia todavía no ha llegado. Los tres estados que hacen falta.
 */

let sofia: Sesion;
let guillermo: Sesion;
let huesped: Sesion;
let huespedFuturo: Sesion;

/** Lo que había antes, para dejarlo igual. */
let original: any = null;

beforeAll(async () => {
  [sofia, guillermo, huesped, huespedFuturo] = await Promise.all([
    entrar(CUENTA.vecino),
    entrar(CUENTA.propietario),
    entrar(CUENTA.huesped),
    entrar(CUENTA.huespedFuturo),
  ]);

  const fila = await leer(
    sofia,
    `suscripcion_renta_corta?unidad_id=eq.${UNIDAD.u102}&select=descripcion,max_huespedes,rnt,estancia_minima_noches`,
  );
  original = fila.datos[0] ?? null;
});

afterAll(async () => {
  // Las claves guardadas aquí se quitan: la vivienda de prueba no tenía
  // ninguna antes, y `guardar_alojamiento` a propósito no sabe borrarlas.
  await api(sofia, `/rest/v1/libro_huesped?unidad_id=eq.${UNIDAD.u102}`, {
    metodo: "PATCH",
    cuerpo: { wifi_password_secret: null, puerta_password_secret: null },
  });

  if (!original) return;
  await rpc(sofia, "guardar_alojamiento", {
    p_unidad_id: UNIDAD.u102,
    p_descripcion: original.descripcion ?? "",
    p_max_huespedes: original.max_huespedes ?? 1,
    p_rnt: original.rnt ?? "",
    p_estancia_minima: original.estancia_minima_noches ?? 1,
  });
});

describe("el anfitrión configura su alojamiento", () => {
  it("lo que escribe se guarda", async () => {
    const respuesta = await rpc(sofia, "guardar_alojamiento", {
      p_unidad_id: UNIDAD.u102,
      p_descripcion: "[prueba] Dos ambientes con vista",
      p_max_huespedes: 3,
      p_estancia_minima: 2,
      p_rnt: "[prueba] RNT-0001",
      p_publicado_airbnb: true,
      p_visitas_de_huespedes: "aprobar_cada_uno",
    });
    expect(respuesta.estado).toBeLessThan(300);

    const fila = await leer(
      sofia,
      `suscripcion_renta_corta?unidad_id=eq.${UNIDAD.u102}&select=descripcion,max_huespedes,estancia_minima_noches,rnt,publicado_airbnb,visitas_de_huespedes`,
    );
    expect(fila.datos[0].descripcion).toBe("[prueba] Dos ambientes con vista");
    expect(fila.datos[0].max_huespedes).toBe(3);
    expect(fila.datos[0].estancia_minima_noches).toBe(2);
    expect(fila.datos[0].rnt).toBe("[prueba] RNT-0001");
    expect(fila.datos[0].publicado_airbnb).toBe(true);
    expect(fila.datos[0].visitas_de_huespedes).toBe("aprobar_cada_uno");
  });

  it("y llega a la ficha que ve el huésped", async () => {
    const ficha = await rpc(huesped, "ficha_alojamiento", {
      p_unidad_id: UNIDAD.u102,
    });
    expect(ficha.datos[0].descripcion).toBe("[prueba] Dos ambientes con vista");
    expect(ficha.datos[0].max_huespedes).toBe(3);
  });

  it("nadie configura el alojamiento de otro", async () => {
    const intento = await rpc(guillermo, "guardar_alojamiento", {
      p_unidad_id: UNIDAD.u102,
      p_descripcion: "[prueba] ajeno",
    });
    expect(fueRechazada(intento)).toBe(true);

    const fila = await leer(
      sofia,
      `suscripcion_renta_corta?unidad_id=eq.${UNIDAD.u102}&select=descripcion`,
    );
    expect(fila.datos[0].descripcion).not.toBe("[prueba] ajeno");
  });
});

describe("las credenciales de entrada", () => {
  it("se guardan cifradas: la tabla solo tiene el identificador", async () => {
    await rpc(sofia, "guardar_alojamiento", {
      p_unidad_id: UNIDAD.u102,
      p_wifi_nombre: "[prueba] Red",
      p_wifi_password: "clave-de-prueba-123",
      p_puerta_password: "9876",
    });

    const libro = await leer(
      sofia,
      `libro_huesped?unidad_id=eq.${UNIDAD.u102}&select=wifi_nombre,wifi_password_secret,puerta_password_secret`,
    );
    expect(libro.datos[0].wifi_nombre).toBe("[prueba] Red");
    // Lo que viaja es un uuid, no la clave.
    expect(libro.datos[0].wifi_password_secret).toMatch(/^[0-9a-f-]{36}$/);
    expect(JSON.stringify(libro.datos)).not.toContain("clave-de-prueba-123");
  });

  it("el anfitrión las recupera en claro", async () => {
    const claves = await rpc(sofia, "credenciales_alojamiento", {
      p_unidad_id: UNIDAD.u102,
    });
    expect(claves.datos[0].wifi_password).toBe("clave-de-prueba-123");
    expect(claves.datos[0].puerta_password).toBe("9876");
  });

  it("el huésped alojado también: es lo que vino a buscar", async () => {
    const claves = await rpc(huesped, "credenciales_alojamiento", {
      p_unidad_id: UNIDAD.u102,
    });
    expect(claves.datos[0].wifi_password).toBe("clave-de-prueba-123");
  });

  it("pero el que todavía no ha llegado, no", async () => {
    /*
      Nadia aceptó la invitación y ve el alojamiento —dirección, zonas
      comunes, chat con la portería— desde ese momento (R-55). Lo único que
      espera al día de entrada es esto: aquí está dónde queda la llave.
    */
    const alojamiento = await rpc(huespedFuturo, "ficha_alojamiento", {
      p_unidad_id: UNIDAD.u102,
    });
    // Control positivo: sí ve la vivienda.
    expect(alojamiento.datos.length).toBe(1);

    const claves = await rpc(huespedFuturo, "credenciales_alojamiento", {
      p_unidad_id: UNIDAD.u102,
    });
    expect(claves.datos.length).toBe(0);
  });

  it("un vecino no las ve", async () => {
    const claves = await rpc(guillermo, "credenciales_alojamiento", {
      p_unidad_id: UNIDAD.u102,
    });
    expect(claves.datos.length).toBe(0);
  });

  it("guardar sin escribir contraseña no borra la que había", async () => {
    /*
      El formulario llega vacío porque la contraseña no se puede releer, no
      porque se quiera quitar. Si el campo vacío borrara, cualquier cambio de
      la descripción dejaría al huésped sin wifi.
    */
    await rpc(sofia, "guardar_alojamiento", {
      p_unidad_id: UNIDAD.u102,
      p_descripcion: "[prueba] solo cambio la descripcion",
    });

    const claves = await rpc(sofia, "credenciales_alojamiento", {
      p_unidad_id: UNIDAD.u102,
    });
    expect(claves.datos[0].wifi_password).toBe("clave-de-prueba-123");
  });
});
