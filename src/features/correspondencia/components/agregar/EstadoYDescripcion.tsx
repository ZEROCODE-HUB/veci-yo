import React from "react";
import { Controller, type Control, type FieldErrors } from "react-hook-form";
import { Input, Select } from "@/shared/components";
import type { CorrespondenciaFormData } from "../../schemas";
import { ESTADOS_ENCOMIENDA } from "../../constants";

/**
 * El estado en que llega la encomienda y su descripción: en el alta y en un
 * informe. En el alta el estado es obligatorio y la descripción no; en un
 * informe, al revés: lo que hace falta es contar qué pasó.
 */
export function EstadoYDescripcion({
  control,
  errors,
  informando = false,
}: {
  control: Control<CorrespondenciaFormData>;
  errors: FieldErrors<CorrespondenciaFormData>;
  informando?: boolean;
}) {
  return (
    <>
      <Controller
        control={control}
        name="estadoEncomienda"
        render={({ field: { onChange, value } }) => (
          <Select
            label={informando ? "Estado de encomienda (opcional)" : "Estado de encomienda *"}
            value={value || null}
            options={[...ESTADOS_ENCOMIENDA]}
            onChange={(v) => onChange(String(v))}
            error={errors.estadoEncomienda?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="descripcion"
        render={({ field: { onChange, onBlur, value }, fieldState }) => (
          <Input
            label={informando ? "Qué pasó con el envío *" : "Descripción (opcional)"}
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
