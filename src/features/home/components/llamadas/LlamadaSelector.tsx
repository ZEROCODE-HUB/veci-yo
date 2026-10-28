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
  /** La administración elige antes si llama a una vivienda o a una portería. */
  esAdministracion?: boolean;
  porterias?: Opcion[];
}

/** Lo que elige la administración para llamar a una vivienda. */
const A_UNA_VIVIENDA = "vivienda";

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
  esAdministracion = false,
  porterias = [],
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

  // La administración llama a una vivienda o a una portería (T-199, 28/10/2026).
  const aUnaPorteria = esAdministracion && destino.startsWith("porteria:");

  return (
    <>
      {esAdministracion ? (
        <Select
          label="¿A quién quieres llamar?"
          value={destino || A_UNA_VIVIENDA}
          options={[{ value: A_UNA_VIVIENDA, label: "A una vivienda" }, ...porterias]}
          onChange={(valor) => onDestinoChange(String(valor))}
        />
      ) : null}
      {aUnaPorteria ? null : (
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
      )}
    </>
  );
}
