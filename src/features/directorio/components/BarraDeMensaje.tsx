import { useState } from "react";
import { Text, View } from "react-native";
import { theme } from "@/config";
import { Button } from "@/shared/components";
import type { SeleccionDeViviendas } from "../hooks/useSeleccionDeViviendas";
import { MensajeAViviendasModal } from "./MensajeAViviendasModal";

/**
 * «Enviar mensaje (N)», fijo abajo mientras la administración selecciona
 * viviendas (16/11/2026), y la ventana del texto.
 */
export function BarraDeMensaje({ seleccion }: { seleccion: SeleccionDeViviendas }) {
  const [escribiendo, setEscribiendo] = useState(false);
  if (!seleccion.activa) return null;

  return (
    <View
      style={{
        padding: 12,
        backgroundColor: theme.colors.bgCard,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
      }}
    >
      <Button
        fullWidth
        disabled={seleccion.elegidas.length === 0}
        onPress={() => setEscribiendo(true)}
      >
        <Text>{`Enviar mensaje (${seleccion.elegidas.length})`}</Text>
      </Button>
      <MensajeAViviendasModal
        unidades={escribiendo ? seleccion.elegidas : []}
        onClose={() => setEscribiendo(false)}
        onEnviado={() => {
          setEscribiendo(false);
          seleccion.terminar();
        }}
      />
    </View>
  );
}
