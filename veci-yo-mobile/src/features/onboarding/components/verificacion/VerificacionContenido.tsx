import { View, Text, ScrollView } from "react-native";
import { Button, Checkbox, ImageUploadCard } from "@/shared/components";
import type { UseVerificacionReturn } from "../../types";

interface VerificacionContenidoProps {
  estado: UseVerificacionReturn;
}

export function VerificacionContenido({ estado }: VerificacionContenidoProps) {
  const {
    docConfig,
    stepIds,
    stepIndex,
    stepId,
    isLastStep,
    fotoFrente,
    fotoDorso,
    fotoRostro,
    terminos,
    setFotoFrente,
    setFotoDorso,
    setFotoRostro,
    toggleTermino,
    puedeAvanzar,
    siguiente,
  } = estado;

  return (
    <ScrollView
      className="flex-1 bg-bg-app px-4 pt-5 pb-8"
      contentContainerStyle={{ gap: 20 }}
    >
      <View className="flex-row gap-1.5">
        {stepIds.map((id, index) => (
          <View
            key={id}
            className="flex-1 h-1 rounded-full"
            style={{
              backgroundColor: index <= stepIndex ? "#F5B800" : "#E5E7EB",
            }}
          />
        ))}
      </View>

      <Text className="text-sm text-gray-500 text-center leading-5">
        Ingrese la información solicitada para su registro. Usaremos su cámara
        para verificar sus datos biométricos.
      </Text>

      {stepId === "frente" && (
        <ImageUploadCard
          label={docConfig.frente}
          placeholder="Tomar o subir foto"
          helperText="Asegúrate de que el documento se vea completo, legible y sin reflejos."
          value={fotoFrente}
          onChange={setFotoFrente}
          height={190}
        />
      )}

      {stepId === "dorso" && (
        <ImageUploadCard
          label={docConfig.dorso || "Foto trasera del documento"}
          placeholder="Tomar o subir foto"
          helperText="Asegúrate de que el documento se vea completo, legible y sin reflejos."
          value={fotoDorso}
          onChange={setFotoDorso}
          height={190}
        />
      )}

      {stepId === "rostro" && (
        <>
          <ImageUploadCard
            label="Foto del rostro"
            placeholder="Tomar selfie"
            helperText="Mira de frente a la cámara, en un lugar bien iluminado."
            value={fotoRostro}
            onChange={setFotoRostro}
            circular
            height={170}
          />
          <View className="gap-3.5">
            {Object.entries(terminos).map(([key, termino]) => (
              <Checkbox
                key={key}
                checked={termino.checked}
                onChange={toggleTermino(key)}
                label={termino.label}
              />
            ))}
          </View>
        </>
      )}

      <Button onPress={siguiente} disabled={!puedeAvanzar()}>
        {isLastStep ? "Finalizar" : "Siguiente"}
      </Button>
    </ScrollView>
  );
}
