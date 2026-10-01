import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { obtenerVerificacionDeDocumento } from "@/features/administrador/services/condominio.repo";
import { TIPO_DOCUMENTO, claveDeEtiqueta } from "@/shared/constants";
import {
  useAdminStore,
  useAuthStore,
  useUbicacionStore,
  useUIStore,
} from "@/stores";
import {
  useUnidadesDisponibles,
  useNavegacion,
  useParametros,
  useCondominioActivo,
} from "@/shared/hooks";
import { formatDate, formatDateInput, formatDateIso, formatTime } from "@/shared/utils";
import type { VisitaItem } from "@/shared/types";
import { formatearRangoHorario } from "../helpers/visitas.helpers";
import { tipoHaciaBase, vehiculoHaciaBase } from "../services/visitas.repo";
import { TIPOS_VISITA } from "../constants";
import { useVisitas } from "./useVisitas";
import { useVisitaNuevo } from "./useVisitaNuevo";

/**
 * Estado y reglas del alta de visitas.
 *
 * La pantalla tenia 1271 lineas: treinta `useState`, siete `useEffect` y un
 * `handleGuardar` de 170, todo mezclado con el JSX. Aqui queda la logica y
 * alli solo la composicion, como pide la regla 12.
 *
 * Los datos personales del visitante venian precargados con los de una persona
 * inventada ("Mariano Lazarto", con cedula, correo y telefono): quien
 * registraba una visita partia de esos valores y, si no los borraba, quedaban
 * guardados como los del invitado real.
 */
export function useVisitasNuevo() {
  const navigation = useNavegacion();
  const parametros = useParametros("VisitasNuevo");
  const { crearVisita, creando } = useVisitas();
  const {
    resolver: resolverUnidad,
    torres: torresReales,
    codigosDe,
  } = useUnidadesDisponibles();
  const { validar } = useVisitaNuevo();
  const { addToast } = useUIStore();
  const rolActivo = useAuthStore((s) => s.rolActivo);
  const ubicaciones = useUbicacionStore((s) => s.ubicaciones);
  const ubicacionActiva = ubicaciones.find((u) => u.favorito) || ubicaciones[0];
  const estacionamientos = useAdminStore((s) => s.estacionamientosVisitantes);
  const estacionamientosAsignados = useAdminStore(
    (s) => s.estacionamientosAsignados,
  );

  const esGuardia = rolActivo === "guardia";
  const esAdmin = rolActivo === "administrador";
  const esHuesped = rolActivo === "huesped-temporal";
  const esGuardiaOAdmin = esGuardia || esAdmin;

  const tiposDisponibles = TIPOS_VISITA.filter((t) => {
    if (esGuardia) return t === "amigos" || t === "temporal";
    if (esHuesped) return t === "amigos" || t === "temporal";
    return true;
  });

  const tipoPreseleccionado = parametros?.tipoPreseleccionado;
  const [tipoSeleccionado, setTipoSeleccionado] = useState<string | null>(
    tipoPreseleccionado && tiposDisponibles.includes(tipoPreseleccionado)
      ? tipoPreseleccionado
      : null,
  );

  const [torre, setTorre] = useState("");
  const [depto, setDepto] = useState("");
  // Una visita de una persona es el caso normal; "5" venia del mock.
  const [personas, setPersonas] = useState("1");
  const [cantidadMenores, setCantidadMenores] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date());

  /**
   * El día en que el huésped se va.
   *
   * Antes no existía: el formulario tenía un solo calendario y esto escribía
   * `fechaDesde` y `fechaHasta` con el mismo valor, así que **toda estancia
   * medía cero noches**. Un huésped del 1 al 5 de octubre quedaba registrado
   * entrando y saliendo el día 1, y como `cerrar_precheckin` construye su
   * membresía con esas fechas --y la caduca en `fecha_hasta + 1`-- al día
   * siguiente perdía la aplicación, el libro y la clave de la puerta.
   *
   * Solo lo pide la renta corta. Un amigo o un profesional vienen y se van el
   * mismo día, y para ellos las dos fechas siguen coincidiendo. Punto 67 de
   * `REVISAR-A-OJO.md`.
   */
  const [fechaSalida, setFechaSalida] = useState("");

  /*
    Si la porteria compara el documento del invitado lo decide **el edificio**,
    no el tipo de visita. Antes esto era `tipo === "amigos" ? "no_verificar" :
    "verificar"`, escrito a fuego, mientras la pantalla le pedia el documento a
    quien invitaba y le decia que su invitado lo presentara en porteria: una
    comprobacion prometida que nadie hacia. Punto 66 de `REVISAR-A-OJO.md`.
  */
  const condominioId = useCondominioActivo() ?? "";
  const { data: verificarDocumento = true } = useQuery({
    queryKey: ["condominio", "verificar-documento", condominioId],
    queryFn: () => obtenerVerificacionDeDocumento(condominioId),
    enabled: Boolean(condominioId),
  });
  const [nombre, setNombre] = useState("");
  // Sin preseleccion: "Cédula" era ambiguo entre ciudadania y extranjeria.
  const [tipoId, setTipoId] = useState("");
  const [identificacion, setIdentificacion] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [horaInicio, setHoraInicio] = useState(() => {
    if (!esGuardia) return "";
    const now = new Date();
    return formatTime(now);
  });
  const [horaFin, setHoraFin] = useState("");
  const [horaSalidaInicio, setHoraSalidaInicio] = useState("");
  const [horaSalidaFin, setHoraSalidaFin] = useState("");
  const [profesion, setProfesion] = useState("");
  const [profesionOtro, setProfesionOtro] = useState("");
  const [tieneVehiculo, setTieneVehiculo] = useState(false);
  const [cantidadVehiculos, setCantidadVehiculos] = useState(1);
  const [vehiculos, setVehiculos] = useState<{ placa: string; tipo: string }[]>(
    [],
  );
  const [acompanantes, setAcompanantes] = useState<
    { nombre: string; ci: string; esMenor: boolean }[]
  >([]);
  const [aviso, setAviso] = useState<
    "solo_notificar" | "notificar_y_anunciar"
  >("notificar_y_anunciar");
  const [aprobadoPor, setAprobadoPor] = useState("");
  const [anotacionesGuardia, setAnotacionesGuardia] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [esParaAdministracion, setEsParaAdministracion] = useState(false);
  const [showAvisoMenores, setShowAvisoMenores] = useState(false);
  const [fotosIngreso, setFotosIngreso] = useState<string[]>([]);
  const [estacionamientosSel, setEstacionamientosSel] = useState<string[]>([]);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showTimePickerFin, setShowTimePickerFin] = useState(false);
  const [showTimePickerSalidaInicio, setShowTimePickerSalidaInicio] =
    useState(false);
  const [showTimePickerSalidaFin, setShowTimePickerSalidaFin] = useState(false);
  const [horaIngresoDate, setHoraIngresoDate] = useState(() => new Date());
  const [horaFinDate, setHoraFinDate] = useState(() => new Date());
  const [horaSalidaInicioDate, setHoraSalidaInicioDate] = useState(
    () => new Date(),
  );
  const [horaSalidaFinDate, setHoraSalidaFinDate] = useState(() => new Date());

  const esProfesional =
    tipoSeleccionado === "temporal" || tipoSeleccionado === "permanente";

  useEffect(() => {
    if (!esGuardiaOAdmin && ubicacionActiva) {
      setTorre(`Torre ${ubicacionActiva.torreNumero || ""}`);
      setDepto(ubicacionActiva.codigo || "");
    }
  }, [esGuardiaOAdmin, ubicacionActiva]);

  useEffect(() => {
    if (esGuardia) setAviso("notificar_y_anunciar");
  }, [esGuardia]);

  useEffect(() => {
    if (tipoSeleccionado === "huesped-temporal") {
      setHoraInicio("15:00");
      setHoraFin("16:00");
      setHoraSalidaInicio("10:00");
      setHoraSalidaFin("11:00");
    }
  }, [tipoSeleccionado]);

  useEffect(() => {
    if (tipoSeleccionado === "permanente") {
      setPersonas("1");
      setCantidadMenores(0);
    }
  }, [tipoSeleccionado]);

  useEffect(() => {
    const target = tieneVehiculo ? cantidadVehiculos : 0;
    setVehiculos((prev) => {
      const updated = [...prev];
      while (updated.length < target) updated.push({ placa: "", tipo: "Auto" });
      while (updated.length > target) updated.pop();
      return updated;
    });
  }, [cantidadVehiculos, tieneVehiculo]);

  useEffect(() => {
    const num = parseInt(personas) || 1;
    const compCount = Math.max(0, num - 1);
    setAcompanantes((prev) => {
      const updated = [...prev];
      while (updated.length < compCount)
        updated.push({ nombre: "", ci: "", esMenor: false });
      while (updated.length > compCount) updated.pop();
      return updated;
    });
  }, [personas]);

  useEffect(() => {
    /*
      El tope se calcula **dentro** del updater, con `prev`. Se calculaba con
      `acompanantes` de fuera, que es el valor del render en que se creo el
      efecto: al cambiar el numero de personas --que lo hace el efecto de
      arriba, en la misma tanda-- se marcaba como menor segun una lista que ya
      no era la que habia.
    */
    setAcompanantes((prev) => {
      const n = Math.max(0, Math.min(cantidadMenores, prev.length));
      return prev.map((a, i) => ({ ...a, esMenor: i < n }));
    });
  }, [cantidadMenores]);

  const handleGuardar = () => {
    if (!tipoSeleccionado) {
      addToast("Selecciona un tipo de visita", "error");
      return;
    }
    if (!nombre.trim()) {
      addToast("El nombre es obligatorio", "error");
      return;
    }
    if (esProfesional && !identificacion.trim()) {
      addToast("La identificación es obligatoria", "error");
      return;
    }
    if (
      tipoSeleccionado === "temporal" &&
      acompanantes.some((a) => !a.ci.trim())
    ) {
      addToast(
        "La identificación es obligatoria para todos los acompañantes",
        "error",
      );
      return;
    }
    if (esGuardia && !horaInicio) {
      addToast("La hora de ingreso es obligatoria", "error");
      return;
    }
    if (esGuardia && !aprobadoPor.trim()) {
      addToast("Debe indicar quién aprobó el ingreso", "error");
      return;
    }
    if (esGuardia && tipoSeleccionado === "temporal" && !telefono.trim()) {
      addToast("El teléfono es obligatorio para profesional temporal", "error");
      return;
    }
    const fechaStr = formatDate(selectedDate);

    /*
      La estancia de un huésped tiene dos extremos. Para los demás tipos la
      salida es el mismo día, que es lo que ya pasaba con todos.
    */
    const esEstancia = tipoSeleccionado === "huesped-temporal";
    if (esEstancia && !fechaSalida) {
      addToast("Indica el día en que el huésped se va", "error");
      return;
    }
    // Se comparan en ISO, que ordena como texto sin pasar por `Date`.
    if (esEstancia && fechaSalida < formatDateInput(selectedDate)) {
      addToast("La salida no puede ser antes de la llegada", "error");
      return;
    }
    const fechaHastaStr = esEstancia ? formatDateIso(fechaSalida) : fechaStr;

    const visita = {
      id: Date.now(),
      tipo: tipoSeleccionado as VisitaItem["tipo"],
      nombre: nombre.trim(),
      ci: identificacion.trim(),
      estado: esGuardia ? "Ingresado" : "Programada",
      instruccionDocumento: verificarDocumento
        ? ("verificar" as const)
        : ("no_verificar" as const),
      aviso,
      tieneVehiculo: tieneVehiculo && vehiculos.some((v) => v.placa.trim()),
      fechaDesde: fechaStr,
      fechaHasta: fechaHastaStr,
      esEvento: false,
      invitados: [
        {
          nombre: nombre.trim(),
          ci: identificacion.trim(),
          esMenor: false,
          llego: esGuardia,
          aprobado: "pendiente",
          horaIngreso: esGuardia ? horaInicio || "00:00" : "",
          horaSalida: "",
        },
        ...acompanantes
          .filter((a) => a.nombre.trim())
          .map((a) => ({
            nombre: a.nombre,
            ci: a.ci,
            esMenor: a.esMenor,
            llego: esGuardia,
            aprobado: "pendiente",
            horaIngreso: esGuardia ? horaInicio || "00:00" : "",
            horaSalida: "",
          })),
      ],
      vehiculos: tieneVehiculo ? vehiculos.filter((v) => v.placa.trim()) : [],
      torre,
      depto,
      personas: parseInt(personas) || 1,
      horaEstimadaLlegada: esGuardia
        ? horaInicio
        : formatearRangoHorario(horaInicio, horaFin),
      horaEstimadaSalida:
        !esGuardia && tipoSeleccionado === "huesped-temporal"
          ? formatearRangoHorario(horaSalidaInicio, horaSalidaFin)
          : undefined,
      horaIngreso: esGuardia ? horaInicio : undefined,
      registradoPor: esAdmin
        ? useAuthStore.getState().usuario?.nombre || "Administrador"
        : undefined,
      autorizadoPor: esGuardia ? aprobadoPor : undefined,
      autorizadoPorRol: esGuardia ? "guardia" : undefined,
      anotacionesIngreso: esGuardia ? anotacionesGuardia : "",
      profesion: esProfesional ? profesion : undefined,
      profesionOtro:
        esProfesional && (profesion === "Otros" || profesion === "otros")
          ? profesionOtro
          : undefined,
      telefonoResidente: !esGuardia ? telefono : undefined,
      esParaAdministracion,
    };

    const validacion = validar(visita);
    if (!validacion.success) {
      addToast(
        validacion.error.issues[0]?.message ||
          "Completa los datos de la visita",
        "error",
      );
      return;
    }

    // La visita se ata a una unidad real por FK. El guardia puede elegir
    // cualquier unidad del condominio; el residente, solo las suyas.
    // El guardia registra para cualquier unidad del condominio; el residente,
    // solo para las suyas, y eso lo garantiza RLS, no la interfaz.
    const unidadDestino = resolverUnidad(torre, depto);

    if (!unidadDestino && !esParaAdministracion) {
      addToast(
        "No pudimos identificar la unidad de la visita. Elegí torre y departamento.",
        "error",
      );
      return;
    }

    crearVisita({
      condominioId: unidadDestino?.condominioId ?? "",
      unidadId: esParaAdministracion ? null : (unidadDestino?.unidadId ?? null),
      tipo: tipoHaciaBase(tipoSeleccionado as VisitaItem["tipo"]),
      estado: esGuardia ? "ingresada" : "programada",
      paraAdministracion: esParaAdministracion,
      fechaDesde: fechaStr,
      fechaHasta: fechaHastaStr,
      horaEstimadaLlegada: esGuardia ? horaInicio : undefined,
      instruccionDocumento: verificarDocumento ? "verificar" : "no_verificar",
      aviso:
        aviso === "notificar_y_anunciar"
          ? "notificar_y_anunciar"
          : "solo_notificar",
      profesion: esProfesional ? profesion : undefined,
      autorizadaPorNombre: esGuardia ? aprobadoPor : undefined,
      anotacionesIngreso: esGuardia ? anotacionesGuardia : undefined,
      invitados: [
        {
          nombre: nombre.trim(),
          documentoNumero: identificacion.trim(),
          /*
            El tipo de documento se elegia en el formulario y **no se guardaba**:
            `tipoId` no salia de la pantalla. Asi que el invitado quedaba con el
            numero y sin decir de que documento es, y la pantalla de detalle
            ensenaba «No especificado» por mucho que el guardia lo hubiera puesto.

            El selector ofrece las etiquetas --«Cedula de ciudadania»-- y la
            columna es un enum, asi que hay que traducir: `claveDeEtiqueta`
            devuelve `null` si no cuadra, y entonces no se manda nada en vez de
            colar una cadena que Postgres rechazaria.
          */
          tipoDocumento:
            claveDeEtiqueta(TIPO_DOCUMENTO, tipoId) ?? undefined,
        },
        ...acompanantes
          .filter((a) => a.nombre.trim())
          .map((a) => ({
            nombre: a.nombre.trim(),
            documentoNumero: a.ci,
            esMenor: a.esMenor,
          })),
      ],
      vehiculos: tieneVehiculo
        ? vehiculos
            .filter((v) => v.placa.trim())
            .map((v) => ({ placa: v.placa.trim(), tipo: vehiculoHaciaBase(v.tipo) }))
        : [],
    }, {
      // La pantalla de exito solo aparece si la visita quedo guardada. Antes se
      // mostraba de inmediato y, si el guardado fallaba, el usuario veia el
      // mensaje de exito y el error a la vez.
      onSuccess: () => setShowSuccess(true),
    });
  };

  return {
    // Contexto
    esGuardia,
    esAdmin,
    esHuesped,
    esGuardiaOAdmin,
    esProfesional,
    creando,
    tiposDisponibles,
    torresReales,
    codigosDe,
    estacionamientos,
    estacionamientosAsignados,
    navigation,

    // Estado del formulario
    tipoSeleccionado, setTipoSeleccionado,
    torre, setTorre,
    depto, setDepto,
    personas, setPersonas,
    cantidadMenores, setCantidadMenores,
    selectedDate, setSelectedDate,
    fechaSalida, setFechaSalida,
    nombre, setNombre,
    tipoId, setTipoId,
    identificacion, setIdentificacion,
    email, setEmail,
    telefono, setTelefono,
    horaInicio, setHoraInicio,
    horaFin, setHoraFin,
    horaSalidaInicio, setHoraSalidaInicio,
    horaSalidaFin, setHoraSalidaFin,
    profesion, setProfesion,
    profesionOtro, setProfesionOtro,
    tieneVehiculo, setTieneVehiculo,
    cantidadVehiculos, setCantidadVehiculos,
    vehiculos, setVehiculos,
    acompanantes, setAcompanantes,
    aviso, setAviso,
    aprobadoPor, setAprobadoPor,
    anotacionesGuardia, setAnotacionesGuardia,
    showSuccess,
    esParaAdministracion, setEsParaAdministracion,
    showAvisoMenores, setShowAvisoMenores,
    fotosIngreso, setFotosIngreso,
    estacionamientosSel, setEstacionamientosSel,
    showTimePicker, setShowTimePicker,
    showTimePickerFin, setShowTimePickerFin,
    showTimePickerSalidaInicio, setShowTimePickerSalidaInicio,
    showTimePickerSalidaFin, setShowTimePickerSalidaFin,
    horaIngresoDate, setHoraIngresoDate,
    horaFinDate, setHoraFinDate,
    horaSalidaInicioDate, setHoraSalidaInicioDate,
    horaSalidaFinDate, setHoraSalidaFinDate,

    handleGuardar,
    tipoPreseleccionado,
  };
}
