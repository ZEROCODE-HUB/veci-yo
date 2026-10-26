import { theme } from "@/config";
import React, { useState } from "react";
import { Text, View } from "react-native";
import { Button } from "@/shared/components";

interface Props {
  nombre: string;
  /** Por qué no coincide: no se leyó nada, o lo leído no es lo registrado. */
  motivo: string;
  onVolverAEscanear: () => void;
  /** Sin esto no se ofrece aprobar a mano (por ejemplo, sin identificador). */
  onAprobarAMano?: () => Promise<void>;
}

/**
 * Lo escaneado no coincide con lo registrado (el cliente, 26/10/2026): sale un
 * error y dos salidas, volver a escanear o aprobar a mano. Aprobar a mano pide
 * un segundo paso con una advertencia, porque queda registrado quién lo hizo.
 */
export function DocumentoNoCoincide({ nombre, motivo, onVolverAEscanear, onAprobarAMano }: Props) {
  const [confirmando, setConfirmando] = useState(false);
  const [aprobando, setAprobando] = useState(false);

  const aprobar = async () => {
    if (!onAprobarAMano) return;
    setAprobando(true);
    try {
      await onAprobarAMano();
    } finally {
      setAprobando(false);
    }
  };

  return (
    <View className="gap-3 rounded-xl p-3" style={{ backgroundColor: theme.colors.badgeRedBg }}>
      <Text className="text-sm font-bold" style={{ color: theme.colors.badgeRedText }}>
        El documento no coincide
      </Text>
      <Text className="text-xs" style={{ color: theme.colors.badgeRedText }}>
        {motivo}
      </Text>

      {/*
        Cada rama con su clave: si no, React reutiliza el mismo botón para
        «Aprobar a mano» y «Sí, aprobar a mano», y el freno de doble toque del
        Button (600 ms) se comía la confirmación.
      */}
      {confirmando ? (
        <View key="confirmar" className="gap-2">
          <Text className="text-xs font-semibold" style={{ color: theme.colors.badgeRedText }}>
            {`⚠️ Vas a dejar entrar a ${nombre} sin que su documento coincida con lo que registró. Quedará anotado que lo aprobaste tú, con la fecha y la hora.`}
          </Text>
          <Button variant="danger" fullWidth onPress={aprobar} loading={aprobando}>
            Sí, aprobar a mano
          </Button>
          <Button variant="secondary" fullWidth onPress={() => setConfirmando(false)}>
            Cancelar
          </Button>
        </View>
      ) : (
        <View key="opciones" className="gap-2">
          <Button fullWidth onPress={onVolverAEscanear}>
            Volver a escanear
          </Button>
          {onAprobarAMano ? (
            <Button variant="secondary" fullWidth onPress={() => setConfirmando(true)}>
              Aprobar a mano
            </Button>
          ) : null}
        </View>
      )}
    </View>
  );
}
