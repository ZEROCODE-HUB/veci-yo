import { theme } from "@/config";
import React, { useState } from "react";
import { View, Text, Pressable, Modal, FlatList } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUbicacionStore } from "@/stores/ubicacion-store";
import { useAuthStore } from "@/stores/auth-store";
import { Logo } from "@/shared/components/ui/Logo";
import { InfoButton } from "@/shared/components/ui/InfoButton";
import { navigateToActiveTab } from "@/navigation/helpers/navigation.helpers";
import { useNotificacionesSinLeer } from "@/features/home/hooks/useNotificaciones";
import { VeloModal } from "@/shared/components/ui/VeloModal";

type TopBarProps = {
  navigation?: any;
};

export function TopBar({ navigation: navigationProp }: TopBarProps) {
  const contextNavigation = useNavigation<any>();
  const navigation = navigationProp ?? contextNavigation;
  const { ubicaciones, edificioActivo, toggleFavoritoUbicacion } =
    useUbicacionStore();
  const { rolActivo } = useAuthStore();
  const sinLeer = useNotificacionesSinLeer();
  const insets = useSafeAreaInsets();

  const [open, setOpen] = useState(false);

  const ubicacionActiva = ubicaciones.find((u) => u.favorito) || ubicaciones[0];
  const sinUbicaciones = ubicaciones.length === 0;

  /*
    El guardia trabaja en el edificio, no vive en el: no tiene ninguna unidad,
    asi que `ubicaciones` le viene vacia. La comprobacion de "sin ubicaciones"
    iba primero, y entonces la barra le ofrecia "Administrar mis ubicaciones"
    --una pantalla de residentes, sobre viviendas que no son suyas--. Los roles
    de condominio se resuelven antes, con el edificio en el que trabajan.
  */
  const esRolDeCondominio =
    rolActivo === "guardia" || rolActivo === "administrador";
  const nombreEdificio =
    edificioActivo ||
    ubicacionActiva?.alias ||
    ubicacionActiva?.direccion ||
    "";

  const getLabel = () => {
    if (rolActivo === "guardia")
      return nombreEdificio ? `Guardia · ${nombreEdificio}` : "Portería";
    if (rolActivo === "administrador")
      return nombreEdificio ? `Admin · ${nombreEdificio}` : "Administración";
    if (sinUbicaciones) return "Administrar mis ubicaciones";
    return ubicacionActiva?.alias || ubicacionActiva?.direccion || "";
  };

  const handleLocationPress = () => {
    // Sin nada que elegir no se abre un desplegable vacio.
    if (esRolDeCondominio && ubicaciones.length <= 1) return;
    if (sinUbicaciones) {
      navigateToActiveTab(navigation, "InquilinoLiderUbicacion");
    } else {
      setOpen(true);
    }
  };

  const seleccionarUbicacion = (id: number) => {
    toggleFavoritoUbicacion(id);
    setOpen(false);
  };

  const irAAdministrar = () => {
    setOpen(false);
    navigateToActiveTab(navigation, "InquilinoLiderUbicacion");
  };

  return (
    <>
      <View
        className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-100"
        style={{ paddingTop: insets.top + 12 }}
      >
        {/* Logo */}
        <View className="flex-row items-center gap-2">
          <Logo size={30} />
          <Text className="text-xl font-bold text-gray-900">Veciyo</Text>
        </View>

        {/* Selector de ubicación */}
        <Pressable
          onPress={handleLocationPress}
          className="flex-row items-center gap-1"
        >
          <Text
            className="text-xs font-medium text-gray-700 underline"
            numberOfLines={1}
          >
            {getLabel()}
          </Text>
          <Ionicons name="chevron-down" size={14} color={theme.colors.text} />
          <InfoButton
            sinPropiedades={sinUbicaciones}
            onAccion={irAAdministrar}
          />
        </Pressable>

        {/* Botón de información */}

        {/* Campana de notificaciones */}
        <Pressable
          onPress={() => navigateToActiveTab(navigation, "Notificaciones")}
          className="relative"
        >
          <Ionicons
            name="notifications-outline"
            size={24}
            color={theme.colors.text}
          />
          {/* El punto marcaba `toasts.length`: los avisos flotantes que hubiera
              en pantalla en ese momento, que no tienen relacion con la bandeja. */}
          {sinLeer > 0 && (
            <View className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-danger border border-white" />
          )}
        </Pressable>
      </View>

      {/* Dropdown de ubicaciones */}
      <Modal
        visible={open}
        transparent
        animationType="none"
        onRequestClose={() => setOpen(false)}
        statusBarTranslucent
      >
        <VeloModal
          visible={open}
          onPress={() => setOpen(false)}
          className="flex-1"
        >
          <View className="absolute right-4 top-14 bg-white rounded-xl shadow-lg border border-gray-200 min-w-[200px] overflow-hidden z-50">
            <FlatList
              data={ubicaciones}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => {
                const isActive = item.id === ubicacionActiva?.id;
                return (
                  <Pressable
                    onPress={() => seleccionarUbicacion(item.id)}
                    className="px-4 py-3 border-b border-gray-100"
                    style={{
                      backgroundColor: isActive
                        ? theme.colors.primaryLight
                        : "transparent",
                    }}
                  >
                    <Text className="text-sm text-gray-900" numberOfLines={1}>
                      {rolActivo === "guardia"
                        ? `Guardia de seguridad: ${item.alias || item.direccion}`
                        : rolActivo === "administrador"
                          ? `Administrador, ${item.alias || item.direccion}`
                          : item.alias || item.direccion}
                    </Text>
                  </Pressable>
                );
              }}
            />
            {/* Un rol de condominio no administra viviendas: no es su pantalla. */}
            {!esRolDeCondominio && (
              <Pressable onPress={irAAdministrar} className="px-4 py-3">
                <Text className="text-sm font-medium text-primary">
                  Administrar mis ubicaciones
                </Text>
              </Pressable>
            )}
          </View>
        </VeloModal>
      </Modal>
    </>
  );
}
