import React, { useState } from "react";
import { Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { theme } from "@/config";
import { Button, Input, Modal } from "@/shared/components";
import { useUIStore } from "@/stores";
import { mensajeDeError } from "@/shared/utils";
import { navigateToRoute } from "@/navigation/helpers/navigation.helpers";
import { useNavegacion, useParametrosDeLaBase } from "@/shared/hooks";
import { estanciaPorCodigo } from "@/features/visitas/services/porteria.repo";

/**
 * Buscar una visita desde el Inicio de la portería (14/10/2026).
 *
 * La responsable de producto: «añadir en Inicio registrar visita, con opción
 * de buscar por nombre, dpto o QR (solo para huéspedes temporales)». El QR lo
 * lleva el huésped en su app; si la cámara no lo lee —en algunos navegadores
 * de escritorio no hay lector—, el código va escrito debajo y se teclea.
 */
export function BuscarEnPorteria() {
  const navigation = useNavegacion();
  const { addToast } = useUIStore();
  const [texto, setTexto] = useState("");
  const [escaneando, setEscaneando] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [permiso, pedirPermiso] = useCameraPermissions();
  /*
    Cuántos caracteres hacen falta para buscar: `codigo_estancia_largo_minimo`.
    La ayuda decía 12 y el botón se encendía con 6; ahora los dos dicen lo
    mismo porque salen del mismo parámetro.
  */
  const parametros = useParametrosDeLaBase();
  const largoMinimo = parametros.listo
    ? parametros.numero("codigo_estancia_largo_minimo")
    : null;

  const buscar = () => {
    if (!texto.trim()) return;
    navigateToRoute(navigation, "Visitas", { busqueda: texto.trim() });
  };

  const abrirPorCodigo = async (leido: string) => {
    if (buscando) return;
    setBuscando(true);
    try {
      const visita = await estanciaPorCodigo(leido);
      if (!visita) {
        addToast("Ese QR no es de ninguna estancia de este edificio", "error");
        return;
      }
      setEscaneando(false);
      setCodigo("");
      navigateToRoute(navigation, "Visitas", { abrir: visita });
    } catch (e) {
      addToast(mensajeDeError(e, "No se pudo leer el QR"), "error");
    } finally {
      setBuscando(false);
    }
  };

  return (
    <View className="bg-white rounded-xl p-4 gap-3" style={{ boxShadow: theme.shadows.card }}>
      <Text className="text-base font-bold text-gray-900">Buscar una visita</Text>
      <Input
        label="Nombre o departamento"
        value={texto}
        onChangeText={setTexto}
        placeholder="Ej.: Ana o 102"
        showEditIcon={false}
      />
      <View className="flex-row gap-2.5">
        <View className="flex-1">
          <Button fullWidth variant="secondary" disabled={!texto.trim()} onPress={buscar}>
            Buscar
          </Button>
        </View>
        <View className="flex-1">
          <Button
            fullWidth
            onPress={async () => {
              /*
                La ventana se abre pase lo que pase con la cámara. Pedir el
                permiso falla en un computador sin cámara o si el navegador lo
                niega, y antes eso cortaba aquí: la ventana no se abría y el
                campo «O escribe el código» no aparecía nunca (T-019,
                21/10/2026).
              */
              setEscaneando(true);
              if (!permiso?.granted) await pedirPermiso().catch(() => undefined);
            }}
          >
            Escanear QR
          </Button>
        </View>
      </View>

      <Modal visible={escaneando} onClose={() => setEscaneando(false)} title="QR del huésped">
        <View className="gap-4">
          {permiso?.granted ? (
            <View className="overflow-hidden rounded-xl" style={{ height: 260 }}>
              <CameraView
                style={{ flex: 1 }}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                onBarcodeScanned={({ data }) => abrirPorCodigo(data)}
              />
            </View>
          ) : (
            <Text className="text-sm text-gray-600">
              Sin permiso para la cámara. Puedes teclear el código que el
              huésped tiene debajo de su QR.
            </Text>
          )}
          <Input
            label="O escribe el código"
            value={codigo}
            onChangeText={(t) => setCodigo(t.toUpperCase())}
            placeholder={
              largoMinimo === null
                ? undefined
                : `Al menos ${largoMinimo} letras y números`
            }
            showEditIcon={false}
          />
          <Button
            fullWidth
            loading={buscando}
            disabled={largoMinimo === null || codigo.trim().length < largoMinimo}
            onPress={() => abrirPorCodigo(codigo)}
          >
            Abrir estancia
          </Button>
        </View>
      </Modal>
    </View>
  );
}
