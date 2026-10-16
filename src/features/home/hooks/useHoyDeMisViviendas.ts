import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores";
import { formatDateInput } from "@/shared/utils";
import { obtenerIngresosSalidas } from "../services/home.repo";

export type DiaDeAnfitrion = "Hoy" | "Mañana";
export type FiltroDeTipo = "todos" | "huespedes" | "visitas";

/**
 * Quién entra hoy y mañana en las viviendas de quien mira (16/10/2026).
 *
 * La responsable de producto: «la sección de Hoy es como la del guardia, pero
 * solo para sus propiedades; ve quién ingresa hoy y mañana, y se ve igual», y
 * «filtrar información». Es la misma consulta que la portería con el ámbito de
 * sus viviendas (regla 8): una administradora que también es propietaria no ve
 * aquí el edificio entero.
 */
export function useHoyDeMisViviendas() {
  const unidades = useAuthStore((s) => s.unidades);
  const propias = unidades.filter((u) => u.rol !== "huesped_temporal").map((u) => u.unidadId);
  const [dia, setDia] = useState<DiaDeAnfitrion>("Hoy");
  const [tipo, setTipo] = useState<FiltroDeTipo>("todos");
  const [busqueda, setBusqueda] = useState("");

  const fecha = useMemo(() => {
    const d = new Date();
    if (dia === "Mañana") d.setDate(d.getDate() + 1);
    return formatDateInput(d);
  }, [dia]);

  const { data = [], isLoading } = useQuery({
    queryKey: ["home", "ingresos-salidas", "mis-viviendas", fecha, propias.join(",")],
    queryFn: () => obtenerIngresosSalidas(fecha, propias),
    enabled: propias.length > 0,
  });

  const filas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return data.filter((f) => {
      const esHuesped = f.tipo === "Huésped temporal";
      if (tipo === "huespedes" && !esHuesped) return false;
      if (tipo === "visitas" && esHuesped) return false;
      if (!texto) return true;
      return f.nombre.toLowerCase().includes(texto) || f.depto.toLowerCase().includes(texto);
    });
  }, [data, tipo, busqueda]);

  return { dia, setDia, tipo, setTipo, busqueda, setBusqueda, filas, cargando: isLoading };
}
