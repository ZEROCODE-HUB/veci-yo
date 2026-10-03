import { supabase } from "@/shared/services/supabase";
import { claveJson } from "@/shared/types";
import type { Invitado, VisitaItem, Vehiculo } from "@/shared/types";
import type { Database } from "@/shared/types/database.types";
import { formatTime } from "@/shared/utils";

type TipoVisitaDB = Database["public"]["Enums"]["tipo_visita"];
type EstadoVisitaDB = Database["public"]["Enums"]["estado_visita"];
type TipoVehiculoDB = Database["public"]["Enums"]["tipo_vehiculo"];
type TipoDocumentoDB = Database["public"]["Enums"]["tipo_documento"];

/**
 * Traducción entre la base y la forma que consumen las pantallas.
 *
 * El tipo `VisitaItem` nació en el prototipo, sin base de datos: los ids eran
 * `Date.now()` y los invitados vivían en un array anónimo. Se conserva su forma
 * para no reescribir las pantallas de una vez, pero cada fila lleva ahora su
 * uuid real en `uuid` / `invitados[].uuid`, que es lo que usan las mutaciones.
 * Las operaciones por posición en el array quedaron eliminadas.
 */

/*
  `as const` para que Supabase deduzca el tipo de la respuesta a partir del
  literal: sin el, la constante es un `string` cualquiera y lo que vuelve no
  tiene forma, que era el motivo de que los mapeadores recibieran `any`. Con
  esto el tipo sale del esquema generado y no hay nada escrito a mano.
*/
/*
  `autorizacion_menor` apunta a `invitado` **dos veces** --el menor y el adulto
  que firma-- asi que la relacion se nombra con `!...fkey`. Sin eso PostgREST
  responde «more than one relationship was found» y **toda** la consulta falla:
  doce casos rojos en seis archivos, todos los que leen una visita.

  Y el comentario va aqui fuera: dentro del `select` viajaria como texto a
  PostgREST, y ademas los acentos graves cierran la cadena.
*/
const SELECT_VISITA = `
  id, tipo, estado, fecha_desde, fecha_hasta,
  hora_estimada_llegada, hora_estimada_salida, ingreso_en, salida_en,
  instruccion_documento, aviso, es_evento, nombre_evento,
  para_administracion, dias_laborales, profesion,
  anotaciones_ingreso, anotaciones_salida, codigo_acceso,
  precheckin_expira_en, precheckin_completado_en, precheckin_aviso,
  autorizada_por_nombre, anunciada_en, fotos_ingreso, fotos_salida, created_at,
  unidad:unidad_id ( id, codigo, torre:torre_id ( numero ),
                     miembros:membresia_unidad ( nombre, telefono, rol,
                                                 es_anfitrion_primario, activo,
                                                 datos_visibles ) ),
  invitados:invitado ( id, orden, nombre, tipo_documento, documento_numero,
                       fecha_nacimiento, es_menor, tiene_tutela,
                       responsable_id, parentesco,
                       autorizacion:autorizacion_menor!autorizacion_menor_invitado_id_fkey ( id ),
                       terminos_aceptados, terminos_excepcion, terminos_aprobado_por,
                       llego, ingreso_en, salida_en,
                       verificacion:verificacion_documento ( estado ),
                       antecedentes:verificacion_antecedentes ( resultado, proveedor, respuesta ),
                       reportes:reporte_tra ( movimiento ) ),
  vehiculos:vehiculo_visita ( id, placa, tipo )
` as const;

/**
 * La forma de lo que devuelve `SELECT_VISITA`, **deducida de la consulta**.
 *
 * Es un `select` de tres niveles --la visita, su unidad con los miembros, y los
 * invitados con su verificacion y sus reportes-- y escribir eso a mano seria una
 * segunda declaracion del esquema que se desincroniza sola. Se toma de la propia
 * consulta: lo que cambie en la base o en el `select` llega aqui sin tocar nada.
 *
 * Y la consulta es la que se usa de verdad en `obtenerVisitas`, no una escrita
 * aparte solo para sacarle el tipo: si fueran dos, podrian dejar de coincidir.
 */
const consultaDeVisitas = () => supabase.from("visita").select(SELECT_VISITA);
type FilaDeVisita = NonNullable<
  Awaited<ReturnType<typeof consultaDeVisitas>>["data"]
>[number];
type FilaDeInvitado = FilaDeVisita["invitados"][number];

/**
 * La base usa enums en minuscula y con guion bajo; la app heredo del prototipo
 * valores con guion medio y capitalizados. Se traduce en un solo lugar para
 * que las pantallas sigan funcionando sin tocarlas, y para que el dia que se
 * unifique el vocabulario haya que cambiar solo esto.
 */
const TIPO_DESDE_BASE: Record<TipoVisitaDB, VisitaItem["tipo"]> = {
  amigos: "amigos",
  temporal: "temporal",
  permanente: "permanente",
  huesped_temporal: "huesped-temporal",
};

const TIPO_HACIA_BASE: Record<VisitaItem["tipo"], TipoVisitaDB> = {
  amigos: "amigos",
  temporal: "temporal",
  permanente: "permanente",
  "huesped-temporal": "huesped_temporal",
};

/*
  `programada` se mostraba como "Pendiente", que suena a "pendiente de que
  alguien la apruebe" cuando lo que dice el dato es que la visita esta prevista
  y todavia no ha entrado nadie. Con la entrada y la salida ya registradas, la
  etiqueta seguia igual y no habia forma de entender que significaba.
*/
const ESTADO_DESDE_BASE: Record<EstadoVisitaDB, string> = {
  programada: "Programada",
  ingresada: "Ingresado",
  finalizada: "Finalizado",
  cancelada: "Cancelado",
};

export const ESTADO_HACIA_BASE: Record<string, EstadoVisitaDB> = {
  Programada: "programada",
  // Se mantiene el nombre viejo por si queda alguna pantalla que lo mande.
  Pendiente: "programada",
  Ingresado: "ingresada",
  Finalizado: "finalizada",
  Cancelado: "cancelada",
  Cancelada: "cancelada",
};

export function tipoHaciaBase(tipo: VisitaItem["tipo"]): TipoVisitaDB {
  return TIPO_HACIA_BASE[tipo];
}


/** Solo la hora, en `HH:mm`, a partir de un timestamp de la base. */
function horaDe(valor: string | null): string | undefined {
  if (!valor) return undefined;
  const d = new Date(valor);
  return formatTime(d);
}

/**
 * `dd/MM/yyyy` del **día en que ocurrió** una marca de tiempo.
 *
 * Hacía falta porque la tarjeta componía «Ingresó el {fechaDesde} a las
 * {horaIngreso}»: la fecha **prevista** de la visita con la hora **real** de
 * la entrada. Una visita programada para el 22 a la que alguien entra el 28
 * se leía como si hubiera entrado el 22.
 *
 * Va en la zona del dispositivo, igual que `horaDe`, para que la fecha y la
 * hora de la misma frase hablen del mismo reloj.
 */
function fechaDeMarca(valor: string | null): string | undefined {
  if (!valor) return undefined;
  const d = new Date(valor);
  return `${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1,
  ).padStart(2, "0")}/${d.getFullYear()}`;
}

/** `yyyy-MM-dd` de la base a `dd/MM/yyyy`, el formato canónico de la app. */
function fechaDe(valor: string | null): string | undefined {
  if (!valor) return undefined;
  const [anio, mes, dia] = valor.split("-");
  return `${dia}/${mes}/${anio}`;
}

/** `dd/MM/yyyy` de la app a `yyyy-MM-dd` para la base. */
export function fechaParaBase(valor?: string): string | null {
  if (!valor) return null;
  const partes = valor.split("/");
  if (partes.length !== 3) return null;
  const [dia, mes, anio] = partes;
  return `${anio}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
}

function mapearInvitado(
  fila: FilaDeInvitado,
  indice: number,
  visita?: FilaDeVisita,
): Invitado {
  const verificacion = Array.isArray(fila.verificacion)
    ? fila.verificacion[0]
    : fila.verificacion;

  /*
    El timeline de seis pasos que el KT da por decidido —"🔗 preregistro
    enviado → 📄 documentación completa → 📝 T&C aceptados → 🛡️ verificación
    pasada → 🟢 TRA/SIRE entrada → 🔴 TRA/SIRE salida"— **no se armaba nunca**:
    esta función no devolvía `timeline`, así que el componente recibía
    `undefined` y pintaba los seis pasos en pendiente para todo el mundo,
    siempre.

    Los seis salen de la base:
      · el preregistro existe porque existe la fila del invitado;
      · la documentación, de `verificacion_documento`;
      · los términos, de la columna que ya los guarda;
      · la verificación, del estado de ese documento;
      · y los dos últimos, de `reporte_tra`.
  */
  const reportes: string[] = (fila.reportes ?? []).map(
    (r) => r.movimiento,
  );
  const documentoCargado = Boolean(verificacion);

  /*
    El paso 🛡️ del timeline es la **verificación de antecedentes**, no la del
    documento: el KT dice que "corre automáticamente en este paso, sin
    intervención del Anfitrión ni visibilidad para el huésped". Se leía del
    documento, que es otra cosa —comparar la foto con la persona—.
  */
  const antecedentes = Array.isArray(fila.antecedentes)
    ? fila.antecedentes[0]
    : fila.antecedentes;
  const antecedentesAprobados = antecedentes?.resultado === "aprobada";
  const hallazgos =
    antecedentes?.respuesta && typeof antecedentes.respuesta === "object"
      ? Boolean(claveJson(antecedentes.respuesta, "hallazgos"))
      : undefined;

  return {
    timeline: {
      /*
        Estaba cableado a `true`: se pintaba en verde para todo el mundo,
        siempre, porque lo que miraba era que existiera la fila del invitado.
        No habia ningun enlace que enviar --`invitado` ni siquiera tenia
        columna de correo-- asi que el primer paso del precheckin mentia.

        Ahora sale de la estancia: el enlace existe cuando el anfitrion lo
        genera, y tiene fecha de caducidad.
      */
      preregistroEnviado: Boolean(visita?.precheckin_expira_en),
      precheckinCerrado: Boolean(visita?.precheckin_completado_en),
      documentacionCompleta: documentoCargado,
      terminosAceptados: fila.terminos_aceptados ?? false,
      // Lo mismo dentro del timeline: la pantalla compara con "anfitrion".
      terminosAprobadoPor: fila.terminos_aprobado_por ? "anfitrion" : null,
      verificacionPasada: antecedentesAprobados,
      verificacionAprobada: antecedentesAprobados,
      verificacionHallazgos: hallazgos ?? null,
      // Queda dicho cuando la verificación se hizo sin proveedor: es un dato
      // de la fila, no una bandera de configuración.
      verificacionSimulada: antecedentes?.proveedor === "simulado",
      trasideEntrada: reportes.includes("entrada"),
      trasideSalida: reportes.includes("salida"),
    },
    traSireReported: reportes.length > 0,
    uuid: fila.id,
    nombre: fila.nombre,
    llego: fila.llego ?? false,
    esMenor: fila.es_menor ?? false,
    tieneTutela: fila.tiene_tutela ?? false,
    /*
      Quien responde por el niño y si trae su permiso. Lo necesita la porteria
      en la puerta: hasta hoy un menor aparecia con una etiqueta «Menor de
      edad» y nada mas, asi que el guardia veia que era un niño pero no con
      quien venia.
    */
    responsableId: fila.responsable_id ?? undefined,
    parentesco: fila.parentesco ?? undefined,
    tieneAutorizacion: Array.isArray(fila.autorizacion)
      ? fila.autorizacion.length > 0
      : fila.autorizacion != null,
    terminosExcepcion: fila.terminos_excepcion ?? false,
    /*
      `terminos_aprobado_por` es un **uuid**: quién aprobó los términos en
      nombre del huésped. La pantalla lo comparaba con la cadena "anfitrion",
      así que el distintivo de "aprobado manualmente" no aparecía nunca.
      Vacío significa que los aceptó el propio huésped.
    */
    terminosAprobadoPor: fila.terminos_aprobado_por ? "anfitrion" : undefined,
    ciVerificado: verificacion?.estado === "verificado",
    horaIngreso: horaDe(fila.ingreso_en),
    horaSalida: horaDe(fila.salida_en),
    fechaIngreso: fechaDeMarca(fila.ingreso_en),
    fechaSalida: fechaDeMarca(fila.salida_en),
    tipoDocumento: fila.tipo_documento ?? undefined,
    documentoNumero: fila.documento_numero ?? undefined,
    fechaNacimiento: fila.fecha_nacimiento ?? undefined,
    orden: fila.orden ?? indice,
  };
}

/**
 * A quien llama la porteria por esta visita.
 *
 * `telefonoResidente` se rellenaba **solo al crear** la visita y nunca se leia
 * de la base, asi que en cuanto se recargaba la pantalla valia `undefined`: el
 * boton "Llamar / Anunciar" quedaba sin numero y no hacia nada al pulsarlo.
 * La decision vivia en la pantalla, no en el dato.
 *
 * El responsable sale de la propia vivienda, por orden: el anfitrion primario,
 * despues el propietario, y si no, quien la lidere. Se respeta
 * `datos_visibles`: quien pidio no aparecer no aparece, y entonces el boton se
 * oculta en vez de fingir que funciona.
 */
function contactoDeLaVivienda(unidad: FilaDeVisita["unidad"]): {
  nombre?: string;
  telefono?: string;
} {
  const miembros = (unidad?.miembros ?? []).filter(
    (m) => m.activo && m.datos_visibles && m.telefono,
  );
  if (miembros.length === 0) return {};

  const orden = ["propietario", "inquilino_lider", "residente"];
  const elegido =
    miembros.find((m) => m.es_anfitrion_primario) ??
    miembros
      .slice()
      .sort((a, b) => orden.indexOf(a.rol) - orden.indexOf(b.rol))[0];

  return {
    nombre: elegido?.nombre ?? undefined,
    telefono: elegido?.telefono ?? undefined,
  };
}

function mapearVisita(fila: FilaDeVisita): VisitaItem {
  const invitados: Invitado[] = (fila.invitados ?? [])
    .slice()
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
    .map((inv, i) => mapearInvitado(inv, i, fila));

  const vehiculos: Vehiculo[] = (fila.vehiculos ?? []).map((v) => ({
    uuid: v.id,
    placa: v.placa,
    tipo: v.tipo ?? undefined,
  }));

  return {
    uuid: fila.id,
    // Las pantallas todavía comparan ids numéricos en algunas listas; se deriva
    // uno estable a partir del uuid para no romperlas durante la migración.
    id: idNumericoDesdeUuid(fila.id),
    tipo: TIPO_DESDE_BASE[fila.tipo as TipoVisitaDB],
    estado: ESTADO_DESDE_BASE[fila.estado as EstadoVisitaDB] ?? fila.estado,
    nombre: invitados[0]?.nombre ?? "",
    ci: invitados[0]?.documentoNumero ?? "",
    invitados,
    vehiculos,
    tieneVehiculo: vehiculos.length > 0,
    esEvento: fila.es_evento ?? false,
    nombreEvento: fila.nombre_evento ?? undefined,
    fechaDesde: fechaDe(fila.fecha_desde),
    fechaHasta: fechaDe(fila.fecha_hasta),
    horaEstimadaLlegada: fila.hora_estimada_llegada?.slice(0, 5),
    horaEstimadaSalida: fila.hora_estimada_salida?.slice(0, 5),
    horaIngreso: horaDe(fila.ingreso_en),
    horaSalida: horaDe(fila.salida_en),
    fechaIngreso: fechaDeMarca(fila.ingreso_en),
    fechaSalida: fechaDeMarca(fila.salida_en),
    instruccionDocumento:
      fila.instruccion_documento === "no_verificar"
        ? "no_verificar"
        : "verificar",
    aviso:
      fila.aviso === "notificar_y_anunciar"
        ? "notificar_y_anunciar"
        : "solo_notificar",
    telefonoResidente: contactoDeLaVivienda(fila.unidad).telefono,
    nombreResidente: contactoDeLaVivienda(fila.unidad).nombre,
    torre: fila.unidad?.torre?.numero
      ? `Torre ${fila.unidad.torre.numero}`
      : undefined,
    depto: fila.unidad?.codigo ?? undefined,
    unidadId: fila.unidad?.id ?? undefined,
    paraAdministracion: fila.para_administracion ?? false,
    diasLaborales: fila.dias_laborales ?? undefined,
    profesion: fila.profesion ?? undefined,
    anotacionesIngreso: fila.anotaciones_ingreso ?? undefined,
    anotacionesSalida: fila.anotaciones_salida ?? undefined,
    codigoAcceso: fila.codigo_acceso ?? undefined,
    autorizadoPor: fila.autorizada_por_nombre ?? undefined,
    llego: invitados.some((i) => i.llego),
    instruccionesCumplidas: { llamoAnuncie: Boolean(fila.anunciada_en) },
    personas: invitados.length,
    fotosIngreso: fila.fotos_ingreso ?? [],
    fotosSalida: fila.fotos_salida ?? [],
  };
}

/** Las listas heredadas comparan por id numérico; se deriva del uuid. */
function idNumericoDesdeUuid(uuid: string): number {
  let hash = 0;
  for (let i = 0; i < uuid.length; i += 1) {
    hash = (hash * 31 + uuid.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

// ---------------------------------------------------------------------------
// Lectura
// ---------------------------------------------------------------------------

/**
 * Qué visitas se piden.
 *
 * `condominio` es el edificio entero, y es lo que necesitan la portería y la
 * administración. `unidad` son las de una vivienda: lo que le corresponde a
 * quien entró como propietario, inquilino líder o huésped.
 *
 * Existe por la regla 8, que esta consulta incumplía: pedía **todo lo que RLS
 * permitiera**. Marcela administra el condominio y además es propietaria de la
 * 301, así que al entrar como propietaria seguía viendo las visitas de las demás
 * viviendas --salió recorriendo la pantalla: en la lista de la 301 aparecía una
 * visita de la 205-- y la elección de rol quedaba en nada.
 *
 * RLS sigue siendo el techo: pedir `condominio` sin serlo no devuelve nada
 * ajeno. Lo que cambia es que la aplicación deja de pedirlo.
 */
export type AmbitoVisitas = "condominio" | "unidad";

export async function obtenerVisitas(params: {
  ambito: AmbitoVisitas;
  unidadIds: string[];
}): Promise<VisitaItem[]> {
  let consulta = consultaDeVisitas().is("deleted_at", null);

  if (params.ambito === "unidad") {
    /*
      Sin ninguna unidad no hay nada que pedir. Hace falta decirlo: `in` con una
      lista vacía es sintaxis inválida en PostgREST y responde con un error, no
      con cero filas.
    */
    if (params.unidadIds.length === 0) return [];
    consulta = consulta.in("unidad_id", params.unidadIds);
  }

  const { data, error } = await consulta.order("created_at", {
    ascending: false,
  });

  if (error) throw error;
  return (data ?? []).map(mapearVisita);
}

// ---------------------------------------------------------------------------
// Escritura
// ---------------------------------------------------------------------------

export interface NuevaVisita {
  condominioId: string;
  unidadId: string | null;
  tipo: TipoVisitaDB;
  estado?: EstadoVisitaDB;
  paraAdministracion?: boolean;
  fechaDesde?: string;
  fechaHasta?: string;
  horaEstimadaLlegada?: string;
  horaEstimadaSalida?: string;
  instruccionDocumento?: "verificar" | "no_verificar";
  aviso?: "solo_notificar" | "notificar_y_anunciar";
  esEvento?: boolean;
  nombreEvento?: string;
  diasLaborales?: string;
  profesion?: string;
  autorizadaPorNombre?: string;
  anotacionesIngreso?: string;
  invitados: Array<{
    nombre: string;
    /*
      El enum de la base, igual que el tipo del vehiculo de la linea siguiente.
      Era `string` con un `as any` al insertar, asi que se podia mandar la
      etiqueta que se lee en pantalla --«Pasaporte»-- a una columna que solo
      acepta la clave --«pasaporte»--, y Postgres lo rechazaba en ejecucion.
    */
    tipoDocumento?: TipoDocumentoDB;
    documentoNumero?: string;
    esMenor?: boolean;
  }>;
  vehiculos?: Array<{ placa: string; tipo?: TipoVehiculoDB }>;
}

export async function crearVisita(datos: NuevaVisita): Promise<string> {
  /*
    Una estancia de huesped sin ningun huesped no existe: no hay a quien
    mandarle el enlace, ni quien firme los terminos, ni a quien la porteria le
    mire el documento.

    Esto no esta aqui por rigor. El 02/10/2026 el preregistro fallo con un 409
    en **toda** reserva hecha desde la pantalla, y las seis pruebas que lo
    cubrian estaban en verde porque las seis creaban la visita con
    `invitados: []` --una forma que la pantalla no manda nunca--. Podian montar
    un estado imposible, asi que probaron ese.

    Cerrar la puerta aqui obliga a que las pruebas monten lo que la pantalla
    monta. Es mas barato que recordar hacerlo.
  */
  if (datos.tipo === "huesped_temporal" && !datos.invitados?.length) {
    throw new Error(
      "Una estancia de huesped necesita al menos a la persona que reserva.",
    );
  }

  const { data: visita, error } = await supabase
    .from("visita")
    .insert({
      condominio_id: datos.condominioId,
      unidad_id: datos.unidadId,
      tipo: datos.tipo,
      estado: datos.estado ?? "programada",
      para_administracion: datos.paraAdministracion ?? false,
      fecha_desde: fechaParaBase(datos.fechaDesde),
      fecha_hasta: fechaParaBase(datos.fechaHasta),
      hora_estimada_llegada: datos.horaEstimadaLlegada || null,
      hora_estimada_salida: datos.horaEstimadaSalida || null,
      instruccion_documento: datos.instruccionDocumento ?? "verificar",
      aviso: datos.aviso ?? "solo_notificar",
      es_evento: datos.esEvento ?? false,
      nombre_evento: datos.nombreEvento || null,
      dias_laborales: datos.diasLaborales || null,
      profesion: datos.profesion || null,
      autorizada_por_nombre: datos.autorizadaPorNombre || null,
      anotaciones_ingreso: datos.anotacionesIngreso || null,
    })
    .select("id")
    .single();

  if (error) throw error;

  if (datos.invitados.length > 0) {
    /*
      Si la visita se crea ya **ingresada** —la portería registrando a alguien
      que está entrando por la puerta— sus invitados están entrando con ella.

      Se creaban sin `llego`, y entonces la app se contradecía a sí misma: la
      visita decía "Ingresado" y `llego`, que se deriva de los invitados, decía
      que no había llegado nadie. Además dejaba sin hora de ingreso a cada
      persona, y hacía **imposible el reporte TRA de entrada**, que exige la
      llegada confirmada: justo el caso de un huésped al que la portería
      registra al llegar.

      Quien llega después se marca aparte, con `marcarLlegadaInvitado`.
    */
    const entrando = datos.estado === "ingresada";
    const ahora = new Date().toISOString();

    const { error: errorInvitados } = await supabase.from("invitado").insert(
      datos.invitados.map((inv, orden) => ({
        visita_id: visita.id,
        orden,
        nombre: inv.nombre,
        tipo_documento: inv.tipoDocumento ?? null,
        documento_numero: inv.documentoNumero || null,
        es_menor: inv.esMenor ?? false,
        /*
          El primero de la lista es quien reserva, y es el titular.

          Esto faltaba, y rompia el preregistro entero: `guardar_precheckin`
          busca la fila marcada, no encontraba ninguna, e insertaba otra con
          `orden = 0` --posicion que este insert ya habia ocupado-- contra un
          indice unico. El huesped veia «No pudimos guardar tus datos» y detras
          habia un 409.

          La funcion ahora tambien sabe adoptar al primero, para las reservas
          que ya existen. Esto es para que el dato nazca bien.
        */
        es_titular: orden === 0,
        llego: entrando,
        ingreso_en: entrando ? ahora : null,
      })),
    );
    if (errorInvitados) throw errorInvitados;
  }

  if (datos.vehiculos?.length) {
    const { error: errorVehiculos } = await supabase
      .from("vehiculo_visita")
      .insert(
        datos.vehiculos.map((v) => ({
          visita_id: visita.id,
          placa: v.placa,
          tipo: v.tipo ?? null,
        })),
      );
    if (errorVehiculos) throw errorVehiculos;
  }

  return visita.id;
}

export async function actualizarEstadoVisita(
  visitaUuid: string,
  estado: EstadoVisitaDB,
) {
  const { error } = await supabase
    .from("visita")
    .update({ estado })
    .eq("id", visitaUuid);
  if (error) throw error;
}

/** Borrado lógico: el historial de porteria no se pierde. */
export async function eliminarVisita(visitaUuid: string) {
  const { error } = await supabase
    .from("visita")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", visitaUuid);
  if (error) throw error;
}

export async function actualizarVisita(
  visitaUuid: string,
  patch: {
    anotacionesIngreso?: string;
    anotacionesSalida?: string;
    estado?: EstadoVisitaDB;
    autorizadaPorNombre?: string;
    fotosIngreso?: string[];
    fotosSalida?: string[];
  },
) {
  const { error } = await supabase
    .from("visita")
    .update({
      anotaciones_ingreso: patch.anotacionesIngreso,
      anotaciones_salida: patch.anotacionesSalida,
      estado: patch.estado,
      autorizada_por_nombre: patch.autorizadaPorNombre,
      fotos_ingreso: patch.fotosIngreso,
      fotos_salida: patch.fotosSalida,
    })
    .eq("id", visitaUuid);
  if (error) throw error;
}

/** Datos de un invitado que el anfitrion puede corregir antes del ingreso. */
export async function actualizarInvitado(
  invitadoUuid: string,
  patch: {
    nombre?: string;
    documentoNumero?: string;
    tipoDocumento?: TipoDocumentoDB;
    esMenor?: boolean;
  },
) {
  const { error } = await supabase
    .from("invitado")
    .update({
      nombre: patch.nombre,
      documento_numero: patch.documentoNumero,
      tipo_documento: patch.tipoDocumento,
      es_menor: patch.esMenor,
    })
    .eq("id", invitadoUuid);
  if (error) throw error;
}

/**
 * Sube una foto de porteria al bucket privado `visitas`.
 * La ruta empieza por el uuid de la visita: de ahi derivan las politicas de
 * Storage quien puede verla, que son los mismos que pueden ver la visita.
 */
export async function subirFotoVisita(
  visitaUuid: string,
  archivo: Blob,
  momento: "ingreso" | "salida",
): Promise<string> {
  const nombre = `${visitaUuid}/${momento}-${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from("visitas")
    .upload(nombre, archivo, { contentType: "image/jpeg", upsert: false });
  if (error) throw error;
  return nombre;
}

/**
 * Adjunta a una visita las fotos que acaba de elegir el guardia.
 *
 * Es la funcion que faltaba. `subirFotoVisita` y `urlFotoVisita` estaban
 * escritas desde el primer dia y **no las llamaba nadie**: la pantalla metia en
 * `fotos_ingreso` la URI que devuelve el selector de imagenes, que en web es un
 * `blob:` de la pestaña actual. Al recargar apuntaba a nada
 * --`net::ERR_FILE_NOT_FOUND` en la consola-- y la foto de un ingreso, que es
 * prueba de lo que paso en la porteria, se perdia entera.
 *
 * Aqui las fotos suben al bucket privado y en la fila queda la **ruta**, que es
 * lo unico que sobrevive a cerrar la aplicacion.
 */
export async function adjuntarFotosVisita(
  visitaUuid: string,
  uris: string[],
  momento: "ingreso" | "salida",
): Promise<string[]> {
  const rutas: string[] = [];
  for (const uri of uris) {
    // El selector devuelve una URI local --`blob:` en web, `file:` en el
    // telefono--; las dos se leen igual con `fetch`.
    const respuesta = await fetch(uri);
    const archivo = await respuesta.blob();
    rutas.push(await subirFotoVisita(visitaUuid, archivo, momento));
  }
  if (rutas.length === 0) return [];

  // Se relee antes de escribir: si dos guardias adjuntan a la vez, el segundo
  // no puede pisar lo del primero con la lista que tenia su pantalla.
  const { data: actual, error: errorLectura } = await supabase
    .from("visita")
    .select("fotos_ingreso, fotos_salida")
    .eq("id", visitaUuid)
    .single();
  if (errorLectura) throw errorLectura;

  const esIngreso = momento === "ingreso";
  const previas = (esIngreso ? actual.fotos_ingreso : actual.fotos_salida) ?? [];
  const todas = [...previas, ...rutas];

  // Las dos ramas se escriben por separado: una clave calculada deja el tipo
  // generado en `never` y el `update` no compila.
  const { error } = await supabase
    .from("visita")
    .update(esIngreso ? { fotos_ingreso: todas } : { fotos_salida: todas })
    .eq("id", visitaUuid);
  if (error) throw error;

  return todas;
}

/** URL temporal para mostrar una foto privada. */
export async function urlFotoVisita(ruta: string, segundos = 3600) {
  const { data, error } = await supabase.storage
    .from("visitas")
    .createSignedUrl(ruta, segundos);
  if (error) throw error;
  return data.signedUrl;
}

/** El guardia llamó al residente y anunció la visita. Queda con actor y hora. */
export async function registrarAnuncio(visitaUuid: string, anunciada: boolean) {
  const { data: sesion } = await supabase.auth.getSession();
  const { error } = await supabase
    .from("visita")
    .update({
      anunciada_en: anunciada ? new Date().toISOString() : null,
      anunciada_por: anunciada ? (sesion.session?.user.id ?? null) : null,
    })
    .eq("id", visitaUuid);
  if (error) throw error;
}

// --- Invitados: todo por uuid, nunca por posición en el array ---------------

export async function marcarLlegadaInvitado(
  invitadoUuid: string,
  llego: boolean,
) {
  const { error } = await supabase
    .from("invitado")
    .update({
      llego,
      ingreso_en: llego ? new Date().toISOString() : null,
    })
    .eq("id", invitadoUuid);
  if (error) throw error;
}

export async function registrarHoraInvitado(
  invitadoUuid: string,
  momento: "ingreso" | "salida",
  hora: string,
) {
  // La app maneja `HH:mm`; la base guarda el instante completo.
  let valor: string | null = null;
  if (hora) {
    const [h, m] = hora.split(":").map(Number);
    const d = new Date();
    d.setHours(h ?? 0, m ?? 0, 0, 0);
    valor = d.toISOString();
  }

  const cambios =
    momento === "ingreso"
      ? { ingreso_en: valor, llego: Boolean(valor) }
      : { salida_en: valor };

  const { error } = await supabase
    .from("invitado")
    .update(cambios)
    .eq("id", invitadoUuid);
  if (error) throw error;
}

/**
 * El guardia comparó el documento físico contra el del precheck-in.
 *
 * Deja constancia de **el resultado**, de quién lo miró y de cuándo.
 *
 * Escribía `verificado` a fuego: un solo botón y un solo desenlace. Y lo
 * llamativo es que la pantalla **sí** detectaba el desajuste --el guardia
 * teclea el número y sale «no coincide con el registrado»-- y ahí moría: sin
 * constancia, y la persona entraba igual. El módulo existe para cazar a un
 * impostor, lo cazaba, y no hacía nada con ello.
 *
 * Decidido con el cliente el 02/10/2026: si no coincide, no entra. Lo impide la
 * base --`no_entra_si_el_documento_no_coincide`-- porque marcar la llegada se
 * puede pedir por la API sin pasar por ninguna pantalla, y quién cruza la
 * puerta es un límite de seguridad física, no una comodidad de la interfaz.
 */
export async function verificarDocumentoInvitado(
  invitadoUuid: string,
  coincide: boolean,
) {
  const { data: sesion } = await supabase.auth.getSession();
  const { error } = await supabase.from("verificacion_documento").upsert(
    {
      invitado_id: invitadoUuid,
      estado: coincide ? "verificado" : "no_coincide",
      verificado_por: sesion.session?.user.id ?? null,
      verificado_en: new Date().toISOString(),
    },
    { onConflict: "invitado_id" },
  );
  if (error) throw error;
}

/**
 * Registra el reporte TRA/SIRE de un huésped.
 *
 * El KT es explícito en dos cosas que la base impone y esta función no
 * repite: solo se puede reportar la entrada **cuando la portería ha
 * confirmado el ingreso físico** —nunca antes, nunca automático— y hace falta
 * un RNT vigente al que referenciar el reporte.
 *
 * No envía nada a ninguna autoridad: no hay integración con TRA ni con SIRE, y
 * fingir que el reporte salió sería peor que no tenerlo. Se registra que el
 * anfitrión lo hizo, y el radicado se completa cuando lo haya.
 */
export async function reportarTraSire(params: {
  invitadoUuid: string;
  movimiento: "entrada" | "salida";
  observaciones?: string;
}): Promise<void> {
  const { error } = await supabase.from("reporte_tra").insert({
    invitado_id: params.invitadoUuid,
    movimiento: params.movimiento,
    observaciones: params.observaciones || null,
    // `rnt` lo pone la base desde el registro vigente del alojamiento: quien
    // reporta no lo teclea, y así no puede referenciar uno que no es.
    rnt: "",
  });
  if (error) throw error;
}

/**
 * Acepta los términos y condiciones de un huésped.
 *
 * Las columnas existían —`terminos_aceptados`, `terminos_excepcion`,
 * `terminos_aprobado_por`— y **nadie las escribía**: el "soporte en código"
 * que el KT da por hecho era leerlas. La excepción la marca el anfitrión,
 * que asume la responsabilidad legal, y por eso queda escrito quién fue.
 */
export async function aceptarTerminosHuesped(params: {
  invitadoUuid: string;
  porExcepcion?: boolean;
}): Promise<void> {
  const { error } = await supabase.rpc("aceptar_terminos_huesped", {
    p_invitado_id: params.invitadoUuid,
    p_excepcion: params.porExcepcion ?? false,
  });
  if (error) throw error;
}

/**
 * Ejecuta la verificación de antecedentes y descuenta del saldo.
 *
 * El proveedor sigue sin cerrarse (R-68). Mientras no lo haya, la fila queda
 * marcada como `simulado` en la propia base: una verificación simulada no se
 * confunde nunca con una real, ni hoy ni dentro de un año.
 */
export async function verificarAntecedentes(params: {
  invitadoUuid: string;
  conHallazgos?: boolean;
}): Promise<void> {
  const { error } = await supabase.rpc("verificar_antecedentes", {
    p_invitado_id: params.invitadoUuid,
    p_resultado: "aprobada",
    p_respuesta: params.conHallazgos
      ? { hallazgos: true }
      : { hallazgos: false },
  });
  if (error) throw error;
}

/** Compra un paquete de verificaciones para la vivienda. */
export async function comprarPaqueteVerificaciones(params: {
  unidadId: string;
  cantidad: number;
  /**
   * Referencia del pago que origina el paquete.
   *
   * El cobro ocurre **fuera de la aplicacion** --como la suscripcion, y
   * mientras no haya pasarela, simulado--, asi que esto es lo unico que
   * permite casar la fila con el pago. Hoy ninguna pantalla lo envia porque no
   * hay de donde sacarlo; cuando haya pasarela, entra por aqui.
   *
   * La funcion de la base lo aceptaba desde el primer dia y lo tiraba: ni la
   * tabla tenia la columna ni esta funcion lo mandaba.
   */
  referencia?: string;
}): Promise<void> {
  const { error } = await supabase.rpc("comprar_paquete_verificaciones", {
    p_unidad_id: params.unidadId,
    p_cantidad: params.cantidad,
    p_referencia: params.referencia ?? undefined,
  });
  if (error) throw error;
}

/** El horario de check-in que rige hoy en una vivienda, `HH:mm` o nulo. */
export interface HorarioCheckin {
  desde: string | null;
  hasta: string | null;
}

/**
 * El horario de check-in de una vivienda, para avisar a la portería.
 *
 * Lo elige la administración y hasta el 01/10/2026 no lo miraba nadie. Sale de
 * `reglas_de_estancia`, que es quien decide si a la estancia de hoy le toca el
 * juego corto o el largo: pedir las columnas a pelo obligaría a repetir aquí
 * esa elección, y ya se ha duplicado una vez en este proyecto.
 */
export async function horarioDeCheckin(
  unidadId: string,
): Promise<HorarioCheckin> {
  if (!unidadId) return { desde: null, hasta: null };

  const { data, error } = await supabase
    .rpc("reglas_de_estancia", { p_unidad_id: unidadId })
    .maybeSingle();

  if (error) throw error;

  return {
    desde: data?.checkin_desde ?? null,
    hasta: data?.checkin_hasta ?? null,
  };
}
