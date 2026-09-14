import React from "react";
import { View, Text } from "react-native";
import { Button, Input, Modal } from "@/shared/components/ui";

export interface SuscripcionPagoForm {
  cardNumber: string;
  cardName: string;
  cardExpiry: string;
  cardCvv: string;
}

interface SuscripcionPagoModalProps {
  visible: boolean;
  onClose: () => void;
  paymentForm: SuscripcionPagoForm;
  setPaymentForm: React.Dispatch<React.SetStateAction<SuscripcionPagoForm>>;
  paymentLoading: boolean;
  onCardNumberChange: (value: string) => void;
  onCardExpiryChange: (value: string) => void;
  onSubmit: () => void;
}

export function SuscripcionPagoModal({
  visible,
  onClose,
  paymentForm,
  setPaymentForm,
  paymentLoading,
  onCardNumberChange,
  onCardExpiryChange,
  onSubmit,
}: SuscripcionPagoModalProps) {
  return (
    <Modal
      visible={visible}
      onClose={() => {
        if (!paymentLoading) onClose();
      }}
      title="Pago de suscripción"
    >
      <View className="flex-col gap-4 py-1">
        <View
          className="items-center py-3"
          style={{ borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}
        >
          <Text className="text-xl font-bold text-gray-900 text-center">
            $15.00
          </Text>
          <Text className="text-sm text-center" style={{ color: "#6B7280" }}>
            por mes - Huésped Temporal
          </Text>
        </View>
        <Input
          label="Nombre del titular"
          value={paymentForm.cardName}
          onChangeText={(value) =>
            setPaymentForm((previous) => ({ ...previous, cardName: value }))
          }
          placeholder="Como figura en la tarjeta"
          editable={!paymentLoading}
        />
        <Input
          label="Número de tarjeta"
          value={paymentForm.cardNumber}
          onChangeText={onCardNumberChange}
          placeholder="1234 5678 9012 3456"
          editable={!paymentLoading}
        />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Input
              label="Vencimiento"
              value={paymentForm.cardExpiry}
              onChangeText={onCardExpiryChange}
              placeholder="MM/AA"
              editable={!paymentLoading}
            />
          </View>
          <View className="flex-1">
            <Input
              label="CVV"
              value={paymentForm.cardCvv}
              onChangeText={(value) =>
                setPaymentForm((previous) => ({
                  ...previous,
                  cardCvv: value.replace(/\D/g, "").slice(0, 4),
                }))
              }
              placeholder="123"
              type="numeric"
              editable={!paymentLoading}
            />
          </View>
        </View>
        <View className="rounded-xl p-3" style={{ backgroundColor: "#EFF6FF" }}>
          <Text className="text-xs" style={{ color: "#2563EB", lineHeight: 18 }}>
            Pago 100% simulado. No se realizará ningún cobro real.
          </Text>
        </View>
        <Button variant="primary" onPress={onSubmit} disabled={paymentLoading}>
          {paymentLoading ? "Procesando pago..." : "Pagar $15.00 y suscribirse"}
        </Button>
      </View>
    </Modal>
  );
}
