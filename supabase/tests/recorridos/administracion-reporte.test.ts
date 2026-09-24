import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, supabase } from "./cliente";
import {
  generarReporte,
  obtenerSolicitudes,
} from "@/features/administrador/services/reportes.repo";
import { crearVisita } from "@/features/visitas/services/visitas.repo";

/**
 * Recorrido: la administración genera un reporte y después lo vuelve a leer.
 *
 * Un reporte de visitantes es la lista de quién entró a qué casa y a qué hora.
 * Son datos personales de los vecinos, así que aquí hay dos cosas que vigilar,
 * y son distintas:
 *
 *   · que **solo la administración** pueda sacarlo --y no solo por la pantalla:
 *     las tres consultas son `security definer`, o sea que corren con los
 *     permisos del dueño de la función, y cualquiera puede llamarlas sin pasar
 *     por ninguna pantalla--;
 *   · que **quede constancia de quién lo pidió**, que es la razón entera por la
 *     que existe `solicitud_reporte`.
 *
 * Lo segundo estaba escrito y no se podía leer: `solicitada_por` apunta a
 * `auth.users`, y PostgREST no sabe llegar desde ahí a `perfil`, así que pedir
 * el nombre respondía 400. El mismo hueco que dejaba vacía la bandeja de
 * correspondencia.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const ADMIN = "admin@veciyo.test";
const VECINA = "vecino@veciyo.test";

const MARCA = "[prueba] recorrido reporte";

let adminId = "";
let visitaId = "";
/** Todo lo que este recorrido asienta, para retirarlo al terminar. */
const solicitudes: string[] = [];

/** Hoy en formato `yyyy-MM-dd`, que es el que pide la solicitud. */
function hoy(): string {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

/**
 * Hoy en `dd/MM/yyyy`, que es el formato canónico de la app (regla 6) y el que
 * `crearVisita` traduce a `date` antes de escribir.
 */
function hoyEnPantalla(): string {
  const [a, m, d] = hoy().split("-");
  return `${d}/${m}/${a}`;
}

/** Las solicitudes que existían antes de empezar: esas no se tocan. */
let previas = new Set<string>();

beforeAll(async () => {
  adminId = await entrarComo(ADMIN);
  const { data } = await supabase
    .from("solicitud_reporte")
    .select("id")
    .eq("condominio_id", CONDOMINIO);
  previas = new Set((data ?? []).map((s) => s.id));

  // Una visita de hoy, para que el reporte tenga algo que contar que este
  // recorrido controle. Sin un dato propio, "salen filas" depende de lo que
  // hubiera en la base y no prueba nada.
  await salir();
  await entrarComo(VECINA);
  visitaId = await crearVisita({
    condominioId: CONDOMINIO,
    unidadId: U102,
    tipo: "amigos",
    // Con fecha: el reporte filtra por `fecha_desde`, así que una visita sin
    // fecha solo sale pidiendo todo el historial.
    fechaDesde: hoyEnPantalla(),
    fechaHasta: hoyEnPantalla(),
    profesion: MARCA,
    aviso: "notificar_y_anunciar",
    invitados: [{ nombre: `${MARCA} — visitante` }],
  });

  await salir();
  await entrarComo(ADMIN);
});

afterAll(async () => {
  await salir();
  await entrarComo(ADMIN);
  for (const id of solicitudes) {
    await supabase.from("solicitud_reporte").delete().eq("id", id);
  }
  if (visitaId) await supabase.from("visita").delete().eq("id", visitaId);
  await salir();
});

/** Apunta lo que la llamada acaba de asentar, para poder retirarlo. */
async function anotarSolicitudNueva() {
  const { data } = await supabase
    .from("solicitud_reporte")
    .select("id")
    .eq("condominio_id", CONDOMINIO);
  for (const s of data ?? []) {
    if (!previas.has(s.id) && !solicitudes.includes(s.id))
      solicitudes.push(s.id);
  }
  return solicitudes[solicitudes.length - 1];
}

describe("un reporte del condominio", () => {
  it("la administración lo genera y salen las filas de verdad", async () => {
    const res = await generarReporte({
      condominioId: CONDOMINIO,
      reporteId: "visitantes",
      desde: hoy(),
      hasta: hoy(),
      todoHistorial: false,
    });

    await anotarSolicitudNueva();

    expect(res.total).toBeGreaterThan(0);
    expect(res.filas.length).toBe(res.total);
    // Las columnas salen de la fila, no de una lista escrita a mano: si la
    // consulta cambia, la pantalla se entera.
    expect(res.columnas).toContain("unidad");
    expect(res.columnas).toContain("visitante");
    // Y la visita que acaba de crear la vecina está dentro.
    expect(res.filas.some((f) => String(f.visitante ?? "").includes(MARCA))).toBe(
      true,
    );
  });

  it("y queda asentado quién lo pidió, con su rango", async () => {
    /*
      Esto es la tabla entera: un reporte se lleva datos personales de los
      vecinos, y meses después hay que poder decir quién los sacó.
    */
    const { data } = await supabase
      .from("solicitud_reporte")
      .select("tipo, desde, hasta, todo_historial, filas, solicitada_por")
      .eq("id", solicitudes[0])
      .single();

    expect(data!.tipo).toBe("visitantes");
    expect(data!.solicitada_por).toBe(adminId);
    expect(data!.todo_historial).toBe(false);
    expect(data!.desde).toBe(hoy());
    // Cuántas filas se llevó, que es el tamaño de lo que se expuso.
    expect(data!.filas).toBeGreaterThan(0);
  });

  it("se asienta también cuando el reporte sale vacío", async () => {
    /*
      Lo que se audita es el **acceso**, no el volumen. Una consulta que no
      devuelve nada igual fue una consulta: si solo se apuntaran las que traen
      filas, bastaría con afinar el rango para mirar sin dejar rastro.
    */
    const antes = solicitudes.length;

    const res = await generarReporte({
      condominioId: CONDOMINIO,
      reporteId: "visitantes",
      desde: "1990-01-01",
      hasta: "1990-01-31",
      todoHistorial: false,
    });
    expect(res.total).toBe(0);
    // Sin filas no hay de dónde sacar las columnas: la pantalla pinta el aviso
    // de "sin resultados", no una tabla sin cabeceras.
    expect(res.columnas).toEqual([]);

    const id = await anotarSolicitudNueva();
    expect(solicitudes.length).toBe(antes + 1);

    const { data } = await supabase
      .from("solicitud_reporte")
      .select("filas, solicitada_por")
      .eq("id", id)
      .single();
    expect(data!.filas).toBe(0);
    expect(data!.solicitada_por).toBe(adminId);
  });

  it("y el historial se vuelve a leer con el nombre de quien pidió", async () => {
    /*
      `solicitada_por` apunta a `auth.users`, y PostgREST no sabe llegar desde
      ahí a `perfil`: pedir el nombre respondía 400 y la lista se quedaba
      vacía, igual que la bandeja de correspondencia. La clave contra `perfil`
      está declarada aparte; la identidad sigue siendo `auth.users.id`.
    */
    const historial = await obtenerSolicitudes(CONDOMINIO);

    const mia = historial.find((s) => s.id === solicitudes[0]);
    expect(mia).toBeDefined();
    expect(mia!.solicitadaPor).toBeTruthy();
    expect(mia!.tipo).toBe("visitantes");
    expect(mia!.todoHistorial).toBe(false);
    // Lo más reciente primero: el historial se mira por arriba.
    expect(
      new Date(historial[0].solicitadaEn).getTime(),
    ).toBeGreaterThanOrEqual(
      new Date(historial[historial.length - 1].solicitadaEn).getTime(),
    );
  });

  it("un tipo de reporte que no existe no llega a la base", async () => {
    await expect(
      generarReporte({
        condominioId: CONDOMINIO,
        reporteId: "nominas",
        todoHistorial: true,
      }),
    ).rejects.toThrow(/desconocido/i);
  });

  it("una vecina no lo genera, ni por la pantalla ni llamando a la consulta", async () => {
    await salir();
    await entrarComo(VECINA);

    await expect(
      generarReporte({
        condominioId: CONDOMINIO,
        reporteId: "visitantes",
        todoHistorial: true,
      }),
    ).rejects.toThrow();

    /*
      Y la otra defensa por separado. Las tres consultas son `security definer`
      --corren con los permisos del dueño--, así que no las protege RLS: las
      protege el `es_admin_condominio` que llevan dentro. Un RPC es público;
      cualquiera puede llamarlo sin pasar por la pantalla, y ahí la pantalla ya
      no defiende nada.
    */
    for (const rpc of [
      "reporte_visitantes",
      "reporte_correspondencia",
      "reporte_areas_comunes",
    ]) {
      const { data, error } = await supabase.rpc(rpc as never, {
        p_condominio_id: CONDOMINIO,
        p_desde: null,
        p_hasta: null,
      } as never);
      expect(error).toBeNull();
      // Responde, pero sin una sola fila de nadie.
      expect(data).toEqual([]);
    }

    // Y tampoco ve el historial de solicitudes, que dice qué se ha mirado.
    const historial = await obtenerSolicitudes(CONDOMINIO);
    expect(historial).toEqual([]);
  });
});
