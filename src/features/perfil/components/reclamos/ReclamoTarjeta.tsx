import { View, Text, Pressable } from "react-native";
import { theme } from "@/config";
import { Badge, EtiquetaVivienda } from "@/shared/components";
import type { Reclamo } from "../../services";

interface Props {
  reclamo: Reclamo;
  onPress: () => void;
}

export function ReclamoTarjeta({ reclamo, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      className="rounded-2xl p-3.5 gap-1"
      style={{
        backgroundColor: theme.colors.bgCard,
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      <View className="flex-row items-center gap-1.5 mb-0.5">
        <Text style={{ fontSize: 16 }}>📋</Text>
        <Text className="font-semibold text-base text-gray-900">
          PQRS #{reclamo.numero}
        </Text>
      </View>

      {/*
        El asunto. Se guardaba --`titulo` es obligatorio en el formulario y la
        propia pantalla busca por el-- y no se pintaba en ningun sitio de la
        lista: cada fila decia «PQRS #0722 · Sofia Martinez · Condominio ·
        Reclamo», asi que dos solicitudes de la misma persona y la misma
        categoria eran dos renglones identicos y habia que abrirlos para saber
        cual era cual. Es el mismo defecto del numero de lavadora.
      */}
      <Text className="font-semibold text-base text-gray-900">
        {reclamo.titulo}
      </Text>

      {/*
        Quien la abrio y de que depto. El nombre solo no basta en la lista del
        edificio: una queja de ruido o una fuga obligaba a abrir la ficha para
        saber a donde ir. Pedido por el cliente el 02/10/2026.
      */}
      <View className="flex-row items-center gap-1.5">
        <Text className="text-sm text-gray-700">{reclamo.nombre}</Text>
        <EtiquetaVivienda codigo={reclamo.unidad} />
      </View>

      {/* Aquí iba la cédula de quien la abrió. Es un dato personal que no hace
          falta para identificar el caso: para eso está el número. */}
      <Text className="text-sm text-gray-500">
        {[reclamo.area, reclamo.tipo].filter(Boolean).join(" · ")}
      </Text>

      <View className="flex-row items-center justify-between mt-1">
        <Badge status={reclamo.estado} />
        <Text className="text-sm text-gray-500">{reclamo.fechaCreacion}</Text>
      </View>
    </Pressable>
  );
}
