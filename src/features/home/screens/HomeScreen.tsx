import React from "react";
import { useNavigation } from "@react-navigation/native";
import { navigateToRoute } from "@/navigation/helpers/navigation.helpers";
import { useAuthStore } from "@/stores/auth-store";
import { ScreenLayout } from "@/shared/layouts";
import { BienvenidaModal } from "../components/BienvenidaModal";
import { ViviendaResumen } from "../components/ViviendaResumen";
import { InquilinoLiderHome } from "../components/InquilinoLiderHome";
import { CommsFab } from "../components/CommsFab";

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const rolActivo = useAuthStore((state) => state.rolActivo);
  const mostrarBienvenida = useAuthStore((state) => state.mostrarBienvenida);
  const cerrarBienvenida = useAuthStore((state) => state.cerrarBienvenida);
  const usuario = useAuthStore((state) => state.usuario);

  const irAVerificacion = () => {
    cerrarBienvenida();
    navigateToRoute(navigation, "Verificacion");
  };

  return (
    <ScreenLayout padding={false} withToast={false} floatingChild={<CommsFab />}>
      {rolActivo === "huesped-temporal" ? (
        <ViviendaResumen />
      ) : rolActivo ? (
        <InquilinoLiderHome />
      ) : (
        <ViviendaResumen />
      )}
      <BienvenidaModal
        visible={mostrarBienvenida}
        nombre={usuario?.nombre}
        onClose={cerrarBienvenida}
        onIniciarVerificacion={irAVerificacion}
      />
    </ScreenLayout>
  );
}
