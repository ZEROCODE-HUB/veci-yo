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

function DetalleDepartamento({
  datos,
  contactos,
}: {
  datos: Unidad;
  contactos: DirectorioDetalle["contactos"];
}) {
  /*
    El propietario sale de los contactos de la vivienda, como en la tarjeta.
    Se leía `propietarioAsignado`, que solo existe en memoria cuando se asigna
    en esa misma sesión: la tarjeta enseñaba al dueño y al abrirla decía
    «Propietario: Sin asignar» (13/10/2026).
  */
  const dueno = contactos.propietario.nombre;
  return (
    <>
      <Linea>
        Torre {datos.torreNumero} → Departamento {datos.codigo} →
        Propietario:{" "}
        <Text className="font-bold">{dueno || "Sin asignar"}</Text>
      </Linea>
      {contactos.anfitrion.nombre ? (
        <Linea>
          Anfitrión primario:{" "}
          <Text className="font-bold">{contactos.anfitrion.nombre}</Text>
        </Linea>
      ) : null}
      {contactos.administrador.nombre ? (
        <Linea>
          Administrador:{" "}
          <Text className="font-bold">{contactos.administrador.nombre}</Text>
        </Linea>
      ) : null}
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
            <DetalleDepartamento
              datos={detalle.datos}
              contactos={detalle.contactos}
            />
          )}
        </View>
        {/*
          Un botón por cada contacto **que tenga teléfono**. Salían los tres
          siempre y «Llamar» abría el marcador con un número vacío.
        */}
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
      </View>
    </Modal>
  );
}
