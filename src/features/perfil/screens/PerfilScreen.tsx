import { theme } from "@/config";
import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, Image } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuthStore, useUIStore } from "@/stores";
import { Button } from "@/shared/components";
import type { PerfilStackParamList } from "@/shared/types";
import { usePerfil } from "../hooks/usePerfil";
import { useAlias } from "../hooks/useAlias";
import {
  PerfilAccionCard,
  PerfilAliasCard,
  PerfilOpcionFila,
  PerfilTurnoCard,
} from "../components/perfil";

const avatarDefault = require("@/assets/avatars/perfil-default.png");
const iconSeguridad = require("@/assets/icons/perfil/seguridad.png");
const iconSOS = require("@/assets/icons/perfil/sos.png");

type Nav = NativeStackNavigationProp<PerfilStackParamList>;

export function PerfilScreen() {
  const navigation = useNavigation<Nav>();
  const { cerrarSesion } = useAuthStore();
  const rolesDisponibles = useAuthStore((s) => s.rolesDisponibles);
  const setRolActivo = useAuthStore((s) => s.setRolActivo);
  const { nombre, esGuardia, esHuespedTemporal, guardiaActual, turnoActual } =
    usePerfil();
  const aliasForm = useAlias();

  const handleCerrarSesion = () => {
    cerrarSesion();
  };

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerClassName="p-4 gap-4"
    >
      {/* Avatar + nombre + Configuración */}
      <View
        className="bg-white rounded-xl py-6 px-4 items-center gap-3"
        style={{
          shadowColor: theme.colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        <View>
          <View
            className="rounded-full overflow-hidden items-center justify-center"
            style={{
              width: 110,
              height: 110,
              borderWidth: 3,
              borderColor: theme.colors.primary,
              backgroundColor: theme.colors.bgVivienda,
            }}
          >
            <Image
              source={avatarDefault}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
          </View>
          <Pressable
            className="absolute -bottom-0.5 -right-0.5 items-center justify-center rounded-full"
            style={{
              width: 32,
              height: 32,
              backgroundColor: theme.colors.bgCard,
              borderWidth: 1.5,
              borderColor: theme.colors.border,
              shadowColor: theme.colors.shadow,
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 2,
            }}
          >
            <Text style={{ fontSize: 15 }}>📷</Text>
          </Pressable>
        </View>

        <Text className="text-xl font-bold text-gray-900">{nombre}</Text>

        <Button
          variant="primary"
          fullWidth
          onPress={() => navigation.navigate("Configuracion")}
        >
          Configuración
        </Button>
      </View>

      {/* Seguridad / S.O.S */}
      <View className="flex-row gap-3">
        <PerfilAccionCard
          icon={iconSeguridad}
          label="Seguridad"
          onPress={() => navigation.navigate("Seguridad")}
        />
        <PerfilAccionCard
          icon={iconSOS}
          label="S.O.S"
          onPress={() => navigation.navigate("SOS")}
        />
      </View>

      {/* Info SOS */}
      <View
        className="flex-row gap-2.5 p-3.5 rounded-xl"
        style={{ backgroundColor: theme.colors.warningLight }}
      >
        <Text style={{ fontSize: 18, marginTop: 1 }}>ℹ️</Text>
        <Text
          className="flex-1 text-xs"
          style={{ color: theme.colors.iconAmberDark, lineHeight: 18 }}
        >
          El botón de S.O.S activa una alarma sonora en la aplicación que es
          recibida por todos los guardias de seguridad de turno en ese momento.
          Se brindan los datos de la persona que activó la alarma: departamento,
          nombre y demás datos relevantes.
        </Text>
      </View>

      {/* Turno actual — solo para guardia */}
      {esGuardia && guardiaActual && (
        <PerfilTurnoCard guardia={guardiaActual} turno={turnoActual} />
      )}

      {/* Alias / Anonimato — oculto para guardia */}
      {!esGuardia && (
        <PerfilAliasCard
          alias={aliasForm.alias}
          usaCuadroHonor={aliasForm.usaEnCuadroHonor}
          usaZonas={aliasForm.usaEnZonas}
          guardando={aliasForm.guardando}
          onAliasChange={aliasForm.setAlias}
          onCuadroHonorChange={aliasForm.setUsaEnCuadroHonor}
          onZonasChange={aliasForm.setUsaEnZonas}
          onGuardar={aliasForm.guardar}
          ocultarCuadroHonor={esHuespedTemporal}
        />
      )}

      {/* Soporte / Cerrar sesión */}
      <View className="gap-3">
        {/*
          Cambiar de rol sin cerrar sesion.

          `setRolActivo` solo se llamaba desde la pantalla de seleccion, que
          sale UNA vez al entrar. Marcela es administradora del edificio y
          propietaria de la 301 a la vez, y para pasar de un sombrero al otro
          tenia que cerrar sesion y volver a entrar. Con dos roles es molesto;
          con la sesion guardada en el movil, es la unica salida.

          Solo aparece con mas de un rol: a quien tiene uno no hay nada que
          preguntarle.
        */}
        {rolesDisponibles.length > 1 && (
          <PerfilOpcionFila
            emoji="🔁"
            label="Cambiar de rol"
            onPress={() => setRolActivo(null)}
          />
        )}
        <PerfilOpcionFila
          emoji="🎧"
          label="Soporte"
          onPress={() => navigation.navigate("Soporte")}
        />
        <PerfilOpcionFila
          emoji="🚪"
          label="Cerrar sesión"
          onPress={handleCerrarSesion}
        />
      </View>

      <View className="h-6" />
    </ScrollView>
  );
}
