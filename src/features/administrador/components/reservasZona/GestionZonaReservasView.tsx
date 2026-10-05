import { theme } from "@/config";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Image,
  Linking,
  ScrollView,
  Text,
  View,
} from "react-native";
import {
  Button,
  CampoFecha,
  CampoHora,
  Input,
  Modal,
  Select,
} from "@/shared/components";
import zonaIcons, { zonaBanners } from "@/assets/icons/zonas";
import { useZonas } from "@/features/zonas/hooks";
import { urlComprobante } from "@/features/zonas/services/zonas.repo";
import { useUnidadesDisponibles } from "@/shared/hooks";
import { ReservaDeQuien } from "./ReservaDeQuien";
import { useAdministradorReservasZona } from "../../hooks/useAdministradorReservasZona";
import { reservaZonaEditSchema } from "../../schemas/reservasZona.schema";
import type { ReservaZonaEditValues } from "../../types/reservasZona";
import type { ReservaZona } from "@/shared/types";
import { formatDateInput, formatDateShortMonth } from "@/shared/utils";

type ReservaVista = ReservaZona & {
  fechaISO: string;
  horaInicio: string;
  horaFin: string;
  estadoVista: string;
};

const ESTADO_STYLES: Record<
  string,
  { color: string; backgroundColor: string }
> = {
  Confirmada: {
    color: theme.colors.success,
    backgroundColor: theme.colors.successLight,
  },
  Pendiente: {
    color: theme.colors.warningDark,
    backgroundColor: theme.colors.warningSoft,
  },
  Cancelada: {
    color: theme.colors.dangerDark,
    backgroundColor: theme.colors.dangerLight,
  },
  Cancelado: {
    color: theme.colors.dangerDark,
    backgroundColor: theme.colors.dangerLight,
  },
  Rechazada: {
    color: theme.colors.dangerDark,
    backgroundColor: theme.colors.dangerLight,
  },
  Aprobado: {
    color: theme.colors.success,
    backgroundColor: theme.colors.successLight,
  },
  Reservado: {
    color: theme.colors.secondary,
    backgroundColor: theme.colors.infoBg,
  },
  Disponible: {
    color: theme.colors.textSecondary,
    backgroundColor: theme.colors.borderLight,
  },
  "No disponible": {
    color: theme.colors.dangerDark,
    backgroundColor: theme.colors.dangerLight,
  },
};

/*
  Aqui habia una lista de residentes escrita a mano —"Alberto Manual", "Sofia
  Martinez", "Luis Torres"— que no existe en ningun condominio, y un selector
  que la ofrecia para "cambiar" el residente de una reserva. Quien reserva es
  una clave foranea (`solicitada_por`); no se reasigna desde aqui, igual que
  no se reasigna la vivienda. El propio archivo ya lo decia en `saveEdit` y el
  formulario seguia pidiendolo.
*/

function parseHorario(horario = "") {
  const match = horario.match(/(\w+)\s+(\d+)\s*hs\s*a\s*(\d+[\d:]*)\s*hs/);
  if (!match) {
    const [horaInicio = "", horaFin = ""] = horario
      .split("-")
      .map((value) => value.trim());
    return {
      fechaISO: "",
      horaInicio: horaInicio.slice(0, 5),
      horaFin: horaFin.slice(0, 5),
    };
  }
  const dias: Record<string, number> = {
    Domingo: 0,
    Lunes: 1,
    Martes: 2,
    Miércoles: 3,
    Viernes: 5,
    Sábado: 6,
    Sabado: 6,
    Jueves: 4,
  };
  const day = dias[match[1]];
  if (day === undefined) return { fechaISO: "", horaInicio: "", horaFin: "" };
  const now = new Date();
  const date = new Date(now);
  date.setDate(date.getDate() + ((day + 7 - date.getDay()) % 7));
  const fechaISO = formatDateInput(date);
  const horaInicio = `${match[2].padStart(2, "0")}:00`;
  const horaFinParts = match[3].split(":");
  const horaFin = `${horaFinParts[0].padStart(2, "0")}:${(horaFinParts[1] || "00").padStart(2, "0")}`;
  return { fechaISO, horaInicio, horaFin };
}

function toISO(fecha = "") {
  if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return fecha;
  const match = fecha.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : fecha;
}

function formatFecha(fecha = "") {
  const iso = toISO(fecha);
  if (!iso) return "";
  const date = new Date(`${iso}T12:00:00`);
  return formatDateShortMonth(date);
}

function normalizeReserva(reserva: ReservaZona): ReservaVista {
  const horario = parseHorario(reserva.horario);
  return {
    ...reserva,
    fechaISO: toISO(reserva.fecha || horario.fechaISO),
    horaInicio: (reserva.horario.includes("hs")
      ? horario.horaInicio
      : reserva.horario.split("-")[0]?.trim() || ""
    ).slice(0, 5),
    horaFin: (reserva.horario.includes("hs")
      ? horario.horaFin
      : reserva.horario.split("-")[1]?.trim() || ""
    ).slice(0, 5),
    estadoVista:
      reserva.estado === "Reservado"
        ? "Confirmada"
        : reserva.estado === "Rechazado"
          ? "Rechazada"
          : reserva.estado || "Pendiente",
  };
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between gap-4">
      <Text className="text-sm text-gray-500">{label}</Text>
      <Text className="flex-1 text-right text-base font-medium text-gray-900">
        {value || "—"}
      </Text>
    </View>
  );
}


export function GestionZonaReservasView({
  id,
  onCreate,
}: {
  id: string;
  onCreate: (depto: string) => void;
}) {
  const { gestionZonas } = useZonas();
  const { codigosDe } = useUnidadesDisponibles();
  const zona = gestionZonas[id];
  const {
    data: allReservations = [],
    updateEstado,
    updateReserva,
    deleteReserva,
  } = useAdministradorReservasZona(id);
  const [filter, setFilter] = useState<"todas" | "futuras" | "pasadas">(
    "todas",
  );
  const [sortAsc, setSortAsc] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [department, setDepartment] = useState("");
  const [detail, setDetail] = useState<ReservaVista | null>(null);
  const [editing, setEditing] = useState<ReservaVista | null>(null);
  const [canceling, setCanceling] = useState<ReservaVista | null>(null);
  const [deleting, setDeleting] = useState<ReservaVista | null>(null);
  const [formError, setFormError] = useState("");

  /*
    El bucket es privado: no vale con la ruta, hace falta una URL firmada. Solo
    la devuelve a quien ya podia ver la reserva.
  */
  const verComprobante = async (ruta: string) => {
    try {
      const url = await urlComprobante(ruta);
      await Linking.openURL(url);
    } catch {
      setFormError("No se pudo abrir el comprobante");
    }
  };
  const { control, handleSubmit, reset, watch } =
    useForm<ReservaZonaEditValues>({
      resolver: zodResolver(reservaZonaEditSchema),
      defaultValues: {
        fecha: "",
        horaInicio: "",
        horaFin: "",
        comentarios: "",
      },
    });
  const reservations = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const list = allReservations
      .map(normalizeReserva)
      .filter(
        (item) =>
          filter === "todas" ||
          (filter === "futuras"
            ? item.fechaISO >= today
            : item.fechaISO < today),
      );
    return list.sort((a, b) => {
      const comparison = `${a.fechaISO}${a.horaInicio}`.localeCompare(
        `${b.fechaISO}${b.horaInicio}`,
      );
      return sortAsc ? comparison : -comparison;
    });
  }, [allReservations, filter, sortAsc]);
  const banner =
    (zona && (zonaBanners as Record<string, number>)[zona.id]) ||
    (zona && (zonaIcons as Record<string, number>)[zona.id]);

  const startEdit = (reservation: ReservaVista) => {
    setEditing(reservation);
    reset({
      fecha: reservation.fechaISO || "",
      horaInicio: reservation.horaInicio || "",
      horaFin: reservation.horaFin || "",
      comentarios: reservation.comentarios || "",
    });
    setFormError("");
  };
  const saveEdit = (values: ReservaZonaEditValues) => {
    const { horaInicio, horaFin } = values;
    if (!values.fecha || !horaInicio || !horaFin)
      return setFormError("Completa todos los campos obligatorios");
    if (horaInicio >= horaFin)
      return setFormError("La hora de fin debe ser posterior a la de inicio");
    // El nombre y el departamento no se editan aqui: salen de la zona y de la
    // unidad reservada, que son claves foraneas.
    if (editing)
      updateReserva(editing.uuid ?? "", {
        fecha: values.fecha,
        horaInicio,
        horaFin,
        comentarios: values.comentarios,
      });
    setEditing(null);
    setFormError("");
  };

  if (!zona)
    return (
      <View className="items-center px-4 py-10">
        <Text className="text-base text-gray-500">Zona no encontrada</Text>
      </View>
    );

  return (
    <>
      <ScrollView className="flex-1" contentContainerClassName="pb-6">
        <View
          className="h-[150px] overflow-hidden"
          style={{ backgroundColor: theme.colors.zonaSinFotoClara }}
        >
          {banner ? (
            <Image
              style={{ height: "100%", width: "100%" }}
              source={banner}
              resizeMode="cover"
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Text className="text-5xl opacity-50">🏠</Text>
            </View>
          )}
          <View className="absolute inset-0 justify-end bg-black/30 px-4 py-3">
            <Text className="text-2xl font-bold text-white">{zona.nombre}</Text>
          </View>
        </View>
        <View className="mb-4 gap-2.5 px-4 pt-3">
          <View className="flex-row flex-wrap gap-2">
            <Text className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-900">
              {zona.tipo}
            </Text>
            <Text
              className={`rounded-full px-3 py-1 text-xs ${zona.activa ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
            >
              {zona.activa ? "Activa" : "Inactiva"}
            </Text>
            <Text className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-900">
              🕐 {zona.horarioApertura} - {zona.horarioCierre}
            </Text>
          </View>
        </View>
        <View className="mb-3 gap-2.5 px-4">
          <View className="flex-row flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={filter === "todas" ? "primary" : "secondary"}
              onPress={() => setFilter("todas")}
            >
              Todas
            </Button>
            <Button
              size="sm"
              variant={filter === "futuras" ? "primary" : "secondary"}
              onPress={() => setFilter("futuras")}
            >
              Futuras
            </Button>
            <Button
              size="sm"
              variant={filter === "pasadas" ? "primary" : "secondary"}
              onPress={() => setFilter("pasadas")}
            >
              Pasadas
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onPress={() => setSortAsc((value) => !value)}
            >
              {sortAsc ? "↑ Fecha" : "↓ Fecha"}
            </Button>
          </View>
          <Button
            fullWidth
            onPress={() => {
              setDepartment("");
              setCreateOpen(true);
            }}
          >
            + Crear Reserva
          </Button>
        </View>
        <View className="gap-2.5 px-4">
          {reservations.length === 0 ? (
            <Text className="px-4 py-10 text-center text-base text-gray-500">
              No hay reservas
              {filter !== "todas"
                ? ` ${filter === "futuras" ? "futuras" : "pasadas"}`
                : ""}{" "}
              para esta zona.
            </Text>
          ) : (
            reservations.map((reservation) => {
              const status =
                ESTADO_STYLES[reservation.estadoVista] ||
                ESTADO_STYLES.Disponible;
              return (
                <View
                  key={reservation.id}
                  className="gap-2 rounded-2xl bg-white p-4"
                  style={{
                    elevation: 3,
                    shadowColor: theme.colors.shadow,
                    shadowOpacity: 0.08,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 2 },
                  }}
                >
                  <View className="flex-row items-start gap-2">
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-gray-900">
                        {reservation.solicitante ||
                          reservation.depto ||
                          "Reserva"}
                      </Text>
                      <Text className="mt-0.5 text-sm text-gray-500">
                        {reservation.depto}{" "}
                        {reservation.reservaNum
                          ? `· N° ${reservation.reservaNum}`
                          : ""}
                      </Text>
                    </View>
                    <Text
                      className="rounded-full px-2.5 py-1 text-xs font-semibold"
                      style={status}
                    >
                      {reservation.estadoVista}
                    </Text>
                  </View>
                  <View className="flex-row flex-wrap gap-2.5">
                    <Text className="text-xs text-gray-400">
                      📅{" "}
                      {reservation.fechaISO
                        ? formatFecha(reservation.fechaISO)
                        : "—"}
                    </Text>
                    {Boolean(reservation.horaInicio) && (
                      <Text className="text-xs text-gray-400">
                        ⏰ {reservation.horaInicio} - {reservation.horaFin}
                      </Text>
                    )}
                  </View>
                  {Boolean(reservation.comentarios) && (
                    <Text className="text-xs leading-4 text-gray-500">
                      💬 {reservation.comentarios}
                    </Text>
                  )}
                  <View className="flex-row flex-wrap gap-1.5">
                    {/*
                      Aprobar y rechazar, que es lo que se viene a hacer a una
                      pantalla llamada «Gestión de Zonas Comunes» y era justo
                      lo unico que no se podia hacer aqui (R-37): las dos
                      opciones existian solo en `ZonaDetallesScreen`, la
                      pantalla del residente, escondidas tras el menu de una
                      reserva y condicionadas al rol.

                      Solo con la reserva pendiente: una ya resuelta se cambia
                      editandola, no volviendola a resolver.
                    */}
                    {reservation.estado === "Pendiente" && (
                      <>
                        <View className="min-w-[45%] flex-1">
                          <Button
                            size="sm"
                            fullWidth
                            onPress={() =>
                              updateEstado(reservation.uuid ?? "", "Aprobado")
                            }
                          >
                            Aprobar
                          </Button>
                        </View>
                        <View className="min-w-[45%] flex-1">
                          <Button
                            size="sm"
                            variant="danger"
                            fullWidth
                            onPress={() =>
                              updateEstado(reservation.uuid ?? "", "Rechazado")
                            }
                          >
                            Rechazar
                          </Button>
                        </View>
                      </>
                    )}
                    <View className="min-w-[45%] flex-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        fullWidth
                        onPress={() => setDetail(reservation)}
                      >
                        Detalle
                      </Button>
                    </View>
                    <View className="min-w-[45%] flex-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        fullWidth
                        onPress={() => startEdit(reservation)}
                      >
                        Editar
                      </Button>
                    </View>
                    <View className="min-w-[45%] flex-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        fullWidth
                        onPress={() => setCanceling(reservation)}
                      >
                        Cancelar
                      </Button>
                    </View>
                    <View className="min-w-[45%] flex-1">
                      <Button
                        size="sm"
                        variant="danger"
                        fullWidth
                        onPress={() => setDeleting(reservation)}
                      >
                        Eliminar
                      </Button>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <Modal
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nueva Reserva"
      >
        <View className="gap-4">
          <Select
            label="¿Para qué departamento es la reserva?"
            value={department}
            options={codigosDe()}
            onChange={(value) => setDepartment(String(value))}
            placeholder="Seleccione el departamento"
          />
          <Button
            fullWidth
            disabled={!department}
            onPress={() => {
              setCreateOpen(false);
              onCreate(department);
            }}
          >
            Continuar
          </Button>
        </View>
      </Modal>
      <Modal
        visible={!!editing}
        onClose={() => {
          setEditing(null);
          setFormError("");
        }}
        title="Editar Reserva"
      >
        <View className="gap-4">
          <ReservaDeQuien
            solicitante={editing?.solicitante}
            depto={editing?.depto}
          />
          {/*
            Fecha y horas en linea: este formulario ya vive dentro de un modal.
            Antes habia tres `PickerField` que encendian un `DateTimePicker`,
            **que en web devuelve `null`**: la administracion no podia editar ni
            la fecha ni las horas de una reserva.
          */}
          <Controller
            control={control}
            name="fecha"
            render={({ field }) => (
              <CampoFecha
                enLinea
                label="Fecha *"
                value={field.value ?? ""}
                onChange={field.onChange}
                placeholder="Seleccionar fecha"
              />
            )}
          />
          <View className="flex-row gap-2.5">
            <Controller
              control={control}
              name="horaInicio"
              render={({ field }) => (
                <View className="flex-1">
                  <CampoHora
                    enLinea
                    label="Hora inicio *"
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    placeholder="Seleccionar hora"
                  />
                </View>
              )}
            />
            <Controller
              control={control}
              name="horaFin"
              render={({ field }) => (
                <View className="flex-1">
                  <CampoHora
                    enLinea
                    label="Hora fin *"
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    /* No deja elegir un fin anterior al inicio. */
                    minima={watch("horaInicio") || undefined}
                    placeholder="Seleccionar hora"
                  />
                </View>
              )}
            />
          </View>
          <Controller
            control={control}
            name="comentarios"
            render={({ field }) => (
              <Input
                label="Observaciones"
                value={field.value}
                onChangeText={field.onChange}
                placeholder="Opcional"
                multiline
                rows={3}
              />
            )}
          />
          {Boolean(formError) && (
            <Text className="text-center text-sm text-red-600">
              {formError}
            </Text>
          )}
          <Button fullWidth onPress={() => void handleSubmit(saveEdit)()}>
            Guardar Cambios
          </Button>
        </View>
      </Modal>
      <Modal
        visible={!!detail}
        onClose={() => setDetail(null)}
        title="Detalle de Reserva"
      >
        {detail && (
          <View className="gap-3">
            <InfoRow label="N° Reserva" value={detail.reservaNum} />
            <InfoRow label="Residente" value={detail.solicitante ?? "—"} />
            <InfoRow label="Apartamento" value={detail.depto} />
            <InfoRow label="Fecha" value={formatFecha(detail.fechaISO)} />
            <InfoRow
              label="Horario"
              value={
                detail.horaInicio
                  ? `${detail.horaInicio} - ${detail.horaFin}`
                  : ""
              }
            />
            <View className="flex-row items-center justify-between gap-4">
              <Text className="text-sm text-gray-500">Estado</Text>
              <Text
                className="rounded-full px-2.5 py-1 text-xs font-semibold"
                style={
                  ESTADO_STYLES[detail.estadoVista] || ESTADO_STYLES.Disponible
                }
              >
                {detail.estadoVista}
              </Text>
            </View>
            {Boolean(detail.comentarios) && (
              <View>
                <Text className="mb-1 text-sm text-gray-500">
                  Observaciones
                </Text>
                <Text className="text-sm leading-5 text-gray-900">
                  {detail.comentarios}
                </Text>
              </View>
            )}
            {/*
              El comprobante de pago, que es lo que el KT (flujo 4.4) manda
              mirar antes de aprobar: «el Administrador revisa el comprobante y
              aprueba manualmente — no hay verificacion automatica contra el
              banco».

              `subirComprobante` y las dos politicas del bucket estaban hechas
              desde hacia dias y no las llamaba ninguna pantalla, asi que la
              aprobacion se hacia a ciegas.
            */}
            <View>
              <Text className="mb-1 text-sm text-gray-500">
                Comprobante de pago
              </Text>
              {detail.comprobante ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onPress={() => void verComprobante(detail.comprobante!)}
                >
                  Ver comprobante
                </Button>
              ) : (
                <Text className="text-sm leading-5 text-gray-500">
                  Todavía no lo envió. El pago se hace fuera de la aplicación y
                  se aprueba a mano.
                </Text>
              )}
            </View>
          </View>
        )}
      </Modal>
      <Modal
        visible={!!canceling}
        onClose={() => setCanceling(null)}
        title="Cancelar Reserva"
      >
        <View className="gap-4">
          <Text className="text-center text-base leading-6 text-gray-900">
            ¿Deseas cancelar esta reserva?
          </Text>
          {canceling && (
            <View className="gap-1 rounded-xl bg-gray-100 p-3">
              <Text className="text-sm text-gray-900">
                <Text className="font-bold">Residente:</Text>{" "}
                {canceling.solicitante || canceling.depto}
              </Text>
              <Text className="text-sm text-gray-900">
                <Text className="font-bold">Fecha:</Text>{" "}
                {formatFecha(canceling.fechaISO)}
              </Text>
              <Text className="text-sm text-gray-900">
                <Text className="font-bold">Horario:</Text>{" "}
                {canceling.horaInicio} - {canceling.horaFin}
              </Text>
            </View>
          )}
          <View className="flex-row gap-2.5">
            <View className="flex-1">
              <Button
                variant="secondary"
                fullWidth
                onPress={() => setCanceling(null)}
              >
                Volver
              </Button>
            </View>
            <View className="flex-1">
              <Button
                variant="danger"
                fullWidth
                onPress={() => {
                  if (canceling)
                    updateEstado(canceling.uuid ?? "", "Cancelada");
                  setCanceling(null);
                }}
              >
                Cancelar Reserva
              </Button>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={!!deleting}
        onClose={() => setDeleting(null)}
        title="Eliminar Reserva"
      >
        <View className="gap-4">
          <Text className="text-center text-base leading-6 text-gray-900">
            ¿Deseas eliminar permanentemente esta reserva?
          </Text>
          <Text className="text-center text-sm text-gray-500">
            Esta acción no puede deshacerse.
          </Text>
          <View className="flex-row gap-2.5">
            <View className="flex-1">
              <Button
                variant="secondary"
                fullWidth
                onPress={() => setDeleting(null)}
              >
                Cancelar
              </Button>
            </View>
            <View className="flex-1">
              <Button
                variant="danger"
                fullWidth
                onPress={() => {
                  if (deleting) deleteReserva(deleting.uuid ?? "");
                  setDeleting(null);
                }}
              >
                Eliminar
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
