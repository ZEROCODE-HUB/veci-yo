import React from "react";
import { Text } from "react-native";
import { Controller, type Control, type FieldErrors } from "react-hook-form";
import { Input, Select } from "@/shared/components";
import type { CorrespondenciaFormData } from "../../schemas";

interface Props {
  control: Control<CorrespondenciaFormData>;
  errors: FieldErrors<CorrespondenciaFormData>;
  categorias: string[];
  /** La portería no anota identificación ni instrucciones. */
  esGuardia: boolean;
}

/** Categoría, empresa, destinatario y, para la administración, identificación e instrucciones. */
export function DatosDelEnvio({ control, errors, categorias, esGuardia }: Props) {
  const texto = (
    name: "logistica" | "nombre" | "ci" | "instrucciones",
    placeholder: string,
    extra: { multiline?: boolean; showEditIcon?: boolean } = {},
  ) => (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value }, fieldState }) => (
        <Input
          value={value || ""}
          onChangeText={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          showEditIcon={extra.showEditIcon ?? false}
          multiline={extra.multiline}
          error={fieldState.error?.message}
        />
      )}
    />
  );

  return (
    <>
      <Controller
        control={control}
        name="categoria"
        render={({ field: { onChange, value } }) => (
          <Select
            label="Categoría"
            value={value || null}
            options={categorias}
            onChange={(v) => onChange(String(v))}
          />
        )}
      />
      {errors.categoria && (
        <Text className="text-xs text-danger -mt-2 font-medium">{errors.categoria.message}</Text>
      )}

      {texto("logistica", "Logística (empresa)")}
      {texto("nombre", "Destinatario (opcional)")}

      {!esGuardia && (
        <>
          {texto("ci", "Identificación (opcional)")}
          {texto("instrucciones", "Instrucciones adicionales", { multiline: true, showEditIcon: true })}
        </>
      )}
    </>
  );
}
