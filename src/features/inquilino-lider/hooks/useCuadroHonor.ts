import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores";
import { usePropietarioStore } from "@/stores/propietario-store";
import { obtenerCuadroHonorRequest } from "../services";
import {
  cuadroHonorDepartamentos,
  cuotaAdministracionHistorial,
  reputacionInsigniasVecino,
} from "@/features/home/homeMockData";

export function useCuadroHonor() {
  const { rolActivo, usuario } = useAuthStore();
  const residentesDeclarados = usePropietarioStore(
    (state) => state.residentesDeclarados,
  );
  const [search, setSearch] = useState("");
  const [showReconocimientoPopup, setShowReconocimientoPopup] = useState(false);
  const [reconocimientoDestinatario, setReconocimientoDestinatario] = useState("");

  const query = useQuery({
    queryKey: ["inquilino-lider", "cuadro-honor"],
    queryFn: obtenerCuadroHonorRequest,
  });

  const departamentos = query.data?.departamentos || cuadroHonorDepartamentos;
  const insignias = query.data?.insignias || reputacionInsigniasVecino;
  const cuotas = query.data?.cuotas || cuotaAdministracionHistorial;
  const filtered = useMemo(
    () =>
      departamentos.filter((departamento) => {
        const matchSearch =
          !search ||
          departamento.departamento.toLowerCase().includes(search.toLowerCase()) ||
          departamento.responsable.toLowerCase().includes(search.toLowerCase());
        return matchSearch && departamento.estado === "Al día";
      }),
    [departamentos, search],
  );

  const esGuardia = rolActivo === "guardia";
  const esAdmin = rolActivo === "administrador";
  const esPropietario = rolActivo === "propietario";
  const esResidente = esPropietario
    ? (residentesDeclarados[usuario?.correo || ""] ?? true)
    : !esGuardia && !esAdmin && !!rolActivo;
  const puedeVerPagina = !esGuardia;

  const handleOpenReconocimiento = (nombre: string) => {
    setReconocimientoDestinatario(nombre || "");
    setShowReconocimientoPopup(true);
  };

  const cerrarReconocimiento = () => {
    setShowReconocimientoPopup(false);
    setReconocimientoDestinatario("");
  };

  return {
    ...query,
    search,
    setSearch,
    filtered,
    insignias,
    cuotas,
    puedeVerPagina,
    puedeParticipar: esResidente,
    showReconocimientoPopup,
    reconocimientoDestinatario,
    handleOpenReconocimiento,
    cerrarReconocimiento,
  };
}
