import React from "react";
import { Text, View } from "react-native";
import { Button } from "@/shared/components";
import { theme } from "@/config";
import {
  abrirAjustePantallaCompleta,
  pedirSinAhorroDeBateria,
  type PermisosDeLlamada as Permisos,
} from "../services/llamadasNativas";

/**
 * Lo que necesita este celular para que las llamadas por la app suenen con
 * la app cerrada, y un botón para cada cosa que falte (28/10/2026). Va en
 * Perfil › Configuración › Llamadas y en el aviso que sale al entrar.
 */
export function PermisosDeLlamada({ permisos }: { permisos: Permisos }) {
  return (
    <View className="gap-3">
      <Fila
        titulo="Pantalla completa con el celular bloqueado"
        detalle="Para que la llamada encienda la pantalla y se pueda contestar sin desbloquear antes."
        listo={permisos.pantallaCompleta}
        boton="Activar"
        alPulsar={abrirAjustePantallaCompleta}
      />
      <Fila
        titulo="Sin ahorro de batería para Veciyo"
        detalle="Algunos celulares cierran las apps para ahorrar batería, y entonces la llamada no llega."
        listo={permisos.sinAhorroDeBateria}
        boton="Permitir"
        alPulsar={pedirSinAhorroDeBateria}
      />
    </View>
  );
}

function Fila({
  titulo,
  detalle,
  listo,
  boton,
  alPulsar,
}: {
  titulo: string;
  detalle: string;
  listo: boolean;
  boton: string;
  alPulsar: () => void;
}) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="flex-1 gap-0.5">
        <Text className="text-sm font-medium text-gray-900">{titulo}</Text>
        <Text className="text-xs leading-5 text-gray-500">{detalle}</Text>
      </View>
      {listo ? (
        <Text className="text-sm font-semibold" style={{ color: theme.colors.success }}>
          ✓ Listo
        </Text>
      ) : (
        <Button size="sm" onPress={alPulsar}>
          {boton}
        </Button>
      )}
    </View>
  );
}
