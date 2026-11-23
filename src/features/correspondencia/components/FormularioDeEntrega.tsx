import { useState } from "react";
import { Text, View } from "react-native";
import { Button, Input } from "@/shared/components";

interface Props {
  nombre: string;
  onNombreChange: (value: string) => void;
  onConfirmar: () => void;
  entregando: boolean;
  /** Dentro del detalle hay vuelta atrás; en la ventana suelta la cierra la X. */
  onCancelar?: () => void;
}

/**
 * Quién recibió el envío. Se pide siempre, también en el mostrador (R-14):
 * es donde nace el «yo nunca recibí ese paquete».
 *
 * Va en su propio componente porque se pinta en dos sitios: dentro del
 * detalle --sin cambiar de ventana, que en Android tardaba en irse (17/11/2026)--
 * y en la ventana que abren los tres puntos.
 */
export function FormularioDeEntrega({
  nombre,
  onNombreChange,
  onConfirmar,
  entregando,
  onCancelar,
}: Props) {
  // Pulsó «Confirmar» sin nombre: se dice debajo del campo.
  const [intento, setIntento] = useState(false);
  const falta = nombre.trim() === "";
  return (
    <View className="gap-4">
      {/*
        Pedía también la hora, en un campo de texto libre, y no se guardaba:
        la hora de entrega la pone la base en el momento de confirmar.
      */}
      <Text className="text-sm text-gray-500 text-center">
        Indica quién recibió la encomienda. La hora queda registrada al
        confirmar.
      </Text>
      <Input
        label="Nombre de quien recibe *"
        soloLetras
        value={nombre}
        onChangeText={onNombreChange}
        placeholder="Nombre y apellido"
        error={intento && falta ? "Escribe el nombre de quien recibe" : undefined}
      />
      <Button
        variant="primary"
        fullWidth
        disabled={entregando}
        loading={entregando}
        onPress={() => {
          if (falta) {
            setIntento(true);
            return;
          }
          onConfirmar();
        }}
      >
        Confirmar Entrega
      </Button>
      {onCancelar ? (
        <Button variant="secondary" fullWidth disabled={entregando} onPress={onCancelar}>
          Cancelar
        </Button>
      ) : null}
    </View>
  );
}
