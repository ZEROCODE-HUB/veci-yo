import { View, Text, Pressable } from "react-native";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input } from "@/shared/components";
import { DEMO_ROLES } from "../../data/demoRoles";
import { loginSchema, type LoginFormData } from "../../schemas";
import { useLogin } from "../../hooks/useLogin";
import { GoogleIcon } from "./GoogleIcon";

interface LoginFormularioProps {
  onRegistrar: () => void;
  onRecuperar: () => void;
}

export function LoginFormulario({
  onRegistrar,
  onRecuperar,
}: LoginFormularioProps) {
  const { handleLogin, handleGoogle, handleDemoClick } = useLogin();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { correo: "", password: "" },
  });

  return (
    <>
      <View className="gap-3.5">
        <Controller
          control={control}
          name="correo"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Correo"
              value={value}
              onChangeText={onChange}
              placeholder="tu@correo.com"
              type="email"
              error={errors.correo?.message}
              showEditIcon={false}
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Contraseña"
              value={value}
              onChangeText={onChange}
              placeholder="••••••••"
              type="password"
              error={errors.password?.message}
              showEditIcon={false}
            />
          )}
        />

        <Button onPress={handleSubmit(handleLogin)}>Iniciar sesión</Button>
        <Button variant="secondary" onPress={handleGoogle}>
          <View className="flex-row items-center gap-2">
            <Text className="text-base font-semibold text-gray-700">
              Iniciar sesión con Google
            </Text>
            <GoogleIcon />
          </View>
        </Button>

        <View className="items-center gap-1.5 mt-1.5">
          <Pressable onPress={onRegistrar}>
            <Text className="text-base font-bold text-gray-900 underline">
              Registrarse
            </Text>
          </Pressable>
          <Pressable onPress={onRecuperar}>
            <Text className="text-base font-bold text-gray-900 underline">
              Recuperar contraseña
            </Text>
          </Pressable>
        </View>
      </View>

      {DEMO_ROLES.length > 0 && (
        <View className="mt-2 pt-4 border-t border-gray-100">
          <Text className="text-center text-2xs tracking-widest uppercase font-bold text-gray-400 mb-3">
            Explorar otros roles
          </Text>
          <View className="gap-2">
            {DEMO_ROLES.map((rol) => (
              <Button
                key={rol.key}
                variant="secondary"
                onPress={() => handleDemoClick(rol.key)}
              >
                <Text className="text-base mr-2">
                  {rol.emoji} {rol.label}
                </Text>
              </Button>
            ))}
          </View>
        </View>
      )}
    </>
  );
}
