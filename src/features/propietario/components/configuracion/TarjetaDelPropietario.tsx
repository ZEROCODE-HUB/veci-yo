import React from "react";
import { Text, View } from "react-native";
import { theme } from "@/config";
import { Checkbox, Toggle } from "@/shared/components";
import { Etiqueta } from "./Etiqueta";
import { ESTILO_DE_TARJETA, ROL_COLORES } from "./gruposDeResidentes";

interface Props {
  nombre: string;
  anfitrionPrimario: boolean;
  administradorPrimario: boolean;
  esResidente: boolean;
  /** Si la vivienda se alquila por noches ahora: solo entonces el anfitrión no puede ser residente. */
  rentaCortaEnMarcha: boolean;
  /** Se alquila por noches o le quedan reservas (D-70): no se puede ser residente. */
  viviendaEnAlquiler?: boolean;
  /** Pide confirmar el cambio de residente a no residente, o al revés. */
  onCambiarResidencia: () => void;
  onMarcarAnfitrion: () => void;
  onMarcarAdministrador: () => void;
}

/** La tarjeta del propietario en la configuración de su vivienda. */
export function TarjetaDelPropietario({
  nombre,
  anfitrionPrimario,
  administradorPrimario,
  esResidente,
  rentaCortaEnMarcha,
  viviendaEnAlquiler = false,
  onCambiarResidencia,
  onMarcarAnfitrion,
  onMarcarAdministrador,
}: Props) {
  const rolResidencia = esResidente ? "Residente" : "Corresidente";
  return (
    <>
      <Text className="text-sm font-bold text-gray-900 mt-1">Propietario</Text>
      <View className="rounded-2xl p-4" style={ESTILO_DE_TARJETA}>
        <View className="flex-row items-start justify-between">
          <View className="flex-1" style={{ minWidth: 0 }}>
            <Text className="text-base font-semibold text-gray-900 mb-1.5">{nombre}</Text>
            {/*
              Todas las etiquetas en una sola fila, que salta de línea sola si la
              pantalla es angosta. Las de «primario» iban pegadas al nombre, como
              texto, y las de rol en otra fila (Para Claude, 21/10/2026).
            */}
            <View className="flex-row flex-wrap items-center gap-1.5 mb-2">
              {anfitrionPrimario ? (
                <Etiqueta
                  texto="Anfitrión primario"
                  fondo={theme.colors.primaryLight}
                  color={theme.colors.primary}
                />
              ) : null}
              {administradorPrimario ? (
                <Etiqueta
                  texto="Admin primario"
                  fondo={theme.colors.accentPink}
                  color={theme.colors.accentPinkText}
                />
              ) : null}
              <Etiqueta
                texto="Propietario"
                fondo={ROL_COLORES["Propietario"].bg}
                color={ROL_COLORES["Propietario"].color}
              />
              <Etiqueta
                texto={esResidente ? "Residente" : "No residente"}
                fondo={ROL_COLORES[rolResidencia].bg}
                color={ROL_COLORES[rolResidencia].color}
              />
            </View>
            {/*
              Una vivienda o es para vivir o es para alquilar por noches
              (D-70, 29/10/2026; la base lo sujeta): mientras se alquila o le
              quedan huéspedes, no se ofrece ser residente. Quien ya lo era
              puede dejar de serlo.
            */}
            {(viviendaEnAlquiler || (anfitrionPrimario && rentaCortaEnMarcha)) && !esResidente ? (
              <Text className="shrink text-xs mt-1" style={{ color: theme.colors.textSecondary }}>
                Esta vivienda se alquila por noches (o le quedan reservas): no puedes ser residente. Da de baja la renta corta y, cuando terminen las reservas, podrás declararte residente.
              </Text>
            ) : (
              <View className="flex-row items-center gap-2 mt-1">
                <Text className="shrink text-xs" style={{ color: theme.colors.textSecondary }}>
                  Residente:
                </Text>
                <Toggle value={esResidente} onChange={onCambiarResidencia} />
              </View>
            )}
          </View>
        </View>
        <View
          className="flex-col gap-1.5 mt-3 pt-3"
          style={{ borderTopWidth: 1, borderTopColor: theme.colors.borderLight }}
        >
          <Checkbox
            checked={anfitrionPrimario}
            onChange={onMarcarAnfitrion}
            label="Anfitrión primario"
          />
          <Checkbox
            checked={administradorPrimario}
            onChange={onMarcarAdministrador}
            label="Administrador primario"
          />
          <Text className="text-xs" style={{ color: theme.colors.textMuted }}>
            Por defecto el propietario es anfitrión y administrador primario.
            Puedes reasignarlo.
          </Text>
        </View>
      </View>
    </>
  );
}
