import type { ZonaComunConfig } from "@/stores/zonas-store";

export type ZonaComunFormValues = {
  id: string;
  nombre: string;
  descripcion: string;
  horariosDisponibles: string;
  duracionMaximaMin: string;
  reglas: string;
  capacidadMaxima: string;
  requiereAprobacion: boolean;
  emoji: string;
};

export function zonaToForm(item?: ZonaComunConfig | null): ZonaComunFormValues {
  return item
    ? {
      id: item.id,
      nombre: item.nombre,
      descripcion: item.descripcion || "",
      horariosDisponibles: (item.horariosDisponibles || []).join(", "),
      duracionMaximaMin: String(item.duracionMaximaMin || 120),
      reglas: item.reglas || "",
      capacidadMaxima: String(item.capacidadMaxima || 10),
      requiereAprobacion: !!item.requiereAprobacion,
      emoji: item.emoji || "",
    }
  : {
      id: "",
      nombre: "",
      descripcion: "",
      horariosDisponibles: "",
      duracionMaximaMin: "120",
      reglas: "",
      capacidadMaxima: "10",
      requiereAprobacion: false,
      emoji: "",
    };
}
