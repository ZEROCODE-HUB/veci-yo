import { Text, View } from "react-native";
import { theme } from "@/config";
import { Button } from "@/shared/components";
import { formatTime } from "@/shared/utils";
import type { EnvioPush } from "@/features/home/services/notificaciones.repo";
import { useAvisosEnEsteCelular } from "../../hooks/useAvisosEnEsteCelular";

/**
 * Si este celular recibe avisos, y la prueba de que llegan.
 *
 * Va encima de «Avisos: de qué y por dónde» en Configuración. Ahí se elige
 * qué avisos llegan al celular; aquí, si este celular está listo para
 * recibirlos.
 */
export function AvisosEnEsteCelular() {
  const { estado, activar, activando, enviarPrueba, enviando, envio } = useAvisosEnEsteCelular();

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

      <Button variant="secondary" onPress={enviarPrueba} loading={enviando} fullWidth>
        Enviarme un aviso de prueba
      </Button>

      {envio === undefined ? null : <ResultadoDeLaPrueba envio={envio} />}
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

/** En qué quedó el último aviso de prueba, dicho como se entiende. */
export function textoDeLaPrueba(envio: EnvioPush | null): { texto: string; tono: "bien" | "mal" | "espera" } {
  if (!envio || envio.estado === "pendiente") return { texto: "Enviando el aviso…", tono: "espera" };
  if (envio.recibidoEn) return { texto: `Te llegó a las ${formatTime(envio.recibidoEn)}. Los avisos funcionan.`, tono: "bien" };
  switch (envio.estado) {
    case "enviado":
      return {
        texto: "Salió hacia tu celular. Si en un minuto no lo ves, revisa que las notificaciones de Veciyo estén permitidas.",
        tono: "espera",
      };
    case "sin_dispositivo":
      return {
        texto: "No llegó: este celular no está registrado para tu cuenta. Activa los avisos, espera unos segundos y prueba otra vez.",
        tono: "mal",
      };
    case "apagado":
      return { texto: `No se envió: ${envio.detalle ?? "los avisos al celular están apagados"}.`, tono: "mal" };
    case "error":
      return { texto: `No se pudo enviar: ${envio.detalle ?? "error desconocido"}.`, tono: "mal" };
  }
}

function ResultadoDeLaPrueba({ envio }: { envio: EnvioPush | null }) {
  const { texto, tono } = textoDeLaPrueba(envio);
  const fondo =
    tono === "bien" ? theme.colors.successLight : tono === "mal" ? theme.colors.dangerLight : theme.colors.warningLight;
  return (
    <View className="p-3 rounded-xl" style={{ backgroundColor: fondo }}>
      <Text className="text-xs text-gray-900" style={{ lineHeight: 18 }}>
        {texto}
      </Text>
    </View>
  );
}
