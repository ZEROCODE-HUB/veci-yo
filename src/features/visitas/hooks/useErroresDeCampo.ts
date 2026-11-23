import { useState } from "react";

/**
 * Los errores que se pintan debajo de cada campo del alta de una visita
 * (cliente, 23/11/2026): el aviso de arriba se iba y no quedaba dicho qué
 * campo faltaba.
 *
 * Recibe los valores de los campos. Cada error se guarda con el valor que
 * tenía el campo al marcarlo, y deja de verse en cuanto ese valor cambia, sin
 * tocar los de los demás.
 */
export function useErroresDeCampo<C extends string>(valores: Record<C, string>) {
  const [marcados, setMarcados] = useState<
    Partial<Record<C, { mensaje: string; valor: string }>>
  >({});

  const errores: Partial<Record<C, string>> = {};
  for (const campo of Object.keys(marcados) as C[]) {
    const marca = marcados[campo];
    if (marca && marca.valor === valores[campo]) errores[campo] = marca.mensaje;
  }

  return {
    errores,
    marcarError: (campo: C, mensaje: string) =>
      setMarcados((actuales) => ({ ...actuales, [campo]: { mensaje, valor: valores[campo] } })),
    limpiarErrores: () => setMarcados({}),
  };
}
