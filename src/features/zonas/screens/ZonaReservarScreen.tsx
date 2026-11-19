import { theme } from "@/config";
import React, { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Button, Modal, Cargando, ErrorAlCargar } from "@/shared/components";
import { PageHeader } from "@/shared/layouts";
import { useAuthStore } from "@/stores";
import { useZonas } from "../hooks";
import { ZonaReservaForm } from "@/features/zonas/components";
import { useNavegacion, useParametros, usePermisosEnLaVivienda } from "@/shared/hooks";
import { Ionicons } from "@expo/vector-icons";
import type { ReservaHecha } from "../hooks/useZonaReservaForm";

type SuccessReservation = ReservaHecha;

/** Una línea de la tarjeta de la reserva: icono, qué es y el dato. */
function Dato({ icono, etiqueta, valor }: { icono: keyof typeof Ionicons.glyphMap; etiqueta: string; valor: string }) {
  return (
    <View className="flex-row items-center gap-3">
      <Ionicons name={icono} size={18} color={theme.colors.primaryDark} />
      <View className="flex-1">
        <Text className="text-xs text-gray-500">{etiqueta}</Text>
        <Text className="text-sm font-semibold text-gray-900">{valor}</Text>
      </View>
    </View>
  );
}

export function ZonaReservarScreen() {
  const navigation = useNavegacion();
  const parametros = useParametros("ZonaReservar");
  const rol = useAuthStore((state) => state.rolActivo);
  const permisos = usePermisosEnLaVivienda();
  // La administración y la portería reservan por una vivienda; su rol de
  // vivienda no cuenta aquí (huecos 9 y 14).
  const reservaPorSuVivienda = rol !== "administrador" && rol !== "guardia" && rol !== "huesped-temporal";
  const { zonasComunesConfig, cargando, estadoZonas } = useZonas();
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
        ) : estadoZonas.fallo ? (
          // Una red caída no es una zona borrada (13/11/2026).
          <ErrorAlCargar texto="la zona" reintentar={estadoZonas.reintentar} />
        ) : (
          <Text className="text-center text-gray-500 py-10">
            Esta zona común ya no está disponible.
          </Text>
        )}
      </View>
    );
  }

  /*
    Mientras no se sabe si su rol puede reservar, `puede` responde «sí» por
    defecto: se pintaba el formulario y, al llegar la respuesta, se cambiaba
    por el aviso de que no puede (13/11/2026). Se espera.
  */
  if (reservaPorSuVivienda && permisos.cargando) {
    return (
      <View className="flex-1 bg-white">
        <PageHeader title={`Reserva ${zona.nombre}`} />
        <Cargando texto="la reserva" forma="formulario" />
      </View>
    );
  }

  if (reservaPorSuVivienda && !permisos.puede("reservar_zonas")) {
    return (
      <View className="flex-1 bg-white">
        <PageHeader title={`Reserva ${zona.nombre}`} />
        <Text className="text-center text-gray-500 py-10 px-6">
          Tu rol en esta vivienda no puede reservar zonas comunes. Lo decide el
          administrador de la app; si lo necesitas, pídeselo a quien gestiona tu
          vivienda.
        </Text>
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
          initialComments={parametros?.anotaciones}
          onSuccess={setSuccessReservation}
        />
      </ScrollView>
      {/*
        La tarjeta de la reserva (18/11/2026, pedido del cliente: «se ve
        horrible, dice 101 pero 101 qué»). Cada dato con su nombre; el número
        de reserva, pequeño y rotulado; y lo que falta, si falta algo.
      */}
      <Modal
        visible={!!successReservation}
        onClose={closeSuccess}
        title={successReservation?.pendiente ? "Reserva pendiente" : "Reserva confirmada"}
      >
        <View className="gap-4">
          <View className="items-center gap-1">
            <Ionicons
              name={successReservation?.pendiente ? "time-outline" : "checkmark-circle"}
              size={44}
              color={successReservation?.pendiente ? theme.colors.badgeAmberText : theme.colors.success}
            />
            <Text className="text-base font-semibold text-center text-gray-900">
              {successReservation?.pendiente
                ? "La administración tiene que aprobarla"
                : "Tu reserva quedó confirmada"}
            </Text>
          </View>
          <View
            className="rounded-2xl p-4 gap-3"
            style={{ backgroundColor: theme.colors.bgMuted, borderWidth: 1, borderColor: theme.colors.border }}
          >
            <Dato
              icono="location-outline"
              etiqueta="Zona"
              valor={successReservation?.puestoNombre || successReservation?.zona || zona.nombre}
            />
            <Dato icono="calendar-outline" etiqueta="Fecha" valor={successReservation?.fecha ?? ""} />
            <Dato icono="time-outline" etiqueta="Hora" valor={successReservation?.hora ?? ""} />
            <Dato icono="home-outline" etiqueta="Vivienda" valor={`Dpto ${successReservation?.depto ?? ""}`} />
            <Dato
              icono="people-outline"
              etiqueta="Personas"
              valor={
                successReservation?.personas === 1 ? "Solo tú" : `${successReservation?.personas ?? 1} personas, contigo`
              }
            />
            <Text className="text-xs text-gray-400">N° de reserva: {successReservation?.reservaNum}</Text>
          </View>
          {successReservation?.faltaComprobante ? (
            <View className="rounded-xl p-3" style={{ backgroundColor: theme.colors.warningLight }}>
              <Text className="text-xs leading-4 text-gray-800">
                {successReservation.plazoAdjuntoHoras > 0
                  ? `Falta el comprobante de pago. Adjúntalo desde «Mis reservas» en las próximas ${successReservation.plazoAdjuntoHoras} horas; si no, la reserva se cancela sola.`
                  : "Falta el comprobante de pago. Adjúntalo desde «Mis reservas»."}
              </Text>
            </View>
          ) : successReservation?.pendiente ? (
            <Text className="text-xs text-center text-gray-500">
              Te avisaremos cuando la apruebe o la rechace.
            </Text>
          ) : null}
          <Button fullWidth onPress={closeSuccess}>
            Entendido
          </Button>
        </View>
      </Modal>
    </View>
  );
}
