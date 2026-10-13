import React from "react";
import { View, Text, ScrollView } from "react-native";
import { theme } from "@/config";
import { Select, Button } from "@/shared/components";

export interface DestinoChat {
  /** Valor con el que se abre la conversación. */
  valor: string;
  etiqueta: string;
}

interface ChatNewFormProps {
  /** "¿Con quién?" para un residente; "¿Con qué vivienda?" para el personal. */
  titulo: string;
  destinos: DestinoChat[];
  destino: string;
  onDestinoChange: (valor: string) => void;
  onStartChat: () => void;
  abriendo: boolean;
  aviso?: string;
}

export function ChatNewForm({
  titulo,
  destinos,
  destino,
  onDestinoChange,
  onStartChat,
  abriendo,
  aviso,
}: ChatNewFormProps) {
  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerClassName="p-4 gap-4"
    >
      {/* El formulario pedía torre, piso, departamento, persona y una
          búsqueda, todo contra listas fijas, para acabar abriendo un chat
          identificado por un nombre. Con el modelo real solo hay dos casos:
          un residente escribe a un área, y el personal escribe a una vivienda. */}
      <Text className="text-base font-semibold text-gray-900">{titulo}</Text>

      <Select
        label=""
        /*
          El valor es la clave y la etiqueta es lo que se lee. Se le pasaba la
          clave --«seguridad:<uuid>»-- contra una lista de etiquetas, así que
          nunca coincidía: se elegía «Seguridad» y el campo seguía diciendo
          «Seleccione un destinatario» (13/10/2026).
        */
        value={destino || null}
        options={destinos.map((d) => ({ value: d.valor, label: d.etiqueta }))}
        onChange={(valor) => onDestinoChange(String(valor))}
        placeholder="Elige con quién"
      />

      {Boolean(aviso) && (
        <Text
          className="text-xs leading-4"
          style={{ color: theme.colors.textMuted }}
        >
          {aviso}
        </Text>
      )}

      <View className="mt-2">
        <Button
          variant="primary"
          fullWidth
          onPress={onStartChat}
          disabled={!destino || abriendo}
        >
          {abriendo ? "Abriendo..." : "Iniciar conversación"}
        </Button>
      </View>
    </ScrollView>
  );
}
