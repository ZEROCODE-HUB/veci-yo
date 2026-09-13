import React from "react";
import { Select } from "@/shared/components";

interface LlamadaSelectorProps {
  torre: string;
  depto: string;
  persona: string;
  opcionesTorre: string[];
  opcionesDepartamento: string[];
  opcionesPersona: string[];
  esPersonal: boolean;
  onTorreChange: (value: string) => void;
  onDeptoChange: (value: string) => void;
  onPersonaChange: (value: string) => void;
}

export function LlamadaSelector({
  torre,
  depto,
  persona,
  opcionesTorre,
  opcionesDepartamento,
  opcionesPersona,
  esPersonal,
  onTorreChange,
  onDeptoChange,
  onPersonaChange,
}: LlamadaSelectorProps) {
  return (
    <>
      <Select
        label="Torre"
        value={torre}
        options={opcionesTorre}
        onChange={(value) => onTorreChange(String(value))}
      />
      {!esPersonal && (
        <Select
          label="Departamento"
          value={depto}
          options={opcionesDepartamento}
          onChange={(value) => onDeptoChange(String(value))}
        />
      )}
      <Select
        label="Persona"
        value={persona}
        options={opcionesPersona}
        onChange={(value) => onPersonaChange(String(value))}
      />
    </>
  );
}
