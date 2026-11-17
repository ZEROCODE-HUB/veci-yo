import { useRef, useState } from "react";
import { Pressable, ScrollView, Text, View, type TextInput } from "react-native";
import { Controller } from "react-hook-form";
import {
  Button,
  CampoTelefono,
  Cargando,
  Checkbox,
  EtiquetaDelCampo,
  Input,
  Modal,
  Select,
} from "@/shared/components";
import { ScreenLayout } from "@/shared/layouts";
import { useAuthStore } from "@/stores/auth-store";
import { LegalAccordion } from "../components";
import { useCompletarDatos } from "../hooks/useCompletarDatos";
import { useDocumentosLegales } from "../hooks/useDocumentosLegales";

const BORDES: ("top" | "left" | "right")[] = ["top", "left", "right"];

/**
 * Lo primero que ve quien entra con Google sin haber dado su teléfono y su
 * documento (16/11/2026). Es el formulario de registro sin correo ni
 * contraseña; hasta completarlo no entra a la app, igual que quien se
 * registra con correo no entra sin darlos.
 */
export function CompletarDatosScreen() {
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    correo,
    listo,
    tiposDocumento,
    terminosAceptados,
    terminosError,
    setTerminosAceptados,
    setTerminosError,
    onSubmit,
    guardando,
  } = useCompletarDatos();
  const cerrarSesion = useAuthStore((s) => s.cerrarSesion);
  const [verTerminos, setVerTerminos] = useState(false);
  const legales = useDocumentosLegales();
  const apellidoRef = useRef<TextInput>(null);
  const telefonoRef = useRef<TextInput>(null);
  const identificacionRef = useRef<TextInput>(null);

  return (
    <ScreenLayout edges={BORDES}>
      <ScrollView contentContainerClassName="p-4 gap-4" keyboardShouldPersistTaps="handled">
        <View className="gap-1 pt-4">
          <Text className="text-2xl font-bold text-gray-900">Completa tus datos</Text>
          <Text className="text-base text-gray-500">
            {`Entraste con Google (${correo}). Antes de seguir, necesitamos los mismos datos que pide el registro.`}
          </Text>
        </View>

        {listo ? (
          <View className="gap-3.5">
            <Controller
              control={control}
              name="nombre"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Nombre/s *"
                  soloLetras
                  value={value}
                  onChangeText={onChange}
                  placeholder="Ej: María José"
                  error={errors.nombre?.message}
                  returnKeyType="next"
                  onSubmitEditing={() => apellidoRef.current?.focus()}
                  showEditIcon={false}
                />
              )}
            />
            <Controller
              control={control}
              name="apellido"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Apellido/s *"
                  soloLetras
                  value={value}
                  onChangeText={onChange}
                  placeholder="Ej: Rodríguez Paz"
                  error={errors.apellido?.message}
                  ref={apellidoRef}
                  returnKeyType="next"
                  onSubmitEditing={() => telefonoRef.current?.focus()}
                  showEditIcon={false}
                />
              )}
            />
            <CampoTelefono
              label="Número de teléfono *"
              codigoPais={watch("codigoPais")}
              onCodigoPaisChange={(codigo) => setValue("codigoPais", codigo, { shouldValidate: true })}
              telefono={watch("telefono")}
              onTelefonoChange={(numero) => setValue("telefono", numero, { shouldValidate: true })}
              placeholder="300 123 4567"
              error={errors.telefono?.message ?? errors.codigoPais?.message}
              ref={telefonoRef}
              returnKeyType="next"
              onSubmitEditing={() => identificacionRef.current?.focus()}
            />
            <View className="flex-row gap-2.5 items-start">
              <View className="flex-1">
                <EtiquetaDelCampo label="Tipo *" />
                <Controller
                  control={control}
                  name="tipoDocumento"
                  render={({ field: { onChange, value } }) => (
                    <Select
                      value={value}
                      options={tiposDocumento}
                      onChange={onChange}
                      placeholder="Seleccionar"
                    />
                  )}
                />
                {errors.tipoDocumento ? (
                  <Text className="text-xs text-danger mt-1.5 font-medium">
                    {errors.tipoDocumento.message}
                  </Text>
                ) : null}
              </View>
              <View className="flex-[1.4]">
                <Controller
                  control={control}
                  name="identificacion"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      label="Identificación *"
                      value={value}
                      onChangeText={onChange}
                      placeholder="N° de documento"
                      error={errors.identificacion?.message}
                      ref={identificacionRef}
                      returnKeyType="done"
                      showEditIcon={false}
                    />
                  )}
                />
              </View>
            </View>

            <View className="py-2">
              <View className="flex-row">
                <Checkbox
                  checked={terminosAceptados}
                  onChange={(valor) => {
                    setTerminosAceptados(valor);
                    setTerminosError(false);
                  }}
                  label="Acepto los "
                  error={terminosError}
                />
                <Pressable onPress={() => setVerTerminos(true)}>
                  <Text className="text-sm text-secondary underline">términos y condiciones</Text>
                </Pressable>
              </View>
              {terminosError ? (
                <Text className="text-xs text-danger mt-1.5 font-medium">
                  Tienes que aceptar los términos para continuar
                </Text>
              ) : null}
            </View>

            <Button onPress={handleSubmit(onSubmit)} disabled={!terminosAceptados} loading={guardando}>
              Guardar y entrar
            </Button>
            <Button variant="ghost" disabled={guardando} onPress={cerrarSesion}>
              Salir
            </Button>
          </View>
        ) : (
          <Cargando variante="enLinea" forma="formulario" texto="el formulario" />
        )}
      </ScrollView>

      <Modal visible={verTerminos} onClose={() => setVerTerminos(false)} title="Documentos legales">
        <LegalAccordion docs={legales.documentos} cargando={legales.cargando} />
      </Modal>
    </ScreenLayout>
  );
}
