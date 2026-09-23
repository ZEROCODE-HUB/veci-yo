import { describe, expect, it } from "vitest";
import {
  api,
  CONDOMINIO,
  CUENTA,
  UNIDAD,
  entrar,
  fueRechazada,
  insertar,
  leer,
  rpc,
} from "./apoyo";

/**
 * Aislamiento entre viviendas.
 *
 * Es el requisito de seguridad central del producto: un vecino no ve los
 * asuntos de la casa de al lado. Todo se comprueba contra las políticas reales
 * tal como las aplica PostgREST, no contra una imitación.
 */

describe("PQRS", () => {
  /**
   * Ojo: estos casos **dejan filas** en cada corrida, y es a proposito.
   *
   * Una PQRS no se puede borrar —no hay politica de DELETE— y eso es correcto:
   * si la administracion pudiera borrarlas, podria borrar una queja en su
   * contra. Asi que la suite no limpia detras de si, y en una base de
   * desarrollo se acumulan: al recorrer el Centro de Atencion aparecieron 78
   * PQRS de prueba sobre 83 totales.
   *
   * No se arregla dando permiso de borrado, que seria cambiar una garantia del
   * dominio para que las pruebas sean comodas. Se purga con SQL antes de
   * produccion, y esta anotado en `PENDIENTES.md`.
   */

  it("la abre quien la firma, y nadie puede firmar por otro", async () => {
    const guillermo = await entrar(CUENTA.propietario);
    const marcela = await entrar(CUENTA.admin);

    const propia = await insertar(guillermo, "reclamo?select=numero", {
      condominio_id: CONDOMINIO,
      unidad_id: UNIDAD.u101,
      creado_por: guillermo.usuarioId,
      creado_por_nombre: "Guillermo Provenzano",
      titulo: "Prueba de firma propia",
      descripcion: "Alta normal.",
      area: "condominio",
      tipo: "consulta",
    });
    expect(propia.estado).toBe(201);

    const ajena = await insertar(guillermo, "reclamo", {
      condominio_id: CONDOMINIO,
      unidad_id: UNIDAD.u101,
      creado_por: marcela.usuarioId,
      creado_por_nombre: "Marcela Sierra",
      titulo: "Suplantación",
      descripcion: "Firmada con el id de otra persona.",
      area: "condominio",
      tipo: "consulta",
    });
    expect(fueRechazada(ajena)).toBe(true);
  });

  it("un vecino no ve las de otro; la administración sí", async () => {
    const guillermo = await entrar(CUENTA.propietario);
    const sofia = await entrar(CUENTA.vecino);
    const marcela = await entrar(CUENTA.admin);

    const deGuillermo = await leer(guillermo, "reclamo?select=id,creado_por");
    expect(deGuillermo.datos.length).toBeGreaterThan(0);
    // Todas las que ve son suyas.
    for (const fila of deGuillermo.datos) {
      expect(fila.creado_por).toBe(guillermo.usuarioId);
    }

    const deSofia = await leer(sofia, "reclamo?select=id&creado_por=neq." + sofia.usuarioId);
    expect(deSofia.datos).toHaveLength(0);

    const deLaAdmin = await leer(marcela, "reclamo?select=id");
    expect(deLaAdmin.datos.length).toBeGreaterThanOrEqual(deGuillermo.datos.length);
  });

  it("el modelo de dispositivo solo se acepta en el área de la aplicación", async () => {
    const guillermo = await entrar(CUENTA.propietario);
    const base = {
      condominio_id: CONDOMINIO,
      unidad_id: UNIDAD.u101,
      creado_por: guillermo.usuarioId,
      creado_por_nombre: "Guillermo Provenzano",
      titulo: "Modelo fuera de sitio",
      descripcion: "Debe rechazarse.",
      modelo_dispositivo: "iPhone 15",
    };

    const enCondominio = await insertar(guillermo, "reclamo", {
      ...base,
      area: "condominio",
      tipo: "consulta",
    });
    expect(fueRechazada(enCondominio)).toBe(true);
    expect(enCondominio.mensaje).toContain("reclamo_modelo_solo_para_app");

    const enAplicacion = await insertar(guillermo, "reclamo?select=numero", {
      ...base,
      area: "aplicacion",
      tipo: "soporte",
    });
    expect(enAplicacion.estado).toBe(201);
  });

  it("resolver exige decir quién la resolvió y cuándo", async () => {
    const marcela = await entrar(CUENTA.admin);
    const alguna = await leer(marcela, "reclamo?select=id&limit=1");
    const id = alguna.datos[0].id;

    const sinActor = await api(marcela, `/rest/v1/reclamo?id=eq.${id}`, {
      metodo: "PATCH",
      cuerpo: { estado: "resuelto" },
    });
    expect(fueRechazada(sinActor)).toBe(true);
    expect(sinActor.mensaje).toContain("reclamo_resuelto_con_actor");
  });
});

describe("Notificaciones", () => {
  it("la bandeja es privada: nadie lee ni marca la ajena", async () => {
    const marcela = await entrar(CUENTA.admin);
    const guillermo = await entrar(CUENTA.propietario);

    // Control positivo: Marcela tiene bandeja, así que el caso distingue entre
    // "la política funciona" y "no hay nada que ver".
    const suyas = await leer(marcela, "notificacion?select=id,usuario_id");
    expect(suyas.datos.length).toBeGreaterThan(0);
    for (const fila of suyas.datos) {
      expect(fila.usuario_id).toBe(marcela.usuarioId);
    }

    // El control que de verdad prueba la política: alguien que no es Marcela
    // pide explícitamente las de Marcela. Comprobar solo que ella ve las suyas
    // pasaba igual con la política abierta de par en par, porque es la única
    // con notificaciones.
    const ajenas = await leer(
      guillermo,
      `notificacion?select=id&usuario_id=eq.${marcela.usuarioId}`,
    );
    expect(ajenas.datos).toHaveLength(0);

    // Y tampoco puede marcarlas.
    const intento = await api(
      guillermo,
      `/rest/v1/notificacion?usuario_id=eq.${marcela.usuarioId}`,
      { metodo: "PATCH", cuerpo: { leida_en: null } },
    );
    expect(intento.datos).toHaveLength(0);
  });
});

describe("Reconocimientos", () => {
  it("nadie se reconoce a sí mismo", async () => {
    const guillermo = await entrar(CUENTA.propietario);
    const insignias = await leer(guillermo, "insignia?select=id&limit=1");

    const propio = await insertar(guillermo, "reconocimiento", {
      insignia_id: insignias.datos[0].id,
      usuario_id: guillermo.usuarioId,
      condominio_id: CONDOMINIO,
      otorgado_por: guillermo.usuarioId,
    });
    expect(fueRechazada(propio)).toBe(true);
    expect(propio.mensaje).toContain("reconocimiento_no_autootorgado");
  });

  it("no se repite la misma insignia a la misma persona en el mes", async () => {
    const guillermo = await entrar(CUENTA.propietario);
    const sofia = await entrar(CUENTA.vecino);
    const insignias = await leer(guillermo, "insignia?select=id,clave");
    const insignia = insignias.datos[0];

    const cuerpo = {
      insignia_id: insignia.id,
      usuario_id: sofia.usuarioId,
      condominio_id: CONDOMINIO,
      otorgado_por: guillermo.usuarioId,
      motivo: "Prueba de repeticion",
    };

    // El primero puede existir ya de una ejecución anterior; lo que importa es
    // que después de intentarlo dos veces, la segunda esté rechazada.
    await insertar(guillermo, "reconocimiento", cuerpo);
    const repetido = await insertar(guillermo, "reconocimiento", cuerpo);

    expect(repetido.estado).toBe(409);
    expect(repetido.mensaje).toContain("reconocimiento_unico_por_mes");
  });
});

describe("Cuadro de honor", () => {
  it("no publica morosidad: solo devuelve unidades al día", async () => {
    const guillermo = await entrar(CUENTA.propietario);
    const filas = await rpc(guillermo, "cuadro_honor", {
      p_condominio_id: CONDOMINIO,
    });

    expect(filas.estado).toBe(200);
    for (const fila of filas.datos) {
      expect(fila.periodos_al_dia).toBe(fila.periodos_totales);
    }
  });

  it("el resumen de cuotas no dice qué unidad pagó", async () => {
    const guillermo = await entrar(CUENTA.propietario);
    const filas = await rpc(guillermo, "resumen_cuotas", {
      p_condominio_id: CONDOMINIO,
    });

    expect(filas.estado).toBe(200);
    expect(filas.datos.length).toBeGreaterThan(0);
    for (const fila of filas.datos) {
      // Agregados y nada más: ni unidad, ni nombre, ni pago individual.
      expect(Object.keys(fila).sort()).toEqual(
        ["al_dia", "atrasados", "esperado", "moneda", "periodo", "recibido"],
      );
    }
  });
});
