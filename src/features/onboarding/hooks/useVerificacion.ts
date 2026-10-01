import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { completarVerificacionRequest } from "../services";
import type { ConfiguracionDocumento, TerminosVerificacion } from "../types";

export const DOC_CONFIG: Record<string, ConfiguracionDocumento> = {
  Cédula: {
    frente: "Foto frontal de la cédula",
    dorso: "Foto trasera de la cédula",
  },
  DNI: { frente: "Foto frontal del DNI", dorso: "Foto trasera del DNI" },
  Pasaporte: { frente: "Foto frontal de su pasaporte" },
};

export const TERMINOS_INICIALES: TerminosVerificacion = {
  datos: {
    checked: false,
    label:
      "Acepto términos y condiciones y autorizo el tratamiento de mis datos personales.",
  },
  convivencia: {
    checked: false,
    label: "Acepto términos y condiciones del manual de convivencia.",
  },
  responsabilidad: {
    checked: false,
    label:
      "Acepto términos y condiciones de descarga de responsabilidad civil.",
  },
};

export function useVerificacion() {
  const { usuario, completarVerificacion } = useAuthStore();
  const docConfig =
    DOC_CONFIG[usuario?.tipoDocumento || "Cédula"] || DOC_CONFIG.Cédula;
  const tieneDorso = !!docConfig.dorso;
  const stepIds = useMemo(
    () => (tieneDorso ? ["frente", "dorso", "rostro"] : ["frente", "rostro"]),
    [tieneDorso],
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [fotoFrente, setFotoFrente] = useState<string | null>(null);
  const [fotoDorso, setFotoDorso] = useState<string | null>(null);
  const [fotoRostro, setFotoRostro] = useState<string | null>(null);
  const [terminos, setTerminos] =
    useState<TerminosVerificacion>(TERMINOS_INICIALES);
  const [showExito, setShowExito] = useState(false);
  const mutation = useMutation({
    mutationFn: completarVerificacionRequest,
    onSuccess: () => {
      completarVerificacion();
      setShowExito(true);
    },
  });
  const stepId = stepIds[stepIndex];
  const isLastStep = stepIndex === stepIds.length - 1;

  const toggleTermino = (key: string) => (checked: boolean) => {
    setTerminos((prev) => ({
      ...prev,
      [key]: { ...prev[key], checked },
    }));
  };

  const puedeAvanzar = () => {
    if (stepId === "frente") return !!fotoFrente;
    if (stepId === "dorso") return !!fotoDorso;
    if (stepId === "rostro") {
      return (
        !!fotoRostro &&
        Object.values(terminos).every((termino) => termino.checked)
      );
    }
    return false;
  };

  const siguiente = () => {
    if (!puedeAvanzar()) return;
    if (!isLastStep) setStepIndex((index) => index + 1);
    else mutation.mutate();
  };

  return {
    docConfig,
    stepIds,
    stepIndex,
    stepId,
    isLastStep,
    fotoFrente,
    fotoDorso,
    fotoRostro,
    terminos,
    showExito,
    setFotoFrente,
    setFotoDorso,
    setFotoRostro,
    toggleTermino,
    puedeAvanzar,
    siguiente,
    setStepIndex,
    setShowExito,
  };
}
