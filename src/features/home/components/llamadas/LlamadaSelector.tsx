import React from "react";
import { Select } from "@/shared/components";

interface Opcion {
  value: string;
  label: string;
}

interface LlamadaSelectorProps {
  esPersonal: boolean;
  torres: string[];
  torre: string;
  onTorreChange: (torre: string) => void;
  viviendas: Opcion[];
  unidadId: string;
  onViviendaChange: (unidadId: string) => void;
  destinos: Opcion[];
  destino: string;
  onDestinoChange: (clave: string) => void;
}

/**
 * A quién se llama.
 *
 * Tenía las etiquetas cambiadas (13/10/2026): al vecino, «Torre» le ofrecía
 * «Seguridad / Administrador», y «Persona» repetía la lista de departamentos
 * y nunca enseñaba lo elegido. Ahora el vecino elige **a quién llamar** y el
 * personal elige **torre y vivienda**.
 */
export function LlamadaSelector({
  esPersonal,
  torres,
  torre,
  onTorreChange,
  viviendas,
  unidadId,
  onViviendaChange,
  destinos,
  destino,
  onDestinoChange,
}: LlamadaSelectorProps) {
  if (!esPersonal) {
    return (
      <Select
        label="¿A quién quieres llamar?"
        value={destino || null}
        options={destinos}
        onChange={(valor) => onDestinoChange(String(valor))}
        placeholder="Elige portería o administración"
        textoSinOpciones="El edificio no tiene a quién llamar todavía"
      />
    );
  }

  return (
    <>
      <Select
        label="Torre"
        value={torre || null}
        options={[{ value: "", label: "Todas" }, ...torres.map((t) => ({ value: t, label: t }))]}
        onChange={(valor) => onTorreChange(String(valor))}
        placeholder="Todas"
      />
      <Select
        label="Vivienda"
        value={unidadId || null}
        options={viviendas}
        onChange={(valor) => onViviendaChange(String(valor))}
        placeholder="Elige la vivienda"
      />
    </>
  );
}
