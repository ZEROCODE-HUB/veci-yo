import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Calendar } from "./Calendar";
import { Modal } from "./Modal";
import { formatDateInput, formatDateIso, parseFechaIso } from "@/shared/utils";

interface Props {
  label?: string;
  /** Fecha en ISO (`yyyy-MM-dd`), que es como viaja a la base. */
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  /** Texto de ayuda bajo el campo, para explicar qué significa la fecha. */
  ayuda?: string;
  /**
   * Despliega el calendario **donde está el campo** en vez de abrir un modal.
   *
   * Para los campos que ya viven dentro de un modal. Un modal sobre otro se
   * puede hacer, pero en esta aplicación los modales llevan animación y velo
   * propios, y apilarlos ya dio dos sustos documentados en AGENTS.md —uno de
   * ellos, una tarjeta transparente que parecía un fallo de datos—.
   */
  enLinea?: boolean;
  /** El primer día que se puede elegir. Lo entiende el propio `Calendar`. */
  minima?: Date;
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
  enLinea = false,
  minima,
}: Props) {
  const [abierto, setAbierto] = useState(false);

  const seleccionada = parseFechaIso(value);

  const calendario = (
    <Calendar
      selected={seleccionada}
      minima={minima}
      onSelect={(fecha) => {
        onChange(formatDateInput(fecha));
        setAbierto(false);
      }}
    />
  );

  return (
    <View className="w-full">
      {Boolean(label) && (
        <Text className="text-sm text-gray-500 mb-1.5 font-medium">{label}</Text>
      )}

      <Pressable
        onPress={() => setAbierto((previo) => !previo)}
        accessibilityRole="button"
        accessibilityLabel={label ?? placeholder}
        className="rounded-xl border border-gray-200 bg-white px-4 py-3 active:opacity-70"
      >
        <Text className={`text-sm ${value ? "text-gray-900" : "text-gray-500"}`}>
          {value ? formatDateIso(value) : placeholder}
        </Text>
      </Pressable>

      {Boolean(ayuda) && <Text className="text-xs text-gray-500 mt-1">{ayuda}</Text>}

      {enLinea ? (
        abierto && (
          <View className="mt-2 rounded-xl border border-gray-200 bg-white p-2">
            {calendario}
          </View>
        )
      ) : (
        <Modal
          visible={abierto}
          onClose={() => setAbierto(false)}
          title={label ?? "Elegir fecha"}
        >
          {calendario}
        </Modal>
      )}
    </View>
  );
}
