import { theme } from "@/config";
import React from "react";
import { View, Text } from "react-native";
import { Button, Input, Modal, Select } from "@/shared/components";
import { TIPOS_VEHICULO_RESIDENTE } from "../../hooks/useVehiculosResidente";

interface Props {
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
 * La ventana de la Configuracion del propietario: registrar un vehiculo.
 *
 * Eran dos. La otra, «Crear Votación», se retiro el 13/10/2026: su boton
 * «Publicar» cerraba la ventana y decia «Votación publicada» **sin publicar
 * nada**, y ademas `setShowVotacion(true)` no se llamaba desde ningun sitio,
 * asi que no se podia abrir. Una votacion se crea desde Anuncios, que si
 * escribe en la base.
 *
 * ----------------------------------------------------------------------------
 * Habia otra mas, y tampoco se podia abrir
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
