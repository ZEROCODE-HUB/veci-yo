import { CLAVE_SERVICIO, URL } from "./apoyo";

/**
 * Aparta los reconocimientos que una persona ya dio este mes.
 *
 * Desde el 03/10/2026 hay un reconocimiento al mes por persona. Cualquier
 * prueba que necesite dar uno depende de que esa persona no lo haya dado --y en
 * los datos de prueba lo ha dado--, así que tiene que **traerse ese estado**:
 * es la regla de «una prueba que no se trae sus datos no prueba nada».
 *
 * Se aparta y no se borra: un reconocimiento es la constancia de un hecho.
 *
 * ## Por qué cada fila a un mes distinto, y comprobado
 *
 * `reconocimiento_unico_por_mes` sigue vigente --único por `(quien da, quien
 * recibe, insignia, mes)`-- así que amontonarlas todas en el mismo mes choca
 * con él. Marcela tiene dos del 02/10/2026, de antes de que la regla existiera,
 * y moverlas las dos al mismo mes falla.
 *
 * El id da el **punto de partida**, para que apartar la misma fila caiga donde
 * ya estaba y sea inocuo, y si ese mes está ocupado se prueba el siguiente. La
 * primera versión se fiaba de que «dos ids casi nunca coinciden» y el
 * 05/10/2026 coincidieron: dos cayeron en marzo de 1998 y el archivo se puso
 * rojo. «Casi nunca» es flaco por construcción.
 *
 * ## Por qué vive aquí
 *
 * Porque lo necesitan dos archivos con dos arneses distintos
 * --`aislamiento.test.ts` habla por `fetch` y `comunidad-con-medida` por
 * `supabase-js`-- y dos copias de esto se habrían separado. Es la misma razón
 * por la que el rango de horas de un turno se compone en un solo sitio.
 *
 * Devuelve cuántas apartó, para poder contarlo.
 */
export async function apartarReconocimientosDelMes(params: {
  usuarioId: string;
  condominioId: string;
}): Promise<number> {
  const cabeceras = {
    apikey: CLAVE_SERVICIO,
    Authorization: `Bearer ${CLAVE_SERVICIO}`,
    "Content-Type": "application/json",
  };

  /*
    El primer día del mes **en UTC**, que es el huso con el que cuenta la base
    --`date_trunc('month', otorgado_en at time zone 'UTC')`--. Con medianoche
    local, en Colombia (UTC-5) el filtro empieza a las 05:00 del día 1 y se deja
    fuera lo otorgado esa madrugada.
  */
  const ahora = new Date();
  const inicio = new Date(
    Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), 1, 0, 0, 0, 0),
  );

  const filtro =
    `?otorgado_por=eq.${params.usuarioId}` +
    `&condominio_id=eq.${params.condominioId}` +
    // Codificado: una fecha ISO termina en `+00:00` y en una cadena de
    // consulta el `+` significa espacio.
    `&otorgado_en=gte.${encodeURIComponent(inicio.toISOString())}`;

  const pendientes = await fetch(
    `${URL}/rest/v1/reconocimiento${filtro}&select=id`,
    { headers: cabeceras },
  );
  if (!pendientes.ok) {
    throw new Error(
      `No se pudieron leer los reconocimientos del mes: ${await pendientes.text()}`,
    );
  }
  const filas = (await pendientes.json()) as { id: string }[];

  for (const fila of filas) {
    const semilla = parseInt(fila.id.replace(/-/g, "").slice(0, 8), 16);
    let movido: Response | null = null;

    for (let intento = 0; intento < 60; intento += 1) {
      const mes = (semilla % 1200) + intento;
      const destino = new Date(
        Date.UTC(1900 + Math.floor(mes / 12), mes % 12, 15),
      );
      movido = await fetch(`${URL}/rest/v1/reconocimiento?id=eq.${fila.id}`, {
        method: "PATCH",
        headers: { ...cabeceras, Prefer: "return=minimal" },
        body: JSON.stringify({ otorgado_en: destino.toISOString() }),
      });
      if (movido.ok) break;

      // Solo el choque con el índice merece otro intento. Cualquier otro error
      // se reporta: no se reintenta a ciegas sesenta veces.
      const texto = await movido.clone().text();
      if (!texto.includes("reconocimiento_unico_por_mes")) break;
    }

    // Una limpieza que no comprueba si limpió no es una limpieza.
    if (!movido || !movido.ok) {
      throw new Error(
        `No se pudo apartar el reconocimiento ${fila.id}: ${movido?.status} ${await movido?.text()}`,
      );
    }
  }

  return filas.length;
}
