import React, { useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { theme } from "@/config";
import { Button, Input, Modal } from "@/shared/components";
import { useUIStore } from "@/stores";
import { mensajeDeError } from "@/shared/utils";
import { navigateToRoute } from "@/navigation/helpers/navigation.helpers";
import { useNavegacion, useParametrosDeLaBase } from "@/shared/hooks";
import { buscarEstanciaPorCodigo } from "@/features/visitas/services/porteria.repo";
import { pareceCodigo, porQueNoSeAbre } from "@/features/visitas/helpers/estanciaDelCodigo";

/**
 * Buscar una visita desde el Inicio de la portería (14/10/2026).
 *
 * La responsable de producto: «añadir en Inicio registrar visita, con opción
 * de buscar por nombre, dpto o QR (solo para huéspedes temporales)». El QR lo
 * lleva el huésped en su app; si la cámara no lo lee —en algunos navegadores
 * de escritorio no hay lector—, el código va escrito debajo y se teclea.
 *
 * 26/10/2026 (el cliente: «escaneé uno y no me llevó a la reserva»): un QR de
 * una estancia de otro día abría Visitas y no pasaba nada, porque la portería
 * solo ve hoy, mañana y a quien está dentro. Ahora se dice de qué vivienda y
 * qué fechas es. Y el buscador acepta también el código del correo y la placa.
 */
export function BuscarEnPorteria() {
  const navigation = useNavegacion();
  const { addToast } = useUIStore();
  const [texto, setTexto] = useState("");
  const [escaneando, setEscaneando] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [buscando, setBuscando] = useState(false);
  /*
    La cámara lee el mismo QR varias veces por segundo: sin esto, un QR que no
    se puede abrir repetía su aviso sin parar mientras siguiera delante.
  */
  const ultimoLeido = useRef({ codigo: "", en: 0 });
  /** Por qué el último código no abrió nada, a la vista en la ventana del QR. */
  const [aviso, setAviso] = useState("");
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
    const t = texto.trim();
    if (!t) return;
    // Un código de estancia (el del correo o el de debajo del QR) abre la suya.
    if (largoMinimo !== null && pareceCodigo(t, largoMinimo)) {
      void abrirPorCodigo(t);
      return;
    }
    navigateToRoute(navigation, "Visitas", { busqueda: t });
  };

  const leerDeLaCamara = (leido: string) => {
    const ahora = Date.now();
    if (leido === ultimoLeido.current.codigo && ahora - ultimoLeido.current.en < 4000) return;
    ultimoLeido.current = { codigo: leido, en: ahora };
    void abrirPorCodigo(leido);
  };

  const abrirPorCodigo = async (leido: string) => {
    if (buscando) return;
    setBuscando(true);
    try {
      const estancia = await buscarEstanciaPorCodigo(leido);
      /*
        Queda escrito --en la ventana del QR o debajo del buscador-- y no en un
        aviso que se va solo: son fechas que hay que poder leer con calma.
      */
      if (!estancia) {
        setAviso("Ese código no es de ninguna reserva de este edificio.");
        return;
      }
      const motivo = porQueNoSeAbre(estancia);
      if (motivo) {
        setAviso(motivo);
        return;
      }
      setAviso("");
      setEscaneando(false);
      setCodigo("");
      setTexto("");
      navigateToRoute(navigation, "Visitas", { abrir: estancia.visitaId });
    } catch (e) {
      addToast(mensajeDeError(e, "No se pudo leer el QR"), "error");
    } finally {
      setBuscando(false);
    }
  };

  return (
    /*
      Compacto, en una sola fila (pedido del cliente, 29/10/2026: «que no ocupe
      tanto espacio»): la caja de texto, la lupa y el QR.
    */
    <View className="bg-white rounded-xl px-3 py-2 gap-1.5" style={{ boxShadow: theme.shadows.card }}>
      <View className="flex-row items-center gap-2">
        <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
        <TextInput
          accessibilityLabel="Buscar una visita: nombre, depto, placa o código"
          value={texto}
          onChangeText={(t) => {
            setTexto(t);
            setAviso("");
          }}
          onSubmitEditing={buscar}
          returnKeyType="search"
          placeholder="Buscar visita: nombre, depto, placa o código"
          placeholderTextColor={theme.colors.textMuted}
          className="flex-1 py-2 text-sm text-gray-900"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Buscar"
          disabled={!texto.trim()}
          onPress={buscar}
          hitSlop={6}
          className="h-9 w-9 items-center justify-center rounded-full bg-secondary"
          style={{ opacity: texto.trim() ? 1 : 0.4 }}
        >
          <Ionicons name="arrow-forward" size={18} color={theme.colors.textInverse} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Escanear QR"
          hitSlop={6}
          onPress={async () => {
            /*
              La ventana se abre pase lo que pase con la cámara. Pedir el
              permiso falla en un computador sin cámara o si el navegador lo
              niega, y antes eso cortaba aquí: la ventana no se abría y el
              campo «O escribe el código» no aparecía nunca (T-019,
              21/10/2026).
            */
            setAviso("");
            setEscaneando(true);
            if (!permiso?.granted) await pedirPermiso().catch(() => undefined);
          }}
          className="h-9 w-9 items-center justify-center rounded-full bg-primary"
        >
          <Ionicons name="qr-code" size={18} color={theme.colors.textInverse} />
        </Pressable>
      </View>
      {aviso && !escaneando ? (
        <Text className="text-xs text-gray-700" accessibilityLiveRegion="polite">
          {aviso}
        </Text>
      ) : null}

      <Modal
        visible={escaneando}
        onClose={() => {
          setEscaneando(false);
          setAviso("");
        }}
        title="QR del huésped"
      >
        <View className="gap-4">
          {permiso?.granted ? (
            <View className="overflow-hidden rounded-xl" style={{ height: 260 }}>
              <CameraView
                style={{ flex: 1 }}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                onBarcodeScanned={({ data }) => leerDeLaCamara(data)}
              />
            </View>
          ) : (
            <Text className="text-sm text-gray-600">
              Sin permiso para la cámara. Puedes teclear el código que el
              huésped tiene debajo de su QR.
            </Text>
          )}
          {aviso ? (
            <Text className="text-sm text-gray-700" accessibilityLiveRegion="polite">
              {aviso}
            </Text>
          ) : null}
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
