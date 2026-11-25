import { theme } from "@/config";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheet, BottomSheetOption, Button, Modal, Toggle } from "@/shared/components";
import { ESTILO_DE_TARJETA } from "../configuracion/gruposDeResidentes";
import type {
  EstadoDelProfesional,
  PermisosDeTrabajador,
  SituacionDelProfesional,
  TrabajadorDeLaVivienda,
} from "../../services/trabajadores.repo";
import { detalleDelTrabajador } from "../../helpers/trabajadorPermanente";

interface Props {
  trabajadores: TrabajadorDeLaVivienda[];
  onDarDeBaja: (id: string) => void;
  dandoDeBajaId?: string;
  /** Permisos y en qué va cada uno, por id; vacío si quien mira no los gestiona. */
  situacion?: Record<string, SituacionDelProfesional>;
  /** El título de la lista; `null` para no ponerlo (en el detalle de su visita). */
  titulo?: string | null;
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
/** En qué va, dicho para el propietario (23/11/2026). */
function textoDelEstado(estado: EstadoDelProfesional, correo: string | null): string {
  switch (estado) {
    case "activo":
      return "Activo: entra con su cuenta";
    case "cuenta_creada":
      return "Ya creó su cuenta; le falta aceptar la invitación en Inicio";
    case "invitado":
      return correo ? `Invitación enviada a ${correo}` : "Invitación enviada";
    default:
      return "Sin app: solo figura en el directorio";
  }
}

function colorDelEstado(estado: EstadoDelProfesional): string {
  if (estado === "activo") return theme.colors.success;
  if (estado === "sin_app") return theme.colors.textSecondary;
  return theme.colors.warningDark;
}

export function ListaDeTrabajadores({
  trabajadores,
  onDarDeBaja,
  dandoDeBajaId,
  situacion = {},
  titulo = "Profesionales permanentes",
  onCambiarPermisos,
  guardandoPermisos = false,
  onReenviar,
  reenviandoId,
}: Props) {
  const [aConfirmar, setAConfirmar] = useState<TrabajadorDeLaVivienda | null>(
    null,
  );
  const [aEditar, setAEditar] = useState<TrabajadorDeLaVivienda | null>(null);
  const [aMenu, setAMenu] = useState<TrabajadorDeLaVivienda | null>(null);
  const [borrador, setBorrador] = useState<PermisosDeTrabajador>({
    puedeCrearVisitas: false,
    puedeContestarCitofono: true,
  });
  if (trabajadores.length === 0) return null;

  const abrirPermisos = (t: TrabajadorDeLaVivienda) => {
    setBorrador(
      situacion[t.id] ?? {
        puedeCrearVisitas: false,
        puedeContestarCitofono: true,
      },
    );
    setAEditar(t);
  };

  return (
    <View className="gap-2">
      {titulo ? <Text className="text-base font-bold text-gray-900">{titulo}</Text> : null}
      {/*
        Como las demás personas de la vivienda (25/11/2026, «hazlo sencillo»):
        tarjeta blanca, su oficio, en qué va y el «⋮» con lo que se hace con
        él. Antes eran tres botones de texto apilados a la derecha.
      */}
      {trabajadores.map((t) => {
        const estado = situacion[t.id]?.estado;
        return (
          <View key={t.id} className="flex-row items-center gap-2 rounded-2xl px-4 py-3" style={ESTILO_DE_TARJETA}>
            <View className="flex-1 gap-0.5" style={{ minWidth: 0 }}>
              <Text className="text-base font-semibold text-gray-900" numberOfLines={1}>
                {t.nombre}
              </Text>
              <Text className="text-xs text-gray-500">{t.oficio?.trim() || "Profesional permanente"}</Text>
              <Text
                className="text-xs font-medium"
                style={{ color: estado ? colorDelEstado(estado) : theme.colors.textSecondary }}
              >
                {estado
                  ? textoDelEstado(estado, t.correoInvitado)
                  : detalleDelTrabajador(t).split(" · ")[1] ?? ""}
              </Text>
            </View>
            <Pressable
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={`Opciones de ${t.nombre}`}
              onPress={() => setAMenu(t)}
              className="h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: theme.colors.bgMuted }}
            >
              <Ionicons name="ellipsis-vertical" size={18} color={theme.colors.textSecondary} />
            </Pressable>
          </View>
        );
      })}

      <BottomSheet visible={Boolean(aMenu)} onClose={() => setAMenu(null)}>
        {aMenu && aMenu.conApp && situacion[aMenu.id] && onCambiarPermisos ? (
          <BottomSheetOption
            label="Editar privilegios"
            onPress={() => {
              const t = aMenu;
              setAMenu(null);
              abrirPermisos(t);
            }}
          />
        ) : null}
        {aMenu &&
        aMenu.conApp &&
        !aMenu.tieneCuenta &&
        aMenu.correoInvitado &&
        onReenviar &&
        (situacion[aMenu.id]?.estado ?? "invitado") === "invitado" ? (
          <BottomSheetOption
            label={reenviandoId === aMenu.id ? "Reenviando…" : "Reenviar invitación"}
            disabled={Boolean(reenviandoId)}
            onPress={() => {
              const t = aMenu;
              setAMenu(null);
              onReenviar({ id: t.id, correo: t.correoInvitado ?? "", nombre: t.nombre });
            }}
          />
        ) : null}
        <BottomSheetOption
          label={aMenu && dandoDeBajaId === aMenu.id ? "Dando de baja…" : "Dar de baja"}
          variant="danger"
          disabled={Boolean(dandoDeBajaId)}
          onPress={() => {
            const t = aMenu;
            setAMenu(null);
            if (t) setAConfirmar(t);
          }}
        />
      </BottomSheet>

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
