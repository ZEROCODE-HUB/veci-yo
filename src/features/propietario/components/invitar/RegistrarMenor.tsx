import { useState } from "react";
import { Text, View } from "react-native";
import { Button, CampoTelefono, Input } from "@/shared/components";

/**
 * Dar de alta a un residente menor de edad.
 *
 * Va aparte del formulario de invitación porque no es una invitación: el KT
 * (flujo 4.3 paso 3) decide que un menor figura en la vivienda **sin acceso a
 * la plataforma**, y una invitación existe justamente para crear una cuenta.
 *
 * Hasta ahora no había forma de registrarlo: el único camino para dar de alta
 * a alguien exigía un correo. Una familia que quería que la portería supiera
 * quién vive en la casa no podía decirlo.
 */

interface ValoresMenor {
  nombre: string;
  telefono: string;
  /** El pais del telefono, en ISO 3166-1 alfa-2. */
  codigoPais: string;
}

interface Props {
  valores: ValoresMenor;
  error: string | null;
  registrando: boolean;
  onChange: (valores: ValoresMenor) => void;
  onRegistrar: () => void;
}

export function RegistrarMenor({
  valores,
  error,
  registrando,
  onChange,
  onRegistrar,
}: Props) {
  const [abierto, setAbierto] = useState(false);

  if (!abierto) {
    return (
      <Button variant="secondary" onPress={() => setAbierto(true)}>
        Registrar a un menor de edad
      </Button>
    );
  }

  return (
    <View className="gap-3 rounded-2xl bg-white p-5">
      <Text className="text-base font-bold text-gray-900">
        Residente menor de edad
      </Text>
      <Text className="text-xs leading-5 text-gray-500">
        Figura en la vivienda para que la portería sepa quién vive aquí. No
        recibe invitación ni tiene cuenta en la aplicación.
      </Text>

      <Input
        label="Nombre y apellido"
        value={valores.nombre}
        onChangeText={(nombre) => onChange({ ...valores, nombre })}
        placeholder="Ej: Martina Provenzano"
      />
      {/*
        Con su pais. De un menor es de quien mas falta hace saber a quien
        llamar, y hasta el 05/10/2026 el numero se guardaba sin pais: la base
        guardaba el pais del contacto de emergencia y no el de este telefono.
      */}
      <CampoTelefono
        label="Teléfono de contacto (opcional)"
        codigoPais={valores.codigoPais}
        onCodigoPaisChange={(codigoPais) => onChange({ ...valores, codigoPais })}
        telefono={valores.telefono}
        onTelefonoChange={(telefono) => onChange({ ...valores, telefono })}
        ayuda="El de quien responde por el menor."
      />

      {Boolean(error) && <Text className="text-sm text-red-600">{error}</Text>}

      <View className="flex-row gap-3">
        <View className="flex-1">
          <Button variant="secondary" onPress={() => setAbierto(false)}>
            Cancelar
          </Button>
        </View>
        <View className="flex-1">
          <Button
            variant="primary"
            disabled={Boolean(error) || registrando}
            onPress={onRegistrar}
          >
            {registrando ? "Registrando…" : "Registrar"}
          </Button>
        </View>
      </View>
    </View>
  );
}
