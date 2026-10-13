import { theme } from "@/config";
import { View, Text, Image } from "react-native";
import { Button } from "@/shared/components";

const sosIlustracion = require("@/assets/branding/sos.png");

/**
 * El estado de la alarma, en las palabras que corresponden.
 *
 * El cartel decía siempre "¡ALARMA SONORA ACTIVADA TODOS LOS GUARDIAS SERÁN
 * NOTIFICADOS!", pasara lo que pasara, y no se notificaba a nadie. Ahora dice
 * a cuánta gente llegó el aviso, porque a veces son cero: de madrugada puede
 * no haber ningún guardia de turno, y quien pide auxilio tiene que saberlo
 * para llamar por teléfono.
 */
function titulo(estado: EstadoAlarma): string {
  if (estado.tipo === "cerrando") return "Cerrando la alarma…";
  if (estado.tipo === "avisando") return "Avisando a la portería…";
  if (estado.tipo === "fallo") {
    return "No se pudo avisar. Llama a la portería por teléfono.";
  }
  if (estado.avisados === null) {
    return "ALARMA ACTIVADA · el aviso salió hacia la portería";
  }
  if (estado.avisados === 0) {
    return "Alarma registrada, pero no hay nadie de turno ahora mismo. Llama por teléfono.";
  }
  return estado.avisados === 1
    ? "ALARMA ACTIVADA · 1 persona notificada"
    : `ALARMA ACTIVADA · ${estado.avisados} personas notificadas`;
}

export type EstadoAlarma =
  | { tipo: "avisando" }
  /** Se pidió cerrarla y se está esperando a que quede cerrada. */
  | { tipo: "cerrando" }
  | { tipo: "fallo" }
  | { tipo: "activa"; avisados: number | null };

interface Props {
  estado: EstadoAlarma;
  onCancelar: () => void;
  onGuardia: () => void;
}

export function SosAlarma({ estado, onCancelar, onGuardia }: Props) {
  const sinNadie = estado.tipo === "activa" && estado.avisados === 0;

  return (
    <View className="p-4 gap-5">
      <View
        className="bg-white rounded-xl p-5"
        style={{
          shadowColor: theme.colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        <Text
          className={`text-lg font-extrabold text-center ${
            estado.tipo === "fallo" || sinNadie
              ? "text-red-600"
              : "text-gray-900"
          }`}
          style={{ lineHeight: 24 }}
        >
          {titulo(estado)}
        </Text>
      </View>

      <View
        className="rounded-xl overflow-hidden"
        style={{
          height: 220,
          shadowColor: theme.colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        <Image
          source={sosIlustracion}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
        />
      </View>

      <Button
        variant="danger"
        onPress={onCancelar}
        loading={estado.tipo === "cerrando"}
      >
        🔕 Cancelar alarma
      </Button>
      <Button
        variant="primary"
        onPress={onGuardia}
        disabled={estado.tipo === "cerrando"}
      >
        🛡️ Llegó el guardia
      </Button>
    </View>
  );
}
