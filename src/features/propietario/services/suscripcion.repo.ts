import { formatDateTime } from "@/shared/utils";
import { motivoDeLaFuncion } from "@/shared/services/errorDeFuncion";
import { supabase } from "@/shared/services/supabase";
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
 * Activa la renta corta de una vivienda.
 *
 * Lo decide la base (`activar_suscripcion_renta_corta`): quién puede, y que la
 * fila es una por vivienda —si ya tuvo el servicio se reactiva la misma—.
 * Antes eran dos escrituras sueltas desde aquí, un `update` o un `insert`
 * según lo que se leyera un momento antes.
 */
export async function activarSuscripcion(unidadId: string): Promise<void> {
  const { error } = await supabase.rpc("activar_suscripcion_renta_corta", {
    p_unidad_id: unidadId,
  });
  if (error) throw error;
}

/**
 * Da de baja la renta corta **respetando el mes ya pagado**.
 *
 * Decisión del cliente del 29/09/2026: quien pagó el mes completo no lo pierde
 * al pulsar. Si queda periodo pagado, sigue funcionando hasta su último día;
 * si no, se corta hoy.
 *
 * Hasta el 09/10/2026 eso se calculaba aquí, con el reloj del teléfono, y se
 * escribía con un `update` directo. Ahora lo calcula la base con el día del
 * edificio (`cancelar_suscripcion_renta_corta`), que es además quien deja de
 * aceptar huéspedes cuando ese día pasa.
 *
 * Devuelve el día en que deja de funcionar, que es lo que la pantalla tiene que
 * decirle a quien se da de baja.
 */
export async function cancelarSuscripcion(
  unidadId: string,
): Promise<{ terminaEn: string; inmediata: boolean }> {
  const { data, error } = await supabase.rpc("cancelar_suscripcion_renta_corta", {
    p_unidad_id: unidadId,
  });
  if (error) throw error;

  const fila = Array.isArray(data) ? data[0] : data;
  if (!fila) throw new Error("Esta vivienda no tiene renta corta.");
  return { terminaEn: fila.termina_en, inmediata: fila.inmediata };
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
  checkinDesde: string;
  checkinHasta: string;
  checkin24h: boolean;
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
    p_checkin_desde: datos.checkinDesde,
    p_checkin_hasta: datos.checkinHasta,
    p_checkin_24h: datos.checkin24h,
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
      "descripcion, num_habitaciones, max_huespedes, estacionamientos_huesped, estancia_minima_noches, permite_mascotas, apto_ninos, visitas_de_huespedes, rnt, publicado_airbnb, publicado_booking, otras_plataformas, pms, ical_url, tiene_antirruido, tiene_no_fumar, tiene_sensor, ocultar_numero, ocultar_contacto, checkin_desde, checkin_hasta, checkin_24h",
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
    /*
      El horario de entrada de esta vivienda. Las tres columnas existian desde
      la primera migracion, el huesped ya las veia y el edificio ya las
      limitaba —y **no habia pantalla donde ponerlas**, porque la funcion de
      guardado no recibia los parametros.
    */
    checkinDesde: (data.checkin_desde ?? "").slice(0, 5),
    checkinHasta: (data.checkin_hasta ?? "").slice(0, 5),
    checkin24h: data.checkin_24h ?? false,
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

// ---------------------------------------------------------------------------
// El calendario del portal
// ---------------------------------------------------------------------------

export interface EstadoCalendario {
  /** El enlace guardado, o vacío si el anfitrión no ha puesto ninguno. */
  url: string;
  /** Cuándo se leyó por última vez con éxito, en `dd/MM/yyyy HH:mm`. */
  sincronizadoEn: string | null;
  /** Por qué falló la última lectura. */
  error: string | null;
}

/**
 * Cómo le fue a la última lectura del calendario.
 *
 * Existe porque un calendario que deja de funcionar lo hace **en silencio**: el
 * anfitrión sigue viendo su enlace guardado y cree que las reservas van a
 * entrar solas. Lo único que lo delata es cuándo se leyó por última vez.
 */
export async function obtenerEstadoCalendario(
  unidadId: string,
): Promise<EstadoCalendario> {
  const { data, error } = await supabase.rpc("calendario_de_unidad", {
    p_unidad_id: unidadId,
  });
  if (error) throw error;

  const fila = data?.[0];
  return {
    url: fila?.url ?? "",
    sincronizadoEn: fila?.sincronizado_en
      ? formatDateTime(new Date(fila.sincronizado_en))
      : null,
    error: fila?.error ?? null,
  };
}

export interface ResultadoSincronizacion {
  leidas: number;
  nuevas: number;
  actualizadas: number;
  problemas?: string[];
}

/**
 * Lee el calendario ahora y crea las estancias que falten.
 *
 * Lo que entra es media reserva —fechas y código, que es todo lo que Airbnb
 * manda— y nace con su titular en blanco para que el huésped lo rellene desde
 * su enlace de preregistro.
 */
export async function sincronizarCalendario(
  unidadId: string,
): Promise<ResultadoSincronizacion> {
  const { data, error } = await supabase.functions.invoke(
    "sincronizar-calendario",
    { body: { unidadId } },
  );
  if (error) {
    const detalle = await motivoDeLaFuncion(error);
    throw new Error(detalle ?? "No se pudo leer el calendario");
  }
  return data as ResultadoSincronizacion;
}


/** Lo configurado para los recordatorios, al abrir el formulario. */
export async function obtenerRecordatorios(unidadId: string) {
  /*
    Lectura aparte y no una columna más en `obtenerAlojamiento`: aquel `select`
    ya rozaba los 400 caracteres que admite `npm run lineas`, y no se puede
    partir en varias líneas porque entonces Supabase deja de deducir el tipo y
    `data` se vuelve un error. Separarlo es además coherente con el guardado,
    que también va por su cuenta.
  */
  const { data, error } = await supabase
    .from("suscripcion_renta_corta")
    .select("recordatorio_al_huesped, recordatorio_al_anfitrion, recordatorio_dias")
    .eq("unidad_id", unidadId)
    .maybeSingle();
  if (error) throw error;

  return {
    alHuesped: data?.recordatorio_al_huesped ?? true,
    alAnfitrion: data?.recordatorio_al_anfitrion ?? true,
    // Los mismos que la base pone por defecto. Sin vivienda todavía, el
    // formulario tiene que enseñar lo que va a pasar, no una lista vacía.
    dias: (data?.recordatorio_dias as number[] | null) ?? [7, 3, 1],
  };
}

/**
 * A quién avisar, y con cuánta antelación, cuando un huésped no termina su
 * preregistro.
 *
 * Va por su propia RPC y no dentro de `guardarAlojamiento` a propósito: aquella
 * toca el Vault --las claves del wifi y de la puerta-- y ya se rompió entera
 * una vez por un secreto huérfano, dejando al anfitrión sin poder guardar nada.
 * Si esto falla, lo que falla es esto.
 */
export async function guardarRecordatorios(
  unidadId: string,
  datos: { alHuesped: boolean; alAnfitrion: boolean; dias: number[] },
): Promise<void> {
  const { error } = await supabase.rpc("guardar_recordatorios_precheckin", {
    p_unidad_id: unidadId,
    p_al_huesped: datos.alHuesped,
    p_al_anfitrion: datos.alAnfitrion,
    p_dias: datos.dias,
  });
  if (error) throw error;
}

/**
 * Si el envío real al ministerio está encendido **en todo Veciyo**.
 *
 * Decisión del cliente del 09/10/2026: «por ahora que esté en SIMULACIÓN, pero
 * que deje escribir el TRA; eso debe funcionar SIMULADO PARA TODOS». O sea que
 * un anfitrión ya puede guardar su token y recorrer el flujo entero, y nada
 * sale al MinCIT.
 *
 * **Esto no es lo que decide.** Lo decide `TRA_ACTIVO` dentro de la función
 * `reportar-tra`, que es la última puerta antes del `fetch` y la única que
 * sirve para quien llame a la función por su cuenta. Esta bandera solo decide
 * **qué ofrece la pantalla**: con ella apagada, el interruptor de armar no se
 * enseña, porque un control que no puede hacer lo que promete es decorativo y
 * ese es el defecto más repetido de este proyecto.
 *
 * Las dos se encienden juntas. Si se desincronizan no pasa nada grave, porque
 * la función exige **las tres** —bandera global, vivienda armada y token— y
 * ninguna pantalla puede saltarse eso.
 */
export const TRA_ENVIO_ACTIVO = process.env.EXPO_PUBLIC_TRA_ACTIVO === "true";

/** Cómo está la conexión con la TRA de una vivienda. */
export interface EstadoTra {
  /** Si hay token guardado. **Nunca el token**: vive cifrado en el Vault. */
  tieneToken: boolean;
  /** Si los reportes salen de verdad al ministerio. */
  armado: boolean;
  /** Lo que falló en el último intento, si falló. */
  error: string | null;
}

/**
 * El estado de la TRA, para pintar la tarjeta del anfitrión.
 *
 * El token **no se devuelve nunca**, ni recortado: vive cifrado en el Vault y
 * lo único que la pantalla necesita saber es si lo hay. Por eso la pregunta va
 * por `tiene_token_tra`, que existe desde el 02/10/2026 para esto exactamente
 * y hasta hoy no la llamaba nadie.
 */
export async function obtenerEstadoTra(unidadId: string): Promise<EstadoTra> {
  const [token, fila] = await Promise.all([
    supabase.rpc("tiene_token_tra", { p_unidad_id: unidadId }),
    supabase
      .from("suscripcion_renta_corta")
      .select("tra_armado, tra_error")
      .eq("unidad_id", unidadId)
      .maybeSingle(),
  ]);

  if (token.error) throw token.error;
  if (fila.error) throw fila.error;

  return {
    tieneToken: Boolean(token.data),
    armado: Boolean(fila.data?.tra_armado),
    error: fila.data?.tra_error ?? null,
  };
}

/**
 * Guarda el token de la TRA, o lo quita.
 *
 * Una cadena vacía **desconecta**: suelta el secreto y desarma el reporte. No
 * arma nunca: eso es una decisión aparte, y por eso son dos funciones y no un
 * formulario con dos campos que se guardan juntos.
 */
export async function guardarTokenTra(
  unidadId: string,
  token: string,
): Promise<void> {
  /*
    Se manda la cadena recortada, vacia incluida: la funcion hace
    `nullif(btrim(coalesce(p_token,'')), '')`, asi que para ella vacio y nulo
    son lo mismo --desconectar-- y el tipo generado pide `string`.
  */
  const { error } = await supabase.rpc("guardar_token_tra", {
    p_unidad_id: unidadId,
    p_token: token.trim(),
  });
  if (error) throw error;
}

/**
 * Enciende o apaga los reportes de verdad al ministerio.
 *
 * Se escribe en la columna directamente porque la política de la tabla ya es
 * la correcta --`puede_configurar_alojamiento`-- y la regla que importa, que
 * no se arme sin token, vive en el disparador `tra_armado_necesita_token`: si
 * se intentara desde aquí sin token, la base lo rechaza y el motivo llega a la
 * pantalla.
 */
export async function armarTra(
  unidadId: string,
  armado: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("suscripcion_renta_corta")
    .update({ tra_armado: armado })
    .eq("unidad_id", unidadId);
  if (error) throw error;
}
