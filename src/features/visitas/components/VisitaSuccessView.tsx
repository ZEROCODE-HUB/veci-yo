import { theme } from "@/config";
import React, { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Pressable } from "react-native";
import { Badge, Button } from "@/shared/components";
import { TIPO_LABELS } from "../constants";
import { formatDate, formatDateIso } from "@/shared/utils";

interface VisitaSuccessViewProps {
  tipoSeleccionado: string | null;
  nombre: string;
  fecha: Date;
  /** Solo la renta corta: el dia en que se va. En ISO, como viaja a la base. */
  fechaSalida?: string;
  esHT: boolean;
  /**
   * El estado con el que **nació** la visita, que no siempre es el mismo.
   *
   * Estaba escrito a fuego como "Pendiente". Cuando la portería registra a
   * alguien que ya está en la puerta, la visita nace `ingresada` --lo pone
   * `crearVisita` y el disparador rellena `ingreso_en` y marca al invitado--,
   * así que la tarjeta de confirmación contradecía al dato recién escrito: el
   * guardia acababa de dejar entrar a una persona y la pantalla le decía
   * "Pendiente". La lista, dos toques más allá, ya decía "Ingreso el ... a las
   * ...". Es el defecto de siempre: la decisión vivía en la pantalla.
   */
  estado: "Pendiente" | "Ingresado";
  onVolver: () => void;
}

export function VisitaSuccessView({
  tipoSeleccionado,
  nombre,
  fecha,
  fechaSalida,
  esHT,
  estado,
  onVolver,
}: VisitaSuccessViewProps) {
  const [copiado, setCopiado] = useState(false);
  const tipoLabel = tipoSeleccionado
    ? TIPO_LABELS[tipoSeleccionado] || tipoSeleccionado
    : "";
  const fechaStr = formatDate(fecha);
  /*
    El mensaje que se le copia al huesped decia solo el dia de entrada, porque
    hasta el 29/09/2026 la estancia entera medía un dia. Con las dos fechas hay
    que decir las dos: es el texto con el que el huesped sabe cuando se va.
  */
  const salidaStr = fechaSalida ? formatDateIso(fechaSalida) : "";
  const rango = salidaStr && salidaStr !== fechaStr ? `del ${fechaStr} al ${salidaStr}` : `el ${fechaStr}`;

  const handleCopiar = () => {
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <View className="flex-1 items-center justify-center gap-4 px-6 bg-white">
      <View
        className="w-full rounded-2xl p-5 gap-3"
        style={{
          backgroundColor: theme.colors.bgMuted,
          boxShadow: theme.shadows.card,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}
      >
        <View className="flex-row items-center gap-3">
          <View
            className="w-12 h-12 rounded-full items-center justify-center"
            style={{ backgroundColor: theme.colors.border }}
          >
            <Ionicons
              name={esHT ? "bed" : "people"}
              size={24}
              color={theme.colors.textSecondary}
            />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-gray-900">{nombre}</Text>
            <Text className="text-sm text-gray-500">{tipoLabel}</Text>
          </View>
          <Badge status={estado} />
        </View>
        <View className="flex-row gap-2 mt-1">
          <View
            className="rounded-full px-2.5 py-1"
            style={{ backgroundColor: theme.colors.borderLight }}
          >
            <Text className="text-xs text-gray-500">
              📅 {salidaStr && salidaStr !== fechaStr ? `${fechaStr} — ${salidaStr}` : fechaStr}
            </Text>
          </View>
        </View>
      </View>

      <Text className="text-5xl">✅</Text>
      <Text className="text-xl font-bold text-gray-900 text-center">
        {esHT ? "Reserva creada" : "Visita creada"}
      </Text>
      <Text className="text-sm text-gray-500 text-center">
        {esHT
          ? "La reserva fue registrada correctamente."
          : "La visita fue registrada correctamente."}
      </Text>

      {esHT && (
        <View className="w-full gap-2">
          <Text className="text-xs text-gray-500 text-center">
            Compartí este mensaje con tu huésped:
          </Text>
          <View
            className="rounded-xl p-3"
            style={{
              backgroundColor: theme.colors.bgMuted,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            <Text className="text-sm text-gray-700 text-center leading-5">
              Hola {nombre}, tu reserva de {tipoLabel} está confirmada{" "}
              {rango}. Te esperamos!
            </Text>
          </View>
          <Pressable
            onPress={handleCopiar}
            className="rounded-full py-2 px-4 items-center"
            style={{ backgroundColor: theme.colors.primary }}
          >
            <Text className="text-sm font-bold text-white">
              {copiado ? "✓ Copiado" : "Copiar"}
            </Text>
          </Pressable>
        </View>
      )}

      <Button onPress={onVolver}>Volver al historial</Button>
    </View>
  );
}
