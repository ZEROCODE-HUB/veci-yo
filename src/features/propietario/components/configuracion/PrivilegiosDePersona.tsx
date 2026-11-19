import React from "react";
import { Text, View } from "react-native";
import { Button, Modal, Toggle } from "@/shared/components";
import type { ResidenteDeUnidad } from "../../services/residentes.repo";

interface Props {
  persona: ResidenteDeUnidad | null;
  guardando: boolean;
  onClose: () => void;
  onGuardar: (privilegios: { registraVisitas: boolean; reservaZonas: boolean }) => void;
}

/**
 * «Editar privilegios» de una persona de la vivienda (18/11/2026, pedido del
 * cliente). Sobre lo que su rol permite, quien gestiona la vivienda le da o le
 * quita registrar visitas y reservar zonas comunes. La base lo sujeta
 * (`cambiar_privilegios_de_persona` y los disparadores de visita y reserva).
 */
export function PrivilegiosDePersona({ persona, guardando, onClose, onGuardar }: Props) {
  const [registraVisitas, setRegistraVisitas] = React.useState(true);
  const [reservaZonas, setReservaZonas] = React.useState(true);

  React.useEffect(() => {
    if (persona) {
      setRegistraVisitas(persona.registraVisitas);
      setReservaZonas(persona.reservaZonas);
    }
  }, [persona]);

  return (
    <Modal visible={Boolean(persona)} onClose={onClose} title="Editar privilegios">
      <View className="gap-4">
        <Text className="text-sm text-gray-600">
          Qué puede hacer {persona?.nombre ?? "esta persona"} en la vivienda. Lo demás lo decide su rol.
        </Text>
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1 gap-0.5">
            <Text className="text-sm text-gray-900">Registrar visitas</Text>
            <Text className="text-xs leading-4 text-gray-500">Anunciar a amigos o profesionales que vienen.</Text>
          </View>
          <Toggle value={registraVisitas} onChange={setRegistraVisitas} accessibilityLabel="Registrar visitas" />
        </View>
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1 gap-0.5">
            <Text className="text-sm text-gray-900">Reservar zonas comunes</Text>
            <Text className="text-xs leading-4 text-gray-500">La piscina, la parrilla, el salón.</Text>
          </View>
          <Toggle value={reservaZonas} onChange={setReservaZonas} accessibilityLabel="Reservar zonas comunes" />
        </View>
        <Button
          variant="primary"
          loading={guardando}
          disabled={guardando}
          onPress={() => onGuardar({ registraVisitas, reservaZonas })}
        >
          Guardar
        </Button>
      </View>
    </Modal>
  );
}
