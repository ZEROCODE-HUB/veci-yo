import React, { useState } from "react";
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
    extra: { multiline?: boolean; showEditIcon?: boolean; label?: string } = {},
  ) => (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value }, fieldState }) => (
        <Input
          label={extra.label}
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
            error={errors.categoria?.message}
          />
        )}
      />

      <EmpresaDeMensajeria control={control} campoLibre={texto("logistica", "Escribe la empresa")} />
      {texto("nombre", "Nombre de quien lo recibe", { label: "Destinatario (opcional)" })}

      {texto("ci", "Número de documento", {
        label: "Identificación del destinatario (opcional)",
      })}
      {texto("instrucciones", "Ej.: frágil, entregar en mano", {
        label: "Instrucciones adicionales (opcional)",
        multiline: true,
        showEditIcon: true,
      })}
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
              label="Logística (opcional)"
              explicacion="La empresa que trae el envío. Si no está en la lista, elige «Otro» y escríbela."
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
