import { theme } from "@/config";
import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { View, Text } from "react-native";
import { Badge, Button } from "@/shared/components";
import { TIPO_LABELS } from "../constants";
import { formatDate, formatDateIso } from "@/shared/utils";
import { EnlacePrecheckin } from "./EnlacePrecheckin";
import type { DatosDelMensaje } from "../helpers/mensajeDePreregistro";

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
  /** Lo que queda por hacer, si queda algo: se dice bajo el «Visita creada». */
  siguientePaso?: string;
  onVolver: () => void;
  /** La estancia recién creada: su enlace va en el mensaje para el huésped. */
  visitaUuid?: string | null;
  datosDelMensaje?: DatosDelMensaje;
}

export function VisitaSuccessView({
  tipoSeleccionado,
  nombre,
  fecha,
  fechaSalida,
  esHT,
  estado,
  siguientePaso,
  onVolver,
  visitaUuid,
  datosDelMensaje,
}: VisitaSuccessViewProps) {
  const tipoLabel = tipoSeleccionado
    ? TIPO_LABELS[tipoSeleccionado] || tipoSeleccionado
    : "";
  const fechaStr = formatDate(fecha);
  /*
    Lo que se acaba de registrar, con su nombre (29/10/2026): un profesional
    temporal salía como «Visita creada». Cada tipo dice lo que es.
  */
  const queEs =
    tipoSeleccionado === "temporal"
      ? { titulo: "Profesional temporal registrado", texto: "El profesional temporal quedó registrado correctamente." }
      : tipoSeleccionado === "permanente"
        ? { titulo: "Profesional permanente registrado", texto: "El profesional permanente quedó registrado correctamente." }
        : esHT
          ? { titulo: "Reserva creada", texto: "La reserva fue registrada correctamente." }
          : { titulo: "Visita registrada", texto: "La visita de amigos o familiares quedó registrada correctamente." };
  /*
    El mensaje que se le copia al huesped decia solo el dia de entrada, porque
    hasta el 29/09/2026 la estancia entera medía un dia. Con las dos fechas hay
    que decir las dos: es el texto con el que el huesped sabe cuando se va.
  */
  const salidaStr = fechaSalida ? formatDateIso(fechaSalida) : "";

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
        {queEs.titulo}
      </Text>
      <Text className="text-sm text-gray-500 text-center">{queEs.texto}</Text>
      {siguientePaso ? (
        <Text className="text-sm font-semibold text-amber-800 text-center">
          {siguientePaso}
        </Text>
      ) : null}

      {/*
        El mismo botón y el mismo mensaje que en la ficha de la reserva (QA
        23/10/2026): antes aquí salía un texto sin enlace, y en la ficha el
        enlace sin texto.
      */}
      {esHT && visitaUuid ? (
        <View className="w-full">
          <EnlacePrecheckin
            visitaUuid={visitaUuid}
            yaEnviado={false}
            cerrado={false}
            datosDelMensaje={datosDelMensaje}
          />
        </View>
      ) : null}

      <Button onPress={onVolver}>Volver al historial</Button>
    </View>
  );
}
