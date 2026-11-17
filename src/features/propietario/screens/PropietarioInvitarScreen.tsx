import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Button, Modal, SegunLaCarga } from "@/shared/components";
import {
  DarAccesoALaApp,
  FormularioInvitacion,
  InvitacionesPendientes,
  PersonasDeLaUnidad,
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
    cargaDePersonas,
    cargaDePendientes,
    revocandoId,
    form,
    setForm,
    rolesInvitables,
    esHuesped,
    sinApp,
    documentosOfrecidos,
    error,
    enlace,
    cerrarEnlace,
    invitar,
    invitando,
    revocar,
  } = useInvitarAUnidad();
  /** A quién se le está dando acceso a la app (17/11/2026). */
  const [darAccesoA, setDarAccesoA] = useState<{ id: string; nombre: string } | null>(null);

  if (!puedeInvitar) {
    return (
      <View className="flex-1 bg-gray-50 p-4">
        <Text className="text-sm text-gray-500">
          Elige primero la vivienda sobre la que quieres invitar.
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

        <SegunLaCarga
          estado={cargaDePersonas}
          texto="la gente de la vivienda"
          forma="filas"
          cuantos={3}
          enLinea
        >
          <PersonasDeLaUnidad personas={personas} onDarAcceso={setDarAccesoA} />
        </SegunLaCarga>
        <SegunLaCarga
          estado={cargaDePendientes}
          texto="las invitaciones"
          forma="filas"
          cuantos={1}
          enLinea
        >
          <InvitacionesPendientes
            pendientes={pendientes}
            onRevocar={revocar}
            revocandoId={revocandoId}
          />
        </SegunLaCarga>

        <FormularioInvitacion
          form={form}
          rolesInvitables={rolesInvitables}
          esHuesped={esHuesped}
          sinApp={sinApp}
          documentosOfrecidos={documentosOfrecidos}
          error={error}
          invitando={invitando}
          onChange={setForm}
          onEnviar={invitar}
        />
      </ScrollView>

      <DarAccesoALaApp persona={darAccesoA} onClose={() => setDarAccesoA(null)} />

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
            El envío de correo está apagado en este entorno. Copia este enlace y
            pásaselo a la persona: es de un solo uso y solo sirve para su correo.
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
