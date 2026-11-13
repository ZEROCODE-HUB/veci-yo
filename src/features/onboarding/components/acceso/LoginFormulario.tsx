import { View, Text, Pressable } from "react-native";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Cargando, Input } from "@/shared/components";
import { esquemaLogin, type LoginFormData } from "../../schemas";
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
  const { handleLogin, handleGoogle, ingresando, entrandoConGoogle } =
    useLogin();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(esquemaLogin),
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

        {/* Mientras se entra con Google, el otro camino espera (13/11/2026). */}
        <Button
          onPress={handleSubmit(handleLogin)}
          loading={ingresando}
          disabled={entrandoConGoogle}
        >
          Iniciar sesión
        </Button>
        {/*
          `disabled` y no `loading`: lo de dentro no es un texto, y `loading`
          lo cambiaría por la rueda sin decir de qué. Sin bloquearlo, pulsar
          dos veces abría dos ventanas de Google.
        */}
        <Button
          variant="secondary"
          onPress={handleGoogle}
          disabled={entrandoConGoogle || ingresando}
        >
          <View className="flex-row items-center gap-2">
            <Text className="text-base font-semibold text-gray-700">
              Iniciar sesión con Google
            </Text>
            {/* La rueda en lugar del logo: el texto sigue diciendo qué espera. */}
            {entrandoConGoogle ? (
              <Cargando variante="control" texto="la entrada con Google" />
            ) : (
              <GoogleIcon />
            )}
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
