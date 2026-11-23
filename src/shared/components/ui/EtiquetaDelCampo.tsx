import { theme } from "@/config";
import React from "react";
import { Text, View } from "react-native";
import { InfoButton } from "./InfoButton";

/**
 * La etiqueta de un campo de formulario. Si termina en «*», el asterisco sale
 * en rojo: el cliente pidió ver de un vistazo qué es obligatorio (QA
 * 23/10/2026). La usan `Input`, `Select` y `CampoTelefono`.
 *
 * `explicacion` (23/11/2026, cliente: «la i con explicación donde convenga»): una
 * «i» al lado que abre lo que significa el campo. Sirve para lo que no se
 * entiende solo con la etiqueta, no para repetirla.
 */
export function EtiquetaDelCampo({ label, explicacion }: { label: string; explicacion?: string }) {
  const obligatorio = label.trimEnd().endsWith("*");
  const texto = obligatorio ? label.trimEnd().replace(/\s*\*$/, "") : label;
  const etiqueta = (
    <Text className={`text-sm text-gray-500 font-medium ${explicacion ? "shrink" : "mb-1.5"}`}>
      {texto}
      {obligatorio ? <Text style={{ color: theme.colors.danger }}> *</Text> : null}
    </Text>
  );
  if (!explicacion) return etiqueta;
  return (
    <View className="flex-row items-center gap-1 mb-1.5">
      {etiqueta}
      <InfoButton titulo={texto.replace(/\s*\(opcional\)\s*$/i, "")} descripcion={explicacion} size={16} />
    </View>
  );
}
