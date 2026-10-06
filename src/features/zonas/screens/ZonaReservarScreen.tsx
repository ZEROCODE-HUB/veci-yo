import { theme } from "@/config";
import React, { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Button, Modal, Cargando } from "@/shared/components";
import { PageHeader } from "@/shared/layouts";
import { useAuthStore } from "@/stores";
import { useZonas } from "../hooks";
import { ZonaReservaForm } from "@/features/zonas/components";
import { useNavegacion, useParametros } from "@/shared/hooks";

interface SuccessReservation {
  depto: string;
  hora: string;
  reservaNum: string;
  /** Que puesto toco: la lavadora N°2. Nulo si la zona tiene uno solo. */
  puesto: number | null;
  zona: string;
}

export function ZonaReservarScreen() {
  const navigation = useNavegacion();
  const parametros = useParametros("ZonaReservar");
  const rol = useAuthStore((state) => state.rolActivo);
  const { zonasComunesConfig, cargando } = useZonas();
  const zona = zonasComunesConfig[parametros.zonaId];
  const [successReservation, setSuccessReservation] =
    useState<SuccessReservation | null>(null);

  const closeSuccess = () => {
    setSuccessReservation(null);
    navigation.goBack();
  };

  // La zona puede no existir: la pantalla se abre con un id de la ruta.
  if (!zona) {
    return (
      <View className="flex-1 bg-white">
        <PageHeader title="Reserva" />
        {/*
          Dos cosas distintas, y antes compartían un `Text`: mientras carga se
          dice que carga, y cuando ya se sabe que no está, se dice eso. Juntarlas
          en una ternaria hacía que el «ya no está disponible» pareciera un
          estado de carga más.
        */}
        {cargando ? (
          <Cargando texto="la zona" />
        ) : (
          <Text className="text-center text-gray-500 py-10">
            Esta zona común ya no está disponible.
          </Text>
        )}
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <PageHeader title={`Reserva ${zona.nombre}`} />
      <ScrollView className="flex-1" contentContainerClassName="gap-3.5">
        <ZonaReservaForm
          zona={zona}
          rol={rol}
          initialHour={parametros?.horaPre}
          initialDate={parametros?.fechaPre}
          initialDepartment={parametros?.deptoReserva}
          onSuccess={setSuccessReservation}
        />
      </ScrollView>
      <Modal
        visible={!!successReservation}
        onClose={closeSuccess}
        title={`Reserva ${zona.nombre} N°${successReservation?.reservaNum || ""}`}
      >
        <View className="items-center gap-4">
          <Text className="text-lg font-semibold text-center">
            Se reservo con exito la zona comun
          </Text>
          <View
            className="w-full rounded-2xl p-4 gap-2"
            style={{ borderWidth: 1.5, borderColor: theme.colors.primary }}
          >
            <Text className="font-bold">{successReservation?.depto}</Text>
            <Text className="text-sm text-gray-500">
              Reserva N°: {successReservation?.reservaNum}
            </Text>
            <Text className="text-sm text-gray-500">
              {successReservation?.hora}
            </Text>
            {/*
              Cual toco. Se elegia la lavadora y luego no habia forma de saber
              a cual ir: el puesto se guardaba y no se releia en ninguna
              pantalla.
            */}
            {!!successReservation?.puesto && (
              <Text className="text-sm font-semibold text-gray-900">
                {successReservation.zona} N°{successReservation.puesto}
              </Text>
            )}
          </View>
          <Button fullWidth onPress={closeSuccess}>
            Entendido
          </Button>
        </View>
      </Modal>
    </View>
  );
}
