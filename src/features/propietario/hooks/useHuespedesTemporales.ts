import { useState } from "react";
import {
  useSuscripcionStore,
  useUIStore,
  useUbicacionStore,
} from "@/stores";

export function useHuespedesTemporales() {
  const { addToast } = useUIStore();
  const ubicaciones = useUbicacionStore((state) => state.ubicaciones);
  const ubicacionActiva = ubicaciones.find((ubicacion) => ubicacion.favorito) || ubicaciones[0];
  const activarSuscripcion = useSuscripcionStore(
    (state) => state.activarSuscripcion,
  );
  const tieneSuscripcion = useSuscripcionStore(
    (state) =>
      !!ubicacionActiva && !!state.suscripciones[ubicacionActiva.id]?.activa,
  );
  const [minDias, setMinDias] = useState(2);
  const [maxHuespedes, setMaxHuespedes] = useState(4);
  const [politicaMascotas, setPoliticaMascotas] = useState("no-permitidas");
  const [aptoNinos, setAptoNinos] = useState(true);
  const [descripcion, setDescripcion] = useState(
    "Departamento de 2 habitaciones, 1 cama queen, 1 cama individual",
  );
  const [numHabitaciones, setNumHabitaciones] = useState(2);
  const [estacionamientosProp, setEstacionamientosProp] = useState(1);
  const [plataformas, setPlataformas] = useState({
    airbnb: false,
    booking: false,
    otras: "",
  });
  const [pms, setPms] = useState({ activo: false, cual: "" });
  const [icalLink, setIcalLink] = useState("");
  const [permiteVisitasHuespedes, setPermiteVisitasHuespedes] =
    useState("permitir-todos");
  const [legal, setLegal] = useState({ rnt: "RNT-12345" });
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
  const handleSubscribeAndPay = () => {
    if (
      !paymentForm.cardNumber ||
      !paymentForm.cardName ||
      !paymentForm.cardExpiry ||
      !paymentForm.cardCvv
    )
      return;
    setPaymentLoading(true);
    setTimeout(() => {
      setPaymentLoading(false);
      setShowPayment(false);
      if (ubicacionActiva) activarSuscripcion(ubicacionActiva.id);
      setPaymentForm({
        cardNumber: "",
        cardName: "",
        cardExpiry: "",
        cardCvv: "",
      });
      addToast("Suscripción activada", "success");
    }, 1500);
  };

  return {
    tieneSuscripcion,
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
  };
}
