import { useEffect, useState } from "react";
import { Linking } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "@/stores";
import { useCondominioActivo, useUnidadActiva } from "@/shared/hooks";
import {
  abrirPeriodoPagado,
  activarSuscripcion as activarEnBase,
  advertencias,
  guardarAlojamiento,
  obtenerAlojamiento,
  obtenerLimites,
  obtenerPrecioDelPlan,
  obtenerSuscripcion,
} from "../services/suscripcion.repo";

export function useHuespedesTemporales() {
  const { addToast } = useUIStore();
  const queryClient = useQueryClient();
  const unidad = useUnidadActiva();
  const unidadId = unidad?.unidadId ?? "";
  const condominioId = useCondominioActivo() ?? "";

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
  const tieneSuscripcion = suscripcion?.estado === "activa";

  /** Lo que el edificio impone y lo que solo advierte (KT flujo 4.1 paso 5). */
  const { data: limites } = useQuery({
    queryKey: ["limites-condominio", unidadId],
    queryFn: () => obtenerLimites(unidadId),
    enabled: Boolean(unidadId),
  });

  /** Lo ya configurado. Antes el formulario nacia siempre con los mismos
   *  valores inventados —"Departamento de 2 habitaciones, 1 cama queen" y un
   *  RNT de ejemplo— porque no habia nada que leer. */
  const { data: guardado } = useQuery({
    queryKey: ["alojamiento", unidadId],
    queryFn: () => obtenerAlojamiento(unidadId),
    enabled: Boolean(unidadId) && tieneSuscripcion,
  });
  /*
    El formulario nacia con los datos de un alojamiento inventado —"Departamento
    de 2 habitaciones, 1 cama queen, 1 cama individual" y un RNT de ejemplo— que
    se guardaban tal cual si el anfitrion no los borraba. Es el mismo defecto
    que tenia el alta de visitas. Ahora nace vacio y se rellena con lo que hay.
  */
  const [minDias, setMinDias] = useState(1);
  const [maxHuespedes, setMaxHuespedes] = useState(1);
  const [politicaMascotas, setPoliticaMascotas] = useState("no-permitidas");
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
  const [icalLink, setIcalLink] = useState("");
  const [permiteVisitasHuespedes, setPermiteVisitasHuespedes] =
    useState("permitir-todos");
  const [legal, setLegal] = useState({ rnt: "" });
  const [cumplimiento, setCumplimiento] = useState({
    antirruido: false,
    noFumar: false,
    sensor: false,
  });
  const [ocultarNumero, setOcultarNumero] = useState(false);
  const [guestbook, setGuestbook] = useState({
    wifiName: "",
    wifiPassword: "",
    doorPassword: "",
    instructions: "",
    notes: "",
  });
  const [showPayment, setShowPayment] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);

  /** Una sola vez, cuando la consulta responde: despues manda el formulario. */
  const [rellenado, setRellenado] = useState(false);
  useEffect(() => {
    if (!guardado || rellenado) return;
    setRellenado(true);
    setMinDias(guardado.estanciaMinima);
    setMaxHuespedes(guardado.maxHuespedes);
    setPoliticaMascotas(guardado.permiteMascotas ? "permitidas" : "no-permitidas");
    setAptoNinos(guardado.aptoNinos);
    setDescripcion(guardado.descripcion);
    setEstacionamientosProp(guardado.estacionamientos);
    setPlataformas({
      airbnb: guardado.publicadoAirbnb,
      booking: guardado.publicadoBooking,
      otras: guardado.otrasPlataformas,
    });
    setPms({ activo: Boolean(guardado.pms), cual: guardado.pms });
    setIcalLink(guardado.icalUrl);
    setPermiteVisitasHuespedes(guardado.visitasDeHuespedes);
    setLegal({ rnt: guardado.rnt });
    setCumplimiento({
      antirruido: guardado.tieneAntirruido,
      noFumar: guardado.tieneNoFumar,
      sensor: guardado.tieneSensor,
    });
    setOcultarNumero(guardado.ocultarNumero);
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
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suscripcion", unidadId] });
      addToast("Suscripción activada", "success");
    },
    onError: (error) =>
      addToast(
        error instanceof Error && /no autoriza/i.test(error.message)
          ? "Este edificio no autoriza la renta corta en esta vivienda"
          : "No se pudo activar la suscripción",
        "error",
      ),
  });

  const guardado_ = useMutation({
    mutationFn: () =>
      guardarAlojamiento(unidadId, {
        descripcion,
        maxHuespedes,
        estacionamientos: estacionamientosProp,
        estanciaMinima: minDias,
        permiteMascotas: politicaMascotas === "permitidas",
        aptoNinos,
        visitasDeHuespedes: permiteVisitasHuespedes,
        rnt: legal.rnt,
        publicadoAirbnb: plataformas.airbnb,
        publicadoBooking: plataformas.booking,
        otrasPlataformas: plataformas.otras,
        pms: pms.activo ? pms.cual : "",
        icalUrl: icalLink,
        tieneAntirruido: cumplimiento.antirruido,
        tieneNoFumar: cumplimiento.noFumar,
        tieneSensor: cumplimiento.sensor,
        ocultarNumero,
        wifiNombre: guestbook.wifiName,
        wifiPassword: guestbook.wifiPassword,
        puertaPassword: guestbook.doorPassword,
        instrucciones: guestbook.instructions,
        notas: guestbook.notes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alojamiento", unidadId] });
      addToast("Configuración guardada", "success");
    },
    onError: () => addToast("No se pudo guardar la configuración", "error"),
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
    politicaMascotas,
    setPoliticaMascotas,
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
    icalLink,
    setIcalLink,
    permiteVisitasHuespedes,
    setPermiteVisitasHuespedes,
    legal,
    setLegal,
    cumplimiento,
    setCumplimiento,
    ocultarNumero,
    setOcultarNumero,
    guestbook,
    setGuestbook,
    showPayment,
    setShowPayment,
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
    guardarConfiguracion: guardado_.mutateAsync,
    guardando: guardado_.isPending,
  };
}
