import { Text, View } from "react-native";
import { theme } from "@/config";
import { Button } from "@/shared/components";
import { useAvisosEnEsteCelular } from "../../hooks/useAvisosEnEsteCelular";

/**
 * Si este celular recibe avisos.
 *
 * El botón «Enviarme un aviso de prueba» se quitó a pedido del cliente
 * (29/10/2026): ya no hace falta.
 *
 * Va encima de «Avisos: de qué y por dónde» en Configuración. Ahí se elige
 * qué avisos llegan al celular; aquí, si este celular está listo para
 * recibirlos.
 */
export function AvisosEnEsteCelular() {
  const { estado, activar, activando } = useAvisosEnEsteCelular();

  if (!estado.disponible) {
    return (
      <Text className="text-xs leading-5 text-gray-500">
        Los avisos al celular llegan a la app instalada en el teléfono. Desde
        el navegador no se pueden recibir.
      </Text>
    );
  }

  return (
    <View className="gap-3">
      <Linea
        ok={estado.permiso}
        texto={estado.permiso ? "Tiene permiso para mostrar avisos" : "Todavía no tiene permiso para mostrar avisos"}
      />
      <Linea
        ok={estado.registrado}
        texto={
          estado.registrado
            ? "Está registrado para recibir avisos"
            : "Todavía no está registrado (necesita internet y el permiso)"
        }
      />

      {estado.permiso ? null : (
        <Button onPress={activar} loading={activando} fullWidth>
          Activar avisos en este celular
        </Button>
      )}
    </View>
  );
}

function Linea({ ok, texto }: { ok: boolean; texto: string }) {
  return (
    <View className="flex-row items-center gap-2">
      <Text style={{ color: ok ? theme.colors.success : theme.colors.danger }}>{ok ? "✓" : "✗"}</Text>
      <Text className="flex-1 text-xs text-gray-700">{texto}</Text>
    </View>
  );
}
