import React from "react";
import { Text, View } from "react-native";
import { theme } from "@/config";
import { Badge, Modal } from "@/shared/components";
import type { CorrespondenciaItem } from "@/shared/types";

interface Props {
  visible: boolean;
  onClose: () => void;
  /** El paquete sobre el que se informó una incidencia, si era eso. */
  informado: CorrespondenciaItem | null;
  /** Los códigos de las viviendas para las que el envío quedó registrado. */
  registradas: string[];
  resumen: { empresa: string; nombre: string; ci: string; fecha: string };
}

/** La confirmación de un envío registrado, o de una incidencia informada. */
export function EnvioRegistrado({ visible, onClose, informado, registradas, resumen }: Props) {
  return (
    <Modal visible={visible} onClose={onClose} title="Correspondencia">
      <View className="gap-4 text-center">
        <Text className="text-lg font-semibold text-center">
          {informado ? "Incidencia reportada" : "¡Correspondencia cargada con éxito!"}
        </Text>
        {/*
          En modo informe la tarjeta del alta sale vacia --no hay empresa ni
          unidad que resumir, porque no se registro nada nuevo-- asi que se
          enseña el paquete sobre el que se informo.
        */}
        <View className="rounded-xl p-3.5 gap-1" style={{ borderWidth: 1.5, borderColor: theme.colors.primary }}>
          {/*
            Solo lo que de verdad se registro, y **para quienes**: decia
            «Departamento 205» aunque se hubieran marcado veinte.
          */}
          <Text className="text-base font-semibold">
            {informado
              ? [informado.empresa, informado.unidad].filter(Boolean).join(": ")
              : registradas.length === 1
                ? `Departamento ${registradas[0]}`
                : `${registradas.length} departamentos: ${registradas.join(", ")}`}
          </Text>
          {Boolean(resumen.empresa) && <Text className="text-sm text-gray-500">{resumen.empresa}</Text>}
          {Boolean(resumen.nombre) && <Text className="text-base font-bold">{resumen.nombre}</Text>}
          {Boolean(resumen.ci) && <Text className="text-sm text-gray-500">CI: {resumen.ci}</Text>}
          <View className="flex-row justify-between mt-1.5">
            <Badge status="En Portería" />
            <Text className="text-sm text-gray-500">{resumen.fecha}</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}
