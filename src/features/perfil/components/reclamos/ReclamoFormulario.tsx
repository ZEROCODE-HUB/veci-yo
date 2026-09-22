import { View, Text, Pressable, Image } from "react-native";
import { Controller, type Control, type FieldErrors } from "react-hook-form";
import { Button, Input, Select } from "@/shared/components";
import {
  AREAS,
  DESTINATARIOS,
  MEDIOS_CONTACTO,
  TIPOS,
  TIPOS_POR_AREA,
} from "../../services";
import type { ReclamoFormularioValores } from "../../schemas/reclamo.schema";

const iconAdjuntarDocumento = require("@/assets/icons/shared/adjuntar-documento.png");
const iconAdjuntarImagen = require("@/assets/icons/shared/adjuntar-imagen.png");

const ADJUNTOS = [
  { key: "documento", label: "Adjuntar Documento", icon: iconAdjuntarDocumento },
  { key: "imagen", label: "Adjuntar Imagen", icon: iconAdjuntarImagen },
];

const ETIQUETAS_AREA = Object.values(AREAS);
const ETIQUETAS_DESTINATARIO = Object.values(DESTINATARIOS);
const ETIQUETAS_MEDIO = Object.values(MEDIOS_CONTACTO);

interface Props {
  control: Control<ReclamoFormularioValores>;
  errors: FieldErrors<ReclamoFormularioValores>;
  area: string;
  onAreaChange: (value: string) => void;
  onSubmit: () => void;
  enviando: boolean;
}

export function ReclamoFormulario({
  control,
  errors,
  area,
  onAreaChange,
  onSubmit,
  enviando,
}: Props) {
  // Cada área ofrece sus propios tipos; "Constructora TyC" y "Documentos
  // antiguos" no piden ninguno.
  const claveArea = Object.entries(AREAS).find(([, etiqueta]) => etiqueta === area)?.[0];
  const tiposDisponibles = claveArea
    ? TIPOS_POR_AREA[claveArea as keyof typeof TIPOS_POR_AREA].map((t) => TIPOS[t])
    : [];
  const esAppVeciYo = area === AREAS.aplicacion;

  return (
    <>
      <Controller
        control={control}
        name="titulo"
        render={({ field }) => (
          <Input
            label="Titulo*"
            value={field.value}
            onChangeText={field.onChange}
            placeholder="Describe brevemente el motivo"
            error={errors.titulo?.message}
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
            placeholder="Describe el problema con el mayor detalle posible"
            multiline
            error={errors.descripcion?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="area"
        render={({ field }) => (
          <Select
            label="Categoría*"
            value={field.value}
            options={ETIQUETAS_AREA}
            onChange={(value) => {
              const next = String(value) || "";
              field.onChange(next);
              onAreaChange(next);
            }}
            placeholder="Seleccione una categoría"
          />
        )}
      />
      {errors.area?.message && (
        <Text className="text-xs text-red-500 font-medium -mt-2">
          {errors.area.message}
        </Text>
      )}

      {tiposDisponibles.length > 0 && (
        <>
          <Controller
            control={control}
            name="tipo"
            render={({ field }) => (
              <Select
                label="Subcategoría*"
                value={field.value}
                options={tiposDisponibles}
                onChange={(value) => field.onChange(String(value) || "")}
                placeholder="Seleccione una subcategoría"
              />
            )}
          />
          {errors.tipo?.message && (
            <Text className="text-xs text-red-500 font-medium -mt-2">
              {errors.tipo.message}
            </Text>
          )}
        </>
      )}

      {esAppVeciYo && (
        <Controller
          control={control}
          name="modelo"
          render={({ field }) => (
            <Input
              label="Modelo del dispositivo*"
              value={field.value}
              onChangeText={field.onChange}
              placeholder="Ej. iPhone 15 Pro, Samsung Galaxy S24, Pixel 9"
              error={errors.modelo?.message}
            />
          )}
        />
      )}

      <Controller
        control={control}
        name="destinatario"
        render={({ field }) => (
          <Select
            label="Destinatario"
            value={field.value}
            options={ETIQUETAS_DESTINATARIO}
            onChange={(value) => field.onChange(String(value))}
            placeholder="Seleccione un destinatario"
          />
        )}
      />

      <Controller
        control={control}
        name="correo"
        render={({ field }) => (
          <Input
            label="Correo electrónico"
            value={field.value}
            onChangeText={field.onChange}
            placeholder="correo@ejemplo.com"
            type="email"
          />
        )}
      />

      <Controller
        control={control}
        name="telefono"
        render={({ field }) => (
          <Input
            label="Teléfono"
            value={field.value}
            onChangeText={field.onChange}
            placeholder="+57 300 1234567"
            type="numeric"
          />
        )}
      />

      <Controller
        control={control}
        name="medioContacto"
        render={({ field }) => (
          <Select
            label="Medio de contacto preferido"
            value={field.value}
            options={ETIQUETAS_MEDIO}
            onChange={(value) => field.onChange(String(value))}
            placeholder="Seleccione un medio"
          />
        )}
      />

      {/* Los adjuntos todavía no tienen dónde guardarse: falta el bucket y su
          política. Se dejan visibles pero inertes, como estaban, hasta que el
          almacenamiento exista. */}
      <View className="flex-row gap-6 justify-center mt-1 opacity-40">
        {ADJUNTOS.map((adjunto) => (
          <View key={adjunto.key} className="items-center gap-2">
            <Image
              source={adjunto.icon}
              style={{ width: 64, height: 64, borderRadius: 12 }}
              resizeMode="cover"
            />
            <Text className="text-sm text-gray-900 text-center">
              {adjunto.label}
            </Text>
          </View>
        ))}
      </View>

      <Button variant="primary" fullWidth onPress={onSubmit} disabled={enviando}>
        {enviando ? "Enviando..." : "Enviar"}
      </Button>
    </>
  );
}
