import { View, Text, Image } from 'react-native';
import { Button } from '@/shared/components';

const fondoOnboarding = require('@/assets/branding/fondo-onboarding-3.png');

interface LoginHeroProps {
  onIncognito: () => void;
}

export function LoginHero({ onIncognito }: LoginHeroProps) {
  return (
    <View className="bg-white rounded-xl overflow-hidden shadow-card">
      <Image
        source={fondoOnboarding}
        className="w-full"
        style={{ height: 215 }}
        resizeMode="cover"
      />
      <View className="p-4 gap-3.5">
        <Text className="text-base font-semibold text-gray-900 text-center leading-5">
          Tu app gratuita para llevar tus relaciones vecinales
        </Text>
        <Button variant="blue" onPress={onIncognito}>
          Ingresar de incógnito
        </Button>
      </View>
    </View>
  );
}

