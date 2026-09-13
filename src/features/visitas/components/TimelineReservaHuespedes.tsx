import React from 'react';
import { View, Text } from 'react-native';

const STEPS = [
  { key: 'preregistroEnviado', label: '🔗' },
  { key: 'documentacionCompleta', label: '📄' },
  { key: 'terminosAceptados', label: '📝' },
  { key: 'verificacionPasada', label: '🛡️' },
  { key: 'trasideEntrada', label: '🟢' },
  { key: 'trasideSalida', label: '🔴' },
];

interface TimelineInvitado {
  nombre: string;
  esMenor?: boolean;
  timeline?: Record<string, boolean | string>;
}

interface TimelineReservaHuespedesProps {
  invitados?: TimelineInvitado[];
}

export function TimelineReservaHuespedes({ invitados = [] }: TimelineReservaHuespedesProps) {
  if (!invitados.length) return null;

  return (
    <View>
      <View className="flex-row mb-1.5">
        {STEPS.map((s) => (
          <View key={s.key} className="flex-1 items-start">
            <Text className="text-sm">{s.label}</Text>
          </View>
        ))}
      </View>

      {invitados.map((inv, idx) => {
        const t = inv.timeline || {};
        return (
          <View key={idx} style={{ marginTop: idx === 0 ? 0 : 12 }}>
            <View className="flex-row items-center gap-1.5 mb-0.5">
              <Text className="font-medium text-xs text-gray-900">{inv.nombre}</Text>
              {inv.esMenor && (
                <View className="bg-warning-light rounded-full px-1.5 py-0.5 flex-row items-center">
                  <Text className="text-2xs font-bold text-amber-800">👶 Menor</Text>
                </View>
              )}
            </View>

            <View className="flex-row items-center">
              {STEPS.map((step, si) => {
                const done =
                  step.key === 'verificacionPasada'
                    ? (t.verificacionAprobada === true || !!t[step.key])
                    : !!t[step.key];
                const isSpecial =
                  step.key === 'terminosAceptados' && t.terminosAprobadoPor === 'anfitrion';
                const isLast = si === STEPS.length - 1;

                return (
                  <View key={step.key} className="flex-row items-center flex-1">
                    <View
                      className="w-3 h-3 rounded-full z-10"
                      style={{
                        backgroundColor: done
                          ? isSpecial
                            ? '#2563EB'
                            : '#16A34A'
                          : '#E5E7EB',
                      }}
                    />
                    {!isLast && (
                      <View
                        className="flex-1 h-0.5"
                        style={{
                          backgroundColor: done ? '#16A34A' : '#F3F4F6',
                        }}
                      />
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}
