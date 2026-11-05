import { theme } from "@/config";
import React, { useState } from "react";
import { Text, View } from "react-native";
import { Button, Input } from "@/shared/components";

interface Props {
  nombre: string;
  /** Por qué no coincide: no se leyó nada, o lo leído no es lo registrado. */
  motivo: string;
  onVolverAEscanear: () => void;
  /** Sin esto no se ofrece aprobar a mano (por ejemplo, sin identificador). */
  onAprobarAMano?: (motivo: string) => Promise<void>;
}

/** Lo mínimo para que el motivo diga algo («ok» no explica nada). */
const MOTIVO_MINIMO = 5;

/**
 * Lo escaneado no coincide con lo registrado (el cliente, 26/10/2026): sale un
 * error y dos salidas, volver a escanear o aprobar a mano. Aprobar a mano pide
 * un segundo paso con una advertencia, porque queda registrado quién lo hizo.
 *
 * 05/11/2026: y **por qué**. La base guardaba un motivo desde el principio y la
 * pantalla nunca lo pedía, así que una aprobación a mano decía quién y cuándo
 * pero no la razón.
 */
export function DocumentoNoCoincide({ nombre, motivo, onVolverAEscanear, onAprobarAMano }: Props) {
  const [confirmando, setConfirmando] = useState(false);
  const [aprobando, setAprobando] = useState(false);
  const [razon, setRazon] = useState("");
  const razonValida = razon.trim().length >= MOTIVO_MINIMO;

  const aprobar = async () => {
    if (!onAprobarAMano || !razonValida) return;
    setAprobando(true);
    try {
      await onAprobarAMano(razon.trim());
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
            {`⚠️ Vas a dejar entrar a ${nombre} sin que su documento coincida con lo que registró. Quedará anotado que lo aprobaste tú, con la fecha, la hora y el motivo.`}
          </Text>
          <Input
            label="Motivo *"
            value={razon}
            onChangeText={setRazon}
            placeholder="Por ejemplo: el documento está gastado y no se lee"
            multiline
            rows={2}
            error={razon.length > 0 && !razonValida ? "Escribe el motivo" : undefined}
          />
          <Button
            variant="danger"
            fullWidth
            onPress={aprobar}
            loading={aprobando}
            disabled={!razonValida}
          >
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
