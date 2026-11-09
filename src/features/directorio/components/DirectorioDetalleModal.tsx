import { Button, Modal } from "@/shared/components";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/config";
import { ESTADO_EN_EL_DIRECTORIO } from "../helpers/contactos";
import type { VehiculoDelDirectorio } from "../services/vehiculos.repo";
import type {
  DirectorioContactos,
  DirectorioDeposito,
  DirectorioDetalle,
  DirectorioEstacionamiento,
} from "../types/directorio";
import type { Unidad } from "@/stores/admin-store";
import { ContactosDeLaVivienda } from "./ContactosDeLaVivienda";

/**
 * El detalle de una propiedad del directorio.
 *
 * Solo para ver los datos y llamar (pedido del cliente, 29/10/2026): asignar
 * el propietario se hace desde la vivienda, en Arquitectura.
 *
 * Un bloque por tipo, cada uno con **su** dato ya estrechado. Antes había un
 * solo cuerpo con tres ramas y un `detalle.datos as any` encima, así que leer
 * `datos.ubicacion` en la rama del departamento —que no la tiene— compilaba sin
 * que nadie dijera nada.
 */

const LINEA = { lineHeight: 22 } as const;

function Linea({ children }: { children: React.ReactNode }) {
  return (
    <Text className="text-sm text-gray-900" style={LINEA}>
      {children}
    </Text>
  );
}

function DetalleEstacionamiento({
  datos,
  contactos,
}: {
  datos: DirectorioEstacionamiento;
  contactos: DirectorioContactos;
}) {
  return (
    <>
      <Linea>
        Estacionamiento <Text className="font-bold">{datos.codigo}</Text> (
        {datos.ubicacion}) → Depto{" "}
        <Text className="font-bold">{datos.unidad.codigo}</Text> → Propietario:{" "}
        <Text className="font-bold">{contactos.propietario.nombre}</Text>
      </Linea>
      <Linea>
        Torre {datos.torreNumero} · Anfitrión primario:{" "}
        <Text className="font-bold">{contactos.anfitrion.nombre}</Text> ·
        Administrador:{" "}
        <Text className="font-bold">{contactos.administrador.nombre}</Text>
      </Linea>
    </>
  );
}

function DetalleDeposito({
  datos,
  contactos,
}: {
  datos: DirectorioDeposito;
  contactos: DirectorioContactos;
}) {
  return (
    <>
      <Linea>
        Depósito <Text className="font-bold">{datos.codigo}</Text> (
        {datos.ubicacion}) → Depto{" "}
        <Text className="font-bold">
          {datos.unidad?.codigo || datos.departamentoCodigo}
        </Text>{" "}
        → Propietario:{" "}
        <Text className="font-bold">{contactos.propietario.nombre}</Text>
      </Linea>
      <Linea>
        Torre {datos.torreNumero} · Anfitrión primario:{" "}
        <Text className="font-bold">{contactos.anfitrion.nombre}</Text> ·
        Administrador:{" "}
        <Text className="font-bold">{contactos.administrador.nombre}</Text>
      </Linea>
    </>
  );
}

function Dato({
  icono,
  children,
}: {
  icono: React.ComponentProps<typeof Ionicons>["name"];
  children: React.ReactNode;
}) {
  return (
    <View className="flex-row items-start" style={{ gap: 8 }}>
      <Ionicons name={icono} size={16} color={theme.colors.textSecondary} style={{ marginTop: 3 }} />
      <Text className="flex-1 text-sm text-gray-900" style={LINEA}>
        {children}
      </Text>
    </View>
  );
}

/**
 * Los datos de la vivienda, en una tarjeta aparte de las personas
 * (09/11/2026, Correcciones fila 8): dónde está, en qué estado, sus
 * estacionamientos y depósitos y los vehículos. Las personas van debajo, una
 * tarjeta por contacto, en «Orden de contactación».
 */
function DetalleDepartamento({
  datos,
  depositos,
  vehiculos,
}: {
  datos: Unidad;
  depositos: number;
  vehiculos: VehiculoDelDirectorio[];
}) {
  const estac = datos.codigosEstacionamiento ?? [];
  return (
    <View className="gap-1.5 rounded-xl bg-gray-100 p-3">
      <Dato icono="business-outline">{`Torre ${datos.torreNumero} · Piso ${datos.piso}`}</Dato>
      <Dato icono="person-circle-outline">
        {ESTADO_EN_EL_DIRECTORIO[datos.estado] ?? datos.estado}
      </Dato>
      <Dato icono="car-outline">
        {estac.length
          ? `Estacionamiento: ${estac.join(", ")}${datos.ubicacionParking ? ` (${datos.ubicacionParking})` : ""}`
          : "Sin estacionamiento"}
      </Dato>
      <Dato icono="cube-outline">
        {depositos ? `Depósitos: ${depositos}` : "Sin depósito"}
      </Dato>
      <Dato icono="car-sport-outline">
        {vehiculos.length
          ? `Vehículos: ${vehiculos
              .map((v) =>
                [v.placa, [v.marca, v.color].filter(Boolean).join(" "), v.de === "visita" ? "visita dentro" : ""]
                  .filter(Boolean)
                  .join(" · "),
              )
              .join("; ")}`
          : "Sin vehículos registrados"}
      </Dato>
    </View>
  );
}

/** La vivienda de la que se habla, si se sabe. */
function unidadDe(detalle: DirectorioDetalle): string | undefined {
  if (detalle.tipo === "departamento") return detalle.datos.uuid;
  return detalle.datos.unidad?.uuid;
}

function tituloDe(detalle: DirectorioDetalle): string {
  if (detalle.tipo === "estacionamiento") {
    return `Estacionamiento ${detalle.datos.codigo}`;
  }
  if (detalle.tipo === "deposito") return `Depósito ${detalle.datos.codigo}`;
  return `Depto ${detalle.datos.codigo} — Torre ${detalle.datos.torreNumero}`;
}

export function DirectorioDetalleModal({
  detalle,
  onClose,
  onCall,
}: {
  detalle: DirectorioDetalle | null;
  onClose: () => void;
  onCall: (phone: string) => void;
}) {
  if (!detalle) return null;

  return (
    <Modal visible onClose={onClose} title={tituloDe(detalle)}>
      <View style={{ gap: 12 }}>
        <View style={{ gap: 4 }}>
          {detalle.tipo === "estacionamiento" && (
            <DetalleEstacionamiento
              datos={detalle.datos}
              contactos={detalle.contactos}
            />
          )}
          {detalle.tipo === "deposito" && (
            <DetalleDeposito
              datos={detalle.datos}
              contactos={detalle.contactos}
            />
          )}
          {detalle.tipo === "departamento" && (
            <DetalleDepartamento
              datos={detalle.datos}
              depositos={detalle.depositos ?? 0}
              vehiculos={detalle.vehiculos ?? []}
            />
          )}
        </View>
        {/*
          A quién contactar, con WhatsApp, chat, contacto de emergencia y
          alternativo (huecos 11 y 20). Si no se sabe la vivienda --un
          depósito sin asignar--, los tres teléfonos de siempre.
        */}
        {unidadDe(detalle) ? (
          <ContactosDeLaVivienda unidadId={unidadDe(detalle) ?? ""} onAbrirChat={onClose} />
        ) : (
          <View style={{ gap: 8 }}>
            {(
              [
                ["Anfitrión primario", detalle.contactos.anfitrion],
                ["Administrador", detalle.contactos.administrador],
                ["Propietario", detalle.contactos.propietario],
              ] as const
            )
              .filter(([, contacto]) => Boolean(contacto.telefono))
              .map(([papel, contacto]) => (
                <Button
                  key={papel}
                  variant="ghost"
                  fullWidth
                  onPress={() => onCall(contacto.telefono)}
                >
                  <Text>
                    📞 Llamar {papel}: {contacto.nombre}
                  </Text>
                </Button>
              ))}
            {![
              detalle.contactos.anfitrion,
              detalle.contactos.administrador,
              detalle.contactos.propietario,
            ].some((contacto) => Boolean(contacto.telefono)) && (
              <Text className="text-sm text-center text-gray-500">
                Esta vivienda no tiene un teléfono de contacto visible.
              </Text>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}
