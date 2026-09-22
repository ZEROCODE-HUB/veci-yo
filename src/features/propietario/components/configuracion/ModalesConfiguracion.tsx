import { theme } from "@/config";
import React from "react";
import { View, Text, Pressable } from "react-native";
import { Button, Input, Modal, Select, Toggle } from "@/shared/components";
import { TIPOS_VEHICULO_RESIDENTE } from "../../hooks/useVehiculosResidente";

interface Props {
  // Familiar
  showFamiliar: boolean;
  setShowFamiliar: (v: boolean) => void;
  familiar: {
    nombre: string;
    correo: string;
    identificacion: string;
    mayor18: boolean;
    telefono: string;
    rol: string;
  };
  setFamiliarField: (clave: string) => (valor: string | boolean) => void;
  handleAgregarFamiliar: () => void;

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
 * Los tres formularios en ventana de la Configuracion del propietario: agregar
 * un familiar, crear una votacion y registrar un vehiculo.
 *
 * Eran 175 lineas al final de una pantalla de 952.
 */
export function ModalesConfiguracion({
  showFamiliar,
  setShowFamiliar,
  familiar,
  setFamiliarField,
  handleAgregarFamiliar,
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
{/* Agregar Familiar */}
<Modal
  visible={showFamiliar}
  onClose={() => setShowFamiliar(false)}
  title="Agregar Residente / Corresidente"
>
  <View className="flex-col gap-3">
    <Text
      className="text-sm font-semibold text-center text-gray-900"
      style={{ lineHeight: 20 }}
    >
      Completar los datos solicitados para agregar al residente
    </Text>
    <View
      className="rounded-2xl p-4 gap-2.5"
      style={{ backgroundColor: theme.colors.bgApp }}
    >
      <Text className="text-sm font-bold text-center text-gray-900 underline mb-0.5">
        Nuevo Residente / Corresidente
      </Text>
      <Input
        label="Nombre y Apellido"
        value={familiar.nombre}
        onChangeText={setFamiliarField("nombre")}
        placeholder="Nombre completo"
      />
      <Input
        label="Correo electronico"
        value={familiar.correo}
        onChangeText={setFamiliarField("correo")}
        placeholder="correo@mail.com"
        type="email"
      />
      <Input
        label="Identificación"
        value={familiar.identificacion}
        onChangeText={setFamiliarField("identificacion")}
        placeholder="Número de identificación"
      />
      <Select
        label="Rol"
        value={familiar.rol}
        options={["Residente", "Corresidente"]}
        onChange={(v) => setFamiliarField("rol")(String(v))}
        placeholder="Seleccionar rol"
      />
      <View className="flex-row items-center gap-2.5">
        <Text className="text-sm text-gray-900">Mayor de 18 años</Text>
        <Toggle
          value={familiar.mayor18}
          onChange={(v) => setFamiliarField("mayor18")(v)}
        />
      </View>
      <Input
        label="Teléfono"
        value={familiar.telefono}
        onChangeText={setFamiliarField("telefono")}
        placeholder="+5965165136546"
      />
    </View>
    <Button variant="primary" onPress={handleAgregarFamiliar}>
      Agregar
    </Button>
    <Pressable className="items-center">
      <Text className="text-sm text-gray-900 underline">Importante:</Text>
    </Pressable>
  </View>
</Modal>

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
