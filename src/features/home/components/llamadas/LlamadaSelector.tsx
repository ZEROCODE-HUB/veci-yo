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
  /** Lo que elige un vecino: las porterías y la administración. */
  destinos: Opcion[];
  destino: string;
  onDestinoChange: (clave: string) => void;
  /**
   * Lo que elige el personal: «A una vivienda» y, la portería, la
   * administración; la administración, sus porterías.
   */
  opcionesDelPersonal?: Opcion[];
  /** El personal eligió llamar a una vivienda: se piden torre y vivienda. */
  aUnaVivienda?: boolean;
}

/**
 * A quién se llama.
 *
 * Tenía las etiquetas cambiadas (13/10/2026): al vecino, «Torre» le ofrecía
 * «Seguridad / Administrador», y «Persona» repetía la lista de departamentos
 * y nunca enseñaba lo elegido. Ahora el vecino elige **a quién llamar**, y el
 * personal elige primero a quién --una vivienda u otro destino (28/10/2026)--
 * y, si es una vivienda, **torre y vivienda**.
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
  opcionesDelPersonal = [],
  aUnaVivienda = true,
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
      {opcionesDelPersonal.length > 1 ? (
        <Select
          label="¿A quién quieres llamar?"
          value={destino || null}
          options={opcionesDelPersonal}
          onChange={(valor) => onDestinoChange(String(valor))}
        />
      ) : null}
      {aUnaVivienda ? (
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
      ) : null}
    </>
  );
}
