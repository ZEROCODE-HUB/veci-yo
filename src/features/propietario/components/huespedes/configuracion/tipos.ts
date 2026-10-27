import type { useParametrosDeLaBase } from "@/shared/hooks";
import type { useHuespedesTemporales } from "../../../hooks/useHuespedesTemporales";

/** Lo que devuelve `useHuespedesTemporales`: el estado de la configuración de renta corta. */
export type RentaCorta = ReturnType<typeof useHuespedesTemporales>;

/** Los parámetros de la plataforma, ya cargados. */
export type Parametros = ReturnType<typeof useParametrosDeLaBase>;
