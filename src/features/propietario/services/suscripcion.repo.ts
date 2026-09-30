import { supabase } from "@/shared/services/supabase";
import { hoyEnIso } from "./suscripcionVigente";
import { haciaElFormulario, haciaLaBase } from "./visitasDeHuesped";

/**
 * La suscripción de renta corta de una vivienda.
 *
 * Vivía entera en memoria: un `Record<number, {activa}>` de Zustand que se
 * ponía a true con un `setTimeout` de milisegundo y medio y se perdía al
 * recargar. La tabla `suscripcion_renta_corta` existía desde el principio y
 * nadie la consultaba, así que la puerta de entrada de todo el módulo de renta
 * corta —incluido el historial de visitas, que también la miraba— dependía de
 * una bandera que no sobrevivía a cerrar la app.
 *
 * El cobro sigue sin pasarela: eso no se finge aquí ni se anuncia.
 */

export interface Suscripcion {
  id: string;
  estado: "activa" | "vencida" | "cancelada";
  iniciadaEn: string;
  verificacionesBase: number;
  /**
   * El día en que la renta corta deja de funcionar, si ya se pidió la baja.
   *
   * Al darse de baja **no se corta el servicio en el momento**: se respeta el
   * mes que ya está pagado, así que aquí va el último día de ese periodo. Nulo
   * mientras nadie ha pedido la baja. Decisión del cliente del 29/09/2026.
   */
  canceladaEn: string | null;
}

/**
 * Lo que el edificio impone y lo que solo advierte.
 *
 * `permiteRentaCorta` es la autorización y **bloquea**: sin ella la base
 * rechaza el alta. Los dos números son advertencia, por decisión del KT
 * (flujo 4.1 paso 5); ya se implementaron una vez como bloqueo y hubo que
 * deshacerlo.
 */
export interface LimitesDelCondominio {
  permiteRentaCorta: boolean;
  estanciaMinimaNoches: number | null;
  capacidadMaxima: number | null;
}

export async function obtenerSuscripcion(
  unidadId: string,
): Promise<Suscripcion | null> {
  const { data, error } = await supabase
    .from("suscripcion_renta_corta")
    .select("id, estado, iniciada_en, verificaciones_base, cancelada_en")
    .eq("unidad_id", unidadId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    estado: data.estado,
    iniciadaEn: data.iniciada_en,
    verificacionesBase: data.verificaciones_base,
    canceladaEn: data.cancelada_en,
  };
}

/*
  `suscripcionVigente` y `hoyEnIso` viven en `suscripcionVigente.ts`, sin
  importar nada de la plataforma. Este archivo trae el cliente de Supabase, que
  arrastra React Native, y las pruebas unitarias corren en Node: importarlo desde
  una prueba revienta con «Flow is not supported». Una regla que no se puede
  probar sin montar la aplicación es una regla que no se prueba.
*/

export async function obtenerLimites(
  unidadId: string,
): Promise<LimitesDelCondominio | null> {
  const { data, error } = await supabase.rpc("limites_del_condominio", {
    p_unidad_id: unidadId,
  });
  if (error) throw error;

  const fila = Array.isArray(data) ? data[0] : data;
  if (!fila) return null;

  return {
    permiteRentaCorta: fila.permite_renta_corta ?? true,
    estanciaMinimaNoches: fila.estancia_minima_noches ?? null,
    capacidadMaxima: fila.capacidad_maxima ?? null,
  };
}

/**
 * Activa la suscripción. Si la vivienda ya tuvo una y se canceló, se reactiva
 * la misma fila: la unicidad por unidad es una restricción de la tabla.
 */
export async function activarSuscripcion(unidadId: string): Promise<void> {
  const existente = await obtenerSuscripcion(unidadId);

  if (existente) {
    const { error } = await supabase
      .from("suscripcion_renta_corta")
      .update({ estado: "activa", cancelada_en: null })
      .eq("id", existente.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from("suscripcion_renta_corta")
    .insert({ unidad_id: unidadId, estado: "activa" });
  if (error) throw error;
}

/**
 * Da de baja la renta corta **respetando el mes ya pagado**.
 *
 * Decisión del cliente del 29/09/2026. Antes cortaba en el momento: quien había
 * pagado el mes completo lo perdía al pulsar, y eso en una suscripción se
 * reclama.
 *
 * Así que si queda periodo pagado, la suscripción se queda `activa` con la fecha
 * de término guardada --el último día de ese periodo-- y `suscripcionVigente`
 * deja de darla por buena cuando pasa. Si no hay periodo vigente, se cancela ya.
 *
 * Devuelve el día en que deja de funcionar, que es lo que la pantalla tiene que
 * decirle a quien se da de baja.
 */
export async function cancelarSuscripcion(
  unidadId: string,
): Promise<{ terminaEn: string; inmediata: boolean }> {
  const suscripcion = await obtenerSuscripcion(unidadId);
  if (!suscripcion) throw new Error("Esta vivienda no tiene renta corta.");

  const hoy = hoyEnIso();
  const { data: periodo, error: errorPeriodo } = await supabase
    .from("periodo_suscripcion")
    .select("hasta")
    .eq("suscripcion_id", suscripcion.id)
    .gte("hasta", hoy)
    .order("hasta", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (errorPeriodo) throw errorPeriodo;

  const terminaEn = periodo?.hasta ?? hoy;
  const inmediata = !periodo;

  const { error } = await supabase
    .from("suscripcion_renta_corta")
    .update({
      // Con mes pagado se queda activa: lo que manda es la fecha.
      estado: inmediata ? "cancelada" : "activa",
      cancelada_en: terminaEn,
    })
    .eq("unidad_id", unidadId);
  if (error) throw error;

  return { terminaEn, inmediata };
}

/**
 * Las advertencias que la pantalla tiene que mostrar para lo que el propietario
 * está configurando. Devuelve frases, no banderas: es lo que se pinta.
 */
export function advertencias(
  limites: LimitesDelCondominio | null,
  configurado: { estanciaMinima: number; capacidad: number },
): string[] {
  if (!limites) return [];
  const avisos: string[] = [];

  if (
    limites.estanciaMinimaNoches !== null &&
    configurado.estanciaMinima < limites.estanciaMinimaNoches
  ) {
    avisos.push(
      `El edificio pide un mínimo de ${limites.estanciaMinimaNoches} ${
        limites.estanciaMinimaNoches === 1 ? "noche" : "noches"
      } y estás configurando ${configurado.estanciaMinima}.`,
    );
  }

  if (
    limites.capacidadMaxima !== null &&
    configurado.capacidad > limites.capacidadMaxima
  ) {
    avisos.push(
      `El aforo máximo del edificio es de ${limites.capacidadMaxima} personas y estás configurando ${configurado.capacidad}.`,
    );
  }

  return avisos;
}


/**
 * Lo que el anfitrión configura de su alojamiento.
 *
 * Va todo en una sola llamada porque es un solo botón: si se guardara la
 * descripción y no el libro, el anfitrión se iría creyendo que dejó puesto el
 * wifi. Las contraseñas las cifra la base en Vault.
 */
export interface Alojamiento {
  descripcion: string;
  numHabitaciones: number;
  maxHuespedes: number;
  estacionamientos: number;
  estanciaMinima: number;
  permiteMascotas: boolean;
  aptoNinos: boolean;
  visitasDeHuespedes: string;
  rnt: string;
  publicadoAirbnb: boolean;
  publicadoBooking: boolean;
  otrasPlataformas: string;
  pms: string;
  icalUrl: string;
  tieneAntirruido: boolean;
  tieneNoFumar: boolean;
  tieneSensor: boolean;
  ocultarNumero: boolean;
  ocultarContacto: boolean;
  wifiNombre: string;
  wifiPassword: string;
  puertaPassword: string;
  instrucciones: string;
  notas: string;
}

export async function guardarAlojamiento(
  unidadId: string,
  datos: Alojamiento,
): Promise<void> {
  const { error } = await supabase.rpc("guardar_alojamiento", {
    p_unidad_id: unidadId,
    p_descripcion: datos.descripcion,
    p_num_habitaciones: datos.numHabitaciones,
    p_max_huespedes: datos.maxHuespedes,
    p_estacionamientos: datos.estacionamientos,
    p_estancia_minima: datos.estanciaMinima,
    p_permite_mascotas: datos.permiteMascotas,
    p_apto_ninos: datos.aptoNinos,
    // Omitido cuando no se sabe traducir: el argumento que falta llega a la
    // funcion como `null`, y `null` alli significa «no toques esta columna».
    p_visitas_de_huespedes: haciaLaBase(datos.visitasDeHuespedes) ?? undefined,
    p_rnt: datos.rnt,
    p_publicado_airbnb: datos.publicadoAirbnb,
    p_publicado_booking: datos.publicadoBooking,
    p_otras_plataformas: datos.otrasPlataformas,
    p_pms: datos.pms,
    p_ical_url: datos.icalUrl,
    p_tiene_antirruido: datos.tieneAntirruido,
    p_tiene_no_fumar: datos.tieneNoFumar,
    p_tiene_sensor: datos.tieneSensor,
    p_ocultar_numero: datos.ocultarNumero,
    p_ocultar_contacto: datos.ocultarContacto,
    p_wifi_nombre: datos.wifiNombre,
    // Vacío no borra la que hay: el formulario llega vacío porque la
    // contraseña no se puede releer, no porque se quiera quitar.
    p_wifi_password: datos.wifiPassword || undefined,
    p_puerta_password: datos.puertaPassword || undefined,
    p_instrucciones: datos.instrucciones,
    p_notas: datos.notas,
  });
  if (error) throw error;
}

/** Lo guardado, para rellenar el formulario al abrirlo. */
export async function obtenerAlojamiento(unidadId: string) {
  const { data, error } = await supabase
    .from("suscripcion_renta_corta")
    // Literal de una pieza a proposito: concatenado, el tipo generado no lo
    // entiende y `data` se vuelve un error de tipos.
    .select(
      "descripcion, num_habitaciones, max_huespedes, estacionamientos_huesped, estancia_minima_noches, permite_mascotas, apto_ninos, visitas_de_huespedes, rnt, publicado_airbnb, publicado_booking, otras_plataformas, pms, ical_url, tiene_antirruido, tiene_no_fumar, tiene_sensor, ocultar_numero, ocultar_contacto",
    )
    .eq("unidad_id", unidadId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  // El error se propaga: tragarselo dejaria el libro en blanco y el anfitrion
  // creeria que nunca lo cargo. Es el defecto de la correspondencia, que se
  // veia como una bandeja vacia.
  const { data: libro, error: errorLibro } = await supabase
    .from("libro_huesped")
    .select("wifi_nombre, instrucciones, notas")
    .eq("unidad_id", unidadId)
    .maybeSingle();
  if (errorLibro) throw errorLibro;

  return {
    descripcion: data.descripcion ?? "",
    numHabitaciones: data.num_habitaciones ?? 0,
    maxHuespedes: data.max_huespedes ?? 1,
    estacionamientos: data.estacionamientos_huesped ?? 0,
    estanciaMinima: data.estancia_minima_noches ?? 1,
    permiteMascotas: data.permite_mascotas ?? false,
    aptoNinos: data.apto_ninos ?? true,
    visitasDeHuespedes: haciaElFormulario(data.visitas_de_huespedes),
    rnt: data.rnt ?? "",
    publicadoAirbnb: data.publicado_airbnb ?? false,
    publicadoBooking: data.publicado_booking ?? false,
    otrasPlataformas: data.otras_plataformas ?? "",
    pms: data.pms ?? "",
    icalUrl: data.ical_url ?? "",
    tieneAntirruido: data.tiene_antirruido ?? false,
    tieneNoFumar: data.tiene_no_fumar ?? false,
    tieneSensor: data.tiene_sensor ?? false,
    ocultarNumero: data.ocultar_numero ?? false,
    ocultarContacto: data.ocultar_contacto ?? false,
    wifiNombre: libro?.wifi_nombre ?? "",
    // Las contraseñas no se releen: el formulario las deja en blanco y solo
    // las reemplaza quien escribe una nueva.
    wifiPassword: "",
    puertaPassword: "",
    instrucciones: libro?.instrucciones ?? "",
    notas: libro?.notas ?? "",
  };
}

/** El precio vigente del plan para el país del condominio. */
export interface PrecioDelPlan {
  monto: number;
  moneda: string;
  periodicidad: "mensual" | "anual";
}

/**
 * Cuánto cuesta la renta corta en este edificio.
 *
 * Estaba escrito a mano en la pantalla —`$15.00`, dos veces, sin moneda—, así
 * que subir el precio exigía publicar la aplicación y en Colombia y en Perú
 * ese `$` no dice lo mismo. Ahora sale de `precio_plan`, que tiene un precio
 * por país y uno por defecto.
 */
export async function obtenerPrecioDelPlan(
  condominioId: string,
): Promise<PrecioDelPlan | null> {
  const { data, error } = await supabase
    .rpc("precio_del_plan", {
      p_clave: "renta_corta",
      p_condominio_id: condominioId || undefined,
    })
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    monto: Number(data.monto),
    moneda: String(data.moneda).trim(),
    periodicidad: data.periodicidad as PrecioDelPlan["periodicidad"],
  };
}

/**
 * Abre el período que se acaba de pagar.
 *
 * El importe **no se manda**: lo sella un disparador desde el precio vigente.
 * Quien opera la unidad puede escribir esta fila —es quien paga—, así que si
 * el importe viniera de aquí cualquiera podría abrir un período diciendo que
 * le cobraron cero.
 *
 * `referenciaPago` es el identificador de la pasarela. Va nulo mientras el
 * cobro sea simulado: todavía no hay ninguna pasarela integrada, y eso no se
 * finge aquí.
 */
export async function abrirPeriodoPagado(params: {
  suscripcionId: string;
  verificacionesBase: number;
  periodicidad: PrecioDelPlan["periodicidad"];
  referenciaPago?: string | null;
}): Promise<void> {
  const desde = new Date();
  const hasta = new Date(desde);
  if (params.periodicidad === "anual") {
    hasta.setFullYear(hasta.getFullYear() + 1);
  } else {
    hasta.setMonth(hasta.getMonth() + 1);
  }

  const iso = (fecha: Date) => fecha.toISOString().slice(0, 10);

  const { error } = await supabase.from("periodo_suscripcion").insert({
    suscripcion_id: params.suscripcionId,
    desde: iso(desde),
    hasta: iso(hasta),
    verificaciones_base: params.verificacionesBase,
    referencia_pago: params.referenciaPago ?? null,
    pagado_en: new Date().toISOString(),
  });

  if (error) throw error;
}
