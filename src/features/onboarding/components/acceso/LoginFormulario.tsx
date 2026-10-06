import { View, Text, Pressable } from "react-native";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input } from "@/shared/components";
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
  const { handleLogin, handleGoogle, ingresando } = useLogin();
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

        <Button onPress={handleSubmit(handleLogin)} loading={ingresando}>
          Iniciar sesión
        </Button>
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

    </>
  );
}
