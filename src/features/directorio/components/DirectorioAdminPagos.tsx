import { theme } from "@/config";
import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from "@expo/vector-icons";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Checkbox, Input, Modal } from "@/shared/components/ui";
import { usePerfilStore, useUIStore } from "@/stores";
import { Select } from "@/shared/components";
import { formatDateIso } from "@/shared/utils";
import {
  pagosMasivosSchema,
  type PagosMasivosFormData,
} from "../schemas/pagos.schema";
import { useCuotas } from "../hooks/useCuotas";

interface UnidadPago {
  id: number;
  /** El identificador real; `id` es el numerico de presentacion. */
  uuid?: string;
  codigo: string;
  propietarioAsignado?: string;
  propietarioEmail?: string;
}

interface DirectorioAdminPagosProps {
  unidades: UnidadPago[];
}

function parseCodes(text: string) {
  return [
    ...new Set(
      text
        .split(/[\n,;]+/)
        .map((code) => code.trim())
        .filter(Boolean),
    ),
  ];
}

export function DirectorioAdminPagos({ unidades }: DirectorioAdminPagosProps) {
  const { comitePropietarios, toggleComite } = usePerfilStore();
  /*
    `pagosMantenimiento` salia de un store de Zustand y se perdia al
    recargar. Ahora viene de `pago_cuota`, y hace falta decir **de que
    mes**: marcar pagado sin periodo no significa nada, y el Cuadro de
    Honor cuenta por periodo.
  */
  const cuotas = useCuotas();
  const addToast = useUIStore((state) => state.addToast);
  const [fileName, setFileName] = useState("");
  const [detectedCodes, setDetectedCodes] = useState<string[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const { control, handleSubmit, reset, setValue, watch } =
    useForm<PagosMasivosFormData>({
      resolver: zodResolver(pagosMasivosSchema),
      defaultValues: { manualCodes: "" },
    });

  const totalPagados = unidades.filter(
    (unidad) => unidad.uuid && cuotas.estaPagada(unidad.uuid),
  ).length;
  const codes = detectedCodes.length
    ? detectedCodes
    : parseCodes(watch("manualCodes"));

  const closeUploadModal = () => {
    setShowUploadModal(false);
    setFileName("");
    setDetectedCodes([]);
    reset({ manualCodes: "" });
  };

  const selectFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "text/csv",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;
      const file = result.assets[0];
      const uri = file.uri;
      const fileText = await (await fetch(uri)).text();
      const parsed = parseCodes(fileText);

      setFileName(file.name ?? "Archivo seleccionado");
      setDetectedCodes(parsed);
      if (parsed.length) setValue("manualCodes", parsed.join(", "));
    } catch {
      addToast(
        "No se pudo leer el archivo. Puedes pegar los códigos manualmente.",
        "error",
      );
    }
  };

  const confirmUpload = () => {
    if (!codes.length) {
      addToast(
        "No se encontraron códigos de departamento en el archivo",
        "error",
      );
      return;
    }

    /*
      Los códigos van tal cual a la base, que es quien sabe cuáles existen.
      Antes se cruzaban aquí contra la lista cargada y se anunciaba
      "N departamentos marcados" con el tamaño de esa lista, sin que se
      hubiera marcado ninguno.
    */
    cuotas.marcarMasivo(codes);
    closeUploadModal();
  };

  return (
    <View style={{ gap: 12 }}>
      {/*
        El periodo no existia en la pantalla: se marcaba "pagado" a secas.
        Un pago es de un mes, y el Cuadro de Honor cuenta por mes.
      */}
      <View
        className="rounded-[20px] bg-white p-3"
        style={{ boxShadow: theme.shadows.card }}
      >
        <Select
          label="Mes que se está registrando"
          value={cuotas.cuotaId}
          options={cuotas.periodos.map((p) => ({
            value: p.id,
            label: formatDateIso(p.periodo),
          }))}
          placeholder="Elegí el periodo"
          onChange={(value) => cuotas.setCuotaId(String(value))}
        />
      </View>

      <View className="rounded-xl bg-gray-100 p-3">
        <Text className="text-sm text-gray-700">
          Pagados: {totalPagados} / {unidades.length} · No pagados:{" "}
          {unidades.length - totalPagados}
        </Text>
      </View>

      <View
        className="rounded-[20px] bg-white p-3"
        style={{ boxShadow: theme.shadows.card }}
      >
        <Text className="mb-2 text-sm font-semibold text-gray-900">
          Carga masiva de pagos
        </Text>
        <Text className="mb-3 text-xs leading-5 text-gray-500">
          Sube un Excel o CSV con la lista de departamentos que pagaron. El
          sistema marcará automáticamente cada departamento como pagado.
        </Text>
        <Button fullWidth onPress={() => setShowUploadModal(true)}>
          Cargar y marcar pagados
        </Button>
      </View>

      {unidades.map((unidad) => {
        const isCommitteeMember = Boolean(
          unidad.propietarioEmail &&
          comitePropietarios[unidad.propietarioEmail],
        );

        return (
          <View
            key={unidad.id}
            className="rounded-[20px] bg-white p-3"
            style={{ gap: 6, boxShadow: theme.shadows.card }}
          >
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1 flex-row flex-wrap items-center pr-1">
                <Text className="text-sm font-semibold text-gray-900">
                  {unidad.codigo} —{" "}
                  {unidad.propietarioAsignado || "Sin propietario"}
                </Text>
                {isCommitteeMember ? (
                  <View className="ml-1 rounded-full bg-blue-100 px-1.5 py-0.5">
                    <Text className="text-[10px] font-semibold text-blue-800">
                      Comité de Propietarios
                    </Text>
                  </View>
                ) : null}
              </View>
              <View style={{ width: 90 }}>
                <Checkbox
                  checked={Boolean(
                    unidad.uuid && cuotas.estaPagada(unidad.uuid),
                  )}
                  onChange={(pagado) =>
                    unidad.uuid && cuotas.marcar(unidad.uuid, pagado)
                  }
                  label="Pagado"
                />
              </View>
            </View>
            <Pressable
              disabled={!unidad.propietarioEmail}
              onPress={() =>
                unidad.propietarioEmail && toggleComite(unidad.propietarioEmail)
              }
              className="w-full self-start rounded-full border border-gray-200 px-2.5 py-1 active:opacity-70"
              style={{ opacity: unidad.propietarioEmail ? 1 : 0.5 }}
            >
              <Text className="text-xs text-gray-600 text-center">
                {isCommitteeMember
                  ? "Quitar de Comité"
                  : "Marcar Comité de Propietarios"}
              </Text>
            </Pressable>
          </View>
        );
      })}

      <Modal
        visible={showUploadModal}
        onClose={closeUploadModal}
        title="Cargar pagos desde Excel / CSV"
      >
        <View style={{ gap: 14 }}>
          <Pressable
            onPress={selectFile}
            className="items-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-100 px-4 py-6 active:opacity-70"
          >
            <Ionicons
              name="document-outline"
              size={28}
              color={theme.colors.textSecondary}
            />
            <Text className="mt-1.5 text-center text-sm font-semibold text-gray-900">
              Selecciona tu Excel o CSV
            </Text>
            <Text className="mt-1 text-center text-xs leading-5 text-gray-500">
              Formatos aceptados: .xlsx, .xls, .csv. Debe contener códigos de
              departamento, por ejemplo 101, 102 o 506 C.
            </Text>
            {fileName ? (
              <Text className="mt-2 text-xs font-semibold text-primary">
                {fileName} · {detectedCodes.length} código(s) detectado(s)
              </Text>
            ) : null}
          </Pressable>

          {detectedCodes.length ? (
            <View className="rounded-xl bg-gray-100 p-3">
              <Text className="mb-1.5 text-xs font-semibold text-gray-500">
                Códigos detectados ({detectedCodes.length}):
              </Text>
              <View className="flex-row flex-wrap gap-1.5">
                {detectedCodes.map((code) => (
                  <View
                    key={code}
                    className="rounded-full border border-gray-200 bg-white px-2 py-0.5"
                  >
                    <Text className="text-xs text-gray-700">{code}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {fileName && !detectedCodes.length ? (
            <View className="rounded-xl bg-amber-100 p-3">
              <Text className="text-xs leading-5 text-amber-800">
                No se detectaron códigos. Si es un Excel, prueba exportándolo
                como CSV o pega los códigos manualmente abajo.
              </Text>
            </View>
          ) : null}

          <Controller
            control={control}
            name="manualCodes"
            render={({ field }) => (
              <Input
                label="O pega la lista manualmente separados por coma o salto de línea"
                value={field.value}
                onChangeText={(value) => {
                  field.onChange(value);
                  setDetectedCodes(parseCodes(value));
                }}
                placeholder="101, 102, 201..."
                multiline
                showEditIcon={false}
              />
            )}
          />

          <View className="flex-row gap-2.5">
            <View className="flex-1">
              <Button variant="secondary" fullWidth onPress={closeUploadModal}>
                Cancelar
              </Button>
            </View>
            <View className="flex-1">
              <Button
                fullWidth
                disabled={!codes.length}
                onPress={() => void handleSubmit(() => confirmUpload())()}
              >
                Cargar y marcar pagados
              </Button>
            </View>
          </View>
          <Text className="text-center text-xs leading-5 text-gray-400">
            Se marcarán como pagados los departamentos cuyo código coincida. Los
            no encontrados se ignorarán.
          </Text>
        </View>
      </Modal>
    </View>
  );
}
