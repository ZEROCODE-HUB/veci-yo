import { placasConResponsable } from "../helpers/vehiculos";
import { VehiculosEnPorteria } from "./VehiculosEnPorteria";
import { theme } from "@/config";
import React, { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import type { VisitaItem } from "@/shared/types";
import { TIPO_LABELS } from "../constants";
import { Badge, Button, ListaDeHoras, Modal } from "@/shared/components";
import { TIPO_VISITA_ASSETS } from "./tipoVisitaAssets";
import { RegistroPorteria } from "./RegistroPorteria";
import { AsistenciaDelPermanente } from "./AsistenciaDelPermanente";
import { VerificarEnPorteria } from "./VerificarEnPorteria";
import { EntradaDelHuesped } from "./EntradaDelHuesped";
import { AnotacionesDeLaVisita } from "./AnotacionesDeLaVisita";
import { bloqueoDeLlegada } from "../helpers/bloqueoDeLlegada";

interface Props {
  item: VisitaItem;
  personIndex?: number | null;
  onToggleArrival?: (arrived: boolean) => void;
  onToggleInstruction?: () => void;
  /** El numero que se lee en el documento. Responde si coincide. */
  onVerifyDocument?: (numero: string) => Promise<boolean>;
  /** Qué fotos se están subiendo ahora, para decirlo en su botón (29/10/2026). */
  subiendoFotos?: "ingreso" | "salida" | null;
  /** La foto que acaba de tomar la porteria. */
  /** Devuelve la ruta de la foto guardada. */
  onPhotoDocument?: (uri: string) => Promise<string | void>;
  /** El edificio exige verificar el documento antes de la entrada. */
  exigeDocumento?: boolean;
  onUpdateArrivalTime?: (time: string) => void;
  onUpdateDepartureTime?: (time: string) => void;
  onToggleDeparture?: (registered: boolean) => void;
  onUpdateEntryNotes?: (notes: string) => void;
  onUpdateExitNotes?: (notes: string) => void;
  onAddEntryPhotos?: (photos: string[]) => void;
  onAddExitPhotos?: (photos: string[]) => void;
  onCallAnnounce?: () => void;
  lugaresDisponibles?: number;
  onAssignParking?: () => void;
}

export function VisitaGuardiaDetail({
  item,
  personIndex = null,
  onToggleArrival,
  onToggleInstruction,
  onVerifyDocument,
  onPhotoDocument,
  exigeDocumento = false,
  onUpdateArrivalTime,
  onUpdateDepartureTime,
  onToggleDeparture,
  onCallAnnounce,
  lugaresDisponibles = 0,
  onAssignParking,
}: Props) {
  const [verificationVisible, setVerificationVisible] = useState(false);
  const [timePicker, setTimePicker] = useState<"arrival" | "departure" | null>(
    null,
  );
  const [telefonoCopiado, setTelefonoCopiado] = useState(false);

  const copiarTelefono = async () => {
    if (!item.telefonoResidente) return;
    await Clipboard.setStringAsync(item.telefonoResidente);
    setTelefonoCopiado(true);
    // Vuelve al icono normal: el visto es un acuse, no un estado.
    setTimeout(() => setTelefonoCopiado(false), 2000);
  };

  const persona =
    personIndex === -1
      ? {
          nombre: item.nombre,
          ci: item.ci,
          horaIngreso: item.horaIngreso,
          horaSalida: item.horaSalida,
          llego: item.llego,
          ciVerificado: item.ciVerificado,
          fotoDePorteria: false,
        }
      : personIndex !== null && personIndex !== undefined
        ? item.invitados?.[personIndex]
        : undefined;
  const nombrePersona = persona?.nombre || item.nombre;
  const conQuienViene =
    persona && "esMenor" in persona && persona.esMenor && persona.responsableId
      ? item.invitados?.find((otro) => otro.uuid === persona.responsableId)?.nombre
      : undefined;
  /*
    Un huésped de una estancia se verifica siempre por el mismo camino que en
    la tarjeta de la estancia: la foto del preregistro y el escaneo del
    documento (23/10/2026). Desde aquí se saltaba eso y se pedía la foto de
    constancia, que a un huésped ya no se le pide.
  */
  const huesped =
    item.tipo === "huesped-temporal" && persona && "uuid" in persona ? persona : null;
  /*
    El documento de **esta** persona. Un acompañante sin documento heredaba el
    del titular (`|| item.ci`) y la ficha ofrecía comparar un número que no era
    el suyo.
  */
  const identificacion =
    persona && "documentoNumero" in persona
      ? persona.documentoNumero
      : persona && "ci" in persona
        ? persona.ci
        : item.ci;
  const horaIngreso = persona?.horaIngreso || item.horaIngreso;
  const horaSalida = persona?.horaSalida || item.horaSalida;
  const llego =
    persona && "llego" in persona ? persona.llego : (item.llego ?? false);
  const ciVerificado =
    persona && "ciVerificado" in persona
      ? persona.ciVerificado
      : (item.ciVerificado ?? false);
  const instruccionCumplida = !!item.instruccionesCumplidas?.llamoAnuncie;
  const tipoLabel = TIPO_LABELS[item.tipo] || item.tipo;
  const documento = item.instruccionDocumento === "verificar";
  const vehiculos = placasConResponsable(item.vehiculos);

  const fotoDePorteria = Boolean(
    persona && "fotoDePorteria" in persona && persona.fotoDePorteria,
  );

  const corregirHora = (hora: string) => {
    const cual = timePicker;
    setTimePicker(null);
    if (!cual) return;
    if (cual === "arrival") onUpdateArrivalTime?.(hora);
    else onUpdateDepartureTime?.(hora);
  };


  return (
    <View className="gap-3.5">
      <View className="flex-row items-center gap-2.5">
        <Image
          style={{ width: 40, height: 40 }}
          source={TIPO_VISITA_ASSETS[item.tipo]}
          className="rounded-full"
          resizeMode="cover"
        />
        <View className="flex-1">
          <View className="flex-row items-center justify-between gap-2">
            <Text className="text-base font-bold text-gray-900 flex-1">
              {nombrePersona}
            </Text>
            {item.tipo === "huesped-temporal" && <Badge status={item.estado} />}
          </View>
          <Text className="text-sm text-gray-500">
            {item.torre} - {item.depto} · {tipoLabel}
          </Text>
          {/* Con quién entra el niño, que es lo que se comprueba en la puerta (hueco 36). */}
          {conQuienViene ? (
            <Text className="text-sm text-gray-700">
              👶 Menor · viene con {conQuienViene}
            </Text>
          ) : null}
        </View>
      </View>

      {/*
          Decia "25/09/2026 a 25/09/2026" y nada mas: la hora prevista estaba en
          el dato --`hora_estimada_llegada` y `hora_estimada_salida`-- y no se
          mostraba, que es justo lo que la porteria necesita saber.
      */}
      <View className="flex-row flex-wrap gap-x-5 gap-y-1">
        <Franja
          etiqueta="Entrada prevista"
          fecha={item.fechaDesde}
          hora={item.horaEstimadaLlegada}
        />
        <Franja
          etiqueta="Salida prevista"
          fecha={item.fechaHasta}
          hora={item.horaEstimadaSalida}
        />
      </View>

      <View className="flex-row flex-wrap gap-1.5">
        {Boolean(item.instruccionDocumento) && (
          <InfoChip
            label={documento ? "🪪 Verificar cédula" : "🔓 No verificar"}
            background={
              documento ? theme.colors.warningLight : theme.colors.infoBg
            }
            color={
              documento
                ? theme.colors.iconAmberDark
                : theme.colors.secondaryDark
            }
          />
        )}
        {Boolean(item.aviso) && (
          <InfoChip
            label={
              item.aviso === "notificar_y_anunciar"
                ? "🔔 Anunciar"
                : "🔔 Notificar"
            }
          />
        )}
        <InfoChip
          label={
            item.tieneVehiculo
              ? `🚗 Con vehículo${vehiculos ? ` (${vehiculos})` : ""}`
              : "🚗 Sin vehículo"
          }
        />
        {lugaresDisponibles > 0 && (
          <InfoChip
            label={
              lugaresDisponibles === 1
                ? "🅿️ 1 lugar libre"
                : `🅿️ ${lugaresDisponibles} lugares libres`
            }
            background={theme.colors.successSoft}
            color={theme.colors.badgeGreenText}
          />
        )}
      </View>

      <View
        className="gap-2 py-2"
        style={{ borderTopWidth: 1, borderTopColor: theme.colors.borderLight }}
      >
        {/*
          Para cualquier tipo de visita. Solo se ofrecia a `temporal`, asi que
          a un huesped de renta corta --que es a quien mas importa
          comprobar-- la porteria no tenia como verificarlo.
        */}
        {ciVerificado ? (
          <Text className="text-xs font-semibold text-green-700">
            ✓ Documento verificado
          </Text>
        ) : (
          <Pressable
            onPress={() => setVerificationVisible(true)}
            accessibilityRole="button"
            className="rounded-full px-3 py-2 items-center"
            style={{ backgroundColor: theme.colors.warningLight }}
          >
            <Text className="text-xs font-semibold text-amber-800">
              {huesped ? "🪪 Verificar documento" : "🪪 Foto y verificación del documento"}
            </Text>
          </Pressable>
        )}
        {fotoDePorteria && (
          <Text className="text-xs text-gray-500">
            📷 Foto de portería guardada
          </Text>
        )}
      </View>

      <RegistroPorteria
        pideAnuncio={item.aviso === "notificar_y_anunciar"}
        anunciado={instruccionCumplida}
        onToggleAnuncio={onToggleInstruction}
        llego={Boolean(llego)}
        motivoBloqueo={
          bloqueoDeLlegada({
            esEstancia: item.tipo === "huesped-temporal",
            exigeDocumento,
            persona: {
              nombre: nombrePersona,
              llego: Boolean(llego),
              ciVerificado: Boolean(ciVerificado),
              esMenor: Boolean(
                persona && "esMenor" in persona && persona.esMenor,
              ),
              responsableId:
                persona && "responsableId" in persona
                  ? persona.responsableId
                  : undefined,
              revisionMenor: huesped?.revisionMenor,
              verificacion: huesped?.verificacion,
            },
            tieneDocumento: Boolean(identificacion),
            grupo: item.invitados ?? [],
          })?.motivo
        }
        onToggleLlegada={(valor: boolean) => onToggleArrival?.(valor)}
        horaIngreso={horaIngreso}
        onEditarIngreso={() => setTimePicker("arrival")}
        horaSalida={horaSalida}
        onToggleSalida={(valor: boolean) => onToggleDeparture?.(valor)}
        salidaDefinitiva={
          item.tipo !== "huesped-temporal" && item.tipo !== "permanente"
        }
        onEditarSalida={() => setTimePicker("departure")}
      />

      {Boolean(identificacion && llego && ciVerificado) && (
        <Text className="text-xs text-green-600">✓ Identidad verificada</Text>
      )}

      {/*
        El profesional permanente entra y sale cada día: aquí se ve qué días
        le tocan y cuándo vino. Al marcar su salida vuelve a quedar «por
        llegar», listo para mañana (13/10/2026).
      */}
      {item.tipo === "permanente" && <AsistenciaDelPermanente item={item} />}

      {/*
        La hora se corregia con `DateTimePicker`, **que en web devuelve `null`**:
        el guardia pulsaba «editar» y no pasaba nada. Era de los peores sitios
        donde podia faltar, porque corregir una hora de ingreso mal registrada es
        justo lo que la porteria necesita hacer a mano.
      */}
      <Modal
        visible={Boolean(timePicker)}
        onClose={() => setTimePicker(null)}
        title={timePicker === "arrival" ? "Hora de ingreso" : "Hora de salida"}
      >
        <ListaDeHoras
          value={(timePicker === "arrival" ? horaIngreso : horaSalida) ?? ""}
          onChange={corregirHora}
          paso={5}
        />
      </Modal>

      <View
        className="gap-2 py-2"
        style={{ borderTopWidth: 1, borderTopColor: theme.colors.borderLight }}
      >
        {/*
          Una sola «anotación», con su archivo, que queda en la bitácora de la
          visita con la hora y quién la puso (Para Claude 170, 30/10/2026). Lo
          que se anotó antes en las dos casillas se sigue viendo.
        */}
        <AnotacionesDeLaVisita
          visitaUuid={item.uuid}
          invitadoUuid={persona && "uuid" in persona ? persona.uuid : null}
          anteriores={[
            { etiqueta: "Anotado al ingreso", texto: item.anotacionesIngreso, fotos: item.fotosIngreso },
            { etiqueta: "Anotado a la salida", texto: item.anotacionesSalida, fotos: item.fotosSalida },
          ]}
        />
      </View>

      {/* Corregir placas y apuntar el vehículo con el que llega (14/10/2026). */}
      <VehiculosEnPorteria visita={item} />

      <View
        className="flex-row flex-wrap gap-2 pt-2"
        style={{ borderTopWidth: 1, borderTopColor: theme.colors.borderLight }}
      >
        {/*
            A quien ya se fue no se le da un sitio. El boton salia igual despues
            del checkout, y el cupo asignado entonces **no se suelta nunca**: el
            disparador que lo libera actua al pasar la visita a `finalizada`, y
            para entonces ya habia pasado. Con un solo cupo de visita en el
            condominio, bastaba eso para dejarlo en «0 de 1 disponibles» para
            siempre. Salio registrando entrada y salida en el navegador.
        */}
        {!horaSalida && (
          <View className="flex-1">
            <Button variant="secondary" onPress={onAssignParking || (() => {})}>
              <Text>🅿️ Asignar estacionamiento</Text>
            </Button>
          </View>
        )}
        {/*
            Solo cuando hay a quien llamar. El boton salia siempre y el numero
            no se leia de la base, asi que pulsarlo no hacia nada: parecia roto
            en vez de decir que no hay contacto. Ahora dice a quien llama.
        */}
        {item.aviso === "notificar_y_anunciar" &&
          (item.telefonoResidente ? (
            <View className="w-full flex-row items-center gap-2">
              <View className="flex-1">
                <Button
                  variant="primary"
                  onPress={onCallAnnounce || (() => {})}
                >
                  <Text>
                    📞 Llamar a {item.nombreResidente || "el residente"}
                  </Text>
                </Button>
              </View>
              {/*
                  En porteria no siempre se llama desde la app: a veces hay un
                  telefono fijo al lado y lo que hace falta es el numero.
              */}
              <Pressable
                onPress={copiarTelefono}
                className="items-center justify-center rounded-xl border border-gray-200 px-3 py-3"
                hitSlop={6}
                accessibilityLabel="Copiar el número de teléfono"
              >
                <Ionicons
                  name={telefonoCopiado ? "checkmark" : "copy-outline"}
                  size={18}
                  color={
                    telefonoCopiado
                      ? theme.colors.success
                      : theme.colors.textSecondary
                  }
                />
              </Pressable>
            </View>
          ) : (
            <View className="w-full">
              <Text className="text-xs text-gray-400 text-center py-2">
                Esta vivienda no tiene un teléfono de contacto visible.
              </Text>
            </View>
          ))}
      </View>

      <Modal
        visible={verificationVisible}
        onClose={() => setVerificationVisible(false)}
        title="Documento en portería"
      >
        {huesped && onVerifyDocument ? (
          <EntradaDelHuesped
            persona={huesped}
            onVerificar={onVerifyDocument}
            onCerrar={() => setVerificationVisible(false)}
          />
        ) : (
          <VerificarEnPorteria
            nombre={nombrePersona}
            tieneDocumento={Boolean(identificacion)}
            fotoTomada={fotoDePorteria}
            onTomarFoto={onPhotoDocument}
            onVerificar={
              onVerifyDocument
                ? async (numero: string) => {
                    const coincide = await onVerifyDocument(numero);
                    /*
                      Si coincide, la entrada se marca sola (pedido del cliente,
                      29/10/2026): escribir el número es lo que la abre.
                    */
                    if (coincide && !llego) onToggleArrival?.(true);
                    return coincide;
                  }
                : undefined
            }
            onCerrar={() => setVerificationVisible(false)}
          />
        )}
      </Modal>
    </View>
  );
}

/** Fecha y hora previstas de un extremo de la visita. Sin fecha no se pinta. */
function Franja({
  etiqueta,
  fecha,
  hora,
}: {
  etiqueta: string;
  fecha?: string;
  hora?: string;
}) {
  if (!fecha) return null;

  return (
    <View className="flex-row items-center gap-1.5">
      <Ionicons
        name="calendar-outline"
        size={13}
        color={theme.colors.textMuted}
      />
      <Text className="text-xs text-gray-400">{etiqueta}</Text>
      <Text className="text-xs font-semibold text-gray-900">
        {fecha}
        {hora ? ` · ${hora}` : ""}
      </Text>
    </View>
  );
}

function InfoChip({
  label,
  background = theme.colors.borderLight,
  color = theme.colors.textSecondary,
}: {
  label: string;
  background?: string;
  color?: string;
}) {
  return (
    <View
      className="rounded-full px-2 py-0.5"
      style={{ backgroundColor: background }}
    >
      <Text className="text-[11px]" style={{ color }}>
        {label}
      </Text>
    </View>
  );
}
