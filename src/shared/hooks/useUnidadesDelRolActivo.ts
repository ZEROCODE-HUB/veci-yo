import { useMemo } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { unidadesDelRolActivo } from "./unidadesDelRolActivo";

/**
 * Las viviendas del rol activo, leidas de la sesion.
 *
 * La regla vive en `unidadesDelRolActivo.ts`, en su propio archivo y sin
 * importar nada de la plataforma: este modulo arrastra el store, y el store
 * arrastra React Native, que las pruebas unitarias no saben leer --«Flow is not
 * supported»--. Una regla que nadie puede probar sin montar la aplicacion es
 * una regla que no se prueba. Es lo mismo que ya paso con `suscripcionVigente`.
 */
export function useUnidadesDelRolActivo(): string[] {
  const rolActivo = useAuthStore((s) => s.rolActivo);
  const unidades = useAuthStore((s) => s.unidades);

  return useMemo(
    () => unidadesDelRolActivo(rolActivo, unidades),
    [rolActivo, unidades],
  );
}
