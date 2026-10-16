import { useState } from "react";
import { Text, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Input, Modal } from "@/shared/components";
import { useCondominioActivo } from "@/shared/hooks";
import { mensajeDeError } from "@/shared/utils";
import { useAdminStore, useUIStore } from "@/stores";
import type { Tipologia } from "@/stores/admin-store";
import {
  actualizarTipologia,
  crearTipologia,
  eliminarTipologia,
  type DatosTipologia,
} from "../../services/arquitectura.repo";
import { AdminRow } from "../AdminRow";
import { AdminSectionCard } from "../AdminSectionCard";

/**
 * Las tipologías de vivienda del edificio (16/10/2026).
 *
 * La tabla existía y la leían el directorio y «Mi alojamiento», pero nadie
 * podía crear una: el edificio de prueba tenía la sembrada y cualquier otro
 * ninguna. La maqueta tenía su lista --`TipologiasTab`-- escrita y sin enlazar;
 * aquí va dentro de Condominio, y cada departamento la elige en su ficha.
 *
 * La maqueta pedía «capacidad máxima»; la base guarda habitaciones, baños y
 * metros, y el aforo de la renta corta es del edificio o de cada anfitrión.
 */
type Formulario = { nombre: string; habitaciones: string; banos: string; metros: string };

const VACIO: Formulario = { nombre: "", habitaciones: "", banos: "", metros: "" };

const aFormulario = (t: Tipologia): Formulario => ({
  nombre: t.nombre,
  habitaciones: t.habitaciones ? String(t.habitaciones) : "",
  banos: t.banos ? String(t.banos) : "",
  metros: t.metrosCuadrados ? String(t.metrosCuadrados) : "",
});

const numero = (texto: string) => (texto.trim() === "" ? null : Number(texto));

function resumen(t: Tipologia): string {
  const partes = [
    t.habitaciones ? `${t.habitaciones} hab.` : "",
    t.banos ? `${t.banos} ${t.banos === 1 ? "baño" : "baños"}` : "",
    t.metrosCuadrados ? `${t.metrosCuadrados} m²` : "",
  ].filter(Boolean);
  return partes.join(" · ");
}

export function TipologiasSection() {
  const condominioId = useCondominioActivo() ?? "";
  const tipologias = useAdminStore((s) => s.tipologias);
  const addToast = useUIStore((s) => s.addToast);
  const cliente = useQueryClient();
  const [editando, setEditando] = useState<Tipologia | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [borrando, setBorrando] = useState<Tipologia | null>(null);
  const [form, setForm] = useState<Formulario>(VACIO);
  const [error, setError] = useState("");

  const refrescar = () => {
    void cliente.invalidateQueries({ queryKey: ["condominio", "tipologias"] });
    void cliente.invalidateQueries({ queryKey: ["condominio", "arquitectura"] });
  };

  const guardar = useMutation({
    mutationFn: async () => {
      const datos: DatosTipologia = {
        nombre: form.nombre,
        habitaciones: numero(form.habitaciones),
        banos: numero(form.banos),
        metrosCuadrados: numero(form.metros),
      };
      if (editando?.uuid) await actualizarTipologia(editando.uuid, datos);
      else await crearTipologia(condominioId, datos);
    },
    onSuccess: () => {
      addToast("Tipología guardada", "success");
      setAbierto(false);
      refrescar();
    },
    onError: (fallo) => addToast(mensajeDeError(fallo, "No se pudo guardar"), "error"),
  });

  const borrar = useMutation({
    mutationFn: (uuid: string) => eliminarTipologia(uuid),
    onSuccess: () => {
      addToast("Tipología eliminada", "success");
      setBorrando(null);
      refrescar();
    },
    onError: (fallo) => addToast(mensajeDeError(fallo, "No se pudo eliminar"), "error"),
  });

  const abrir = (t?: Tipologia) => {
    setEditando(t ?? null);
    setForm(t ? aFormulario(t) : VACIO);
    setError("");
    setAbierto(true);
  };

  const campo = (clave: keyof Formulario, etiqueta: string, ejemplo: string) => (
    <Input
      label={etiqueta}
      value={form[clave]}
      onChangeText={(texto) =>
        setForm((f) => ({
          ...f,
          [clave]: clave === "nombre" ? texto : texto.replace(/[^0-9.]/g, ""),
        }))
      }
      placeholder={ejemplo}
      type={clave === "nombre" ? undefined : "numeric"}
      showEditIcon={false}
      error={clave === "nombre" ? error || undefined : undefined}
    />
  );

  return (
    <AdminSectionCard title="Tipologías de vivienda">
      <Text className="text-xs leading-5 text-gray-500">
        Los modelos de departamento del edificio. Cada departamento elige el
        suyo en Torres.
      </Text>
      {tipologias.map((t) => (
        <AdminRow
          key={t.id}
          title={t.nombre}
          subtitle={resumen(t)}
          onPress={() => abrir(t)}
          onDelete={() => setBorrando(t)}
        />
      ))}
      <Button size="sm" variant="secondary" onPress={() => abrir()}>
        + Nueva tipología
      </Button>

      <Modal
        visible={abierto}
        onClose={() => setAbierto(false)}
        title={editando ? "Editar tipología" : "Nueva tipología"}
      >
        <View className="gap-3">
          {campo("nombre", "Nombre de la tipología", "Ej: Estándar, Dúplex, Suite")}
          <View className="flex-row gap-2.5">
            <View className="flex-1">{campo("habitaciones", "Habitaciones", "2")}</View>
            <View className="flex-1">{campo("banos", "Baños", "1")}</View>
          </View>
          {campo("metros", "Metros cuadrados", "62")}
          <Button
            fullWidth
            loading={guardar.isPending}
            onPress={() => {
              if (!form.nombre.trim()) {
                setError("Escribe el nombre de la tipología.");
                return;
              }
              guardar.mutate();
            }}
          >
            Guardar
          </Button>
        </View>
      </Modal>

      <Modal
        visible={!!borrando}
        onClose={() => setBorrando(null)}
        title="Eliminar tipología"
      >
        <View className="gap-4">
          <Text className="text-base text-gray-900 text-center">
            ¿Eliminar la tipología {borrando?.nombre}? Los departamentos que la
            tenían se quedan sin tipología.
          </Text>
          <Button
            variant="danger"
            fullWidth
            loading={borrar.isPending}
            onPress={() => borrando?.uuid && borrar.mutate(borrando.uuid)}
          >
            Eliminar
          </Button>
        </View>
      </Modal>
    </AdminSectionCard>
  );
}
