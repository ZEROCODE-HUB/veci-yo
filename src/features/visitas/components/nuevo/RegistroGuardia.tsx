import { theme } from "@/config";
import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Input } from "@/shared/components";

interface Props {
  esGuardia: boolean;
  tieneVehiculo: boolean;
  estacionamientos: { total: number; ocupados: number };
  estacionamientosAsignados: Record<string, string>;
  estacionamientosSel: string[];
  setEstacionamientosSel: React.Dispatch<React.SetStateAction<string[]>>;
  aprobadoPor: string;
  setAprobadoPor: (v: string) => void;
  anotacionesGuardia: string;
  setAnotacionesGuardia: (v: string) => void;
  fotosIngreso: string[];
  setFotosIngreso: React.Dispatch<React.SetStateAction<string[]>>;
}

/**
 * Lo que solo rellena la porteria: estacionamiento asignado, quien autorizo el
 * ingreso, anotaciones y fotos.
 *
 * Quien autoriza se anota por nombre a proposito: muchas veces es alguien que
 * responde por telefono y no tiene cuenta en la aplicacion.
 */
export function RegistroGuardia({
  esGuardia,
  tieneVehiculo,
  estacionamientos,
  estacionamientosAsignados,
  estacionamientosSel,
  setEstacionamientosSel,
  aprobadoPor,
  setAprobadoPor,
  anotacionesGuardia,
  setAnotacionesGuardia,
  fotosIngreso,
  setFotosIngreso,
}: Props) {
  return (
    <>
      {/* Guardia: parking assignment when vehicle is present */}
      {esGuardia && tieneVehiculo && estacionamientos.total > 0 && (
        <View
          className="rounded-2xl p-4 gap-3"
          style={{
            backgroundColor: theme.colors.bgMuted,
            boxShadow: theme.shadows.card,
          }}
        >
          <Text className="text-xs font-semibold text-gray-500">
            Estacionamientos disponibles:{" "}
            {estacionamientos.total -
              Object.keys(estacionamientosAsignados).length}{" "}
            libres
          </Text>
          <View className="flex-row flex-wrap gap-1.5 max-h-[160px]">
            {Array.from({ length: estacionamientos.total }, (_, i) => {
              const spot = `B${String(i + 1).padStart(2, "0")}`;
              const ocupado = !!estacionamientosAsignados[spot];
              const seleccionado = estacionamientosSel.includes(spot);
              return (
                <Pressable
                  key={spot}
                  disabled={ocupado}
                  onPress={() => {
                    if (ocupado) return;
                    setEstacionamientosSel((prev) =>
                      prev.includes(spot)
                        ? prev.filter((s) => s !== spot)
                        : [...prev, spot],
                    );
                  }}
                  className="px-2.5 py-1.5 rounded-full"
                  style={{
                    borderWidth: 1.5,
                    borderColor: seleccionado
                      ? theme.colors.warning
                      : theme.colors.border,
                    backgroundColor: ocupado
                      ? theme.colors.borderLight
                      : seleccionado
                        ? theme.colors.warning
                        : theme.colors.bgCard,
                    opacity: ocupado ? 0.6 : 1,
                  }}
                >
                  <Text
                    className="text-xs font-semibold"
                    style={{
                      color: ocupado
                        ? theme.colors.textMuted
                        : seleccionado
                          ? theme.colors.textInverse
                          : theme.colors.text,
                    }}
                  >
                    {spot}
                    {ocupado ? " • ocupado" : seleccionado ? " ✓" : ""}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text className="text-xs text-gray-400">
            {estacionamientosSel.length
              ? `Seleccionados: ${estacionamientosSel.join(", ")}`
              : "Seleccionados: ninguno"}
          </Text>
        </View>
      )}

      {/* Guardia: anuncio */}
      {esGuardia && (
        <View
          className="rounded-2xl p-4 gap-3"
          style={{
            backgroundColor: theme.colors.bgMuted,
            boxShadow: theme.shadows.card,
          }}
        >
          <Text className="text-base font-semibold text-gray-900">Anuncio</Text>
          <Input
            label="¿Quién aprobó el ingreso? *"
            value={aprobadoPor}
            onChangeText={setAprobadoPor}
            placeholder="Nombre de quien aprobó"
          />
          <Input
            label="Anotaciones adicionales"
            value={anotacionesGuardia}
            onChangeText={setAnotacionesGuardia}
            placeholder="Ej.: ingresó con una maleta, acompañado de..."
            multiline
            rows={3}
          />
        </View>
      )}

      {/* Guardia: photo upload — último campo del anuncio */}
      {esGuardia && (
        <View
          className="rounded-2xl p-4 gap-3"
          style={{
            backgroundColor: theme.colors.bgMuted,
            boxShadow: theme.shadows.card,
          }}
        >
          <Text className="text-sm font-semibold text-gray-900">
            Foto (opcional)
          </Text>
          <Text className="text-xs text-gray-500">
            Tomá una foto del visitante o del vehículo al momento del ingreso.
          </Text>
          <View className="flex-row gap-2">
            {fotosIngreso.map((f, i) => (
              <View
                key={i}
                className="w-20 h-20 rounded-xl items-center justify-center"
                style={{ backgroundColor: theme.colors.border }}
              >
                <Ionicons
                  name="image"
                  size={24}
                  color={theme.colors.textMuted}
                />
              </View>
            ))}
            <Pressable
              accessibilityLabel="Agregar una foto de ingreso"
              onPress={() =>
                setFotosIngreso([...fotosIngreso, `foto_${Date.now()}`])
              }
              className="w-20 h-20 rounded-xl items-center justify-center"
              style={{
                borderWidth: 2,
                borderColor: theme.colors.borderStrong,
                borderStyle: "dashed",
              }}
            >
              <Ionicons
                name="camera"
                size={24}
                color={theme.colors.textMuted}
              />
            </Pressable>
          </View>
        </View>
      )}
    </>
  );
}
