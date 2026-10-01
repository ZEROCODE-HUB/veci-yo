import { Button, Modal } from "@/shared/components";
import { Text, View } from "react-native";
import type {
  DirectorioContactos,
  DirectorioDeposito,
  DirectorioDetalle,
  DirectorioEstacionamiento,
} from "../types/directorio";
import type { Unidad } from "@/stores/admin-store";

/**
 * El detalle de una propiedad del directorio.
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

function DetalleDepartamento({ datos }: { datos: Unidad }) {
  return (
    <>
      <Linea>
        Torre → Departamento → Propietario:{" "}
        <Text className="font-bold">
          {datos.propietarioAsignado || "Sin asignar"}
        </Text>
      </Linea>
      <Linea>
        Estacionamiento → Depto {datos.codigo} →{" "}
        {datos.propietarioAsignado || "—"}
      </Linea>
      <Linea>
        Depósito → Depto {datos.codigo} → {datos.propietarioAsignado || "—"}
      </Linea>
    </>
  );
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
            <DetalleDepartamento datos={detalle.datos} />
          )}
        </View>
        <View style={{ gap: 8 }}>
          <Button
            variant="ghost"
            fullWidth
            onPress={() => onCall(detalle.contactos.anfitrion.telefono)}
          >
            <Text>
              📞 Llamar Anfitrión primario: {detalle.contactos.anfitrion.nombre}
            </Text>
          </Button>
          <Button
            variant="ghost"
            fullWidth
            onPress={() => onCall(detalle.contactos.administrador.telefono)}
          >
            <Text>
              📞 Llamar Administrador: {detalle.contactos.administrador.nombre}
            </Text>
          </Button>
          <Button
            variant="ghost"
            fullWidth
            onPress={() => onCall(detalle.contactos.propietario.telefono)}
          >
            <Text>
              📞 Llamar Propietario: {detalle.contactos.propietario.nombre}
            </Text>
          </Button>
        </View>
      </View>
    </Modal>
  );
}
