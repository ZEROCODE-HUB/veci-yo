import { theme } from "@/config";
import { useState } from "react";
import { Text, View } from "react-native";
import { Button, Modal } from "@/shared/components";
import type { TrabajadorDeLaVivienda } from "../../services/trabajadores.repo";
import { detalleDelTrabajador } from "../../helpers/trabajadorPermanente";

interface Props {
  trabajadores: TrabajadorDeLaVivienda[];
  onDarDeBaja: (id: string) => void;
  dandoDeBajaId?: string;
}

/**
 * Los trabajadores permanentes de la vivienda (17/11/2026), con «Dar de baja».
 * Dar de baja pide confirmar: con app, deja de sonarle el intercomunicador.
 */
export function ListaDeTrabajadores({ trabajadores, onDarDeBaja, dandoDeBajaId }: Props) {
  const [aConfirmar, setAConfirmar] = useState<TrabajadorDeLaVivienda | null>(null);
  if (trabajadores.length === 0) return null;

  return (
    <View className="gap-2">
      <Text className="text-base font-bold text-gray-900">Trabajadores permanentes</Text>
      {trabajadores.map((t) => (
        <View
          key={t.id}
          className="flex-row items-center justify-between rounded-xl p-3"
          style={{ backgroundColor: theme.colors.bgMuted }}
        >
          <View className="flex-1 pr-2">
            <Text className="text-sm font-bold text-gray-900">{t.nombre}</Text>
            <Text className="text-xs text-gray-500">{detalleDelTrabajador(t)}</Text>
            {t.correoInvitado && !t.tieneCuenta ? (
              <Text className="text-xs text-gray-500">{`Invitado: ${t.correoInvitado}`}</Text>
            ) : null}
          </View>
          <Button
            size="sm"
            variant="ghost"
            loading={dandoDeBajaId === t.id}
            disabled={Boolean(dandoDeBajaId)}
            onPress={() => setAConfirmar(t)}
          >
            Dar de baja
          </Button>
        </View>
      ))}

      <Modal
        visible={Boolean(aConfirmar)}
        onClose={() => setAConfirmar(null)}
        title="Dar de baja"
      >
        <View className="gap-3">
          <Text className="text-sm text-gray-700">
            {aConfirmar
              ? `${aConfirmar.nombre} dejará de figurar en el directorio de la vivienda${aConfirmar.tieneCuenta ? " y ya no le sonará el intercomunicador" : ""}.`
              : ""}
          </Text>
          <Button
            variant="primary"
            onPress={() => {
              if (aConfirmar) onDarDeBaja(aConfirmar.id);
              setAConfirmar(null);
            }}
          >
            Dar de baja
          </Button>
          <Button variant="ghost" onPress={() => setAConfirmar(null)}>
            Cancelar
          </Button>
        </View>
      </Modal>
    </View>
  );
}
