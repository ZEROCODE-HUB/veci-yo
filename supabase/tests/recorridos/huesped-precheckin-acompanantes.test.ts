import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, supabase } from "./cliente";
import { crearVisita } from "@/features/visitas/services/visitas.repo";
import {
  abrirPrecheckin,
} from "@/features/visitas/services/precheckin.repo";
/*
  El flujo del huesped vive **una sola vez**, en la web: es ella quien lo
  ejecuta de verdad --sin cuenta, con el enlace que le llego-- y la copia
  que habia en este repositorio no la corria nadie en produccion. Lo que se
  prueba aqui es, ahora si, lo que el huesped recorre.
*/
import {
  guardarFicha as guardarPrecheckin,
} from "../../../../veciyo-web/src/lib/precheckin";

/**
 * Recorrido: con quien viene el huesped.
 *
 * Cierra R-25. El cliente lo encontro reservando la piscina como Tomas: podia
 * apuntar como acompanantes a personas que nunca habian pasado por porteria.
 * La causa era que la unica lista que existia era la de las membresias de la
 * vivienda --gente con cuenta y sin documento-- y no la de quien se aloja
 * contigo, que es otra cosa.
 *
 * En archivo aparte del cierre a proposito: alli los casos corren despues de
 * cerrar el preregistro, y con el preregistro cerrado la lista ya no se toca
 * desde el enlace. Meterlos juntos hacia que fallaran los cinco con el mismo
 * mensaje --"este preregistro ya esta cerrado"-- y ninguno dijera nada de lo
 * que iba a comprobar.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const ANFITRIONA = "vecino@veciyo.test";

const MARCA = "[prueba] recorrido acompanantes del precheckin";

let visitaId = "";
let token = "";
let titularId = "";

beforeAll(async () => {
  await entrarComo(ANFITRIONA);
  visitaId = await crearVisita({
    condominioId: CONDOMINIO,
    unidadId: U102,
    tipo: "huesped_temporal",
    fechaDesde: "01/11/2026",
    fechaHasta: "05/11/2026",
    anotacionesIngreso: MARCA,
    invitados: [{ nombre: `${MARCA} titular` }],
  });
  token = (await abrirPrecheckin(visitaId)).enlace.split("/access/")[1];
  await salir();

  titularId = await guardarPrecheckin(token, {
    nombre: "Camila",
    apellidos: "Restrepo Ávila",
    tipoDocumento: "cedula_ciudadania",
    documento: "1020304050",
    correo: "camila.acompanantes@ejemplo.test",
  }, supabase);
});

afterAll(async () => {
  await entrarComo(ANFITRIONA);
  await supabase.from("visita").delete().eq("id", visitaId);
  await salir();
});

describe("a quién apunta el titular", () => {
  it("los pone él, con su documento", async () => {
    const { data, error } = await supabase.rpc("guardar_acompanante", {
      p_token: token,
      p_nombre: "Andrés",
      p_apellidos: "Restrepo",
      p_tipo_documento: "cedula_ciudadania",
      p_documento: "1098765432",
    });
    expect(error).toBeNull();
    expect(data).toBeTruthy();
  });

  it("y un adulto sin documento no entra", async () => {
    /*
      El control que separa esta via de la otra. La de las membresias no
      guardaba documento, y el documento es justo lo que la autoridad pide:
      por eso habia gente reportada sin llaves y gente con llaves sin
      reportar.
    */
    const { error } = await supabase.rpc("guardar_acompanante", {
      p_token: token,
      p_nombre: "Sin Papeles",
    });
    expect(error?.message ?? "").toMatch(/documento/i);
  });

  it("un menor sí, y no se le inventa quién asume sus términos", async () => {
    /*
      Un menor no puede aceptar terminos por si mismo, asi que la primera
      version lo marcaba como excepcion al crearlo. La base lo rechazo:
      `invitado_excepcion_con_aprobador` exige que toda excepcion diga QUIEN
      la asume, y tiene razon. Quien carga con la responsabilidad legal de un
      menor lo hace con un clic suyo, no lo hereda de un valor por defecto.

      Asi que queda `es_menor` y la excepcion **sin marcar**: el paso sale
      pendiente y el anfitrion lo aprueba desde su pantalla.
    */
    const { data: menorId, error } = await supabase.rpc("guardar_acompanante", {
      p_token: token,
      p_nombre: "Mateo",
      p_apellidos: "Restrepo",
      p_es_menor: true,
    });
    expect(error).toBeNull();

    await entrarComo(ANFITRIONA);
    const { data } = await supabase
      .from("invitado")
      .select("es_menor, terminos_excepcion, terminos_aprobado_por")
      .eq("id", menorId as string)
      .single();
    await salir();

    expect(data!.es_menor).toBe(true);
    expect(data!.terminos_excepcion).toBe(false);
    expect(data!.terminos_aprobado_por).toBeNull();
  });

  it("corregir a alguien no lo duplica", async () => {
    const { data: id } = await supabase.rpc("guardar_acompanante", {
      p_token: token,
      p_nombre: "Valentina",
      p_tipo_documento: "cedula_ciudadania",
      p_documento: "1111111111",
    });
    const { data: mismo } = await supabase.rpc("guardar_acompanante", {
      p_token: token,
      p_acompanante_id: id as string,
      p_nombre: "Valentina",
      p_apellidos: "Gómez",
      p_tipo_documento: "cedula_ciudadania",
      p_documento: "2222222222",
    });
    expect(mismo).toBe(id);

    const { data: lista, error } = await supabase.rpc(
      "acompanantes_del_precheckin",
      { p_token: token },
    );
    /*
      Mirar el error y no solo los datos. Sin esto, una funcion rota se ve como
      «Cannot read properties of null» y hay que ir a buscar el motivo a mano:
      paso el 03/10/2026 con un `id` ambiguo dentro de la propia funcion.
    */
    expect(error).toBeNull();
    const valentinas = (lista as { nombre: string }[]).filter(
      (a) => a.nombre === "Valentina",
    );
    expect(valentinas).toHaveLength(1);
  });

  it("y el titular no sale en la lista de acompañantes", async () => {
    // Parece obvio y es el error que se cometio en la pantalla de zonas:
    // contar al titular entre sus acompanantes ofrecia una persona de mas.
    const { data: lista, error } = await supabase.rpc(
      "acompanantes_del_precheckin",
      { p_token: token },
    );
    expect(error).toBeNull();
    const ids = (lista as { id: string }[]).map((a) => a.id);
    expect(ids).not.toContain(titularId);
  });

  it("ni se puede borrar a sí mismo con el botón de quitar", async () => {
    // Sin el filtro, quien se equivoca de boton deja la estancia sin la
    // persona que reservo.
    const { error } = await supabase.rpc("quitar_acompanante", {
      p_token: token,
      p_acompanante_id: titularId,
    });
    expect(error?.message ?? "").toMatch(/no es de esta reserva/i);
  });

  it("no se pasa del tope que declaró el anfitrión", async () => {
    /*
      `max_huespedes` sale de la ficha del alojamiento: es lo que el anfitrion
      declaro que cabe. Cuenta al titular tambien, porque el tambien duerme
      ahi.
    */
    const { data: estancia } = await supabase.rpc("consultar_precheckin", {
      p_token: token,
    });
    const max = (Array.isArray(estancia) ? estancia[0] : estancia)!
      .max_huespedes as number;
    expect(max).toBeGreaterThan(0);

    let ultimo = null;
    for (let i = 0; i < max + 2; i++) {
      ultimo = await supabase.rpc("guardar_acompanante", {
        p_token: token,
        p_nombre: `Relleno ${i}`,
        p_tipo_documento: "cedula_ciudadania",
        p_documento: `90000${i}`,
      });
      if (ultimo.error) break;
    }
    expect(ultimo!.error?.message ?? "").toMatch(/maximo/i);
  });

  it("y con un enlace inventado no se apunta a nadie", async () => {
    const { error } = await supabase.rpc("guardar_acompanante", {
      p_token: "c".repeat(64),
      p_nombre: "Colado",
      p_tipo_documento: "cedula_ciudadania",
      p_documento: "3333333333",
    });
    expect(error?.message ?? "").toMatch(/enlace/i);
  });
});
