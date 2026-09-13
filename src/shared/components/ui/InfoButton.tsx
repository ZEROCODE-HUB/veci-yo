import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Modal } from "@/shared/components/ui/Modal";

interface InfoButtonProps {
  titulo?: string;
  descripcion?: string;
  bullets?: string[];
  ejemplo?: string;
  motivo?: string;
  accion?: string;
  accionLabel?: string;
  onAccion?: () => void;
  variant?: "info" | "bloqueado";
  size?: number;
  sinPropiedades?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function InfoButton({
  titulo: tituloProp,
  descripcion: descripcionProp,
  bullets = [],
  ejemplo,
  motivo,
  accion,
  accionLabel,
  onAccion,
  variant = "info",
  size = 22,
  sinPropiedades,
  isOpen: controlledOpen,
  onOpenChange,
}: InfoButtonProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (value: boolean) => {
    if (controlledOpen === undefined) setInternalOpen(value);
    onOpenChange?.(value);
  };

  const isTopBar = sinPropiedades !== undefined;
  const isBloqueado = variant === "bloqueado" || sinPropiedades === true;

  const titulo = isTopBar
    ? sinPropiedades
      ? "Registra tu primera propiedad"
      : "Tus propiedades"
    : tituloProp || "";

  const descripcion = isTopBar
    ? sinPropiedades
      ? "Las propiedades son la base de Veciyo: conectan tu vivienda con su condominio."
      : "Aquí se listan las propiedades (viviendas) que tienes registradas. La propiedad activa define la información y las funciones que ves en la app."
    : descripcionProp;

  const topBarBullets =
    isTopBar && !sinPropiedades
      ? [
          "Cambia entre tus propiedades tocando su nombre.",
          "Marca una como favorita para que sea la activa por defecto.",
          'Agrega o quita propiedades desde "Administrar mis ubicaciones".',
        ]
      : [];

  const topBarEjemplo =
    isTopBar && !sinPropiedades
      ? 'Ej.: "Casa Amorcito" en Miraflores y "Casa Mamá" en Cusco, alternables desde aquí.'
      : undefined;

  const topBarMotivo =
    isTopBar && sinPropiedades
      ? "Todavía no agregaste ninguna propiedad, por eso los módulos de tu vivienda están bloqueados."
      : undefined;

  const topBarAccion =
    isTopBar && sinPropiedades
      ? 'Agrega tu propiedad desde el selector de propiedades en la barra superior ("Administrar mis ubicaciones"). Al registrarla, este módulo se habilita automáticamente.'
      : undefined;

  const finalBullets = isTopBar ? topBarBullets : bullets;
  const finalEjemplo = isTopBar ? topBarEjemplo : ejemplo;
  const finalMotivo = isTopBar ? topBarMotivo : motivo;
  const finalAccion = isTopBar ? topBarAccion : accion;

  const accent = isBloqueado ? "#6B7280" : "#2563EB";
  const accentBg = isBloqueado ? "#F3F4F6" : "#DBEAFE";

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={8}
        style={{
          width: size + 6,
          height: size + 6,
          borderRadius: (size + 6) / 2,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons
          name="information-circle"
          size={size}
          color={accent}
        />
      </Pressable>

      <Modal visible={open} onClose={() => setOpen(false)} title={titulo}>
        <View style={{ gap: 16 }}>
          {/* Header icon */}
          <View style={{ alignItems: "center" }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: accentBg,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name={isBloqueado ? "lock-closed" : "information-circle"}
                size={28}
                color={accent}
              />
            </View>
          </View>

          {/* Descripcion */}
          {descripcion && (
            <Text
              className="text-base text-gray-900 text-center"
              style={{ lineHeight: 24 }}
            >
              {descripcion}
            </Text>
          )}

          {/* Bullets */}
          {finalBullets.length > 0 && (
            <View style={{ gap: 8 }}>
              {finalBullets.map((b, i) => (
                <View
                  key={i}
                  style={{
                    flexDirection: "row",
                    gap: 8,
                    alignItems: "flex-start",
                  }}
                >
                  <Ionicons
                    name="arrow-forward"
                    size={16}
                    color={accent}
                    style={{ marginTop: 2 }}
                  />
                  <Text
                    className="text-sm text-gray-700"
                    style={{ flex: 1, lineHeight: 20 }}
                  >
                    {b}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Motivo */}
          {finalMotivo && (
            <View
              className="rounded-xl p-3 flex-row items-start gap-2"
              style={{ backgroundColor: "#F9FAFB" }}
            >
              <Ionicons
                name="lock-closed"
                size={16}
                color="#6B7280"
                style={{ marginTop: 1 }}
              />
              <View className="flex-1">
                <Text className="text-xs font-bold uppercase tracking-wide text-gray-900 mb-0.5">
                  Por qué está bloqueada
                </Text>
                <Text className="text-sm text-gray-500" style={{ lineHeight: 20 }}>
                  {finalMotivo}
                </Text>
              </View>
            </View>
          )}

          {/* Ejemplo */}
          {finalEjemplo && (
            <View
              className="rounded-xl p-3"
              style={{
                backgroundColor: "#FFFBEB",
                borderWidth: 1,
                borderColor: "#FDE68A",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  gap: 8,
                  alignItems: "flex-start",
                }}
                >
                  <Ionicons
                    name="bulb-outline"
                  size={16}
                  color="#D97706"
                    style={{ marginTop: 1 }}
                  />
                <View style={{ flex: 1 }}>
                  <Text className="text-xs font-bold uppercase tracking-wide text-gray-900 mb-0.5">
                    Ejemplo
                  </Text>
                  <Text
                    className="text-sm"
                    style={{ color: "#92400E", lineHeight: 20 }}
                  >
                    {finalEjemplo}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Accion */}
          {finalAccion && (
            <View
              className="rounded-xl p-3"
              style={{ borderWidth: 1.5, borderColor: "#F5B800" }}
            >
              <Text className="text-xs font-bold uppercase tracking-wide text-gray-900 mb-1">
                Qué hacer
              </Text>
              <Text className="text-sm text-gray-900" style={{ lineHeight: 20 }}>
                {finalAccion}
              </Text>
            </View>
          )}

          {/* Boton CTA o Entendido */}
          {isTopBar && sinPropiedades ? (
            <Pressable
              onPress={() => {
                setOpen(false);
                onAccion?.();
              }}
              className="rounded-full py-3 items-center"
              style={{ backgroundColor: "#F5B800" }}
            >
              <Text className="text-sm font-semibold text-white">
                {accionLabel || "Agregar propiedad"}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => setOpen(false)}
              className="rounded-full py-3 items-center"
              style={{ backgroundColor: "#F3F4F6" }}
            >
              <Text className="text-sm font-semibold text-gray-700">
                Entendido
              </Text>
            </Pressable>
          )}
        </View>
      </Modal>
    </>
  );
}
