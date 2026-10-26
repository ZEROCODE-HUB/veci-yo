import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { DesplazableConTeclado } from "@/shared/layouts";
import { Card, Cargando, Select } from "@/shared/components/ui";
import { useUIStore } from "@/stores";
import { mensajeDeError } from "@/shared/utils/error.util";
import { usePermisosDeRol } from "../hooks/usePanelDeLaApp";
import { usePlataforma } from "../hooks/usePlataforma";
import { FilaConInterruptor } from "../components/FilaConInterruptor";
import type { AccionDeRol, PermisoDeRol, RolConPermisos } from "../services/plataforma.repo";

const ROLES: { rol: RolConPermisos; titulo: string; detalle: string }[] = [
  { rol: "inquilino_lider", titulo: "Inquilino líder", detalle: "Quien alquila la vivienda y la gestiona" },
  { rol: "residente", titulo: "Residente", detalle: "Vive en la vivienda" },
  { rol: "corresidente", titulo: "Corresidente", detalle: "Vive en la vivienda con otro residente" },
  { rol: "coadministrador_vivienda", titulo: "Coadministrador de la vivienda", detalle: "Ayuda a gestionar la vivienda" },
  { rol: "coadministrador_edificio", titulo: "Coadministrador del edificio", detalle: "Ayuda a la administración del edificio" },
];

const ACCION: Record<AccionDeRol, string> = {
  registrar_visitas: "Registrar visitas",
  reservar_zonas: "Reservar zonas comunes",
  invitar_a_la_vivienda: "Invitar a la vivienda",
  crear_zonas: "Crear y editar zonas comunes",
  crear_anuncios: "Publicar anuncios y encuestas",
};

/**
 * Qué puede hacer cada rol (huecos 9 y 14, 21/10/2026): el residente, el
 * corresidente y el coadministrador de vivienda ya no ven lo mismo que el
 * inquilino líder, y lo del coadministrador del edificio se decide aquí.
 *
 * Arriba se elige la regla general o un edificio. En un edificio, cada
 * permiso dice si sigue la regla general o es una excepción, y la excepción
 * se puede quitar. Lo aplica la base, venga de donde venga el intento. El
 * propietario, el administrador y la portería siempre pueden.
 */
export function PlataformaPermisosScreen() {
  const addToast = useUIStore((s) => s.addToast);
  const { edificios } = usePlataforma();
  const [condominioId, setCondominioId] = useState<string | null>(null);
  const { permisos, cargando, error, esDueno, guardando, cambiar } = usePermisosDeRol(condominioId);

  const guardar = async (p: PermisoDeRol, permitido: boolean | null) => {
    try {
      await cambiar({ rol: p.rol, accion: p.accion, permitido });
      addToast("Permiso guardado", "success");
    } catch (e) {
      addToast(mensajeDeError(e, "No se pudo guardar el permiso"), "error");
    }
  };

  return (
    <DesplazableConTeclado className="flex-1 bg-gray-50" contentContainerClassName="p-4 gap-3">
      <Card className="gap-3 p-4">
        <Select
          label="Dónde se aplica"
          value={condominioId ?? "general"}
          options={[
            { value: "general", label: "Regla general (todos los edificios)" },
            ...edificios.map((e) => ({ value: e.id, label: e.nombre })),
          ]}
          onChange={(v) => setCondominioId(v === "general" ? null : String(v))}
        />
        <Text className="text-xs text-gray-500">
          {condominioId
            ? "Lo que cambies aquí solo vale para este edificio. Lo que no cambies sigue la regla general."
            : "Vale para todos los edificios, salvo los que tengan una excepción. El propietario, el administrador y la portería siempre pueden."}
        </Text>
      </Card>

      {error ? (
        <Card className="p-4">
          <Text className="text-sm text-danger">{mensajeDeError(error, "No se pudieron cargar los permisos")}</Text>
        </Card>
      ) : null}
      {cargando ? <Cargando variante="enLinea" texto="los permisos" /> : null}

      {ROLES.map((r) => {
        const suyos = permisos.filter((p) => p.rol === r.rol);
        if (suyos.length === 0) return null;
        return (
          <Card key={r.rol} className="gap-3 p-4">
            <View>
              <Text className="text-base font-semibold text-gray-900">{r.titulo}</Text>
              <Text className="text-xs text-gray-500">{r.detalle}</Text>
            </View>
            {suyos.map((p) => (
              <View key={p.accion} className="gap-1">
                <FilaConInterruptor
                  texto={ACCION[p.accion]}
                  value={p.permitido}
                  onChange={(v) => void guardar(p, v)}
                  disabled={!esDueno || guardando}
                  nombre={`${r.titulo}: ${ACCION[p.accion]}`}
                />
                {condominioId ? (
                  p.esExcepcion ? (
                    <View className="flex-row flex-wrap items-center gap-2">
                      <Text className="text-xs text-gray-500">
                        {`Excepción de este edificio (la regla general dice ${p.general ? "sí" : "no"}).`}
                      </Text>
                      {esDueno ? (
                        <Pressable
                          onPress={() => void guardar(p, null)}
                          accessibilityRole="button"
                          accessibilityLabel={`Volver a la regla general: ${ACCION[p.accion]}`}
                          hitSlop={8}
                        >
                          <Text className="text-xs font-semibold text-primary">Volver a la regla general</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : (
                    <Text className="text-xs text-gray-500">Como la regla general.</Text>
                  )
                ) : null}
              </View>
            ))}
          </Card>
        );
      })}
    </DesplazableConTeclado>
  );
}
