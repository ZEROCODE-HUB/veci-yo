import { theme } from "@/config";
import { Text, View } from "react-native";
import { SegunLaCarga } from "@/shared/components";
import { useContactosDeUnidad } from "../../hooks/useContactosDeUnidad";

/**
 * A quién llamar desde la vivienda.
 *
 * Los tres contactos estaban escritos a mano —María Pérez, Carlos Gómez y Juan
 * López— y eran los mismos para cualquier vivienda de cualquier condominio.
 * Es el bloque que un huésped mira cuando algo va mal a medianoche, así que
 * tres nombres inventados no son un detalle de maqueta.
 *
 * Donde no hay nadie asignado se dice, igual que en el directorio: es
 * información útil, y desde luego mejor que un nombre falso.
 */
export function ReglaDepartamentoInfo() {
  const { contactos, estado } = useContactosDeUnidad();

  const filas = [
    { orden: "1er", cargo: "Anfitrión", persona: contactos?.anfitrion },
    { orden: "2do", cargo: "Administrador", persona: contactos?.administrador },
    { orden: "3er", cargo: "Propietario", persona: contactos?.propietario },
  ];

  return (
    <View
      className="rounded-2xl bg-white p-4 gap-3"
      style={{
        elevation: 3,
        shadowColor: theme.colors.shadow,
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      }}
    >
      <Text className="text-base font-bold text-gray-900">
        Información del departamento
      </Text>
      {/*
        «Sin asignar» es un dato: mientras llegan, o si no llegan, no se dice
        (13/11/2026).
      */}
      <SegunLaCarga estado={estado} texto="los contactos" forma="lineas" cuantos={3} enLinea>
        {filas.map(({ orden, cargo, persona }) => (
          <Text key={cargo} className="text-sm text-gray-900">
            <Text className="font-semibold">
              {orden} contacto: {cargo}
            </Text>
            {" — "}
            {persona?.nombre || "Sin asignar"}
            {persona?.telefono ? ` · ${persona.telefono}` : ""}
          </Text>
        ))}
      </SegunLaCarga>
    </View>
  );
}
