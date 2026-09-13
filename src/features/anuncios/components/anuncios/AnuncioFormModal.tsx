import { useEffect, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import DateTimePicker from "@react-native-community/datetimepicker";
import type { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Image, Pressable, Text, View } from "react-native";
import {
  Button,
  Input,
  Modal,
  Select,
  Tabs,
  Toggle,
} from "@/shared/components";
import { anuncioSchema } from "../../schemas/anuncios.schema";
import {
  anuncioFormVacio,
  anunciosCategorias,
  formatAnuncioDate,
  tiposAnuncio,
  type AnuncioFormValues,
} from "../../types/anuncios";

const iconAdjuntarDocumento = require("@/assets/icons/shared/adjuntar-documento.png");
const iconAdjuntarImagen = require("@/assets/icons/shared/adjuntar-imagen.png");

export function AnuncioFormModal({
  visible,
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (values: AnuncioFormValues) => void;
}) {
  const { control, handleSubmit, reset, setValue, watch } =
    useForm<AnuncioFormValues>({
      resolver: zodResolver(anuncioSchema),
      defaultValues: anuncioFormVacio(),
    });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "opcionesVotacion",
  });
  const [selector, setSelector] = useState<"publicada" | "finalizacion" | null>(
    null,
  );
  const tipo = watch("tipo");
  const fechaPublicada = watch("fechaPublicada");
  const fechaFinalizacion = watch("fechaFinalizacion");
  const votacionMultiple = watch("votacionMultiple");
  useEffect(() => {
    if (visible) reset(anuncioFormVacio());
  }, [reset, visible]);
  const selectDate = (_event: DateTimePickerEvent, date?: Date) => {
    setSelector(null);
    if (date)
      setValue(
        selector === "publicada" ? "fechaPublicada" : "fechaFinalizacion",
        date,
        { shouldValidate: true },
      );
  };
  return (
    <Modal visible={visible} onClose={onClose} title="Crear anuncio">
      <View className="gap-4" key={tipo}>
        <Controller
          control={control}
          name="tipo"
          render={({ field }) => (
            <Tabs
              tabs={[...tiposAnuncio]}
              active={field.value}
              onChange={(value) => field.onChange(value || "Anuncio")}
              variant="chip"
            />
          )}
        />
        <Controller
          control={control}
          name="categoria"
          render={({ field }) => (
            <Select
              value={field.value}
              options={anunciosCategorias}
              onChange={(value) => field.onChange(String(value))}
              placeholder="Categoria"
            />
          )}
        />
        <View>
          <Text className="text-sm text-gray-500 mb-2 font-medium">
            Dirigido a:
          </Text>
          <View className="gap-2">
            {(
              [
                { key: "paraPropietarios", label: "Propietarios" },
                { key: "paraResidentes", label: "Residentes" },
                { key: "paraHuespedes", label: "Huespedes Temporales" },
              ] as const
            ).map((option) => (
              <Controller
                key={option.key}
                control={control}
                name={option.key}
                render={({ field }) => (
                  <Pressable
                    onPress={() => field.onChange(!field.value)}
                    className="flex-row items-center gap-2.5"
                  >
                    <View
                      className="items-center justify-center rounded"
                      style={{
                        width: 18,
                        height: 18,
                        borderWidth: 2,
                        borderColor: field.value ? "#F59E0B" : "#D1D5DB",
                        backgroundColor: field.value ? "#F59E0B" : "#fff",
                      }}
                    >
                      {field.value && (
                        <Text
                          style={{
                            fontSize: 12,
                            color: "#fff",
                            fontWeight: "700",
                          }}
                        >
                          ✓
                        </Text>
                      )}
                    </View>
                    <Text className="text-base text-gray-900">
                      {option.label}
                    </Text>
                  </Pressable>
                )}
              />
            ))}
          </View>
        </View>
        <Controller
          control={control}
          name="titulo"
          render={({ field }) => (
            <Input
              label="Titulo*"
              value={field.value}
              onChangeText={field.onChange}
              placeholder="Título del anuncio"
              multiline
            />
          )}
        />
        <Controller
          control={control}
          name="descripcion"
          render={({ field }) => (
            <Input
              label="Descripción*"
              value={field.value}
              onChangeText={field.onChange}
              placeholder="Describa con el mayor detalle posible"
              multiline
            />
          )}
        />
        {tipo === "Anuncio" ? (
          <View className="gap-2">
            <DateField
              label="Fecha de publicación*"
              value={fechaPublicada}
              onPress={() => setSelector("publicada")}
            />
            <DateField
              label="Fecha de finalización"
              value={fechaFinalizacion}
              onPress={() => setSelector("finalizacion")}
            />
          </View>
        ) : (
          <>
            <View>
              <Text className="text-sm text-gray-500 mb-1.5 font-medium">
                Opciones de votación
              </Text>
              {fields.map((field, index) => (
                <View
                  key={field.id}
                  className="flex-row gap-2 mb-2 items-center"
                >
                  <View className="flex-1">
                    <Controller
                      control={control}
                      name={`opcionesVotacion.${index}.valor`}
                      render={({ field: optionField }) => (
                        <Input
                          value={optionField.value}
                          onChangeText={optionField.onChange}
                          placeholder={`Opción ${index + 1}`}
                        />
                      )}
                    />
                  </View>
                  {fields.length > 2 && (
                    <Pressable onPress={() => remove(index)}>
                      <Text style={{ fontSize: 18, color: "#EF4444" }}>×</Text>
                    </Pressable>
                  )}
                </View>
              ))}
              <Pressable
                onPress={() => append({ valor: "" })}
                className="items-center py-2 rounded-lg"
                style={{
                  borderWidth: 1,
                  borderColor: "#D1D5DB",
                  borderStyle: "dashed",
                }}
              >
                <Text className="text-sm text-gray-500">+ Agregar opción</Text>
              </Pressable>
            </View>
            <Controller
              control={control}
              name="ocultarResultados"
              render={({ field }) => (
                <Toggle
                  value={field.value}
                  onChange={field.onChange}
                  labelRight="Ocultar resultados hasta el cierre"
                />
              )}
            />
            <View>
              <Text className="text-sm text-gray-500 mb-1.5 font-medium">
                Tipo de selección
              </Text>
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => setValue("votacionMultiple", false)}
                  className="flex-1 items-center py-2 rounded-full"
                  style={{
                    borderWidth: 1.5,
                    borderColor: !votacionMultiple ? "#F59E0B" : "#E5E7EB",
                    backgroundColor: !votacionMultiple ? "#F59E0B" : "#fff",
                  }}
                >
                  <Text
                    className="text-sm font-semibold"
                    style={{ color: !votacionMultiple ? "#fff" : "#6B7280" }}
                  >
                    Única
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setValue("votacionMultiple", true)}
                  className="flex-1 items-center py-2 rounded-full"
                  style={{
                    borderWidth: 1.5,
                    borderColor: votacionMultiple ? "#F59E0B" : "#E5E7EB",
                    backgroundColor: votacionMultiple ? "#F59E0B" : "#fff",
                  }}
                >
                  <Text
                    className="text-sm font-semibold"
                    style={{ color: votacionMultiple ? "#fff" : "#6B7280" }}
                  >
                    Múltiple
                  </Text>
                </Pressable>
              </View>
            </View>
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Controller
                  control={control}
                  name="umbral"
                  render={({ field }) => (
                    <Input
                      value={field.value}
                      onChangeText={field.onChange}
                      placeholder="Umbral mínimo"
                    />
                  )}
                />
              </View>
              <View className="flex-1">
                <Controller
                  control={control}
                  name="tiempoMaximo"
                  render={({ field }) => (
                    <Input
                      value={field.value}
                      onChangeText={field.onChange}
                      placeholder="Tiempo máximo"
                    />
                  )}
                />
              </View>
            </View>
            <View className="gap-2">
              <DateField
                label="Fecha de publicación*"
                value={fechaPublicada}
                onPress={() => setSelector("publicada")}
              />
              <DateField
                label="Fecha de finalización"
                value={fechaFinalizacion}
                onPress={() => setSelector("finalizacion")}
              />
            </View>
          </>
        )}
        <View className="flex-row gap-4 justify-center mt-1">
          {[
            {
              key: "documento",
              label: "Adjuntar Documento",
              icon: iconAdjuntarDocumento,
            },
            {
              key: "imagen",
              label: "Adjuntar Imagen",
              icon: iconAdjuntarImagen,
            },
          ].map((item) => (
            <Pressable key={item.key} className="items-center gap-1.5">
              <Image
                source={item.icon}
                style={{ width: 48, height: 48, borderRadius: 12 }}
                resizeMode="cover"
              />
              <Text className="text-xs text-gray-900 text-center">
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Button
          variant="primary"
          fullWidth
          onPress={() => void handleSubmit(onSave)()}
        >
          Publicar
        </Button>
      </View>
      {selector && (
        <DateTimePicker
          value={
            (selector === "publicada" ? fechaPublicada : fechaFinalizacion) ||
            new Date()
          }
          mode="date"
          display="default"
          onChange={selectDate}
        />
      )}
    </Modal>
  );
}

function DateField({
  label,
  value,
  onPress,
}: {
  label: string;
  value: Date | null;
  onPress: () => void;
}) {
  return (
    <View>
      <Text className="text-sm text-gray-500 mb-1.5 font-medium">{label}</Text>
      <Pressable
        onPress={onPress}
        className="rounded-2xl px-4 py-3"
        style={{
          borderWidth: 1.5,
          borderColor: "#E5E7EB",
          backgroundColor: "#fff",
        }}
      >
        <Text className="text-base text-gray-700">
          {formatAnuncioDate(value)}
        </Text>
      </Pressable>
    </View>
  );
}
