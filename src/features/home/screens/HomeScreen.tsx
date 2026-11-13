import React from "react";
import { useAuthStore } from "@/stores/auth-store";
import { ScreenLayout } from "@/shared/layouts";
import { BienvenidaModal } from "../components/BienvenidaModal";
import { ViviendaResumen } from "../components/ViviendaResumen";
import { InquilinoLiderHome } from "../components/InquilinoLiderHome";
import { CommsFab } from "../components/CommsFab";
import { InvitacionesPendientes } from "../components/InvitacionesPendientes";
import { InvitacionDeHuesped } from "../components/InvitacionDeHuesped";
import { InvitacionesDelEdificio } from "../components/InvitacionesDelEdificio";

export function HomeScreen() {
  const rolActivo = useAuthStore((state) => state.rolActivo);
  const mostrarBienvenida = useAuthStore((state) => state.mostrarBienvenida);
  const cerrarBienvenida = useAuthStore((state) => state.cerrarBienvenida);
  const usuario = useAuthStore((state) => state.usuario);

  return (
    <ScreenLayout padding={false} floatingChild={<CommsFab />}>
      {/* Arriba de todo, la invitación a una vivienda que falta aceptar (183). */}
      <InvitacionesPendientes />
      {/* Y las del edificio: guardia, coadministración (13/11/2026). */}
      <InvitacionesDelEdificio />
      {/* Y la de huésped temporal, que al entrar sin rol se abre sola (224). */}
      <InvitacionDeHuesped />
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
