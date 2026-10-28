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
  /** Por qué no se puede llamar de ninguna forma. Vacío: se puede. */
  motivo: string;
  /** Por qué no sale por la app, cuando sí se puede por teléfono. */
  sinApp?: string;
  buscando: boolean;
  /** Se puede llamar por internet, dentro de la app. */
  porInternet?: boolean;
  /** El teléfono, para llamar por el marcador. Vacío: no hay. */
  numero?: string;
  onLlamarPorLaApp: () => void;
  onLlamarPorTelefono: () => void;
}

/**
 * Los botones de llamar.
 *
 * Eran dos botones redondos, «Llamar / Aceptar» y «Rechazar / Cortar», como
 * si aquí entraran llamadas. No entran por aquí --la llamada que llega suena
 * en su propia ventana--. Desde el 28/10/2026 hay uno por cada forma de
 * llamar que haya: **por la app** y **por teléfono**, con el número a la
 * vista. Y si no hay ninguna, se dice por qué.
 */
export function LlamadaPanel({
  avatarEmoji,
  aQuien,
  nombreDelContacto,
  motivo,
  sinApp,
  buscando,
  porInternet = false,
  numero = "",
  onLlamarPorLaApp,
  onLlamarPorTelefono,
}: LlamadaPanelProps) {
  const listo = Boolean(aQuien) && !buscando && !motivo;

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
        <View className="items-center gap-0.5">
          <Text className="text-base font-bold text-gray-900">{aQuien}</Text>
          {nombreDelContacto ? (
            <Text className="text-sm text-gray-500">
              Contesta {nombreDelContacto}
            </Text>
          ) : null}
          {numero ? (
            <Text className="text-sm text-gray-500" selectable>
              {numero}
            </Text>
          ) : null}
        </View>
      ) : null}

      {motivo ? (
        <Text className="text-sm text-center text-gray-500">{motivo}</Text>
      ) : sinApp ? (
        <Text className="text-xs text-center text-gray-500">{sinApp}</Text>
      ) : null}

      {listo && porInternet ? (
        <Button variant="primary" fullWidth loading={buscando} onPress={onLlamarPorLaApp}>
          📞 Llamar por la app
        </Button>
      ) : null}

      {listo && numero ? (
        <Button
          variant={porInternet ? "secondary" : "primary"}
          fullWidth
          onPress={onLlamarPorTelefono}
        >
          ☎️ Llamar por teléfono
        </Button>
      ) : null}

      {/* Mientras se elige o se busca, un botón apagado que dice que espera. */}
      {!listo ? (
        <Button variant="primary" fullWidth loading={buscando} disabled onPress={onLlamarPorLaApp}>
          📞 Llamar
        </Button>
      ) : null}
    </View>
  );
}
