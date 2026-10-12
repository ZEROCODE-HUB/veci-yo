import { theme } from "@/config";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { Button, Modal, Select } from "@/shared/components";
import type { VisitaItem } from "@/shared/types";
import { useEstacionamientosVisita } from "@/features/visitas/hooks/useEstacionamientosVisita";
import { visitasParaEstacionar } from "@/features/visitas/helpers/visitasParaEstacionar";

interface Props {
  visible: boolean;
  onClose: () => void;
  visitas: VisitaItem[];
}

/**
 * Los estacionamientos de visita del edificio, y quien ocupa cada uno.
 *
 * Esta ventana pintaba veinte casillas inventadas --`B01`..`B20`-- y guardaba
 * lo elegido en memoria: se perdia al recargar y no coincidia con ningun cupo
 * real. Lo vio el cliente el 12/10/2026. Ahora son las filas de
 * `estacionamiento`, y elegir una visita la asigna en ese momento.
 */
export function EstacionamientosDeVisitaModal({
  visible,
  onClose,
  visitas,
}: Props) {
  const { cupos, cargando, asignar, asignando, liberar, liberando } =
    useEstacionamientosVisita();
  const opciones = visitasParaEstacionar(visitas);
  const nombreDe = (visitaId: string | null) =>
    visitas.find((visita) => visita.uuid === visitaId)?.nombre || "Ocupado";

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title="Estacionamientos de visita"
    >
      <View className="gap-3.5">
        <Text className="text-sm text-center text-gray-500">
          Elija la visita que ocupa cada estacionamiento
        </Text>

        {!cargando && cupos.length === 0 ? (
          <Text className="text-sm text-gray-400 text-center py-4">
            Este condominio no tiene estacionamientos de visita registrados.
          </Text>
        ) : null}

        <View className="gap-2">
          {cupos.map((cupo) => (
            <View
              key={cupo.uuid}
              className={`flex-row items-center gap-2 rounded-xl px-3 py-2 ${cupo.ocupado ? "border border-green-500 bg-green-50" : "border border-gray-200 bg-gray-50"}`}
            >
              <View className="min-w-[64px]">
                <Text className="text-sm font-bold text-gray-900">
                  {cupo.codigo}
                </Text>
                {cupo.ubicacion ? (
                  <Text className="text-2xs text-gray-500">
                    {cupo.ubicacion}
                  </Text>
                ) : null}
              </View>
              {cupo.ocupado ? (
                <>
                  <Text
                    numberOfLines={1}
                    className="flex-1 text-sm text-gray-900"
                  >
                    {nombreDe(cupo.visitaId)}
                  </Text>
                  <Pressable
                    onPress={() => liberar(cupo.uuid)}
                    disabled={liberando}
                    accessibilityRole="button"
                    accessibilityLabel={`Liberar el estacionamiento ${cupo.codigo}`}
                    className="rounded-full px-2.5 py-1"
                    style={{ backgroundColor: theme.colors.warningLight }}
                  >
                    <Text className="text-2xs font-semibold text-amber-800">
                      Liberar
                    </Text>
                  </Pressable>
                </>
              ) : (
                <View className="flex-1">
                  <Select
                    value=""
                    options={opciones}
                    placeholder="— Libre —"
                    textoSinOpciones="Hoy no hay visitas registradas"
                    onChange={(visitaId) => {
                      if (!asignando) asignar(cupo.uuid, String(visitaId));
                    }}
                  />
                </View>
              )}
            </View>
          ))}
        </View>

        <Button fullWidth onPress={onClose}>
          Cerrar
        </Button>
      </View>
    </Modal>
  );
}
