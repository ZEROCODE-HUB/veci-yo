import { theme } from "@/config";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { Button, Modal, Select } from "@/shared/components";
import type { VisitaItem } from "@/shared/types";
import { useEstacionamientosVisita } from "@/features/visitas/hooks/useEstacionamientosVisita";
import { visitasParaEstacionar } from "@/features/visitas/helpers/visitasParaEstacionar";
import { TIPO_LABELS } from "@/features/visitas/constants";

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
  const visitaDe = (visitaId: string | null) =>
    visitas.find((visita) => visita.uuid === visitaId) ?? null;
  /*
    Lo que la portería necesita de quien ocupa el cupo (13/11/2026, cliente:
    «debería salir en qué departamento está, qué tipo de visita es, cuándo
    ingresó»): vivienda y tipo en una línea; ingreso y placa en otra.
  */
  const detalleDe = (visita: VisitaItem | null): string[] => {
    if (!visita) return [];
    const vivienda = [visita.torre ? `Torre ${visita.torre}` : null, visita.depto ? `Depto ${visita.depto}` : null]
      .filter(Boolean)
      .join(" · ");
    const primera = [vivienda || null, TIPO_LABELS[visita.tipo] ?? null].filter(Boolean).join(" · ");
    const placas = (visita.vehiculos ?? []).map((v) => v.placa).filter(Boolean);
    const ingreso = visita.horaIngreso
      ? `Ingresó ${visita.fechaIngreso ? `el ${visita.fechaIngreso} ` : ""}a las ${visita.horaIngreso}`
      : "Todavía no ingresa";
    const segunda = [ingreso, placas.length ? `🚗 ${placas.join(", ")}` : null].filter(Boolean).join(" · ");
    return [primera, segunda].filter(Boolean);
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title="Estacionamientos de visita"
    >
      <View className="gap-3.5">
        <Text className="text-sm text-center text-gray-500">
          Elige la visita que ocupa cada estacionamiento
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
                  <View className="flex-1" style={{ gap: 2 }}>
                    <Text numberOfLines={1} className="text-sm font-semibold text-gray-900">
                      {visitaDe(cupo.visitaId)?.nombre || "Ocupado"}
                    </Text>
                    {detalleDe(visitaDe(cupo.visitaId)).map((linea) => (
                      <Text key={linea} className="text-xs text-gray-600">
                        {linea}
                      </Text>
                    ))}
                  </View>
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
