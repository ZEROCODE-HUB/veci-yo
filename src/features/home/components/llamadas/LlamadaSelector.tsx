import React from "react";
import { SegunLaCarga, Select, type EstadoDeLaCarga } from "@/shared/components";

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
  /**
   * Cómo va la lista de destinos. Mientras cargaba, al vecino se le decía
   * «El edificio no tiene a quién llamar todavía» (13/11/2026).
   */
  cargaDestinos?: EstadoDeLaCarga;
  /**
   * A quién de la vivienda elegida (17/11/2026): «Todos» y cada persona que
   * recibe llamadas por la app. Vacía: no se pregunta.
   */
  opcionesDeLaVivienda?: Opcion[];
  aQuienDeLaVivienda?: string;
  onAQuienDeLaViviendaChange?: (usuarioId: string) => void;
}

/**
 * A quién se llama.
 *
 * Tenía las etiquetas cambiadas (13/10/2026): al vecino, «Torre» le ofrecía
 * «Seguridad / Administrador», y «Persona» repetía la lista de departamentos
 * y nunca enseñaba lo elegido. Ahora el vecino elige **a quién llamar**, y el
 * personal elige primero a quién --una vivienda u otro destino (28/10/2026)--
 * y, si es una vivienda, **torre y vivienda**.
 *
 * 17/11/2026, pedido del cliente: después de la vivienda, **a quién de ella**:
 * una persona que reciba llamadas por la app, o «Todos» (suena en todos y
 * contesta el primero).
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
  cargaDestinos = { cargando: false },
  opcionesDeLaVivienda = [],
  aQuienDeLaVivienda = "",
  onAQuienDeLaViviendaChange,
}: LlamadaSelectorProps) {
  if (!esPersonal) {
    return (
      <SegunLaCarga estado={cargaDestinos} texto="a quién llamar" forma="formulario" cuantos={1} enLinea>
        <Select
          label="¿A quién quieres llamar? *"
          value={destino || null}
          options={destinos}
          onChange={(valor) => onDestinoChange(String(valor))}
          placeholder="Elige portería o administración"
          textoSinOpciones="El edificio no tiene a quién llamar todavía"
        />
      </SegunLaCarga>
    );
  }

  return (
    <>
      {opcionesDelPersonal.length > 1 ? (
        <Select
          label="¿A quién quieres llamar? *"
          value={destino || null}
          options={opcionesDelPersonal}
          onChange={(valor) => onDestinoChange(String(valor))}
        />
      ) : null}
      {aUnaVivienda ? (
        <>
          <Select
            label="Torre (opcional)"
            explicacion="Solo acorta la lista de viviendas de abajo."
            value={torre || null}
            options={[{ value: "", label: "Todas" }, ...torres.map((t) => ({ value: t, label: t }))]}
            onChange={(valor) => onTorreChange(String(valor))}
            placeholder="Todas"
          />
          <Select
            label="Vivienda *"
            value={unidadId || null}
            options={viviendas}
            onChange={(valor) => onViviendaChange(String(valor))}
            placeholder="Elige la vivienda"
          />
          {unidadId && opcionesDeLaVivienda.length > 0 && onAQuienDeLaViviendaChange ? (
            <Select
              label="¿A quién de la vivienda? *"
              explicacion="Una persona de la vivienda que recibe llamadas por la app, o «Todos»: suena en todos y contesta el primero."
              value={aQuienDeLaVivienda}
              options={opcionesDeLaVivienda}
              onChange={(valor) => onAQuienDeLaViviendaChange(String(valor))}
            />
          ) : null}
        </>
      ) : null}
    </>
  );
}
