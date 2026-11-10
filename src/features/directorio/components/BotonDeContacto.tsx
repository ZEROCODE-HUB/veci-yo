import { Ionicons } from "@expo/vector-icons";
import { Pressable } from "react-native";
import { theme } from "@/config";
import { Cargando } from "@/shared/components";

type Icono = React.ComponentProps<typeof Ionicons>["name"];

/**
 * Un botón redondo de solo icono para contactar a alguien del directorio
 * (10/11/2026, pedido del cliente: «el número en grande, icono de copiar, de
 * llamar por la app, de WhatsApp y de chat, y listo»). Sin texto, así que el
 * nombre va en `accessibilityLabel`.
 */
export function BotonDeContacto({
  icono,
  nombre,
  onPress,
  cargando = false,
  hecho = false,
}: {
  icono: Icono;
  /** Lo que hace, para quien no ve el icono: «Copiar el número». */
  nombre: string;
  onPress: () => void;
  cargando?: boolean;
  /** Recién hecho (p. ej. copiado): se pinta en verde con un visto. */
  hecho?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={cargando}
      accessibilityRole="button"
      accessibilityLabel={hecho ? `${nombre}: hecho` : nombre}
      className="h-11 w-11 items-center justify-center rounded-full active:opacity-70"
      style={{ backgroundColor: hecho ? theme.colors.successLight : theme.colors.primaryLight }}
    >
      {cargando ? (
        <Cargando variante="control" />
      ) : (
        <Ionicons
          name={hecho ? "checkmark" : icono}
          size={20}
          color={hecho ? theme.colors.success : theme.colors.primary}
        />
      )}
    </Pressable>
  );
}
