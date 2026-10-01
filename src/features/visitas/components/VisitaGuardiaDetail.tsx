import { theme } from "@/config";
import React, { useEffect, useState } from "react";
import { Image, Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  type DateTimePickerChangeEvent,
} from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";
import type { VisitaItem } from "@/shared/types";
import { TIPO_LABELS } from "../constants";
import { Badge, Button, Modal } from "@/shared/components";
import { TIPO_VISITA_ASSETS } from "./tipoVisitaAssets";
import { urlFotoVisita } from "../services/visitas.repo";
import { RegistroPorteria } from "./RegistroPorteria";
import { formatTime, horaComoFecha } from "@/shared/utils";

interface Props {
  item: VisitaItem;
  personIndex?: number | null;
  onToggleArrival?: (arrived: boolean) => void;
  onToggleInstruction?: () => void;
  onVerifyDocument?: () => void;
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
  onUpdateArrivalTime,
  onUpdateDepartureTime,
  onToggleDeparture,
  onUpdateEntryNotes,
  onUpdateExitNotes,
  onAddEntryPhotos,
  onAddExitPhotos,
  onCallAnnounce,
  lugaresDisponibles = 0,
  onAssignParking,
}: Props) {
  const [verificationVisible, setVerificationVisible] = useState(false);
  const [ciInput, setCiInput] = useState("");
  const [ciError, setCiError] = useState("");
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
        }
      : personIndex !== null && personIndex !== undefined
        ? item.invitados?.[personIndex]
        : undefined;
  const nombrePersona = persona?.nombre || item.nombre;
  const identificacion =
    (persona && "ci" in persona ? persona.ci : undefined) || item.ci;
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
  const vehiculos = item.vehiculos
    ?.map((vehicle) => vehicle.placa)
    .filter(Boolean)
    .join(",");

  const openVerification = () => {
    setCiInput("");
    setCiError("");
    setVerificationVisible(true);
  };

  const verifyIdentity = () => {
    if (!identificacion || ciInput.trim() !== identificacion) {
      setCiError("El número de identificación no coincide con el registrado");
      return;
    }
    onVerifyDocument?.();
    setVerificationVisible(false);
    setCiInput("");
    setCiError("");
  };

  const handleTimeChange = (_event: DateTimePickerChangeEvent, date: Date) => {
    const picker = timePicker;
    setTimePicker(null);
    if (!date || !picker) return;
    const value = formatTime(date);
    if (picker === "arrival") onUpdateArrivalTime?.(value);
    else onUpdateDepartureTime?.(value);
  };

  const selectPhotos = async (onSelected?: (photos: string[]) => void) => {
    if (!onSelected) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      onSelected(result.assets.map((asset) => asset.uri));
    }
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
        {item.instruccionDocumento && (
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
        {item.aviso && (
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
        {item.tipo === "temporal" &&
          (ciVerificado ? (
            <Text className="text-xs font-semibold text-green-700">
              ✓ Cédula verificada
            </Text>
          ) : (
            <Pressable
              onPress={openVerification}
              className="rounded-full px-3 py-2 items-center"
              style={{ backgroundColor: theme.colors.warningLight }}
            >
              <Text className="text-xs font-semibold text-amber-800">
                🪪 Verificar cédula
              </Text>
            </Pressable>
          ))}
      </View>

      <RegistroPorteria
        pideAnuncio={item.aviso === "notificar_y_anunciar"}
        anunciado={instruccionCumplida}
        onToggleAnuncio={onToggleInstruction}
        llego={Boolean(llego)}
        onToggleLlegada={(valor: boolean) => onToggleArrival?.(valor)}
        horaIngreso={horaIngreso}
        onEditarIngreso={() => setTimePicker("arrival")}
        horaSalida={horaSalida}
        onToggleSalida={(valor: boolean) => onToggleDeparture?.(valor)}
        onEditarSalida={() => setTimePicker("departure")}
      />

      {identificacion && llego && ciVerificado && (
        <Text className="text-xs text-green-600">✓ Identidad verificada</Text>
      )}

      {timePicker && (
        <DateTimePicker
          value={horaComoFecha(timePicker === "arrival" ? horaIngreso : horaSalida)}
          mode="time"
          is24Hour
          display="default"
          onValueChange={handleTimeChange}
          onDismiss={() => setTimePicker(null)}
        />
      )}

      <View
        className="gap-2 py-2"
        style={{ borderTopWidth: 1, borderTopColor: theme.colors.borderLight }}
      >
        <NoteField
          label="Anotaciones de ingreso"
          value={item.anotacionesIngreso}
          placeholder="Observaciones al recibir al profesional"
          onChangeText={onUpdateEntryNotes}
        />
        <PhotoPicker
          photos={item.fotosIngreso}
          onPress={() => selectPhotos(onAddEntryPhotos)}
        />
        <NoteField
          label="Anotaciones de salida"
          value={item.anotacionesSalida}
          placeholder="Observaciones al retirarse el profesional"
          onChangeText={onUpdateExitNotes}
        />
        <PhotoPicker
          photos={item.fotosSalida}
          onPress={() => selectPhotos(onAddExitPhotos)}
        />
      </View>

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
        title="Verificar identidad"
      >
        <View className="items-center gap-4">
          <Text style={{ fontSize: 36 }}>🪪</Text>
          <Text className="text-base text-gray-900 text-center leading-6">
            Ingrese el número de identificación de{" "}
            <Text className="font-bold">{nombrePersona}</Text>
          </Text>
          <TextInput
            value={ciInput}
            onChangeText={(value) => {
              setCiInput(value);
              setCiError("");
            }}
            placeholder="Número de identificación"
            placeholderTextColor={theme.colors.textMuted}
            keyboardType="numeric"
            autoFocus
            className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-base text-gray-900 text-center"
          />
          {!!ciError && (
            <Text className="text-xs text-red-600 text-center">{ciError}</Text>
          )}
          <View className="flex-row gap-3 w-full">
            <View className="flex-1">
              <Button
                variant="secondary"
                fullWidth
                onPress={() => setVerificationVisible(false)}
              >
                <Text>Cancelar</Text>
              </Button>
            </View>
            <View className="flex-1">
              <Button variant="primary" fullWidth onPress={verifyIdentity}>
                <Text>Verificar</Text>
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/**
 * Las fotos de una visita viven en un bucket **privado**, asi que lo que guarda
 * la fila es una ruta, no una URL: para verlas hay que pedir un enlace firmado.
 *
 * Antes la fila guardaba la URI que devolvia el selector de imagenes --un
 * `blob:` de la pestaña-- y esto la pintaba tal cual. Funcionaba hasta que
 * alguien recargaba, y entonces la foto de un ingreso ya no existia.
 */
function PhotoPicker({
  photos = [],
  onPress,
}: {
  photos?: string[];
  onPress: () => void;
}) {
  const [urls, setUrls] = useState<string[]>([]);
  /*
    `photos` es un array nuevo en cada render, asi que como dependencia dispara
    el efecto siempre. Lo que importa es **su contenido**.

    El efecto trabaja con la cadena y no con el array --de ahi el `split`--,
    asi que la dependencia es de verdad la unica que lee y no hay que silenciar
    nada. Antes el `join` iba escrito dentro del propio array de dependencias,
    donde el linter no puede comprobarlo.
  */
  const rutasDeLasFotos = photos.join("|");

  useEffect(() => {
    let vigente = true;
    if (!rutasDeLasFotos) {
      setUrls([]);
      return;
    }
    Promise.all(
      rutasDeLasFotos.split("|").map((ruta) => urlFotoVisita(ruta)),
    )
      .then((firmadas) => {
        // Si el componente ya se desmonto --o llegaron otras fotos-- lo que
        // resuelva esta promesa es de una lista vieja.
        if (vigente) setUrls(firmadas);
      })
      .catch(() => {
        if (vigente) setUrls([]);
      });
    return () => {
      vigente = false;
    };
  }, [rutasDeLasFotos]);

  return (
    <View className="gap-2">
      <Pressable
        onPress={onPress}
        className="self-start rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
      >
        <Text className="text-xs font-semibold text-gray-600">
          Seleccionar archivos
        </Text>
      </Pressable>
      {urls.length > 0 && (
        <View className="flex-row flex-wrap gap-2">
          {urls.map((url, index) => (
            <Image
              style={{ width: 64, height: 64 }}
              key={`${url}-${index}`}
              source={{ uri: url }}
              className="rounded-lg"
              resizeMode="cover"
            />
          ))}
        </View>
      )}
    </View>
  );
}

function NoteField({
  label,
  value,
  placeholder,
  onChangeText,
}: {
  label: string;
  value?: string;
  placeholder: string;
  onChangeText?: (value: string) => void;
}) {
  return (
    <View className="gap-1">
      <Text className="text-xs font-semibold text-gray-600">{label}</Text>
      <TextInput
        value={value || ""}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        multiline
        numberOfLines={2}
        className="rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-2 text-xs text-gray-900 min-h-[58px]"
        textAlignVertical="top"
      />
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
