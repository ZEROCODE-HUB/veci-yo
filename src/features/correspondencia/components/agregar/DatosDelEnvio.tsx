import React, { useState } from "react";
import { Text } from "react-native";
import { Controller, type Control, type FieldErrors } from "react-hook-form";
import { Input, Select } from "@/shared/components";
import { useLista } from "@/shared/hooks/useLista";
import type { CorrespondenciaFormData } from "../../schemas";

interface Props {
  control: Control<CorrespondenciaFormData>;
  errors: FieldErrors<CorrespondenciaFormData>;
  categorias: string[];
}

/**
 * Categoría, empresa, destinatario, identificación e instrucciones.
 *
 * La identificación y las instrucciones eran solo de la administración, sin
 * nada escrito sobre el porqué. Desde el 27/10/2026 también las anota la
 * portería, que es quien recibe el paquete (hueco 38).
 *
 * La empresa se elige de la lista `empresas_de_mensajeria` (29/10/2026), que
 * el administrador de la app amplía en su panel. «Otro» abre el campo para
 * escribirla: lo que se guarda es el nombre, en texto libre, como siempre.
 */
export function DatosDelEnvio({ control, errors, categorias }: Props) {
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
            label="Categoría *"
            value={value || null}
            options={categorias}
            onChange={(v) => onChange(String(v))}
          />
        )}
      />
      {errors.categoria && (
        <Text className="text-xs text-danger -mt-2 font-medium">{errors.categoria.message}</Text>
      )}

      <EmpresaDeMensajeria control={control} campoLibre={texto("logistica", "Escribe la empresa")} />
      {texto("nombre", "Destinatario (opcional)")}

      {texto("ci", "Identificación (opcional)")}
      {texto("instrucciones", "Instrucciones adicionales", { multiline: true, showEditIcon: true })}
    </>
  );
}

/**
 * La empresa: un desplegable con las de la lista y, con «Otro» (o si lo
 * guardado no está en ella), el campo libre. Sin lista todavía, solo el campo.
 */
function EmpresaDeMensajeria({
  control,
  campoLibre,
}: {
  control: Control<CorrespondenciaFormData>;
  campoLibre: React.ReactNode;
}) {
  const { opciones } = useLista("empresas_de_mensajeria");
  const [escribiendo, setEscribiendo] = useState(false);
  const otro = opciones.find((o) => o.codigo === "otro");
  const conocidas = opciones.filter((o) => o !== otro).map((o) => o.etiqueta);

  if (opciones.length === 0) return <>{campoLibre}</>;

  return (
    <Controller
      control={control}
      name="logistica"
      render={({ field: { onChange, value } }) => {
        const libre = escribiendo || (Boolean(value) && !conocidas.includes(value ?? ""));
        return (
          <>
            <Select
              label="Logística (empresa)"
              value={libre ? (otro?.etiqueta ?? null) : value || null}
              options={opciones.map((o) => o.etiqueta)}
              placeholder="Elige la empresa"
              onChange={(v) => {
                const elegida = String(v);
                const esOtro = elegida === otro?.etiqueta;
                setEscribiendo(esOtro);
                onChange(esOtro ? "" : elegida);
              }}
            />
            {libre ? campoLibre : null}
          </>
        );
      }}
    />
  );
}
