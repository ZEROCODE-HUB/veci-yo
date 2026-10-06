import { theme } from "@/config";
import React from "react";
import { View, Text } from "react-native";
import { Button, Input, Modal, Select, Toggle } from "@/shared/components";
import { TIPOS_VEHICULO_RESIDENTE } from "../../hooks/useVehiculosResidente";

interface Props {
  // Votacion
  showVotacion: boolean;
  setShowVotacion: (v: boolean) => void;
  votacion: {
    titulo: string;
    descripcion: string;
    categoria: string;
    destinatario: string;
    esVotacion: boolean;
  };
  setVotacionField: (clave: string) => (valor: string | boolean) => void;
  handlePublicar: () => void;

  // Vehiculo
  showAgregarVehiculo: boolean;
  setShowAgregarVehiculo: (v: boolean) => void;
  formVehiculo: { placa: string; tipo: string };
  setFormVehiculo: React.Dispatch<
    React.SetStateAction<{ placa: string; tipo: string }>
  >;
  handleAgregarVehiculo: () => void;
  cantidadVehiculos: number;
  maxEstacionamientos: number;
  guardandoVehiculo: boolean;
}

/**
 * Las dos ventanas de la Configuracion del propietario: crear una votacion y
 * registrar un vehiculo.
 *
 * Eran 175 lineas al final de una pantalla de 952.
 *
 * ----------------------------------------------------------------------------
 * Habia una tercera, y no se podia abrir
 * ----------------------------------------------------------------------------
 * «Agregar Residente / Corresidente» pedia nombre, correo, identificacion, rol,
 * mayor de edad y telefono, y al pulsar «Agregar» hacia **dos cosas**: cerrarse
 * y navegar a Invitar. Los seis datos se perdian, y uno de ellos --la
 * identificacion-- no tiene columna en ninguna tabla.
 *
 * Pero el defecto de verdad era otro, y solo se vio al buscarla en pantalla
 * para recorrerla: **`setShowFamiliar(true)` no se llamaba desde ningun sitio**.
 * La ventana no se podia abrir. Era la hermana de `AdministradorZonasScreen`
 * --126 lineas a las que la navegacion no llegaba-- con un estado en vez de una
 * ruta, y por eso `npm run pantallas` no la veia: ese guarda mira rutas
 * registradas, no ventanas.
 *
 * Retirada el 05/10/2026, entera. El alta de verdad vive en dos sitios que si
 * funcionan: «Invitar a alguien a la vivienda», que invita a quien va a tener
 * cuenta y registra a un menor, que no la tiene; y «Gestion de usuarios», al
 * que lleva el «+».
 */
export function ModalesConfiguracion({
  showVotacion,
  setShowVotacion,
  votacion,
  setVotacionField,
  handlePublicar,
  showAgregarVehiculo,
  setShowAgregarVehiculo,
  formVehiculo,
  setFormVehiculo,
  handleAgregarVehiculo,
  cantidadVehiculos,
  maxEstacionamientos,
  guardandoVehiculo,
}: Props) {
  return (
    <>
{/* Crear Votación */}
<Modal
  visible={showVotacion}
  onClose={() => setShowVotacion(false)}
  title="Crear Votación"
>
  <View className="flex-col gap-2.5">
    <View>
      <Text className="text-sm font-bold text-center text-gray-900 underline mb-1.5">
        Título*
      </Text>
      <Input
        value={votacion.titulo}
        onChangeText={setVotacionField("titulo")}
        placeholder="Título de la votación"
        multiline
      />
    </View>
    <View>
      <Text className="text-sm font-bold text-center text-gray-900 underline mb-1.5">
        Descripción*
      </Text>
      <Input
        value={votacion.descripcion}
        onChangeText={setVotacionField("descripcion")}
        placeholder="Descripción"
        multiline
      />
    </View>
    <Select
      value={votacion.categoria}
      options={[
        "Mantenimiento",
        "Seguridad",
        "Administración",
        "Comunidad",
        "Servicios",
      ]}
      onChange={(v) => setVotacionField("categoria")(String(v))}
      placeholder="Categoría"
    />
    <Select
      value={votacion.destinatario}
      options={[
        "Todos los residentes",
        "Residentes activos",
        "Administración",
        "Propietarios",
      ]}
      onChange={(v) => setVotacionField("destinatario")(String(v))}
      placeholder="Destinatario"
    />
    <View className="flex-row items-center gap-2.5">
      <Toggle
        value={votacion.esVotacion}
        onChange={(v) => setVotacionField("esVotacion")(v)}
      />
      <Text className="text-sm text-gray-900">Votación</Text>
    </View>
    <Button variant="primary" onPress={handlePublicar}>
      Publicar
    </Button>
  </View>
</Modal>

{/* Agregar vehículo */}
<Modal
  visible={showAgregarVehiculo}
  onClose={() => setShowAgregarVehiculo(false)}
  title="Agregar vehículo"
>
  <View className="flex-col gap-4">
    <Input
      label="Placa del vehículo"
      value={formVehiculo.placa}
      onChangeText={(v) => setFormVehiculo((p) => ({ ...p, placa: v }))}
      placeholder="Ej: ABC-1234"
    />
    <Select
      label="Tipo de vehículo"
      value={formVehiculo.tipo}
      options={TIPOS_VEHICULO_RESIDENTE}
      onChange={(v) =>
        setFormVehiculo((p) => ({ ...p, tipo: String(v) }))
      }
    />
    <View
      className="rounded-xl p-3"
      style={{ backgroundColor: theme.colors.secondaryLight }}
    >
      <Text
        className="text-xs"
        style={{ color: theme.colors.secondary, lineHeight: 18 }}
      >
        Puedes registrar hasta {maxEstacionamientos} vehículo(s). Ya
        tienes {cantidadVehiculos} registrado(s).
      </Text>
    </View>
    <Button
      variant="primary"
      onPress={handleAgregarVehiculo}
      disabled={guardandoVehiculo}
    >
      {guardandoVehiculo ? "Registrando..." : "Registrar vehículo"}
    </Button>
    <Button variant="ghost" onPress={() => setShowAgregarVehiculo(false)}>
      Cancelar
    </Button>
  </View>
</Modal>
    </>
  );
}
