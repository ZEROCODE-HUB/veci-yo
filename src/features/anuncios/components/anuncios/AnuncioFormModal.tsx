import { theme } from "@/config";
import { useEffect, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import DateTimePicker from "@react-native-community/datetimepicker";
import type { DateTimePickerChangeEvent } from "@react-native-community/datetimepicker";
import { Pressable, Text, View } from "react-native";
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
  const selectDate = (_event: DateTimePickerChangeEvent, date: Date) => {
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
              placeholder="Categoría"
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
                { key: "paraHuespedes", label: "Huéspedes Temporales" },
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
                        borderColor: field.value
                          ? theme.colors.warning
                          : theme.colors.borderStrong,
                        backgroundColor: field.value
                          ? theme.colors.warning
                          : theme.colors.bgCard,
                      }}
                    >
                      {field.value && (
                        <Text
                          style={{
                            fontSize: 12,
                            color: theme.colors.textInverse,
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
              label="Título*"
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
                    <Pressable
                      accessibilityLabel="Quitar esta opción"
                      onPress={() => remove(index)}>
                      <Text
                        style={{ fontSize: 18, color: theme.colors.danger }}
                      >
                        ×
                      </Text>
                    </Pressable>
                  )}
                </View>
              ))}
              <Pressable
                onPress={() => append({ valor: "" })}
                className="items-center py-2 rounded-lg"
                style={{
                  borderWidth: 1,
                  borderColor: theme.colors.borderStrong,
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
                    borderColor: !votacionMultiple
                      ? theme.colors.warning
                      : theme.colors.border,
                    backgroundColor: !votacionMultiple
                      ? theme.colors.warning
                      : theme.colors.bgCard,
                  }}
                >
                  <Text
                    className="text-sm font-semibold"
                    style={{
                      color: !votacionMultiple
                        ? theme.colors.textInverse
                        : theme.colors.textSecondary,
                    }}
                  >
                    Única
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setValue("votacionMultiple", true)}
                  className="flex-1 items-center py-2 rounded-full"
                  style={{
                    borderWidth: 1.5,
                    borderColor: votacionMultiple
                      ? theme.colors.warning
                      : theme.colors.border,
                    backgroundColor: votacionMultiple
                      ? theme.colors.warning
                      : theme.colors.bgCard,
                  }}
                >
                  <Text
                    className="text-sm font-semibold"
                    style={{
                      color: votacionMultiple
                        ? theme.colors.textInverse
                        : theme.colors.textSecondary,
                    }}
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
                    /*
                      Ponia «Umbral mínimo» y nada mas: ni etiqueta ni unidad.
                      Quien administra tenia que adivinar que es el numero de
                      votos que se espera reunir --y que dejandolo vacio la
                      encuesta no enseña barra de avance--. Decidido con el
                      cliente el 29/09/2026 (punto 70).

                      Numerico, ademas: `AnunciosScreen` hace `Number(...)` con
                      lo que se escriba, y un texto suelto llegaba a la base
                      como `NaN`.
                    */
                    <Input
                      label="Votos que se esperan reunir (opcional)"
                      type="numeric"
                      value={field.value}
                      onChangeText={(texto) =>
                        field.onChange(texto.replace(/[^0-9]/g, ""))
                      }
                      placeholder="Ej. 20"
                    />
                  )}
                />
              </View>
              {/*
                Aqui estaba «Tiempo máximo» (R-38). Se pedia, se validaba y se
                tiraba: `publicacion` no tiene columna para el y la pantalla no
                lo enviaba. Y ademas sobraba, porque el plazo de una encuesta ya
                se pone dos campos mas abajo en «Fecha de finalización», que si
                se guarda y si cierra la votacion.

                Quien administra lo rellenaba creyendo que limitaba algo.
              */}
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
        {/*
          Aqui habia dos botones --«Adjuntar Documento» y «Adjuntar Imagen»--
          sin `onPress` y sin nada detras: `publicacion` no tiene ninguna
          columna de adjuntos, ni el KT los menciona. Eran funciones sin
          construir pintadas como botones (R-10), y se retiran por decision del
          cliente el 25/09/2026. Si algun dia se adjuntan documentos a un
          anuncio, hara falta la columna primero.
        */}
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
          onValueChange={selectDate}
          onDismiss={() => setSelector(null)}
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
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.bgCard,
        }}
      >
        <Text className="text-base text-gray-700">
          {formatAnuncioDate(value)}
        </Text>
      </Pressable>
    </View>
  );
}
