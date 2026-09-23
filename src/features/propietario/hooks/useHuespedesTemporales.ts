import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "@/stores";
import { useUnidadActiva } from "@/shared/hooks";
import {
  activarSuscripcion as activarEnBase,
  advertencias,
  guardarAlojamiento,
  obtenerAlojamiento,
  obtenerLimites,
  obtenerSuscripcion,
} from "../services/suscripcion.repo";

export function useHuespedesTemporales() {
  const { addToast } = useUIStore();
  const queryClient = useQueryClient();
  const unidad = useUnidadActiva();
  const unidadId = unidad?.unidadId ?? "";

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
  const [paymentForm, setPaymentForm] = useState({
    cardNumber: "",
    cardName: "",
    cardExpiry: "",
    cardCvv: "",
  });
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
  const handleCardNumberInput = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 16);
    setPaymentForm((prev) => ({
      ...prev,
      cardNumber: digits.replace(/(\d{4})(?=\d)/g, "$1 "),
    }));
  };
  const handleCardExpiryInput = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    setPaymentForm((prev) => ({
      ...prev,
      cardExpiry:
        digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits,
    }));
  };
  const alta = useMutation({
    mutationFn: () => activarEnBase(unidadId),
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

  const handleSubscribeAndPay = (onSuccess?: () => void) => {
    if (
      !paymentForm.cardNumber ||
      !paymentForm.cardName ||
      !paymentForm.cardExpiry ||
      !paymentForm.cardCvv
    )
      return;
    setPaymentLoading(true);
    alta.mutate(undefined, {
      onSettled: () => {
        setPaymentLoading(false);
        setShowPayment(false);
        setPaymentForm({
          cardNumber: "",
          cardName: "",
          cardExpiry: "",
          cardCvv: "",
        });
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
    paymentForm,
    setPaymentForm,
    paymentLoading,
    showWarningModal,
    setShowWarningModal,
    togglePlataforma,
    handleCardNumberInput,
    handleCardExpiryInput,
    handleSubscribeAndPay,
    /** Escribe de verdad. Antes solo mostraba un toast de exito. */
    guardarConfiguracion: guardado_.mutateAsync,
    guardando: guardado_.isPending,
  };
}
