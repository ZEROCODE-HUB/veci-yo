import React, { useState } from "react";
import { Text, View } from "react-native";
import { Button, Modal } from "@/shared/components";
import { formatDateIso } from "@/shared/utils";
import type { VisitaDeAmigos } from "../../services/visitas.repo";

/**
 * Antes de guardar una reserva que cae sobre visitas de amigos o familia ya
 * anunciadas (10/11/2026, decidido con el cliente): se enseñan, se pueden
 * cancelar aquí mismo, y se elige seguir o cambiar las fechas. No se cancelan
 * solas: puede ser alguien a quien el huésped conoce.
 */
export function AmigosEnLaEstancia({
  visitas,
  onCancelarVisita,
  onGuardarIgual,
  onCerrar,
}: {
  visitas: VisitaDeAmigos[] | null;
  onCancelarVisita: (visitaId: string) => Promise<void>;
  onGuardarIgual: () => void;
  onCerrar: () => void;
}) {
  const [cancelando, setCancelando] = useState<string | null>(null);
  const lista = visitas ?? [];

  return (
    <Modal visible={lista.length > 0} onClose={onCerrar} title="Hay visitas en esas fechas">
      <View className="gap-3">
        <Text className="text-sm text-gray-700">
          {lista.length === 1
            ? "Tienes una visita de amigos o familia anunciada dentro de esta reserva. Con un huésped alojado, las visitas las anuncia él."
            : `Tienes ${lista.length} visitas de amigos o familia anunciadas dentro de esta reserva. Con un huésped alojado, las visitas las anuncia él.`}
        </Text>
        {lista.map((v) => (
          <View
            key={v.visitaId}
            className="flex-row items-center gap-3 rounded-xl border border-gray-200 p-3"
          >
            <View className="flex-1">
              <Text className="text-sm font-semibold text-gray-900">{v.nombre}</Text>
              <Text className="text-xs text-gray-500">{formatDateIso(v.fecha)}</Text>
            </View>
            <Button
              size="sm"
              variant="secondary"
              loading={cancelando === v.visitaId}
              disabled={cancelando !== null && cancelando !== v.visitaId}
              onPress={async () => {
                setCancelando(v.visitaId);
                // `finally`: si falla, el botón no se queda girando para siempre.
                try {
                  await onCancelarVisita(v.visitaId);
                } finally {
                  setCancelando(null);
                }
              }}
            >
              Cancelar visita
            </Button>
          </View>
        ))}
        <Button fullWidth onPress={onGuardarIgual}>
          Guardar la reserva igual
        </Button>
        <Button variant="secondary" fullWidth onPress={onCerrar}>
          Elegir otras fechas
        </Button>
      </View>
    </Modal>
  );
}
