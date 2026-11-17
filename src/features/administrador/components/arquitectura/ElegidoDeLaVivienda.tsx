import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/config";
import { Button } from "@/shared/components";

/** Ya escrito en la base, o apuntado para cuando se guarde el departamento. */
export type EstadoElegido = "asignado" | "al-guardar";

const TEXTO_DEL_ESTADO: Record<EstadoElegido, string> = {
  asignado: "Asignado",
  "al-guardar": "Se asignará al guardar",
};

/**
 * Un estacionamiento o depósito ya elegido para la vivienda (17/11/2026).
 *
 * El cliente: «en agregar propietario, y ahí mismo asignar un
 * estacionamiento, no se notaba que ya estaba seleccionado». Lo elegido era
 * una línea de texto gris y el desplegable volvía a «Elegir…», así que
 * parecía que no había pasado nada. Ahora es una tarjeta verde con un check
 * y dice si ya está asignado o si se asigna al guardar el departamento.
 */
export function ElegidoDeLaVivienda({
  texto,
  estado,
  nota,
  etiqueta,
  quitando = false,
  bloqueado = false,
  onQuitar,
}: {
  texto: string;
  estado: EstadoElegido;
  /** Un detalle más, como «se crea al guardar» para uno nuevo. */
  nota?: string;
  /** En lugar de «Asignado», por ejemplo «Propietario». */
  etiqueta?: string;
  quitando?: boolean;
  bloqueado?: boolean;
  /** Sin él no se ofrece «Quitar» (el propietario no se quita desde aquí). */
  onQuitar?: () => void;
}) {
  const dice = etiqueta ?? TEXTO_DEL_ESTADO[estado];
  const color = estado === "asignado" ? theme.colors.success : theme.colors.warningDark;
  return (
    <View
      accessibilityLabel={`${texto}: ${dice}`}
      className="flex-row items-center gap-2 rounded-xl px-3 py-2"
      style={{
        backgroundColor: estado === "asignado" ? theme.colors.successSoft : theme.colors.warningSoft,
        borderWidth: 1,
        borderColor: estado === "asignado" ? theme.colors.successLight : theme.colors.warningLight,
      }}
    >
      <Ionicons name={estado === "asignado" ? "checkmark-circle" : "time-outline"} size={20} color={color} />
      <View className="flex-1">
        <Text className="text-sm font-bold text-gray-900">{texto}</Text>
        <Text className="text-xs font-semibold" style={{ color }}>
          {nota ? `${dice} · ${nota}` : dice}
        </Text>
      </View>
      {onQuitar ? (
        <Button size="sm" variant="ghost" loading={quitando} disabled={bloqueado} onPress={onQuitar}>
          Quitar
        </Button>
      ) : null}
    </View>
  );
}
