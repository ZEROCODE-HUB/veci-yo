import { theme } from "@/config";
import React from "react";
import { Text } from "react-native";

/**
 * La etiqueta de un campo de formulario. Si termina en «*», el asterisco sale
 * en rojo: el cliente pidió ver de un vistazo qué es obligatorio (QA
 * 23/10/2026). La usan `Input`, `Select` y `CampoTelefono`.
 */
export function EtiquetaDelCampo({ label }: { label: string }) {
  const obligatorio = label.trimEnd().endsWith("*");
  const texto = obligatorio ? label.trimEnd().replace(/\s*\*$/, "") : label;
  return (
    <Text className="text-sm text-gray-500 mb-1.5 font-medium">
      {texto}
      {obligatorio ? <Text style={{ color: theme.colors.danger }}> *</Text> : null}
    </Text>
  );
}
