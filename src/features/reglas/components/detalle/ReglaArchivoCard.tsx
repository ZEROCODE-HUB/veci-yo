import { theme } from "@/config";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/shared/components";
import { formatDate } from "@/shared/utils";
import {
  nombreVisibleDelReglamento,
  tipoDeDocumento,
} from "../../helpers/archivoDelReglamento";
import type { ClaseDeDocumento } from "../../helpers/archivoDelReglamento";

const LEE: Record<ClaseDeDocumento, string> = {
  pdf: "PDF",
  word: "documentos de Word",
  otro: "ese tipo de archivo",
};

/**
 * El reglamento cuando es un archivo subido (17/11/2026).
 *
 * El cliente subió un PDF y «no se muestra correctamente visualizado»: la
 * pantalla pintaba el texto por secciones, que con un archivo está vacío, y
 * quedaba la palabra «Reglamento» subrayada y un icono de descarga diminuto
 * arriba a la derecha. Ahora el archivo es lo principal: qué reglamento es,
 * cómo se llama el archivo, cuándo se subió y un botón claro para verlo.
 */
export function ReglaArchivoCard({
  titulo,
  ruta,
  nombre,
  subidoEn,
  abriendo,
  onVer,
  puedeReemplazar,
  onReemplazar,
}: {
  titulo: string;
  /** Ruta en el depósito: de ahí sale si es PDF o Word. */
  ruta: string;
  nombre: string | null;
  subidoEn: Date | null;
  abriendo: boolean;
  onVer: () => void;
  /** Solo la administración sube o cambia el reglamento. */
  puedeReemplazar: boolean;
  onReemplazar: () => void;
}) {
  const tipo = tipoDeDocumento(ruta);
  const icono = tipo.clase === "pdf" ? "document-text-outline" : "document-outline";

  return (
    <View
      className="rounded-2xl bg-white p-4 gap-4"
      style={{
        elevation: 3,
        shadowColor: theme.colors.shadow,
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      }}
    >
      <Text className="text-lg font-bold text-gray-900 text-center">
        Reglamento · {titulo}
      </Text>

      <View className="flex-row items-center gap-3">
        <View
          className="items-center justify-center rounded-xl"
          style={{ width: 48, height: 48, backgroundColor: theme.colors.primaryLight }}
        >
          <Ionicons name={icono} size={26} color={theme.colors.primary} />
        </View>
        <View className="flex-1" style={{ minWidth: 0 }}>
          <Text className="text-sm font-semibold text-gray-900" numberOfLines={2}>
            {nombreVisibleDelReglamento(ruta, nombre)}
          </Text>
          <Text className="text-xs text-gray-500">
            {subidoEn
              ? `${tipo.etiqueta} · subido el ${formatDate(subidoEn)}`
              : tipo.etiqueta}
          </Text>
        </View>
      </View>

      <Button fullWidth loading={abriendo} disabled={abriendo} onPress={onVer}>
        {abriendo ? "Abriendo…" : "Ver documento"}
      </Button>
      <Text className="text-xs text-gray-500 text-center">
        Se abre con la aplicación de tu celular que lee {LEE[tipo.clase]}.
      </Text>

      {puedeReemplazar ? (
        <Button variant="secondary" fullWidth onPress={onReemplazar}>
          Reemplazar archivo
        </Button>
      ) : null}
    </View>
  );
}
