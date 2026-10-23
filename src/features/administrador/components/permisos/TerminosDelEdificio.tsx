import { useState } from "react";
import { Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Input, Modal } from "@/shared/components";
import { useUIStore } from "@/stores";
import { mensajeDeError } from "@/shared/utils";
import {
  obtenerTerminosDelEdificio,
  publicarTerminosDelEdificio,
} from "../../services/condominio.repo";

/**
 * Los términos y condiciones del edificio, que acepta el huésped de renta
 * corta en su preregistro (16/10/2026).
 *
 * No había dónde escribirlos: el edificio sembrado tenía unos de ejemplo y uno
 * nuevo ninguno. Guardar publica una versión nueva --la anterior queda como
 * constancia de lo que aceptó cada huésped--, y por eso se dice la versión.
 */
export function TerminosDelEdificio({ condominioId }: { condominioId: string }) {
  const cliente = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  const [abierto, setAbierto] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [contenido, setContenido] = useState("");
  const [error, setError] = useState("");

  const vigentes = useQuery({
    queryKey: ["condominio", "terminos", condominioId],
    queryFn: () => obtenerTerminosDelEdificio(condominioId),
    enabled: Boolean(condominioId),
    // Publicados desde otro dispositivo no se veían hasta recargar (QA 23/10/2026).
    refetchInterval: 30_000,
  });

  const publicar = useMutation({
    mutationFn: () => publicarTerminosDelEdificio(condominioId, titulo, contenido),
    onSuccess: (version) => {
      addToast(`Términos publicados (versión ${version})`, "success");
      setAbierto(false);
      void cliente.invalidateQueries({ queryKey: ["condominio", "terminos"] });
    },
    onError: (fallo) =>
      addToast(mensajeDeError(fallo, "No se pudieron publicar"), "error"),
  });

  const abrir = () => {
    setTitulo(vigentes.data?.titulo ?? "Términos y condiciones del edificio");
    setContenido(vigentes.data?.contenido ?? "");
    setError("");
    setAbierto(true);
  };

  return (
    <View className="gap-3">
      <Text className="text-sm leading-5 text-gray-700">
        {vigentes.data
          ? `«${vigentes.data.titulo}», versión ${vigentes.data.version}.`
          : "Todavía no hay términos publicados."}
      </Text>
      <Text className="text-xs leading-5 text-gray-500">
        Los acepta cada huésped de renta corta al preregistrarse.
      </Text>
      <Button
        variant="secondary"
        fullWidth
        disabled={vigentes.isLoading || vigentes.isError}
        onPress={abrir}
      >
        {vigentes.data ? "Editar términos" : "Escribir términos"}
      </Button>

      <Modal
        visible={abierto}
        onClose={() => setAbierto(false)}
        title="Términos del edificio"
      >
        <View className="gap-3">
          <Input
            label="Título"
            value={titulo}
            onChangeText={setTitulo}
            showEditIcon={false}
          />
          <Input
            label="Texto"
            value={contenido}
            onChangeText={(texto) => {
              setContenido(texto);
              setError("");
            }}
            multiline
            showEditIcon={false}
            error={error || undefined}
          />
          <Text className="text-xs leading-5 text-gray-500">
            Se publica como versión nueva. Los huéspedes que ya aceptaron la
            anterior la conservan.
          </Text>
          <Button
            fullWidth
            loading={publicar.isPending}
            onPress={() => {
              if (!titulo.trim() || !contenido.trim()) {
                setError("Escribe el título y el texto.");
                return;
              }
              publicar.mutate();
            }}
          >
            Publicar
          </Button>
        </View>
      </Modal>
    </View>
  );
}
