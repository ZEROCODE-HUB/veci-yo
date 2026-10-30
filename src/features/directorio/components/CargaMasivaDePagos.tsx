import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/config";
import { Button, Modal } from "@/shared/components/ui";
import { useUIStore } from "@/stores";
import { mensajeDeError } from "@/shared/utils";
import {
  descargarPlantillaDePagos,
  filasDeArchivo,
  COLUMNA_PAGADO,
  type FilaDePlantilla,
  type FilaLeida,
} from "../services/pagosArchivo";

interface CargaMasivaDePagosProps {
  visible: boolean;
  onClose: () => void;
  /** Lo que va en la plantilla: cada departamento con sus importes. */
  plantilla: FilaDePlantilla[];
  nombreDelMes: string;
  onConfirmar: (filas: FilaLeida[]) => void;
}

/**
 * La carga masiva de pagos con plantilla (Para Claude 189, 30/10/2026).
 *
 * Primero se descarga el Excel con los departamentos --código, nombre, importe
 * mensual, importes variables y la columna vacía «Monto pagado»--, se rellena,
 * y se sube. Cada pago se registra con las mismas reglas que a mano: nunca por
 * encima de lo que falta. Ya no hay casilla para escribir los códigos: todo
 * sale del archivo.
 */
export function CargaMasivaDePagos({
  visible,
  onClose,
  plantilla,
  nombreDelMes,
  onConfirmar,
}: CargaMasivaDePagosProps) {
  const addToast = useUIStore((state) => state.addToast);
  const [archivo, setArchivo] = useState("");
  const [leyendo, setLeyendo] = useState(false);
  const [filas, setFilas] = useState<FilaLeida[]>([]);

  const cerrar = () => {
    setArchivo("");
    setFilas([]);
    onClose();
  };

  const descargar = async () => {
    try {
      await descargarPlantillaDePagos(plantilla, nombreDelMes);
    } catch (e) {
      addToast(mensajeDeError(e, "No se pudo generar la plantilla"), "error");
    }
  };

  const elegirArchivo = async () => {
    try {
      const resultado = await DocumentPicker.getDocumentAsync({
        type: [
          "text/csv",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ],
        copyToCacheDirectory: true,
      });
      if (resultado.canceled || !resultado.assets?.length) return;
      const elegido = resultado.assets[0];
      setLeyendo(true);
      setFilas(await filasDeArchivo(elegido.uri));
      setArchivo(elegido.name ?? "Archivo seleccionado");
    } catch (e) {
      addToast(mensajeDeError(e, "No se pudo leer el archivo"), "error");
    } finally {
      setLeyendo(false);
    }
  };

  return (
    <Modal visible={visible} onClose={cerrar} title="Cargar pagos con la plantilla">
      <View style={{ gap: 14 }}>
        <Text className="text-xs leading-5 text-gray-500">
          {`1. Descarga la plantilla de ${nombreDelMes}. 2. Escribe en «${COLUMNA_PAGADO}» lo que pagó cada departamento (deja vacío el que no pagó). 3. Súbela.`}
        </Text>
        <Button variant="secondary" fullWidth onPress={() => void descargar()} disabled={!plantilla.length}>
          Descargar plantilla Excel
        </Button>

        <Pressable
          onPress={() => void elegirArchivo()}
          disabled={leyendo}
          accessibilityRole="button"
          accessibilityLabel="Subir la plantilla rellenada"
          className="items-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-100 px-4 py-6 active:opacity-70"
        >
          <Ionicons name="document-outline" size={28} color={theme.colors.textSecondary} />
          <Text className="mt-1.5 text-center text-sm font-semibold text-gray-900">
            {leyendo ? "Leyendo el archivo…" : "Sube la plantilla rellenada"}
          </Text>
          {archivo ? (
            <Text className="mt-2 text-xs font-semibold text-primary">
              {`${archivo} · ${filas.length} pago(s) encontrados`}
            </Text>
          ) : null}
        </Pressable>

        {archivo && !filas.length ? (
          <View className="rounded-xl bg-amber-100 p-3">
            <Text className="text-xs leading-5 text-amber-800">
              {`No encontramos ningún monto en «${COLUMNA_PAGADO}».`}
            </Text>
          </View>
        ) : null}

        <View className="flex-row gap-2.5">
          <View className="flex-1">
            <Button variant="secondary" fullWidth onPress={cerrar}>
              Cancelar
            </Button>
          </View>
          <View className="flex-1">
            <Button
              fullWidth
              disabled={!filas.length}
              onPress={() => {
                onConfirmar(filas);
                cerrar();
              }}
            >
              {`Registrar ${filas.length} pago(s)`}
            </Button>
          </View>
        </View>
        <Text className="text-center text-xs leading-5 text-gray-400">
          Un pago que pase de lo que falta no se registra; al terminar te decimos cuáles.
        </Text>
      </View>
    </Modal>
  );
}
