import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  api,
  CUENTA,
  UNIDAD,
  entrar,
  leer,
  rpc,
  type Sesion,
} from "./apoyo";

/**
 * Quién reservó, y con qué nombre.
 *
 * La gestión de reservas del administrador mostraba, bajo la etiqueta
 * **"Residente"**, el nombre de la ZONA: `nombre: fila.zona?.nombre`. Todas
 * las reservas de la piscina decían "Piscina". Es el mismo campo que ya había
 * provocado R-46.
 *
 * Y con el nombre real llega R-78: `perfil.usa_alias_zonas` existía para que
 * quien no quiere figurar aparezca con su alias, y no se aplicaba en ningún
 * sitio.
 */

let marcela: Sesion;
let guillermo: Sesion;
let sofia: Sesion;

/** Una reserva propia, para no depender de las sembradas. */
let reservaId = "";
let zonaLibre = "";
let aliasOriginal: { alias: string | null; usa: boolean } | null = null;

beforeAll(async () => {
  [marcela, guillermo, sofia] = await Promise.all([
    entrar(CUENTA.admin),
    entrar(CUENTA.propietario),
    entrar(CUENTA.vecino),
  ]);

  const perfil = await leer(
    guillermo,
    `perfil?id=eq.${guillermo.usuarioId}&select=alias,usa_alias_zonas`,
  );
  aliasOriginal = {
    alias: perfil.datos[0]?.alias ?? null,
    usa: perfil.datos[0]?.usa_alias_zonas ?? false,
  };

  const zonas = await leer(
    guillermo,
    "zona_comun?select=id,requiere_aprobacion&activa=is.true&permite_estancia_larga=is.true",
  );
  zonaLibre = zonas.datos.find((z: any) => !z.requiere_aprobacion)?.id;

  const alta = await api(guillermo, "/rest/v1/reserva_zona", {
    metodo: "POST",
    cuerpo: {
      zona_id: zonaLibre,
      unidad_id: UNIDAD.u101,
      fecha: "2027-03-15",
      hora_inicio: "10:00",
      hora_fin: "12:00",
      solicitada_por: guillermo.usuarioId,
      comentarios: "[prueba reservas]",
    },
  });
  reservaId = alta.datos?.[0]?.id ?? "";
});

afterAll(async () => {
  if (reservaId) {
    await api(marcela, `/rest/v1/reserva_zona?id=eq.${reservaId}`, {
      metodo: "DELETE",
    });
  }
  if (aliasOriginal) {
    await api(guillermo, `/rest/v1/perfil?id=eq.${guillermo.usuarioId}`, {
      metodo: "PATCH",
      cuerpo: {
        alias: aliasOriginal.alias,
        usa_alias_zonas: aliasOriginal.usa,
      },
    });
  }
});

describe("el nombre de quien reservó", () => {
  it("la administración lo ve, y no es el de la zona", async () => {
    expect(reservaId).toBeTruthy();

    const solicitantes = await rpc(marcela, "solicitantes_de_reservas", {
      p_reservas: [reservaId],
    });
    expect(solicitantes.datos).toHaveLength(1);
    expect(solicitantes.datos[0].solicitante).toContain("Guillermo");

    // Control: el nombre de la zona es otra cosa, y es lo que se mostraba.
    const zona = await leer(marcela, `zona_comun?id=eq.${zonaLibre}&select=nombre`);
    expect(solicitantes.datos[0].solicitante).not.toBe(zona.datos[0].nombre);
  });

  it("si pidió figurar con alias, el nombre real no sale", async () => {
    await api(guillermo, `/rest/v1/perfil?id=eq.${guillermo.usuarioId}`, {
      metodo: "PATCH",
      cuerpo: { alias: "[prueba] El del 101", usa_alias_zonas: true },
    });

    const solicitantes = await rpc(marcela, "solicitantes_de_reservas", {
      p_reservas: [reservaId],
    });
    expect(solicitantes.datos[0].solicitante).toBe("[prueba] El del 101");
    expect(solicitantes.datos[0].solicitante).not.toContain("Guillermo");
  });

  it("y al apagar la casilla vuelve el nombre real", async () => {
    // El control positivo de la anterior: sin esto, la prueba pasaría igual
    // con la casilla ignorada si el alias coincidiera por casualidad.
    await api(guillermo, `/rest/v1/perfil?id=eq.${guillermo.usuarioId}`, {
      metodo: "PATCH",
      cuerpo: { usa_alias_zonas: false },
    });

    const solicitantes = await rpc(marcela, "solicitantes_de_reservas", {
      p_reservas: [reservaId],
    });
    expect(solicitantes.datos[0].solicitante).toContain("Guillermo");
  });

  it("un vecino no averigua quién reservó una zona", async () => {
    const solicitantes = await rpc(sofia, "solicitantes_de_reservas", {
      p_reservas: [reservaId],
    });
    expect(solicitantes.datos).toHaveLength(0);
  });

  it("quien reservó sí ve su propia reserva", async () => {
    const solicitantes = await rpc(guillermo, "solicitantes_de_reservas", {
      p_reservas: [reservaId],
    });
    expect(solicitantes.datos).toHaveLength(1);
  });
});
