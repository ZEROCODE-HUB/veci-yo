import React from "react";
import { Text, View } from "react-native";
import { Button, Modal } from "@/shared/components";
import type { ResidenteDeUnidad } from "../../services/residentes.repo";

const NOMBRE_DEL_ROL: Record<string, string> = {
  "Inquilino Lider": "Inquilino líder",
  "Huesped Temporal": "Huésped",
};

/**
 * Ver a una persona de la vivienda (25/11/2026, el cliente: «quita el botón
 * de editar, simplemente que sea Ver»). Antes «Editar» abría un formulario con
 * el contacto de emergencia, «anfitrión primario» y lo que ven los vecinos; lo
 * que se cambia de otra persona es lo de «Editar privilegios», y lo demás lo
 * decide cada uno desde su perfil.
 */
export function VerPersona({ persona, onClose }: { persona: ResidenteDeUnidad | null; onClose: () => void }) {
  const fila = (etiqueta: string, valor: string) => (
    <View className="gap-0.5">
      <Text className="text-xs text-gray-500">{etiqueta}</Text>
      <Text className="text-base text-gray-900">{valor}</Text>
    </View>
  );
  return (
    <Modal visible={Boolean(persona)} onClose={onClose} title={persona?.nombre ?? ""}>
      {persona ? (
        <View className="gap-3">
          {fila("Rol en la vivienda", NOMBRE_DEL_ROL[persona.rol] ?? persona.rol)}
          {fila("Teléfono", persona.telefono?.trim() ? persona.telefono : "Sin teléfono")}
          {persona.fecha ? fila("En la vivienda desde", persona.fecha) : null}
          {fila("App", persona.usuarioId ? "Usa la app" : persona.esMenor ? "Sin app · menor de edad" : "Sin app")}
          <Button variant="secondary" fullWidth onPress={onClose}>
            Cerrar
          </Button>
        </View>
      ) : null}
    </Modal>
  );
}
