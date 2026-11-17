import { useCallback, useEffect, useMemo, useState } from "react";
import {
  alternarTodas as alternarTodasLas,
  alternarUna,
  marcadasALaVista,
} from "../helpers/filtrosDelDirectorio";
import type { Unidad } from "../types/directorio";

const idDe = (unidad: Unidad) => unidad.uuid ?? String(unidad.id);

/**
 * La selección de viviendas para un mensaje (16/11/2026, solo la
 * administración).
 *
 * Lo marcado que deja de verse con los filtros **se desmarca**, igual que en
 * el envío masivo de correspondencia (`destinos.ts`): si no, al quitar el
 * filtro volvería a salir marcada una vivienda que la persona ya no veía al
 * elegir, y el mensaje le llegaría sin que nadie lo decidiera a la vista.
 */
export function useSeleccionDeViviendas(visibles: Unidad[], condominioId: string) {
  const [activa, setActiva] = useState(false);
  const [marcadas, setMarcadas] = useState<string[]>([]);

  useEffect(() => {
    setMarcadas((antes) => {
      const aLaVista = marcadasALaVista(antes, visibles, condominioId);
      return aLaVista.length === antes.length ? antes : aLaVista;
    });
  }, [visibles, condominioId]);

  const elegidas = useMemo(
    () => visibles.filter((u) => marcadas.includes(idDe(u))),
    [visibles, marcadas],
  );

  const alternar = useCallback(
    (unidad: Unidad) => setMarcadas((antes) => alternarUna(antes, idDe(unidad))),
    [],
  );
  const alternarTodas = useCallback(
    () => setMarcadas((antes) => alternarTodasLas(antes, visibles)),
    [visibles],
  );
  const terminar = useCallback(() => {
    setActiva(false);
    setMarcadas([]);
  }, []);

  return {
    activa,
    empezar: () => setActiva(true),
    terminar,
    elegidas,
    estaMarcada: (unidad: Unidad) => marcadas.includes(idDe(unidad)),
    alternar,
    alternarTodas,
    todas: visibles.length > 0 && elegidas.length === visibles.length,
  };
}

export type SeleccionDeViviendas = ReturnType<typeof useSeleccionDeViviendas>;
