import React from "react";
import { useAuthStore } from "@/stores/auth-store";
import { ScreenLayout } from "@/shared/layouts";
import { BienvenidaModal } from "../components/BienvenidaModal";
import { ViviendaResumen } from "../components/ViviendaResumen";
import { InquilinoLiderHome } from "../components/InquilinoLiderHome";
import { CommsFab } from "../components/CommsFab";

export function HomeScreen() {
  const rolActivo = useAuthStore((state) => state.rolActivo);
  const mostrarBienvenida = useAuthStore((state) => state.mostrarBienvenida);
  const cerrarBienvenida = useAuthStore((state) => state.cerrarBienvenida);
  const usuario = useAuthStore((state) => state.usuario);

  return (
    <ScreenLayout padding={false} floatingChild={<CommsFab />}>
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
      />
    </ScreenLayout>
  );
}
