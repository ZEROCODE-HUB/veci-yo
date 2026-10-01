import { theme } from "@/config";
import React from "react";
import { View, Text, Pressable } from "react-native";
import { Button, Modal } from "@/shared/components";
import type { VisitaItem } from "@/shared/types";
import { useEstacionamientosVisita } from "../../hooks/useEstacionamientosVisita";

interface Props {
  visita: VisitaItem | null;
  onClose: () => void;
}

/**
 * Asignacion de un cupo de visita.
 *
 * Los cupos eran `B01`..`B20` generados en el cliente. Ahora son los
 * estacionamientos que el condominio tiene registrados, con su codigo.
 */
export function AsignarEstacionamientoModal({ visita, onClose }: Props) {
  const { cupos, cargando, asignar, asignando, liberar, liberando } =
    useEstacionamientosVisita();
  const [elegido, setElegido] = React.useState("");

  React.useEffect(() => {
    if (!visita) setElegido("");
  }, [visita]);

  const confirmar = () => {
    const uuidVisita = (visita as unknown as { uuid?: string })?.uuid;
    if (!elegido || !uuidVisita) return;
    asignar(elegido, uuidVisita);
    onClose();
  };

  return (
    <Modal
      visible={!!visita}
      onClose={onClose}
      title="Asignar estacionamiento"
    >
      {visita && (
        <View className="gap-3">
          <Text className="text-sm text-gray-500 text-center">
            Asigne un cupo disponible al visitante
          </Text>
          <Text className="text-sm text-gray-900">
            Visitante: <Text className="font-bold">{visita.nombre}</Text>
          </Text>

          {!cargando && cupos.length === 0 && (
            <Text className="text-sm text-gray-400 text-center py-4">
              Este condominio no tiene estacionamientos de visita registrados.
            </Text>
          )}

          <View className="gap-2">
            {cupos.map((cupo) => {
              const seleccionado = elegido === cupo.uuid;
              return (
                <Pressable
                  key={cupo.uuid}
                  disabled={cupo.ocupado}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: seleccionado }}
                  aria-checked={seleccionado}
                  onPress={() => setElegido(cupo.uuid)}
                  className="flex-row items-center justify-between rounded-xl px-3.5 py-3"
                  style={{
                    borderWidth: 2,
                    borderColor: seleccionado
                      ? theme.colors.secondary
                      : theme.colors.border,
                    backgroundColor: seleccionado
                      ? theme.colors.secondaryLight
                      : cupo.ocupado
                        ? theme.colors.borderLight
                        : theme.colors.bgCard,
                    opacity: cupo.ocupado ? 0.65 : 1,
                  }}
                >
                  <View>
                    <Text className="text-sm font-bold text-gray-900">
                      {cupo.codigo}
                    </Text>
                    {!!cupo.ubicacion && (
                      <Text className="text-2xs text-gray-500">
                        {cupo.ubicacion}
                      </Text>
                    )}
                  </View>
                  {/*
                    Un cupo ocupado se puede soltar a mano. Normalmente se
                    suelta solo --cuando la visita termina o se cancela-- pero
                    si alguien **deshace** una salida, el cupo se queda tomado
                    sin nadie dentro y no habia forma de liberarlo (R-8, R-19).
                  */}
                  {cupo.ocupado && !seleccionado ? (
                    <Pressable
                      onPress={(evento) => {
                        evento.stopPropagation();
                        liberar(cupo.uuid);
                      }}
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
                  ) : (
                    <Text className="text-xs text-gray-500">
                      {seleccionado ? "Seleccionado" : "Disponible"}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>

          <Button disabled={!elegido || asignando} onPress={confirmar}>
            {asignando ? "Asignando..." : "Confirmar asignación"}
          </Button>
        </View>
      )}
    </Modal>
  );
}
