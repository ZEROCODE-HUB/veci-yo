import { theme } from "@/config";
import React from "react";
import { View, Text } from "react-native";
import { Button } from "@/shared/components";

interface LlamadaPanelProps {
  avatarEmoji: string;
  /** A quién se va a llamar. Vacío: todavía no se eligió. */
  aQuien: string;
  /** Quién contesta en esa vivienda, si se sabe. */
  nombreDelContacto?: string;
  /** Por qué no se puede llamar. Vacío: se puede. */
  motivo: string;
  buscando: boolean;
  /** Sale por internet dentro de la app, no por el marcador del teléfono. */
  porInternet?: boolean;
  onLlamar: () => void;
}

/**
 * El botón de llamar.
 *
 * Eran dos botones redondos, «Llamar / Aceptar» y «Rechazar / Cortar», como
 * si aquí entraran llamadas. No entran por aquí --la llamada que llega suena
 * en su propia ventana--, así que hay un solo botón, y dice por qué no cuando
 * no puede.
 */
export function LlamadaPanel({
  avatarEmoji,
  aQuien,
  nombreDelContacto,
  motivo,
  buscando,
  porInternet = false,
  onLlamar,
}: LlamadaPanelProps) {
  return (
    <View
      className="rounded-2xl items-center gap-5 mt-2"
      style={{
        backgroundColor: theme.colors.bgCard,
        paddingVertical: 28,
        paddingHorizontal: 16,
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      <View
        className="w-[120px] h-[120px] rounded-full items-center justify-center"
        style={{ backgroundColor: theme.colors.chatAcento }}
      >
        <Text style={{ fontSize: 56 }}>{avatarEmoji}</Text>
      </View>

      {aQuien ? (
        <View className="items-center">
          <Text className="text-base font-bold text-gray-900">{aQuien}</Text>
          {nombreDelContacto ? (
            <Text className="text-sm text-gray-500">
              Contesta {nombreDelContacto}
            </Text>
          ) : null}
        </View>
      ) : null}

      {motivo ? (
        <Text className="text-sm text-center text-gray-500">{motivo}</Text>
      ) : (
        <Text className="text-xs text-center text-gray-500">
          {porInternet
            ? "La llamada sale por internet, dentro de la app."
            : "Se abre el marcador de tu teléfono con el número puesto."}
        </Text>
      )}

      <Button
        variant="primary"
        fullWidth
        loading={buscando}
        disabled={Boolean(motivo)}
        onPress={onLlamar}
      >
        <Text>📞 Llamar</Text>
      </Button>
    </View>
  );
}
