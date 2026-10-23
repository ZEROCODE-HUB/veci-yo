import { useEffect, useState } from "react";
import { mensajeDeError } from "@/shared/utils/error.util";
import { Linking } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "@/stores";
import { formatDateIso } from "@/shared/utils";
import {
  useCondominioActivo,
  useParametrosDeLaBase,
  useUnidadActiva,
} from "@/shared/hooks";
import {
  abrirPeriodoPagado,
  activarSuscripcion as activarEnBase,
  cancelarSuscripcion as cancelarEnBase,
  advertencias,
  guardarAlojamiento,
  armarTra,
  guardarRecordatorios,
  guardarVencimientoRnt,
  guardarTokenTra,
  obtenerEstadoTra,
  obtenerAlojamiento,
  obtenerRecordatorios,
  obtenerLimites,
  obtenerPrecioDelPlan,
  obtenerSuscripcion,
  obtenerCalendarios,
  guardarCalendario,
  type PlataformaCalendario,
  sincronizarCalendario,
  validarCodigoDescuento,
} from "../services/suscripcion.repo";
import { suscripcionVigente } from "../services/suscripcionVigente";
import { visitasPorDefecto } from "../services/visitasDeHuesped";

export function useHuespedesTemporales() {
  const { addToast } = useUIStore();
  const queryClient = useQueryClient();
  const unidad = useUnidadActiva();
  const unidadId = unidad?.unidadId ?? "";
  const condominioId = useCondominioActivo() ?? "";
  const parametros = useParametrosDeLaBase();

  /**
   * La suscripcion vivia en un store de Zustand que se perdia al recargar.
   * Ahora es la fila de `suscripcion_renta_corta`, que es lo que la base mira
   * para dejar o no dejar dar de alta un huesped.
   */
  const { data: suscripcion } = useQuery({
    queryKey: ["suscripcion", unidadId],
    queryFn: () => obtenerSuscripcion(unidadId),
    enabled: Boolean(unidadId),
  });
  /*
    No basta `estado === "activa"`: al darse de baja se respeta el mes pagado,
    asi que la suscripcion se queda activa con fecha de termino y deja de valer
    cuando esa fecha pasa. La regla vive en `suscripcionVigente`, con su prueba.
  */
  const tieneSuscripcion = suscripcionVigente(suscripcion ?? null);
  /** El dia en que deja de funcionar, si ya se pidio la baja. */
  const bajaProgramadaEn =
    suscripcion?.canceladaEn && tieneSuscripcion ? suscripcion.canceladaEn : null;

  /**
   * Cómo le fue a la última lectura del calendario del portal.
   *
   * Hace falta enseñarlo porque un calendario deja de funcionar **en silencio**:
   * el enlace sigue ahí guardado, la pantalla sigue igual, y las reservas dejan
   * de entrar. Lo único que lo delata es la fecha de la última lectura.
   */
  const { data: calendarios } = useQuery({
    queryKey: ["calendario", unidadId],
    queryFn: () => obtenerCalendarios(unidadId),
    enabled: Boolean(unidadId),
  });

  const sincronizar = useMutation({
    mutationFn: () => sincronizarCalendario(unidadId),
    onSuccess: (resultado) => {
      void queryClient.invalidateQueries({ queryKey: ["calendario", unidadId] });
      // Las estancias que acaban de entrar: la lista de visitas las tiene que
      // ver sin que el anfitrion recargue.
      void queryClient.invalidateQueries({ queryKey: ["visitas"] });

      if (resultado.nuevas === 0 && resultado.actualizadas === 0) {
        addToast("El calendario ya estaba al día", "success");
      } else {
        const partes = [
          resultado.nuevas > 0 ? `${resultado.nuevas} reserva(s) nueva(s)` : null,
          resultado.actualizadas > 0
            ? `${resultado.actualizadas} con fechas corregidas`
            : null,
        ].filter(Boolean);
        addToast(partes.join(" y "), "success");
      }
    },
    onError: (error) =>
      addToast(mensajeDeError(error, "No se pudo leer el calendario"), "error"),
  });

  const calendario = {
    /** Lo guardado de cada plataforma, si tiene calendario conectado. */
    de: (p: PlataformaCalendario) => calendarios?.find((c) => c.plataforma === p),
    sincronizando: sincronizar.isPending,
    /* Sin ningún enlace guardado no hay nada que leer, y el botón lo dice. */
    conectado: Boolean(calendarios?.length),
  };

  /** Lo que el edificio impone y lo que solo advierte (KT flujo 4.1 paso 5). */
  const { data: limites } = useQuery({
    queryKey: ["limites-condominio", unidadId],
    queryFn: () => obtenerLimites(unidadId),
    enabled: Boolean(unidadId),
  });

  /** Lo ya configurado. Antes el formulario nacia siempre con los mismos
   *  valores inventados —"Departamento de 2 habitaciones, 1 cama queen" y un
   *  RNT de ejemplo— porque no habia nada que leer. */
  const {
    data: guardado,
    isError: falloLaLectura,
    isLoading: leyendoLoGuardado,
  } = useQuery({
    queryKey: ["alojamiento", unidadId],
    queryFn: () => obtenerAlojamiento(unidadId),
    enabled: Boolean(unidadId) && tieneSuscripcion,
  });

  /*
    Consulta aparte, como su guardado: el `select` del alojamiento ya rozaba el
    tope de longitud que admite `npm run lineas`, y partirlo rompe el tipado.
  */
  const { data: recordatoriosGuardados } = useQuery({
    queryKey: ["recordatorios-precheckin", unidadId],
    queryFn: () =>
      obtenerRecordatorios(
        unidadId,
        parametros.lista<number>("preregistro_recordatorio_dias_por_defecto"),
      ),
    // Espera a los parámetros: sin nada guardado, los días son los suyos.
    enabled: Boolean(unidadId) && tieneSuscripcion && parametros.listo,
  });

  /*
    La TRA. Va por su cuenta --no dentro del formulario grande-- por lo mismo
    que los recordatorios y por una razon mas: el token es un secreto y armar
    el reporte es una decision legal. Ninguna de las dos puede viajar dentro
    de un «Guardar» que tambien escribe la descripcion del piso y las fotos.
  */
  const { data: estadoTra } = useQuery({
    queryKey: ["tra", unidadId],
    queryFn: () => obtenerEstadoTra(unidadId),
    enabled: Boolean(unidadId) && tieneSuscripcion,
  });

  const refrescarTra = () =>
    void queryClient.invalidateQueries({ queryKey: ["tra", unidadId] });

  const guardarToken = useMutation({
    mutationFn: (token: string) => guardarTokenTra(unidadId, token),
    onSuccess: (_resultado, token) => {
      refrescarTra();
      addToast(
        token.trim()
          ? "Token guardado"
          : "Token borrado. Los reportes a la TRA quedan apagados.",
        "success",
      );
    },
    onError: (error) =>
      addToast(mensajeDeError(error, "No se pudo guardar el token"), "error"),
  });

  const armarReportes = useMutation({
    mutationFn: (armado: boolean) => armarTra(unidadId, armado),
    onSuccess: (_resultado, armado) => {
      refrescarTra();
      addToast(
        armado
          ? "Los reportes a la TRA están activos"
          : "Los reportes a la TRA quedan apagados",
        armado ? "success" : "info",
      );
    },
    /*
      El motivo llega entero: si la base lo rechaza es porque no hay token, y
      eso tiene arreglo. Un «no se pudo» generico convertiria un problema con
      solucion en una pared --ya paso con el 409 del precheckin--.
    */
    onError: (error) =>
      addToast(
        mensajeDeError(error, "No se pudo cambiar el reporte a la TRA"),
        "error",
      ),
  });
  /*
    El formulario nacia con los datos de un alojamiento inventado —"Departamento
    de 2 habitaciones, 1 cama queen, 1 cama individual" y un RNT de ejemplo— que
    se guardaban tal cual si el anfitrion no los borraba. Es el mismo defecto
    que tenia el alta de visitas. Ahora nace vacio y se rellena con lo que hay.
  */
  const [minDias, setMinDias] = useState(1);
  // 0 es el campo vacío: sin dato la capacidad está «sin fijar» y el guardado
  // pide escribirla (antes nacía en 1 sin que nadie lo dijera).
  const [maxHuespedes, setMaxHuespedes] = useState(0);
  const [permiteMascotas, setPermiteMascotas] = useState(false);
  const [aptoNinos, setAptoNinos] = useState(true);
  const [descripcion, setDescripcion] = useState("");
  const [numHabitaciones, setNumHabitaciones] = useState(0);
  const [estacionamientosProp, setEstacionamientosProp] = useState(0);
  const [plataformas, setPlataformas] = useState({
    airbnb: false,
    booking: false,
    otras: "",
  });
  const [pms, setPms] = useState({ activo: false, cual: "" });
  /*
    Un enlace por plataforma (21/10/2026). Antes había uno solo, el de Airbnb,
    y quien publicaba también en Booking no tenía dónde poner el suyo.
  */
  const [enlaces, setEnlaces] = useState<Record<PlataformaCalendario, string>>({
    airbnb: "",
    booking: "",
    otra: "",
  });
  const [enlacesCargados, setEnlacesCargados] = useState(false);
  useEffect(() => {
    if (!calendarios || enlacesCargados) return;
    const de = (p: PlataformaCalendario) =>
      calendarios.find((c) => c.plataforma === p)?.url ?? "";
    setEnlaces({ airbnb: de("airbnb"), booking: de("booking"), otra: de("otra") });
    setEnlacesCargados(true);
  }, [calendarios, enlacesCargados]);
  /*
    El horario de entrada de esta vivienda. Las columnas existian desde el
    principio, el huesped ya las veia en «Mi alojamiento» y el edificio ya las
    limitaba —y **no habia pantalla donde ponerlas**.
  */
  const [checkin, setCheckin] = useState({ desde: "", hasta: "", todoElDia: false });
  /*
    A quién avisar cuando un huésped no termina su preregistro, y con cuánta
    antelación. Parametrizable por decisión del cliente (03/10/2026). Los días
    llegan con lo guardado (o con `preregistro_recordatorio_dias_por_defecto`
    si no hay nada): hasta entonces la lista va vacía y la pantalla no la pinta.
  */
  const [recordatorios, setRecordatorios] = useState({
    alHuesped: true,
    alAnfitrion: true,
    dias: [] as number[],
  });
  /*
    `null` mientras el anfitrión no haya dicho nada: entonces vale la opción
    del parámetro `visitas_de_huespedes_por_defecto`. Sin parámetros todavía
    queda vacío, que al guardar es «no toques la columna».
  */
  const [visitasElegidas, setPermiteVisitasHuespedes] = useState<string | null>(
    null,
  );
  const permiteVisitasHuespedes =
    visitasElegidas ??
    (parametros.listo
      ? visitasPorDefecto(parametros.texto("visitas_de_huespedes_por_defecto"))
      : "");
  const [legal, setLegal] = useState({ rnt: "", venceEn: "" });
  // Lo leído, para no escribir el vencimiento si nadie lo tocó.
  const [venceGuardado, setVenceGuardado] = useState("");
  const [cumplimiento, setCumplimiento] = useState({
    antirruido: false,
    noFumar: false,
    sensor: false,
  });
  const [ocultarNumero, setOcultarNumero] = useState(false);
  const [ocultarContacto, setOcultarContacto] = useState(false);
  const [guestbook, setGuestbook] = useState({
    wifiName: "",
    wifiPassword: "",
    doorPassword: "",
    instructions: "",
    notes: "",
  });
  const [showPayment, setShowPayment] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  // El código de descuento y lo que descuenta, ya validado (QA 23/10/2026).
  const [codigoDescuento, setCodigoDescuento] = useState("");
  const [descuento, setDescuento] = useState<{ codigo: string; porcentaje: number } | null>(null);
  const [aplicandoCodigo, setAplicandoCodigo] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);

  /*
    Lo mismo para los recordatorios, y con su propio centinela: las dos
    consultas no responden a la vez, y un solo `rellenado` dejaria a la
    segunda sin aplicar.
  */
  const [rellenadoAvisos, setRellenadoAvisos] = useState(false);
  useEffect(() => {
    if (!recordatoriosGuardados || rellenadoAvisos) return;
    setRecordatorios(recordatoriosGuardados);
    setRellenadoAvisos(true);
  }, [recordatoriosGuardados, rellenadoAvisos]);

  /** Una sola vez, cuando la consulta responde: despues manda el formulario. */
  const [rellenado, setRellenado] = useState(false);
  useEffect(() => {
    if (!guardado || rellenado) return;
    setRellenado(true);
    setMinDias(guardado.estanciaMinima);
    setMaxHuespedes(guardado.maxHuespedes ?? 0);
    setPermiteMascotas(guardado.permiteMascotas);
    setAptoNinos(guardado.aptoNinos);
    setDescripcion(guardado.descripcion);
    setNumHabitaciones(guardado.numHabitaciones);
    setEstacionamientosProp(guardado.estacionamientos);
    setPlataformas({
      airbnb: guardado.publicadoAirbnb,
      booking: guardado.publicadoBooking,
      otras: guardado.otrasPlataformas,
    });
    setPms({ activo: Boolean(guardado.pms), cual: guardado.pms });
    setCheckin({
      desde: guardado.checkinDesde,
      hasta: guardado.checkinHasta,
      todoElDia: guardado.checkin24h,
    });

    setPermiteVisitasHuespedes(guardado.visitasDeHuespedes);
    setLegal({ rnt: guardado.rnt, venceEn: guardado.rntVenceEn });
    setVenceGuardado(guardado.rntVenceEn);
    setCumplimiento({
      antirruido: guardado.tieneAntirruido,
      noFumar: guardado.tieneNoFumar,
      sensor: guardado.tieneSensor,
    });
    setOcultarNumero(guardado.ocultarNumero);
    setOcultarContacto(guardado.ocultarContacto);
    setGuestbook({
      wifiName: guardado.wifiNombre,
      // Las contrasenas no se releen; el campo vacio no las borra.
      wifiPassword: "",
      doorPassword: "",
      instructions: guardado.instrucciones,
      notes: guardado.notas,
    });
  }, [guardado, rellenado]);

  const togglePlataforma = (key: string) =>
    setPlataformas((prev) => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev],
    }));
  const alta = useMutation({
    mutationFn: async (referenciaPago: string | null) => {
      // El código se comprueba antes de activar: si no vale, no se activa nada.
      if (descuento) await validarCodigoDescuento(descuento.codigo);
      await activarEnBase(unidadId);

      // El período se abre después de activar, con el id de la suscripción que
      // ya existe. Si falla, la suscripción queda activa: se avisa, y el
      // período se puede reabrir; lo contrario —cobrar y no activar— sería
      // peor.
      const suscripcion = await obtenerSuscripcion(unidadId);
      if (suscripcion) {
        await abrirPeriodoPagado({
          suscripcionId: suscripcion.id,
          verificacionesBase: suscripcion.verificacionesBase,
          periodicidad: precio?.periodicidad ?? "mensual",
          referenciaPago,
          codigoDescuento: descuento?.codigo ?? null,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suscripcion", unidadId] });
      addToast("Suscripción activada", "success");
    },
    /*
      El motivo se sacaba con `error instanceof Error`, y lo que lanza el
      cliente de Supabase es un objeto plano: la condicion era falsa siempre,
      asi que la frase util --«este edificio no autoriza la renta corta»-- no
      llegaba a salir nunca y la persona leia el respaldo generico. Justo en el
      caso que explica por que no se puede.
    */
    onError: (error) =>
      addToast(
        /no autoriza/i.test(mensajeDeError(error, ""))
          ? "Este edificio no autoriza la renta corta en esta vivienda"
          : "No se pudo activar la suscripción",
        "error",
      ),
  });

  /**
   * Darse de baja de la renta corta.
   *
   * `cancelarSuscripcion` llevaba escrita en el repositorio sin que ninguna
   * pantalla la llamara: se podia activar el servicio y no habia forma de
   * dejarlo, ni aqui ni en la web. Punto 64 de `REVISAR-A-OJO.md`.
   *
   * Va en la aplicacion y no en la web --donde si esta el pago-- porque el
   * motivo de sacar el cobro fuera es la comision de las tiendas, y **nadie
   * cobra por cancelar**. Obligar a salir a la web para darse de baja es
   * friccion sin ninguna ventaja.
   *
   * Lo que **no** hace: decidir hasta cuando sigue el servicio. Se marca la
   * baja con su fecha y ya; si tiene que durar hasta el final del periodo
   * pagado, eso es una regla de negocio que hace falta decidir --esta anotada--.
   */
  const baja = useMutation({
    mutationFn: () => cancelarEnBase(unidadId),
    onSuccess: ({ terminaEn, inmediata }) => {
      queryClient.invalidateQueries({ queryKey: ["suscripcion", unidadId] });
      // Lo que importa saber es hasta cuándo sigue funcionando.
      addToast(
        inmediata
          ? "Renta corta dada de baja"
          : `Dada de baja. Sigue funcionando hasta el ${formatDateIso(terminaEn)}`,
        "success",
      );
    },
    onError: (error) =>
      addToast(mensajeDeError(error, "No se pudo dar de baja"), "error"),
  });

  const guardado_ = useMutation({
    mutationFn: async () => {
      /*
        Sin lo guardado delante no se guarda. Si la lectura falló --o todavía
        no llegó-- el formulario está en blanco, y guardar así **pisaba** la
        descripción, el RNT, las plataformas y el calendario con cadenas
        vacías (13/10/2026).
      */
      if (falloLaLectura || leyendoLoGuardado) {
        throw new Error(
          "No pudimos leer lo que ya tenías guardado. Recarga la pantalla antes de guardar, para no perderlo.",
        );
      }
      // Lo que la pantalla dejaba pasar y la base rechazaba sin explicar.
      if (pms.activo && !pms.cual.trim()) {
        throw new Error("Escribe con qué PMS quieres integrar tu alojamiento.");
      }
      for (const p of ["airbnb", "booking", "otra"] as const) {
        const enlace = enlaces[p].trim();
        if (enlace && !/^https?:\/\/\S+\.\S+/.test(enlace)) {
          throw new Error(
            "El enlace del calendario tiene que empezar por http:// o https://.",
          );
        }
      }
      if (minDias < 1 || maxHuespedes < 1) {
        throw new Error("El mínimo de días y la capacidad son al menos 1.");
      }
      if (
        !checkin.todoElDia &&
        checkin.desde &&
        checkin.hasta &&
        checkin.desde >= checkin.hasta
      ) {
        throw new Error("El horario de entrada termina antes de empezar.");
      }
      await guardarAlojamiento(unidadId, {
        descripcion,
        numHabitaciones,
        maxHuespedes,
        estacionamientos: estacionamientosProp,
        estanciaMinima: minDias,
        permiteMascotas,
        aptoNinos,
        visitasDeHuespedes: permiteVisitasHuespedes,
        rnt: legal.rnt,
        publicadoAirbnb: plataformas.airbnb,
        publicadoBooking: plataformas.booking,
        otrasPlataformas: plataformas.otras,
        pms: pms.activo ? pms.cual.trim() : "",
        checkinDesde: checkin.todoElDia ? "" : checkin.desde,
        checkinHasta: checkin.todoElDia ? "" : checkin.hasta,
        checkin24h: checkin.todoElDia,
        tieneAntirruido: cumplimiento.antirruido,
        tieneNoFumar: cumplimiento.noFumar,
        tieneSensor: cumplimiento.sensor,
        ocultarNumero,
        ocultarContacto,
        wifiNombre: guestbook.wifiName,
        wifiPassword: guestbook.wifiPassword,
        puertaPassword: guestbook.doorPassword,
        instrucciones: guestbook.instructions,
        notas: guestbook.notes,
      });
      /*
        Después y no dentro: son dos RPC porque `guardar_alojamiento` toca el
        Vault y ya se rompió entera una vez. Si esta segunda falla, el usuario
        ve el error y lo del alojamiento ya quedó guardado, que es mejor que
        perderlo todo por el bloque más pequeño.
      */
      // Solo si ya llegó lo guardado: antes la lista de días va vacía y
      // escribirla borraría los avisos que la vivienda tuviera.
      if (rellenadoAvisos) await guardarRecordatorios(unidadId, recordatorios);
      // Los calendarios que cambiaron, cada uno en su plataforma.
      if (enlacesCargados) {
        for (const p of ["airbnb", "booking", "otra"] as const) {
          const antes = calendarios?.find((c) => c.plataforma === p)?.url ?? "";
          if (enlaces[p].trim() !== antes) await guardarCalendario(unidadId, p, enlaces[p]);
        }
      }
      if (legal.venceEn !== venceGuardado) {
        await guardarVencimientoRnt(unidadId, legal.venceEn || null);
        setVenceGuardado(legal.venceEn);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alojamiento", unidadId] });
      queryClient.invalidateQueries({ queryKey: ["recordatorios-precheckin", unidadId] });
      queryClient.invalidateQueries({ queryKey: ["calendario", unidadId] });
      addToast("Configuración guardada", "success");
    },
    // El motivo, que la base sabe decir: se tiraba y quedaba «no se pudo».
    onError: (error) =>
      addToast(
        mensajeDeError(error, "No se pudo guardar la configuración"),
        "error",
      ),
  });

  /**
   * Cuánto cuesta y en qué moneda. Estaba escrito a mano en la pantalla.
   */
  const { data: precio = null } = useQuery({
    queryKey: ["precio-plan", condominioId],
    queryFn: () => obtenerPrecioDelPlan(condominioId),
    enabled: Boolean(condominioId),
  });

  /**
   * El pago se hace fuera de la aplicación.
   *
   * Decisión del KT del 17/07/2026: "el cobro de la suscripción se hace fuera
   * de la app (web), no in-app", para evitar la comisión del 15% que Apple y
   * Google cobran sobre compras in-app de productos digitales. La pantalla
   * tenía un formulario de tarjeta dentro de la aplicación, que es justo lo
   * que esa decisión descarta.
   *
   * La URL sale del entorno (regla 9). Mientras no haya pasarela contratada
   * está vacía, y entonces la pantalla ofrece el paso simulado, etiquetado
   * como tal, para poder recorrer el flujo en pruebas.
   */
  const urlDePago = process.env.EXPO_PUBLIC_URL_PAGO_SUSCRIPCION ?? "";
  const pagoSimulado = !urlDePago;

  const irAlPago = async () => {
    try {
      await Linking.openURL(urlDePago);
    } catch {
      addToast("No se pudo abrir la página de pago", "error");
    }
  };

  /**
   * Activa la suscripción y abre el período con lo que se cobró.
   *
   * `periodo_suscripcion` existía y estaba **vacía**: la base guardaba que una
   * vivienda estaba suscrita y nada sobre el cobro. El importe no se manda
   * desde aquí; lo sella un disparador desde el precio vigente.
   */
  const confirmarPago = (referenciaPago: string | null, onSuccess?: () => void) => {
    setPaymentLoading(true);
    alta.mutate(referenciaPago, {
      onSettled: () => {
        setPaymentLoading(false);
        setShowPayment(false);
      },
      onSuccess: () => onSuccess?.(),
    });
  };

  return {
    tieneSuscripcion,
    darDeBaja: baja.mutate,
    dandoDeBaja: baja.isPending,
    bajaProgramadaEn,
    /** Sin esto el edificio no deja dar de alta la suscripcion. */
    autorizada: limites?.permiteRentaCorta ?? true,
    limites: limites ?? null,
    /** Frases que la pantalla pinta. El KT manda advertir, no bloquear. */
    advertenciasDeLimite: advertencias(limites ?? null, {
      estanciaMinima: minDias,
      capacidad: maxHuespedes,
    }),
    minDias,
    setMinDias,
    maxHuespedes,
    setMaxHuespedes,
    permiteMascotas,
    setPermiteMascotas,
    aptoNinos,
    setAptoNinos,
    descripcion,
    setDescripcion,
    numHabitaciones,
    setNumHabitaciones,
    estacionamientosProp,
    setEstacionamientosProp,
    plataformas,
    setPlataformas,
    pms,
    setPms,
    enlaces,
    setEnlaces,
    checkin,
    setCheckin,
    recordatorios,
    setRecordatorios,
    calendario,
    sincronizar,
    permiteVisitasHuespedes,
    setPermiteVisitasHuespedes,
    /** La TRA: lo que hay puesto y las dos acciones que lo cambian. */
    estadoTra: estadoTra ?? { tieneToken: false, armado: false, error: null },
    guardarTokenTra: (token: string) => guardarToken.mutate(token),
    guardandoTokenTra: guardarToken.isPending,
    armarTra: (armado: boolean) => armarReportes.mutate(armado),
    armandoTra: armarReportes.isPending,
    legal,
    setLegal,
    cumplimiento,
    setCumplimiento,
    ocultarNumero,
    setOcultarNumero,
    ocultarContacto,
    setOcultarContacto,
    guestbook,
    setGuestbook,
    showPayment,
    setShowPayment,
    codigoDescuento,
    setCodigoDescuento: (codigo: string) => {
      setCodigoDescuento(codigo);
      setDescuento(null);
    },
    descuento,
    aplicandoCodigo,
    aplicarCodigo: async () => {
      if (!codigoDescuento.trim()) return;
      setAplicandoCodigo(true);
      try {
        const porcentaje = await validarCodigoDescuento(codigoDescuento.trim());
        setDescuento({ codigo: codigoDescuento.trim().toUpperCase(), porcentaje });
      } catch (e) {
        setDescuento(null);
        addToast(mensajeDeError(e, "Ese código no vale"), "error");
      } finally {
        setAplicandoCodigo(false);
      }
    },
    paymentLoading,
    showWarningModal,
    setShowWarningModal,
    togglePlataforma,
    /** Lo que se va a cobrar, con su moneda. Estaba escrito en la pantalla. */
    precio,
    /** Vacío mientras no haya pasarela contratada. */
    urlDePago,
    pagoSimulado,
    irAlPago,
    confirmarPago,
    /** Escribe de verdad. Antes solo mostraba un toast de exito. */
    /** Lo guardado no se pudo leer: se dice, y no se deja guardar encima. */
    falloLaLectura,
    guardarConfiguracion: guardado_.mutateAsync,
    guardando: guardado_.isPending,
  };
}
