import { theme } from "@/config";
import { useState } from "react";
import { Text, View } from "react-native";
import { Button, Modal, Toggle } from "@/shared/components";
import type {
  PermisosDeTrabajador,
  TrabajadorDeLaVivienda,
} from "../../services/trabajadores.repo";
import { detalleDelTrabajador } from "../../helpers/trabajadorPermanente";

interface Props {
  trabajadores: TrabajadorDeLaVivienda[];
  onDarDeBaja: (id: string) => void;
  dandoDeBajaId?: string;
  /** Los permisos de cada uno, por id; vacío si quien mira no los gestiona. */
  permisos?: Record<string, PermisosDeTrabajador>;
  onCambiarPermisos?: (
    id: string,
    permisos: PermisosDeTrabajador,
  ) => Promise<void>;
  guardandoPermisos?: boolean;
  /** Otra vez la invitación, a quien tiene cuenta ofrecida y no la aceptó. */
  onReenviar?: (t: { id: string; correo: string; nombre: string }) => void;
  reenviandoId?: string;
}

/**
 * Los profesionales permanentes de la vivienda (17/11/2026), con «Dar de baja».
 * Dar de baja pide confirmar: con app, deja de sonarle el intercomunicador.
 *
 * Y «Editar privilegios» para los que tienen cuenta (23/11/2026, el cliente al
 * probar la 142: solo se podían elegir al registrarlo).
 */
export function ListaDeTrabajadores({
  trabajadores,
  onDarDeBaja,
  dandoDeBajaId,
  permisos = {},
  onCambiarPermisos,
  guardandoPermisos = false,
  onReenviar,
  reenviandoId,
}: Props) {
  const [aConfirmar, setAConfirmar] = useState<TrabajadorDeLaVivienda | null>(
    null,
  );
  const [aEditar, setAEditar] = useState<TrabajadorDeLaVivienda | null>(null);
  const [borrador, setBorrador] = useState<PermisosDeTrabajador>({
    puedeCrearVisitas: false,
    puedeContestarCitofono: true,
  });
  if (trabajadores.length === 0) return null;

  const abrirPermisos = (t: TrabajadorDeLaVivienda) => {
    setBorrador(
      permisos[t.id] ?? {
        puedeCrearVisitas: false,
        puedeContestarCitofono: true,
      },
    );
    setAEditar(t);
  };

  return (
    <View className="gap-2">
      <Text className="text-base font-bold text-gray-900">
        Profesionales permanentes
      </Text>
      {trabajadores.map((t) => (
        <View
          key={t.id}
          className="flex-row items-center justify-between rounded-xl p-3"
          style={{ backgroundColor: theme.colors.bgMuted }}
        >
          <View className="flex-1 pr-2">
            <Text className="text-sm font-bold text-gray-900">{t.nombre}</Text>
            <Text className="text-xs text-gray-500">
              {detalleDelTrabajador(t)}
            </Text>
            {t.correoInvitado && !t.tieneCuenta ? (
              <Text className="text-xs text-gray-500">{`Invitado: ${t.correoInvitado}`}</Text>
            ) : null}
          </View>
          <View className="items-end gap-1">
            {t.conApp && !t.tieneCuenta && t.correoInvitado && onReenviar ? (
              <Button
                size="sm"
                variant="ghost"
                loading={reenviandoId === t.id}
                disabled={Boolean(reenviandoId)}
                onPress={() =>
                  onReenviar({ id: t.id, correo: t.correoInvitado ?? "", nombre: t.nombre })
                }
              >
                Reenviar invitación
              </Button>
            ) : null}
            {t.conApp && permisos[t.id] && onCambiarPermisos ? (
              <Button
                size="sm"
                variant="ghost"
                onPress={() => abrirPermisos(t)}
              >
                Editar privilegios
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="ghost"
              loading={dandoDeBajaId === t.id}
              disabled={Boolean(dandoDeBajaId)}
              onPress={() => setAConfirmar(t)}
            >
              Dar de baja
            </Button>
          </View>
        </View>
      ))}

      <Modal
        visible={Boolean(aEditar)}
        onClose={() => setAEditar(null)}
        title="Editar privilegios"
      >
        <View className="gap-4">
          <Text className="text-sm text-gray-500">
            {aEditar ? `Qué puede hacer ${aEditar.nombre} en la vivienda.` : ""}
          </Text>
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-1 gap-0.5">
              <Text className="text-sm text-gray-900">Contestar el citófono</Text>
              <Text className="text-xs leading-4 text-gray-500">
                Le suena cuando la portería llama a tu vivienda.
              </Text>
            </View>
            <Toggle
              value={borrador.puedeContestarCitofono}
              onChange={(v) =>
                setBorrador((b) => ({ ...b, puedeContestarCitofono: v }))
              }
              accessibilityLabel="Contestar el citófono"
            />
          </View>
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-1 gap-0.5">
              <Text className="text-sm text-gray-900">Registrar visitas</Text>
              <Text className="text-xs leading-4 text-gray-500">
                Anunciar a amigos o profesionales que vienen. Solo ve las que
                registra él.
              </Text>
            </View>
            <Toggle
              value={borrador.puedeCrearVisitas}
              onChange={(v) =>
                setBorrador((b) => ({ ...b, puedeCrearVisitas: v }))
              }
              accessibilityLabel="Registrar visitas"
            />
          </View>
          <Button
            variant="primary"
            loading={guardandoPermisos}
            onPress={async () => {
              if (!aEditar || !onCambiarPermisos) return;
              try {
                await onCambiarPermisos(aEditar.id, borrador);
                setAEditar(null);
              } catch {
                // El aviso rojo lo pone el hook; la ventana queda abierta para reintentar.
              }
            }}
          >
            Guardar
          </Button>
          <Button variant="ghost" onPress={() => setAEditar(null)}>
            Cancelar
          </Button>
        </View>
      </Modal>

      <Modal
        visible={Boolean(aConfirmar)}
        onClose={() => setAConfirmar(null)}
        title="Dar de baja"
      >
        <View className="gap-3">
          <Text className="text-sm text-gray-700">
            {aConfirmar
              ? `${aConfirmar.nombre} dejará de figurar en el directorio de la vivienda${aConfirmar.tieneCuenta ? " y ya no le sonará el intercomunicador" : ""}.`
              : ""}
          </Text>
          <Button
            variant="primary"
            onPress={() => {
              if (aConfirmar) onDarDeBaja(aConfirmar.id);
              setAConfirmar(null);
            }}
          >
            Dar de baja
          </Button>
          <Button variant="ghost" onPress={() => setAConfirmar(null)}>
            Cancelar
          </Button>
        </View>
      </Modal>
    </View>
  );
}
