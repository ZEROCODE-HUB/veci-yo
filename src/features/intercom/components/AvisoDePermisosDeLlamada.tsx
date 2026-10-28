import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import { useQuery } from "@tanstack/react-query";
import { Button, Modal } from "@/shared/components";
import { useAuthStore } from "@/stores";
import { obtenerPreferencias } from "@/features/perfil/services/configuracion.repo";
import { usePermisosDeLlamada } from "../hooks/usePermisosDeLlamada";
import { PermisosDeLlamada } from "./PermisosDeLlamada";

const YA_SE_DIJO = "veciyo_aviso_permisos_llamada";

/**
 * Al entrar, si a este celular le falta algo para que las llamadas suenen
 * con la app cerrada, se dice una vez y se lleva al ajuste (28/10/2026). Lo
 * hacen igual las apps de llamadas: Android 14 da la pantalla completa solo a
 * las que Google reconoce como de llamadas, y algunas marcas cierran las apps
 * para ahorrar batería.
 *
 * «Ahora no» no vuelve a preguntar; los mismos botones están en Perfil ›
 * Configuración › Llamadas. Si la persona apagó «Recibir llamadas por la
 * app», no se pregunta.
 */
export function AvisoDePermisosDeLlamada() {
  const usuarioId = useAuthStore((s) => s.usuarioId);
  const { permisos, falta } = usePermisosDeLlamada();
  const [yaSeDijo, setYaSeDijo] = useState<boolean | null>(null);

  const { data: preferencias } = useQuery({
    queryKey: ["preferencias"],
    queryFn: obtenerPreferencias,
    enabled: Boolean(usuarioId) && falta,
  });

  useEffect(() => {
    if (!falta) return;
    SecureStore.getItemAsync(YA_SE_DIJO)
      .then((v) => setYaSeDijo(v === "si"))
      .catch(() => setYaSeDijo(false));
  }, [falta]);

  const cerrar = () => {
    setYaSeDijo(true);
    void SecureStore.setItemAsync(YA_SE_DIJO, "si").catch(() => {});
  };

  if (!usuarioId || !permisos || !falta || yaSeDijo !== false) return null;
  if (!preferencias?.recibeLlamadasApp) return null;

  return (
    <Modal visible onClose={cerrar} title="📞 Para que te lleguen las llamadas">
      <View className="gap-4">
        <Text className="text-sm text-gray-700" style={{ lineHeight: 20 }}>
          Con la app cerrada, las llamadas de la portería, la administración o tu
          vivienda suenan como una llamada normal. Para eso este celular necesita:
        </Text>
        <PermisosDeLlamada permisos={permisos} />
        <Button variant="secondary" fullWidth onPress={cerrar}>
          Ahora no
        </Button>
      </View>
    </Modal>
  );
}
