export type UbicacionFormValues = {
  nombre: string;
  direccion: string;
  ciudad: string;
  /**
   * Donde esta el edificio, en ISO 3166-1 alfa-2 --`CO`--.
   *
   * Era el **nombre** del pais hasta el 05/10/2026, y al guardar se recortaba
   * a dos letras: «Estados Unidos» acababa como `ES`. Ahora viaja el codigo de
   * principio a fin, que es lo que la base guarda.
   */
  pais: string;
  ruc: string;
  telefono: string;
  /**
   * El pais del telefono, en ISO 3166-1 alfa-2.
   *
   * Separado de `pais`, que es donde esta el edificio: el telefono de contacto
   * puede ser de otro sitio --una administradora que atiende desde Lima un
   * edificio en Bogota-- y el prefijo que hay que marcar es el del numero, no
   * el del portal.
   */
  codigoPais: string;
  email: string;
};

export const defaultUbicacion: UbicacionFormValues = {
  nombre: "Condominio Las Barranqueras",
  direccion: "Av. Las Barranqueras 246",
  ciudad: "Lima",
  pais: "PE",
  ruc: "20123456789",
  telefono: "999999000",
  codigoPais: "PE",
  email: "admin@barranqueras.com",
};
