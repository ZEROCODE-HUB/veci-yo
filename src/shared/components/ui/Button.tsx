import React from "react";
import { Pressable, Text, ActivityIndicator } from "react-native";
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva("flex-row items-center justify-center rounded-2xl", {
  variants: {
    variant: {
      primary: "bg-primary",
      secondary: "bg-transparent border border-gray-200",
      danger: "bg-danger",
      ghost: "bg-transparent",
      blue: "bg-secondary",
    },
    size: {
      sm: "px-4 py-2 min-h-[36px]",
      md: "px-5 py-3.5 min-h-[50px]",
      lg: "px-6 py-4 min-h-[56px]",
    },
  },
  defaultVariants: {
    variant: "primary",
    size: "md",
  },
});

const textVariants = cva("font-semibold text-center", {
  variants: {
    variant: {
      primary: "text-gray-900",
      secondary: "text-gray-700",
      danger: "text-white",
      ghost: "text-gray-500",
      blue: "text-white",
    },
    size: {
      sm: "text-sm",
      md: "text-base",
      lg: "text-lg",
    },
  },
  defaultVariants: {
    variant: "primary",
    size: "md",
  },
});

interface ButtonProps extends VariantProps<typeof buttonVariants> {
  children: React.ReactNode;
  onPress: () => void;
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  style?: object;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  disabled = false,
  loading = false,
  onPress,
  style,
}: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={`${buttonVariants({ variant, size })} ${disabled || loading ? "opacity-50" : ""} ${fullWidth ? "w-full" : ""}`}
      style={style}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "primary" ? "#111827" : "#fff"}
          size="small"
        />
      ) : typeof children === "string" ? (
        <Text className={textVariants({ variant, size })}>{children}</Text>
      ) : (
        children
      )}
    </Pressable>
  );
}
