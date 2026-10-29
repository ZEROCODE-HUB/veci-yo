import { theme } from "@/config";
import { TIPO_DOCUMENTO } from "@/shared/constants";
import { useLista } from "@/shared/hooks/useLista";
import React, { useState } from "react";
import { Image, Linking, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Badge, ListaDeHoras, Modal, Toggle } from "@/shared/components";
import { ScreenLayout } from "@/shared/layouts";
import type { Invitado, VisitaItem } from "@/shared/types";
import { TIPO_LABELS } from "../constants";
import { TIPO_VISITA_ASSETS } from "./tipoVisitaAssets";
import { VisitaGuardiaDetail } from "./VisitaGuardiaDetail";
import { EntradaDelHuesped } from "./EntradaDelHuesped";
import { EstadoPorteria } from "./EstadoPorteria";
import { HistorialDeLaEstancia } from "./HistorialDeLaEstancia";
import { bloqueoDeLlegada } from "../helpers/bloqueoDeLlegada";
import { formatDateInput, formatTime } from "@/shared/utils";
import { toComparableDate } from "../helpers/visitas.helpers";
import { placasConResponsable } from "../helpers/vehiculos";
import { VehiculosEnPorteria } from "./VehiculosEnPorteria";
import { MenorEnPorteria } from "./MenorEnPorteria";
import { ConfirmarSalida } from "./ConfirmarSalida";

interface Props {
  item: VisitaItem;
  onBack: () => void;
  onAssignParking?: (guestIndex: number) => void;
  onToggleInstruction?: () => void;
  onCallAnnounce?: () => void;
  onUpdateEntryNotes?: (notes: string) => void;
  onUpdateExitNotes?: (notes: string) => void;
  onAddEntryPhotos?: (photos: string[]) => void;
  onAddExitPhotos?: (photos: string[]) => void;
  onToggleArrival?: (guestIndex: number, arrived: boolean) => void;
  onVerifyDocument?: (guestIndex: number, numero: string) => Promise<boolean>;
  /** Devuelve la ruta de la foto guardada. */
  onPhotoDocument?: (guestIndex: number, uri: string) => Promise<string | void>;
  /** El edificio exige verificar el documento antes de la entrada. */
  exigeDocumento?: boolean;
  onUpdateArrivalTime?: (guestIndex: number, time: string) => void;
  onUpdateDepartureTime?: (guestIndex: number, time: string) => void;
  lugaresDisponibles?: number;
}

/**
 * Lo que ve el guardia al abrir una reserva.
 *
 * Tenia dos problemas, y el de aspecto era el menor. La tarjeta del huesped
 * temporal pintaba un recuadro lavanda con el texto "Foto extraida del
 * documento" y, girada quince grados como si fuera un sello, la firma
 * **"Roberto Hornado · Porteria"**: un nombre escrito a mano en el codigo,
 * heredado de la maqueta. Sobre una reserva de verdad eso afirma que una
 * persona concreta verifico el documento, y no lo verifico nadie.
 *
 * Ahora se muestra el documento cuando lo hay --`invitado.documentos`-- y,
 * cuando no, se dice que no se capturo. El proveedor de identidad sigue sin
 * cerrarse (R-68), asi que el caso normal hoy es el segundo.
 *
 * Lo demas era maquetacion: la tarjeta llevaba un `p-2` y ademas `px-4`
 * adentro, asi que la barra gris de los botones quedaba flotando sin llegar a
 * los bordes; los datos del huesped --documento, hora de ingreso-- solo salian
 * al abrir el modal; y las etiquetas de 8px no se leian.
 */
export function ReservaGuardiaDetail({
  item,
  onBack,
  onAssignParking,
  onToggleInstruction,
  onCallAnnounce,
  onUpdateEntryNotes,
  onUpdateExitNotes,
  onAddEntryPhotos,
  onAddExitPhotos,
  onToggleArrival,
  onVerifyDocument,
  onPhotoDocument,
  exigeDocumento = false,
  onUpdateArrivalTime,
  onUpdateDepartureTime,
  lugaresDisponibles = 0,
}: Props) {
  // Quién responde por un menor: lista `responsables_de_menor` (28/10/2026).
  const parentescos = useLista("responsables_de_menor");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [porVerificar, setPorVerificar] = useState<number | null>(null);
  const [salidaPorConfirmar, setSalidaPorConfirmar] = useState<number | null>(null);
  // El menor que la portería está confirmando con su documento (14/10/2026).
  const [menorAConfirmar, setMenorAConfirmar] = useState<Invitado | null>(null);
  const [timePicker, setTimePicker] = useState<{
    index: number;
    field: "arrival" | "departure";
  } | null>(null);

  const guests: Invitado[] = item.invitados.length
    ? item.invitados
    : [{ nombre: item.nombre, llego: Boolean(item.llego) }];
  const selectedGuest = selectedIndex === null ? null : guests[selectedIndex];
  const esHuespedTemporal = item.tipo === "huesped-temporal";

  const horaActual = () => formatTime(new Date());

  const corregirHora = (hora: string) => {
    const cual = timePicker;
    setTimePicker(null);
    if (!cual) return;
    if (cual.field === "arrival") onUpdateArrivalTime?.(cual.index, hora);
    else onUpdateDepartureTime?.(cual.index, hora);
  };

  // La reserva todavia no ha empezado: hoy es anterior a su primer dia.
  const hoy = new Date();
  const hoyComparable = formatDateInput(hoy);
  const inicio = toComparableDate(item.fechaDesde);
  const llegaAntesDeTiempo = Boolean(inicio) && inicio > hoyComparable;

  const placas = placasConResponsable(item.vehiculos);

  return (
    <ScreenLayout withScroll padding={false}>
      <View className="px-4 pb-8 gap-3">
        <Pressable
          onPress={onBack}
          className="flex-row items-center gap-1 py-2 self-start"
          hitSlop={8}
        >
          <Ionicons
            name="chevron-back"
            size={18}
            color={theme.colors.primary}
          />
          <Text className="text-sm font-semibold text-primary">
            {esHuespedTemporal ? "Volver a reservas" : "Volver a visitas"}
          </Text>
        </Pressable>

        {/*
          La cabecera de la reserva, una sola vez. Antes cada huesped repetia la
          torre, el tipo y las fechas, asi que con tres huespedes lo mismo salia
          tres veces y no se distinguia lo que cambiaba de lo que no.
        */}
        <View className="rounded-2xl bg-white shadow-sm overflow-hidden">
          <View className="flex-row items-center gap-3 px-4 pt-4 pb-3">
            <Image
              source={TIPO_VISITA_ASSETS[item.tipo]}
              style={{ width: 44, height: 44, borderRadius: 22 }}
              resizeMode="cover"
            />
            <View className="flex-1">
              <Text
                className="text-base font-bold text-gray-900"
                numberOfLines={1}
              >
                {item.reserva ? `Reserva ${item.reserva}` : item.nombre}
              </Text>
              <Text className="text-sm text-gray-500" numberOfLines={1}>
                {[item.torre, item.depto].filter(Boolean).join(" · ")}
                {item.torre || item.depto ? " · " : ""}
                {TIPO_LABELS[item.tipo]}
              </Text>
            </View>
          </View>

          <View className="flex-row flex-wrap gap-x-5 gap-y-2 px-4 pb-3">
            <Dato
              icono="calendar-outline"
              etiqueta="Desde"
              valor={item.fechaDesde}
            />
            <Dato
              icono="calendar-outline"
              etiqueta="Hasta"
              valor={item.fechaHasta}
            />
            <Dato
              icono="people-outline"
              etiqueta={esHuespedTemporal ? "Huéspedes" : "Personas"}
              valor={String(guests.length)}
            />
          </View>

          {esHuespedTemporal && Boolean(item.reserva) && (
            <View className="px-4 pb-3">
              <Dato
                icono="person-outline"
                etiqueta="Responsable"
                valor={item.nombre}
              />
            </View>
          )}

          <View className="flex-row flex-wrap items-center gap-2 px-4 pb-4">
            {/*
              `Rechazado` se muestra como `Pendiente`: en la porteria una
              reserva rechazada no le dice al guardia que hacer, y el estado que
              le sirve es que todavia no puede entrar.
            */}
            <Badge status={item.estado} />
            {/* Lo que falta, en palabras (16/10/2026). */}
            {esHuespedTemporal ? <EstadoPorteria item={item} /> : null}
            {Boolean(
              item.aviso === "notificar_y_anunciar" && item.telefonoResidente,
            ) && (
              <Pressable
                onPress={() => Linking.openURL(`tel:${item.telefonoResidente}`)}
                className="flex-row items-center gap-1 rounded-full px-3 py-1.5"
                style={{ backgroundColor: theme.colors.primaryLight }}
              >
                <Ionicons name="call" size={13} color={theme.colors.primary} />
                <Text className="text-xs font-semibold text-primary">
                  {item.telefonoResidente}
                </Text>
              </Pressable>
            )}
            {item.tieneVehiculo && (
              <Pastilla
                icono="car-outline"
                texto={placas || "Con vehículo"}
                fondo={theme.colors.borderLight}
                color={theme.colors.textSecondary}
              />
            )}
            {/* Las mascotas que registró el huésped (QA 23/10/2026). */}
            {(item.mascotas?.length ?? 0) > 0 ? (
              <Pastilla
                icono="paw-outline"
                texto={item.mascotas!.map((m) => m.nombre).join(", ")}
                fondo={theme.colors.borderLight}
                color={theme.colors.textSecondary}
              />
            ) : item.traeMascota ? (
              <Pastilla
                icono="paw-outline"
                texto="Trae mascota"
                fondo={theme.colors.borderLight}
                color={theme.colors.textSecondary}
              />
            ) : null}
            {lugaresDisponibles > 0 && (
              <Pastilla
                icono="square-outline"
                texto={
                  lugaresDisponibles === 1
                    ? "1 lugar libre"
                    : `${lugaresDisponibles} lugares libres`
                }
                fondo={theme.colors.successSoft}
                color={theme.colors.success}
              />
            )}
          </View>
        </View>

        {guests.map((guest, index) => {
          // El indice que esperan las mutaciones: -1 cuando la visita no tiene
          // invitados y la tarjeta representa a la persona de la propia visita.
          const indiceMutacion = item.invitados.length ? index : -1;
          // La visita sin invitados guarda el documento en `item.ci`; cuando
          // los tiene, cada uno lleva el suyo.
          const numeroDocumento =
            guest.documentoNumero || (indiceMutacion === -1 ? item.ci : "");
          const bloqueo = bloqueoDeLlegada({
            esEstancia: esHuespedTemporal,
            exigeDocumento,
            persona: guest,
            tieneDocumento: Boolean(numeroDocumento),
            grupo: guests,
          });

          return (
            <View
              key={guest.uuid ?? `${guest.nombre}-${index}`}
              className="rounded-2xl bg-white shadow-sm overflow-hidden"
            >
              <View className="flex-row items-center gap-3 px-4 pt-4 pb-3">
                <View
                  className="items-center justify-center"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: theme.colors.bgMuted,
                  }}
                >
                  <Text className="text-xs font-bold text-gray-500">
                    {index + 1}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text
                    className="text-base font-bold text-gray-900"
                    numberOfLines={1}
                  >
                    {guest.nombre}
                  </Text>
                  <Text className="text-xs text-gray-500" numberOfLines={1}>
                    {/*
                      El número no se enseña. Decidido con el cliente el
                      12/10/2026: la portería tiene que teclear el que lee en
                      el documento, y con el número delante podía copiarlo.
                    */}
                    {numeroDocumento
                      ? `${
                          guest.tipoDocumento
                            ? TIPO_DOCUMENTO[guest.tipoDocumento]
                            : "Documento"
                        } declarado`
                      : "Sin documento declarado"}
                    {guest.esMenor ? " · Menor de edad" : ""}
                  </Text>
                  {/*
                    Con quien viene el niño. Hasta el 03/10/2026 aqui ponia
                    «Menor de edad» y nada mas: el guardia veia que era un niño
                    y no con quien entraba, que es justo lo que tiene que
                    comprobar en la puerta.
                  */}
                  {/*
                    Solo en una estancia: en una visita corriente nadie
                    pregunta quién responde por el niño, y «Sin responsable
                    declarado» acusaba de una falta que no se podía cometer.
                  */}
                  {/*
                    Desde el 27/10/2026 también en una visita corriente, si se
                    dijo (hueco 36): ahí sí se pregunta ya con quién viene.
                  */}
                  {Boolean(guest.esMenor && (esHuespedTemporal || guest.responsableId)) && (
                    <Text className="text-xs text-gray-500" numberOfLines={1}>
                      {guest.responsableId
                        ? `Responde por él: ${
                            guests.find((o) => o.uuid === guest.responsableId)
                              ?.nombre ?? "alguien de la reserva"
                          }${
                            guest.parentesco
                              ? ` · ${parentescos.etiquetaDe(guest.parentesco)}`
                              : ""
                          }${
                            // La autorización escrita solo se pide en una estancia.
                            esHuespedTemporal &&
                            (guest.parentesco === "tutor_legal" ||
                              guest.parentesco === "otro")
                              ? guest.tieneAutorizacion
                                ? " · con autorización"
                                : " · SIN autorización"
                              : ""
                          }`
                        : "Sin responsable declarado"}
                    </Text>
                  )}
                </View>
              </View>

              {esHuespedTemporal && (
                <View className="px-4 pb-3">
                  {/*
                    Aqui se pintaba la foto del documento que subio el huesped.
                    Se retira el 09/10/2026, decidido con el cliente: esa foto
                    es del anfitrion, no de la porteria --la base ya no se la
                    deja abrir--. La porteria compara el **numero** y deja su
                    propia foto, con marca de agua, como constancia.
                  */}
                  <View className="flex-row items-center gap-1">
                    <Ionicons
                      name={guest.fotoDePorteria ? "camera" : "camera-outline"}
                      size={14}
                      color={
                        guest.fotoDePorteria
                          ? theme.colors.success
                          : theme.colors.textMuted
                      }
                    />
                    <Text className="text-xs text-gray-500">
                      {guest.fotoDePorteria
                        ? "Foto de portería guardada"
                        : "Sin foto de portería todavía"}
                    </Text>
                  </View>
                  {guest.ciVerificado && (
                    <View className="flex-row items-center gap-1 mt-2">
                      <Ionicons
                        name="shield-checkmark"
                        size={14}
                        color={theme.colors.success}
                      />
                      <Text className="text-xs font-semibold text-green-700">
                        Documento verificado en portería
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {esHuespedTemporal && (
                <View className="px-4 pb-3 gap-3 border-t border-gray-100 pt-3">
                  {/*
                    Se avisa, no se bloquea. El KT decide para el aforo que las
                    reglas del edificio se muestren "como advertencia (no
                    bloqueo duro)", y aqui pesa ademas que el guardia tiene que
                    poder anotar lo que de verdad paso: si el huesped se
                    presenta un dia antes, la porteria lo registra y el dato
                    dice la verdad. Lo que no puede es pasar inadvertido, que
                    es lo que ocurria.
                  */}
                  {llegaAntesDeTiempo && !guest.llego && (
                    <View
                      className="flex-row items-start gap-2 rounded-xl px-3 py-2"
                      style={{ backgroundColor: theme.colors.warningLight }}
                    >
                      <Ionicons
                        name="alert-circle"
                        size={16}
                        color={theme.colors.warningDark}
                        style={{ marginTop: 1 }}
                      />
                      <Text className="flex-1 text-xs text-amber-800">
                        La reserva empieza el {item.fechaDesde}. Si registras la
                        llegada hoy, queda anotado que entró antes.
                      </Text>
                    </View>
                  )}
                  {/*
                    Sin verificar el documento no hay llegada. Hasta el
                    12/10/2026 la verificación vivía en «Ver detalles» y era
                    opcional: el guardia marcaba la llegada sin abrirla. La
                    base lo rechaza igual; aquí se le pone el paso delante.
                  */}
                  {bloqueo && !bloqueo.seVerificaAqui && (
                    <View
                      className="rounded-xl px-3 py-2.5"
                      style={{ backgroundColor: theme.colors.warningLight }}
                    >
                      <Text className="text-sm text-amber-800">
                        {bloqueo.motivo}
                      </Text>
                    </View>
                  )}
                  {bloqueo?.confirmarMenor ? (
                    <Pressable
                      onPress={() => setMenorAConfirmar(guest)}
                      accessibilityRole="button"
                      className="rounded-xl px-3 py-2.5 items-center"
                      style={{ backgroundColor: theme.colors.warningLight }}
                    >
                      <Text className="text-sm font-semibold text-amber-800">
                        👶 Confirmar al menor con su documento
                      </Text>
                    </Pressable>
                  ) : null}
                  {/*
                    Lo anotado sobre un menor se puede corregir mientras no
                    haya entrado (23/10/2026): antes, un toque equivocado
                    dejaba al niño esperando al anfitrión sin remedio.
                  */}
                  {guest.esMenor && guest.revisionMenor && !guest.llego ? (
                    <Pressable
                      onPress={() => setMenorAConfirmar(guest)}
                      accessibilityRole="button"
                      className="py-1 items-center"
                    >
                      <Text className="text-xs font-semibold text-primary underline">
                        Cambiar lo anotado sobre el menor
                      </Text>
                    </Pressable>
                  ) : null}
                  {bloqueo?.seVerificaAqui && (
                    <Pressable
                      onPress={() => setPorVerificar(index)}
                      accessibilityRole="button"
                      className="rounded-xl px-3 py-2.5 items-center"
                      style={{ backgroundColor: theme.colors.warningLight }}
                    >
                      <Text className="text-sm font-semibold text-amber-800">
                        🪪 Verificar documento para registrar la llegada
                      </Text>
                    </Pressable>
                  )}
                  <View className="flex-row items-center justify-between">
                    <Text className="shrink text-sm text-gray-900">
                      Registrar llegada
                    </Text>
                    <Toggle
                      value={Boolean(guest.llego)}
                      disabled={Boolean(bloqueo)}
                      onChange={(value) =>
                        onToggleArrival?.(indiceMutacion, value)
                      }
                    />
                  </View>
                  {/*
                    La salida vivia solo dentro del modal de "Ver detalles": para
                    cerrar una estancia habia que abrir otra pantalla. Va al
                    lado de la llegada, que es donde se busca.
                  */}
                  <View className="flex-row items-center justify-between">
                    <Text className="shrink text-sm text-gray-900">
                      Registrar salida
                    </Text>
                    <Toggle
                      value={Boolean(guest.horaSalida)}
                      disabled={!guest.llego}
                      onChange={(value) => {
                        if (value) setSalidaPorConfirmar(index);
                        else onUpdateDepartureTime?.(indiceMutacion, "");
                      }}
                    />
                  </View>
                  {salidaPorConfirmar === index && !guest.horaSalida ? (
                    <ConfirmarSalida
                      definitiva={false}
                      onCancelar={() => setSalidaPorConfirmar(null)}
                      onConfirmar={() => {
                        setSalidaPorConfirmar(null);
                        onUpdateDepartureTime?.(indiceMutacion, horaActual());
                      }}
                    />
                  ) : null}
                  <View className="flex-row gap-2">
                    <HoraCampo
                      label="Ingreso"
                      value={guest.horaIngreso}
                      onPress={() => setTimePicker({ index, field: "arrival" })}
                    />
                    <HoraCampo
                      label="Salida"
                      value={guest.horaSalida}
                      showWarning={Boolean(guest.horaSalida)}
                      onPress={() =>
                        setTimePicker({ index, field: "departure" })
                      }
                    />
                  </View>
                  {/*
                    En linea y no en un modal: esto vive dentro de la tarjeta de
                    un huesped concreto, y un modal perderia de vista a quien se
                    le esta corrigiendo la hora. Antes habia un `DateTimePicker`
                    que en web devuelve `null`, asi que no se abria nada.
                  */}
                  {timePicker?.index === index && (
                    <View className="mt-2 rounded-xl border border-gray-200 bg-white p-2">
                      <ListaDeHoras
                        value={
                          (timePicker.field === "arrival"
                            ? guest.horaIngreso
                            : guest.horaSalida) ?? ""
                        }
                        onChange={corregirHora}
                        paso={5}
                      />
                    </View>
                  )}
                </View>
              )}

              <View className="flex-row border-t border-gray-100">
                {/*
                  Con la estancia terminada ya no se asigna: el cupo lo soltó
                  la base al cerrarla y uno asignado después no lo suelta nadie.
                */}
                {onAssignParking && item.estado !== "Finalizado" && (
                  <Pressable
                    onPress={() => onAssignParking(index)}
                    className="flex-1 flex-row items-center justify-center gap-1.5 py-3.5 border-r border-gray-100"
                  >
                    <Ionicons
                      name="car-outline"
                      size={16}
                      color={theme.colors.textStrong}
                    />
                    <Text
                      className="text-sm font-semibold text-gray-700"
                      numberOfLines={1}
                    >
                      Estacionamiento
                    </Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={() => setSelectedIndex(index)}
                  className="flex-1 flex-row items-center justify-center gap-1 py-3.5"
                >
                  <Text
                    className="text-sm font-semibold text-primary"
                    numberOfLines={1}
                  >
                    Ver detalles
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={15}
                    color={theme.colors.primary}
                  />
                </Pressable>
              </View>
            </View>
          );
        })}

        {/*
          La portería también registra una PQRS desde la reserva (16/10/2026),
          y ve lo que pasó en la vivienda durante la estancia.
        */}
        {esHuespedTemporal && item.uuid ? (
          <View className="px-4">
            <HistorialDeLaEstancia
              visita={item}
              conPqrs={guests.some((g) => g.llego)}
            />
          </View>
        ) : null}

        {porVerificar !== null && guests[porVerificar] && (
          <Modal
            visible
            onClose={() => setPorVerificar(null)}
            title="Registro de entrada"
          >
            <EntradaDelHuesped
              persona={guests[porVerificar]}
              onVerificar={async (numero) =>
                (await onVerifyDocument?.(
                  item.invitados.length ? porVerificar : -1,
                  numero,
                )) ?? false
              }
              onCerrar={() => setPorVerificar(null)}
            />
          </Modal>
        )}

        {selectedGuest && (
          <Modal
            visible
            onClose={() => setSelectedIndex(null)}
            title={selectedGuest.nombre}
          >
            <VisitaGuardiaDetail
              item={item}
              personIndex={selectedIndex}
              exigeDocumento={exigeDocumento}
              onToggleInstruction={onToggleInstruction}
              onVerifyDocument={async (numero) =>
                (await onVerifyDocument?.(
                  item.invitados.length ? (selectedIndex ?? -1) : -1,
                  numero,
                )) ?? false
              }
              onPhotoDocument={(uri) =>
                onPhotoDocument?.(
                  item.invitados.length ? (selectedIndex ?? -1) : -1,
                  uri,
                ) ?? Promise.resolve()
              }
              onAssignParking={() => {
                /*
                  Se cierra esta ficha antes de abrir el de estacionamiento. Son
                  dos modales, y el segundo salia **detras** del primero: habia
                  que cerrar este a mano para descubrir que el otro llevaba ahi
                  todo el rato. Apilar modales no se arregla peleando con el
                  orden de pintado; se arregla no apilandolos.
                */
                const indice = item.invitados.length
                  ? (selectedIndex ?? -1)
                  : -1;
                setSelectedIndex(null);
                onAssignParking?.(indice);
              }}
              onCallAnnounce={onCallAnnounce}
              lugaresDisponibles={lugaresDisponibles}
              onToggleDeparture={(registered) =>
                onUpdateDepartureTime?.(
                  item.invitados.length ? (selectedIndex ?? -1) : -1,
                  registered ? horaActual() : "",
                )
              }
              onUpdateEntryNotes={onUpdateEntryNotes}
              onUpdateExitNotes={onUpdateExitNotes}
              onAddEntryPhotos={onAddEntryPhotos}
              onAddExitPhotos={onAddExitPhotos}
              onToggleArrival={(arrived) =>
                onToggleArrival?.(
                  item.invitados.length ? (selectedIndex ?? -1) : -1,
                  arrived,
                )
              }
              onUpdateArrivalTime={(time) =>
                onUpdateArrivalTime?.(
                  item.invitados.length ? (selectedIndex ?? -1) : -1,
                  time,
                )
              }
              onUpdateDepartureTime={(time) =>
                onUpdateDepartureTime?.(
                  item.invitados.length ? (selectedIndex ?? -1) : -1,
                  time,
                )
              }
            />
          </Modal>
        )}
        {/* Corregir placas y apuntar el vehículo con el que llegan (14/10/2026). */}
        <VehiculosEnPorteria visita={item} />
        {menorAConfirmar ? (
          <MenorEnPorteria
            visible
            onClose={() => setMenorAConfirmar(null)}
            invitadoUuid={menorAConfirmar.uuid ?? ""}
            nombre={menorAConfirmar.nombre}
            adulto={
              guests.find((o) => o.uuid === menorAConfirmar.responsableId)
                ?.nombre
            }
            telefonoAnfitrion={item.telefonoResidente}
          />
        ) : null}
      </View>
    </ScreenLayout>
  );
}

/** Un dato con su etiqueta. Se omite entero si no hay valor: media etiqueta suelta confunde mas que la ausencia. */
function Dato({
  icono,
  etiqueta,
  valor,
}: {
  icono: React.ComponentProps<typeof Ionicons>["name"];
  etiqueta: string;
  valor?: string;
}) {
  if (!valor) return null;

  return (
    <View className="flex-row items-center gap-1.5">
      <Ionicons name={icono} size={14} color={theme.colors.textMuted} />
      <Text className="text-xs text-gray-400">{etiqueta}</Text>
      <Text className="text-xs font-semibold text-gray-900">{valor}</Text>
    </View>
  );
}

function Pastilla({
  icono,
  texto,
  fondo,
  color,
}: {
  icono: React.ComponentProps<typeof Ionicons>["name"];
  texto: string;
  fondo: string;
  color: string;
}) {
  return (
    <View
      className="flex-row items-center gap-1 rounded-full px-3 py-1.5"
      style={{ backgroundColor: fondo }}
    >
      <Ionicons name={icono} size={13} color={color} />
      <Text className="text-xs font-semibold" style={{ color }}>
        {texto}
      </Text>
    </View>
  );
}

function HoraCampo({
  label,
  value,
  showWarning = false,
  onPress,
}: {
  label: string;
  value?: string;
  showWarning?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5"
    >
      <View className="flex-row items-center gap-1">
        <Text className="text-xs text-gray-400">{label}</Text>
        {showWarning && (
          <Ionicons
            name="alert-circle"
            size={12}
            color={theme.colors.warningDark}
          />
        )}
      </View>
      <Text className="text-base font-semibold text-gray-900">
        {value || "--:--"}
      </Text>
    </Pressable>
  );
}
