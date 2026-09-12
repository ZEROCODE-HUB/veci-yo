import { useMemo, useState } from "react";
import {
  useAdminStore,
  useAuthStore,
  usePropietarioStore,
  useUIStore,
  useVisitasStore,
} from "@/stores";
import {
  agendaHoy,
  ingresosSalidasHoy,
  ingresosSalidasManana,
  reputacionInsignias,
  regalosPorDar,
} from "../homeMockData";
import { calcularTrafico, COLOR_FAMILIARES, COLOR_TEMPORAL, HORAS_TURNO } from "../helpers/home.helpers";

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
  const visitas = useVisitasStore((state) => state.items);
  const addToast = useUIStore((state) => state.addToast);

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

  const sourceData =
    planDia === "Mañana"
      ? ingresosSalidasManana
      : planDia === "Hoy"
        ? ingresosSalidasHoy
        : ingresosSalidasHoy;
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
    nombre: usuario?.nombre || "Guillermo",
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

