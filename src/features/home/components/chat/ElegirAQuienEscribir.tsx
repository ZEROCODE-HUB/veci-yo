import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Button } from "@/shared/components";
import type { PersonalDePorteria } from "../../services/personalDePorteria.repo";
import {
  etiquetaDelPersonal,
  resumenDelHorario,
  textoDeProximaEntrada,
} from "../../helpers/turnoDelPersonal";

export interface OpcionDeVivienda {
  unidadId: string;
  etiqueta: string;
}

interface Props {
  viviendas: OpcionDeVivienda[];
  viviendaId: string;
  onVivienda: (unidadId: string) => void;
  personal: PersonalDePorteria[];
  cargandoPersonal: boolean;
  /** `porteria:<membresiaId>` o `administracion`. */
  elegido: string;
  onElegir: (clave: string) => void;
  onStartChat: () => void;
  abriendo: boolean;
}

/**
 * «¿Con quién quieres hablar?» para un vecino (17/11/2026, pedido aprobado
 * por el cliente). Antes era un desplegable con «Seguridad» y
 * «Administración». Ahora la portería sale persona a persona, con su cargo
 * delante --«Conserje · Federico Valverde»--, y solo se puede elegir a quien
 * está de turno; los demás salen en gris con su horario.
 *
 * Quién está de turno lo dice la base con el reloj del edificio. Sin horario
 * cargado cuenta como de turno, para no dejar a nadie sin poder escribir.
 */
export function ElegirAQuienEscribir({
  viviendas,
  viviendaId,
  onVivienda,
  personal,
  cargandoPersonal,
  elegido,
  onElegir,
  onStartChat,
  abriendo,
}: Props) {
  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerClassName="p-4 gap-4">
      <Text className="text-base font-semibold text-gray-900">¿Con quién quieres hablar?</Text>

      {viviendas.length > 1 ? (
        <View className="gap-2">
          <Text className="text-sm text-gray-600">Desde tu vivienda</Text>
          <View className="flex-row flex-wrap gap-2">
            {viviendas.map((v) => {
              const activa = v.unidadId === viviendaId;
              return (
                <Pressable
                  key={v.unidadId}
                  accessibilityRole="radio"
                  aria-checked={activa}
                  accessibilityState={{ checked: activa }}
                  onPress={() => onVivienda(v.unidadId)}
                  className={`rounded-full border px-3 py-1.5 ${activa ? "border-primary bg-primary-light" : "border-gray-200 bg-white"}`}
                >
                  <Text className="text-sm text-gray-900">{v.etiqueta}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      <View className="gap-2">
        <Text className="text-sm font-semibold text-gray-700">Portería</Text>
        {cargandoPersonal ? (
          <Text className="text-sm text-gray-500">Cargando quién está de turno…</Text>
        ) : personal.length === 0 ? (
          <Text className="text-sm text-gray-500">
            Nadie de la portería tiene el chat habilitado. Puedes escribir a la Administración.
          </Text>
        ) : (
          personal.map((p) => (
            <FilaDelPersonal
              key={p.membresiaId}
              persona={p}
              elegida={elegido === `porteria:${p.membresiaId}`}
              onPress={() => onElegir(`porteria:${p.membresiaId}`)}
            />
          ))
        )}
      </View>

      <View className="gap-2">
        <Text className="text-sm font-semibold text-gray-700">Oficina</Text>
        <Opcion
          titulo="Administración"
          elegida={elegido === "administracion"}
          onPress={() => onElegir("administracion")}
        />
      </View>

      <Text className="text-xs leading-4 text-gray-500">
        La conversación queda con tu vivienda: si quien te atiende termina su turno, la sigue
        quien entre.
      </Text>

      <View className="mt-2">
        <Button
          variant="primary"
          fullWidth
          onPress={onStartChat}
          disabled={!elegido || !viviendaId || abriendo}
        >
          {abriendo ? "Abriendo..." : "Iniciar conversación"}
        </Button>
      </View>
    </ScrollView>
  );
}

function FilaDelPersonal({
  persona,
  elegida,
  onPress,
}: {
  persona: PersonalDePorteria;
  elegida: boolean;
  onPress: () => void;
}) {
  const horario = { turnos: persona.turnos, ajustes: persona.ajustes };
  const detalle = persona.deTurno
    ? "De turno ahora"
    : [textoDeProximaEntrada(horario, persona.ahoraLocal), resumenDelHorario(persona.turnos)]
        .filter(Boolean)
        .join(" · ") || "Fuera de turno";

  return (
    <Opcion
      titulo={etiquetaDelPersonal(persona.cargoEtiqueta, persona.nombre)}
      detalle={detalle}
      elegida={elegida}
      deshabilitada={!persona.deTurno}
      onPress={onPress}
    />
  );
}

function Opcion({
  titulo,
  detalle,
  elegida,
  deshabilitada = false,
  onPress,
}: {
  titulo: string;
  detalle?: string;
  elegida: boolean;
  deshabilitada?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={detalle ? `${titulo}. ${detalle}` : titulo}
      aria-checked={elegida}
      aria-disabled={deshabilitada}
      accessibilityState={{ checked: elegida, disabled: deshabilitada }}
      disabled={deshabilitada}
      onPress={onPress}
      className={`flex-row items-center gap-3 rounded-xl border p-3 ${
        deshabilitada
          ? "border-gray-100 bg-gray-100"
          : elegida
            ? "border-primary bg-primary-light"
            : "border-gray-200 bg-white"
      }`}
    >
      <View
        className={`h-5 w-5 items-center justify-center rounded-full border-2 ${
          elegida ? "border-primary" : "border-gray-300"
        }`}
      >
        {elegida ? <View className="h-2.5 w-2.5 rounded-full bg-primary" /> : null}
      </View>
      <View className="flex-1">
        <Text
          className={`text-sm font-semibold ${deshabilitada ? "text-gray-400" : "text-gray-900"}`}
        >
          {titulo}
        </Text>
        {detalle ? (
          <Text className={`text-xs ${deshabilitada ? "text-gray-400" : "text-green-700"}`}>
            {detalle}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
