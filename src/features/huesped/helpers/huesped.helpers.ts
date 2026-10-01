import type { LibroHuesped } from "../types";

export function tieneInformacionLibroHuesped(libro: LibroHuesped | null) {
  return Boolean(
    libro?.wifiName ||
      libro?.wifiPassword ||
      libro?.doorPassword ||
      libro?.instructions ||
      libro?.notes,
  );
}

