import React from "react";
import { Text, View } from "react-native";
import { Button } from "@/shared/components/ui";

export interface CambioAConfirmar {
  que: string;
  antes: string;
  despues: string;
}

interface Props {
  cambios: CambioAConfirmar[];
  /** Lo legal y los interruptores: lo que, mal puesto, rompe algo fuera de la app. */
  riesgoAlto?: boolean;
  guardando: boolean;
  onConfirmar: () => void;
  onVolver: () => void;
}

/**
 * El segundo paso de todo cambio en el panel de la app (28/10/2026).
 *
 * El cliente: que el administrador de la app pueda cambiar lo legal y los
 * interruptores, «obvio pidiendo confirmación si se cambia algo». Antes de
 * guardar se enseña qué cambia, de qué a qué, y se pulsa otra vez.
 */
export function ConfirmarCambio({ cambios, riesgoAlto, guardando, onConfirmar, onVolver }: Props) {
  return (
    <View className="gap-3">
      <Text className="text-sm font-semibold text-gray-900">¿Confirmas el cambio?</Text>
      {cambios.map((c) => (
        <View key={c.que} className="gap-0.5 rounded-xl bg-gray-50 p-3">
          <Text className="text-xs text-gray-500">{c.que}</Text>
          <Text className="text-sm text-gray-900">{`${c.antes || "—"} → ${c.despues || "—"}`}</Text>
        </View>
      ))}
      {riesgoAlto ? (
        <Text className="text-xs text-warning">
          Esto afecta a toda la app o a lo que se manda fuera de ella (ministerio, proveedores, correos).
        </Text>
      ) : null}
      <Button fullWidth variant={riesgoAlto ? "danger" : "primary"} onPress={onConfirmar} loading={guardando}>
        Sí, cambiarlo
      </Button>
      <Button fullWidth variant="secondary" onPress={onVolver} disabled={guardando}>
        Volver
      </Button>
    </View>
  );
}
