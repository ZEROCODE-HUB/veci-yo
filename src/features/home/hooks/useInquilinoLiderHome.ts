import { useQuery } from "@tanstack/react-query";
import { useCondominioActivo } from "@/shared/hooks";
import {
  obtenerAgendaHoy,
  obtenerIngresosSalidas,
  obtenerReputacion,
} from "../services/home.repo";
import { contarRegalosPorDar } from "@/features/inquilino-lider/services";
import { useMemo, useState } from "react";
import {
  useAdminStore,
  useAuthStore,
  usePropietarioStore,
  useUIStore,
} from "@/stores";
import { calcularTrafico, COLOR_FAMILIARES, COLOR_TEMPORAL, HORAS_TURNO } from "../helpers/home.helpers";
import { useVisitas } from "@/features/visitas/hooks";

export function useInquilinoLiderHome() {
  const rolActivo = useAuthStore((state) => state.rolActivo);
  const usuario = useAuthStore((state) => state.usuario);
  const residentesDeclarados = usePropietarioStore(
    (state) => state.residentesDeclarados,
  );
  const estacionamientos = useAdminStore((state) => state.estacionamientosVisitantes);
  const asignacionesGuardadas = useAdminStore(
    (state) => state.estacionamientosAsignados,
  );
  const guardarAsignaciones = useAdminStore(
    (state) => state.guardarAsignacionesEstacionamiento,
  );
  const { items: visitas } = useVisitas();
  const addToast = useUIStore((state) => state.addToast);
  const condominioId = useCondominioActivo() ?? "";
  const usuarioId = useAuthStore((state) => state.usuarioId ?? "");
  const unidades = useAuthStore((state) => state.unidades);

  const { data: agendaHoy = [] } = useQuery({
    queryKey: ["home", "agenda", unidades.map((u) => u.unidadId).join(",")],
    queryFn: () => obtenerAgendaHoy(unidades.map((u) => u.unidadId)),
    enabled: unidades.length > 0,
  });

  const { data: regalosPorDar = 0 } = useQuery({
    queryKey: ["home", "regalos", condominioId, usuarioId],
    queryFn: () => contarRegalosPorDar({ condominioId, usuarioId }),
    enabled: Boolean(condominioId && usuarioId),
  });

  const esGuardia = rolActivo === "guardia";
  const esAdmin = rolActivo === "administrador";
  const esPropietario = rolActivo === "propietario";
  const esResidente = esPropietario
    ? (residentesDeclarados[usuario?.correo || ""] ?? true)
    : !esGuardia && !esAdmin && !!rolActivo;
  const noResidente = esPropietario && !esResidente;
  const puedeVerTrafico = esGuardia || esAdmin;

  const [planDia, setPlanDia] = useState("Hoy");
  const [modoIngreso, setModoIngreso] = useState(true);
  const [barraPopup, setBarraPopup] = useState<any>(null);
  const [parkingOpen, setParkingOpen] = useState(false);
  const [parkingAssignments, setParkingAssignments] = useState<Record<string, string>>({});

  const visitOptions = useMemo(() => {
    const options = visitas.flatMap((visita) =>
      (visita.invitados?.length ? visita.invitados : [{ nombre: visita.nombre }]).map(
        (invitado, index) => ({
          label: `${invitado.nombre} (${visita.torre || "-"}-${visita.depto || "-"})`,
          value: `${visita.id}-${index}`,
        }),
      ),
    );
    return Array.from(new Map(options.map((option) => [option.value, option])).values());
  }, [visitas]);

  // El dia que pide la pantalla, en el formato que espera la base.
  const diaConsultado = useMemo(() => {
    const d = new Date();
    if (planDia === "Mañana") d.setDate(d.getDate() + 1);
    if (planDia === "Ayer") d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, [planDia]);

  const { data: sourceData = [] } = useQuery({
    queryKey: ["home", "ingresos-salidas", diaConsultado],
    queryFn: () => obtenerIngresosSalidas(diaConsultado),
  });

  const { data: reputacionInsignias = [] } = useQuery({
    queryKey: ["home", "reputacion", usuarioId, condominioId],
    queryFn: () => obtenerReputacion(usuarioId, condominioId),
    enabled: Boolean(usuarioId && condominioId),
  });
  const trafico = useMemo(
    () => calcularTrafico(sourceData, modoIngreso),
    [sourceData, modoIngreso],
  );

  const openParking = () => {
    setParkingAssignments({ ...asignacionesGuardadas });
    setParkingOpen(true);
  };

  const saveParking = () => {
    guardarAsignaciones(parkingAssignments);
    addToast(
      `${Object.keys(parkingAssignments).length} estacionamiento(s) asignado(s)`,
      "success",
    );
    setParkingOpen(false);
  };

  return {
    agendaHoy,
    estacionamientos,
    esAdmin,
    esGuardia,
    esResidente,
    noResidente,
    puedeVerTrafico,
    nombre: usuario?.nombre ?? "",
    planDia,
    modoIngreso,
    barraPopup,
    parkingOpen,
    parkingAssignments,
    sourceData,
    regalosPorDar,
    reputacionInsignias,
    visitOptions,
    HORAS_TURNO,
    COLOR_FAMILIARES,
    COLOR_TEMPORAL,
    ...trafico,
    setPlanDia,
    setModoIngreso,
    setBarraPopup,
    setParkingOpen,
    setParkingAssignments,
    openParking,
    saveParking,
  };
}

