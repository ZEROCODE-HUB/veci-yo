import React from "react";
import { View, Text, Pressable, FlatList, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { VisitaItem } from "@/shared/types";
import { TIPO_LABELS } from "@/data";
import { TIPO_VISITA_ASSETS } from "../tipoVisitaAssets";
import { obtenerPersonasDeVisita } from "../../helpers/visitas.helpers";

interface VisitasPersonasViewProps {
  item: VisitaItem;
  onBack: () => void;
  onSelectPerson: (personIndex: number) => void;
}

export function VisitasPersonasView({
  item,
  onBack,
  onSelectPerson,
}: VisitasPersonasViewProps) {
  const personas = obtenerPersonasDeVisita(item);
  const tipoIcon = TIPO_VISITA_ASSETS[item.tipo] || TIPO_VISITA_ASSETS.amigos;
  const nombreVisita = item.esEvento ? item.nombreEvento : item.nombre;

  return (
    <View className="flex-1 bg-white">
      <FlatList
        data={personas}
        keyExtractor={(person, index) => `${item.id}-${person.idx}-${index}`}
        contentContainerClassName="px-4 pb-5"
        contentContainerStyle={{ paddingTop: 12, gap: 12 }}
        ListHeaderComponent={
          <View className="gap-2.5">
            <Pressable
              onPress={onBack}
              className="flex-row items-center gap-1.5 self-start py-2"
            >
              <Ionicons name="arrow-back" size={18} color="#F5B800" />
              <Text className="text-sm font-semibold text-primary">
                Volver a visitas
              </Text>
            </Pressable>
            <Text className="text-sm font-semibold text-gray-500">
              {nombreVisita} · {TIPO_LABELS[item.tipo] || item.tipo} ·{" "}
              {item.fechaDesde}
              {item.fechaHasta ? ` a ${item.fechaHasta}` : ""}
            </Text>
          </View>
        }
        renderItem={({ item: person }) => (
          <Pressable
            onPress={() => onSelectPerson(person.idx)}
            className="flex-row items-center justify-between rounded-2xl bg-white p-3.5 active:opacity-80"
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
          >
            <View className="flex-row items-center gap-2.5 flex-1">
              <Image
                source={tipoIcon}
                style={{ width: 40, height: 40, borderRadius: 9999 }}
                resizeMode="cover"
              />
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900">
                  {person.nombre}{" "}
                  {person.esTitular ? (
                    <Text className="text-[10px] text-gray-400">(Titular)</Text>
                  ) : null}
                </Text>
                {person.ci ? (
                  <Text className="text-xs text-gray-500">
                    DNI: {person.ci}
                  </Text>
                ) : null}
                {person.horaIngreso ? (
                  <Text className="text-xs text-gray-500">
                    Ingreso: {person.horaIngreso}
                    {person.horaSalida ? ` · Salida: ${person.horaSalida}` : ""}
                  </Text>
                ) : null}
              </View>
            </View>
            <Text className="text-sm text-primary">Ver detalles →</Text>
          </Pressable>
        )}
      />
    </View>
  );
}
