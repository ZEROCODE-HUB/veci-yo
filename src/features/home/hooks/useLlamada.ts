import { useMemo, useState } from "react";
import { useChatStore } from "@/stores";
import { useAuthStore } from "@/stores/auth-store";
import {
  adminList,
  AVATAR_MAP,
  DEFAULT_AVATAR,
  DEPTOS_CALL,
  guardiasSeguridad,
  personasTorre,
  TORRES_LIMITADAS,
  TORRES_OPCIONES,
} from "@/data/chatMockData";

export function useLlamada() {
  const { historialLlamadas, registrarLlamada } = useChatStore();
  const rolActivo = useAuthStore((state) => state.rolActivo);
  const [torre, setTorre] = useState("Seguridad");
  const [depto, setDepto] = useState("Departamento 105");
  const [persona, setPersona] = useState(guardiasSeguridad[0].nombre);

  const esPropietarioOResidente =
    rolActivo === "propietario" ||
    rolActivo === "inquilino-lider" ||
    rolActivo === "huesped-temporal";
  const opcionesTorre = esPropietarioOResidente ? TORRES_LIMITADAS : TORRES_OPCIONES;
  const esPersonal = torre === "Seguridad" || torre === "Administrador";
  const opcionesPersona = esPersonal
    ? torre === "Seguridad"
      ? guardiasSeguridad.map((guardia) => guardia.nombre)
      : adminList
    : personasTorre;

  const cambiarTorre = (valor: string) => {
    setTorre(valor);
    if (valor === "Seguridad" && guardiasSeguridad.length > 0) {
      setPersona(guardiasSeguridad[0].nombre);
    } else if (valor === "Administrador") {
      setPersona(adminList[0]);
    } else {
      setPersona(personasTorre[0]);
    }
  };

  const historialPersona = useMemo(
    () => historialLlamadas.filter((item) => item.contacto === persona).slice(0, 10),
    [historialLlamadas, persona],
  );

  return {
    torre,
    depto,
    persona,
    opcionesTorre,
    opcionesPersona,
    opcionesDepartamento: DEPTOS_CALL,
    esPersonal,
    avatarEmoji: AVATAR_MAP[persona] || DEFAULT_AVATAR,
    historialPersona,
    cambiarTorre,
    setDepto,
    setPersona,
    registrarLlamada,
  };
}

