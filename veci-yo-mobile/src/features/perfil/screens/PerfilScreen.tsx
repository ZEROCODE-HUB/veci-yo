import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, Image } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuthStore, useUIStore } from "@/stores";
import { Button } from "@/shared/components";
import type { PerfilStackParamList } from "@/shared/types";
import { usePerfil } from "../hooks/usePerfil";
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
  const {
    nombre,
    esGuardia,
    guardiaActual,
    turnoActual,
    alias,
    usaAliasCuadroHonor,
    usaAliasZonas,
    actualizarAlias,
  } = usePerfil();
  const { addToast } = useUIStore();

  const [aliasLocal, setAliasLocal] = useState(alias || "GuilleSv");
  const [usaCuadroHonor, setUsaCuadroHonor] = useState(usaAliasCuadroHonor);
  const [usaZonas, setUsaZonas] = useState(usaAliasZonas);

  const guardarAlias = () => {
    actualizarAlias({
      alias: aliasLocal.trim() || "GuilleSv",
      cuadroHonor: usaCuadroHonor,
      zonas: usaZonas,
    });
    addToast("Alias actualizado", "success");
  };

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
          shadowColor: "#000",
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
              borderColor: "#F5B800",
              backgroundColor: "#E8E4DC",
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
              backgroundColor: "#fff",
              borderWidth: 1.5,
              borderColor: "#E5E7EB",
              shadowColor: "#000",
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
        style={{ backgroundColor: "#FEF3C7" }}
      >
        <Text style={{ fontSize: 18, marginTop: 1 }}>ℹ️</Text>
        <Text
          className="flex-1 text-xs"
          style={{ color: "#92400E", lineHeight: 18 }}
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
          alias={aliasLocal}
          usaCuadroHonor={usaCuadroHonor}
          usaZonas={usaZonas}
          onAliasChange={setAliasLocal}
          onCuadroHonorChange={setUsaCuadroHonor}
          onZonasChange={setUsaZonas}
          onGuardar={guardarAlias}
        />
      )}

      {/* Soporte / Cerrar sesión */}
      <View className="gap-3">
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
