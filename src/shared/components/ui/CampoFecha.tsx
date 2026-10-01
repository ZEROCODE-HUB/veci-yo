import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Calendar } from "./Calendar";
import { Modal } from "./Modal";
import { formatDateInput, formatDateIso } from "@/shared/utils";

interface Props {
  label?: string;
  /** Fecha en ISO (`yyyy-MM-dd`), que es como viaja a la base. */
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  /** Texto de ayuda bajo el campo, para explicar qué significa la fecha. */
  ayuda?: string;
}

/**
 * Campo de fecha: se pulsa y se abre el calendario.
 *
 * El patrón —un `Pressable` que abre un `Modal` con `Calendar`— estaba repetido
 * a mano en cinco pantallas. Aquí queda en un sitio, y además fija el contrato:
 * hacia fuera la fecha viaja en ISO, que es como la guarda la base, y se pinta
 * en `dd/MM/yyyy`, que es el formato canónico de la aplicación (regla 6).
 */
export function CampoFecha({
  label,
  value,
  onChange,
  placeholder = "Elegir fecha",
  ayuda,
}: Props) {
  const [abierto, setAbierto] = useState(false);

  // `new Date("2026-11-10")` se interpreta como UTC y en un dispositivo al
  // oeste de Greenwich cae en el día anterior. Se construye por partes.
  const seleccionada = (() => {
    if (!value) return null;
    const [anio, mes, dia] = value.split("-").map(Number);
    return anio && mes && dia ? new Date(anio, mes - 1, dia) : null;
  })();

  return (
    <View className="w-full">
      {label && (
        <Text className="text-sm text-gray-500 mb-1.5 font-medium">{label}</Text>
      )}

      <Pressable
        onPress={() => setAbierto(true)}
        className="rounded-xl border border-gray-200 bg-white px-4 py-3"
      >
        <Text className={`text-sm ${value ? "text-gray-900" : "text-gray-500"}`}>
          {value ? formatDateIso(value) : placeholder}
        </Text>
      </Pressable>

      {ayuda && <Text className="text-xs text-gray-500 mt-1">{ayuda}</Text>}

      <Modal
        visible={abierto}
        onClose={() => setAbierto(false)}
        title={label ?? "Elegir fecha"}
      >
        <Calendar
          selected={seleccionada}
          onSelect={(fecha) => {
            onChange(formatDateInput(fecha));
            setAbierto(false);
          }}
        />
      </Modal>
    </View>
  );
}
