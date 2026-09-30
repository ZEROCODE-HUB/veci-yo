import { useQuery } from "@tanstack/react-query";
import { useCondominioActivo, useUnidadActiva } from "@/shared/hooks";
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
  useUIStore,
} from "@/stores";
import { calcularTrafico, COLOR_FAMILIARES, COLOR_TEMPORAL, HORAS_TURNO } from "../helpers/home.helpers";
import { useVisitas } from "@/features/visitas/hooks";
import { esNoResidente } from "../helpers/noResidente";

/**
 * La barra del grafico de trafico que se ha pulsado.
 *
 * Estaba como `any`, asi que el detalle que se pinta --«Total ingresos»,
 * «X con vehiculo»-- no lo comprobaba nadie: un campo mal escrito en el sitio
 * que lo pone salia como `undefined` en pantalla, sin un solo error.
 */
export interface BarraDelGrafico {
  /** La hora de la franja, `HH:MM`. */
  hora: string;
  total: number;
  familiar: number;
  temporal: number;
  vehiculos: number;
  tipo: "ingresos" | "salidas";
}

export function useInquilinoLiderHome() {
  const rolActivo = useAuthStore((state) => state.rolActivo);
  const usuario = useAuthStore((state) => state.usuario);
  /*
    Salía de `propietario-store.residentesDeclarados`, un mapa
    `correo -> boolean` en memoria: se perdía al recargar y usaba el correo
    como clave de identidad, que la regla 3 prohíbe. `es_residente` ya venía
    cargado en la sesión desde `membresia_unidad` y no lo miraba nadie.
  */
  const unidadActiva = useUnidadActiva();
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
  /*
    Un propietario, con o sin la coletilla del rol.

    Se pedia `rolActivo === "propietario"` a secas, y a quien **de verdad** no
    reside la sesion le da `propietario-no-residente`: la comprobacion fallaba
    justo con la persona para la que estaba escrita, asi que `noResidente` no
    podia ser cierto nunca y la restriccion --ocultarle correspondencia, visitas
    y zonas comunes, que son de quien vive alli-- no se aplicaba a nadie.

    Salio recorriendo la aplicacion con Guillermo puesto como no residente: el
    menu le salia entero. Es la decima cosa decorativa del proyecto, y de las
    mas escondidas, porque el codigo que la implementa **existe y es correcto**;
    lo que no llega es la condicion.

    `noResidente` mira las dos cosas: el rol --quien solo tiene viviendas donde
    no vive-- y la vivienda activa --quien tiene dos y esta mirando aquella
    donde no vive--.
  */
  const esPropietario =
    rolActivo === "propietario" || rolActivo === "propietario-no-residente";
  const esResidente = esPropietario
    ? (unidadActiva?.esResidente ?? true)
    : !esGuardia && !esAdmin && !!rolActivo;
  const noResidente = esNoResidente(rolActivo, esResidente);
  const puedeVerTrafico = esGuardia || esAdmin;

  const [planDia, setPlanDia] = useState("Hoy");
  const [modoIngreso, setModoIngreso] = useState(true);
  const [barraPopup, setBarraPopup] = useState<BarraDelGrafico | null>(null);
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

