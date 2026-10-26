import React, { Component, ErrorInfo, ReactNode } from "react";
import { Text, View } from "react-native";
import { anotarEnLaBase, describirError } from "@/shared/services/erroresDeLaApp";
import { Button } from "./Button";

interface Props {
  children: ReactNode;
  /** Dónde está puesto, para el registro: «app», «escaneo del documento»… */
  donde: string;
  /** Qué enseñar en vez de lo que falló. Sin esto, un aviso con «Volver a intentarlo». */
  alFallar?: (reintentar: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Lo que se enseña cuando algo de dentro revienta al pintarse (26/10/2026).
 *
 * Existía y no estaba puesto en ninguna parte, así que un error dejaba la app
 * en blanco en el celular --que es lo que vio el tester al escanear un
 * documento-- sin que nadie supiera el motivo. Ahora el error se anota en la
 * base (`error_de_la_app`) y se ofrece seguir.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const { mensaje, detalle } = describirError(error);
    anotarEnLaBase(
      "error",
      this.props.donde,
      mensaje,
      [detalle, info.componentStack].filter(Boolean).join("\n---\n"),
    );
  }

  reintentar = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.alFallar) return this.props.alFallar(this.reintentar);
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-white p-8">
        <Text className="text-lg font-semibold text-gray-900 text-center">
          Algo falló en esta pantalla
        </Text>
        <Text className="text-sm text-gray-500 text-center">
          Ya quedó anotado para revisarlo. Puedes volver a intentarlo.
        </Text>
        <Button onPress={this.reintentar}>Volver a intentarlo</Button>
      </View>
    );
  }
}
