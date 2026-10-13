import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/config";
import { Button, Input, Modal } from "@/shared/components/ui";
import { useUIStore } from "@/stores";
import { codigosDeTexto } from "../helpers/codigosDePago";
import { codigosDeArchivo } from "../services/pagosArchivo";

interface CargaMasivaDePagosProps {
  visible: boolean;
  onClose: () => void;
  /** Los códigos de las viviendas que existen: ayudan a encontrar la columna. */
  codigosConocidos: string[];
  onConfirmar: (codigos: string[]) => void;
}

/**
 * La carga masiva de pagos: un Excel o CSV, o la lista pegada a mano.
 *
 * Prometía Excel y leía el archivo como texto, así que un `.xlsx` no daba ni
 * un código, y de un CSV con varias columnas tomaba por código cada celda
 * (13/10/2026). El archivo se lee ahora de verdad, en `pagosArchivo`.
 */
export function CargaMasivaDePagos({
  visible,
  onClose,
  codigosConocidos,
  onConfirmar,
}: CargaMasivaDePagosProps) {
  const addToast = useUIStore((state) => state.addToast);
  const [archivo, setArchivo] = useState("");
  const [leyendo, setLeyendo] = useState(false);
  const [texto, setTexto] = useState("");

  const codigos = codigosDeTexto(texto);

  const cerrar = () => {
    setArchivo("");
    setTexto("");
    onClose();
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
      const leidos = await codigosDeArchivo(elegido.uri, codigosConocidos);
      setArchivo(elegido.name ?? "Archivo seleccionado");
      // Van al cuadro de texto: ahí se ven y se pueden corregir antes de cargar.
      setTexto(leidos.join(", "));
    } catch {
      addToast(
        "No se pudo leer el archivo. Puedes pegar los códigos a mano.",
        "error",
      );
    } finally {
      setLeyendo(false);
    }
  };

  const confirmar = () => {
    if (!codigos.length) {
      addToast("No hay ningún código de departamento que cargar", "error");
      return;
    }
    /*
      Los códigos van tal cual a la base, que es quien sabe cuáles existen.
      Antes se cruzaban aquí contra la lista cargada y se anunciaba
      "N departamentos marcados" con el tamaño de esa lista, sin que se
      hubiera marcado ninguno.
    */
    onConfirmar(codigos);
    cerrar();
  };

  return (
    <Modal
      visible={visible}
      onClose={cerrar}
      title="Cargar pagos desde Excel / CSV"
    >
      <View style={{ gap: 14 }}>
        <Pressable
          onPress={() => void elegirArchivo()}
          disabled={leyendo}
          accessibilityRole="button"
          accessibilityLabel="Seleccionar un archivo de Excel o CSV"
          className="items-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-100 px-4 py-6 active:opacity-70"
        >
          <Ionicons
            name="document-outline"
            size={28}
            color={theme.colors.textSecondary}
          />
          <Text className="mt-1.5 text-center text-sm font-semibold text-gray-900">
            {leyendo ? "Leyendo el archivo…" : "Selecciona tu Excel o CSV"}
          </Text>
          <Text className="mt-1 text-center text-xs leading-5 text-gray-500">
            Formatos aceptados: .xlsx, .xls, .csv. Tiene que traer una columna
            con los códigos de departamento, por ejemplo 101, 102 o 506 C.
          </Text>
          {archivo ? (
            <Text className="mt-2 text-xs font-semibold text-primary">
              {archivo} · {codigos.length} código(s) detectado(s)
            </Text>
          ) : null}
        </Pressable>

        {archivo && !codigos.length ? (
          <View className="rounded-xl bg-amber-100 p-3">
            <Text className="text-xs leading-5 text-amber-800">
              No encontramos códigos en ese archivo. Comprueba que tenga una
              columna con los departamentos, o pégalos a mano abajo.
            </Text>
          </View>
        ) : null}

        <Input
          label="Departamentos que pagaron, separados por coma o salto de línea"
          value={texto}
          onChangeText={setTexto}
          placeholder="101, 102, 201..."
          multiline
          showEditIcon={false}
        />

        <View className="flex-row gap-2.5">
          <View className="flex-1">
            <Button variant="secondary" fullWidth onPress={cerrar}>
              Cancelar
            </Button>
          </View>
          <View className="flex-1">
            <Button fullWidth disabled={!codigos.length} onPress={confirmar}>
              {`Marcar ${codigos.length} como pagados`}
            </Button>
          </View>
        </View>
        <Text className="text-center text-xs leading-5 text-gray-400">
          Se marcan los departamentos cuyo código exista. Al terminar te decimos
          cuáles no se encontraron.
        </Text>
      </View>
    </Modal>
  );
}
