import { Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { SegunLaCarga, estadoDe } from "@/shared/components";
import { textoDeDias } from "@/features/visitas/helpers/diasDeTrabajo";
import { numeroParaMarcar } from "../helpers/contactos";
import { obtenerPersonalPermanente } from "../services/directorio.repo";

/**
 * «Personal permanente» en la ficha de una vivienda (16/11/2026, cliente:
 * «profesional permanente debe igual mostrarse en el directorio de
 * Viviendas, o sea sus datos»): quien trabaja ahí de forma fija --la
 * empleada, el jardinero-- con su oficio, sus días, su documento y su
 * teléfono. Sale de las visitas permanentes vigentes de esa vivienda.
 *
 * Va en el directorio y en «Ver detalle» de Arquitectura; cada uno le pone
 * su marco.
 */
export function PersonalPermanenteDeLaVivienda({ unidadId }: { unidadId: string }) {
  const personal = useQuery({
    queryKey: ["directorio", "personal-permanente", unidadId],
    queryFn: () => obtenerPersonalPermanente(unidadId),
    enabled: Boolean(unidadId),
  });

  return (
    <SegunLaCarga estado={estadoDe(personal)} texto="el personal permanente" enLinea>
      {(personal.data ?? []).length === 0 ? (
        <Text className="text-sm text-gray-500">No tiene personal permanente registrado.</Text>
      ) : (
        <View className="gap-2">
          {(personal.data ?? []).map((p) => (
            <View key={p.visitaId} className="gap-0.5">
              <Text className="text-sm font-semibold text-gray-900">{p.nombre}</Text>
              <Text className="text-xs text-gray-500">
                {`${p.profesion ?? "Oficio sin indicar"} · ${textoDeDias(p.diasTrabajo)}`}
              </Text>
              <Text className="text-xs text-gray-500">{p.documento ?? "Sin documento"}</Text>
              <Text className="text-xs text-gray-500">
                {p.telefono ? numeroParaMarcar(p.codigoPais, p.telefono) : "Sin teléfono"}
              </Text>
            </View>
          ))}
        </View>
      )}
    </SegunLaCarga>
  );
}
