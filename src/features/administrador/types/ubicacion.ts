export type UbicacionFormValues = {
  nombre: string;
  direccion: string;
  ciudad: string;
  pais: string;
  ruc: string;
  telefono: string;
  email: string;
};

export const defaultUbicacion: UbicacionFormValues = {
  nombre: "Condominio Las Barranqueras",
  direccion: "Av. Las Barranqueras 246",
  ciudad: "Lima",
  pais: "Peru",
  ruc: "20123456789",
  telefono: "+593 999999000",
  email: "admin@barranqueras.com",
};
