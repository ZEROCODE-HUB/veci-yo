import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { TIPO_DOCUMENTO } from "@/shared/constants";
import { useDocumentosParaRegistrarse } from "@/shared/hooks";
import { completarVerificacionRequest } from "../services";
import type { ConfiguracionDocumento, TerminosVerificacion } from "../types";

/**
 * Qué fotos pedir del documento de la persona.
 *
 * Se buscaba por la etiqueta --«Cédula», «Pasaporte»-- y lo guardado es la
 * clave de la base --`pasaporte`--, así que no casaba nunca y a todos se les
 * pedía la cara de atrás, también a quien tiene pasaporte. Ahora la etiqueta
 * sale de `TIPO_DOCUMENTO` y si tiene reverso lo dice la regla del país
 * (`documento_del_pais.dos_caras`, 25/10/2026).
 */
export function configuracionDelDocumento(
  tipo: string | null | undefined,
  dosCaras: boolean,
): ConfiguracionDocumento {
  const nombre = (tipo && TIPO_DOCUMENTO[tipo as keyof typeof TIPO_DOCUMENTO]) || "documento";
  return dosCaras
    ? { frente: `Foto frontal: ${nombre}`, dorso: `Foto trasera: ${nombre}` }
    : { frente: `Foto: ${nombre}` };
}

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
  const documentos = useDocumentosParaRegistrarse();
  const docConfig = configuracionDelDocumento(
    usuario?.tipoDocumento,
    documentos.reglaDe(usuario?.tipoDocumento)?.dosCaras ?? true,
  );
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
