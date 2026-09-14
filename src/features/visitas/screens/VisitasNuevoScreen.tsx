import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import type { DateTimePickerChangeEvent } from "@react-native-community/datetimepicker";
import {
  useAuthStore,
  useUIStore,
  useUbicacionStore,
  useAdminStore,
} from "@/stores";
import {
  Button,
  Input,
  Select,
  Toggle,
  Calendar,
  Modal,
} from "@/shared/components";
import {
  VisitaSuccessView,
  VisitaTipoCard,
} from "@/features/visitas/components";
import { formatearRangoHorario } from "@/features/visitas/helpers/visitas.helpers";
import { useVisitas } from "@/features/visitas/hooks";
import { useVisitaNuevo } from "@/features/visitas/hooks";
import {
  TIPOS_VISITA,
  TORRES,
  DEPARTAMENTOS,
  PROFESIONES,
  TIPOS_ID,
  TIPOS_VEHICULO,
} from "@/data";

export function VisitasNuevoScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { agregar } = useVisitas();
  const { validar } = useVisitaNuevo();
  const { addToast } = useUIStore();
  const rolActivo = useAuthStore((s) => s.rolActivo);
  const ubicaciones = useUbicacionStore((s) => s.ubicaciones);
  const ubicacionActiva = ubicaciones.find((u) => u.favorito) || ubicaciones[0];
  const estacionamientos = useAdminStore((s) => s.estacionamientosVisitantes);
  const estacionamientosAsignados = useAdminStore(
    (s) => s.estacionamientosAsignados,
  );
  const asignarEstacionamiento = useAdminStore(
    (s) => s.asignarEstacionamientoVisita,
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

  const tipoPreseleccionado = route.params?.tipoPreseleccionado;
  const [tipoSeleccionado, setTipoSeleccionado] = useState<string | null>(
    tipoPreseleccionado && tiposDisponibles.includes(tipoPreseleccionado)
      ? tipoPreseleccionado
      : null,
  );

  const [torre, setTorre] = useState("");
  const [depto, setDepto] = useState("");
  const [personas, setPersonas] = useState("5");
  const [cantidadMenores, setCantidadMenores] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [nombre, setNombre] = useState("Mariano Lazarto");
  const [tipoId, setTipoId] = useState("Cédula");
  const [identificacion, setIdentificacion] = useState("122652268562");
  const [email, setEmail] = useState("mlazarto@gmail.com");
  const [telefono, setTelefono] = useState("+5965165136546");
  const [horaInicio, setHoraInicio] = useState(() => {
    if (!esGuardia) return "";
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
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
  const [tipoNotificacion, setTipoNotificacion] = useState<
    "solo-notificar" | "notificar-y-anunciar"
  >("notificar-y-anunciar");
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
    if (esGuardia) setTipoNotificacion("notificar-y-anunciar");
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
    const n = Math.max(0, Math.min(cantidadMenores, acompanantes.length));
    setAcompanantes((prev) => prev.map((a, i) => ({ ...a, esMenor: i < n })));
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
    const fechaStr = selectedDate.toLocaleDateString("es-AR");

    const visita = {
      id: Date.now(),
      tipo: tipoSeleccionado as any,
      nombre: nombre.trim(),
      ci: identificacion.trim(),
      estado: esGuardia ? "Ingresado" : "Pendiente",
      instruccionDocumento:
        tipoSeleccionado === "amigos"
          ? ("no-verificar" as const)
          : ("verificar" as const),
      tipoNotificacion,
      tieneVehiculo: tieneVehiculo && vehiculos.some((v) => v.placa.trim()),
      fechaDesde: fechaStr,
      fechaHasta: fechaStr,
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

    agregar(visita);

    // Asignar estacionamientos seleccionados por guardia
    if (esGuardia && estacionamientosSel.length > 0) {
      estacionamientosSel.forEach((spot, idx) => {
        const invIdx = (visita.invitados?.length || 1) === 1 ? -1 : idx;
        asignarEstacionamiento(spot, `${visita.id}-${invIdx}`);
      });
    }

    setShowSuccess(true);
  };

  if (showSuccess) {
    return (
      <VisitaSuccessView
        tipoSeleccionado={tipoSeleccionado}
        nombre={nombre}
        fecha={selectedDate}
        esHT={tipoSeleccionado === "huesped-temporal"}
        onVolver={() => navigation.goBack()}
      />
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerClassName="p-5 gap-4"
    >
      {/* Subscription banner for HT */}
      {tipoSeleccionado === "huesped-temporal" && (
        <View
          className="flex-row items-center gap-2.5 p-3 rounded-xl"
          style={{
            backgroundColor: "#F3F4F6",
            borderWidth: 1,
            borderColor: "#E5E7EB",
          }}
        >
          <Text style={{ fontSize: 20 }}>🔒</Text>
          <View className="flex-1">
            <Text className="text-sm font-bold text-gray-500">
              Huésped Temporal — Requiere suscripción
            </Text>
            <Text className="text-xs text-gray-400">
              Puedes activarlo desde Configuración {">"} Huéspedes Temporales.
            </Text>
          </View>
        </View>
      )}

      {/* Type selector */}
      {!tipoPreseleccionado && (
        <View className="flex-row flex-wrap gap-3 justify-center">
          {tiposDisponibles.map((tipo) => (
            <View key={tipo} style={{ width: "45%" }}>
              <VisitaTipoCard
                tipo={tipo}
                isActive={tipoSeleccionado === tipo}
                onPress={() => setTipoSeleccionado(tipo)}
              />
            </View>
          ))}
        </View>
      )}

      {tipoSeleccionado && (
        <>
          {/* Guest count section */}
          <View
            className="rounded-2xl p-4 gap-3"
            style={{
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
          >
            <Text className="text-base font-semibold text-center text-gray-900">
              Cantidad de invitados
            </Text>

            {esGuardiaOAdmin ? (
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Select
                    label="Torre"
                    value={torre || null}
                    options={["Todas", ...TORRES]}
                    onChange={(v) => setTorre(v === "Todas" ? "" : String(v))}
                  />
                </View>
                <View className="flex-1">
                  <Select
                    label="Depto"
                    value={depto || null}
                    options={["Todos", ...DEPARTAMENTOS]}
                    onChange={(v) => setDepto(v === "Todos" ? "" : String(v))}
                  />
                </View>
              </View>
            ) : (
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Text className="text-sm text-gray-500 mb-1">Torre</Text>
                  <View
                    className="rounded-xl px-3 py-2.5"
                    style={{
                      backgroundColor: "#F3F4F6",
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                    }}
                  >
                    <Text className="text-sm text-gray-900">
                      {torre || "—"}
                    </Text>
                  </View>
                </View>
                <View className="flex-1">
                  <Text className="text-sm text-gray-500 mb-1">Depto</Text>
                  <View
                    className="rounded-xl px-3 py-2.5"
                    style={{
                      backgroundColor: "#F3F4F6",
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                    }}
                  >
                    <Text className="text-sm text-gray-900">
                      {depto || "—"}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {tipoSeleccionado !== "permanente" && (
              <View className="flex-row items-center gap-2">
                <Input
                  value={personas}
                  onChangeText={setPersonas}
                  placeholder="2"
                  type="numeric"
                  style={{ width: 60, textAlign: "center" }}
                />
                <Text className="text-xs text-gray-500">personas</Text>
                <Text className="text-gray-300">·</Text>
                <Input
                  value={String(cantidadMenores)}
                  onChangeText={(v) =>
                    setCantidadMenores(
                      Math.max(
                        0,
                        Math.min(
                          parseInt(v) || 0,
                          Math.max(0, parseInt(personas) - 1),
                        ),
                      ),
                    )
                  }
                  placeholder="0"
                  type="numeric"
                  style={{ width: 60, textAlign: "center" }}
                />
                <Text className="text-xs text-gray-500">👶 menores</Text>
              </View>
            )}
          </View>

          {tipoSeleccionado === "permanente" && (
            <View
              className="rounded-xl p-3"
              style={{ backgroundColor: "#F9FAFB" }}
            >
              <Text className="text-xs text-gray-500 leading-5">
                El profesional permanente se registra de a uno. Podés registrar
                visitas adicionales creando una nueva visita.
              </Text>
            </View>
          )}

          {/* Admin checkbox */}
          {esAdmin && (
            <View
              className="rounded-xl p-3"
              style={{
                backgroundColor: "#F9FAFB",
                borderWidth: 1,
                borderColor: "#E5E7EB",
              }}
            >
              <View className="flex-row items-center gap-2">
                <Pressable
                  onPress={() => setEsParaAdministracion(!esParaAdministracion)}
                  className="w-5 h-5 rounded border items-center justify-center"
                  style={{
                    borderWidth: 2,
                    borderColor: esParaAdministracion ? "#2563EB" : "#D1D5DB",
                    backgroundColor: esParaAdministracion
                      ? "#2563EB"
                      : "transparent",
                  }}
                >
                  {esParaAdministracion && (
                    <Ionicons name="checkmark" size={14} color="white" />
                  )}
                </Pressable>
                <Pressable
                  onPress={() => setEsParaAdministracion(!esParaAdministracion)}
                  className="flex-1"
                >
                  <Text className="text-sm text-gray-900 font-medium">
                    Visita para administración
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Calendar */}
          {esGuardia ? (
            <View
              className="rounded-2xl p-4 items-center gap-2"
              style={{
                backgroundColor: "#F9FAFB",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
            >
              <Text className="text-sm text-gray-500">Fecha de la visita</Text>
              <Text className="text-lg font-bold text-gray-900">
                Hoy — {new Date().toLocaleDateString("es-AR")}
              </Text>
              <Text className="text-xs text-gray-400">
                El Guardia solo puede registrar visitas del mismo día
              </Text>
            </View>
          ) : (
            <Calendar selected={selectedDate} onSelect={setSelectedDate} />
          )}

          {/* Person info */}
          <View
            className="rounded-2xl p-4 gap-3"
            style={{
              backgroundColor: "#F9FAFB",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
          >
            <Text className="text-sm font-semibold text-gray-900">
              Nombre y Apellido
            </Text>
            <Input
              value={nombre}
              onChangeText={setNombre}
              placeholder="Nombre completo"
            />

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Select
                  label="Tipo"
                  value={tipoId}
                  options={[...TIPOS_ID]}
                  onChange={(v) => setTipoId(String(v))}
                />
              </View>
              <View className="flex-1">
                <Input
                  label={`Identificación${esProfesional ? " *" : ""}`}
                  value={identificacion}
                  onChangeText={setIdentificacion}
                  placeholder={esProfesional ? "Obligatorio" : "Opcional"}
                  type="numeric"
                />
              </View>
            </View>

            <View
              className="rounded-xl p-3"
              style={{ backgroundColor: "#EFF6FF" }}
            >
              <Text className="text-xs text-gray-500 leading-5">
                Recuerda indicar a tu invitado que debe presentar su documento
                (cédula, pasaporte o DNI) en portería al ingresar al edificio.
              </Text>
            </View>

            {!esGuardia && (
              <Input
                label="Correo electrónico (opcional)"
                value={email}
                onChangeText={setEmail}
                placeholder="email@ejemplo.com"
                type="email"
              />
            )}

            {(!esGuardia || tipoSeleccionado === "temporal") && (
              <Input
                label={`Teléfono${tipoSeleccionado === "temporal" && esGuardia ? " *" : " (opcional)"}`}
                value={telefono}
                onChangeText={setTelefono}
                placeholder={
                  tipoSeleccionado === "temporal" && esGuardia
                    ? "Obligatorio"
                    : "Opcional"
                }
                type="numeric"
              />
            )}

            {esProfesional && (
              <View className="gap-2">
                <Select
                  label="Profesión"
                  value={profesion || null}
                  options={PROFESIONES[tipoSeleccionado] || []}
                  onChange={(v) => setProfesion(String(v))}
                  placeholder="Seleccione profesión"
                />
                {(profesion === "Otros" || profesion === "otros") && (
                  <Input
                    value={profesionOtro}
                    onChangeText={setProfesionOtro}
                    placeholder="Especifique la profesión"
                  />
                )}
              </View>
            )}
          </View>

          {/* Acompañantes */}
          {acompanantes.length > 0 && (
            <View className="gap-3">
              {acompanantes.map((acc, idx) => (
                <View
                  key={idx}
                  className="rounded-2xl p-4 gap-3"
                  style={{
                    backgroundColor: "#F9FAFB",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  }}
                >
                  <Text className="text-sm font-semibold text-gray-900">
                    Acompañante {idx + 1}
                  </Text>
                  <Input
                    value={acc.nombre}
                    onChangeText={(v) => {
                      const updated = [...acompanantes];
                      updated[idx] = { ...updated[idx], nombre: v };
                      setAcompanantes(updated);
                    }}
                    placeholder="Nombre y Apellido"
                  />
                  <View>
                    <Text className="text-xs text-gray-500 mb-1">
                      Identificación{" "}
                      {tipoSeleccionado === "temporal" ? "*" : "(opcional)"}
                    </Text>
                    <Input
                      value={acc.ci}
                      onChangeText={(v) => {
                        const updated = [...acompanantes];
                        updated[idx] = { ...updated[idx], ci: v };
                        setAcompanantes(updated);
                      }}
                      placeholder={
                        tipoSeleccionado === "temporal"
                          ? "Obligatorio"
                          : "Opcional"
                      }
                      type="numeric"
                    />
                  </View>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm text-gray-600">Menor de edad</Text>
                    <Toggle
                      value={acc.esMenor}
                      onChange={(v) => {
                        const updated = [...acompanantes];
                        updated[idx] = { ...updated[idx], esMenor: v };
                        setAcompanantes(updated);
                        if (v) {
                          setShowAvisoMenores(true);
                        }
                      }}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Menor warning */}
          {(acompanantes.some((a) => a.esMenor) || showAvisoMenores) && (
            <View
              className="rounded-xl p-3"
              style={{ backgroundColor: "#FEF3C7" }}
            >
              <Text className="text-xs leading-5" style={{ color: "#92400E" }}>
                Advertencia legal: Si el invitado es menor de edad, debe
                ingresar con su padre/madre/tutor legal con la documentación
                respectiva. Este edificio está comprometido con la prevención
                del abuso sexual de menores y la trata de personas.
              </Text>
            </View>
          )}

          {/* Time inputs */}
          {esGuardia ? (
            <View
              className="rounded-2xl p-4 gap-3"
              style={{
                backgroundColor: "#F9FAFB",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
            >
              <Text className="text-sm text-gray-500">Hora de ingreso *</Text>
              <Pressable
                onPress={() => setShowTimePicker(true)}
                className="rounded-xl px-3 py-2.5"
                style={{
                  backgroundColor: "#F3F4F6",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                }}
              >
                <Text className="text-sm text-gray-900">
                  {horaInicio || "Seleccionar hora"}
                </Text>
              </Pressable>
              {showTimePicker && (
                <DateTimePicker
                  value={horaIngresoDate}
                  mode="time"
                  is24Hour={true}
                  display="default"
                  onValueChange={(_event: DateTimePickerChangeEvent, date: Date) => {
                    setShowTimePicker(false);
                    if (date) {
                      setHoraIngresoDate(date);
                      const h = String(date.getHours()).padStart(2, "0");
                      const m = String(date.getMinutes()).padStart(2, "0");
                      setHoraInicio(`${h}:${m}`);
                    }
                  }}
                  onDismiss={() => setShowTimePicker(false)}
                />
              )}
              <Text className="text-xs text-gray-400">
                La salida se registra posteriormente desde el detalle del
                ingreso.
              </Text>
            </View>
          ) : (
            <View
              className="rounded-2xl p-4 gap-3"
              style={{
                backgroundColor: "#F9FAFB",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
            >
              <Text className="text-sm text-gray-500">
                Hora estimada de llegada
              </Text>
              <View className="flex-row items-center gap-2">
                <View className="flex-1">
                  <Pressable
                    onPress={() => setShowTimePicker(true)}
                    className="rounded-xl px-3 py-2.5"
                    style={{
                      backgroundColor: "#F3F4F6",
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                    }}
                  >
                    <Text className="text-sm text-gray-900">
                      {horaInicio || "Desde"}
                    </Text>
                  </Pressable>
                  {showTimePicker && (
                    <DateTimePicker
                      value={horaIngresoDate}
                      mode="time"
                      is24Hour={true}
                      display="default"
                      onValueChange={(_event: DateTimePickerChangeEvent, date: Date) => {
                        setShowTimePicker(false);
                        if (date) {
                          setHoraIngresoDate(date);
                          const h = String(date.getHours()).padStart(2, "0");
                          const m = String(date.getMinutes()).padStart(2, "0");
                          setHoraInicio(`${h}:${m}`);
                        }
                      }}
                      onDismiss={() => setShowTimePicker(false)}
                    />
                  )}
                </View>
                <Text className="text-gray-400">a</Text>
                <View className="flex-1">
                  <Pressable
                    onPress={() => setShowTimePickerFin(true)}
                    className="rounded-xl px-3 py-2.5"
                    style={{
                      backgroundColor: "#F3F4F6",
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                    }}
                  >
                    <Text className="text-sm text-gray-900">
                      {horaFin || "Hasta"}
                    </Text>
                  </Pressable>
                  {showTimePickerFin && (
                    <DateTimePicker
                      value={horaFinDate}
                      mode="time"
                      is24Hour={true}
                      display="default"
                      onValueChange={(_event: DateTimePickerChangeEvent, date: Date) => {
                        setShowTimePickerFin(false);
                        if (date) {
                          setHoraFinDate(date);
                          const h = String(date.getHours()).padStart(2, "0");
                          const m = String(date.getMinutes()).padStart(2, "0");
                          setHoraFin(`${h}:${m}`);
                        }
                      }}
                      onDismiss={() => setShowTimePickerFin(false)}
                    />
                  )}
                </View>
              </View>
            </View>
          )}

          {/* HT: exit time */}
          {!esGuardia && tipoSeleccionado === "huesped-temporal" && (
            <View
              className="rounded-2xl p-4 gap-3"
              style={{
                backgroundColor: "#F9FAFB",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
            >
              <Text className="text-sm text-gray-500">
                Hora estimada de salida
              </Text>
              <View className="flex-row items-center gap-2">
                <View className="flex-1">
                  <Pressable
                    onPress={() => setShowTimePickerSalidaInicio(true)}
                    className="rounded-xl px-3 py-2.5"
                    style={{
                      backgroundColor: "#F3F4F6",
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                    }}
                  >
                    <Text className="text-sm text-gray-900">
                      {horaSalidaInicio || "Desde"}
                    </Text>
                  </Pressable>
                  {showTimePickerSalidaInicio && (
                    <DateTimePicker
                      value={horaSalidaInicioDate}
                      mode="time"
                      is24Hour={true}
                      display="default"
                      onValueChange={(_event: DateTimePickerChangeEvent, date: Date) => {
                        setShowTimePickerSalidaInicio(false);
                        if (date) {
                          setHoraSalidaInicioDate(date);
                          const h = String(date.getHours()).padStart(2, "0");
                          const m = String(date.getMinutes()).padStart(2, "0");
                          setHoraSalidaInicio(`${h}:${m}`);
                        }
                      }}
                      onDismiss={() => setShowTimePickerSalidaInicio(false)}
                    />
                  )}
                </View>
                <Text className="text-gray-400">a</Text>
                <View className="flex-1">
                  <Pressable
                    onPress={() => setShowTimePickerSalidaFin(true)}
                    className="rounded-xl px-3 py-2.5"
                    style={{
                      backgroundColor: "#F3F4F6",
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                    }}
                  >
                    <Text className="text-sm text-gray-900">
                      {horaSalidaFin || "Hasta"}
                    </Text>
                  </Pressable>
                  {showTimePickerSalidaFin && (
                    <DateTimePicker
                      value={horaSalidaFinDate}
                      mode="time"
                      is24Hour={true}
                      display="default"
                      onValueChange={(_event: DateTimePickerChangeEvent, date: Date) => {
                        setShowTimePickerSalidaFin(false);
                        if (date) {
                          setHoraSalidaFinDate(date);
                          const h = String(date.getHours()).padStart(2, "0");
                          const m = String(date.getMinutes()).padStart(2, "0");
                          setHoraSalidaFin(`${h}:${m}`);
                        }
                      }}
                      onDismiss={() => setShowTimePickerSalidaFin(false)}
                    />
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Vehicle section */}
          <View
            className="rounded-2xl p-4 gap-3"
            style={{
              backgroundColor: "#F9FAFB",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-gray-900">¿Traes vehículos?</Text>
              <Toggle
                value={tieneVehiculo}
                onChange={setTieneVehiculo}
                labelRight={tieneVehiculo ? "Sí" : "No"}
              />
            </View>
            {tieneVehiculo && (
              <>
                <View className="flex-row items-center gap-2">
                  <Text className="text-xs text-gray-500">Cantidad</Text>
                  <Input
                    value={String(cantidadVehiculos)}
                    onChangeText={(v) =>
                      setCantidadVehiculos(Math.max(1, parseInt(v) || 1))
                    }
                    type="numeric"
                    style={{ width: 70 }}
                  />
                </View>
                {vehiculos.map((v, idx) => (
                  <View
                    key={idx}
                    className="rounded-xl p-3 gap-2"
                    style={{ backgroundColor: "#F3F4F6" }}
                  >
                    <Text className="text-xs font-semibold text-gray-500">
                      Vehículo {idx + 1}
                    </Text>
                    <View className="flex-row gap-2">
                      <View style={{ width: 110 }}>
                        <Select
                          value={v.tipo}
                          options={[...TIPOS_VEHICULO]}
                          onChange={(val) => {
                            const updated = [...vehiculos];
                            updated[idx] = {
                              ...updated[idx],
                              tipo: String(val),
                            };
                            setVehiculos(updated);
                          }}
                        />
                      </View>
                      <View className="flex-1">
                        <Input
                          value={v.placa}
                          onChangeText={(val) => {
                            const updated = [...vehiculos];
                            updated[idx] = {
                              ...updated[idx],
                              placa: val.toUpperCase(),
                            };
                            setVehiculos(updated);
                          }}
                          placeholder="Placa"
                        />
                      </View>
                    </View>
                  </View>
                ))}
              </>
            )}
          </View>

          {/* Notification type */}
          {esGuardia ? (
            <View
              className="rounded-xl p-3"
              style={{
                backgroundColor: "#F3F4F6",
                borderWidth: 1,
                borderColor: "#E5E7EB",
              }}
            >
              <Text className="text-sm text-gray-600 text-center">
                Ingreso mediante <Text className="font-bold">anuncio</Text> — se
                notificará y anunciará al residente. La opción "solo notificado"
                aplica únicamente cuando el residente pre-registró la visita.
              </Text>
            </View>
          ) : (
            <View
              className="rounded-2xl p-4 gap-3"
              style={{
                backgroundColor: "#F9FAFB",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
            >
              <Text className="text-base font-semibold text-center text-gray-900">
                Tipo de notificación
              </Text>
              <View className="flex-row gap-2">
                {[
                  { id: "solo-notificar" as const, label: "Solo notificar" },
                  {
                    id: "notificar-y-anunciar" as const,
                    label: "Notificar y anunciar",
                  },
                ].map((op) => (
                  <Pressable
                    key={op.id}
                    onPress={() => setTipoNotificacion(op.id)}
                    className="flex-1 items-center py-3 rounded-xl"
                    style={{
                      backgroundColor:
                        tipoNotificacion === op.id ? "#F5B800" : "#F3F4F6",
                      borderWidth: 1.5,
                      borderColor:
                        tipoNotificacion === op.id ? "#F5B800" : "#E5E7EB",
                    }}
                  >
                    <Text
                      className="text-sm text-center"
                      style={{
                        color: tipoNotificacion === op.id ? "#fff" : "#111827",
                        fontWeight: tipoNotificacion === op.id ? "600" : "400",
                      }}
                    >
                      {op.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Guardia: parking assignment when vehicle is present */}
          {esGuardia && tieneVehiculo && estacionamientos.total > 0 && (
            <View
              className="rounded-2xl p-4 gap-3"
              style={{
                backgroundColor: "#F9FAFB",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
            >
              <Text className="text-xs font-semibold text-gray-500">
                Estacionamientos disponibles:{" "}
                {estacionamientos.total -
                  Object.keys(estacionamientosAsignados).length}{" "}
                libres
              </Text>
              <View className="flex-row flex-wrap gap-1.5 max-h-[160px]">
                {Array.from({ length: estacionamientos.total }, (_, i) => {
                  const spot = `B${String(i + 1).padStart(2, "0")}`;
                  const ocupado = !!estacionamientosAsignados[spot];
                  const seleccionado = estacionamientosSel.includes(spot);
                  return (
                    <Pressable
                      key={spot}
                      disabled={ocupado}
                      onPress={() => {
                        if (ocupado) return;
                        setEstacionamientosSel((prev) =>
                          prev.includes(spot)
                            ? prev.filter((s) => s !== spot)
                            : [...prev, spot],
                        );
                      }}
                      className="px-2.5 py-1.5 rounded-full"
                      style={{
                        borderWidth: 1.5,
                        borderColor: seleccionado ? "#F59E0B" : "#E5E7EB",
                        backgroundColor: ocupado
                          ? "#F3F4F6"
                          : seleccionado
                            ? "#F59E0B"
                            : "#fff",
                        opacity: ocupado ? 0.6 : 1,
                      }}
                    >
                      <Text
                        className="text-xs font-semibold"
                        style={{
                          color: ocupado
                            ? "#9CA3AF"
                            : seleccionado
                              ? "#fff"
                              : "#111827",
                        }}
                      >
                        {spot}
                        {ocupado ? " • ocupado" : seleccionado ? " ✓" : ""}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text className="text-xs text-gray-400">
                {estacionamientosSel.length
                  ? `Seleccionados: ${estacionamientosSel.join(", ")}`
                  : "Seleccionados: ninguno"}
              </Text>
            </View>
          )}

          {/* Guardia: anuncio */}
          {esGuardia && (
            <View
              className="rounded-2xl p-4 gap-3"
              style={{
                backgroundColor: "#F9FAFB",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
            >
              <Text className="text-base font-semibold text-gray-900">
                Anuncio
              </Text>
              <Input
                label="¿Quién aprobó el ingreso? *"
                value={aprobadoPor}
                onChangeText={setAprobadoPor}
                placeholder="Nombre de quien aprobó"
              />
              <Input
                label="Anotaciones adicionales"
                value={anotacionesGuardia}
                onChangeText={setAnotacionesGuardia}
                placeholder="Ej.: ingresó con una maleta, acompañado de..."
                multiline
                rows={3}
              />
            </View>
          )}

          {/* Guardia: photo upload — último campo del anuncio */}
          {esGuardia && (
            <View
              className="rounded-2xl p-4 gap-3"
              style={{
                backgroundColor: "#F9FAFB",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
            >
              <Text className="text-sm font-semibold text-gray-900">
                Foto (opcional)
              </Text>
              <Text className="text-xs text-gray-500">
                Tomá una foto del visitante o del vehículo al momento del
                ingreso.
              </Text>
              <View className="flex-row gap-2">
                {fotosIngreso.map((f, i) => (
                  <View
                    key={i}
                    className="w-20 h-20 rounded-xl items-center justify-center"
                    style={{ backgroundColor: "#E5E7EB" }}
                  >
                    <Ionicons name="image" size={24} color="#9CA3AF" />
                  </View>
                ))}
                <Pressable
                  onPress={() =>
                    setFotosIngreso([...fotosIngreso, `foto_${Date.now()}`])
                  }
                  className="w-20 h-20 rounded-xl items-center justify-center"
                  style={{
                    borderWidth: 2,
                    borderColor: "#D1D5DB",
                    borderStyle: "dashed",
                  }}
                >
                  <Ionicons name="camera" size={24} color="#9CA3AF" />
                </Pressable>
              </View>
            </View>
          )}

          {/* Submit */}
          <Button onPress={handleGuardar}>Aceptar</Button>

          <View className="h-4" />
        </>
      )}

      {/* Aviso legal al marcar un acompañante como menor de edad */}
      <Modal
        visible={showAvisoMenores}
        onClose={() => setShowAvisoMenores(false)}
        title="Aviso legal — menores de edad"
      >
        <View className="items-center gap-4">
          <Text style={{ fontSize: 40 }}>👶⚠️</Text>
          <Text
            className="text-base text-gray-900 text-center"
            style={{ lineHeight: 24 }}
          >
            Si el invitado es menor de edad, debe ingresar con su
            padre/madre/tutor legal con la documentación respectiva. Este
            edificio está comprometido con la prevención del abuso sexual de
            menores y la trata de personas.
          </Text>
          <Button fullWidth onPress={() => setShowAvisoMenores(false)}>
            Entendido
          </Button>
        </View>
      </Modal>
    </ScrollView>
  );
}
