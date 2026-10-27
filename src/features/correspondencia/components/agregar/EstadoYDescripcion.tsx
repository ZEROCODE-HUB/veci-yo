import React from "react";
import { Text } from "react-native";
import { Controller, type Control, type FieldErrors } from "react-hook-form";
import { Input, Select } from "@/shared/components";
import type { CorrespondenciaFormData } from "../../schemas";
import { ESTADOS_ENCOMIENDA } from "../../constants";

/** El estado en que llega la encomienda y su descripción: en el alta y en un informe. */
export function EstadoYDescripcion({
  control,
  errors,
}: {
  control: Control<CorrespondenciaFormData>;
  errors: FieldErrors<CorrespondenciaFormData>;
}) {
  return (
    <>
      <Controller
        control={control}
        name="estadoEncomienda"
        render={({ field: { onChange, value } }) => (
          <Select
            label="Estado de encomienda:"
            value={value || null}
            options={[...ESTADOS_ENCOMIENDA]}
            onChange={(v) => onChange(String(v))}
          />
        )}
      />
      {errors.estadoEncomienda && (
        <Text className="text-xs text-danger -mt-2 font-medium">{errors.estadoEncomienda.message}</Text>
      )}

      <Controller
        control={control}
        name="descripcion"
        render={({ field: { onChange, onBlur, value }, fieldState }) => (
          <Input
            value={value || ""}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder="Descripción de la encomienda"
            multiline
            showEditIcon
            error={fieldState.error?.message}
          />
        )}
      />
    </>
  );
}
