import { ScrollView, Text, View } from "react-native";
import { Button, Modal } from "@/shared/components";
import {
  FormularioInvitacion,
  InvitacionesPendientes,
  PersonasDeLaUnidad,
  RegistrarMenor,
} from "../components/invitar";
import { useInvitarAUnidad } from "../hooks/useInvitarAUnidad";

/**
 * Dar de alta a alguien en la vivienda.
 *
 * Hasta ahora no existía: la única pantalla que emitía invitaciones era la de
 * coadministradores, de ámbito condominio. Ni un propietario, ni un inquilino,
 * ni un huésped podían darse de alta desde la aplicación.
 *
 * Quién puede invitar lo decide la base (`puede_invitar_a_unidad`): el
 * propietario, el inquilino líder y la administración. Esta pantalla no lo
 * comprueba; si alguien llegara sin permiso, la llamada falla y se dice.
 */
export function PropietarioInvitarScreen() {
  const {
    ubicacionActiva,
    puedeInvitar,
    personas,
    pendientes,
    form,
    setForm,
    rolesInvitables,
    esHuesped,
    error,
    enlace,
    cerrarEnlace,
    invitar,
    invitando,
    revocar,
    menor,
    setMenor,
    errorMenor,
    registrarMenor,
    registrandoMenor,
  } = useInvitarAUnidad();

  if (!puedeInvitar) {
    return (
      <View className="flex-1 bg-gray-50 p-4">
        <Text className="text-sm text-gray-500">
          Elegí primero la vivienda sobre la que querés invitar.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" contentContainerClassName="p-4 gap-5">
        <Text className="text-sm text-gray-500">
          {ubicacionActiva?.alias}
        </Text>

        <PersonasDeLaUnidad personas={personas} />
        <InvitacionesPendientes pendientes={pendientes} onRevocar={revocar} />

        <FormularioInvitacion
          form={form}
          rolesInvitables={rolesInvitables}
          esHuesped={esHuesped}
          error={error}
          invitando={invitando}
          onChange={setForm}
          onEnviar={invitar}
        />

        <RegistrarMenor
          valores={menor}
          error={errorMenor}
          registrando={registrandoMenor}
          onChange={setMenor}
          onRegistrar={registrarMenor}
        />
      </ScrollView>

      {/* Mientras el envio de correo este apagado, el enlace se muestra para
          poder pasarlo a mano. Con el envio encendido no vuelve y este modal
          no llega a abrirse. */}
      <Modal
        visible={Boolean(enlace)}
        onClose={cerrarEnlace}
        title="Enlace de la invitación"
      >
        <View className="gap-3">
          <Text className="text-sm text-gray-500">
            El envío de correo está apagado en este entorno. Copiá este enlace y
            pasáselo a la persona: es de un solo uso y solo sirve para su correo.
          </Text>
          <Text selectable className="text-xs text-gray-900">
            {enlace}
          </Text>
          <Button variant="primary" onPress={cerrarEnlace}>
            Listo
          </Button>
        </View>
      </Modal>
    </View>
  );
}
