import amigosFamiliares from '@/assets/icons/visitas/finales/amigos_familiares.png';
import type { ImageSourcePropType } from "react-native";
import type { VisitaItem } from "@/shared/types";
import temporal from '@/assets/icons/visitas/finales/temporal.png';
import permanente from '@/assets/icons/visitas/finales/permanente.png';
import huespedTemporal from '@/assets/icons/visitas/finales/huesped_temporal.png';

export const TIPO_VISITA_ASSETS: Record<
  VisitaItem["tipo"],
  ImageSourcePropType
> = {
  amigos: amigosFamiliares,
  temporal,
  permanente,
  'huesped-temporal': huespedTemporal,
};
