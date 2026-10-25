import React, { useState } from "react";
import { Text, View } from "react-native";
import { DesplazableConTeclado } from "@/shared/layouts";
import { Button, Card, Cargando, Input } from "@/shared/components/ui";
import { useUIStore } from "@/stores";
import { mensajeDeError } from "@/shared/utils/error.util";
import { TEXTOS_LEGALES_DE_LA_APP } from "../services/plataforma.repo";
import { useTextosLegalesDeLaApp } from "../hooks/usePanelDeLaApp";

/**
 * Los textos legales de la app (23/10/2026): términos, privacidad,
 * tratamiento de datos y la autorización de antecedentes. Publicar deja una
 * versión nueva y la anterior queda guardada. El texto lo da el abogado; esto
 * solo lo publica. Los términos de cada edificio los publica su administración.
 */
export function PlataformaTextosLegalesScreen() {
  const addToast = useUIStore((s) => s.addToast);
  const { textos, cargando, error, esDueno, publicar } = useTextosLegalesDeLaApp();
  const [tipo, setTipo] = useState<string | null>(null);
  const [titulo, setTitulo] = useState("");
  const [contenido, setContenido] = useState("");
  const [confirmando, setConfirmando] = useState(false);

  if (cargando) return <Cargando texto="los textos legales" />;

  const abrir = (t: string) => {
    const vigente = textos.find((x) => x.tipo === t);
    setTipo(t);
    setTitulo(vigente?.titulo ?? TEXTOS_LEGALES_DE_LA_APP[t]);
    setContenido(vigente?.contenido ?? "");
    setConfirmando(false);
  };

  const enviar = async () => {
    if (!tipo) return;
    if (!confirmando) {
      setConfirmando(true);
      return;
    }
    try {
      const version = await publicar.mutateAsync({ tipo, titulo, contenido });
      addToast(`Publicada la versión ${version}`, "success");
      setTipo(null);
    } catch (e) {
      addToast(mensajeDeError(e, "No se pudo publicar"), "error");
    }
  };

  return (
    <DesplazableConTeclado className="flex-1 bg-gray-50" contentContainerClassName="p-4 gap-3">
      {error ? (
        <Card className="p-4">
          <Text className="text-sm text-danger">{mensajeDeError(error, "No se pudieron cargar los textos")}</Text>
        </Card>
      ) : null}

      {Object.entries(TEXTOS_LEGALES_DE_LA_APP).map(([t, nombre]) => {
        const vigente = textos.find((x) => x.tipo === t);
        return (
          <Card key={t} className="gap-2 p-4">
            <Text className="text-base font-semibold text-gray-900">{nombre}</Text>
            <Text className="text-xs text-gray-500">
              {vigente ? `Versión ${vigente.version} · ${vigente.actualizadoEn}` : "Sin publicar todavía"}
            </Text>

            {tipo === t ? (
              <View className="gap-2">
                <Input label="Título" value={titulo} onChangeText={setTitulo} />
                <Input label="Texto" value={contenido} onChangeText={setContenido} multiline rows={12} />
                <Button
                  fullWidth
                  variant={confirmando ? "danger" : "primary"}
                  onPress={enviar}
                  loading={publicar.isPending}
                  disabled={!titulo.trim() || !contenido.trim()}
                >
                  {confirmando ? "Confirmar: publicar para todos" : "Publicar versión nueva"}
                </Button>
                <Button variant="secondary" fullWidth onPress={() => setTipo(null)}>
                  Cancelar
                </Button>
              </View>
            ) : (
              <>
                {vigente ? (
                  <Text className="text-sm text-gray-700" numberOfLines={4}>
                    {vigente.contenido}
                  </Text>
                ) : null}
                {esDueno ? (
                  <Button size="sm" variant="secondary" onPress={() => abrir(t)} style={{ alignSelf: "flex-start" }}>
                    {vigente ? "Editar y publicar" : "Escribir y publicar"}
                  </Button>
                ) : null}
              </>
            )}
          </Card>
        );
      })}
    </DesplazableConTeclado>
  );
}
