import { theme } from "@/config";
import React from "react";
import { Text, View } from "react-native";
import { Button } from "./Button";

/**
 * Una pregunta antes de una acción que no se deshace, en línea y no en un
 * modal: sale en el sitio del botón que se pulsó. Es la forma de
 * `ConfirmarSalida`.
 *
 * Nació porque «Revocar» una invitación actuaba al primer toque y sin avisar
 * (27/10/2026): el enlace deja de valer y quien lo recibió ya no puede entrar.
 */
export function ConfirmacionEnLinea({
  pregunta,
  confirmar,
  ocupado = false,
  onCancelar,
  onConfirmar,
}: {
  pregunta: string;
  /** El texto del botón que confirma, con el verbo: «Sí, revocar». */
  confirmar: string;
  ocupado?: boolean;
  onCancelar: () => void;
  onConfirmar: () => void;
}) {
  return (
    <View
      className="gap-2 rounded-xl p-3"
      style={{ backgroundColor: theme.colors.warningLight }}
    >
      <Text className="text-sm text-gray-900">{pregunta}</Text>
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Button variant="secondary" size="sm" fullWidth onPress={onCancelar} disabled={ocupado}>
            Cancelar
          </Button>
        </View>
        <View className="flex-1">
          <Button size="sm" fullWidth onPress={onConfirmar} loading={ocupado}>
            {confirmar}
          </Button>
        </View>
      </View>
    </View>
  );
}
